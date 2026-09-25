import { useEffect, useState } from 'react';

import { methodColor, requestLabels, useProviderSpec } from '../../providers';
import { PostmanGuide } from '../guide/PostmanGuide';
import { Icon } from '../ui/Icon';
import type { Provider } from '../../types';

export function EndpointList({ provider }: { provider: Provider }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const endpoints = useProviderSpec(provider)?.endpoints ?? [];
  useEffect(() => {
    setSelectedEndpoint(null);
  }, [provider]);

  return (
    <section className="mt-7" aria-labelledby="api-endpoints-title">
      <div className="flex items-center justify-between gap-2">
        <p id="api-endpoints-title" className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">
          API endpoints
        </p>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          <Icon name="book" className="h-3.5 w-3.5" />
          Postman Guide
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {endpoints.map((endpoint) => {
          const id = `${endpoint.method}-${endpoint.path}`;
          const selected = selectedEndpoint === id;
          return (
            <div
              key={id}
              className="overflow-hidden rounded-lg border border-gray-400 dark:border-gray-600 bg-white shadow-sm dark:bg-white/[.035]"
            >
              <button
                type="button"
                onClick={() => setSelectedEndpoint(selected ? null : id)}
                aria-expanded={selected}
                className="w-full px-2.5 py-2.5 text-left hover:bg-black/[.025] dark:hover:bg-white/[.035]"
              >
                <span className="flex items-center gap-2">
                  <span className={`w-10 shrink-0 font-mono text-[9px] font-semibold ${methodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                  <code className="min-w-0 truncate text-[10px] font-medium text-black/65 dark:text-white/65">
                    {endpoint.path}
                  </code>
                </span>
                <span className="mt-1 block pl-12 text-[9px] leading-4 text-[#242424] dark:text-white/30">
                  {endpoint.description}
                </span>
              </button>
              {selected && (
                <div className="space-y-2 border-t px-2.5 pb-2.5 pt-2">
                  {endpoint.request && (
                    <Sample label={requestLabels[endpoint.request.encoding]} value={endpoint.request.fields} />
                  )}
                  {endpoint.response !== null && endpoint.response !== undefined && (
                    <Sample label="Sample response" value={endpoint.response} />
                  )}
                  {!endpoint.request && (endpoint.response === null || endpoint.response === undefined) && (
                    <p className="text-[9px] text-[#242424] dark:text-white/30">Responds {endpoint.status} with no body.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showGuide && <PostmanGuide initialProvider={provider} onClose={() => setShowGuide(false)} />}
    </section>
  );
}

function Sample({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1.5 text-[9px] font-medium text-[#242424] dark:text-white/30">{label}</p>
      <pre className="scrollbar-none max-h-52 overflow-auto rounded-md bg-[#171719] p-2.5 text-[9px] leading-4 text-[#d6d6db]">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </div>
  );
}
