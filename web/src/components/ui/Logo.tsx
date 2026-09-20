import { Image } from '@unpic/react';

import logo from '../../../images/teks-logo-main.png';

export function Logo({
  size,
  className = '',
  priority = false,
}: {
  size: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image src={logo} alt="Teks" width={size} height={size} layout="fixed" priority={priority} className={className} />
  );
}
