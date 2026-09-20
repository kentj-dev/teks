import { useEffect, useState } from "react";

import { endpointsFor } from "../../data/apiEndpoints";
import type { Provider } from "../../types";

export function EndpointList({ provider }: { provider: Provider }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const endpoints = endpointsFor(provider);
  useEffect(() => {
    setSelectedEndpoint(null);
  }, [provider]);

  return (
    <section className="mt-7" aria-labelledby="api-endpoints-title">
      <p
        id="api-endpoints-title"
        className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30"
      >
        API endpoints
      </p>
      <div className="mt-2 space-y-1">
        {endpoints.map((endpoint) => {
          const id = `${endpoint.method}-${endpoint.path}`;
          const selected = selectedEndpoint === id;
          const methodColor =
            endpoint.method === "GET"
              ? "text-blue-600 dark:text-blue-400"
              : endpoint.method === "POST"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400";
          return (
            <div
              key={id}
              className="overflow-hidden rounded-lg border border-gray-400 bg-white shadow-sm dark:bg-white/[.035]"
            >
              <button
                type="button"
                onClick={() => setSelectedEndpoint(selected ? null : id)}
                aria-expanded={selected}
                className="w-full px-2.5 py-2.5 text-left hover:bg-black/[.025] dark:hover:bg-white/[.035]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-10 shrink-0 font-mono text-[9px] font-semibold ${methodColor}`}
                  >
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
                <div className="border-t px-2.5 pb-2.5 pt-2">
                  <p className="mb-1.5 text-[9px] font-medium text-[#242424] dark:text-white/30">
                    {endpoint.payloadLabel}
                  </p>
                  <pre className="scrollbar-none max-h-52 overflow-auto rounded-md bg-[#171719] p-2.5 text-[9px] leading-4 text-[#d6d6db]">
                    <code>{JSON.stringify(endpoint.payload, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
