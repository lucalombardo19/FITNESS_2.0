import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'AI Fitness Planner',
  description: 'Piano fitness personalizzato con Claude AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-bg text-white">
        <Nav />
        <main className="md:ml-56 pb-20 md:pb-0 min-h-screen">
          <div className="max-w-3xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
