import { useMemo, useState } from 'react';

import type { Conversation, Message, Theme } from '../../types';
import { formatPhone, formatTime } from '../../utils/format';
import { Status } from '../Status';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Logo } from '../ui/Logo';
import { ThemeButton } from '../ui/ThemeButton';

export function ConversationSidebar({
  messages,
  loading,
  selectedRecipient,
  connected,
  theme,
  onThemeChange,
  onSelect,
  onClear,
}: {
  messages: Message[];
  loading: boolean;
  selectedRecipient: string | null;
  connected: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSelect: (recipient: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<string, Message[]>();
    for (const message of messages) {
      if (!`${message.to} ${message.from ?? ''} ${message.message}`.toLowerCase().includes(search.toLowerCase()))
        continue;
      grouped.set(message.to, [...(grouped.get(message.to) ?? []), message]);
    }
    return [...grouped.entries()]
      .map(([recipient, items]) => {
        const chronological = items.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
        return {
          recipient,
          messages: chronological,
          latest: chronological[chronological.length - 1],
        };
      })
      .sort((a, b) => Date.parse(b.latest.created_at) - Date.parse(a.latest.created_at));
  }, [messages, search]);

  return (
    <aside
      className={`${selectedRecipient || messages.length === 0 ? 'hidden lg:flex' : 'flex'} min-h-0 min-w-0 flex-col border-r border-gray-300 dark:border-gray-600 bg-[#fafafa] dark:bg-[#19191b]`}
    >
      <header className="px-4 pb-3 pt-5">
        <div className="mb-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <div className="flex flex-col leading-none">
              <div className="text-md font-semibold">Teks</div>
              <div className="text-xs text-black/70 dark:text-white/40">Local SMS Inbox</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeButton theme={theme} onChange={onThemeChange} className="xl:hidden" />
            {messages.length > 0 && <IconButton icon="trash" label="Clear inbox" tone="red" onClick={onClear} />}
          </div>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-gray-400 dark:border-gray-600 bg-white px-3 text-black/40 ring-accent/20 focus-within:ring-2 dark:bg-white/[.04] dark:text-white/40">
          <Icon name="search" className="h-4 w-4" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-[#242424] dark:text-white dark:placeholder:text-white/30"
            placeholder="Search messages"
            name="search-messages"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              <Icon name="close" className="h-4 w-4" />
            </button>
          )}
        </label>
      </header>
      <div className="scrollbar-none flex-1 overflow-y-auto px-2 pb-2">
        {loading && <p className="px-4 py-10 text-center text-sm text-black/40 dark:text-white/35">Loading inbox…</p>}
        {!loading && messages.length > 0 && conversations.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-black/40 dark:text-white/35">No matching messages</p>
        )}
        {conversations.map((conversation) => {
          const selected = selectedRecipient === conversation.recipient;
          return (
            <button
              key={conversation.recipient}
              type="button"
              onClick={() => onSelect(conversation.recipient)}
              className={`group mb-2 w-full rounded-lg border border-gray-400 dark:border-gray-600 px-3 py-3 text-left shadow-sm ${selected ? 'bg-accent text-white' : 'hover:bg-black/[.04] dark:hover:bg-white/[.05]'}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-semibold">{formatPhone(conversation.recipient)}</span>
                <span
                  className={`shrink-0 text-[11px] ${selected ? 'text-white/70' : 'text-[#242424] dark:text-white/30'}`}
                >
                  {formatTime(conversation.latest.created_at)}
                </span>
              </div>
              <div
                className={`mt-1 flex items-center gap-2 ${selected ? 'text-white/75' : 'text-[#242424] dark:text-white/40'}`}
              >
                <p className="min-w-0 flex-1 truncate text-[13px] leading-5">{conversation.latest.message}</p>
                {conversation.messages.length > 1 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selected ? 'bg-white/20' : 'bg-black/[.06] dark:bg-white/10'}`}
                  >
                    {conversation.messages.length}
                  </span>
                )}
              </div>
              {conversation.latest.from && (
                <p
                  className={`mt-0.5 truncate text-[11px] ${selected ? 'text-white/55' : 'text-black/30 dark:text-white/25'}`}
                >
                  from {conversation.latest.from}
                </p>
              )}
            </button>
          );
        })}
        {conversations.length === 0 && <div className="text-xs text-gray-400 text-center">No messages yet</div>}
      </div>
      <div className="xl:hidden">
        <Status connected={connected} />
      </div>
    </aside>
  );
}
