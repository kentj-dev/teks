import { Icon } from "../ui/Icon";

const labels = ["About Teks", "Provider", "Get started"];

export function SetupProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <nav className="mx-auto mt-10 w-full max-w-2xl" aria-label="Setup progress">
      <ol className="grid grid-cols-3">
        {labels.map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const complete = number < step;
          const active = number === step;
          return (
            <li
              key={label}
              className="relative flex flex-col items-center text-center"
            >
              {index > 0 && (
                <span
                  className={`absolute right-1/2 top-4 h-px w-full ${number <= step ? "bg-accent" : "bg-black/10 dark:bg-white/10"}`}
                />
              )}
              <span
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${complete || active ? "border-accent bg-accent text-white" : "border-black/15 bg-[#f2f2f2] text-black/35 dark:border-white/15 dark:bg-[#0d0d0f] dark:text-white/30"}`}
              >
                {complete ? (
                  <Icon name="check" className="h-3.5 w-3.5" />
                ) : (
                  number
                )}
              </span>
              <span
                className={`mt-2 text-[10px] font-medium sm:text-xs ${active ? "text-black dark:text-white" : "text-black/35 dark:text-white/30"}`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
