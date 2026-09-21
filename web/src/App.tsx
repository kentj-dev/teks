import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { ConversationView } from './components/conversation/ConversationView';
import { Inspector } from './components/messages/Inspector';
import { ProviderOnboarding } from './components/onboarding/ProviderOnboarding';
import { ConversationSidebar } from './components/sidebar/ConversationSidebar';
import { UtilityPanel } from './components/utility/UtilityPanel';
import type {
  Conversation,
  FontSize,
  Message,
  MessageSortOrder,
  Provider,
  ProviderResponse,
  Theme,
  ViewMode,
} from './types';
import { formatProvider } from './utils/format';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const savedFontSize =
      window.localStorage.getItem('teks-font-size') ?? window.localStorage.getItem('teks-message-font-size');
    return savedFontSize === 'compact' || savedFontSize === 'zoomed' ? savedFontSize : 'normal';
  });
  const [sortOrder, setSortOrder] = useState<MessageSortOrder>(() =>
    window.localStorage.getItem('teks-message-sort') === 'newest' ? 'newest' : 'oldest',
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.localStorage.getItem('teks-view-mode') === 'developer' ? 'developer' : 'phone',
  );
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('teks-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [provider, setProvider] = useState<Provider>(() =>
    window.localStorage.getItem('teks-provider') === 'semaphore' ? 'semaphore' : 'rest',
  );
  const [providerSetupComplete, setProviderSetupComplete] = useState(
    () => window.localStorage.getItem('teks-provider-setup-complete') === 'true',
  );
  const [showProviderSetup, setShowProviderSetup] = useState(() => !providerSetupComplete);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('teks-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('teks-provider', provider);
  }, [provider]);

  useLayoutEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    window.localStorage.setItem('teks-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    window.localStorage.setItem('teks-message-sort', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    window.localStorage.setItem('teks-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetch('/api/_teks/provider')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load provider');
        return response.json() as Promise<ProviderResponse>;
      })
      .then((response) => setProvider(response.provider))
      .catch(() => toast.error('Could not load provider'));

    fetch('/api/_teks/messages')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load messages');
        return response.json() as Promise<Message[]>;
      })
      .then((loadedMessages) => {
        setMessages(loadedMessages);
        setSelectedRecipient(loadedMessages[0]?.to ?? null);
      })
      .catch(() => toast.error('Could not load messages'))
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

  useEffect(() => {
    if (selectedRecipient && !messages.some((message) => message.to === selectedRecipient)) {
      setSelectedRecipient(messages[0]?.to ?? null);
    }
  }, [messages, selectedRecipient]);

  const active = useMemo<Conversation | null>(() => {
    if (!selectedRecipient) return null;
    const items = messages
      .filter((message) => message.to === selectedRecipient)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    return items.length
      ? {
          recipient: selectedRecipient,
          messages: items,
          latest: items[items.length - 1],
        }
      : null;
  }, [messages, selectedRecipient]);

  async function copy(text: string, label = 'Copied') {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  }

  async function changeProvider(nextProvider: Provider): Promise<boolean> {
    try {
      const response = await fetch('/api/_teks/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: nextProvider }),
      });
      if (!response.ok) {
        toast.error('Could not change provider');
        return false;
      }
      const updated = (await response.json()) as ProviderResponse;
      setProvider(updated.provider);
      toast.success(`${formatProvider(updated.provider)} selected`);
      return true;
    } catch {
      toast.error('Could not change provider');
      return false;
    }
  }

  function completeProviderSetup() {
    window.localStorage.setItem('teks-provider-setup-complete', 'true');
    setProviderSetupComplete(true);
    setShowProviderSetup(false);
  }

  async function deleteMessage(message: Message) {
    if (!window.confirm('Delete this message?')) return;
    const response = await fetch(`/api/_teks/messages/${message.id}`, {
      method: 'DELETE',
    });
    if (!response.ok) return toast.error('Could not delete message');
    setMessages((current) => current.filter((item) => item.id !== message.id));
    setSelectedMessage(null);
    toast.success('Message deleted');
  }

  async function clearAll() {
    if (!window.confirm('Delete every captured message? This cannot be undone.')) return;
    const response = await fetch('/api/_teks/messages', { method: 'DELETE' });
    if (!response.ok) return toast.error('Could not clear messages');
    setMessages([]);
    setSelectedRecipient(null);
    toast.success('Inbox cleared');
  }

  async function deleteConversation(conversation: Conversation) {
    if (!window.confirm(`Delete all ${conversation.messages.length} messages for ${conversation.recipient}?`)) return;
    const results = await Promise.all(
      conversation.messages.map(async (message) => ({
        id: message.id,
        deleted: (await fetch(`/api/_teks/messages/${message.id}`, { method: 'DELETE' })).ok,
      })),
    );
    const deletedIds = new Set(results.filter((result) => result.deleted).map((result) => result.id));
    setMessages((current) => current.filter((message) => !deletedIds.has(message.id)));
    setSelectedMessage(null);
    if (deletedIds.size === conversation.messages.length) {
      setSelectedRecipient(null);
      toast.success('Conversation deleted');
    } else {
      toast.warning(`Deleted ${deletedIds.size} of ${conversation.messages.length} messages`);
    }
  }

  return (
    <>
      {showProviderSetup ? (
        <ProviderOnboarding
          provider={provider}
          theme={theme}
          onThemeChange={setTheme}
          onSelect={changeProvider}
          onComplete={completeProviderSetup}
          onClose={providerSetupComplete ? () => setShowProviderSetup(false) : undefined}
        />
      ) : (
        <main className="h-dvh bg-[#f2f2f2] dark:bg-[#0d0d0f]">
          <section className="grid h-full min-h-0 w-full grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-2 xl:grid-cols-[300px_minmax(0,1fr)_400px]">
            <ConversationSidebar
              messages={messages}
              loading={loading}
              selectedRecipient={selectedRecipient}
              connected={connected}
              theme={theme}
              onThemeChange={setTheme}
              onSelect={setSelectedRecipient}
              onClear={clearAll}
            />
            <ConversationView
              active={active}
              loading={loading}
              hasMessages={messages.length > 0}
              connected={connected}
              theme={theme}
              provider={provider}
              sortOrder={sortOrder}
              viewMode={viewMode}
              onThemeChange={setTheme}
              onBack={() => setSelectedRecipient(null)}
              onSelectMessage={setSelectedMessage}
              onCopy={copy}
              onDeleteMessage={deleteMessage}
              onDeleteConversation={deleteConversation}
            />
            <UtilityPanel
              connected={connected}
              theme={theme}
              fontSize={fontSize}
              sortOrder={sortOrder}
              viewMode={viewMode}
              onThemeChange={setTheme}
              onFontSizeChange={setFontSize}
              onSortOrderChange={setSortOrder}
              onViewModeChange={setViewMode}
              provider={provider}
              onChooseProvider={() => setShowProviderSetup(true)}
            />
          </section>
          {selectedMessage && (
            <Inspector
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              onCopy={copy}
              onDelete={deleteMessage}
            />
          )}
        </main>
      )}
      <Toaster
        theme={theme}
        duration={1800}
        richColors
        toastOptions={{ style: { fontSize: 'var(--teks-text-13)' } }}
      />
    </>
  );
}

export default App;
