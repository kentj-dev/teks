import { useLayoutEffect, useMemo, useRef } from 'react';

import type { Conversation, Message, MessageSortOrder, Provider, Theme, ViewMode } from '../../types';
import { formatFullDate, formatPhone, formatTime } from '../../utils/format';
import { Status } from '../Status';
import { DeveloperMessageCard } from '../messages/DeveloperMessageCard';
import { EmptyState } from '../states/EmptyState';
import { LoadingState } from '../states/LoadingState';
import { NoConversationSelected } from '../states/NoConversationSelected';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { ThemeButton } from '../ui/ThemeButton';

export function ConversationView({
  active,
  loading,
  hasMessages,
  connected,
  theme,
  provider,
  sortOrder,
  viewMode,
  onThemeChange,
  onBack,
  onSelectMessage,
  onCopy,
  onDeleteMessage,
  onDeleteConversation,
}: {
  active: Conversation | null;
  loading: boolean;
  hasMessages: boolean;
  connected: boolean;
  theme: Theme;
  provider: Provider;
  sortOrder: MessageSortOrder;
  viewMode: ViewMode;
  onThemeChange: (theme: Theme) => void;
  onBack: () => void;
  onSelectMessage: (message: Message) => void;
  onCopy: (value: string, label?: string) => void;
  onDeleteMessage: (message: Message) => void;
  onDeleteConversation: (conversation: Conversation) => void;
}) {
  const messageListRef = useRef<HTMLDivElement>(null);

  const sortedMessages = useMemo(() => {
    if (!active) return [];
    return [...active.messages].sort((a, b) => {
      const difference = Date.parse(a.created_at) - Date.parse(b.created_at);
      return sortOrder === 'newest' ? -difference : difference;
    });
  }, [active, sortOrder]);

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTop = 0;
  }, [active?.messages.length, active?.recipient, sortOrder, viewMode]);

  return (
    <section
      className={`${active || !hasMessages ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col overflow-hidden border-x border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111113]`}
    >
      {loading ? (
        <LoadingState />
      ) : active ? (
        <>
          <header className="glass z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-gray-300 dark:border-gray-600 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="-ml-2 rounded-full p-2 text-accent lg:hidden"
                aria-label="Back to conversations"
              >
                <Icon name="back" />
              </button>
              <div className="min-w-0 leading-none">
                <h2 className="truncate text-[16px] font-semibold">{formatPhone(active.recipient)}</h2>
                <p className="mt-0.5 text-[11px] text-black/40 dark:text-white/35">
                  {active.messages.length} {active.messages.length === 1 ? 'message' : 'messages'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeButton theme={theme} onChange={onThemeChange} className="xl:hidden" />
              <IconButton
                icon="trash"
                label={`Delete conversation with ${active.recipient}`}
                tone="red"
                onClick={() => onDeleteConversation(active)}
              />
              <IconButton
                icon="copy"
                label="Copy phone number"
                tone="blue"
                onClick={() => onCopy(active.recipient, 'Number copied')}
              />
            </div>
          </header>
          {viewMode === 'phone' ? (
            <div ref={messageListRef} className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-10">
              <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                <p className="mb-5 text-center text-[11px] font-medium uppercase text-black/30 dark:text-white/25">
                  Captured by Teks
                </p>
                {sortedMessages.map((message, index) => {
                  const previous = sortedMessages[index - 1];
                  const showTime =
                    !previous || Math.abs(Date.parse(message.created_at) - Date.parse(previous.created_at)) > 300000;
                  return (
                    <div key={message.id} className="flex flex-col items-end">
                      {showTime && (
                        <span className="mb-2 mt-3 pr-1 text-[10px] text-[#242424] dark:text-white/30">
                          {formatFullDate(message.created_at)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectMessage(message)}
                        className="max-w-[82%] rounded-[20px] rounded-br-[6px] bg-accent px-4 py-2.5 text-left text-[15px] leading-[1.35] text-white shadow-bubble hover:brightness-[1.04] sm:max-w-[68%]"
                      >
                        {message.message}
                      </button>
                      <span className="mt-1 pr-1 text-[10px] text-black/30 dark:text-white/25">
                        {formatTime(message.created_at)} · {message.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div ref={messageListRef} className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto max-w-4xl space-y-4">
                {sortedMessages.map((message, index) => (
                  <DeveloperMessageCard
                    key={message.id}
                    message={message}
                    number={sortOrder === 'newest' ? active.messages.length - index : index + 1}
                    onCopy={onCopy}
                    onDelete={onDeleteMessage}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : hasMessages ? (
        <NoConversationSelected />
      ) : (
        <EmptyState onCopy={onCopy} theme={theme} onThemeChange={onThemeChange} provider={provider} />
      )}
      <div className="lg:hidden">
        <Status connected={connected} />
      </div>
    </section>
  );
}
