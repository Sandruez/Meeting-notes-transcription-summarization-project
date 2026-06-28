"""Seed the database with realistic Fireflies-quality sample data.

Run with:  python seed.py
This DROPS all tables, recreates them, and inserts 6 fully-populated meetings
(each with a transcript, summary, key topics, chapters, and action items).
"""

from datetime import datetime, timedelta, timezone

from database import engine, SessionLocal, Base
from models import (
    Meeting,
    Transcript,
    TranscriptLine,
    Summary,
    ActionItem,
)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def build_lines(transcript_id: str, raw_lines: list[tuple[str, str, str]], start_offset: int = 0):
    """Turn (speaker_id, speaker_name, text) tuples into TranscriptLine rows.

    Timestamps increment realistically (8-26s per line based on text length).
    Returns (list[TranscriptLine], total_word_count, last_timestamp_end).
    """
    lines: list[TranscriptLine] = []
    t = float(start_offset)
    word_count = 0
    for idx, (speaker_id, speaker_name, text) in enumerate(raw_lines):
        words = len(text.split())
        word_count += words
        # ~2.7 words/sec speaking pace, clamped to a natural 6-30s range.
        duration = max(6.0, min(30.0, words / 2.7))
        start = t
        end = t + duration
        lines.append(
            TranscriptLine(
                transcript_id=transcript_id,
                speaker_id=speaker_id,
                speaker_name=speaker_name,
                timestamp_start=round(start, 1),
                timestamp_end=round(end, 1),
                text=text,
                line_index=idx,
            )
        )
        # Small gap between turns.
        t = end + 0.8
    return lines, word_count, t


def add_meeting(
    db,
    *,
    title: str,
    days_ago: int,
    duration_seconds: int,
    participants: list[dict],
    raw_lines: list[tuple[str, str, str]],
    overview: str,
    key_topics: list[str],
    chapters: list[dict],
    action_items: list[dict],
    status: str = "ready",
):
    """Insert one complete meeting and all its related rows."""
    date = now_utc() - timedelta(days=days_ago)
    meeting = Meeting(
        title=title,
        date=date,
        duration_seconds=duration_seconds,
        participants=participants,
        status=status,
    )
    db.add(meeting)
    db.flush()  # assign meeting.id

    transcript = Transcript(
        meeting_id=meeting.id,
        language="en",
    )
    db.add(transcript)
    db.flush()  # assign transcript.id

    lines, word_count, _ = build_lines(transcript.id, raw_lines)
    raw_text = "\n".join(
        f"[{int(l.timestamp_start)//3600:01d}:{(int(l.timestamp_start)%3600)//60:02d}:{int(l.timestamp_start)%60:02d}] "
        f"{l.speaker_name}: {l.text}"
        for l in lines
    )
    transcript.raw_text = raw_text
    transcript.word_count = word_count
    for line in lines:
        db.add(line)

    summary = Summary(
        meeting_id=meeting.id,
        overview=overview,
        key_topics=key_topics,
        chapters=chapters,
        generated_by="meta/llama-3.1-70b-instruct (seeded)",
        generated_at=date + timedelta(minutes=2),
    )
    db.add(summary)

    for ai in action_items:
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                task=ai["task"],
                owner=ai.get("owner"),
                due_date_hint=ai.get("due_date_hint"),
                completed=ai.get("completed", False),
            )
        )

    db.commit()
    print(f"  [OK] Seeded: {title}  ({len(lines)} lines, {len(action_items)} action items)")
    return meeting


