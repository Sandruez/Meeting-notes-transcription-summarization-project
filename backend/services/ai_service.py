"""NVIDIA NIM AI service.

Provides summary generation, action-item extraction, transcript-from-text
parsing, and a streaming Q&A generator. All calls go through NVIDIA's
OpenAI-compatible endpoint.

If NVIDIA_API_KEY is not configured, every function degrades gracefully to a
deterministic mock so the app remains fully usable for demos and seeding.
"""

import asyncio
import functools
import json
import logging
import os
import time
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "").strip()
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

SUMMARY_MODEL = "meta/llama-3.1-70b-instruct"
ACTION_MODEL = "meta/llama-3.1-8b-instruct"
QA_MODEL = "meta/llama-3.1-70b-instruct"
PARSE_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct"

MAX_TRANSCRIPT_CHARS = 8000


class AIProcessingError(Exception):
    """Raised when an AI call fails after retries."""


def ai_enabled() -> bool:
    """True when a real NVIDIA API key is configured."""
    return bool(NVIDIA_API_KEY) and NVIDIA_API_KEY.startswith("nvapi-")


def _get_client():
    """Lazily build an AsyncOpenAI client pointed at NVIDIA's endpoint."""
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=NVIDIA_API_KEY, base_url=NVIDIA_BASE_URL)


def with_retry(max_attempts: int = 3, base_delay: float = 1.0):
    """Exponential-backoff retry decorator for async AI calls."""

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:  # noqa: BLE001 - we re-raise below
                    last_exc = exc
                    wait = base_delay * (2 ** (attempt - 1))
                    logger.warning(
                        "AI call %s failed (attempt %d/%d): %s — retrying in %.1fs",
                        func.__name__, attempt, max_attempts, exc, wait,
                    )
                    if attempt < max_attempts:
                        await asyncio.sleep(wait)
            raise AIProcessingError(
                f"{func.__name__} failed after {max_attempts} attempts: {last_exc}"
            )

        return wrapper

    return decorator


