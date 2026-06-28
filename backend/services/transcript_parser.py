"""Parse .vtt, .txt, and .json transcript files into structured lines.

Public API:
    parse_transcript(text: str, file_type: str) -> list[dict]

Each returned dict has keys:
    speaker_name, speaker_id, timestamp_start, timestamp_end, text, line_index
"""

import json
import re


def _hms_to_seconds(value: str) -> float:
    """Convert 'HH:MM:SS.mmm' / 'MM:SS' / 'M:SS' to float seconds."""
    value = value.strip().replace(",", ".")
    parts = value.split(":")
    try:
        parts = [float(p) for p in parts]
    except ValueError:
        return 0.0
    if len(parts) == 3:
        h, m, s = parts
        return h * 3600 + m * 60 + s
    if len(parts) == 2:
        m, s = parts
        return m * 60 + s
    if len(parts) == 1:
        return parts[0]
    return 0.0


def _assign_speaker_ids(rows: list[dict]) -> list[dict]:
    """Map distinct speaker names to stable SPEAKER_0N ids and add line_index."""
    speaker_map: dict[str, str] = {}
    result: list[dict] = []
    for idx, row in enumerate(rows):
        name = row.get("speaker_name") or "Unknown"
        if name not in speaker_map:
            speaker_map[name] = f"SPEAKER_{len(speaker_map) + 1:02d}"
        result.append(
            {
                "speaker_name": name,
                "speaker_id": row.get("speaker_id") or speaker_map[name],
                "timestamp_start": float(row.get("timestamp_start", 0.0)),
                "timestamp_end": float(
                    row.get("timestamp_end", row.get("timestamp_start", 0.0))
                ),
                "text": (row.get("text") or "").strip(),
                "line_index": idx,
            }
        )
    return result


# --- WebVTT ---------------------------------------------------------------

_VTT_TIME = re.compile(
    r"(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*"
    r"(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)"
)
_SPEAKER_PREFIX = re.compile(r"^\s*(?:<v\s+([^>]+)>|([^:<>]{1,40}?):)\s*(.*)$", re.DOTALL)


def _parse_vtt(text: str) -> list[dict]:
    rows: list[dict] = []
    blocks = re.split(r"\n\s*\n", text.strip())
    for block in blocks:
        if block.strip().upper().startswith("WEBVTT"):
            continue
        lines = [l for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        time_match = None
        time_line_idx = None
        for i, line in enumerate(lines):
            m = _VTT_TIME.search(line)
            if m:
                time_match = m
                time_line_idx = i
                break
        if not time_match:
            continue
        start = _hms_to_seconds(time_match.group(1))
        end = _hms_to_seconds(time_match.group(2))
        content = " ".join(lines[time_line_idx + 1 :]).strip()
        if not content:
            continue
        speaker_name = "Speaker"
        sm = _SPEAKER_PREFIX.match(content)
        if sm:
            speaker_name = (sm.group(1) or sm.group(2) or "Speaker").strip()
            content = (sm.group(3) or "").strip()
        # Strip any leftover VTT voice tags.
        content = re.sub(r"</?v[^>]*>", "", content).strip()
        rows.append(
            {
                "speaker_name": speaker_name,
                "timestamp_start": start,
                "timestamp_end": end,
                "text": content,
            }
        )
    return _assign_speaker_ids(rows)


# --- Plain text -----------------------------------------------------------

# Matches patterns like:
#   [00:01:23] SPEAKER_01: text
#   [0:01:23] Sarah Chen: text
#   Sarah Chen (0:01:23): text
#   00:01 - Sarah Chen: text
_TXT_PATTERNS = [
    re.compile(r"^\s*\[(?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\]\s*(?P<name>[^:]{1,40}):\s*(?P<text>.+)$"),
    re.compile(r"^\s*(?P<name>[^()]{1,40})\((?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\):\s*(?P<text>.+)$"),
    re.compile(r"^\s*(?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(?P<name>[^:]{1,40}):\s*(?P<text>.+)$"),
    re.compile(r"^\s*(?P<name>[^:]{1,40}):\s*(?P<text>.+)$"),  # fallback: "Name: text"
]


def _parse_txt(text: str) -> list[dict] | None:
    rows: list[dict] = []
    matched_any = False
    last_ts = 0.0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        matched = False
        for pi, pattern in enumerate(_TXT_PATTERNS):
            m = pattern.match(line)
            if m:
                matched = True
                matched_any = True
                ts = m.groupdict().get("ts")
                start = _hms_to_seconds(ts) if ts else last_ts + 5.0
                last_ts = start
                rows.append(
                    {
                        "speaker_name": m.group("name").strip(),
                        "timestamp_start": start,
                        "timestamp_end": start + 5.0,
                        "text": m.group("text").strip(),
                    }
                )
                break
        if not matched and rows:
            # Continuation line — append to previous row's text.
            rows[-1]["text"] += " " + line

    if not matched_any:
        return None

    # Backfill timestamp_end to next line's start where possible.
    for i in range(len(rows) - 1):
        rows[i]["timestamp_end"] = max(
            rows[i]["timestamp_start"], rows[i + 1]["timestamp_start"]
        )
    return _assign_speaker_ids(rows)


# --- JSON -----------------------------------------------------------------

def _parse_json(text: str) -> list[dict]:
    data = json.loads(text)
    if isinstance(data, dict):
        # Allow {"lines": [...]} or {"transcript": [...]}.
        data = data.get("lines") or data.get("transcript") or data.get("segments") or []
    rows: list[dict] = []
    for item in data:
        rows.append(
            {
                "speaker_name": item.get("speaker") or item.get("speaker_name") or "Speaker",
                "timestamp_start": float(item.get("start", item.get("timestamp_start", 0.0))),
                "timestamp_end": float(item.get("end", item.get("timestamp_end", 0.0))),
                "text": (item.get("text") or "").strip(),
            }
        )
    return _assign_speaker_ids(rows)


def parse_transcript(text: str, file_type: str) -> list[dict]:
    """Parse transcript text of a given type into structured line dicts.

    file_type: 'vtt' | 'txt' | 'json'
    Falls back to a single-block plain parse if structured parsing fails.
    """
    file_type = (file_type or "txt").lower().lstrip(".")

    if file_type == "vtt":
        rows = _parse_vtt(text)
        if rows:
            return rows
        # Fall through to txt parsing if VTT yielded nothing.
        file_type = "txt"

    if file_type == "json":
        try:
            return _parse_json(text)
        except (json.JSONDecodeError, TypeError, ValueError):
            file_type = "txt"

    # txt (or fallback)
    rows = _parse_txt(text)
    if rows is not None:
        return rows

    # Unstructured: split into pseudo-lines so the meeting still has content.
    # (In production this is where parse_transcript_with_ai would be called.)
    return _fallback_unstructured(text)


def _fallback_unstructured(text: str) -> list[dict]:
    """Best-effort split of unstructured text into sentences as lines."""
    chunks = re.split(r"(?<=[.!?])\s+", text.strip())
    rows: list[dict] = []
    t = 0.0
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        rows.append(
            {
                "speaker_name": "Speaker",
                "timestamp_start": t,
                "timestamp_end": t + 6.0,
                "text": chunk,
            }
        )
        t += 6.0
    return _assign_speaker_ids(rows)
