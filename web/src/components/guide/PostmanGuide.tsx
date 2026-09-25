import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { examplePath, methodColor, useProviders } from '../../providers';
import type { ApiEndpoint, Provider, ProviderSpec } from '../../types';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';

const statusText: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
};

/** Step-by-step Postman instructions, generated from the provider registry. */
export function PostmanGuide({ initialProvider, onClose }: { initialProvider: Provider; onClose: () => void }) {
  const providers = useProviders();
  const [selected, setSelected] = useState(initialProvider);
  const [open, setOpen] = useState<string | null>(null);
  const spec = providers.find((item) => item.id === selected);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  useEffect(() => {
    const first = spec?.endpoints[0];
    setOpen(first ? endpointKey(first) : null);
  }, [spec]);

  return createPortal(
    <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] dark:bg-black/45" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="postman-guide-title"
        className="glass absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-300 p-5 dark:border-gray-600">
          <div>
            <p className="text-[11px] font-semibold uppercase text-accent">Postman Guide</p>
            <h2 id="postman-guide-title" className="mt-1 text-xl font-semibold">
              Send requests to Teks from Postman
            </h2>
          </div>
          <IconButton icon="close" label="Close Postman guide" onClick={onClose} className="rounded-full shadow-none" />
        </header>

        <div className="scrollbar-none flex-1 overflow-y-auto p-5">
          <div role="tablist" aria-label="Provider" className="flex flex-wrap gap-1.5">
            {providers.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === selected}
                onClick={() => setSelected(item.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${item.id === selected ? 'border-accent bg-accent text-white' : 'border-gray-400 bg-white hover:border-accent dark:border-gray-600 dark:bg-white/[.035]'}`}
              >
                {item.label}
                {item.id === initialProvider && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${item.id === selected ? 'bg-white' : 'bg-emerald-500'}`}
                    title="Active provider"
                  />
                )}
              </button>
            ))}
          </div>

          {spec && (
            <>
              {spec.id !== initialProvider && (
                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[.08] px-3 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Teks is currently using another provider. Choose <strong>{spec.label}</strong> from the Provider card
                  first, or these requests will get <code>409 Conflict</code>.
                </p>
              )}
              <Setup spec={spec} />
              <h3 className="mb-2 mt-7 text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">
                Endpoints
              </h3>
              <div className="space-y-2">
                {spec.endpoints.map((endpoint) => {
                  const key = endpointKey(endpoint);
                  return (
                    <EndpointGuide
                      key={key}
                      spec={spec}
                      endpoint={endpoint}
                      open={open === key}
                      onToggle={() => setOpen(open === key ? null : key)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function Setup({ spec }: { spec: ProviderSpec }) {
  return (
    <section className="mt-5 rounded-2xl border border-gray-400 bg-white/60 p-4 dark:border-gray-600 dark:bg-white/[.035]">
      <h3 className="text-sm font-semibold">Before you start</h3>
      <ol className="mt-3 space-y-3">
        <Step number={1} title="Open a request tab">
          In Postman, click <Kbd>New</Kbd> → <Kbd>HTTP</Kbd>. Keep Teks running at{' '}
          <code className="text-accent">{window.location.origin}</code>.
        </Step>
        <Step number={2} title="Authentication">
          {spec.auth ? (
            <>
              Open the <Kbd>Authorization</Kbd> tab and set <Kbd>Auth Type</Kbd> to <Kbd>Basic Auth</Kbd>. Teks accepts
              any credentials and never stores them.
              <KeyValues
                rows={[
                  ['Username', spec.auth.username],
                  ['Password', spec.auth.password],
                ]}
              />
              <p className="mt-2">
                Tip: set this on a Postman collection once and every request inside inherits it.
              </p>
            </>
          ) : (
            <>Nothing to set up in the Authorization tab. Leave it on “No Auth”.</>
          )}
        </Step>
      </ol>
    </section>
  );
}

function EndpointGuide({
  spec,
  endpoint,
  open,
  onToggle,
}: {
  spec: ProviderSpec;
  endpoint: ApiEndpoint;
  open: boolean;
  onToggle: () => void;
}) {
  const request = endpoint.request;
  const query = request?.encoding === 'query' ? `?${new URLSearchParams(stringFields(request.fields))}` : '';
  const url = `${window.location.origin}${examplePath(spec, endpoint.path)}${query}`;
  const params = spec.pathParams.filter((param) => endpoint.path.includes(`:${param.name}`));
  let step = 1;

  return (
    <article className="overflow-hidden rounded-xl border border-gray-400 bg-white dark:border-gray-600 dark:bg-white/[.035]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-black/[.025] dark:hover:bg-white/[.035]"
      >
        <span className={`mt-0.5 w-12 shrink-0 font-mono text-[10px] font-semibold ${methodColor(endpoint.method)}`}>
          {endpoint.method}
        </span>
        <span className="min-w-0 flex-1">
          <code className="block break-all text-xs font-medium">{endpoint.path}</code>
          <span className="mt-1 block text-[11px] leading-4 text-black/45 dark:text-white/40">
            {endpoint.description}
          </span>
        </span>
        <Icon name="next" className={`mt-0.5 h-4 w-4 shrink-0 text-black/30 transition dark:text-white/30 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <ol className="space-y-4 border-t border-gray-300 px-4 py-4 dark:border-gray-600">
          <Step number={step++} title="Method and URL">
            Choose <Kbd>{endpoint.method}</Kbd> and paste this URL:
            <CopyBlock value={url} />
            {params.length > 0 && (
              <div className="mt-2 space-y-1">
                {params.map((param) => (
                  <p key={param.name}>
                    <code className="text-accent">{param.example}</code> is an example{' '}
                    <code>:{param.name}</code>. {param.note}
                  </p>
                ))}
              </div>
            )}
            {request?.encoding === 'query' && (
              <p className="mt-2">
                The query parameters are already in the URL. Postman lists them under <Kbd>Params</Kbd>.
              </p>
            )}
          </Step>

          {spec.auth && (
            <Step number={step++} title="Authorization">
              <Kbd>Basic Auth</Kbd> with the credentials from “Before you start”.
            </Step>
          )}

          {request?.encoding === 'json' && (
            <Step number={step++} title="Body">
              Open <Kbd>Body</Kbd>, choose <Kbd>raw</Kbd>, set the type to <Kbd>JSON</Kbd>, and paste:
              <CopyBlock value={JSON.stringify(request.fields, null, 2)} />
            </Step>
          )}

          {request?.encoding === 'form' && (
            <Step number={step++} title="Body">
              Open <Kbd>Body</Kbd> and choose <Kbd>x-www-form-urlencoded</Kbd> (not raw JSON). Add these rows, or
              paste them into <Kbd>Bulk Edit</Kbd>:
              <KeyValues rows={Object.entries(stringFields(request.fields))} />
              <CopyButton
                value={Object.entries(stringFields(request.fields))
                  .map(([key, value]) => `${key}:${value}`)
                  .join('\n')}
                label="Copy for Bulk Edit"
              />
            </Step>
          )}

          <Step number={step++} title="Send">
            Click <Kbd>Send</Kbd>. A successful request returns{' '}
            <strong>
              {endpoint.status} {statusText[endpoint.status] ?? ''}
            </strong>
            {endpoint.response === null || endpoint.response === undefined ? ' with an empty body.' : ':'}
            {endpoint.response !== null && endpoint.response !== undefined && (
              <pre className="scrollbar-none mt-2 max-h-56 overflow-auto rounded-lg bg-[#171719] p-3 text-[10px] leading-4 text-[#d6d6db]">
                <code>{JSON.stringify(endpoint.response, null, 2)}</code>
              </pre>
            )}
          </Step>
        </ol>
      )}
    </article>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
        {number}
      </span>
      <div className="min-w-0 flex-1 text-xs leading-5 text-black/60 dark:text-white/55">
        <p className="font-medium text-black dark:text-white">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-gray-300 bg-black/[.04] px-1 py-px text-[11px] font-medium text-black/75 dark:border-gray-600 dark:bg-white/[.06] dark:text-white/75">
      {children}
    </span>
  );
}

function KeyValues({ rows }: { rows: [string, string][] }) {
  return (
    <div className="mt-2 divide-y divide-gray-300 overflow-hidden rounded-lg border border-gray-300 dark:divide-gray-600 dark:border-gray-600">
      {rows.map(([key, value]) => (
        <div key={key} className="group flex items-center gap-3 px-3 py-1.5 font-mono text-[11px]">
          <span className="w-28 shrink-0 truncate text-black/50 dark:text-white/45">{key}</span>
          <span className="min-w-0 flex-1 break-all text-black dark:text-white">{value}</span>
          <CopyIcon value={value} label={key} />
        </div>
      ))}
    </div>
  );
}

function CopyBlock({ value }: { value: string }) {
  return (
    <div className="relative mt-2">
      <pre className="whitespace-pre-wrap break-all rounded-lg bg-[#171719] p-3 pr-10 text-[10px] leading-4 text-[#d6d6db]">
        <code>{value}</code>
      </pre>
      <span className="absolute right-2 top-2">
        <CopyIcon value={value} label="Value" light />
      </span>
    </div>
  );
}

function CopyIcon({ value, label, light = false }: { value: string; label: string; light?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => copy(value, `${label} copied`)}
      className={`rounded p-1 hover:text-accent ${light ? 'text-white/50' : 'text-black/30 dark:text-white/30'}`}
      aria-label={`Copy ${label}`}
    >
      <Icon name="copy" className="h-3.5 w-3.5" />
    </button>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => copy(value, 'Copied for Bulk Edit')}
      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
    >
      <Icon name="copy" className="h-3 w-3" />
      {label}
    </button>
  );
}

async function copy(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error('Could not copy');
  }
}

function endpointKey(endpoint: ApiEndpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

function stringFields(fields: unknown): Record<string, string> {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  return Object.fromEntries(
    Object.entries(fields as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]),
  );
}
