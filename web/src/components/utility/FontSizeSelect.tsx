import type { FontSize } from '../../types';
import { Icon } from '../ui/Icon';

const labels: Record<FontSize, string> = {
  compact: 'Compact',
  normal: 'Normal',
  zoomed: 'Zoomed',
};

export function FontSizeSelect({ size, onChange }: { size: FontSize; onChange: (size: FontSize) => void }) {
  return (
    <label
      className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-400 bg-black/[.045] px-2 text-[11px] text-black/55 shadow-sm ring-accent/20 hover:bg-black/[.07] focus-within:ring-2 dark:border-gray-600 dark:bg-white/[.06] dark:text-white/55 dark:hover:bg-white/10"
      title={`Interface font size: ${labels[size]}`}
    >
      <Icon name="font-size" className="h-3.5 w-3.5 mt-0.5" />
      <span>{labels[size]}</span>
      <select
        value={size}
        onChange={(event) => onChange(event.target.value as FontSize)}
        aria-label="Interface font size"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="compact">Compact</option>
        <option value="normal">Normal</option>
        <option value="zoomed">Zoomed</option>
      </select>
    </label>
  );
}
