# 🔥 Fireflies.ai Clone — Full-Stack SDE Assignment
## Elaborative Context-Rich Claude Prompt (Production-Grade, Step-by-Step)

---

> **How to use this document:**
> Copy each section's prompt block into Claude (or your AI tool of choice) **one phase at a time**. Each phase builds on the previous. Never skip a phase. Every prompt is self-contained with enough context so Claude never loses the thread.

---

## 📦 PROJECT OVERVIEW (Read Before Every Session)

```
You are a senior full-stack engineer building a production-ready Fireflies.ai clone — a meeting notes and transcription platform. The stack is:

- Frontend: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- Backend: Python FastAPI
- Database: SQLite with SQLAlchemy ORM
- AI Layer: NVIDIA NIM free-tier APIs (https://build.nvidia.com/models) — all LLM calls go through NVIDIA's OpenAI-compatible endpoint

The app must visually and functionally replicate Fireflies.ai — NOT be a generic notes app.
Evaluate every UI decision by asking: "Does this look and feel like Fireflies?"
Code must be production-standard: typed, modular, error-handled, and documented.
```

---

## 🤖 AI MODEL DECISIONS — NVIDIA FREE API LAYER

> **Before writing any AI-related code, confirm these model assignments with the user.** All models are available free via `https://build.nvidia.com/models`. Use NVIDIA's OpenAI-compatible endpoint: `https://integrate.api.nvidia.com/v1`.

```
AI FEATURE → RECOMMENDED NVIDIA MODEL (free tier):

1. TRANSCRIPT SUMMARISATION (meeting summary, key topics, chapters):
   Model: `meta/llama-3.1-70b-instruct`
   Why: Long-context, instruction-following, best free option for structured summarisation.
   Endpoint: POST https://integrate.api.nvidia.com/v1/chat/completions
   Input: Raw transcript text (chunked if >4000 tokens)
   Output: JSON { summary, key_topics[], chapters[] }

2. ACTION ITEM EXTRACTION (tasks from transcript):
   Model: `meta/llama-3.1-8b-instruct`
   Why: Faster/cheaper for structured extraction, good at list outputs.
   Input: Transcript text
   Output: JSON { action_items: [{task, owner, due_date_hint}] }

3. "ASK A QUESTION ABOUT THIS MEETING" CHAT (bonus feature):
   Model: `meta/llama-3.1-70b-instruct`
   Why: Needs reasoning + context retention.
   Pattern: Include full transcript in system prompt, stream user Q&A.

4. TRANSCRIPT PARSING / CLEANUP (optional — normalise uploaded .vtt/.txt):
   Model: `nvidia/llama-3.1-nemotron-70b-instruct`
   Why: NVIDIA-tuned instruction model, excellent for format conversion tasks.
   Input: Raw .vtt or .txt file content
   Output: Structured JSON [{speaker, timestamp_seconds, text}]

5. GLOBAL SEARCH SEMANTIC RANKING (bonus):
   Model: `nvidia/nv-embedqa-e5-v5` (embedding model)
   Why: Free embedding model for semantic similarity search across transcripts.

IMPORTANT FOR THE USER:
- Get your NVIDIA API key from https://build.nvidia.com → "Get API Key" (free, no credit card).
- Set it as: NVIDIA_API_KEY=nvapi-xxxx in your .env file.
- All calls use OpenAI SDK with base_url="https://integrate.api.nvidia.com/v1".
- Free tier has rate limits — implement retry logic with exponential backoff.
- Always make AI processing ASYNC (background task in FastAPI) — never block the API response.
```

---

## 🗄️ PHASE 0 — PROJECT SCAFFOLD & REPO STRUCTURE

### Prompt 0A — Repository & Monorepo Layout

```
Create the complete project scaffold for the Fireflies.ai clone.

Root structure:
/
├── frontend/          # Next.js 14 App Router (TypeScript)
├── backend/           # FastAPI (Python 3.11+)
├── docker-compose.yml # optional, for local dev convenience
├── README.md          # filled out at the end
└── .gitignore

FRONTEND (Next.js):
frontend/
├── app/
│   ├── layout.tsx              # Root layout with sidebar + navbar
│   ├── page.tsx                # Redirect → /meetings
│   ├── meetings/
│   │   ├── page.tsx            # Meetings Library (dashboard)
│   │   └── [id]/
│   │       └── page.tsx        # Meeting Detail View
│   ├── settings/
│   │   └── page.tsx            # Settings placeholder
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── PageShell.tsx
│   ├── meetings/
│   │   ├── MeetingCard.tsx
│   │   ├── MeetingList.tsx
│   │   ├── MeetingFilters.tsx
│   │   ├── CreateMeetingModal.tsx
│   │   └── DeleteMeetingDialog.tsx
│   ├── transcript/
│   │   ├── TranscriptPanel.tsx
│   │   ├── TranscriptLine.tsx
│   │   └── TranscriptSearch.tsx
│   ├── summary/
│   │   ├── SummaryPanel.tsx
│   │   ├── ActionItemList.tsx
│   │   └── KeyTopics.tsx
│   ├── player/
│   │   └── MediaPlayer.tsx
│   └── ui/                     # shadcn/ui re-exports + custom primitives
├── lib/
│   ├── api.ts                  # Axios instance + typed API calls
│   ├── types.ts                # All shared TypeScript interfaces
│   └── utils.ts
├── hooks/
│   ├── useMeetings.ts
│   ├── useMeeting.ts
│   └── useTranscriptSync.ts
└── public/
    └── sample-audio.mp3        # placeholder audio file

BACKEND (FastAPI):
backend/
├── main.py                     # FastAPI app entry point
├── database.py                 # SQLite + SQLAlchemy setup
├── models.py                   # ORM models
├── schemas.py                  # Pydantic schemas (request/response)
├── routers/
│   ├── meetings.py
│   ├── transcripts.py
│   ├── summaries.py
│   ├── action_items.py
│   └── ai.py                   # AI processing endpoints
├── services/
│   ├── ai_service.py           # NVIDIA API calls
│   ├── transcript_parser.py    # .vtt / .txt / .json parser
│   └── seed_service.py         # Database seeder
├── seed.py                     # Run to seed DB
├── requirements.txt
└── .env.example

Output:
1. Create every file listed above (empty with correct imports/boilerplate).
2. Include package.json for frontend with: next, react, typescript, tailwindcss, @tanstack/react-query, axios, date-fns, lucide-react, shadcn/ui, clsx, tailwind-merge.
3. Include requirements.txt: fastapi, uvicorn, sqlalchemy, pydantic, python-dotenv, openai, python-multipart, aiofiles.
4. Setup tailwind.config.ts with Fireflies-matching dark purple/dark theme.
5. Add .env.example for both frontend and backend.

Do NOT fill in business logic yet — just scaffold.
```