# ---------------------------------------------------------------------------
# MEETING 1 — Q3 Product Roadmap Review
# ---------------------------------------------------------------------------
M1_PARTICIPANTS = [
    {"name": "Sarah Chen", "email": "sarah.chen@company.com"},
    {"name": "James Okafor", "email": "james.okafor@company.com"},
    {"name": "Priya Nair", "email": "priya.nair@company.com"},
    {"name": "Luca Ferrari", "email": "luca.ferrari@company.com"},
]
S1, J1, P1, L1 = "SPEAKER_01", "SPEAKER_02", "SPEAKER_03", "SPEAKER_04"
M1_LINES = [
    (S1, "Sarah Chen", "Alright everyone, thanks for joining the Q3 roadmap review. Let's keep this focused — I want us to leave with a prioritized list and clear owners."),
    (S1, "Sarah Chen", "The big themes for Q3 are the new dashboard, API performance, and finishing the design system migration. Let's start with the dashboard."),
    (P1, "Priya Nair", "On the dashboard — I've got the mid-fidelity mockups ready. The main change is we're collapsing the three separate analytics views into one configurable canvas."),
    (P1, "Priya Nair", "Users kept telling us they didn't know which of the three to use. One canvas with saved layouts tested much better in the last round of interviews."),
    (J1, "James Okafor", "From an engineering side that's actually simpler to maintain too. One view, one data pipeline. I'm in favor."),
    (S1, "Sarah Chen", "Great. Priya, when can you have the high-fidelity mockups done so James's team can start?"),
    (P1, "Priya Nair", "I can finalize the dashboard mockups by end of week if I get sign-off on the component spacing today."),
    (S1, "Sarah Chen", "Consider it signed off. Let's move to API performance — this has been a recurring complaint."),
    (L1, "Luca Ferrari", "Yeah, so the meetings list endpoint is the worst offender. P95 latency is around 1.8 seconds when a workspace has a lot of meetings."),
    (L1, "Luca Ferrari", "The root cause is we're doing the action-item counts as separate queries per meeting. Classic N+1. I want to move that to a single aggregated query."),
    (J1, "James Okafor", "How much do you think that buys us?"),
    (L1, "Luca Ferrari", "My rough estimate is we get P95 down under 400 milliseconds. I'd like to profile it properly before committing to a number though."),
    (S1, "Sarah Chen", "Okay, Luca — can you profile the endpoint latency this week and come back with hard numbers?"),
    (L1, "Luca Ferrari", "Yep, I'll profile the API endpoint latency and share a breakdown by Thursday."),
    (J1, "James Okafor", "While we're on performance — should we add caching, or fix the queries first?"),
    (L1, "Luca Ferrari", "Fix the queries first. Caching on top of a bad query just hides the problem and adds invalidation headaches. Let's earn the cache."),
    (J1, "James Okafor", "Agreed. I hate premature caching."),
    (S1, "Sarah Chen", "Good. Now the design system migration — where are we?"),
    (P1, "Priya Nair", "We're about 70% migrated to the new token system. The remaining 30% is mostly older modal components and the settings screens."),
    (P1, "Priya Nair", "The risk is the settings screens have a lot of one-off styling that doesn't map cleanly to tokens."),
    (J1, "James Okafor", "Can we just rebuild the settings screens rather than migrate them? Might be faster than untangling the one-offs."),
    (P1, "Priya Nair", "Honestly, maybe. Let me audit them and figure out migrate-versus-rebuild. I'll have a recommendation next week."),
    (S1, "Sarah Chen", "Let's do that. Priya to audit settings screens and recommend migrate or rebuild."),
    (J1, "James Okafor", "One more thing on sprint planning — we have the on-call rotation eating about a day per engineer per sprint. We should account for that in capacity."),
    (S1, "Sarah Chen", "Good call. Let's plan Q3 sprints at 80% capacity to absorb on-call and interrupts."),
    (L1, "Luca Ferrari", "That's much more realistic. We've been consistently over-committing and it's why things slip."),
    (J1, "James Okafor", "I'll update the sprint capacity model in our planning doc to reflect the 80%."),
    (S1, "Sarah Chen", "Perfect. Let me also make sure we're aligned on what does NOT make Q3."),
    (S1, "Sarah Chen", "The mobile app refresh and the Slack integration are both pushed to Q4. Everyone okay with that?"),
    (J1, "James Okafor", "Yes. We can't do those justice this quarter and the dashboard is higher impact."),
    (P1, "Priya Nair", "Agreed on mobile. The Slack integration design isn't ready anyway."),
    (L1, "Luca Ferrari", "No objection from backend."),
    (S1, "Sarah Chen", "Great. So to recap: dashboard consolidation, API performance fixes, design system migration. Mobile and Slack to Q4."),
    (S1, "Sarah Chen", "Priya finalizes dashboard mockups by EOW, Luca profiles the API and reports Thursday, Priya audits settings screens next week, James updates capacity planning."),
    (J1, "James Okafor", "Sounds like a plan. This was tight, I like it."),
    (P1, "Priya Nair", "Thanks everyone. I'll drop the mockup link in the channel this afternoon."),
    (L1, "Luca Ferrari", "Talk soon."),
    (S1, "Sarah Chen", "Thanks all, great session. Let's make Q3 count."),
]
M1_OVERVIEW = (
    "The team reviewed and prioritized the Q3 product roadmap, settling on three core themes: "
    "consolidating the analytics dashboard into a single configurable canvas, fixing API performance "
    "issues, and completing the design system migration. The dashboard consolidation was driven by user "
    "research showing confusion across the three existing analytics views, and engineering confirmed a "
    "single view is also simpler to maintain.\n\n"
    "On performance, Luca identified an N+1 query pattern in the meetings list endpoint as the primary "
    "cause of high P95 latency (~1.8s) and committed to profiling it before adding any caching, with the "
    "team agreeing to fix queries before introducing caches. For the design system, the team is 70% "
    "migrated and will decide migrate-versus-rebuild for the remaining settings screens after an audit.\n\n"
    "The group also agreed to plan Q3 sprints at 80% capacity to account for on-call and interrupts, and "
    "explicitly deferred the mobile app refresh and Slack integration to Q4 to keep focus on higher-impact work."
)
M1_TOPICS = ["Sprint Planning", "Feature Prioritization", "Design System", "API Performance", "Dashboard Redesign", "Q3 Roadmap"]
M1_CHAPTERS = [
    {"title": "Intro & Agenda", "start_seconds": 0, "summary": "Sarah frames the session around producing a prioritized Q3 list with clear owners."},
    {"title": "Dashboard & API Performance", "start_seconds": 320, "summary": "Team aligns on consolidating analytics views and fixing the N+1 query behind slow API latency."},
    {"title": "Design System & Next Steps", "start_seconds": 1180, "summary": "Migration status reviewed, sprint capacity set to 80%, mobile and Slack deferred to Q4."},
]
M1_ACTIONS = [
    {"task": "Finalize high-fidelity dashboard mockups", "owner": "Priya Nair", "due_date_hint": "by EOW"},
    {"task": "Profile meetings-list API endpoint latency and report findings", "owner": "Luca Ferrari", "due_date_hint": "by Thursday"},
    {"task": "Audit settings screens and recommend migrate vs. rebuild", "owner": "Priya Nair", "due_date_hint": "next week"},
    {"task": "Update sprint capacity model to 80% to absorb on-call", "owner": "James Okafor", "due_date_hint": None},
]


