# Fireflies.ai Clone — Meeting Notes & Transcription Platform

A production-quality clone of Fireflies.ai built as a fullstack SDE assignment. The app replicates the Fireflies meeting-assistant experience: browsable meetings library, interactive transcripts with speaker labels and timestamps, AI-generated summaries and action items, bidirectional player-transcript sync, global search, and a full CRUD workflow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Axios, sonner |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy ORM, Pydantic v2 |
| **Database** | SQLite (development) — production-ready to swap to Postgres |
| **AI** | NVIDIA NIM free tier via OpenAI-compatible endpoint — Llama 3.1 70B (summaries/Q&A), Llama 3.1 8B (action items), Nemotron 70B (transcript parsing) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- NVIDIA API Key (free at [build.nvidia.com](https://build.nvidia.com)) — **optional**, app works fully with seeded data without it

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Optionally add your NVIDIA_API_KEY to .env

python seed.py                   # Seed 6 sample meetings
uvicorn main:app --reload --port 8001
```

Backend runs at http://localhost:8001  
API docs at http://localhost:8001/docs

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# .env.local already points to http://localhost:8001

npm run dev
```

Frontend runs at http://localhost:3000

---

## Database Schema

```
meetings          — id (UUID PK), title, date, duration_seconds, participants (JSON),
                    status ('processing'|'ready'|'error'), created_at, updated_at

transcripts       — id, meeting_id (FK→meetings, 1:1), raw_text, language, word_count

transcript_lines  — id, transcript_id (FK→transcripts), speaker_name, speaker_id,
                    timestamp_start, timestamp_end, text, line_index

summaries         — id, meeting_id (FK→meetings, 1:1), overview, key_topics (JSON),
                    chapters (JSON), generated_by, generated_at

action_items      — id, meeting_id (FK→meetings), task, owner, due_date_hint,
                    completed, created_at

highlights        — id, transcript_line_id (FK), meeting_id (FK), note, color (scaffold)
```

**Indexes:** `meetings.date`, `transcript_lines.transcript_id`, `action_items.meeting_id`

**Relationships:** Meeting → Transcript (1:1), Transcript → Lines (1:many ordered by line_index), Meeting → Summary (1:1), Meeting → ActionItems (1:many). All child rows cascade-delete with the meeting.

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/meetings` | List meetings (search, sort, paginate) |
| `POST` | `/api/meetings` | Create meeting + parse transcript + trigger AI |
| `GET` | `/api/meetings/{id}` | Full meeting detail (transcript, summary, action items) |
| `PATCH` | `/api/meetings/{id}` | Update title / participants |
| `DELETE` | `/api/meetings/{id}` | Delete meeting (cascade) |
| `POST` | `/api/meetings/{id}/action-items` | Add action item |
| `PATCH` | `/api/meetings/{id}/action-items/{itemId}` | Update/complete action item |
| `DELETE` | `/api/meetings/{id}/action-items/{itemId}` | Delete action item |
| `GET` | `/api/meetings/{id}/summary` | Get summary |
| `POST` | `/api/meetings/{id}/summary/regenerate` | Trigger AI re-generation |
| `POST` | `/api/ai/process-transcript` | Queue AI pipeline for a meeting |
| `POST` | `/api/ai/ask` | Streaming Q&A (SSE) over the transcript |
| `GET` | `/api/meetings/{id}/status` | Poll processing status |
| `GET` | `/api/search` | Full-text search across meetings and transcripts |
| `GET` | `/health` | Health check |

---

## Architecture

```
Browser (Next.js 14)
  ├── App Shell: Sidebar + Navbar + Mobile bottom nav
  ├── /meetings — Meetings Library (filtered grid + create modal)
  ├── /meetings/[id] — Two-panel: Media Player + Transcript | Summary Tabs
  ├── /settings — Profile, AI prefs, theme, API key config
  └── Cmd+K — Global command palette (search across all meetings)
        │
        │  HTTP/SSE  (axios + fetch)
        ▼
FastAPI (Python)
  ├── CORS middleware + request logging
  ├── Routers: meetings, action_items, summaries, ai, search
  ├── AI Service → NVIDIA NIM (async, retries, mock fallback)
  ├── Transcript Parser (.vtt / .txt / .json → structured lines)
  └── Background Tasks (FastAPI BackgroundTasks) — AI never blocks HTTP
        │
        ▼
SQLite (SQLAlchemy ORM)
```

**AI flow:** POST /api/meetings → parse transcript → respond immediately (status=processing) → BackgroundTask runs: generate_summary + extract_action_items → update DB → poll /status until ready.

**No API key?** Every AI function has a deterministic mock fallback so the full demo works without NVIDIA credentials.

---

## AI Model Assignments

| Feature | Model |
|---------|-------|
| Summary generation | `meta/llama-3.1-70b-instruct` |
| Action item extraction | `meta/llama-3.1-8b-instruct` |
| Q&A chat (streaming) | `meta/llama-3.1-70b-instruct` |
| Transcript parsing (unstructured) | `nvidia/llama-3.1-nemotron-70b-instruct` |

All models via `https://integrate.api.nvidia.com/v1` (NVIDIA NIM free tier).

---

## Assumptions

- No real authentication — a single default "Demo User" is assumed logged in.
- No real audio transcription — transcripts are seeded, pasted, or uploaded as `.txt`/`.vtt`/`.json` files.
- The media player simulates playback timing when no MP3 file is present (add `/public/sample-audio.mp3` for real audio).
- SQLite is used for simplicity; the app is ready to migrate to Postgres by updating `DATABASE_URL`.

---

## Future Improvements

- Real speech-to-text (Whisper or NVIDIA Parakeet)
- Real user authentication (NextAuth.js or Clerk)
- Postgres + Redis job queue for production AI processing at scale
- Calendar integrations (Google Meet, Zoom) for automatic meeting ingestion
- Highlights / soundbites on transcript segments
- Real-time collaborative notes
- Semantic search using NVIDIA embedding models (`nv-embedqa-e5-v5`)
