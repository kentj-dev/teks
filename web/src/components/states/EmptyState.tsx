import { Image } from '@unpic/react';
import teksArt from '../../../images/teks-art-1.png';
import { useProviderSpec } from '../../providers';
import type { Provider, Theme } from '../../types';
import { Icon } from '../ui/Icon';
import { ThemeButton } from '../ui/ThemeButton';

export function EmptyState({
  onCopy,
  theme,
  onThemeChange,
  provider,
}: {
  onCopy: (value: string, label?: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  provider: Provider;
}) {
  const spec = useProviderSpec(provider);
  const endpoint = `${window.location.origin}${spec?.sendPath ?? ''}`;
  const command = spec?.example.replaceAll('{endpoint}', endpoint) ?? '';

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
      <div className="absolute right-4 top-4 xl:hidden">
        <ThemeButton theme={theme} onChange={onThemeChange} />
      </div>
      <div className="w-full max-w-xl text-center">
        <Image src={teksArt} alt="" width={420} height={420} layout="constrained" className="mb-10 mx-auto" />
        <h2 className="text-xl font-semibold tracking-tight">No messages yet</h2>
        <p className="mt-2 text-sm text-[#242424] dark:text-white/40">Send your first SMS request to:</p>
        <button
          type="button"
          onClick={() => onCopy(endpoint, 'Endpoint copied')}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-400 dark:border-gray-600 bg-black/[.055] px-4 py-2 font-mono text-xs font-medium text-accent shadow-sm hover:bg-black/[.08] dark:bg-white/[.075] dark:hover:bg-white/10"
        >
          <Icon name="copy" className="h-3.5 w-3.5" /> POST {endpoint}
        </button>
        <div className="relative mt-7 text-left">
          <pre className="scrollbar-none overflow-x-auto rounded-2xl border border-gray-400 dark:border-gray-600 bg-[#f5f5f7] p-4 pr-12 text-[11px] leading-5 text-black/65 shadow-sm dark:bg-[#1c1c1e] dark:text-white/60">
            <code>{command}</code>
          </pre>
          <button
            type="button"
            onClick={() => onCopy(command, 'cURL copied')}
            className="absolute right-3 top-3 rounded-lg bg-white p-2 text-black/40 shadow-sm hover:text-accent dark:bg-white/10 dark:text-white/45"
            aria-label="Copy cURL command"
          >
            <Icon name="copy" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
