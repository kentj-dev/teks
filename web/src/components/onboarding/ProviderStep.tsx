import { useState } from 'react';

import { useProviders } from '../../providers';
import type { Provider } from '../../types';
import { Icon } from '../ui/Icon';

export function ProviderStep({
  provider,
  onSelect,
  onBack,
}: {
  provider: Provider;
  onSelect: (provider: Provider) => Promise<boolean>;
  onBack: () => void;
}) {
  const providers = useProviders();
  const [selecting, setSelecting] = useState<Provider | null>(null);

  async function choose(nextProvider: Provider) {
    setSelecting(nextProvider);
    await onSelect(nextProvider);
    setSelecting(null);
  }

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What&apos;s your provider?</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-black/50 dark:text-white/45">
          Choose the API your application uses. Only the selected provider&apos;s endpoints will accept requests.
        </p>
      </div>
      <div className="mx-auto mt-9 grid max-w-2xl gap-4 sm:grid-cols-2">
        {providers.map((item) => {
          const current = item.id === provider;
          const pending = item.id === selecting;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item.id)}
              disabled={selecting !== null}
              aria-pressed={current}
              className={`group relative flex min-h-56 flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10 disabled:cursor-wait disabled:opacity-70 dark:bg-[#19191b] ${current ? 'border-accent ring-2 ring-accent/15' : 'border-gray-400 dark:border-gray-600'}`}
            >
              <h2 className="text-lg font-semibold">{item.label}</h2>
              <p className="mt-2 text-xs leading-5 text-black/50 dark:text-white/40">{item.description}</p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <code className="text-[10px] text-black/40 dark:text-white/35">{item.sendPath}</code>
                <span className="flex items-center gap-1 text-xs font-medium text-accent">
                  {pending ? 'Selecting…' : 'Choose'}
                  {!pending && <Icon name="next" className="h-3.5 w-3.5" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mx-auto mt-7 flex items-center gap-1.5 text-xs font-medium text-black/45 hover:text-black dark:text-white/40 dark:hover:text-white"
      >
        <Icon name="back" className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  );
}
