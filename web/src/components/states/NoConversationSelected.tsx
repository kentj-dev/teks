export function NoConversationSelected() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-10">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border bg-[#fafafa] text-sm font-semibold text-black/45 dark:bg-white/[.035] dark:text-white/45">
          T
        </div>
        <p className="mt-4 text-sm font-medium text-black/55 dark:text-white/55">
          Select a conversation
        </p>
        <p className="mt-1 text-xs text-black/30 dark:text-white/30">
          Choose a recipient from the inbox.
        </p>
      </div>
    </div>
  );
}
