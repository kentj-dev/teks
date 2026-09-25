import type { FontSize, MessageSortOrder, Provider, Theme, ViewMode } from '../../types';
import { EndpointList } from './EndpointList';
import { ProviderCard } from './ProviderCard';
import { QuickLinks } from './QuickLinks';
import { SettingsSection } from './SettingsSection';

export function UtilityPanel({
  connected,
  theme,
  fontSize,
  sortOrder,
  viewMode,
  onThemeChange,
  onFontSizeChange,
  onSortOrderChange,
  onViewModeChange,
  provider,
  onChooseProvider,
}: {
  connected: boolean;
  theme: Theme;
  fontSize: FontSize;
  sortOrder: MessageSortOrder;
  viewMode: ViewMode;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (fontSize: FontSize) => void;
  onSortOrderChange: (sortOrder: MessageSortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  provider: Provider;
  onChooseProvider: () => void;
}) {
  return (
    <aside className="scrollbar-none hidden min-h-0 min-w-0 flex-col overflow-y-auto border-l border-gray-300 dark:border-gray-600 bg-[#fafafa] p-5 xl:flex dark:bg-[#19191b]">
      <section>
        <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Teks status</p>
        <div className="mt-3 rounded-lg border border-gray-400 dark:border-gray-600 bg-white p-3 shadow-sm dark:bg-white/[.035]">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-medium">{connected ? 'Running' : 'Reconnecting'}</span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-black/40 dark:text-white/35">{window.location.host}</p>
        </div>
      </section>
      <ProviderCard provider={provider} onChoose={onChooseProvider} />
      <EndpointList provider={provider} />
      <SettingsSection
        fontSize={fontSize}
        sortOrder={sortOrder}
        theme={theme}
        viewMode={viewMode}
        onThemeChange={onThemeChange}
        onFontSizeChange={onFontSizeChange}
        onSortOrderChange={onSortOrderChange}
        onViewModeChange={onViewModeChange}
      />
      <QuickLinks />
      <footer className="mt-auto pt-4 text-[10px] text-black/30 dark:text-white/25">
        <p>Teks {__TEKS_VERSION__}</p>
        <p className="mt-1">Local SMS testing for developers.</p>
      </footer>
    </aside>
  );
}
