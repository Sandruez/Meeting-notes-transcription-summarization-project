export interface Participant {
  name: string;
  email?: string | null;
}

export interface TranscriptLine {
  id: string;
  speaker_name: string;
  speaker_id: string;
  timestamp_start: number;
  timestamp_end: number;
  text: string;
  line_index: number;
}

export interface TranscriptDetail {
  id: string;
  raw_text: string;
  word_count: number;
  lines: TranscriptLine[];
}

export interface Chapter {
  title: string;
  start_seconds: number;
  summary: string;
}

export interface SummaryDetail {
  id: string;
  overview: string;
  key_topics: string[];
  chapters: Chapter[];
  generated_by: string;
  generated_at: string;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string | null;
  due_date_hint: string | null;
  completed: boolean;
  created_at: string;
}

export interface MeetingListItem {
  id: string;
  title: string;
  date: string;
  duration_seconds: number;
  participants: Participant[];
  status: "processing" | "ready" | "error";
  has_summary: boolean;
  action_items_count: number;
  action_items_completed: number;
}

export interface MeetingDetail {
  id: string;
  title: string;
  date: string;
  duration_seconds: number;
  participants: Participant[];
  status: "processing" | "ready" | "error";
  created_at: string;
  updated_at: string;
  transcript: TranscriptDetail | null;
  summary: SummaryDetail | null;
  action_items: ActionItem[];
}

export interface MeetingsResponse {
  meetings: MeetingListItem[];
  total: number;
}

export interface CreateMeetingPayload {
  title: string;
  date: string;
  participants: Participant[];
  transcript_text?: string;
  transcript_file_type?: "txt" | "vtt" | "json";
}

export interface UpdateMeetingPayload {
  title?: string;
  participants?: Participant[];
}

export interface CreateActionItemPayload {
  task: string;
  owner?: string;
  due_date_hint?: string;
}

export interface UpdateActionItemPayload {
  task?: string;
  owner?: string;
  due_date_hint?: string;
  completed?: boolean;
}

export interface MeetingStatusResponse {
  meeting_id: string;
  status: string;
  summary_ready: boolean;
  action_items_count: number;
}

export interface SearchResult {
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  match_type: "title" | "transcript";
  matched_text: string;
  context: string;
}
