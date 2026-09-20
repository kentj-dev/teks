import {
  BookOpen,
  Check,
  ChevronLeft,
  Code2,
  Coffee,
  Copy,
  ExternalLink,
  Globe2,
  Info,
  Moon,
  Search,
  Smartphone,
  Star,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Message = {
  id: string;
  provider: string;
  to: string;
  from: string | null;
  message: string;
  status: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
};

type Conversation = {
  recipient: string;
  messages: Message[];
  latest: Message;
};

type Theme = 'light' | 'dark';
type ViewMode = 'phone' | 'developer';
type Provider = 'rest' | 'semaphore';

const quickLinks = [
  { label: 'Teks website', hint: 'Product home', href: 'https://teks.dev', icon: 'globe' as const },
  { label: 'Quick guide', hint: 'Setup and API usage', href: 'https://teks.dev/guide', icon: 'book' as const },
  {
    label: 'Rate Teks',
    hint: 'Leave a GitHub star',
    href: 'https://github.com/kentj-dev/teks-rust',
    icon: 'star' as const,
  },
  {
    label: 'Buy me a coffee',
    hint: 'Support the project',
    href: 'https://buymeacoffee.com/kentjdev',
    icon: 'coffee' as const,
  },
];

type ApiEndpoint = {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  description: string;
  payloadLabel: string;
  payload: unknown;
};

const sampleMessage = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  provider: 'rest',
  to: '09171234567',
  from: 'MyApp',
  message: 'Your OTP is 123456',
  status: 'delivered',
  created_at: '2026-09-20T10:30:00Z',
};

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/health',
    description: 'Check whether Teks is running.',
    payloadLabel: 'Sample response',
    payload: { status: 'ok', service: 'Teks' },
  },
  {
    method: 'POST',
    path: '/api/messages',
    description: 'Capture an outgoing SMS message.',
    payloadLabel: 'Request body',
    payload: { to: '09171234567', from: 'MyApp', message: 'Your OTP is 123456' },
  },
  {
    method: 'GET',
    path: '/api/messages',
    description: 'List messages, newest first.',
    payloadLabel: 'Sample response',
    payload: [sampleMessage],
  },
  {
    method: 'GET',
    path: '/api/messages/:uuid',
    description: 'Retrieve one captured message.',
    payloadLabel: 'Sample response',
    payload: sampleMessage,
  },
  {
    method: 'DELETE',
    path: '/api/messages/:uuid',
    description: 'Delete one captured message.',
    payloadLabel: 'Sample response',
    payload: { success: true, deleted: 1 },
  },
  {
    method: 'DELETE',
    path: '/api/messages',
    description: 'Clear every captured message.',
    payloadLabel: 'Sample response',
    payload: { success: true, deleted: 12 },
  },
  {
    method: 'GET',
    path: '/api/events',
    description: 'Subscribe to live SSE updates.',
    payloadLabel: 'Sample event payload',
    payload: { event: 'new-message', data: sampleMessage },
  },
];

const endpoint = `${window.location.origin}/api/messages`;

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function formatPhone(value: string) {
  if (/^0\d{10}$/.test(value)) return `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`;
  return value;
}

type IconName =
  | 'search'
  | 'copy'
  | 'info'
  | 'trash'
  | 'back'
  | 'close'
  | 'check'
  | 'sun'
  | 'moon'
  | 'globe'
  | 'book'
  | 'star'
  | 'coffee'
  | 'external'
  | 'phone'
  | 'developer';

