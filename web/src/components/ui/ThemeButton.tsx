import type { Theme } from "../../types";
import { Icon } from "./Icon";

export function ThemeButton({
  theme,
  onChange,
  className = "",
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  className?: string;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={`${className} rounded-full p-2 text-[#242424] hover:bg-black/5 hover:text-black/70 dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white/70`}
      aria-label={`Switch to ${next} mode`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
    </button>
  );
}