---

## 🗃️ PHASE 1 — DATABASE SCHEMA & SEEDING

### Prompt 1A — SQLAlchemy Models

```
Implement the complete SQLite database schema for the Fireflies clone using SQLAlchemy ORM in backend/models.py and backend/database.py.

SCHEMA DESIGN (implement exactly this):

Table: meetings
- id: UUID (primary key, auto-generated)
- title: String (not null)
- date: DateTime (not null)
- duration_seconds: Integer (total meeting length in seconds)
- participants: JSON (list of {name: str, email: str})
- status: Enum ['processing', 'ready', 'error'] (default: 'ready')
- created_at: DateTime (auto now)
- updated_at: DateTime (auto now update)

Table: transcripts
- id: UUID (primary key)
- meeting_id: FK → meetings.id (cascade delete, unique — 1:1)
- raw_text: Text (full plaintext of transcript)
- language: String (default 'en')
- word_count: Integer

Table: transcript_lines
- id: UUID (primary key)
- transcript_id: FK → transcripts.id (cascade delete)
- speaker_name: String
- speaker_id: String (e.g. "SPEAKER_01")
- timestamp_start: Float (seconds)
- timestamp_end: Float (seconds)
- text: String
- line_index: Integer (ordering)

Table: summaries
- id: UUID (primary key)
- meeting_id: FK → meetings.id (cascade delete, unique — 1:1)
- overview: Text (2-3 paragraph AI summary)
- key_topics: JSON (list of strings)
- chapters: JSON (list of {title: str, start_seconds: float, summary: str})
- generated_by: String (model name used)
- generated_at: DateTime

Table: action_items
- id: UUID (primary key)
- meeting_id: FK → meetings.id (cascade delete)
- task: String
- owner: String (participant name or null)
- due_date_hint: String (nullable — e.g. "by Friday")
- completed: Boolean (default False)
- created_at: DateTime

Table: highlights  [bonus — scaffold now]
- id: UUID (primary key)
- transcript_line_id: FK → transcript_lines.id (cascade delete)
- meeting_id: FK → meetings.id
- note: Text (nullable)
- color: String (default 'yellow')
- created_at: DateTime

RELATIONSHIPS:
- Meeting → Transcript: one-to-one
- Transcript → TranscriptLine: one-to-many (ordered by line_index)
- Meeting → Summary: one-to-one
- Meeting → ActionItems: one-to-many
- Meeting → Highlights: one-to-many (via transcript_lines)

REQUIREMENTS:
1. All IDs use Python uuid4(), stored as String.
2. Add __repr__ methods to each model.
3. Add indexes on: meetings.date, transcript_lines.transcript_id, action_items.meeting_id.
4. database.py must expose: engine, SessionLocal, Base, get_db (FastAPI dependency).
5. Include create_all() called on startup.
```

### Prompt 1B — Database Seeder

```
Create backend/seed.py that seeds the database with realistic Fireflies-quality sample data.

Seed exactly 6 meetings with varied content:

MEETING 1: "Q3 Product Roadmap Review"
- Date: 3 days ago, Duration: 47 minutes
- Participants: Sarah Chen (PM), James Okafor (Eng Lead), Priya Nair (Design), Luca Ferrari (Backend)
- Transcript: 40+ lines, realistic product discussion about feature prioritisation, sprint planning, design feedback
- Speakers alternate naturally, use realistic Fireflies-style timestamps
- Summary: AI-generated style, 2-3 paragraphs about what was decided
- Key Topics: ["Sprint Planning", "Feature Prioritization", "Design System", "API Performance"]
- Chapters: 3 chapters (Intro, Main Discussion, Next Steps)
- Action Items: 4 items (e.g. "Priya to finalize dashboard mockups by EOW", "Luca to profile API endpoint latency")

MEETING 2: "Weekly Engineering Standup — Week 28"
- Date: 1 day ago, Duration: 18 minutes
- Participants: 5 engineers, casual standup tone
- Transcript: Short updates, blockers mentioned, quick resolution discussion
- Action Items: 3 items

MEETING 3: "Customer Interview — Acme Corp Onboarding"
- Date: 1 week ago, Duration: 32 minutes
- Participants: Alex Rivera (Sales), Maria Fontaine (Customer Success), Tom B. (Acme Corp client)
- Transcript: Customer talking about pain points, CS responding, lots of question/answer
- Summary: Customer feedback focused
- Action Items: 5 items (follow-ups, feature requests)

MEETING 4: "Design System Alignment"
- Date: 2 weeks ago, Duration: 55 minutes
- Participants: Design team (3 people)
- Transcript: Detailed design discussion, component names, color tokens, Figma references

MEETING 5: "Investor Update Prep"
- Date: 3 weeks ago, Duration: 28 minutes
- Participants: CEO, CFO, Head of Growth
- Transcript: Metrics discussion, ARR, churn, growth projections

MEETING 6: "Backend Architecture Deep Dive"
- Date: 1 month ago, Duration: 1 hour 22 minutes
- Participants: 4 backend engineers
- Transcript: Technical discussion, database choices, caching strategy, microservices debate

REQUIREMENTS:
1. Each meeting must have 30-60 transcript lines (enough to make the transcript panel feel real).
2. Timestamps must be realistic (incrementing by 5-30 seconds per line).
3. speaker_id values like "SPEAKER_01", "SPEAKER_02" mapped to real participant names.
4. Summaries must read like Fireflies AI output — professional, concise, structured.
5. Run via: `python seed.py` — it should DROP and recreate all tables, then seed.
6. Print confirmation after each meeting is inserted.
```

