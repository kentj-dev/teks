import type { FontSize, MessageSortOrder, Theme, ViewMode } from '../../types';
import { MessageSortSelect } from '../conversation/MessageSortSelect';
import { ViewModeSwitch } from '../conversation/ViewModeSwitch';
import { AppearanceSelector } from './AppearanceSelector';
import { FontSizeSelect } from './FontSizeSelect';

export function SettingsSection({
  fontSize,
  sortOrder,
  theme,
  viewMode,
  onThemeChange,
  onFontSizeChange,
  onSortOrderChange,
  onViewModeChange,
}: {
  fontSize: FontSize;
  sortOrder: MessageSortOrder;
  theme: Theme;
  viewMode: ViewMode;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (fontSize: FontSize) => void;
  onSortOrderChange: (sortOrder: MessageSortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
}) {
  return (
    <section className="mt-7" aria-labelledby="settings-title">
      <p id="settings-title" className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">
        Settings
      </p>
      <div className="mt-3 space-y-2 rounded-lg border border-gray-400 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-white/[.035]">
        <AppearanceSelector theme={theme} onChange={onThemeChange} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-black/45 dark:text-white/40">Font size</span>
          <FontSizeSelect size={fontSize} onChange={onFontSizeChange} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-black/45 dark:text-white/40">Sort order</span>
          <MessageSortSelect order={sortOrder} onChange={onSortOrderChange} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-black/45 dark:text-white/40">Message view</span>
          <ViewModeSwitch mode={viewMode} onChange={onViewModeChange} />
        </div>
      </div>
    </section>
  );
}
