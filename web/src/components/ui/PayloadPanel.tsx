import type { Message } from "../../types";
import { Icon } from "./Icon";

export function PayloadPanel({
  message,
  onCopy,
  compact = false,
}: {
  message: Message;
  onCopy: (value: string, label?: string) => void;
  compact?: boolean;
}) {
  const formatted = JSON.stringify(message.payload, null, 2);
  const title =
    message.provider === "semaphore" ? "Raw request" : "Raw request payload";
  return (
    <section className={compact ? "mt-4" : "mt-6"}>
      <div className="mb-2 flex items-center justify-between">
        <h3
          className={
            compact
              ? "text-[9px] font-medium uppercase text-black/30 dark:text-white/25"
              : "text-xs font-medium text-[#242424] dark:text-white/40"
          }
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onCopy(formatted, "Payload copied")}
          className="inline-flex items-center gap-1 text-[10px] text-accent"
        >
          <Icon name="copy" className="h-3 w-3" />
          Copy
        </button>
      </div>
      <pre
        className={`scrollbar-none overflow-auto bg-[#171719] text-[#d6d6db] ${compact ? "max-h-64 rounded-lg p-3 text-[10px] leading-5" : "rounded-2xl p-4 text-[11px] leading-5"}`}
      >
        <code>{formatted}</code>
      </pre>
    </section>
  );
}