---

## 🔌 PHASE 2 — BACKEND API (FastAPI)

### Prompt 2A — Meetings Router

```
Implement backend/routers/meetings.py — the meetings CRUD API.

All routes use /api/meetings prefix. Use Pydantic schemas from backend/schemas.py (define them too).

ENDPOINTS:

GET /api/meetings
- Query params: search (str), sort_by ('date'|'title', default 'date'), order ('asc'|'desc', default 'desc'), limit (int, default 20), offset (int, default 0)
- Filter by search: match against title OR participant names (case-insensitive)
- Response: { meetings: MeetingListItem[], total: int }
- MeetingListItem includes: id, title, date, duration_seconds, participants, status, has_summary (bool), action_items_count (int), action_items_completed (int)

GET /api/meetings/{meeting_id}
- Full meeting detail
- Response: MeetingDetail { ...all meeting fields, transcript: TranscriptDetail, summary: SummaryDetail | null, action_items: ActionItem[] }
- 404 if not found

POST /api/meetings
- Body: CreateMeetingRequest { title, date, participants, transcript_text?: str, transcript_file_type?: 'txt'|'vtt'|'json' }
- If transcript_text provided: parse it via transcript_parser service, create transcript + lines
- Create meeting with status='processing' → background task triggers AI summary generation
- Response: MeetingDetail (201)

PATCH /api/meetings/{meeting_id}
- Body: UpdateMeetingRequest { title?: str, participants?: list }
- Partial update, return updated MeetingDetail

DELETE /api/meetings/{meeting_id}
- Cascade deletes transcript, summary, action items
- Return 204

SCHEMAS to define in schemas.py:
- Participant: { name: str, email: str | None }
- TranscriptLineSchema: { id, speaker_name, speaker_id, timestamp_start, timestamp_end, text, line_index }
- TranscriptDetailSchema: { id, raw_text, word_count, lines: List[TranscriptLineSchema] }
- SummarySchema: { id, overview, key_topics, chapters, generated_by, generated_at }
- ActionItemSchema: { id, task, owner, due_date_hint, completed, created_at }
- MeetingListItem, MeetingDetail, CreateMeetingRequest, UpdateMeetingRequest (as above)

REQUIREMENTS:
1. Use async def for all handlers.
2. Proper HTTPException with meaningful detail strings.
3. Background tasks for AI processing (FastAPI BackgroundTasks).
4. Add CORS middleware in main.py: allow localhost:3000.
5. All responses go through Pydantic — no raw dicts.
```

### Prompt 2B — Action Items, Summaries, AI Routers

```
Implement the remaining routers: action_items, summaries, and ai.

--- backend/routers/action_items.py ---

PATCH /api/meetings/{meeting_id}/action-items/{item_id}
- Body: { completed?: bool, task?: str, owner?: str, due_date_hint?: str }
- Partial update action item

POST /api/meetings/{meeting_id}/action-items
- Body: { task: str, owner?: str, due_date_hint?: str }
- Add new action item to existing meeting

DELETE /api/meetings/{meeting_id}/action-items/{item_id}
- Delete a single action item, return 204

--- backend/routers/summaries.py ---

GET /api/meetings/{meeting_id}/summary
- Return summary or 404 if not yet generated

POST /api/meetings/{meeting_id}/summary/regenerate
- Trigger background re-generation of summary using AI
- Return { status: 'processing', message: 'Summary regeneration started' }

--- backend/routers/ai.py ---

POST /api/ai/process-transcript
- Body: { meeting_id: str }
- Triggers: 1) summarisation, 2) action item extraction
- Runs async in background
- Returns { status: 'queued' }

POST /api/ai/ask  [bonus]
- Body: { meeting_id: str, question: str, conversation_history: [{role, content}] }
- Uses transcript as context, calls NVIDIA llama-3.1-70b
- Streams response using StreamingResponse
- Returns Server-Sent Events stream

GET /api/meetings/{meeting_id}/status
- Returns { meeting_id, status, summary_ready: bool, action_items_count: int }
- Used for polling after meeting creation

All routers must be registered in main.py with correct prefixes and tags.
```

### Prompt 2C — AI Service & Transcript Parser

```
Implement backend/services/ai_service.py and backend/services/transcript_parser.py.

--- ai_service.py ---

Use the OpenAI Python SDK pointed at NVIDIA's endpoint:
  base_url = "https://integrate.api.nvidia.com/v1"
  api_key = os.getenv("NVIDIA_API_KEY")

Implement these async functions:

async def generate_summary(transcript_text: str, meeting_title: str) -> dict:
  Model: meta/llama-3.1-70b-instruct
  System prompt: "You are a meeting intelligence assistant like Fireflies.ai. Analyse the transcript and return ONLY valid JSON."
  User prompt: structured prompt asking for { overview, key_topics, chapters }
  - overview: 2-3 paragraph professional summary
  - key_topics: list of 4-8 topic strings
  - chapters: list of { title, start_seconds (approximate), summary (1 sentence) }
  Handle: JSON parse errors (retry once with stricter prompt), rate limit errors (wait + retry), token limit (chunk transcript if >8000 chars)
  Return: parsed dict or raise AIProcessingError

async def extract_action_items(transcript_text: str, participants: list) -> list:
  Model: meta/llama-3.1-8b-instruct
  Prompt: Extract all action items, tasks, commitments. For each: { task, owner (match to participant names), due_date_hint }
  Return: list of action item dicts

async def ask_question(transcript_text: str, question: str, history: list) -> AsyncGenerator:
  Model: meta/llama-3.1-70b-instruct with stream=True
  System: full transcript embedded as context
  Yield streamed chunks for SSE

async def parse_transcript_with_ai(raw_text: str) -> list:
  Model: nvidia/llama-3.1-nemotron-70b-instruct
  Use when uploaded .txt has no clear structure — ask AI to identify speakers and timestamps
  Return: list of { speaker_name, timestamp_start, timestamp_end, text }

Add:
- Exponential backoff retry decorator (max 3 attempts)
- AIProcessingError custom exception
- Logging for every AI call (model used, tokens, latency)

--- transcript_parser.py ---

Implement parse_transcript(text: str, file_type: str) -> List[TranscriptLineDict]:

For file_type='vtt' (WebVTT format):
  Parse WEBVTT cue blocks: timestamp ranges → seconds, extract speaker from "Speaker Name: text" pattern
  
For file_type='txt':
  Detect common patterns:
  - "[00:01:23] SPEAKER_01: text"
  - "Speaker Name (0:01:23): text"
  - "00:01 - Name: text"
  If pattern undetectable, call parse_transcript_with_ai()

For file_type='json':
  Expect array of { speaker, start, end, text } — map to internal format

Return list of dicts: { speaker_name, speaker_id, timestamp_start, timestamp_end, text, line_index }
```

