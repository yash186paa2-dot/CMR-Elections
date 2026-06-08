'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { TimerSettings } from '@/components/timer-settings';
import { supabase, type Candidate } from '@/lib/supabase';
import {
  BarChart3,
  Users,
  Vote as VoteIcon,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

type Stats = {
  totalCandidates: number;
  totalVotes: number;
  totalPositions: number;
  uniqueVoters: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCandidates: 0,
    totalVotes: 0,
    totalPositions: 0,
    uniqueVoters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [topCandidates, setTopCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      const [
        candidatesRes,
        votesRes,
        votersRes,
      ] = await Promise.all([
        supabase.from('candidates').select('*', { count: 'exact' }),
        supabase.from('votes').select('*', { count: 'exact' }),
        supabase
          .from('votes')
          .select('voter_id')
          .then((res) => ({
            ...res,
            count: res.data ? new Set(res.data.map((v: any) => v.voter_id)).size : 0,
          })),
      ]);

      const candidates = candidatesRes.data || [];
      const positions = new Set(candidates.map((c) => c.position)).size;
      
      setStats({
        totalCandidates: candidates.length,
        totalVotes: votesRes.count || 0,
        totalPositions: positions,
        uniqueVoters: votersRes.count || 0,
      });

      // Get top candidates
      const sorted = candidates.sort((a, b) => b.vote_count - a.vote_count);
      setTopCandidates(sorted.slice(0, 5));

      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout activePage="dashboard">
      <div className="space-y-8">
        {/* Timer Settings */}
        <TimerSettings onSave={() => {
          // Refresh stats when timer settings are saved
          const fetchStats = async () => {
            setLoading(true);
            
            const [
              candidatesRes,
              votesRes,
              votersRes,
            ] = await Promise.all([
              supabase.from('candidates').select('*', { count: 'exact' }),
              supabase.from('votes').select('*', { count: 'exact' }),
              supabase
                .from('votes')
                .select('voter_id')
                .then((res) => ({
                  ...res,
                  count: res.data ? new Set(res.data.map((v: any) => v.voter_id)).size : 0,
                })),
            ]);

            const candidates = candidatesRes.data || [];
            const positions = new Set(candidates.map((c) => c.position)).size;
            
            setStats({
              totalCandidates: candidates.length,
              totalVotes: votesRes.count || 0,
              totalPositions: positions,
              uniqueVoters: votersRes.count || 0,
            });

            const sorted = candidates.sort((a, b) => b.vote_count - a.vote_count);
            setTopCandidates(sorted.slice(0, 5));

            setLoading(false);
          };
          fetchStats();
        }} />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<VoteIcon className="w-6 h-6" />}
            label="Total Votes Cast"
            value={stats.totalVotes}
            subtext="registered votes"
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Unique Voters"
            value={stats.uniqueVoters}
            subtext="students voted"
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Candidates"
            value={stats.totalCandidates}
            subtext="running for office"
            color="purple"
          />
          <StatCard
            icon={<BarChart3 className="w-6 h-6" />}
            label="Positions"
            value={stats.totalPositions}
            subtext="to be filled"
            color="orange"
          />
        </div>

        {/* Top Candidates */}
        <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Leading Candidates</h2>
              <p className="text-sm text-slate-500 mt-1">Top 5 candidates by vote count</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading data...</p>
              </div>
            </div>
          ) : topCandidates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">No candidates added yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {topCandidates.map((candidate, index) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{candidate.name}</p>
                    <p className="text-sm text-slate-500">{candidate.position}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{candidate.vote_count}</p>
                      <p className="text-xs text-slate-500">
                        {candidate.vote_count === 1 ? 'vote' : 'votes'}
                      </p>
                    </div>
                    {/* Vote bar */}
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                        style={{
                          width: `${
                            topCandidates[0]?.vote_count
                              ? (candidate.vote_count / topCandidates[0].vote_count) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">System Information</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Each student can vote once per position</li>
              <li>• All votes are securely stored and encrypted</li>
              <li>• Only @cmr.ac.in accounts are permitted</li>
              <li>• Stats update every 5 seconds</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
    orange: 'from-orange-500 to-orange-600 text-orange-600 bg-orange-50',
  };

  return (
    <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-3 rounded-xl ${colors[color]} mb-4 text-white`}>
        <div className={`text-${color}-600`}>{icon}</div>
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      <p className="text-xs text-slate-500">{subtext}</p>
    </div>
  );
}
