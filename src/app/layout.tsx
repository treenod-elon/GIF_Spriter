import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import InfoButton from '@/components/ui/InfoButton';
import ClientProviders from '@/components/layout/ClientProviders';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VFX Spriter - Sprite Resource Library',
  description:
    'Browse, upload & download game-ready sprite effects for mobile game development. Convert videos and GIFs to sprite sheets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body antialiased">
        <ClientProviders>
          <div className="hero-bg-wrapper">
            <Header />
            <main className="relative z-10 min-h-screen">{children}</main>
          </div>
          <Footer />
          <InfoButton />
        </ClientProviders>
      </body>
    </html>
  );
}