---

## 🎨 PHASE 3 — FRONTEND: LAYOUT & DESIGN SYSTEM

### Prompt 3A — Global Layout, Sidebar, Navbar

```
Implement the Fireflies.ai visual layout for the Next.js frontend.

FIREFLIES DESIGN REFERENCE:
Study Fireflies.ai carefully. Their design uses:
- Dark navy/purple-black sidebar (#0F0F1A background, ~240px wide)
- Clean white/light grey content area  
- Purple accent color (#7C3AED → Fireflies uses a similar violet-purple)
- Inter font (or similar clean sans-serif)
- Very clean, minimal, productivity-focused aesthetic
- No clutter — lots of whitespace
- Meeting cards with subtle shadows and hover states

Implement in app/layout.tsx:
- Root layout: flex row, full height, sidebar + main content
- Sidebar: fixed left, full height, dark background
- Main: flex-1, scrollable, light background

Implement components/layout/Sidebar.tsx:
EXACT Fireflies sidebar structure:
- Top: Fireflies logo (use a flame emoji + "Fireflies" wordmark in purple)
- Navigation items (with icons from lucide-react):
  - 🏠 Meetings (link to /meetings)
  - 🔍 Search (link to /search or opens global search)
  - ⚡ Action Items (link to /action-items — placeholder page)
  - 📅 Calendar (link to /calendar — coming soon)
  - ⚙️ Settings (link to /settings)
- Bottom: User avatar + name + plan badge ("Free Plan")
- Active state: highlight with purple background pill
- Hover state: subtle background

Implement components/layout/Navbar.tsx:
- Top bar of the content area
- Left: Page title (dynamic based on route)
- Right: "Add Meeting" button (primary purple), notification bell (placeholder), avatar
- Sticky at top of content area

REQUIREMENTS:
1. Use Tailwind CSS exclusively — no inline styles.
2. Sidebar must be responsive: collapses to icon-only on mobile (<768px).
3. Use next/link for all navigation.
4. Add toast notification system (use react-hot-toast or sonner).
5. Add a ThemeProvider wrapper (dark/light mode support — default light).
6. Export PageShell component: takes children, renders inside layout correctly.
```

### Prompt 3B — Tailwind & shadcn/ui Config

```
Configure Tailwind and shadcn/ui to match the Fireflies design system exactly.

tailwind.config.ts — extend with:
colors:
  brand:
    50: '#f5f3ff'
    100: '#ede9fe'
    500: '#7C3AED'   (primary purple)
    600: '#6D28D9'   (hover)
    700: '#5B21B6'   (active)
  sidebar:
    bg: '#0F0F1A'
    hover: '#1A1A2E'
    active: '#252540'
    text: '#A0A0C0'
    textActive: '#FFFFFF'
  surface:
    card: '#FFFFFF'
    bg: '#F8F7FF'
    border: '#E5E3F0'

typography:
  fontFamily: Inter (add Google Fonts import in layout.tsx)

borderRadius:
  DEFAULT: '0.5rem'
  lg: '0.75rem'
  xl: '1rem'

boxShadow:
  card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
  cardHover: '0 4px 12px rgba(124,58,237,0.08)'

Initialize shadcn/ui components needed:
- Button (variants: default/outline/ghost/destructive)
- Input
- Badge
- Dialog (for modals)
- DropdownMenu
- Tooltip
- Skeleton (loading states)
- Progress
- Separator
- ScrollArea
- Tabs (for meeting detail panel switching)
- Avatar
- Command (for search)
- Popover
- Select

Make sure all shadcn colors map to our brand palette above.
```

---

## 📋 PHASE 4 — MEETINGS LIBRARY (DASHBOARD)

### Prompt 4A — Meetings List Page

```
Build the Meetings Library page — app/meetings/page.tsx and its components.

This is the Fireflies home/dashboard view. Match it exactly.

PAGE LAYOUT:
- Header: "Meetings" title, filter bar, "New Meeting" button (right)
- Filter bar (below header): search input, date range picker, sort dropdown
- Meetings grid: responsive, 1 col mobile / 2 col tablet / 3 col desktop
- Empty state: when no meetings match filters

Implement components/meetings/MeetingCard.tsx:
Fireflies-style card design:
- White card, subtle border, hover shadow (brand.cardHover)
- Top: coloured meeting type indicator strip (narrow, 3px, purple gradient)
- Meeting title (bold, 16px)
- Date + time (formatted: "Mon, Jul 14 · 2:30 PM")
- Duration badge ("47 min") 
- Participant avatars (stacked, max 4 shown, +N for rest)
- Status badge: "Ready" (green) | "Processing" (yellow spinner) | "Error" (red)
- Bottom row: action items count chip ("4 tasks"), topics count ("6 topics")
- Three-dot menu (⋮): Edit, Delete
- Entire card is clickable → /meetings/[id]
- Hover: slight lift with shadow transition (200ms ease)

Implement components/meetings/MeetingFilters.tsx:
- Search input: magnifying glass icon, "Search meetings..." placeholder, debounced 300ms
- Sort dropdown: "Most Recent" | "Oldest First" | "Title A-Z"
- Date filter: "All time" | "Today" | "This week" | "This month" | custom range
- Clear filters button (appears only when filters active)
- Filter changes update URL query params (use Next.js useSearchParams)

Implement hooks/useMeetings.ts:
- Use @tanstack/react-query
- Fetch from GET /api/meetings with all filter params
- Returns { meetings, total, isLoading, isError, refetch }
- Optimistic delete

Loading state: show 6 MeetingCard skeletons (Skeleton component, animate-pulse)
Error state: error banner with retry button

REQUIREMENTS:
1. URL-driven filters: ?search=&sort=&date= — so links are shareable
2. Keyboard accessible card interactions
3. Smooth transitions between loading/loaded states
4. Meeting count shown: "24 meetings" (or "3 of 24 meetings" when filtered)
```

