import type { Message } from '../../types';
import { providerDetailFields, providerLabel, useProviders } from '../../providers';
import { formatFullDate } from '../../utils/format';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { PayloadPanel } from '../ui/PayloadPanel';

export function Inspector({
  message,
  onClose,
  onCopy,
  onDelete,
}: {
  message: Message;
  onClose: () => void;
  onCopy: (value: string, label?: string) => void;
  onDelete: (message: Message) => void;
}) {
  const providers = useProviders();
  const details = [
    ['UUID', message.id],
    ['To', message.to],
    ['From', message.from ?? '—'],
    ['Provider', providerLabel(providers, message.provider)],
    ...providerDetailFields(providers, message),
    ['Status', message.status],
    ['Timestamp', formatFullDate(message.created_at)],
  ];
  return (
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] dark:bg-black/45" onMouseDown={onClose}>
      <aside
        className="glass absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-accent">Developer details</p>
            <h2 className="mt-1 text-xl font-semibold">Message Inspector</h2>
          </div>
          <IconButton
            icon="close"
            label="Close message inspector"
            onClick={onClose}
            className="rounded-full shadow-none"
          />
        </header>
        <div className="space-y-1 rounded-2xl border border-gray-400 dark:border-gray-600 bg-white/50 p-2 shadow-sm dark:bg-white/[.035]">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="group flex items-start gap-4 rounded-xl px-3 py-2.5 hover:bg-black/[.025] dark:hover:bg-white/[.035]"
            >
              <span className="w-20 shrink-0 text-xs text-black/40 dark:text-white/35">{label}</span>
              <span className="min-w-0 flex-1 break-all text-right text-xs font-medium">{value}</span>
              {value !== '—' && (
                <button
                  type="button"
                  onClick={() => onCopy(value, `${label} copied`)}
                  className="text-black/20 opacity-0 hover:text-accent group-hover:opacity-100 dark:text-white/25"
                  aria-label={`Copy ${label}`}
                >
                  <Icon name="copy" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-medium text-[#242424] dark:text-white/40">Message</h3>
          <div className="rounded-2xl bg-accent p-4 text-sm leading-6 text-white">{message.message}</div>
        </section>
        <PayloadPanel message={message} onCopy={onCopy} />
        <button
          type="button"
          onClick={() => onDelete(message)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.06] py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/[.1]"
        >
          <Icon name="trash" className="h-4 w-4" />
          Delete message
        </button>
      </aside>
    </div>
  );
}
