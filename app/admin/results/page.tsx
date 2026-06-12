'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { supabase, type Candidate, type Vote, type House } from '@/lib/supabase';
import { fetchCandidates } from '@/lib/candidates';
import { fetchHouses } from '@/lib/houses';
import { BarChart3, TrendingUp, Users, Download, AlertCircle, CheckCircle2, Filter } from 'lucide-react';

type VoteStats = {
  candidateId: string;
  candidateName: string;
  position: string;
  voteCount: number;
  percentage: number;
  house: string;
  displayOrder: number;
};

export default function ResultsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [houseFilter, setHouseFilter] = useState<string>('All');

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      const [candidatesRes, housesRes, votesRes] = await Promise.all([
        fetchCandidates(),
        fetchHouses(),
        supabase
          .from('votes')
          .select('id,voter_id,voter_email,candidate_id,position,created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (!active) return;

      if (candidatesRes.data) {
        setCandidates(candidatesRes.data);
      }
      if (housesRes.data) {
        setHouses(housesRes.data);
      }
      if (votesRes.data) {
        setVotes(votesRes.data);
      }
      setLoading(false);
    };

    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map((vote) => vote.voter_id)).size;
  const totalPositions = new Set(candidates.map((candidate) => candidate.position)).size;

  const allStats: VoteStats[] = useMemo(() => {
    return candidates
      .map((candidate) => ({
        candidateId: candidate.id,
        candidateName: candidate.name,
        position: candidate.position,
        voteCount: candidate.vote_count,
        percentage: totalVotes > 0 ? (candidate.vote_count / totalVotes) * 100 : 0,
        house: candidate.house || 'None',
        displayOrder: candidate.display_order ?? 0,
      }))
      .filter((stat) => houseFilter === 'All' || stat.house === houseFilter || stat.house === 'None')
      .sort((a, b) => b.voteCount - a.voteCount || a.position.localeCompare(b.position));
  }, [candidates, totalVotes, houseFilter]);

  const statsByPosition = useMemo(() => {
    const grouped = new Map<string, { stats: VoteStats[]; order: number }>();

    for (const stat of allStats) {
      const current = grouped.get(stat.position) ?? { stats: [], order: stat.displayOrder };
      current.stats.push(stat);
      if (stat.displayOrder < current.order) {
        current.order = stat.displayOrder;
      }
      grouped.set(stat.position, current);
    }

    return Array.from(grouped.entries()).sort(([nameA, dataA], [nameB, dataB]) => {
      if (dataA.order !== dataB.order) return dataA.order - dataB.order;
      return nameA.localeCompare(nameB);
    });
  }, [allStats]);

  const leadingCandidate = allStats[0] ?? null;

  const downloadResults = () => {
    const csv = [
      ['Position', 'Candidate', 'House', 'Votes', 'Percentage'],
      ...allStats.map((stat) => [
        stat.position,
        stat.candidateName,
        stat.house,
        stat.voteCount,
        `${stat.percentage.toFixed(2)}%`,
      ]),
      [],
      ['Summary'],
      ['Total Votes', totalVotes],
      ['Unique Voters', uniqueVoters],
      ['Positions', totalPositions],
      ['House Filter', houseFilter],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    element.setAttribute('download', `voting-results-${houseFilter}-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <AdminLayout activePage="results">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Election Results</h1>
            <p className="mt-1 text-slate-500">Live vote totals from the actual `votes` table</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={houseFilter}
                onChange={(e) => setHouseFilter(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All">All Houses</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.name}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={downloadResults}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-slate-200"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">Total Votes</p>
                <p className="text-3xl font-bold text-slate-900">{totalVotes}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">Unique Voters</p>
                <p className="text-3xl font-bold text-slate-900">{uniqueVoters}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">Positions</p>
                <p className="text-3xl font-bold text-slate-900">{totalPositions}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">Loading results...</p>
            </div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="mb-4 text-lg font-medium text-slate-500">No candidates added yet</p>
            <p className="text-slate-400">Add candidates first in the Manage Candidates section</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-xl font-bold text-slate-900">Overall leaderboard</h3>
              <div className="space-y-4">
                {allStats.slice(0, 10).map((stat, index) => (
                  <div key={stat.candidateId}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            index === 0
                              ? 'bg-yellow-400 text-yellow-900'
                              : index === 1
                                ? 'bg-gray-300 text-gray-700'
                                : index === 2
                                  ? 'bg-orange-400 text-orange-900'
                                  : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{stat.candidateName}</p>
                          <p className="text-xs text-slate-500">{stat.position}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{stat.voteCount}</p>
                        <p className="text-xs text-slate-500">{stat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {leadingCandidate && leadingCandidate.voteCount > 0 && (
              <div className="rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100 p-8 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-200 text-yellow-900">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-yellow-700">
                      Leading candidate
                    </p>
                    <h3 className="mb-2 text-2xl font-bold text-yellow-900">{leadingCandidate.candidateName}</h3>
                    <p className="text-yellow-700">
                      {leadingCandidate.position} · <span className="font-bold">{leadingCandidate.voteCount}</span>{' '}
                      votes (<span className="font-bold">{leadingCandidate.percentage.toFixed(1)}%</span>)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">Results by position</h3>
              </div>
              <div className="space-y-6 p-6">
                {statsByPosition.map(([position, data]) => (
                  <section key={position}>
                    <h4 className="mb-3 text-base font-bold text-slate-900">{position}</h4>
                    <div className="space-y-3">
                      {data.stats.map((stat) => (
                        <div
                          key={stat.candidateId}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{stat.candidateName}</p>
                            <p className="text-xs text-slate-500">{stat.voteCount === 1 ? 'vote' : 'votes'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{stat.voteCount}</p>
                            <p className="text-xs text-slate-500">{stat.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
