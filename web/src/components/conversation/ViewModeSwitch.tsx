import type { ViewMode } from '../../types';
import { Icon } from '../ui/Icon';

export function ViewModeSwitch({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-gray-400 dark:border-gray-600 bg-black/[.045] p-0.5 shadow-sm dark:bg-white/[.06]"
      aria-label="Message view"
    >
      {(['phone', 'developer'] as ViewMode[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={mode === option}
          title={`${option === 'phone' ? 'Phone' : 'Developer'} view`}
          className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] ${mode === option ? 'border border-gray-300 dark:border-gray-600 bg-white font-medium text-black shadow-sm dark:bg-[#303034] dark:text-white' : 'text-black/40 dark:text-white/40'}`}
        >
          <Icon name={option} className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{option === 'phone' ? 'Phone' : 'Developer'}</span>
        </button>
      ))}
    </div>
  );
}