# ---------------------------------------------------------------------------
# MEETING 2 — Weekly Engineering Standup — Week 28
# ---------------------------------------------------------------------------
M2_PARTICIPANTS = [
    {"name": "James Okafor", "email": "james.okafor@company.com"},
    {"name": "Luca Ferrari", "email": "luca.ferrari@company.com"},
    {"name": "Mei Tanaka", "email": "mei.tanaka@company.com"},
    {"name": "Diego Santos", "email": "diego.santos@company.com"},
    {"name": "Nadia Hassan", "email": "nadia.hassan@company.com"},
]
J2, L2, ME2, D2, N2 = "SPEAKER_01", "SPEAKER_02", "SPEAKER_03", "SPEAKER_04", "SPEAKER_05"
M2_LINES = [
    (J2, "James Okafor", "Morning everyone, quick standup. Let's go around — updates, blockers, then we're done. Luca, kick us off."),
    (L2, "Luca Ferrari", "Yesterday I finished profiling the meetings endpoint. The N+1 is confirmed, fix is in review. Today I'm rolling out the aggregated query behind a flag."),
    (L2, "Luca Ferrari", "No blockers, but I'd love a review on the PR — it touches the core query path so I want a careful eye."),
    (J2, "James Okafor", "I'll review it right after standup. Mei?"),
    (ME2, "Mei Tanaka", "I shipped the new empty states for the meetings list yesterday. Today I'm picking up the transcript search highlighting."),
    (ME2, "Mei Tanaka", "One blocker — I need the search API to return match offsets, not just the matching lines. Right now I'm re-finding matches on the client which feels wrong."),
    (L2, "Luca Ferrari", "That's a fair ask. I can add match offsets to the search response — shouldn't take long. I'll pair with you after."),
    (ME2, "Mei Tanaka", "Perfect, that unblocks me."),
    (J2, "James Okafor", "Good. Diego?"),
    (D2, "Diego Santos", "I'm still deep in the export feature. Markdown and TXT are working, PDF via print stylesheet is fighting me on page breaks."),
    (D2, "Diego Santos", "Not blocked exactly, just slower than I hoped. I'll have all three formats done by end of week."),
    (J2, "James Okafor", "No worries, print CSS is always painful. Shout if you want a second pair of eyes. Nadia?"),
    (N2, "Nadia Hassan", "I finished the action item optimistic updates. Toggling complete now feels instant. Today I'm writing tests for the revert-on-error path."),
    (N2, "Nadia Hassan", "No blockers. Quick flag though — our toast notifications stack weirdly when three fire at once. Minor, but I'll file a ticket."),
    (J2, "James Okafor", "Thanks Nadia, go ahead and file it. On my side — I'm updating the sprint capacity model we discussed in the roadmap review, and reviewing Luca's PR."),
    (J2, "James Okafor", "Reminder: the on-call rotation flips to Diego this week. Diego, you good on the runbook?"),
    (D2, "Diego Santos", "Yep, read through it yesterday. I'm set."),
    (J2, "James Okafor", "Great. That's standup. Luca, let's sync on your PR now. Everyone else, have a good one."),
    (ME2, "Mei Tanaka", "Thanks all."),
    (N2, "Nadia Hassan", "See you."),
]
M2_OVERVIEW = (
    "The engineering team held its weekly standup with rapid status updates and blocker resolution. Luca "
    "confirmed the N+1 query fix on the meetings endpoint is in review and will roll out behind a feature "
    "flag, and offered to add match offsets to the search API to unblock Mei's transcript search highlighting.\n\n"
    "Diego reported steady progress on the export feature, with Markdown and TXT complete and PDF page-break "
    "issues remaining, targeting end of week. Nadia completed optimistic updates for action items and flagged "
    "a minor toast-stacking bug to be ticketed. James noted the on-call rotation moves to Diego this week and "
    "will review Luca's PR immediately after the meeting."
)
M2_TOPICS = ["Standup Updates", "API Performance", "Transcript Search", "Export Feature", "On-call Rotation"]
M2_CHAPTERS = [
    {"title": "Engineering Updates", "start_seconds": 0, "summary": "Round-robin updates covering the API fix, search, export, and optimistic UI work."},
    {"title": "Blockers & Logistics", "start_seconds": 300, "summary": "Search-offset dependency resolved by pairing; on-call handoff to Diego confirmed."},
]
M2_ACTIONS = [
    {"task": "Add match offsets to the search API response", "owner": "Luca Ferrari", "due_date_hint": "today"},
    {"task": "File a ticket for toast notification stacking bug", "owner": "Nadia Hassan", "due_date_hint": None},
    {"task": "Finish Markdown, TXT, and PDF export formats", "owner": "Diego Santos", "due_date_hint": "by end of week"},
]


