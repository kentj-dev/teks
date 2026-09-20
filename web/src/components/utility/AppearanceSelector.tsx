import type { Theme } from '../../types';
import { Icon } from '../ui/Icon';

export function AppearanceSelector({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <section className="mt-7">
      <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Appearance</p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-gray-400 dark:border-gray-600 bg-black/[.045] p-1 shadow-sm dark:bg-white/[.06]">
        {(['light', 'dark'] as Theme[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={theme === option}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs ${theme === option ? (option === 'light' ? 'border border-gray-300 dark:border-gray-600 bg-white font-medium text-black shadow-sm' : 'border border-gray-300 dark:border-gray-600 bg-[#303034] font-medium text-white shadow-sm') : 'text-[#242424] hover:text-black dark:text-white/40 dark:hover:text-white'}`}
          >
            <Icon name={option === 'light' ? 'sun' : 'moon'} className="h-3.5 w-3.5" />
            {option === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
    </section>
  );
}