### Prompt 4B — Create Meeting Modal

```
Implement components/meetings/CreateMeetingModal.tsx — triggered by "New Meeting" button.

This is a multi-step modal matching Fireflies's "Add Meeting" flow.

STEP 1: Basic Info
- Meeting title (required, text input)
- Date & time (datetime-local input, defaults to now)
- Participants: tag-style input — type name → press Enter/comma → creates pill tag
  - Each tag: Avatar initial + name + × to remove
  - Minimum 1 participant required
- "Next: Add Transcript" button

STEP 2: Transcript Input (tabbed)
- Tab 1: "Paste Transcript" — textarea, large, monospace font, placeholder with example format
- Tab 2: "Upload File" — drag-and-drop zone + click to upload
  - Accepts: .txt, .vtt, .json
  - Shows filename + file size after selection
  - Parse preview: shows first 3 lines detected
- Tab 3: "Skip for now" — creates empty meeting, can add transcript later

STEP 3: AI Processing (shown after form submit)
- "🤖 Generating AI Summary..." animation
- Progress steps:
  ✅ Meeting created
  ⏳ Parsing transcript...
  ⏳ Generating summary with Llama 3.1...
  ⏳ Extracting action items...
- Poll GET /api/meetings/{id}/status every 2 seconds
- On complete: "✅ Ready! View Meeting →" button
- On error: error message + "Retry AI Processing" button

MODAL BEHAVIOUR:
- Backdrop blur overlay
- Escape key closes (with confirmation if data entered)
- 600px wide, centred
- Step indicator at top (1 → 2 → 3)
- Back button between steps

After successful creation: close modal, add new meeting to top of list (optimistic update), show toast: "Meeting added successfully".
```

---

## 📄 PHASE 5 — MEETING DETAIL VIEW

### Prompt 5A — Meeting Detail Page Layout

```
Build app/meetings/[id]/page.tsx — the core meeting detail page.

This replicates the Fireflies meeting page exactly. Study it carefully.

PAGE LAYOUT (critical — must match Fireflies):
- Page header:
  - Back button (← Meetings)
  - Meeting title (editable inline — click to edit, blur to save)
  - Date, duration, participants row
  - Right side: "Share" button (placeholder), "Export" dropdown, three-dot menu
  
- Below header: TWO PANEL LAYOUT
  LEFT PANEL (60% width): Transcript + Media Player
  RIGHT PANEL (40% width): Summary / Notes / Action Items (tabbed)

LEFT PANEL:
  Top: MediaPlayer component (sticky at top of left panel)
  Below: Transcript panel (scrollable)

RIGHT PANEL (Tabs):
  Tab 1: "Summary" — overview + chapters
  Tab 2: "Action Items" — tasks list
  Tab 3: "Key Topics" — topic chips
  Tab 4: "Notes" — free text notes area [placeholder — "Coming soon"]
  Tab 5: "Ask Fireflies" — Q&A chat [bonus]

Implement hooks/useMeeting.ts:
- Fetch full meeting detail from GET /api/meetings/{id}
- Returns { meeting, transcript, summary, actionItems, isLoading, isError }
- Refetch on focus

Loading state: skeleton layout matching the exact two-panel structure.
Error/not-found: friendly error with back button.

REQUIREMENTS:
1. The two-panel layout must be sticky: left panel has sticky player, transcript scrolls independently.
2. Right panel tabs persist via URL hash (#summary, #actions, etc.)
3. Inline title editing: click → input appears → Escape cancels / Enter/blur saves → PATCH /api/meetings/{id}
4. All panels handle empty states gracefully (e.g. no summary yet: "AI summary not yet generated. Click Generate.")
```

### Prompt 5B — Transcript Panel

```
Implement components/transcript/TranscriptPanel.tsx — the core interactive transcript.

This is the most technically important component. Match Fireflies exactly.

VISUAL DESIGN:
- White background, clean typography
- Each transcript line is a row:
  - Left: Speaker avatar (coloured initial circle, consistent colour per speaker)
  - Speaker name (bold, 13px)
  - Timestamp (e.g. "0:01:23") — clickable, monospace, purple on hover
  - Text content (16px, reading-friendly line-height)
  - Hover: subtle highlight background + show highlight button (🔖)
  - Active line (currently playing): left purple border, slightly highlighted background
  
- Speaker colours: assign consistent colour per speaker_id from a palette of 8 colours

TRANSCRIPT SEARCH (Implement components/transcript/TranscriptSearch.tsx):
- Search bar at top of panel: "Search transcript..."
- As user types: highlight matching text in all transcript lines (yellow highlight)
- Show match count: "3 of 12 matches"
- Up/Down arrow buttons to navigate matches
- Matching lines auto-scroll into view
- Escape clears search

PLAYER SYNC (implement hooks/useTranscriptSync.ts):
- The transcript must sync bidirectionally with the media player:
  
  Player → Transcript:
  - As audio plays, track currentTime
  - Auto-scroll to and highlight the transcript line matching current timestamp
  - Highlight the active line with left border + background tint
  
  Transcript → Player:
  - Clicking a timestamp: seek player to that timestamp
  - Clicking anywhere in a transcript line also seeks

IMPLEMENTATION NOTES:
1. Use useRef for transcript container + individual line refs.
2. scrollIntoView({ behavior: 'smooth', block: 'center' }) for active line.
3. Debounce scroll-to-active by 100ms to prevent jank.
4. Transcript lines are virtualised if > 200 lines (use @tanstack/virtual or simple windowing).
5. Speaker colours: map speaker_id to colours using index % colourPalette.length.
6. Highlight button (🔖): on click, POST /api/meetings/{id}/highlights with line id — show confirmation toast.
```

