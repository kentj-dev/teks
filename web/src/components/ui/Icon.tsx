import {
  ALargeSmall,
  ArrowUpDown,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Coffee,
  Copy,
  ExternalLink,
  Globe2,
  Info,
  Moon,
  Search,
  Smartphone,
  Star,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "search"
  | "copy"
  | "info"
  | "trash"
  | "back"
  | "next"
  | "close"
  | "check"
  | "sun"
  | "moon"
  | "globe"
  | "book"
  | "star"
  | "coffee"
  | "external"
  | "phone"
  | "developer"
  | "font-size"
  | "sort";

const icons: Record<IconName, LucideIcon> = {
  search: Search,
  copy: Copy,
  info: Info,
  trash: Trash2,
  back: ChevronLeft,
  next: ChevronRight,
  close: X,
  check: Check,
  sun: Sun,
  moon: Moon,
  globe: Globe2,
  book: BookOpen,
  star: Star,
  coffee: Coffee,
  external: ExternalLink,
  phone: Smartphone,
  developer: Code2,
  "font-size": ALargeSmall,
  sort: ArrowUpDown,
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const Component = icons[name];
  return (
    <Component className={className} strokeWidth={1.8} aria-hidden="true" />
  );
}
