import { useEffect, useMemo, useRef, useState } from 'react'

type Message = {
  id: string
  provider: string
  to: string
  from: string | null
  message: string
  status: string
  payload: unknown
  created_at: string
  updated_at: string
}

type Conversation = {
  recipient: string
  messages: Message[]
  latest: Message
}

const endpoint = `${window.location.origin}/api/messages`

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function formatPhone(value: string) {
  if (/^0\d{10}$/.test(value)) return `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`
  return value
}

function Icon({ name, className = 'h-5 w-5' }: { name: 'search' | 'copy' | 'info' | 'trash' | 'back' | 'close' | 'check'; className?: string }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    close: <><path d="m7 7 10 10M17 7 7 17"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
  }
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/messages')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load messages')
        return response.json() as Promise<Message[]>
      })
      .then(setMessages)
      .catch(() => showToast('Could not load messages'))
      .finally(() => setLoading(false))

    const events = new EventSource('/api/events')
    events.onopen = () => setConnected(true)
    events.onerror = () => setConnected(false)
    events.addEventListener('new-message', (event) => {
      const incoming = JSON.parse((event as MessageEvent<string>).data) as Message
      setMessages((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)])
      setSelectedRecipient((current) => current ?? incoming.to)
    })
    return () => events.close()
  }, [])

  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<string, Message[]>()
    for (const message of messages) {
      const matches = `${message.to} ${message.from ?? ''} ${message.message}`.toLowerCase().includes(search.toLowerCase())
      if (!matches) continue
      grouped.set(message.to, [...(grouped.get(message.to) ?? []), message])
    }
    return [...grouped.entries()]
      .map(([recipient, items]) => {
        const chronological = items.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        return { recipient, messages: chronological, latest: chronological[chronological.length - 1] }
      })
      .sort((a, b) => Date.parse(b.latest.created_at) - Date.parse(a.latest.created_at))
  }, [messages, search])

  useEffect(() => {
    if (!selectedRecipient && conversations[0]) setSelectedRecipient(conversations[0].recipient)
    if (selectedRecipient && !messages.some((message) => message.to === selectedRecipient)) {
      setSelectedRecipient(conversations[0]?.recipient ?? null)
    }
  }, [conversations, messages, selectedRecipient])

  const active = useMemo(
    () => conversations.find((conversation) => conversation.recipient === selectedRecipient)
      ?? (() => {
        const items = messages
          .filter((message) => message.to === selectedRecipient)
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        return items.length ? { recipient: selectedRecipient!, messages: items, latest: items[items.length - 1] } : null
      })(),
    [conversations, messages, selectedRecipient],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length, selectedRecipient])

  function showToast(text: string) {
    setToast(text)
    window.setTimeout(() => setToast(null), 1800)
  }

  async function copy(text: string, label = 'Copied') {
    await navigator.clipboard.writeText(text)
    showToast(label)
  }

  async function deleteMessage(message: Message) {
    if (!window.confirm('Delete this message?')) return
    const response = await fetch(`/api/messages/${message.id}`, { method: 'DELETE' })
    if (!response.ok) return showToast('Could not delete message')
    setMessages((current) => current.filter((item) => item.id !== message.id))
    setSelectedMessage(null)
    showToast('Message deleted')
  }

  async function clearAll() {
    if (!window.confirm('Delete every captured message? This cannot be undone.')) return
    const response = await fetch('/api/messages', { method: 'DELETE' })
    if (!response.ok) return showToast('Could not clear messages')
    setMessages([])
    setSelectedRecipient(null)
    showToast('Inbox cleared')
  }

  return (
    <main className="h-dvh bg-gradient-to-br from-white via-[#f5f5f7] to-[#ececf0] p-0 sm:p-3 dark:from-[#171719] dark:via-[#111113] dark:to-[#0b0b0c]">
      <section className="mx-auto grid h-full max-w-[1500px] grid-cols-1 overflow-hidden border-black/10 bg-white shadow-2xl shadow-black/10 sm:rounded-2xl sm:border lg:grid-cols-[340px_1fr] dark:border-white/10 dark:bg-[#161618] dark:shadow-black/30">
        <aside className={`${selectedRecipient || messages.length === 0 ? 'hidden lg:flex' : 'flex'} min-w-0 flex-col border-r bg-[#f7f7f9]/90 dark:bg-[#1c1c1e]/90`}>
          <header className="px-5 pb-3 pt-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Teks</h1>
                <p className="mt-0.5 text-xs font-medium text-black/45 dark:text-white/40">Local SMS inbox</p>
              </div>
              {messages.length > 0 && <button onClick={clearAll} className="rounded-full p-2 text-black/35 transition hover:bg-black/5 hover:text-red-500 dark:text-white/35 dark:hover:bg-white/10" aria-label="Clear inbox"><Icon name="trash" /></button>}
            </div>
            <label className="flex h-10 items-center gap-2 rounded-xl bg-black/[.055] px-3 text-black/40 ring-accent/30 focus-within:ring-2 dark:bg-white/[.075] dark:text-white/40">
              <Icon name="search" className="h-4 w-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/30" placeholder="Search messages" />
              {search && <button onClick={() => setSearch('')} aria-label="Clear search"><Icon name="close" className="h-4 w-4" /></button>}
            </label>
          </header>

          <div className="scrollbar-none flex-1 overflow-y-auto px-2 pb-2">
            {loading && <p className="px-4 py-10 text-center text-sm text-black/40 dark:text-white/35">Loading inbox…</p>}
            {!loading && messages.length > 0 && conversations.length === 0 && <p className="px-4 py-10 text-center text-sm text-black/40 dark:text-white/35">No matching messages</p>}
            {conversations.map((conversation) => (
              <button key={conversation.recipient} onClick={() => setSelectedRecipient(conversation.recipient)} className={`group mb-0.5 w-full rounded-xl px-3 py-3 text-left transition ${selectedRecipient === conversation.recipient ? 'bg-accent text-white shadow-sm' : 'hover:bg-black/[.045] dark:hover:bg-white/[.06]'}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold">{formatPhone(conversation.recipient)}</span>
                  <span className={`shrink-0 text-[11px] ${selectedRecipient === conversation.recipient ? 'text-white/70' : 'text-black/35 dark:text-white/30'}`}>{formatTime(conversation.latest.created_at)}</span>
                </div>
                <div className={`mt-1 flex items-center gap-2 ${selectedRecipient === conversation.recipient ? 'text-white/75' : 'text-black/45 dark:text-white/40'}`}>
                  <p className="min-w-0 flex-1 truncate text-[13px] leading-5">{conversation.latest.message}</p>
                  {conversation.messages.length > 1 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedRecipient === conversation.recipient ? 'bg-white/20' : 'bg-black/[.06] dark:bg-white/10'}`}>{conversation.messages.length}</span>}
                </div>
                {conversation.latest.from && <p className={`mt-0.5 truncate text-[11px] ${selectedRecipient === conversation.recipient ? 'text-white/55' : 'text-black/30 dark:text-white/25'}`}>from {conversation.latest.from}</p>}
              </button>
            ))}
          </div>

          <Status connected={connected} />
        </aside>

        <section className={`${selectedRecipient || messages.length === 0 ? 'flex' : 'hidden lg:flex'} min-w-0 flex-col bg-white dark:bg-[#111113]`}>
          {active ? (
            <>
              <header className="glass z-10 flex h-[72px] shrink-0 items-center justify-between border-b px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-2">
                  <button onClick={() => setSelectedRecipient(null)} className="-ml-2 rounded-full p-2 text-accent lg:hidden" aria-label="Back to conversations"><Icon name="back" /></button>
                  <div className="min-w-0">
                    <h2 className="truncate text-[16px] font-semibold">{formatPhone(active.recipient)}</h2>
                    <p className="mt-0.5 text-[11px] text-black/40 dark:text-white/35">{active.messages.length} {active.messages.length === 1 ? 'message' : 'messages'}</p>
                  </div>
                </div>
                <button onClick={() => copy(active.recipient, 'Number copied')} className="rounded-full p-2 text-black/35 transition hover:bg-black/5 hover:text-accent dark:text-white/35 dark:hover:bg-white/10" aria-label="Copy phone number"><Icon name="copy" /></button>
              </header>

              <div className="scrollbar-none flex-1 overflow-y-auto px-4 py-8 sm:px-10">
                <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                  <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-[.12em] text-black/30 dark:text-white/25">Captured by Teks</p>
                  {active.messages.map((message, index) => {
                    const previous = active.messages[index - 1]
                    const showTime = !previous || Date.parse(message.created_at) - Date.parse(previous.created_at) > 300000
                    return <div key={message.id} className="message-in flex flex-col items-end">
                      {showTime && <span className="mb-2 mt-3 pr-1 text-[10px] text-black/35 dark:text-white/30">{formatFullDate(message.created_at)}</span>}
                      <button onClick={() => setSelectedMessage(message)} className="max-w-[82%] rounded-[20px] rounded-br-[6px] bg-accent px-4 py-2.5 text-left text-[15px] leading-[1.35] text-white shadow-bubble transition hover:brightness-[1.04] active:scale-[.99] sm:max-w-[68%]">
                        {message.message}
                      </button>
                      <span className="mt-1 pr-1 text-[10px] text-black/30 dark:text-white/25">{formatTime(message.created_at)} · {message.status}</span>
                    </div>
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>
            </>
          ) : <EmptyState onCopy={copy} />}
          <div className="lg:hidden"><Status connected={connected} /></div>
        </section>
      </section>

      {selectedMessage && <Inspector message={selectedMessage} onClose={() => setSelectedMessage(null)} onCopy={copy} onDelete={deleteMessage} />}
      {toast && <div className="toast-in fixed bottom-7 left-1/2 z-50 flex items-center gap-2 rounded-full bg-[#252527] px-4 py-2 text-sm font-medium text-white shadow-xl"><Icon name="check" className="h-4 w-4 text-emerald-400" />{toast}</div>}
    </main>
  )
}

function Status({ connected }: { connected: boolean }) {
  return <footer className="flex h-11 shrink-0 items-center gap-2 border-t px-5 text-[11px] text-black/40 dark:text-white/35">
    <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.12)]' : 'bg-amber-500'}`} />
    <span>{connected ? 'Running' : 'Reconnecting'}</span>
    <span className="ml-auto font-mono text-[10px]">{window.location.host}</span>
  </footer>
}

