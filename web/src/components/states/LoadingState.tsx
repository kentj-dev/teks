import { Logo } from '../ui/Logo';

export function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-10" role="status" aria-live="polite">
      <div className="text-center">
        <Logo size={48} className="mx-auto" />
        <p className="mt-4 text-sm font-medium text-black/55 dark:text-white/55">Loading inbox</p>
        <p className="mt-1 text-xs text-black/30 dark:text-white/30">Reading captured messages…</p>
      </div>
    </div>
  );
}
