import type { Theme } from '../../types';
import { Icon } from '../ui/Icon';

export function AppearanceSelector({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-black/45 dark:text-white/40">Appearance</span>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-gray-400 bg-black/[.045] p-1 shadow-sm dark:border-gray-600 dark:bg-white/[.06]">
        {(['light', 'dark'] as Theme[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={theme === option}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${theme === option ? (option === 'light' ? 'border border-gray-300 dark:border-gray-600 bg-white font-medium text-black shadow-sm' : 'border border-gray-300 dark:border-gray-600 bg-[#303034] font-medium text-white shadow-sm') : 'text-[#242424] hover:text-black dark:text-white/40 dark:hover:text-white'}`}
          >
            <Icon name={option === 'light' ? 'sun' : 'moon'} className="h-3.5 w-3.5" />
            {option === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
    </div>
  );
}
