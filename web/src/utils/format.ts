import type { Message } from "../types";

export function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatFullDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function formatPhone(value: string) {
  return /^0\d{10}$/.test(value)
    ? `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`
    : value;
}

export function formatProvider(value: string) {
  if (value === "rest") return "REST API";
  if (value === "semaphore") return "Semaphore";
  return value;
}

export function semaphoreFields(message: Message): [string, string][] {
  if (message.provider !== "semaphore") return [];
  const payload =
    message.payload &&
    typeof message.payload === "object" &&
    !Array.isArray(message.payload)
      ? (message.payload as Record<string, unknown>)
      : {};
  return [
    ["Semaphore Message ID", String(message.provider_message_id ?? "—")],
    ["Type", typeof payload.type === "string" ? payload.type : "Single"],
    [
      "Network",
      typeof payload.network === "string" ? payload.network : "Unknown",
    ],
    ...(typeof payload.code_text === "string"
      ? ([["OTP Code", payload.code_text]] as [string, string][])
      : []),
  ];
}
