import { quickLinks } from '../../data/quickLinks';
import { Icon } from '../ui/Icon';

export function QuickLinks() {
  return (
    <nav className="mt-7" aria-label="Teks links">
      <p className="text-[11px] font-medium uppercase text-[#242424] dark:text-white/30">Quick links</p>
      <div className="mt-2 space-y-1">
        {quickLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-lg border border-gray-400 dark:border-gray-600 py-2.5 pe-4 ps-2 shadow-sm hover:bg-black/[.04] dark:hover:bg-white/[.05]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white text-[#242424] dark:bg-white/[.04] dark:text-white/45">
              <Icon name={link.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium">{link.label}</span>
              <span className="mt-0.5 block truncate text-[10px] text-[#242424] dark:text-white/30">{link.hint}</span>
            </span>
            <Icon
              name="external"
              className="h-3.5 w-3.5 text-black/20 group-hover:text-[#242424] dark:text-white/20 dark:group-hover:text-white/45"
            />
          </a>
        ))}
      </div>
    </nav>
  );
}
