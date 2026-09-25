import type { IconName } from '../components/ui/Icon';

export type QuickLink = {
  label: string;
  hint: string;
  href: string;
  icon: IconName;
};

export const quickLinks: QuickLink[] = [
  {
    label: 'Teks website',
    hint: 'Product home',
    href: 'https://apps.hamiken.com/apps/teks',
    icon: 'globe',
  },
  {
    label: 'Quick guide',
    hint: 'Setup and API usage',
    href: 'https://teks.dev/guide',
    icon: 'book',
  },
  {
    label: 'Rate Teks',
    hint: 'Leave a GitHub star',
    href: 'https://github.com/kentj-dev/teks',
    icon: 'star',
  },
  {
    label: 'Buy me a coffee',
    hint: 'Support the project',
    href: 'https://buymeacoffee.com/kentjdev',
    icon: 'coffee',
  },
];