# ---------------------------------------------------------------------------
# MEETING 3 — Customer Interview — Acme Corp Onboarding
# ---------------------------------------------------------------------------
M3_PARTICIPANTS = [
    {"name": "Alex Rivera", "email": "alex.rivera@company.com"},
    {"name": "Maria Fontaine", "email": "maria.fontaine@company.com"},
    {"name": "Tom Bradley", "email": "tom.bradley@acmecorp.com"},
]
A3, MA3, T3 = "SPEAKER_01", "SPEAKER_02", "SPEAKER_03"
M3_LINES = [
    (A3, "Alex Rivera", "Hi Tom, thanks for making time. We really want to understand how the first few weeks have gone with the platform — the good and the bad."),
    (T3, "Tom Bradley", "Happy to. Honestly it's been mostly positive, but there are a couple of rough edges I want to be candid about."),
    (MA3, "Maria Fontaine", "Candid is exactly what we want, Tom. Let's start with onboarding — how did getting your team set up go?"),
    (T3, "Tom Bradley", "Setup itself was smooth. Inviting people, importing our first batch of meetings — all easy. The 'aha' moment came when people saw the auto-generated summaries."),
    (T3, "Tom Bradley", "That's the thing that sold the team. A 50-minute call becomes a paragraph and a task list. People stopped taking manual notes within a week."),
    (A3, "Alex Rivera", "That's great to hear. What about the rough edges?"),
    (T3, "Tom Bradley", "The biggest one — search. When I search across all meetings, I can find the meeting, but I can't jump to the exact moment in the transcript where the term appears."),
    (T3, "Tom Bradley", "So I find the right meeting but then I'm scrolling through a 40-minute transcript hunting for the word. That's frustrating."),
    (MA3, "Maria Fontaine", "That's really useful feedback. So you'd want search results to deep-link into the transcript at the matched line?"),
    (T3, "Tom Bradley", "Exactly. Take me to the moment, not just the meeting. That would be huge for us."),
    (A3, "Alex Rivera", "Noted, that's a strong signal. Anything else on search or is that the main pain?"),
    (T3, "Tom Bradley", "Related — it'd be great to filter by participant. Like, show me every meeting where our CFO spoke about budget. Right now I can't slice it that way."),
    (MA3, "Maria Fontaine", "Got it. Participant-based filtering. Let me write that down as a feature request."),
    (T3, "Tom Bradley", "The other thing is action items. They're extracted well, but they live inside each meeting. I want one place that aggregates all my open action items across meetings."),
    (A3, "Alex Rivera", "A global action items view. That actually is on our roadmap — good to know it resonates."),
    (T3, "Tom Bradley", "If you build that, my team would use it daily. The per-meeting view is fine but things slip between meetings."),
    (MA3, "Maria Fontaine", "How about the summaries themselves — are they accurate? Any hallucinations or misattributed quotes?"),
    (T3, "Tom Bradley", "Surprisingly accurate. Maybe once it attributed a decision to the wrong person, but it's rare. The action items occasionally miss a softer commitment — like 'I'll think about it.'"),
    (T3, "Tom Bradley", "But honestly the summary quality is the strongest part of the product. I trust it."),
    (A3, "Alex Rivera", "That means a lot. On pricing and rollout — are you thinking of expanding beyond the initial team?"),
    (T3, "Tom Bradley", "Yes. If the search improvements land, I want to roll this out to the whole revenue org — that's about 60 people. The deep-link search is honestly my main blocker to expanding."),
    (MA3, "Maria Fontaine", "That's clear. I'll make sure the product team hears that the search deep-linking is tied directly to expansion."),
    (T3, "Tom Bradley", "Please do. I'm a fan, I just want it to be a little sharper before I put it in front of 60 people."),
    (A3, "Alex Rivera", "Completely fair. Let me summarize what I'm taking away: deep-link search into transcripts, participant filtering, and a global action items view."),
    (T3, "Tom Bradley", "That's a perfect summary. Nail those three and we're expanding."),
    (MA3, "Maria Fontaine", "Tom, this was incredibly helpful. I'll follow up with a written summary and our timeline on the search work."),
    (A3, "Alex Rivera", "And I'll set up a check-in for a month out so we can show you progress. Thanks again, Tom."),
    (T3, "Tom Bradley", "Thank you both. Looking forward to it."),
]
M3_OVERVIEW = (
    "In an onboarding interview, Acme Corp's Tom Bradley shared that the platform has been largely positive, "
    "with auto-generated summaries being the standout feature that drove team adoption within the first week. "
    "However, he was candid about several rough edges blocking broader rollout.\n\n"
    "His top pain point is search: he can find the right meeting but cannot deep-link to the exact transcript "
    "moment where a term appears, forcing manual scrolling. He also requested participant-based filtering and a "
    "global view aggregating open action items across all meetings. Summary accuracy was praised as the "
    "strongest part of the product, with only rare misattribution.\n\n"
    "Critically, Tom tied expansion to the revenue org (~60 people) directly to landing the search deep-linking "
    "improvements, making these enhancements a clear driver of account growth."
)
M3_TOPICS = ["Customer Feedback", "Search Deep-linking", "Participant Filtering", "Action Items", "Summary Accuracy", "Account Expansion"]
M3_CHAPTERS = [
    {"title": "Onboarding Experience", "start_seconds": 0, "summary": "Setup was smooth; auto-summaries were the adoption driver for Tom's team."},
    {"title": "Pain Points & Requests", "start_seconds": 240, "summary": "Search deep-linking, participant filtering, and a global action-items view emerge as top asks."},
    {"title": "Expansion & Next Steps", "start_seconds": 720, "summary": "Tom ties a 60-person rollout to the search improvements; follow-ups scheduled."},
]
M3_ACTIONS = [
    {"task": "Share customer feedback on search deep-linking with the product team", "owner": "Maria Fontaine", "due_date_hint": "this week"},
    {"task": "Log feature request: participant-based meeting filtering", "owner": "Maria Fontaine", "due_date_hint": None},
    {"task": "Send Tom a written summary and search-work timeline", "owner": "Maria Fontaine", "due_date_hint": "by Friday"},
    {"task": "Schedule a one-month progress check-in with Acme Corp", "owner": "Alex Rivera", "due_date_hint": "in one month"},
    {"task": "Prepare expansion proposal for Acme revenue org (~60 seats)", "owner": "Alex Rivera", "due_date_hint": "after search ships"},
]


