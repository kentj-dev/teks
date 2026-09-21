import type { MessageSortOrder } from '../../types';
import { Icon } from '../ui/Icon';

export function MessageSortSelect({
  order,
  onChange,
}: {
  order: MessageSortOrder;
  onChange: (order: MessageSortOrder) => void;
}) {
  const label = order === 'newest' ? 'Newest first' : 'Oldest first';

  return (
    <label
      className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-400 bg-black/[.045] px-2 text-[11px] text-black/55 shadow-sm ring-accent/20 hover:bg-black/[.07] focus-within:ring-2 dark:border-gray-600 dark:bg-white/[.06] dark:text-white/55 dark:hover:bg-white/10"
      title={`Sort messages: ${label}`}
    >
      <Icon name="sort" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{order === 'newest' ? 'Newest' : 'Oldest'}</span>
      <select
        value={order}
        onChange={(event) => onChange(event.target.value as MessageSortOrder)}
        aria-label="Sort messages"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </label>
  );
}
