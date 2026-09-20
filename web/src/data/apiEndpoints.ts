import type { ApiEndpoint, Provider } from "../types";

const sampleMessage = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  provider: "rest",
  to: "09171234567",
  from: "MyApp",
  message: "Your OTP is 123456",
  status: "delivered",
  created_at: "2026-09-20T10:30:00Z",
};

export const restApiEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/health",
    description: "Check whether Teks is running.",
    payloadLabel: "Sample response",
    payload: { status: "ok", service: "Teks" },
  },
  {
    method: "POST",
    path: "/api/messages",
    description: "Capture an outgoing SMS message.",
    payloadLabel: "Request body",
    payload: {
      to: "09171234567",
      from: "MyApp",
      message: "Your OTP is 123456",
    },
  },
  {
    method: "GET",
    path: "/api/messages",
    description: "List messages, newest first.",
    payloadLabel: "Sample response",
    payload: [sampleMessage],
  },
  {
    method: "GET",
    path: "/api/messages/:uuid",
    description: "Retrieve one captured message.",
    payloadLabel: "Sample response",
    payload: sampleMessage,
  },
  {
    method: "DELETE",
    path: "/api/messages/:uuid",
    description: "Delete one captured message.",
    payloadLabel: "Sample response",
    payload: { success: true, deleted: 1 },
  },
  {
    method: "DELETE",
    path: "/api/messages",
    description: "Clear every captured message.",
    payloadLabel: "Sample response",
    payload: { success: true, deleted: 12 },
  },
  {
    method: "GET",
    path: "/api/events",
    description: "Subscribe to live SSE updates.",
    payloadLabel: "Sample event payload",
    payload: { event: "new-message", data: sampleMessage },
  },
];

const semaphoreMessage = {
  message_id: 1,
  user_id: 1,
  user: "local@teks",
  account_id: 1,
  account: "Teks Local",
  recipient: "09171234567",
  message: "Hello from Teks",
  sender_name: "MyApp",
  network: "Unknown",
  status: "Sent",
  type: "Single",
  source: "Api",
  created_at: "2026-09-20 18:30:00",
  updated_at: "2026-09-20 18:30:00",
};

export const semaphoreApiEndpoints: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/v4/messages",
    description: "Capture one or up to 1,000 messages.",
    payloadLabel: "Form parameters",
    payload: {
      apikey: "local",
      number: "09171234567",
      message: "Hello from Teks",
      sendername: "MyApp",
    },
  },
  {
    method: "POST",
    path: "/api/v4/priority",
    description: "Capture a priority message.",
    payloadLabel: "Form parameters",
    payload: {
      apikey: "local",
      number: "09171234567",
      message: "Important message",
      sendername: "MyApp",
    },
  },
  {
    method: "POST",
    path: "/api/v4/otp",
    description: "Capture an OTP message with an optional code.",
    payloadLabel: "Form parameters",
    payload: {
      apikey: "local",
      number: "09171234567",
      message: "Your OTP is {otp}",
      code: "123456",
    },
  },
  {
    method: "GET",
    path: "/api/v4/messages",
    description: "List captured Semaphore messages.",
    payloadLabel: "Sample response",
    payload: [semaphoreMessage],
  },
  {
    method: "GET",
    path: "/api/v4/messages/:id",
    description: "Retrieve one message by numeric ID.",
    payloadLabel: "Sample response",
    payload: semaphoreMessage,
  },
  {
    method: "GET",
    path: "/api/v4/account",
    description: "Retrieve the simulated local account.",
    payloadLabel: "Sample response",
    payload: {
      account_id: 1,
      account_name: "Teks Local",
      status: "Active",
      credit_balance: 999999,
    },
  },
  {
    method: "GET",
    path: "/api/v4/account/transactions",
    description: "List simulated account transactions.",
    payloadLabel: "Sample response",
    payload: [],
  },
  {
    method: "GET",
    path: "/api/v4/account/sendernames",
    description: "List local sender names.",
    payloadLabel: "Sample response",
    payload: [
      { name: "Teks", status: "Active", created_at: "2026-01-01 00:00:00" },
    ],
  },
  {
    method: "GET",
    path: "/api/v4/account/users",
    description: "List simulated account users.",
    payloadLabel: "Sample response",
    payload: [
      { user_id: 1, email: "local@teks", role: "Owner", status: "Active" },
    ],
  },
];

export function endpointsFor(provider: Provider) {
  return provider === "semaphore" ? semaphoreApiEndpoints : restApiEndpoints;
}