# ---------------------------------------------------------------------------
# MEETING 4 — Design System Alignment
# ---------------------------------------------------------------------------
M4_PARTICIPANTS = [
    {"name": "Priya Nair", "email": "priya.nair@company.com"},
    {"name": "Oscar Lindqvist", "email": "oscar.lindqvist@company.com"},
    {"name": "Hana Kim", "email": "hana.kim@company.com"},
]
P4, O4, H4 = "SPEAKER_01", "SPEAKER_02", "SPEAKER_03"
M4_LINES = [
    (P4, "Priya Nair", "Okay, design system sync. The goal today is to lock the color token naming and the spacing scale so engineering can stop guessing."),
    (O4, "Oscar Lindqvist", "Finally. The biggest source of inconsistency is everyone inventing their own gray. We have like nine grays in the codebase."),
    (H4, "Hana Kim", "Nine is generous. I counted eleven last week. We need a single neutral ramp, named by number, and nothing outside it."),
    (P4, "Priya Nair", "Agreed. Let's do neutral-50 through neutral-900, nine steps. Everything maps to those. No more 'light gray two.'"),
    (O4, "Oscar Lindqvist", "For the brand purple, are we keeping the 500 as the primary action color? The current one is a touch too saturated on large fills."),
    (H4, "Hana Kim", "I'd pull the saturation down slightly for large surfaces but keep the vivid one for small accents like links and focus rings."),
    (P4, "Priya Nair", "Let's define brand-500 as the accent and use brand-600 for large fills. Two clearly named tokens, documented with do's and don'ts."),
    (O4, "Oscar Lindqvist", "Works for me. Now spacing — we keep mixing 4px and 5px-based spacing and it shows. Cards don't align across screens."),
    (P4, "Priya Nair", "Let's commit to a 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64. If it's not on the scale, it's a bug."),
    (H4, "Hana Kim", "Yes. And we name them in Figma the same as in code — space-1 through space-8 — so handoff stops being a translation exercise."),
    (O4, "Oscar Lindqvist", "That Figma-to-code naming parity is the real win here. Half my handoff bugs are just mismatched names."),
    (P4, "Priya Nair", "Let's talk components. The button has four variants in Figma but the code has six. They've drifted."),
    (H4, "Hana Kim", "The two extra in code are a 'subtle' and a 'link' variant someone added without updating Figma. I think 'link' is legit, 'subtle' is redundant with 'ghost.'"),
    (O4, "Oscar Lindqvist", "Agreed, kill 'subtle,' promote 'link' into Figma. Then Figma and code both have five: default, outline, ghost, link, destructive."),
    (P4, "Priya Nair", "Done. Hana, can you update the Figma button component to match — add link, remove subtle?"),
    (H4, "Hana Kim", "Yes, I'll reconcile the button variants in Figma this week."),
    (P4, "Priya Nair", "Next, the modal. The radius and shadow don't match our card components. They feel like they're from different apps."),
    (O4, "Oscar Lindqvist", "That's because modals predate the token system. They use hardcoded values. They're on my list to migrate."),
    (P4, "Priya Nair", "Let's make the modal radius and shadow use the same tokens as cards — radius-lg and shadow-card. Oscar, can you take that?"),
    (O4, "Oscar Lindqvist", "I'll migrate the modal components to the shared radius and shadow tokens."),
    (H4, "Hana Kim", "While we're here — can we standardize the focus ring? Right now it's inconsistent and accessibility flagged it."),
    (P4, "Priya Nair", "Good catch. One focus ring: 2px brand-500 outline with a 2px offset, on every interactive element. Non-negotiable for accessibility."),
    (H4, "Hana Kim", "Perfect. I'll add the focus-ring spec to the documentation page with examples."),
    (O4, "Oscar Lindqvist", "Once these land, I want to do a sweep and delete dead CSS. There's a lot of orphaned styling."),
    (P4, "Priya Nair", "Let's schedule that cleanup sweep after the token migration is done, not during — one thing at a time."),
    (O4, "Oscar Lindqvist", "Fair. I'll hold the cleanup until migration's complete."),
    (P4, "Priya Nair", "Great session. To recap: nine-step neutral ramp, brand-500 accent and 600 for fills, 4px spacing scale with Figma parity, five button variants, modal tokens, and one focus ring."),
    (H4, "Hana Kim", "I'll get the documentation page updated with all of this so it's the single source of truth."),
    (P4, "Priya Nair", "Thank you both — this is the most aligned we've been in months."),
]
M4_OVERVIEW = (
    "The design team aligned on foundational design system decisions to eliminate inconsistency. They "
    "consolidated the proliferation of grays into a single nine-step neutral ramp (neutral-50 to neutral-900) "
    "and clarified brand color usage: brand-500 for small accents and focus rings, brand-600 for large fills.\n\n"
    "A 4px-based spacing scale was committed to, with matching token names between Figma and code to streamline "
    "handoff. The team reconciled component drift — standardizing on five button variants (removing the "
    "redundant 'subtle', promoting 'link'), migrating modal radius and shadow to shared tokens, and defining a "
    "single accessible focus ring (2px brand-500 outline, 2px offset).\n\n"
    "A dead-CSS cleanup sweep was deliberately deferred until after the token migration completes, and Hana will "
    "consolidate all decisions into the documentation page as the single source of truth."
)
M4_TOPICS = ["Color Tokens", "Spacing Scale", "Component Variants", "Figma Parity", "Accessibility", "Design Documentation"]
M4_CHAPTERS = [
    {"title": "Color & Spacing Tokens", "start_seconds": 0, "summary": "Team locks a nine-step neutral ramp, brand color usage, and a 4px spacing scale."},
    {"title": "Component Reconciliation", "start_seconds": 480, "summary": "Button variants, modal tokens, and a standardized focus ring are agreed upon."},
    {"title": "Documentation & Cleanup", "start_seconds": 1080, "summary": "Decisions captured in docs; dead-CSS sweep deferred until after migration."},
]
M4_ACTIONS = [
    {"task": "Reconcile Figma button variants (add 'link', remove 'subtle')", "owner": "Hana Kim", "due_date_hint": "this week"},
    {"task": "Migrate modal components to shared radius and shadow tokens", "owner": "Oscar Lindqvist", "due_date_hint": None},
    {"task": "Add the standardized focus-ring spec to the documentation page", "owner": "Hana Kim", "due_date_hint": None},
    {"task": "Update the design system documentation as single source of truth", "owner": "Hana Kim", "due_date_hint": "this week"},
]


