'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function InfoButton() {
  const pathname = usePathname();

  if (pathname === '/guide') return null;

  return (
    <Link
      href="/guide"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-text-inverse shadow-glow transition-all hover:scale-110 hover:bg-accent-primary-hover hover:shadow-[0_0_32px_rgba(110,86,255,0.3)]"
      aria-label="이용 안내"
    >
      <Info className="h-6 w-6" />
    </Link>
  );
}
