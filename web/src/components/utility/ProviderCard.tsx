import type { Provider } from '../../types';
import { formatProvider } from '../../utils/format';
import { Icon } from '../ui/Icon';

export function ProviderCard({ provider, onChoose }: { provider: Provider; onChoose: () => void }) {
  return (
    <section className="mt-4">
      <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Provider</p>
      <button
        type="button"
        onClick={onChoose}
        className="mt-2 flex w-full items-center gap-3 rounded-lg border border-gray-400 dark:border-gray-600 bg-white p-3 text-left shadow-sm hover:border-accent hover:bg-black/[.02] dark:bg-white/[.035] dark:hover:bg-white/[.055]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
          <Icon name={provider === 'semaphore' ? 'phone' : 'developer'} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium">{formatProvider(provider)}</span>
          <span className="mt-0.5 block text-[10px] text-black/40 dark:text-white/30">Change provider</span>
        </span>
        <Icon name="next" className="h-4 w-4 text-black/25 dark:text-white/25" />
      </button>
    </section>
  );
}
