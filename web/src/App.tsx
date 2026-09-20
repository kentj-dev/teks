import { useEffect, useMemo, useState } from 'react';

import { ConversationView } from './components/conversation/ConversationView';
import { Inspector } from './components/messages/Inspector';
import { ProviderOnboarding } from './components/onboarding/ProviderOnboarding';
import { ConversationSidebar } from './components/sidebar/ConversationSidebar';
import { Toast } from './components/ui/Toast';
import { UtilityPanel } from './components/utility/UtilityPanel';
import type { Conversation, Message, Provider, ProviderResponse, Theme } from './types';
import { formatProvider } from './utils/format';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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

  useEffect(() => {
    fetch('/api/_teks/provider')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load provider');
        return response.json() as Promise<ProviderResponse>;
      })
      .then((response) => setProvider(response.provider))
      .catch(() => showToast('Could not load provider'));

    fetch('/api/_teks/messages')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load messages');
        return response.json() as Promise<Message[]>;
      })
      .then((loadedMessages) => {
        setMessages(loadedMessages);
        setSelectedRecipient(loadedMessages[0]?.to ?? null);
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

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function copy(text: string, label = 'Copied') {
    await navigator.clipboard.writeText(text);
    showToast(label);
  }

  async function changeProvider(nextProvider: Provider): Promise<boolean> {
    try {
      const response = await fetch('/api/_teks/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: nextProvider }),
      });
      if (!response.ok) {
        showToast('Could not change provider');
        return false;
      }
      const updated = (await response.json()) as ProviderResponse;
      setProvider(updated.provider);
      showToast(`${formatProvider(updated.provider)} selected`);
      return true;
    } catch {
      showToast('Could not change provider');
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
    if (!response.ok) return showToast('Could not delete message');
    setMessages((current) => current.filter((item) => item.id !== message.id));
    setSelectedMessage(null);
    showToast('Message deleted');
  }

  async function clearAll() {
    if (!window.confirm('Delete every captured message? This cannot be undone.')) return;
    const response = await fetch('/api/_teks/messages', { method: 'DELETE' });
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
        deleted: (await fetch(`/api/_teks/messages/${message.id}`, { method: 'DELETE' })).ok,
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

  if (showProviderSetup) {
    return (
      <>
        <ProviderOnboarding
          provider={provider}
          theme={theme}
          onThemeChange={setTheme}
          onSelect={changeProvider}
          onComplete={completeProviderSetup}
          onClose={providerSetupComplete ? () => setShowProviderSetup(false) : undefined}
        />
        {toast && <Toast text={toast} />}
      </>
    );
  }

  return (
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
          onThemeChange={setTheme}
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
      {toast && <Toast text={toast} />}
    </main>
  );
}

export default App;
