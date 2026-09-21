export type Message = {
  id: string;
  provider_message_id?: number;
  provider: string;
  to: string;
  from: string | null;
  message: string;
  status: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  recipient: string;
  messages: Message[];
  latest: Message;
};

export type Theme = "light" | "dark";
export type ViewMode = "phone" | "developer";
export type MessageSortOrder = "newest" | "oldest";
export type FontSize = "compact" | "normal" | "zoomed";
export type Provider = "rest" | "semaphore";
export type ProviderResponse = { provider: Provider };

export type ApiEndpoint = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
  payloadLabel: string;
  payload: unknown;
};
