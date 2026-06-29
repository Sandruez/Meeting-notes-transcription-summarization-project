import axios from "axios";
import type {
  MeetingsResponse,
  MeetingDetail,
  CreateMeetingPayload,
  UpdateMeetingPayload,
  ActionItem,
  CreateActionItemPayload,
  UpdateActionItemPayload,
  MeetingStatusResponse,
  SearchResult,
  SummaryDetail,
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail || error.message || "An error occurred";
    console.error(`API Error: ${error.response?.status} - ${message}`);
    return Promise.reject(error);
  }
);

export const meetingsApi = {
  list: (params?: {
    search?: string;
    sort_by?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }) => api.get<MeetingsResponse>("/api/meetings", { params }),

  get: (id: string) => api.get<MeetingDetail>(`/api/meetings/${id}`),

  create: (data: CreateMeetingPayload) =>
    api.post<MeetingDetail>("/api/meetings", data),

  update: (id: string, data: UpdateMeetingPayload) =>
    api.patch<MeetingDetail>(`/api/meetings/${id}`, data),

  delete: (id: string) => api.delete(`/api/meetings/${id}`),

  getStatus: (id: string) =>
    api.get<MeetingStatusResponse>(`/api/meetings/${id}/status`),
};

export const actionItemsApi = {
  create: (meetingId: string, data: CreateActionItemPayload) =>
    api.post<ActionItem>(`/api/meetings/${meetingId}/action-items`, data),

  update: (meetingId: string, itemId: string, data: UpdateActionItemPayload) =>
    api.patch<ActionItem>(
      `/api/meetings/${meetingId}/action-items/${itemId}`,
      data
    ),

  delete: (meetingId: string, itemId: string) =>
    api.delete(`/api/meetings/${meetingId}/action-items/${itemId}`),
};

export const summariesApi = {
  get: (meetingId: string) =>
    api.get<SummaryDetail>(`/api/meetings/${meetingId}/summary`),

  regenerate: (meetingId: string) =>
    api.post(`/api/meetings/${meetingId}/summary/regenerate`),
};

export const aiApi = {
  processTranscript: (meetingId: string) =>
    api.post("/api/ai/process-transcript", { meeting_id: meetingId }),

  askQuestion: async function* (
    meetingId: string,
    question: string,
    conversationHistory: { role: string; content: string }[]
  ) {
    const response = await fetch(
      `${api.defaults.baseURL}/api/ai/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meetingId,
          question,
          conversation_history: conversationHistory,
        }),
      }
    );

    if (!response.ok) throw new Error("AI request failed");
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          yield data;
        }
      }
    }
  },
};

export const searchApi = {
  search: (query: string, limit?: number) =>
    api.get<SearchResult[]>("/api/search", { params: { q: query, limit } }),
};

export default api;
