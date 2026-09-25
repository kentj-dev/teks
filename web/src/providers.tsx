import { createContext, useContext } from 'react';

import { isIconName, type IconName } from './components/ui/Icon';
import type { ApiEndpoint, Message, Provider, ProviderSpec, RequestEncoding } from './types';

// Provider metadata comes from the backend registry (src/providers/registry.rs) via
// GET /api/_teks/providers. Nothing provider-specific should be hard-coded in the frontend.
export const ProvidersContext = createContext<ProviderSpec[]>([]);

export function useProviders() {
  return useContext(ProvidersContext);
}

export function useProviderSpec(provider: Provider) {
  return useProviders().find((spec) => spec.id === provider);
}

export function providerLabel(providers: ProviderSpec[], provider: Provider) {
  return providers.find((spec) => spec.id === provider)?.label ?? provider;
}

export function providerIcon(spec: ProviderSpec | undefined): IconName {
  return spec && isIconName(spec.icon) ? spec.icon : 'developer';
}

export function providerDetailFields(providers: ProviderSpec[], message: Message): [string, string][] {
  const spec = providers.find((item) => item.id === message.provider);
  return (spec?.detailFields ?? []).flatMap(({ label, pointer, fallback }) => {
    const value = resolvePointer(message, pointer);
    if (value !== undefined && value !== null && value !== '') return [[label, String(value)]];
    return fallback === null ? [] : [[label, fallback]];
  });
}

export const requestLabels: Record<RequestEncoding, string> = {
  json: 'Request body',
  form: 'Form parameters',
  query: 'Query parameters',
};

export function methodColor(method: ApiEndpoint['method']) {
  if (method === 'GET') return 'text-blue-600 dark:text-blue-400';
  if (method === 'POST') return 'text-emerald-600 dark:text-emerald-400';
  if (method === 'DELETE') return 'text-red-600 dark:text-red-400';
  return 'text-amber-600 dark:text-amber-400';
}

/** Replaces `:name` path segments with the provider's example values. */
export function examplePath(spec: ProviderSpec, path: string) {
  return path.replace(/:([A-Za-z_]+)/g, (match, name: string) => {
    return spec.pathParams.find((param) => param.name === name)?.example ?? match;
  });
}

function resolvePointer(root: unknown, pointer: string): unknown {
  return pointer
    .split('/')
    .slice(1)
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      root,
    );
}
