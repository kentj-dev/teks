import type { ButtonHTMLAttributes } from "react";

import { Icon, type IconName } from "./Icon";

type Tone = "neutral" | "blue" | "red";

const toneClasses: Record<Tone, string> = {
  neutral:
    "border-gray-400 bg-black/5 text-black/50 hover:bg-black/10 dark:bg-white/10 dark:text-white/50",
  blue: "border-blue-500 bg-blue-50 text-blue-500 dark:bg-blue-500/10",
  red: "border-red-500 bg-red-50 text-red-500 dark:bg-red-500/10",
};

export function IconButton({
  icon,
  label,
  tone = "neutral",
  iconClassName = "h-4 w-4",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  tone?: Tone;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={props.title ?? label}
      className={`rounded-lg border p-2 shadow-sm ${toneClasses[tone]} ${className}`}
      {...props}
    >
      <Icon name={icon} className={iconClassName} />
    </button>
  );
}