### Prompt 5C — Media Player

```
Implement components/player/MediaPlayer.tsx — the Fireflies-style player bar.

Since real audio transcription is out of scope, the player uses a sample audio file. The player's CONTROLS and SYNC behaviour must still work fully.

VISUAL DESIGN (match Fireflies):
- Sticky at top of left panel, below the page header
- Dark background (#1A1A2E), ~80px tall
- Left: Play/Pause button (circle, large)
- Centre: Waveform seek bar (can be a simple styled range input styled to look like a waveform OR a static waveform image with a position cursor)
- Below seek bar: current time "1:23" / total time "47:00"
- Right: Speed selector (0.75x, 1x, 1.25x, 1.5x, 2x dropdown), Volume slider, download icon

IMPLEMENTATION:
- Use HTML5 <audio> element (hidden) + custom controls
- Audio source: /sample-audio.mp3 (public folder — can be any short MP3)
- If no real audio: disable play button with tooltip "Audio not available for this meeting"

Props interface:
  interface MediaPlayerProps {
    duration: number;            // meeting duration in seconds
    onTimeUpdate: (time: number) => void;  // fires as audio plays
    seekTo: number | null;       // external seek requests from transcript clicks
    onSeekComplete: () => void;  // reset seekTo to null after seeking
  }

State:
- isPlaying, currentTime, volume, playbackRate, isMuted

Keyboard shortcuts:
- Space: play/pause
- ← / →: seek -5s / +5s
- M: mute toggle
- Add small tooltip showing keyboard shortcuts on hover

REQUIREMENTS:
1. Even without real audio, the seek bar must be draggable and update currentTime visually.
2. onTimeUpdate must fire every ~250ms while "playing" (simulate with setInterval if no real audio).
3. seekTo prop: when this changes, update the displayed time and fire onTimeUpdate.
4. The player must feel polished — this is what interviewers will click on.
```

### Prompt 5D — Summary & Action Items Panel

```
Implement the right panel components for the Meeting Detail view.

--- components/summary/SummaryPanel.tsx ---

VISUAL DESIGN (match Fireflies Summary tab):
- Clean white panel
- "AI Summary" header with model badge ("Generated by Llama 3.1")
- Overview text: 2-3 paragraphs, comfortable line-height, slightly muted text colour
- "Generate Summary" button if no summary exists (triggers POST /api/meetings/{id}/summary/regenerate)
- Processing state: pulsing "Generating summary with AI..." indicator

Chapters section:
- "Chapters" heading with collapse toggle
- Each chapter: timeline dot + title + time range + one-line summary
- Clicking chapter timestamp → seeks player to that point

Key Topics section:
- "Key Topics" heading
- Topic chips: rounded pill tags, purple tint, icon (💬)
- Each topic is a chip — clicking it could filter transcript (bonus)

--- components/summary/ActionItemList.tsx ---

VISUAL DESIGN (match Fireflies Action Items):
- Each action item is a row:
  - Checkbox (click to toggle complete)
  - Task text (strikethrough when complete, muted colour)
  - Owner chip (avatar initial + name, small)
  - Due date hint (if present, calendar icon + text)
  - ✏️ edit icon (hover only) → inline edit
  - 🗑️ delete icon (hover only) → confirm + delete
- Completed items: grouped below active items with "Completed (2)" collapsible section

"+ Add Action Item" button at bottom:
- Click → inline form appears below the list
- Input: task text, owner select (from meeting participants), optional due date
- Enter/✓ to save → POST /api/meetings/{id}/action-items
- Escape to cancel

Empty state: "No action items yet. Add one or let AI extract them."

BEHAVIOUR:
1. Optimistic UI: toggle complete immediately, revert on error.
2. Inline edit: click ✏️ → task text becomes editable input.
3. Completed count in the tab badge: "Action Items (4/6)".
```

---

## 🔍 PHASE 6 — SEARCH, SETTINGS & BONUS FEATURES

### Prompt 6A — Global Search

```
Implement global search across all meetings.

Two levels:
1. Dashboard search (already done in filters) — filters meeting list by title/participants.
2. Full global transcript search — search WITHIN transcript text across ALL meetings.

For level 2, implement a Command Palette (Cmd+K / Ctrl+K):
- Overlay that appears: dark backdrop, centred search box (shadcn/ui Command component)
- Placeholder: "Search across all meetings and transcripts..."
- As user types (debounced 400ms): call GET /api/search?q=...
- Results grouped:
  - "Meetings" section: matched by title
  - "Transcript Excerpts" section: matched snippet with highlighted term
  - Each result shows meeting title, date, and matched text context
- Keyboard navigation: up/down arrows, Enter to navigate
- Escape to close

Backend: add GET /api/search?q=&limit=10 to a new router:
  - Search meetings.title LIKE %q%
  - Search transcript_lines.text LIKE %q%
  - Return grouped results with context snippets (50 chars around match)
  - Order by recency

Add keyboard shortcut listener in layout.tsx.
```

### Prompt 6B — Settings Page & Export

