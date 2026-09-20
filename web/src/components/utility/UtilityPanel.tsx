import type { Provider, Theme } from "../../types";
import { AppearanceSelector } from "./AppearanceSelector";
import { EndpointList } from "./EndpointList";
import { ProviderCard } from "./ProviderCard";
import { QuickLinks } from "./QuickLinks";

export function UtilityPanel({
  connected,
  theme,
  onThemeChange,
  provider,
  onChooseProvider,
}: {
  connected: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  provider: Provider;
  onChooseProvider: () => void;
}) {
  return (
    <aside className="scrollbar-none hidden min-h-0 min-w-0 flex-col overflow-y-auto border-l border-gray-300 bg-[#fafafa] p-5 xl:flex dark:bg-[#19191b]">
      <section>
        <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">
          Teks status
        </p>
        <div className="mt-3 rounded-lg border border-gray-400 bg-white p-3 shadow-sm dark:bg-white/[.035]">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            <span className="text-sm font-medium">
              {connected ? "Running" : "Reconnecting"}
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-black/40 dark:text-white/35">
            {window.location.host}
          </p>
        </div>
      </section>
      <ProviderCard provider={provider} onChoose={onChooseProvider} />
      <AppearanceSelector theme={theme} onChange={onThemeChange} />
      <QuickLinks />
      <EndpointList provider={provider} />
      <footer className="mt-auto pt-4 text-[10px] text-black/30 dark:text-white/25">
        <p>Teks 0.1.0</p>
        <p className="mt-1">Local SMS testing for developers.</p>
      </footer>
    </aside>
  );
}