# ---------------------------------------------------------------------------
# MEETING 5 — Investor Update Prep
# ---------------------------------------------------------------------------
M5_PARTICIPANTS = [
    {"name": "Elena Vasquez", "email": "elena.vasquez@company.com"},
    {"name": "Robert Kim", "email": "robert.kim@company.com"},
    {"name": "Aisha Mbeki", "email": "aisha.mbeki@company.com"},
]
E5, R5, AI5 = "SPEAKER_01", "SPEAKER_02", "SPEAKER_03"
M5_LINES = [
    (E5, "Elena Vasquez", "Let's prep the Q3 investor update. I want the narrative tight: strong ARR growth, improving retention, and a clear use-of-funds story."),
    (R5, "Robert Kim", "On the numbers — ARR is at 4.2 million, up from 3.1 at the start of the quarter. That's about 35% quarter-over-quarter."),
    (E5, "Elena Vasquez", "That's a number we lead with. 35% QoQ ARR growth is the headline."),
    (AI5, "Aisha Mbeki", "Growth's great but I want to be honest about the source. Roughly 60% is expansion within existing accounts, 40% new logos."),
    (E5, "Elena Vasquez", "That expansion-heavy mix is actually a strength — it shows the product lands and grows. Let's frame net revenue retention prominently."),
    (R5, "Robert Kim", "Net revenue retention is 128%. That's up from 119% last quarter. Investors will like that trend."),
    (AI5, "Aisha Mbeki", "The Acme Corp expansion is a good case study — they're talking about going from a small team to 60 seats if we land the search work."),
    (E5, "Elena Vasquez", "Let's include Acme as a named expansion story, assuming they're comfortable. Aisha, can you get their okay to reference them?"),
    (AI5, "Aisha Mbeki", "I'll reach out to Acme for permission to name them in the deck."),
    (R5, "Robert Kim", "On churn — gross churn is 2.1% monthly, which is healthy for our segment. Logo churn was two small accounts, both under-50-person companies."),
    (E5, "Elena Vasquez", "Good. Let's show churn but contextualize it — small accounts, not a product problem. What's the cash position?"),
    (R5, "Robert Kim", "We have 18 months of runway at the current burn. If we close the round, that extends meaningfully and we accelerate hiring."),
    (E5, "Elena Vasquez", "The use-of-funds story is engineering and go-to-market. Two-thirds to product and engineering, one-third to sales and marketing."),
    (AI5, "Aisha Mbeki", "I'd push for a bit more to go-to-market. Our pipeline is outrunning our ability to close it — we're capacity-constrained on the sales side."),
    (E5, "Elena Vasquez", "That's a fair point and honestly a good problem to show investors. Let's revisit the split to maybe 60/40."),
    (R5, "Robert Kim", "I'll model both the 67/33 and 60/40 splits so we can show the tradeoff and runway impact of each."),
    (E5, "Elena Vasquez", "Perfect. What about the growth projection for next year? I don't want to over-promise."),
    (R5, "Robert Kim", "Conservatively, if expansion holds and we hit hiring targets, we project 11 to 13 million ARR by end of next year."),
    (AI5, "Aisha Mbeki", "I'd present that as a range and anchor on the low end. Beating a conservative number is better than missing an aggressive one."),
    (E5, "Elena Vasquez", "Agreed. Under-promise, over-deliver. Robert, build the model around the 11 million anchor with upside to 13."),
    (R5, "Robert Kim", "I'll finalize the financial model with the 11-to-13 million range and the runway scenarios."),
    (E5, "Elena Vasquez", "Let's also preempt the obvious question — how defensible is the AI summary quality versus competitors?"),
    (AI5, "Aisha Mbeki", "Our answer is the workflow, not just the model. Summaries, action items, search, and player sync together — that's the moat, not any single feature."),
    (E5, "Elena Vasquez", "That's exactly the framing. The integrated workflow is the defensibility story. Let me draft that slide myself."),
    (E5, "Elena Vasquez", "Okay — to recap, Robert models the funding splits and the financial projection, Aisha gets Acme's okay, and I'll draft the narrative and defensibility slides."),
    (R5, "Robert Kim", "Sounds good. I'll have the models to you by Wednesday."),
    (AI5, "Aisha Mbeki", "And I'll have the Acme answer before then."),
    (E5, "Elena Vasquez", "Great. Let's make this update one that gets the round closed."),
]
M5_OVERVIEW = (
    "Leadership prepared the Q3 investor update, anchoring the narrative on strong ARR growth, improving "
    "retention, and a credible use-of-funds story. ARR reached $4.2M (up 35% QoQ) with net revenue retention "
    "climbing to 128%, and the team agreed to lead with these metrics while honestly framing the growth as "
    "expansion-heavy — a sign the product lands and grows within accounts.\n\n"
    "Churn was characterized as healthy (2.1% monthly gross, limited to small accounts), and the team debated "
    "the funding allocation, leaning from a 67/33 toward a 60/40 product-versus-go-to-market split given that "
    "sales capacity is constraining an outrunning pipeline. Robert will model both splits alongside runway "
    "scenarios.\n\n"
    "For projections, the team chose a conservative $11–13M ARR range anchored low, and framed product "
    "defensibility around the integrated workflow (summaries, action items, search, player sync) rather than any "
    "single AI feature."
)
M5_TOPICS = ["ARR Growth", "Net Revenue Retention", "Churn Analysis", "Use of Funds", "Growth Projections", "Competitive Moat"]
M5_CHAPTERS = [
    {"title": "Growth & Retention Metrics", "start_seconds": 0, "summary": "ARR up 35% QoQ to $4.2M; NRR at 128%; growth framed as healthy expansion."},
    {"title": "Churn & Use of Funds", "start_seconds": 360, "summary": "Churn contextualized as small-account; funding split debated toward 60/40."},
    {"title": "Projections & Defensibility", "start_seconds": 840, "summary": "Conservative $11–13M ARR anchor set; integrated workflow framed as the moat."},
]
M5_ACTIONS = [
    {"task": "Get Acme Corp's permission to name them in the investor deck", "owner": "Aisha Mbeki", "due_date_hint": "by Wednesday"},
    {"task": "Model 67/33 and 60/40 funding splits with runway scenarios", "owner": "Robert Kim", "due_date_hint": "by Wednesday"},
    {"task": "Finalize the financial model around an $11–13M ARR range", "owner": "Robert Kim", "due_date_hint": "by Wednesday"},
    {"task": "Draft the narrative and product-defensibility slides", "owner": "Elena Vasquez", "due_date_hint": None},
]


