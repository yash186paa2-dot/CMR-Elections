'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { supabase, type Candidate, type Vote } from '@/lib/supabase';
import { CANDIDATE_HOUSE_OPTIONS, type CandidateHouse } from '@/lib/houses';
import { fetchCandidatesWithHouseSupport } from '@/lib/candidates';
import {
  BarChart3,
  TrendingUp,
  Users,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

type VoteStats = {
  candidateId: string;
  candidateName: string;
  house: CandidateHouse;
  position: string;
  voteCount: number;
  percentage: number;
};

export default function ResultsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState<CandidateHouse | null>(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      const [candidatesRes, votesRes] = await Promise.all([
        fetchCandidatesWithHouseSupport(),
        supabase
          .from('votes')
          .select('id,voter_id,voter_email,candidate_id,position,house,created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (!active) return;

      if (candidatesRes.error) {
        setLoading(false);
        return;
      }

      if (candidatesRes.data) {
        setCandidates(candidatesRes.data);
        setSelectedHouse((current) => {
          if (current || candidatesRes.data.length === 0) return current;
          const firstHouse = CANDIDATE_HOUSE_OPTIONS.find((house) =>
            candidatesRes.data.some((candidate) => candidate.house === house.value)
          );
          return firstHouse?.value ?? null;
        });
      }
      if (votesRes.data) setVotes(votesRes.data);
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const currentHouse = selectedHouse || CANDIDATE_HOUSE_OPTIONS.find((house) =>
    candidates.some((candidate) => candidate.house === house.value)
  )?.value;

  const houseCandidates = candidates.filter((candidate) => candidate.house === currentHouse);
  const totalHouseVotes = houseCandidates.reduce((sum, candidate) => sum + candidate.vote_count, 0);

  const allStats: VoteStats[] = candidates.map((candidate) => {
    const totalVotesForHouse = candidates
      .filter((currentCandidate) => currentCandidate.house === candidate.house)
      .reduce((sum, currentCandidate) => sum + currentCandidate.vote_count, 0);
    const percentage =
      totalVotesForHouse > 0 ? (candidate.vote_count / totalVotesForHouse) * 100 : 0;

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      house: candidate.house,
      position: candidate.position,
      voteCount: candidate.vote_count,
      percentage,
    };
  });

  const stats = allStats.filter((stat) => stat.house === currentHouse);

  const leadingCandidate =
    stats.length > 0
      ? stats.reduce((prev, current) => (prev.voteCount > current.voteCount ? prev : current))
      : null;

  const uniqueVoters = new Set(votes.map((v) => v.voter_id)).size;
  const totalVotes = votes.length;
  const activeHouses = CANDIDATE_HOUSE_OPTIONS.filter((house) =>
    candidates.some((candidate) => candidate.house === house.value)
  );

  const downloadResults = () => {
    const csv = [
      ['House', 'Position', 'Candidate', 'Votes', 'Percentage'],
      ...allStats.map((s) => [
        s.house,
        s.position,
        s.candidateName,
        s.voteCount,
        `${s.percentage.toFixed(2)}%`,
      ]),
      [],
      ['Summary'],
      ['Total Votes', totalVotes],
      ['Unique Voters', uniqueVoters],
      ['Active Houses', activeHouses.length],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    element.setAttribute('download', `voting-results-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <AdminLayout activePage="results">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Election Results</h1>
            <p className="text-slate-500 mt-1">Real-time voting statistics and analytics</p>
          </div>
          <button
            onClick={downloadResults}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <Download className="w-5 h-5" />
            Export as CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Votes</p>
                <p className="text-3xl font-bold text-slate-900">{totalVotes}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Unique Voters</p>
                <p className="text-3xl font-bold text-slate-900">{uniqueVoters}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Active Houses</p>
                  <p className="text-3xl font-bold text-slate-900">{activeHouses.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading results...</p>
            </div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-4">No candidates added yet</p>
            <p className="text-slate-400">Add candidates first in the Manage Candidates section</p>
          </div>
        ) : (
          <>
            {/* House Selector */}
            <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Select House</h3>
              <div className="flex flex-wrap gap-2">
                {activeHouses.map((house) => (
                  <button
                    key={house.value}
                    onClick={() => setSelectedHouse(house.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentHouse === house.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {house.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Chart */}
            <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                {currentHouse} - Results ({totalHouseVotes} votes)
              </h3>

              {stats.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No candidates assigned to this house</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .map((stat, index) => (
                      <div key={stat.candidateId}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
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
                              <p className="text-xs text-slate-500">
                                {stat.position} · {stat.voteCount === 1 ? 'vote' : 'votes'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{stat.voteCount}</p>
                            <p className="text-xs text-slate-500">{stat.percentage.toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                index === 0
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  : 'bg-gradient-to-r from-slate-400 to-slate-500'
                              }`}
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-12 text-right">
                            {stat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {currentHouse && (
              <div className="bg-white rounded-2xl mb-24 border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">House Ballot Summary</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Candidates</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{houseCandidates.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Votes Cast</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{totalHouseVotes}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Top Candidate</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {leadingCandidate?.candidateName ?? 'No votes yet'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Winner Display */}
            {leadingCandidate && leadingCandidate.voteCount > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl border border-yellow-200 p-8 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-200 text-yellow-900">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-700 uppercase tracking-wider mb-1">
                      Leading candidate
                    </p>
                    <h3 className="text-2xl font-bold text-yellow-900 mb-2">
                      {leadingCandidate.candidateName}
                    </h3>
                    <p className="text-yellow-700">
                      {leadingCandidate.position} ·{' '}
                      <span className="font-bold">{leadingCandidate.voteCount}</span> votes (
                      <span className="font-bold">{leadingCandidate.percentage.toFixed(1)}%</span>)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* House Summary Table */}
            <div className="bg-white rounded-2xl mb-24 border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">All Houses Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                        House
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                        Leading Candidate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                        Votes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                        Candidates
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeHouses.map((house) => {
                      const houseStats = allStats.filter((stat) => stat.house === house.value);
                      const leader = houseStats.length > 0
                        ? houseStats.reduce((prev, current) =>
                            prev.voteCount > current.voteCount ? prev : current
                          )
                        : null;
                      return (
                        <tr key={house.value} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-slate-900">{house.value}</td>
                          <td className="px-6 py-4 text-slate-700">
                            {leader?.candidateName ?? 'No candidates'}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{leader?.voteCount ?? 0}</td>
                          <td className="px-6 py-4 text-slate-600">{houseStats.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