def _truncate(text: str, limit: int = MAX_TRANSCRIPT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n... [transcript truncated]"


def _extract_json(content: str) -> dict | list:
    """Pull a JSON object/array out of a model response, tolerating prose."""
    content = content.strip()
    # Strip markdown code fences.
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    # Find the first {...} or [...] span.
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start = content.find(open_ch)
        end = content.rfind(close_ch)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError("No valid JSON found in model response")


# ---------------------------------------------------------------------------
# Summary generation
# ---------------------------------------------------------------------------

@with_retry()
async def _call_summary_model(transcript_text: str, meeting_title: str, strict: bool = False) -> dict:
    client = _get_client()
    system = (
        "You are a meeting intelligence assistant like Fireflies.ai. "
        "Analyse the transcript and return ONLY valid JSON. No prose, no markdown."
    )
    if strict:
        system += " Your previous response was not valid JSON. Return ONLY a raw JSON object."
    user = (
        f"Meeting title: {meeting_title}\n\n"
        f"Transcript:\n{_truncate(transcript_text)}\n\n"
        "Return a JSON object with exactly these keys:\n"
        "{\n"
        '  "overview": "2-3 paragraph professional summary of what was discussed and decided",\n'
        '  "key_topics": ["4 to 8 short topic strings"],\n'
        '  "chapters": [{"title": "Chapter title", "start_seconds": 0, "summary": "one sentence"}]\n'
        "}"
    )
    t0 = time.time()
    resp = await client.chat.completions.create(
        model=SUMMARY_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.3,
        max_tokens=1200,
    )
    content = resp.choices[0].message.content or ""
    logger.info("summary model=%s latency=%.2fs chars=%d", SUMMARY_MODEL, time.time() - t0, len(content))
    data = _extract_json(content)
    if not isinstance(data, dict):
        raise ValueError("Summary response was not a JSON object")
    return data


async def generate_summary(transcript_text: str, meeting_title: str) -> dict:
    """Generate { overview, key_topics, chapters } for a transcript."""
    if not ai_enabled():
        return _mock_summary(transcript_text, meeting_title)
    try:
        return await _call_summary_model(transcript_text, meeting_title)
    except (ValueError, AIProcessingError):
        # One stricter retry, then fall back to mock so the pipeline never dies.
        try:
            return await _call_summary_model(transcript_text, meeting_title, strict=True)
        except Exception as exc:  # noqa: BLE001
            logger.error("generate_summary failed, using mock: %s", exc)
            return _mock_summary(transcript_text, meeting_title)


# ---------------------------------------------------------------------------
# Action item extraction
# ---------------------------------------------------------------------------

@with_retry()
async def _call_action_model(transcript_text: str, participants: list) -> list:
    client = _get_client()
    names = ", ".join(p.get("name", "") if isinstance(p, dict) else str(p) for p in participants)
    system = (
        "You extract action items from meeting transcripts. "
        "Return ONLY a valid JSON array. No prose, no markdown."
    )
    user = (
        f"Participants: {names}\n\n"
        f"Transcript:\n{_truncate(transcript_text)}\n\n"
        "Extract all action items, tasks, and commitments. Return a JSON array where "
        "each element is:\n"
        '{"task": "what needs to be done", "owner": "participant name or null", '
        '"due_date_hint": "e.g. by Friday, or null"}'
    )
    t0 = time.time()
    resp = await client.chat.completions.create(
        model=ACTION_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.2,
        max_tokens=800,
    )
    content = resp.choices[0].message.content or ""
    logger.info("actions model=%s latency=%.2fs", ACTION_MODEL, time.time() - t0)
    data = _extract_json(content)
    if isinstance(data, dict):
        data = data.get("action_items") or data.get("items") or []
    if not isinstance(data, list):
        raise ValueError("Action items response was not a JSON array")
    return data


async def extract_action_items(transcript_text: str, participants: list) -> list:
    """Extract a list of { task, owner, due_date_hint } dicts."""
    if not ai_enabled():
        return _mock_action_items(transcript_text, participants)
    try:
        items = await _call_action_model(transcript_text, participants)
        # Normalize keys.
        normalized = []
        for it in items:
            if not isinstance(it, dict) or not it.get("task"):
                continue
            normalized.append(
                {
                    "task": str(it.get("task")).strip(),
                    "owner": (it.get("owner") or None),
                    "due_date_hint": (it.get("due_date_hint") or None),
                }
            )
        return normalized
    except Exception as exc:  # noqa: BLE001
        logger.error("extract_action_items failed, using mock: %s", exc)
        return _mock_action_items(transcript_text, participants)


# ---------------------------------------------------------------------------
# Streaming Q&A
# ---------------------------------------------------------------------------

async def ask_question(
    transcript_text: str, question: str, history: list
) -> AsyncGenerator[str, None]:
    """Yield streamed answer chunks for SSE."""
    if not ai_enabled():
        async for chunk in _mock_answer_stream(question, transcript_text):
            yield chunk
        return

    try:
        client = _get_client()
        system = (
            "You are Fireflies AI, answering questions about a specific meeting. "
            "Use ONLY the transcript below as your source of truth. If the answer "
            "isn't in the transcript, say so.\n\n"
            f"TRANSCRIPT:\n{_truncate(transcript_text, 12000)}"
        )
        messages = [{"role": "system", "content": system}]
        for turn in history[-6:]:
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": question})

        stream = await client.chat.completions.create(
            model=QA_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=700,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta
    except Exception as exc:  # noqa: BLE001
        logger.error("ask_question streaming failed, using mock: %s", exc)
        async for chunk in _mock_answer_stream(question, transcript_text):
            yield chunk


# ---------------------------------------------------------------------------
# AI-assisted transcript parsing (for unstructured uploads)
# ---------------------------------------------------------------------------

@with_retry()
async def parse_transcript_with_ai(raw_text: str) -> list:
    """Ask the model to structure unstructured transcript text."""
    if not ai_enabled():
        return []  # Caller falls back to heuristic parser.
    client = _get_client()
    system = (
        "You convert raw meeting text into structured transcript lines. "
        "Return ONLY a JSON array."
    )
    user = (
        f"Raw text:\n{_truncate(raw_text)}\n\n"
        "Identify speakers and approximate timestamps. Return a JSON array of:\n"
        '{"speaker_name": "name", "timestamp_start": 0.0, "timestamp_end": 0.0, "text": "..."}'
    )
    resp = await client.chat.completions.create(
        model=PARSE_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.2,
        max_tokens=1500,
    )
    content = resp.choices[0].message.content or ""
    data = _extract_json(content)
    return data if isinstance(data, list) else []


# ---------------------------------------------------------------------------
# Mock fallbacks (used when no API key is configured)
# ---------------------------------------------------------------------------

def _first_sentences(text: str, n: int = 3) -> str:
    import re

    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(sentences[:n])


def _mock_summary(transcript_text: str, meeting_title: str) -> dict:
    preview = _first_sentences(transcript_text, 4)
    return {
        "overview": (
            f"This meeting, \"{meeting_title}\", covered the key points raised by the "
            f"participants. {preview}\n\n"
            "The discussion surfaced several decisions and follow-up items that were "
            "captured as action items. Participants aligned on next steps and owners "
            "before closing.\n\n"
            "(This summary was generated locally without an AI key. Add NVIDIA_API_KEY "
            "to .env and regenerate for a full AI-written summary.)"
        ),
        "key_topics": ["Discussion", "Decisions", "Next Steps", "Follow-ups"],
        "chapters": [
            {"title": "Introduction", "start_seconds": 0, "summary": "The meeting opened and the agenda was set."},
            {"title": "Main Discussion", "start_seconds": 300, "summary": "Core topics were discussed in depth."},
            {"title": "Wrap-up", "start_seconds": 900, "summary": "Action items and owners were confirmed."},
        ],
    }


import re as _re

# Strip a leading "[00:00:05] Speaker Name:" prefix (timestamp optional).
_PREFIX_RE = _re.compile(r"^\s*(?:\[[\d:.]+\]\s*)?[A-Z][^:]{1,40}:\s*")
_DUE_RE = _re.compile(
    r"\b(by\s+\w+|tomorrow|today|this week|next week|end of week|EOW)\b", _re.IGNORECASE
)


def _mock_action_items(transcript_text: str, participants: list) -> list:
    import re

    names = [p.get("name") if isinstance(p, dict) else str(p) for p in participants]
    owners = names or [None]
    items = []
    seen = set()
    # Pull sentences that look like commitments.
    for sentence in re.split(r"(?<=[.!?])\s+", transcript_text):
        # Strip a leading "[00:00:05] Speaker Name:" prefix if present.
        clean = _PREFIX_RE.sub("", sentence).strip()
        low = clean.lower()
        if any(kw in low for kw in ("i'll ", "i will ", "can you ", "let's ", "we should ", "to finalize", "to profile", "to audit", "i can ")):
            if not (12 < len(clean) < 160) or clean in seen:
                continue
            seen.add(clean)
            # Try to attribute to a named participant mentioned in the line.
            owner = next((n for n in names if n and n.split()[0].lower() in low), owners[len(items) % len(owners)])
            due = _DUE_RE.search(clean)
            items.append({
                "task": clean,
                "owner": owner,
                "due_date_hint": due.group(0) if due else None,
            })
        if len(items) >= 5:
            break
    if not items:
        items = [{"task": "Follow up on discussion points", "owner": owners[0], "due_date_hint": None}]
    return items


async def _mock_answer_stream(question: str, transcript_text: str) -> AsyncGenerator[str, None]:
    answer = (
        f"Based on the meeting transcript, here's what I found regarding \"{question}\":\n\n"
        "The participants discussed this topic and reached several conclusions. "
        "Key points and decisions were captured in the summary and action items. "
        "\n\n(This is a local mock response. Configure NVIDIA_API_KEY in the backend "
        ".env file to get real AI-powered answers grounded in the full transcript.)"
    )
    for word in answer.split(" "):
        yield word + " "
        await asyncio.sleep(0.02)
