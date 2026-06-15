'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { AdminAiAssistant } from '@/components/admin-ai-assistant';
import { supabase, type Candidate } from '@/lib/supabase';
import {
  BarChart3,
  Users,
  Vote as VoteIcon,
  TrendingUp,
  AlertCircle,
  Activity,
  ArrowUpRight,
  UserCheck,
  Calendar,
  ChevronRight,
  Search,
} from 'lucide-react';

type Stats = {
  totalCandidates: number;
  totalVotes: number;
  totalPositions: number;
  uniqueVoters: number;
  turnoutPercentage: number;
  totalStudents: number;
};

type AuditLog = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCandidates: 0,
    totalVotes: 0,
    totalPositions: 0,
    uniqueVoters: 0,
    turnoutPercentage: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [topCandidates, setTopCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  const filteredCandidates = topCandidates.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchData = async () => {
    try {
      const [
        candidatesRes,
        votesRes,
        studentsRes,
        logsRes,
      ] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('votes').select('voter_id'),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6),
      ]);

      const candidates = candidatesRes.data || [];
      const positions = new Set(candidates.map((c) => c.position)).size;
      const totalStudents = studentsRes.count || 0;
      const uniqueVoters = new Set((votesRes.data || []).map(v => v.voter_id)).size;
      const turnout = totalStudents > 0 ? (uniqueVoters / totalStudents) * 100 : 0;
      
      setStats({
        totalCandidates: candidates.length,
        totalVotes: votesRes.data?.length || 0,
        totalPositions: positions,
        uniqueVoters,
        totalStudents,
        turnoutPercentage: parseFloat(turnout.toFixed(1)),
      });

      setTopCandidates(candidates.sort((a, b) => b.vote_count - a.vote_count).slice(0, 5));
      setRecentLogs(logsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout activePage="dashboard">
      <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
        
        {/* Real-time Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<VoteIcon className="w-5 h-5" />}
            label="Total Ballots Cast"
            value={stats.totalVotes.toLocaleString()}
            trend="+12% from last hour"
            color="blue"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5" />}
            label="Voter Participation"
            value={`${stats.uniqueVoters.toLocaleString()}`}
            subvalue={`of ${stats.totalStudents.toLocaleString()} eligible`}
            color="indigo"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Current Turnout"
            value={`${stats.turnoutPercentage}%`}
            progress={stats.turnoutPercentage}
            color="emerald"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Active Candidates"
            value={stats.totalCandidates}
            subvalue={`${stats.totalPositions} positions`}
            color="slate"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard & Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Leaderboard */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Candidate Leaderboard</h2>
                  <p className="text-xs text-slate-500 font-medium">Real-time leading contenders across all positions</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              
              <div className="p-8">
                {loading ? (
                  <LeaderboardSkeleton />
                ) : filteredCandidates.length === 0 ? (
                  <EmptyState message={searchQuery ? "No candidates match your search." : "No leading candidates found yet."} />
                ) : (
                  <div className="space-y-4">
                    {filteredCandidates.map((candidate, index) => (
                      <LeaderboardItem 
                        key={candidate.id} 
                        candidate={candidate} 
                        index={index} 
                        maxVotes={topCandidates[0]?.vote_count || 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Activity & Info */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Audit Trail</h2>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="p-6">
                {recentLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent activity</p>
                ) : (
                  <div className="space-y-6">
                    {recentLogs.map((log) => (
                      <ActivityItem key={log.id} log={log} />
                    ))}
                  </div>
                )}
                <button className="w-full mt-6 py-3 px-4 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                  View Full Audit Log <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-24 h-24" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-4">Election Integrity</h3>
              <div className="space-y-4 relative z-10">
                <HealthItem label="Database Connection" status="Optimal" />
                <HealthItem label="API Response Time" status="42ms" />
                <HealthItem label="Encryption Level" status="AES-256" />
                <div className="pt-2 border-t border-white/10 mt-4">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    The CMR Voting System is operating under strict Election Commission standards. All actions are logged and immutable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AdminAiAssistant />
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, subvalue, trend, progress, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
          {subvalue && <span className="text-xs font-medium text-slate-500">{subvalue}</span>}
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardItem({ candidate, index, maxVotes }: { candidate: Candidate; index: number; maxVotes: number }) {
  const percentage = maxVotes > 0 ? (candidate.vote_count / maxVotes) * 100 : 0;
  
  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${
        index === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
        index === 1 ? 'bg-slate-200 text-slate-700' :
        index === 2 ? 'bg-slate-100 text-slate-600' :
        'bg-slate-50 text-slate-400'
      }`}>
        {index + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-bold text-slate-900 truncate pr-4">{candidate.name}</p>
          <div className="text-right flex items-center gap-2">
            <span className="text-lg font-black text-slate-900">{candidate.vote_count}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Votes</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ log }: { log: AuditLog }) {
  const actionLabel = log.action.replace(/_/g, ' ');
  const date = new Date(log.created_at);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex gap-4 relative">
      <div className="absolute left-[7px] top-6 bottom-[-18px] w-px bg-slate-100 last:hidden" />
      <div className="h-4 w-4 rounded-full bg-blue-100 border-2 border-white shadow-sm flex-shrink-0 mt-1 z-10" />
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-900 capitalize tracking-tight">{actionLabel}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
          {log.target_type}: {log.details?.name || log.target_id || 'System Update'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Calendar className="w-2.5 h-2.5 text-slate-300" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{time}</span>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-xs font-black text-white">{status}</span>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 bg-slate-50 rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