function EmptyState({ onCopy }: { onCopy: (value: string, label?: string) => void }) {
  const command = `curl -X POST ${endpoint} \\\n+  -H "Content-Type: application/json" \\\n+  -d '{\n    "to": "09171234567",\n    "from": "MyApp",\n    "message": "Your OTP is 123456"\n  }'`
  return <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
    <div className="w-full max-w-xl text-center">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-accent text-2xl font-bold text-white shadow-lg shadow-accent/20">T</div>
      <h2 className="text-xl font-semibold tracking-tight">No messages yet</h2>
      <p className="mt-2 text-sm text-black/45 dark:text-white/40">Send your first SMS request to:</p>
      <button onClick={() => onCopy(endpoint, 'Endpoint copied')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/[.055] px-4 py-2 font-mono text-xs font-medium text-accent transition hover:bg-black/[.08] dark:bg-white/[.075] dark:hover:bg-white/10"><Icon name="copy" className="h-3.5 w-3.5" />POST {endpoint}</button>
      <div className="relative mt-7 text-left">
        <pre className="scrollbar-none overflow-x-auto rounded-2xl border bg-[#f5f5f7] p-4 pr-12 text-[11px] leading-5 text-black/65 dark:bg-[#1c1c1e] dark:text-white/60"><code>{command}</code></pre>
        <button onClick={() => onCopy(command, 'cURL copied')} className="absolute right-3 top-3 rounded-lg bg-white p-2 text-black/40 shadow-sm transition hover:text-accent dark:bg-white/10 dark:text-white/45" aria-label="Copy cURL command"><Icon name="copy" className="h-4 w-4" /></button>
      </div>
    </div>
  </div>
}

function Inspector({ message, onClose, onCopy, onDelete }: { message: Message; onClose: () => void; onCopy: (value: string, label?: string) => void; onDelete: (message: Message) => void }) {
  const details = [
    ['UUID', message.id], ['To', message.to], ['From', message.from ?? '—'],
    ['Provider', message.provider], ['Status', message.status], ['Timestamp', formatFullDate(message.created_at)],
  ]
  return <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] dark:bg-black/45" onMouseDown={onClose}>
    <aside className="glass absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="mb-7 flex items-center justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-accent">Developer details</p><h2 className="mt-1 text-xl font-semibold">Message inspector</h2></div>
        <button onClick={onClose} className="rounded-full bg-black/5 p-2 text-black/50 hover:bg-black/10 dark:bg-white/10 dark:text-white/50"><Icon name="close" /></button>
      </header>
      <div className="space-y-1 rounded-2xl border bg-white/50 p-2 dark:bg-white/[.035]">
        {details.map(([label, value]) => <div key={label} className="group flex items-start gap-4 rounded-xl px-3 py-2.5 hover:bg-black/[.025] dark:hover:bg-white/[.035]">
          <span className="w-20 shrink-0 text-xs text-black/40 dark:text-white/35">{label}</span>
          <span className="min-w-0 flex-1 break-all text-right text-xs font-medium">{value}</span>
          {value !== '—' && <button onClick={() => onCopy(value, `${label} copied`)} className="text-black/20 opacity-0 transition hover:text-accent group-hover:opacity-100 dark:text-white/25" aria-label={`Copy ${label}`}><Icon name="copy" className="h-3.5 w-3.5" /></button>}
        </div>)}
      </div>
      <section className="mt-6"><h3 className="mb-2 text-xs font-medium text-black/45 dark:text-white/40">Message</h3><div className="rounded-2xl bg-accent p-4 text-sm leading-6 text-white">{message.message}</div></section>
      <section className="mt-6"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-medium text-black/45 dark:text-white/40">Raw request payload</h3><button onClick={() => onCopy(JSON.stringify(message.payload, null, 2), 'Payload copied')} className="inline-flex items-center gap-1 text-[11px] text-accent"><Icon name="copy" className="h-3 w-3" />Copy</button></div><pre className="overflow-x-auto rounded-2xl bg-[#171719] p-4 text-[11px] leading-5 text-[#d6d6db]"><code>{JSON.stringify(message.payload, null, 2)}</code></pre></section>
      <button onClick={() => onDelete(message)} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.06] py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500/[.1]"><Icon name="trash" className="h-4 w-4" />Delete message</button>
    </aside>
  </div>
}

export default App