const icons: Record<IconName, LucideIcon> = {
  search: Search,
  copy: Copy,
  info: Info,
  trash: Trash2,
  back: ChevronLeft,
  close: X,
  check: Check,
  sun: Sun,
  moon: Moon,
  globe: Globe2,
  book: BookOpen,
  star: Star,
  coffee: Coffee,
  external: ExternalLink,
  phone: Smartphone,
  developer: Code2,
};

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const Component = icons[name];
  return <Component className={className} strokeWidth={1.8} aria-hidden="true" />;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('teks-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = window.localStorage.getItem('teks-view-mode');
    return saved === 'developer' ? 'developer' : 'phone';
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('teks-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('teks-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetch('/api/messages')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load messages');
        return response.json() as Promise<Message[]>;
      })
      .then((loadedMessages) => {
        setMessages(loadedMessages);
        setSelectedRecipient((current) => current ?? loadedMessages[0]?.to ?? null);
      })
      .catch(() => showToast('Could not load messages'))
      .finally(() => setLoading(false));

    const events = new EventSource('/api/events');
    events.onopen = () => setConnected(true);
    events.onerror = () => setConnected(false);
    events.addEventListener('new-message', (event) => {
      const incoming = JSON.parse((event as MessageEvent<string>).data) as Message;
      setMessages((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)]);
      setSelectedRecipient((current) => current ?? incoming.to);
    });
    return () => events.close();
  }, []);

  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<string, Message[]>();
    for (const message of messages) {
      const matches = `${message.to} ${message.from ?? ''} ${message.message}`
        .toLowerCase()
        .includes(search.toLowerCase());
      if (!matches) continue;
      grouped.set(message.to, [...(grouped.get(message.to) ?? []), message]);
    }
    return [...grouped.entries()]
      .map(([recipient, items]) => {
        const chronological = items.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
        return { recipient, messages: chronological, latest: chronological[chronological.length - 1] };
      })
      .sort((a, b) => Date.parse(b.latest.created_at) - Date.parse(a.latest.created_at));
  }, [messages, search]);

  useEffect(() => {
    if (!selectedRecipient && conversations[0]) setSelectedRecipient(conversations[0].recipient);
    if (selectedRecipient && !messages.some((message) => message.to === selectedRecipient)) {
      setSelectedRecipient(conversations[0]?.recipient ?? null);
    }
  }, [conversations, messages, selectedRecipient]);

  const active = useMemo(
    () =>
      conversations.find((conversation) => conversation.recipient === selectedRecipient) ??
      (() => {
        const items = messages
          .filter((message) => message.to === selectedRecipient)
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
        return items.length
          ? { recipient: selectedRecipient!, messages: items, latest: items[items.length - 1] }
          : null;
      })(),
    [conversations, messages, selectedRecipient],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [active?.messages.length, selectedRecipient]);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function copy(text: string, label = 'Copied') {
    await navigator.clipboard.writeText(text);
    showToast(label);
  }

  async function deleteMessage(message: Message) {
    if (!window.confirm('Delete this message?')) return;
    const response = await fetch(`/api/messages/${message.id}`, { method: 'DELETE' });
    if (!response.ok) return showToast('Could not delete message');
    setMessages((current) => current.filter((item) => item.id !== message.id));
    setSelectedMessage(null);
    showToast('Message deleted');
  }

  async function clearAll() {
    if (!window.confirm('Delete every captured message? This cannot be undone.')) return;
    const response = await fetch('/api/messages', { method: 'DELETE' });
    if (!response.ok) return showToast('Could not clear messages');
    setMessages([]);
    setSelectedRecipient(null);
    showToast('Inbox cleared');
  }

  async function deleteConversation(conversation: Conversation) {
    if (!window.confirm(`Delete all ${conversation.messages.length} messages for ${conversation.recipient}?`)) return;

    const results = await Promise.all(
      conversation.messages.map(async (message) => ({
        id: message.id,
        deleted: (await fetch(`/api/messages/${message.id}`, { method: 'DELETE' })).ok,
      })),
    );
    const deletedIds = new Set(results.filter((result) => result.deleted).map((result) => result.id));

    setMessages((current) => current.filter((message) => !deletedIds.has(message.id)));
    setSelectedMessage(null);
    if (deletedIds.size === conversation.messages.length) {
      setSelectedRecipient(null);
      showToast('Conversation deleted');
    } else {
      showToast(`Deleted ${deletedIds.size} of ${conversation.messages.length} messages`);
    }
  }

  return (
    <main className="h-dvh bg-[#f2f2f2] dark:bg-[#0d0d0f]">
      <section className="grid h-full min-h-0 w-full grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-2 xl:grid-cols-[300px_minmax(0,1fr)_400px]">
        <aside
          className={`${selectedRecipient || messages.length === 0 ? 'hidden lg:flex' : 'flex'} min-h-0 min-w-0 flex-col bg-[#fafafa] dark:bg-[#19191b] border-r border-gray-300`}
        >
          <header className="px-4 pb-3 pt-5">
            <div className="mb-5 flex items-center justify-between px-1">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Teks</h1>
                <p className="mt-0.5 text-xs text-black/40 dark:text-white/40">Local SMS inbox</p>
              </div>
              <div className="flex items-center gap-1">
                <ThemeButton theme={theme} onChange={setTheme} className="xl:hidden" />
                {messages.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="rounded-lg bg-red-50 border border-red-500 text-red-500 p-2 "
                    aria-label="Clear inbox"
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-black/40 ring-accent/20 focus-within:ring-2 dark:bg-white/[.04] dark:text-white/40 border-gray-400">
              <Icon name="search" className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-[#242424] dark:text-white dark:placeholder:text-white/30"
                placeholder="Search messages"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </label>
          </header>

          <div className="scrollbar-none flex-1 overflow-y-auto px-2 pb-2">
            {loading && (
              <p className="px-4 py-10 text-center text-sm text-black/40 dark:text-white/35">Loading inbox…</p>
            )}
            {!loading && messages.length > 0 && conversations.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-black/40 dark:text-white/35">No matching messages</p>
            )}
            {conversations.map((conversation) => (
              <button
                key={conversation.recipient}
                onClick={() => setSelectedRecipient(conversation.recipient)}
                className={`group mb-2 w-full border border-gray-400 shadow-sm rounded-lg px-3 py-3 text-left ${selectedRecipient === conversation.recipient ? 'bg-accent text-white' : 'hover:bg-black/[.04] dark:hover:bg-white/[.05]'}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold">{formatPhone(conversation.recipient)}</span>
                  <span
                    className={`shrink-0 text-[11px] ${selectedRecipient === conversation.recipient ? 'text-white/70' : 'text-[#242424] dark:text-white/30'}`}
                  >
                    {formatTime(conversation.latest.created_at)}
                  </span>
                </div>
                <div
                  className={`mt-1 flex items-center gap-2 ${selectedRecipient === conversation.recipient ? 'text-white/75' : 'text-[#242424] dark:text-white/40'}`}
                >
                  <p className="min-w-0 flex-1 truncate text-[13px] leading-5">{conversation.latest.message}</p>
                  {conversation.messages.length > 1 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedRecipient === conversation.recipient ? 'bg-white/20' : 'bg-black/[.06] dark:bg-white/10'}`}
                    >
                      {conversation.messages.length}
                    </span>
                  )}
                </div>
                {conversation.latest.from && (
                  <p
                    className={`mt-0.5 truncate text-[11px] ${selectedRecipient === conversation.recipient ? 'text-white/55' : 'text-black/30 dark:text-white/25'}`}
                  >
                    from {conversation.latest.from}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="xl:hidden">
            <Status connected={connected} />
          </div>
        </aside>

        <section
          className={`${selectedRecipient || messages.length === 0 ? 'flex' : 'hidden lg:flex'} border-x border-gray-300 min-h-0 min-w-0 flex-col overflow-hidden bg-white dark:bg-[#111113]`}
        >
          {loading ? (
            <LoadingState />
          ) : active ? (
            <>
              <header className="glass z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-gray-300 px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={() => setSelectedRecipient(null)}
                    className="-ml-2 rounded-full p-2 text-accent lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <Icon name="back" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate text-[16px] font-semibold">{formatPhone(active.recipient)}</h2>
                    <p className="mt-0.5 text-[11px] text-black/40 dark:text-white/35">
                      {active.messages.length} {active.messages.length === 1 ? 'message' : 'messages'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ThemeButton theme={theme} onChange={setTheme} className="xl:hidden" />
                  <ViewModeSwitch mode={viewMode} onChange={setViewMode} />
                  <button
                    onClick={() => deleteConversation(active)}
                    className="rounded-lg shadow-sm border bg-red-50 border-red-500 text-red-500 p-2 "
                    aria-label={`Delete conversation with ${active.recipient}`}
                    title="Delete conversation"
                  >
                    <Icon name="trash" />
                  </button>
                  <button
                    onClick={() => copy(active.recipient, 'Number copied')}
                    className="rounded-lg shadow-sm border bg-blue-50 border-blue-500 text-blue-500 p-2 "
                    aria-label="Copy phone number"
                  >
                    <Icon name="copy" />
                  </button>
                </div>
              </header>

              {viewMode === 'phone' ? (
                <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-10">
                  <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                    <p className="mb-5 text-center text-[11px] font-medium uppercase text-black/30 dark:text-white/25">
                      Captured by Teks
                    </p>
                    {active.messages.map((message, index) => {
                      const previous = active.messages[index - 1];
                      const showTime =
                        !previous || Date.parse(message.created_at) - Date.parse(previous.created_at) > 300000;
                      return (
                        <div key={message.id} className="flex flex-col items-end">
                          {showTime && (
                            <span className="mb-2 mt-3 pr-1 text-[10px] text-[#242424] dark:text-white/30">
                              {formatFullDate(message.created_at)}
                            </span>
                          )}
                          <button
                            onClick={() => setSelectedMessage(message)}
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
                    <div ref={bottomRef} />
                  </div>
                </div>
              ) : (
                <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  <div className="mx-auto max-w-4xl space-y-4">
                    {active.messages.map((message, index) => (
                      <DeveloperMessageCard
                        key={message.id}
                        message={message}
                        number={index + 1}
                        onCopy={copy}
                        onDelete={deleteMessage}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState onCopy={copy} theme={theme} onThemeChange={setTheme} />
          )}
          <div className="lg:hidden">
            <Status connected={connected} />
          </div>
        </section>

        <UtilityPanel connected={connected} theme={theme} onThemeChange={setTheme} />
      </section>

      {selectedMessage && (
        <Inspector
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onCopy={copy}
          onDelete={deleteMessage}
        />
      )}
      {toast && (
        <div className="fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#252527] px-4 py-2 text-sm font-medium text-white shadow-xl">
          <Icon name="check" className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </main>
  );
}

function Status({ connected }: { connected: boolean }) {
  return (
    <footer className="flex h-11 shrink-0 items-center gap-2 border-t px-5 text-[11px] text-black/40 dark:text-white/35">
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.12)]' : 'bg-amber-500'}`}
      />
      <span>{connected ? 'Running' : 'Reconnecting'}</span>
      <span className="ml-auto font-mono text-[10px]">{window.location.host}</span>
    </footer>
  );
}

function ThemeButton({
  theme,
  onChange,
  className = '',
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  className?: string;
}) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      onClick={() => onChange(next)}
      className={`${className} rounded-full p-2 text-[#242424] hover:bg-black/5 hover:text-black/70 dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white/70`}
      aria-label={`Switch to ${next} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
    </button>
  );
}

function ViewModeSwitch({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 border border-gray-400 shadow-sm rounded-lg bg-black/[.045] p-0.5 dark:bg-white/[.06]"
      aria-label="Message view"
    >
      <button
        type="button"
        onClick={() => onChange('phone')}
        aria-pressed={mode === 'phone'}
        title="Phone view"
        className={`flex h-8 items-center gap-1.5 rounded-md  px-2 text-[11px] ${mode === 'phone' ? 'bg-white font-medium text-black shadow-sm dark:bg-[#303034] dark:text-white border border-gray-300' : 'text-black/40 dark:text-white/40'}`}
      >
        <Icon name="phone" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Phone</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('developer')}
        aria-pressed={mode === 'developer'}
        title="Developer view"
        className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] ${mode === 'developer' ? 'bg-white font-medium text-black shadow-sm dark:bg-[#303034] dark:text-white border border-gray-300' : 'text-black/40 dark:text-white/40'}`}
      >
        <Icon name="developer" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Developer</span>
      </button>
    </div>
  );
}

function DeveloperMessageCard({
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
    ['UUID', message.id],
    ['To', message.to],
    ['From', message.from ?? '—'],
    ['Provider', message.provider],
    ['Status', message.status],
    ['Timestamp', formatFullDate(message.created_at)],
  ];

  return (
    <article className="overflow-hidden rounded-xl border border-gray-400 shadow-sm bg-[#fafafa] dark:bg-white/[.025]">
      <header className="flex items-center justify-between gap-3 border-b border-gray-300 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase text-accent">Message {number}</p>
          <p className="mt-0.5 truncate text-xs text-black/40 dark:text-white/35">
            {formatFullDate(message.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCopy(message.id, 'UUID copied')}
            className="bg-blue-100 rounded-lg border border-blue-500 p-2 text-blue-500"
            aria-label="Copy message UUID"
            title="Copy UUID"
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(message)}
            className="bg-red-100 rounded-lg border border-red-500 p-2 text-red-500"
            aria-label="Delete message"
            title="Delete message"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="p-4">
        <div className="rounded-lg border border-gray-300 bg-white p-3 text-sm leading-6 text-black/75 dark:bg-white/[.035] dark:text-white/75">
          {message.message}
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="group min-w-0 border-b pb-2 last:border-b-0 sm:last:border-b border-gray-300">
              <dt className="text-[9px] font-medium uppercase text-black/30 dark:text-white/25">{label}</dt>
              <dd className="mt-1 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all text-[10px] leading-4 text-black/65 dark:text-white/60">
                  {value}
                </code>
                {value !== '—' && (
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

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] font-medium uppercase text-black/30 dark:text-white/25">Raw request payload</p>
            <button
              type="button"
              onClick={() => onCopy(JSON.stringify(message.payload, null, 2), 'Payload copied')}
              className="flex items-center gap-1 text-[10px] text-accent"
            >
              <Icon name="copy" className="h-3 w-3" />
              Copy
            </button>
          </div>
          <pre className="scrollbar-none max-h-64 overflow-auto rounded-lg bg-[#171719] p-3 text-[10px] leading-5 text-[#d6d6db]">
            <code>{JSON.stringify(message.payload, null, 2)}</code>
          </pre>
        </div>
      </div>
    </article>
  );
}

function UtilityPanel({
  connected,
  theme,
  onThemeChange,
}: {
  connected: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>('rest');

  return (
    <aside className="scrollbar-none border-l border-gray-300 hidden min-h-0 min-w-0 flex-col overflow-y-auto bg-[#fafafa] p-5 xl:flex dark:bg-[#19191b]">
      <div>
        <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Teks status</p>
        <div className="mt-3 rounded-lg border border-gray-400 shadow-sm bg-white p-3 dark:bg-white/[.035]">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-medium">{connected ? 'Running' : 'Reconnecting'}</span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-black/40 dark:text-white/35">{window.location.host}</p>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Provider</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as Provider)}
            className="mt-2 h-10 w-full rounded-lg border border-gray-400 bg-white px-3 text-xs font-medium text-black shadow-sm outline-none ring-accent/20 focus:border-accent focus:ring-2 dark:bg-[#202023] dark:text-white"
          >
            <option value="rest">REST API</option>
            <option value="semaphore">Semaphore</option>
          </select>
        </label>
      </div>

      <div className="mt-7">
        <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Appearance</p>
        <div className="border border-gray-400 shadow-sm mt-3 grid grid-cols-2 gap-1 rounded-lg bg-black/[.045] p-1 dark:bg-white/[.06]">
          <button
            onClick={() => onThemeChange('light')}
            aria-pressed={theme === 'light'}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs ${theme === 'light' ? 'bg-white border border-gray-300 font-medium text-black shadow-sm' : 'text-[#242424] hover:text-black dark:text-white/40'}`}
          >
            <Icon name="sun" className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            onClick={() => onThemeChange('dark')}
            aria-pressed={theme === 'dark'}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs ${theme === 'dark' ? 'bg-[#303034] border border-gray-300 font-medium text-white shadow-sm' : 'text-[#242424] hover:text-black dark:text-white/40 dark:hover:text-white'}`}
          >
            <Icon name="moon" className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>
      </div>

      <nav className="mt-7" aria-label="Teks links">
        <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Quick links</p>
        <div className="mt-2 space-y-1">
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-gray-400 shadow-sm ps-2 pe-4 py-2.5 hover:bg-black/[.04] dark:hover:bg-white/[.05]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-300 bg-white text-[#242424] dark:bg-white/[.04] dark:text-white/45">
                <Icon name={link.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">{link.label}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[#242424] dark:text-white/30">{link.hint}</span>
              </span>
              <Icon
                name="external"
                className="h-3.5 w-3.5 text-black/20 group-hover:text-[#242424] dark:text-white/20 dark:group-hover:text-white/45"
              />
            </a>
          ))}
        </div>
      </nav>

      <section className="mt-7" aria-labelledby="api-endpoints-title">
        <p id="api-endpoints-title" className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">
          API endpoints
        </p>
        <div className="mt-2 space-y-1">
          {apiEndpoints.map((apiEndpoint) => {
            const id = `${apiEndpoint.method}-${apiEndpoint.path}`;
            const isSelected = selectedEndpoint === id;
            const methodColor =
              apiEndpoint.method === 'GET'
                ? 'text-blue-600 dark:text-blue-400'
                : apiEndpoint.method === 'POST'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400';

            return (
              <div
                key={id}
                className="overflow-hidden rounded-lg border border-gray-400 shadow-sm bg-white dark:bg-white/[.035]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedEndpoint(isSelected ? null : id)}
                  aria-expanded={isSelected}
                  className="w-full px-2.5 py-2.5 text-left hover:bg-black/[.025] dark:hover:bg-white/[.035]"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-10 shrink-0 font-mono text-[9px] font-semibold ${methodColor}`}>
                      {apiEndpoint.method}
                    </span>
                    <code className="min-w-0 truncate text-[10px] font-medium text-black/65 dark:text-white/65">
                      {apiEndpoint.path}
                    </code>
                  </span>
                  <span className="mt-1 block pl-12 text-[9px] leading-4 text-[#242424] dark:text-white/30">
                    {apiEndpoint.description}
                  </span>
                </button>
                {isSelected && (
                  <div className="border-t px-2.5 pb-2.5 pt-2">
                    <p className="mb-1.5 text-[9px] font-medium text-[#242424] dark:text-white/30">
                      {apiEndpoint.payloadLabel}
                    </p>
                    <pre className="scrollbar-none max-h-52 overflow-auto rounded-md bg-[#171719] p-2.5 text-[9px] leading-4 text-[#d6d6db]">
                      <code>{JSON.stringify(apiEndpoint.payload, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-auto pt-4 text-[10px] text-black/30 dark:text-white/25">
        <p>Teks 0.1.0</p>
        <p className="mt-1">Local SMS testing for developers.</p>
      </div>
    </aside>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-10" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border bg-[#fafafa] text-sm font-semibold text-black/55 dark:bg-white/[.035] dark:text-white/55">
          T
        </div>
        <p className="mt-4 text-sm font-medium text-black/55 dark:text-white/55">Loading inbox</p>
        <p className="mt-1 text-xs text-black/30 dark:text-white/30">Reading captured messages…</p>
      </div>
    </div>
  );
}

function EmptyState({
  onCopy,
  theme,
  onThemeChange,
}: {
  onCopy: (value: string, label?: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  const command = `curl -X POST ${endpoint} \\\n+  -H "Content-Type: application/json" \\\n+  -d '{\n    "to": "09171234567",\n    "from": "MyApp",\n    "message": "Your OTP is 123456"\n  }'`;
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
      <div className="absolute right-4 top-4 xl:hidden">
        <ThemeButton theme={theme} onChange={onThemeChange} />
      </div>
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-accent text-2xl font-bold text-white shadow-lg shadow-accent/20">
          T
        </div>
        <h2 className="text-xl font-semibold tracking-tight">No messages yet</h2>
        <p className="mt-2 text-sm text-[#242424] dark:text-white/40">Send your first SMS request to:</p>
        <button
          onClick={() => onCopy(endpoint, 'Endpoint copied')}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/[.055] px-4 py-2 font-mono text-xs font-medium text-accent hover:bg-black/[.08] dark:bg-white/[.075] dark:hover:bg-white/10"
        >
          <Icon name="copy" className="h-3.5 w-3.5" />
          POST {endpoint}
        </button>
        <div className="relative mt-7 text-left">
          <pre className="scrollbar-none overflow-x-auto rounded-2xl border bg-[#f5f5f7] p-4 pr-12 text-[11px] leading-5 text-black/65 dark:bg-[#1c1c1e] dark:text-white/60">
            <code>{command}</code>
          </pre>
          <button
            onClick={() => onCopy(command, 'cURL copied')}
            className="absolute right-3 top-3 rounded-lg bg-white p-2 text-black/40 shadow-sm hover:text-accent dark:bg-white/10 dark:text-white/45"
            aria-label="Copy cURL command"
          >
            <Icon name="copy" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Inspector({
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
  const details = [
    ['UUID', message.id],
    ['To', message.to],
    ['From', message.from ?? '—'],
    ['Provider', message.provider],
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
          <button
            onClick={onClose}
            className="rounded-full border border-gray-400 bg-black/5 p-2 text-black/50 hover:bg-black/10 dark:bg-white/10 dark:text-white/50"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="space-y-1 rounded-2xl border border-gray-400 shadow-sm bg-white/50 p-2 dark:bg-white/[.035]">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="group flex items-start gap-4 rounded-xl px-3 py-2.5 hover:bg-black/[.025] dark:hover:bg-white/[.035]"
            >
              <span className="w-20 shrink-0 text-xs text-black/40 dark:text-white/35">{label}</span>
              <span className="min-w-0 flex-1 break-all text-right text-xs font-medium">{value}</span>
              {value !== '—' && (
                <button
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
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium text-[#242424] dark:text-white/40">Raw request payload</h3>
            <button
              onClick={() => onCopy(JSON.stringify(message.payload, null, 2), 'Payload copied')}
              className="inline-flex items-center gap-1 text-[11px] text-accent"
            >
              <Icon name="copy" className="h-3 w-3" />
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-[#171719] p-4 text-[11px] leading-5 text-[#d6d6db]">
            <code>{JSON.stringify(message.payload, null, 2)}</code>
          </pre>
        </section>
        <button
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

export default App;
