import { Icon } from "./Icon";

export function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#252527] px-4 py-2 text-sm font-medium text-white shadow-xl">
      <Icon name="check" className="h-4 w-4 text-emerald-400" />
      {text}
    </div>
  );
}