```
Implement the Settings page (app/settings/page.tsx) and Export functionality.

SETTINGS PAGE:
Match Fireflies settings page visual style.
Sections (all placeholder except Theme):

1. Profile
   - Avatar (circle, initials), Name field, Email field
   - "Save Changes" button (no actual auth — just saves to localStorage)

2. AI Preferences
   - "Default AI Model" selector: dropdown with NVIDIA models available
     - meta/llama-3.1-70b-instruct (Recommended)
     - meta/llama-3.1-8b-instruct (Faster)
     - nvidia/llama-3.1-nemotron-70b-instruct (NVIDIA Tuned)
   - "Summary Language" dropdown
   - "Auto-generate summary on upload" toggle (default: on)

3. Integrations (placeholder cards)
   - Zoom, Google Meet, Microsoft Teams, Slack, Notion, HubSpot
   - Each: logo + "Coming Soon" badge + greyed out "Connect" button

4. Appearance
   - Dark/Light mode toggle (functional)

5. API Configuration
   - "NVIDIA API Key" input (masked, shows last 4 chars)
   - Instructions: "Get your free API key at build.nvidia.com"

EXPORT FUNCTIONALITY:
Add export dropdown to meeting detail page header:
- "Export as Markdown" → generates .md file:
  # Meeting Title
  Date | Duration | Participants
  ## Summary
  [overview text]
  ## Key Topics
  - topic1, topic2
  ## Action Items
  - [ ] Task (Owner)
  ## Transcript
  [00:01:23] Speaker: text
  
- "Export as TXT" → plain text version
- "Export as PDF" → use window.print() with print-specific CSS (print layout)
  
Implement as a client-side download using Blob + URL.createObjectURL.
No backend endpoint needed for basic export.
```

### Prompt 6C — "Ask Fireflies" Q&A Chat (Bonus)

```
Implement the "Ask Fireflies" chat tab in the meeting detail right panel.

This uses the full transcript as context and streams answers from NVIDIA llama-3.1-70b.

UI DESIGN (match Fireflies Ask Fred / AI chat):
- Chat interface inside the right panel tab
- Message bubbles: user (right, purple), AI (left, grey)
- Input bar at bottom: text input + Send button + suggested questions
- Suggested questions (appear before first message):
  - "What were the main decisions made?"
  - "Who is responsible for each action item?"
  - "What were the key concerns raised?"
  - "Summarise the discussion about [main topic]"

IMPLEMENTATION:
Frontend (components/summary/AskFirefliesChat.tsx):
- Maintain conversationHistory state: [{role: 'user'|'assistant', content: string}]
- On send: add user message, call POST /api/ai/ask with { meeting_id, question, conversation_history }
- Backend streams SSE response
- Read stream: EventSource or fetch with ReadableStream
- Append AI response character by character (streaming effect)
- Show typing indicator while waiting for first chunk
- Error handling: "AI is unavailable, please try again"

Backend (already scaffolded in ai.py):
- Include full transcript_lines as context in system prompt
- Format: "TRANSCRIPT:\n[00:01:23] Speaker: text\n..."
- Max context: truncate transcript to 6000 tokens if needed
- Stream response via StreamingResponse with text/event-stream

Add message copy button (📋) on hover of each AI message.
Add "Clear conversation" button in chat header.
```

---

## 🚀 PHASE 7 — POLISH, SEEDING & PRODUCTION READINESS

### Prompt 7A — Error Handling, Loading States & Toasts

```
Implement comprehensive error handling and UX polish across the entire application.

GLOBAL ERROR BOUNDARY:
- app/error.tsx: catch React errors, show friendly error page
- app/not-found.tsx: 404 page, Fireflies-style, with "Back to Meetings" link

API ERROR HANDLING (lib/api.ts):
- Axios interceptor: catch all non-2xx responses
- Show toast for 4xx/5xx errors with the error message from backend
- For 401: redirect to /login (placeholder)
- For 429 (rate limit from NVIDIA): show "AI rate limit reached, please wait..." toast

TOAST NOTIFICATIONS (use sonner):
- Success: "Meeting created" | "Summary generated" | "Action item completed"
- Error: "Failed to load meeting" | "AI processing failed"
- Info: "Generating AI summary..." (dismissible, with spinner)
- Toast position: top-right
- Duration: 4s for success/info, 8s for errors (give time to read)

LOADING STATES:
Every page and component must have a proper loading state:
- Meetings list: 6 card skeletons
- Meeting detail: full-page skeleton matching the two-panel layout
- Transcript panel: line skeletons (15 lines)
- Summary panel: text block skeletons
- Action items: 3 item skeletons
- All skeletons must use the Skeleton component with animate-pulse

EMPTY STATES:
- No meetings: illustration (SVG) + "No meetings yet" + "Create your first meeting" button
- No transcript: "No transcript available. Edit this meeting to add one."
- No summary: "AI summary not generated yet." + Generate button
- No action items: "No action items found." + Add button
- No search results: "No meetings match your search" + "Clear filters" link

OPTIMISTIC UPDATES:
- Toggle action item complete: immediate UI update, revert on error
- Delete meeting: remove from list immediately, revert on error  
- Add action item: append to list immediately with temp ID

CONFIRMATION DIALOGS:
- Delete meeting: Dialog with "Delete Meeting?" + warning text + Cancel/Delete buttons
- Delete action item: same pattern
```

### Prompt 7B — Responsive Design & Accessibility

```
Ensure the application is fully responsive and accessible.

RESPONSIVE BREAKPOINTS:
Mobile (<768px):
- Sidebar collapses to bottom tab bar (4 main items: Meetings, Search, Actions, Settings)
- Meeting detail: single column, player at top, tabbed panels below (Summary / Transcript tabs)
- Meeting cards: single column
- No hover-only interactions — all actions have tap targets

Tablet (768-1024px):
- Sidebar: icon-only (collapsed, 60px wide), tooltip on hover showing label
- Meeting cards: 2 columns
- Meeting detail: slightly narrower panels (55%/45%)

Desktop (>1024px):
- Full sidebar (240px)
- Meeting cards: 3 columns
- Full two-panel layout

ACCESSIBILITY:
1. All interactive elements have aria-label attributes
2. Keyboard navigation: Tab through all interactive elements
3. Focus visible: :focus-visible ring on all buttons/inputs (use Tailwind's focus-visible: variant)
4. Transcript timestamps have role="button" and keyboard handler (Enter/Space to seek)
5. Action item checkboxes: properly labelled
6. Modal: focus trap, Escape to close, aria-modal="true"
7. Loading skeletons: aria-busy="true" on parent containers
8. Colour contrast: all text meets WCAG AA (4.5:1 ratio minimum)
9. Screen reader announcements for async operations (aria-live regions)
```

