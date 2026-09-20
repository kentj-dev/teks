import { Logo } from '../ui/Logo';

export function NoConversationSelected() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-10">
      <div className="text-center">
        <Logo size={48} className="mx-auto" />
        <p className="mt-4 text-sm font-medium text-black/55 dark:text-white/55">Select a conversation</p>
        <p className="mt-1 text-xs text-black/30 dark:text-white/30">Choose a recipient from the inbox.</p>
      </div>
    </div>
  );
}
