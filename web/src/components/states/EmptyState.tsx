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
          className="mt-4 flex w-full items-start gap-2.5 rounded-xl border border-gray-400 bg-black/[.055] px-4 py-2.5 text-left font-mono text-xs font-medium text-accent shadow-sm hover:bg-black/[.08] dark:border-gray-600 dark:bg-white/[.075] dark:hover:bg-white/10"
        >
          <Icon name="copy" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">POST {endpoint}</span>
        </button>
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-400 bg-[#f5f5f7] text-left shadow-sm dark:border-gray-600 dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between border-b border-gray-300 px-4 py-2 dark:border-gray-600">
            <span className="text-[11px] font-medium text-black/45 dark:text-white/40">cURL</span>
            <button
              type="button"
              onClick={() => onCopy(command, 'cURL copied')}
              className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
            >
              <Icon name="copy" className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words p-4 text-[11px] leading-5 text-black/65 dark:text-white/60">
            <code>{command}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