### Prompt 7C — README & Final Checklist

```
Write the complete README.md for the Fireflies clone project.

Include all of these sections (well-formatted, production quality):

# Fireflies.ai Clone — Meeting Notes Platform

## 🚀 Live Demo
[Deployed URL here]

## 📸 Screenshots
[Screenshots of: dashboard, meeting detail, transcript panel, summary panel]

## 🛠️ Tech Stack
Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Axios, sonner
Backend: Python 3.11, FastAPI, SQLAlchemy, Pydantic, SQLite
AI: NVIDIA NIM APIs (meta/llama-3.1-70b-instruct, meta/llama-3.1-8b-instruct)

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- NVIDIA API Key (free at https://build.nvidia.com)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your NVIDIA_API_KEY to .env
python seed.py
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## 🗄️ Database Schema
[Include full ERD description and table definitions]

## 🤖 AI Model Configuration
Summarisation: meta/llama-3.1-70b-instruct
Action Extraction: meta/llama-3.1-8b-instruct
Transcript Parsing: nvidia/llama-3.1-nemotron-70b-instruct
Q&A Chat: meta/llama-3.1-70b-instruct

All models accessed via NVIDIA NIM free tier: https://integrate.api.nvidia.com/v1

## 📡 API Overview
[List all endpoints with method, path, description]

## 🏗️ Architecture Overview
[Describe the overall architecture: Next.js → FastAPI → SQLite + AI service layer]

## 📋 Assumptions Made
[List any assumptions about the assignment]

## 🔮 Future Improvements
[What you would add with more time]
```

After writing the README, do a final review checklist:
□ All 6 seeded meetings visible on dashboard
□ Transcript lines clickable → seeks player
□ Player time → highlights transcript line
□ Transcript search highlights matches
□ Action items: add, complete, delete all work
□ Create meeting modal: all 3 tabs work
□ Edit meeting title inline works
□ Delete meeting with confirmation works
□ Export to Markdown downloads a file
□ Toast notifications appear for all async operations
□ Mobile layout works (test at 375px width)
□ All loading skeletons display correctly
□ Empty states display correctly
□ Settings page renders without errors
□ NVIDIA API key is never exposed to frontend
□ CORS configured correctly
□ README is complete and setup instructions work
```

---

## 🔁 PHASE 8 — DEPLOYMENT

### Prompt 8A — Deployment Setup

```
Prepare the application for production deployment.

FRONTEND (Vercel):
1. Add next.config.js with:
   - NEXT_PUBLIC_API_URL environment variable
   - Image domains configuration
2. Create vercel.json if needed
3. Ensure all environment variables documented in .env.local.example
4. Build check: `npm run build` must pass with zero TypeScript errors

BACKEND (Render or Railway):
1. Add Procfile: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
2. Update CORS in main.py: allow your Vercel domain + localhost
3. SQLite file path: use a persistent directory on the host
4. Run seed.py as part of deployment start command (only if DB empty — check before seeding)
5. Add health check endpoint: GET /health → { status: "ok", version: "1.0.0" }

ENVIRONMENT VARIABLES needed:
Frontend (.env.local):
  NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

Backend (.env):
  NVIDIA_API_KEY=nvapi-xxxx
  DATABASE_URL=sqlite:///./fireflies.db
  FRONTEND_URL=https://your-app.vercel.app
  ENVIRONMENT=production

Add rate limiting to FastAPI (use slowapi):
- 100 requests/minute per IP for general endpoints
- 10 requests/minute per IP for /api/ai/* endpoints

Add request logging middleware to FastAPI:
- Log: timestamp, method, path, status code, latency
```

---

## ⚠️ IMPORTANT REMINDERS FOR EVERY CLAUDE SESSION

```
ALWAYS REMEMBER:
1. This is a Fireflies.ai CLONE — not a generic notes app. Every UI decision must be justified by "does this look like Fireflies?"
2. NVIDIA API key must NEVER appear in frontend code. Always proxy through FastAPI.
3. AI calls are ALWAYS async background tasks — never block an API response waiting for AI.
4. All IDs are UUIDs (not auto-increment integers).
5. TypeScript: zero `any` types. Define every interface in lib/types.ts.
6. Every component gets a loading state, error state, AND empty state.
7. Player sync is bidirectional and must be visually obvious.
8. The seed data is what interviewers will see first — make it realistic and impressive.
9. Test on mobile before calling anything done.
10. The interviewer will ask "explain this code" — write code you can defend.
```

---

## 📊 BUILD ORDER SUMMARY

```
Phase 0  → Scaffold (repo structure, empty files, package installs)
Phase 1A → Database models (SQLAlchemy schema)
Phase 1B → Seeder (6 realistic meetings)
Phase 2A → Meetings CRUD API (FastAPI)
Phase 2B → Action items, summaries, AI routers
Phase 2C → AI service (NVIDIA) + transcript parser
Phase 3A → Layout: Sidebar + Navbar
Phase 3B → Design system (Tailwind config + shadcn/ui)
Phase 4A → Meetings Library page + cards + filters
Phase 4B → Create Meeting modal (multi-step)
Phase 5A → Meeting Detail page layout
Phase 5B → Transcript panel + search + player sync
Phase 5C → Media player component
Phase 5D → Summary + Action Items panel
Phase 6A → Global search (Command palette)
Phase 6B → Settings page + export
Phase 6C → Ask Fireflies chat [bonus]
Phase 7A → Error handling + toasts + loading states
Phase 7B → Responsive + accessibility
Phase 7C → README + final checklist
Phase 8A → Deployment (Vercel + Render)
```

---

*Generated for: Fireflies.ai Clone — SDE Fullstack Assignment*
*Stack: Next.js 14 + FastAPI + SQLite + NVIDIA NIM APIs*
*AI Models: NVIDIA free tier via https://build.nvidia.com/models*