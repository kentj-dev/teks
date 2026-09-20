import type { Message } from "../../types";
import {
  formatFullDate,
  formatProvider,
  semaphoreFields,
} from "../../utils/format";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { PayloadPanel } from "../ui/PayloadPanel";

export function DeveloperMessageCard({
  message,
  number,
  onCopy,
  onDelete,
}: {
  message: Message;
  number: number;
  onCopy: (value: string, label?: string) => void;
  onDelete: (message: Message) => void;
}) {
  const fields = [
    ["UUID", message.id],
    ["To", message.to],
    ["From", message.from ?? "—"],
    ["Provider", formatProvider(message.provider)],
    ...semaphoreFields(message),
    ["Status", message.status],
    ["Timestamp", formatFullDate(message.created_at)],
  ];

  return (
    <article className="overflow-hidden rounded-xl border border-gray-400 bg-[#fafafa] shadow-sm dark:bg-white/[.025]">
      <header className="flex items-center justify-between gap-3 border-b border-gray-300 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase text-accent">
            Message {number}
          </p>
          <p className="mt-0.5 truncate text-xs text-black/40 dark:text-white/35">
            {formatFullDate(message.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon="copy"
            label="Copy message UUID"
            title="Copy UUID"
            tone="blue"
            iconClassName="h-3.5 w-3.5"
            onClick={() => onCopy(message.id, "UUID copied")}
          />
          <IconButton
            icon="trash"
            label="Delete message"
            tone="red"
            iconClassName="h-3.5 w-3.5"
            onClick={() => onDelete(message)}
          />
        </div>
      </header>
      <div className="p-4">
        <div className="rounded-lg border border-gray-300 bg-white p-3 text-sm leading-6 text-black/75 dark:bg-white/[.035] dark:text-white/75">
          {message.message}
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div
              key={label}
              className="group min-w-0 border-b border-gray-300 pb-2 last:border-b-0 sm:last:border-b"
            >
              <dt className="text-[9px] font-medium uppercase text-black/30 dark:text-white/25">
                {label}
              </dt>
              <dd className="mt-1 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all text-[10px] leading-4 text-black/65 dark:text-white/60">
                  {value}
                </code>
                {value !== "—" && (
                  <button
                    type="button"
                    onClick={() => onCopy(value, `${label} copied`)}
                    className="shrink-0 text-black/20 hover:text-accent dark:text-white/20"
                    aria-label={`Copy ${label}`}
                  >
                    <Icon name="copy" className="h-3 w-3" />
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <PayloadPanel message={message} onCopy={onCopy} compact />
      </div>
    </article>
  );
}
