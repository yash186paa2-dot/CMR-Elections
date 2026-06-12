'use client';

import { useRouter } from 'next/navigation';
import Image from "next/image";
import { useAuth } from '@/components/auth-provider';
import { LogOut, Vote, Settings, BarChart3, Users, Palette } from 'lucide-react';
import Link from 'next/link';

type AdminLayoutProps = {
  children: React.ReactNode;
  activePage?: 'dashboard' | 'candidates' | 'results' | 'positions' | 'houses';
};

export function AdminLayout({ children, activePage }: AdminLayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Access Denied</p>
          <button
            onClick={() => router.replace('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Voting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/logo.png"
              alt="CMR Logo"
              width={120}
              height={120}
              className="w-32 object-contain"
              priority
            />
            <div className="text-center">
              <p className="font-bold text-white text-sm">CMR Admin</p>
              <p className="text-xs text-slate-400">Election Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            href="/admin"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Dashboard"
            active={activePage === 'dashboard'}
          />
          <NavItem
            href="/admin/candidates"
            icon={<Users className="w-5 h-5" />}
            label="Manage Candidates"
            active={activePage === 'candidates'}
          />
          <NavItem
            href="/admin/houses"
            icon={<Palette className="w-5 h-5" />}
            label="House Management"
            active={activePage === 'houses'}
          />
          <NavItem
            href="/admin/positions"
            icon={<Vote className="w-5 h-5" />}
            label="Position Order"
            active={activePage === 'positions'}
          />
          <NavItem
            href="/admin/results"
            icon={<Settings className="w-5 h-5" />}
            label="Results & Stats"
            active={activePage === 'results'}
          />
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="px-3 py-2 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-medium text-white truncate">
              {user?.email?.replace('@cmr.ac.in', '')}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Manage the election process</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:text-white hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