# ---------------------------------------------------------------------------
# MEETING 6 — Backend Architecture Deep Dive
# ---------------------------------------------------------------------------
M6_PARTICIPANTS = [
    {"name": "Luca Ferrari", "email": "luca.ferrari@company.com"},
    {"name": "Mei Tanaka", "email": "mei.tanaka@company.com"},
    {"name": "Raj Patel", "email": "raj.patel@company.com"},
    {"name": "Sofia Almeida", "email": "sofia.almeida@company.com"},
]
L6, ME6, R6, SO6 = "SPEAKER_01", "SPEAKER_02", "SPEAKER_03", "SPEAKER_04"
M6_LINES = [
    (L6, "Luca Ferrari", "This is the backend architecture deep dive. The question on the table: as we scale, do we stay a modular monolith or start splitting into services?"),
    (R6, "Raj Patel", "I'll plant a flag — I think splitting now is premature. Our pain is database queries, not deployment coupling. Microservices won't fix slow queries."),
    (ME6, "Mei Tanaka", "I agree the monolith isn't our bottleneck yet. But the AI processing is different — it's bursty, long-running, and shouldn't share a process with request serving."),
    (L6, "Luca Ferrari", "That's the nuance. I'm not proposing we shatter everything. But AI summary generation blocking a web worker is a real problem under load."),
    (SO6, "Sofia Almeida", "So the split that actually makes sense is pulling AI processing into its own worker pool with a queue, not decomposing the whole CRUD layer."),
    (R6, "Raj Patel", "That I can get behind. A job queue for AI work, monolith stays for everything else. That's a targeted split, not microservices-for-the-sake-of-it."),
    (L6, "Luca Ferrari", "Let's talk the queue. Options are a Redis-backed queue, or a proper broker like RabbitMQ, or even just a database-backed job table to start."),
    (ME6, "Mei Tanaka", "For our volume, a database-backed job table is almost embarrassingly sufficient. We're not at the scale that needs RabbitMQ."),
    (SO6, "Sofia Almeida", "I lean Redis. It's not much more operationally and it gives us a real queue with retries and visibility out of the box."),
    (R6, "Raj Patel", "The risk with a DB job table is we reinvent a queue badly — locking, retries, dead-letter handling. We'll slowly build a worse Redis."),
    (L6, "Luca Ferrari", "That's the classic trap. Let's start with Redis as the queue and keep the workers stateless so we can scale them horizontally."),
    (ME6, "Mei Tanaka", "Okay, I'm convinced. Redis queue, stateless AI workers. Who owns standing that up?"),
    (SO6, "Sofia Almeida", "I'll prototype the Redis-backed AI job queue and stateless worker. Give me a week for a working spike."),
    (L6, "Luca Ferrari", "Great. Now caching — we deferred it in the roadmap review, but let's at least design where it goes."),
    (R6, "Raj Patel", "Caching belongs on read-heavy, rarely-changing data. Meeting summaries are perfect — generated once, read constantly. Transcripts too."),
    (ME6, "Mei Tanaka", "But we have to invalidate on regeneration. If someone regenerates a summary, the cache has to drop. That's the only tricky case."),
    (SO6, "Sofia Almeida", "Cache the summary keyed by meeting id and a version number. Bump the version on regenerate. Invalidation becomes trivial — old version just ages out."),
    (L6, "Luca Ferrari", "I love that. Versioned cache keys sidestep the hardest part of caching. Let's adopt that pattern broadly."),
    (R6, "Raj Patel", "On the database itself — are we staying on SQLite or moving to Postgres? Because that decision colors everything."),
    (L6, "Luca Ferrari", "SQLite has been great for simplicity, but concurrent writes are going to bite us as the worker pool grows."),
    (ME6, "Mei Tanaka", "Right, SQLite's single-writer model and a horizontally-scaled worker pool are fundamentally in tension."),
    (SO6, "Sofia Almeida", "I think Postgres is inevitable. The question is just when. I'd say before we turn on the worker pool, not after."),
    (R6, "Raj Patel", "Agreed. Migrate to Postgres first, then add the workers. Doing it the other way means migrating under load, which is miserable."),
    (L6, "Luca Ferrari", "Let's sequence it: Postgres migration first, then the Redis queue and workers. Raj, can you scope the Postgres migration?"),
    (R6, "Raj Patel", "I'll scope the SQLite-to-Postgres migration with a rollback plan and a data-integrity checklist."),
    (ME6, "Mei Tanaka", "We should also add proper indexes during the migration. Some of our slow queries are just missing indexes, full stop."),
    (L6, "Luca Ferrari", "Yes — Mei, can you audit the slow query log and produce an index plan we apply as part of the migration?"),
    (ME6, "Mei Tanaka", "I'll audit the slow queries and propose the indexes to add."),
    (SO6, "Sofia Almeida", "Last thing — observability. If we're adding a queue and workers, we need tracing across the boundary or debugging becomes guesswork."),
    (L6, "Luca Ferrari", "Strong point. Let's add request tracing that follows a job from API into the worker. Sofia, fold that into your queue spike."),
    (SO6, "Sofia Almeida", "Will do — I'll include distributed tracing in the queue prototype so we can follow a job end to end."),
    (L6, "Luca Ferrari", "Excellent. To recap the sequence: Postgres migration with an index plan, then Redis queue with stateless traced workers, and versioned cache keys for summaries and transcripts."),
    (R6, "Raj Patel", "That's a plan I actually believe in. Targeted, sequenced, no microservices cargo-culting."),
    (ME6, "Mei Tanaka", "Agreed. This is the most coherent our backend direction has felt."),
    (L6, "Luca Ferrari", "Thanks everyone — let's write these up as ADRs so the decisions and the reasoning are recorded."),
    (SO6, "Sofia Almeida", "I'll start the ADR for the queue architecture today."),
]
M6_OVERVIEW = (
    "The backend team held an architecture deep dive on how to scale, concluding that a wholesale move to "
    "microservices would be premature since the real bottleneck is database queries, not deployment coupling. "
    "Instead, they agreed on a targeted split: extracting bursty, long-running AI processing into a dedicated, "
    "stateless worker pool fed by a Redis-backed job queue, while the modular monolith continues to serve CRUD.\n\n"
    "On data, the team concluded a SQLite-to-Postgres migration is inevitable and must precede turning on the "
    "worker pool to avoid migrating under load, with proper indexes added during the migration to address slow "
    "queries. For caching, they adopted versioned cache keys (keyed by meeting id and a version bumped on "
    "regeneration) to make invalidation trivial for summaries and transcripts.\n\n"
    "The group also committed to distributed tracing across the API-to-worker boundary for debuggability and "
    "agreed to record these decisions as ADRs. The sequence is: Postgres migration with an index plan, then the "
    "Redis queue with stateless traced workers."
)
M6_TOPICS = ["Modular Monolith vs Microservices", "Job Queue Design", "Caching Strategy", "Postgres Migration", "Database Indexing", "Observability", "ADRs"]
M6_CHAPTERS = [
    {"title": "Monolith vs. Services", "start_seconds": 0, "summary": "Team rejects broad microservices and agrees to extract only AI processing to a worker pool."},
    {"title": "Queue & Caching Design", "start_seconds": 600, "summary": "Redis queue with stateless workers chosen; versioned cache keys adopted for invalidation."},
    {"title": "Postgres Migration & Observability", "start_seconds": 1800, "summary": "Postgres migration sequenced before workers; indexes and distributed tracing planned."},
]
M6_ACTIONS = [
    {"task": "Prototype the Redis-backed AI job queue with a stateless worker and tracing", "owner": "Sofia Almeida", "due_date_hint": "within a week"},
    {"task": "Scope the SQLite-to-Postgres migration with a rollback plan", "owner": "Raj Patel", "due_date_hint": None},
    {"task": "Audit the slow query log and propose an index plan", "owner": "Mei Tanaka", "due_date_hint": None},
    {"task": "Write an ADR for the queue architecture decision", "owner": "Sofia Almeida", "due_date_hint": "today", "completed": False},
]


