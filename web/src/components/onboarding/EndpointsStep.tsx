import { useProviderSpec } from '../../providers';
import type { Provider } from '../../types';
import { Icon } from '../ui/Icon';

export function EndpointsStep({
  provider,
  onBack,
  onComplete,
}: {
  provider: Provider;
  onBack: () => void;
  onComplete: () => void;
}) {
  const spec = useProviderSpec(provider);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{spec?.label ?? provider} endpoints</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-black/50 dark:text-white/45">
          Your server is ready. Use these endpoints at <code className="text-accent">{window.location.origin}</code>.
        </p>
      </div>
      <div className="mt-8 max-h-[38vh] space-y-2 overflow-y-auto autohide-scrollbar rounded-2xl border border-gray-400 dark:border-gray-600 bg-white p-2 shadow-sm dark:bg-[#19191b]">
        {(spec?.endpoints ?? []).map((endpoint) => (
          <div
            key={`${endpoint.method}-${endpoint.path}`}
            className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-black/5 hover:bg-black/[.02] dark:hover:border-white/5 dark:hover:bg-white/[.025]"
          >
            <span
              className={`mt-0.5 w-11 shrink-0 font-mono text-[10px] font-semibold ${endpoint.method === 'GET' ? 'text-blue-600 dark:text-blue-400' : endpoint.method === 'POST' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {endpoint.method}
            </span>
            <span className="min-w-0 flex-1">
              <code className="block break-all text-xs font-medium">{endpoint.path}</code>
              <span className="mt-1 block text-[10px] leading-4 text-black/40 dark:text-white/35">
                {endpoint.description}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-gray-400 dark:border-gray-600 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-black/[.025] dark:bg-[#19191b] dark:hover:bg-white/[.04]"
        >
          <Icon name="back" className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-accent/20 hover:brightness-105"
        >
          Get started <Icon name="next" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
