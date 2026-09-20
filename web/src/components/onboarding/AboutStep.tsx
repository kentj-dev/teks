import { Icon, type IconName } from '../ui/Icon';

const benefits: Array<[string, string, IconName]> = [
  ['Save SMS credits', 'Test messages and OTP flows without paying for or delivering real SMS messages.', 'check'],
  [
    'Mimic provider APIs',
    'Point your existing integration at Teks and keep using familiar provider endpoints.',
    'developer',
  ],
  ['Inspect locally', 'See recipients, content, provider details, and raw request data in one inbox.', 'search'],
];

export function AboutStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What&apos;s Teks?</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/55 dark:text-white/45">
          Teks lets you test SMS-provider integrations locally without sending real messages or spending SMS credits. It
          mimics supported provider APIs, captures each request, and shows the resulting messages in a local inbox.
        </p>
      </div>
      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        {benefits.map(([title, description, icon]) => (
          <article
            key={title}
            className="relative rounded-2xl border border-gray-400 dark:border-gray-600 bg-white p-4 shadow-sm dark:bg-[#19191b]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <h2 className="mt-4 text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-xs leading-5 text-black/45 dark:text-white/40">{description}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[.06] p-4 text-left">
        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs leading-5 text-black/55 dark:text-white/45">
          Teks aims to reproduce each provider&apos;s behavior, but compatibility may not be 100% exact. Provider
          support will continue to improve as new updates are released.
        </p>
      </div>
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:brightness-105"
        >
          Continue <Icon name="next" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
