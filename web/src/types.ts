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
export type Provider = string;
export type ProviderResponse = { provider: Provider };

export type ProviderSpec = {
  id: Provider;
  label: string;
  description: string;
  icon: string;
  basePath: string;
  sendPath: string;
  example: string;
  auth: { scheme: "basic"; username: string; password: string } | null;
  pathParams: { name: string; example: string; note: string }[];
  endpoints: ApiEndpoint[];
  detailFields: { label: string; pointer: string; fallback: string | null }[];
};

export type RequestEncoding = "json" | "form" | "query";

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  status: number;
  request: { encoding: RequestEncoding; fields: unknown } | null;
  response: unknown;
};
