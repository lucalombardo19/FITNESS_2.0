'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const links = [
  { href: '/',             label: 'Home',         icon: '🏠' },
  { href: '/profilo',      label: 'Profilo',      icon: '👤' },
  { href: '/piano',        label: 'Piano AI',     icon: '⚡' },
  { href: '/cerca',        label: 'Cerca',        icon: '🔍' },
  { href: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
];

export default function Nav() {
  const path = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-surface border-r border-border p-4 fixed top-0 left-0">
        <div className="mb-6 px-2">
          <h1 className="text-primary font-extrabold text-xl">💪 AI Fitness</h1>
          <p className="text-muted text-xs mt-0.5">Powered by Claude</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                path === href ? 'bg-primary/20 text-primary' : 'text-sub hover:bg-surfaceB hover:text-white'
              }`}
            >
              <span>{icon}</span><span>{label}</span>
            </Link>
          ))}
        </nav>

        {session?.user && (
          <div className="mt-auto pt-4 border-t border-border">
            <p className="text-sub text-xs mb-2 px-2 truncate">👤 {session.user.name}</p>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-left px-3 py-2 rounded-xl text-sm text-muted hover:text-danger hover:bg-danger/10 transition-all"
            >
              🚪 Esci
            </button>
          </div>
        )}
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex z-50">
        {links.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all ${
              path === href ? 'text-primary' : 'text-muted'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
