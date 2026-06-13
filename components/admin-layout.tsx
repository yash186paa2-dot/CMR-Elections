'use client';

import { useRouter } from 'next/navigation';
import Image from "next/image";
import { useAuth } from '@/components/auth-provider';
import { LogOut, Vote, Settings, BarChart3, Users, Palette } from 'lucide-react';
import Link from 'next/link';
import { AdminAiAssistant } from './admin-ai-assistant';

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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-40">
        {/* Logo Section */}
        <div className="p-8 border-b border-white/5">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-2 rounded-2xl">
                <Image
                  src="/logo.png"
                  alt="CMR Logo"
                  width={140}
                  height={140}
                  className="w-32 object-contain"
                  priority
                />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-black text-white tracking-tight uppercase">Election Admin</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="h-1 w-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Session Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">Management</p>
          <NavItem
            href="/admin"
            icon={<BarChart3 className="w-4 h-4" />}
            label="Dashboard Overview"
            active={activePage === 'dashboard'}
          />
          <NavItem
            href="/admin/candidates"
            icon={<Users className="w-4 h-4" />}
            label="Candidate Registry"
            active={activePage === 'candidates'}
          />
          <NavItem
            href="/admin/houses"
            icon={<Palette className="w-4 h-4" />}
            label="House Ecosystem"
            active={activePage === 'houses'}
          />
          <NavItem
            href="/admin/positions"
            icon={<Vote className="w-4 h-4" />}
            label="Ballot Structure"
            active={activePage === 'positions'}
          />
          <NavItem
            href="/admin/results"
            icon={<Settings className="w-4 h-4" />}
            label="Final Results"
            active={activePage === 'results'}
          />
        </nav>

        {/* User Profile & Logout */}
        <div className="p-6 border-t border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-4 px-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-900/50">
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate uppercase tracking-tight">Admin Principal</p>
              <p className="text-[10px] text-slate-500 truncate font-medium">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all"
          >
            <LogOut className="w-3 h-3" />
            Terminate Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-72 min-h-screen flex flex-col">
        {/* Superior Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="px-10 h-20 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Institutional Hub</span>
                <div className="h-px w-8 bg-slate-200" />
              </div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {activePage === 'dashboard' ? 'Dashboard Overview' : 
                 activePage === 'candidates' ? 'Candidate Registry' :
                 activePage === 'houses' ? 'House Ecosystem' :
                 activePage === 'positions' ? 'Ballot Structure' : 'Election Analytics'}
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live System Status</span>
              </div>
            </div>
          </div>
        </header>

        {/* Principal Workspace */}
        <main className="flex-1 p-10 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
      <AdminAiAssistant />
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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
      {label}
    </Link>
  );
}
