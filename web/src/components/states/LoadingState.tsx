export function LoadingState() {
  return (
    <div
      className="flex flex-1 items-center justify-center px-5 py-10"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border bg-[#fafafa] text-sm font-semibold text-black/55 dark:bg-white/[.035] dark:text-white/55">
          T
        </div>
        <p className="mt-4 text-sm font-medium text-black/55 dark:text-white/55">
          Loading inbox
        </p>
        <p className="mt-1 text-xs text-black/30 dark:text-white/30">
          Reading captured messages…
        </p>
      </div>
    </div>
  );
}
