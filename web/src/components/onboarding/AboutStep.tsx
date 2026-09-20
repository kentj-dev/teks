import { Icon, type IconName } from "../ui/Icon";

const benefits: Array<[string, string, IconName]> = [
  [
    "Capture locally",
    "Point your application at Teks and keep every test message on your machine.",
    "developer",
  ],
  [
    "Inspect instantly",
    "See recipients, content, provider details, and raw request data in one inbox.",
    "search",
  ],
  [
    "Test safely",
    "Exercise OTP and messaging flows without credits, devices, or external requests.",
    "check",
  ],
];

export function AboutStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 1
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          What&apos;s Teks?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/55 dark:text-white/45">
          Teks is a local SMS testing inbox. It captures the messages your
          application tries to send so you can build and debug messaging flows
          without contacting a real provider or delivering a real SMS.
        </p>
      </div>
      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        {benefits.map(([title, description, icon]) => (
          <article
            key={title}
            className="rounded-2xl border border-gray-400 bg-white p-4 shadow-sm dark:bg-[#19191b]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <h2 className="mt-4 text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-xs leading-5 text-black/45 dark:text-white/40">
              {description}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 hover:brightness-105"
        >
          Continue <Icon name="next" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
