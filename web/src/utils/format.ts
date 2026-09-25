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

