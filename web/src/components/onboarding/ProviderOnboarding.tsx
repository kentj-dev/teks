import { useState } from 'react';

import type { Provider, Theme } from '../../types';
import { IconButton } from '../ui/IconButton';
import { Logo } from '../ui/Logo';
import { ThemeButton } from '../ui/ThemeButton';
import { AboutStep } from './AboutStep';
import { EndpointsStep } from './EndpointsStep';
import { ProviderStep } from './ProviderStep';

export function ProviderOnboarding({
  provider,
  theme,
  onThemeChange,
  onSelect,
  onComplete,
  onClose,
}: {
  provider: Provider;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSelect: (provider: Provider) => Promise<boolean>;
  onComplete: () => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  async function selectProvider(nextProvider: Provider) {
    const selected = await onSelect(nextProvider);
    if (selected) setStep(3);
    return selected;
  }

  return (
    <main className="h-dvh overflow-y-auto bg-[#f2f2f2] px-5 py-8 dark:bg-[#0d0d0f] sm:px-8">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} priority className="shadow-sm" />
            <div>
              <p className="text-sm font-semibold">Teks</p>
              <p className="text-[11px] text-black/40 dark:text-white/35">Local SMS testing</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeButton theme={theme} onChange={onThemeChange} />
            {onClose && (
              <IconButton
                icon="close"
                label="Close provider setup"
                onClick={onClose}
                className="rounded-full border-transparent bg-transparent shadow-none"
              />
            )}
          </div>
        </header>
        {/* <SetupProgress step={step} /> */}
        <section className="my-auto py-10 sm:py-14">
          {step === 1 && <AboutStep onContinue={() => setStep(2)} />}
          {step === 2 && <ProviderStep provider={provider} onSelect={selectProvider} onBack={() => setStep(1)} />}
          {step === 3 && <EndpointsStep provider={provider} onBack={() => setStep(2)} onComplete={onComplete} />}
        </section>
        <p className="pb-2 text-center text-[11px] text-black/35 dark:text-white/30">
          You can revisit setup later from Teks Status.
        </p>
      </div>
    </main>
  );
}