def seed():
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding meetings...")
        add_meeting(
            db,
            title="Q3 Product Roadmap Review",
            days_ago=3,
            duration_seconds=47 * 60,
            participants=M1_PARTICIPANTS,
            raw_lines=M1_LINES,
            overview=M1_OVERVIEW,
            key_topics=M1_TOPICS,
            chapters=M1_CHAPTERS,
            action_items=M1_ACTIONS,
        )
        add_meeting(
            db,
            title="Weekly Engineering Standup — Week 28",
            days_ago=1,
            duration_seconds=18 * 60,
            participants=M2_PARTICIPANTS,
            raw_lines=M2_LINES,
            overview=M2_OVERVIEW,
            key_topics=M2_TOPICS,
            chapters=M2_CHAPTERS,
            action_items=M2_ACTIONS,
        )
        add_meeting(
            db,
            title="Customer Interview — Acme Corp Onboarding",
            days_ago=7,
            duration_seconds=32 * 60,
            participants=M3_PARTICIPANTS,
            raw_lines=M3_LINES,
            overview=M3_OVERVIEW,
            key_topics=M3_TOPICS,
            chapters=M3_CHAPTERS,
            action_items=M3_ACTIONS,
        )
        add_meeting(
            db,
            title="Design System Alignment",
            days_ago=14,
            duration_seconds=55 * 60,
            participants=M4_PARTICIPANTS,
            raw_lines=M4_LINES,
            overview=M4_OVERVIEW,
            key_topics=M4_TOPICS,
            chapters=M4_CHAPTERS,
            action_items=M4_ACTIONS,
        )
        add_meeting(
            db,
            title="Investor Update Prep",
            days_ago=21,
            duration_seconds=28 * 60,
            participants=M5_PARTICIPANTS,
            raw_lines=M5_LINES,
            overview=M5_OVERVIEW,
            key_topics=M5_TOPICS,
            chapters=M5_CHAPTERS,
            action_items=M5_ACTIONS,
        )
        add_meeting(
            db,
            title="Backend Architecture Deep Dive",
            days_ago=30,
            duration_seconds=82 * 60,
            participants=M6_PARTICIPANTS,
            raw_lines=M6_LINES,
            overview=M6_OVERVIEW,
            key_topics=M6_TOPICS,
            chapters=M6_CHAPTERS,
            action_items=M6_ACTIONS,
        )
        print("\nDone. Seeded 6 meetings successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
