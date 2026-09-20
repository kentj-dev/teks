export function Status({ connected }: { connected: boolean }) {
  return (
    <footer className="flex h-11 shrink-0 items-center gap-2 border-t px-5 text-[11px] text-black/40 dark:text-white/35">
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.12)]" : "bg-amber-500"}`}
      />
      <span>{connected ? "Running" : "Reconnecting"}</span>
      <span className="ml-auto font-mono text-[10px]">
        {window.location.host}
      </span>
    </footer>
  );
}
