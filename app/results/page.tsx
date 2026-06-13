'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { supabase, type Candidate, type House } from '@/lib/supabase';
import { fetchCandidates } from '@/lib/candidates';
import { fetchHouses } from '@/lib/houses';
import { BarChart3, TrendingUp, Users, Lock, Award, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PublicResultsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>('hidden');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Check visibility first
      const { data: settings } = await supabase
        .from('election_settings')
        .select('value')
        .eq('key', 'results_visibility')
        .maybeSingle();
      
      const isVisible = settings?.value === 'visible' || settings?.value === '"visible"';
      setVisibility(isVisible ? 'visible' : 'hidden');

      if (isVisible) {
        const [candidatesRes, housesRes] = await Promise.all([
          fetchCandidates(),
          fetchHouses(),
        ]);

        if (candidatesRes.data) setCandidates(candidatesRes.data);
        if (housesRes.data) setHouses(housesRes.data);
      }
      
      setLoading(false);
    };

    void fetchData();
  }, []);

  const statsByPosition = useMemo(() => {
    const grouped = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const list = grouped.get(c.position) ?? [];
      list.push(c);
      grouped.set(c.position, list);
    }
    return Array.from(grouped.entries()).sort((a, b) => {
        const orderA = a[1][0]?.display_order ?? 0;
        const orderB = b[1][0]?.display_order ?? 0;
        return orderA - orderB;
    });
  }, [candidates]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-700" />
          <p className="text-base font-medium text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (visibility === 'hidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl border border-slate-200 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-amber-50 text-amber-600 border border-amber-100">
            <Lock className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Results Hidden</h1>
          <p className="mt-4 text-base font-medium text-slate-500 leading-relaxed">
            The election results have not been published yet. Please check back after the official announcement.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-8 flex w-full h-14 items-center justify-center rounded-2xl bg-slate-900 font-black text-white shadow-xl hover:bg-slate-800 transition-all text-sm uppercase tracking-widest"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 pb-20">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="CMR Logo" width={40} height={40} className="h-10 w-10" />
            <div>
              <p className="text-sm font-bold text-slate-900">CMR Results</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Elections 2026</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-slate-600 hover:text-slate-900">
            Home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-100 mb-4">
            <Trophy className="h-3.5 w-3.5" />
            OFFICIAL ELECTION RESULTS
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Meet Your New Leaders</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            The votes have been counted. Congratulations to all the candidates who participated in the 2026 Student Council Elections.
          </p>
        </div>

        <div className="space-y-16">
          {statsByPosition.map(([position, candidates]) => {
            const winner = [...candidates].sort((a, b) => b.vote_count - a.vote_count)[0];
            const others = [...candidates].sort((a, b) => b.vote_count - a.vote_count).slice(1);

            return (
              <section key={position} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">{position}</h2>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-6 md:grid-cols-1">
                  {/* Winner Card */}
                  <div className="relative overflow-hidden rounded-[2.5rem] bg-white border-2 border-amber-200 shadow-xl p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                      <Award className="h-32 w-32 text-amber-600" />
                    </div>
                    
                    <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-[2rem] bg-slate-100 border-4 border-amber-100 shadow-lg">
                      {winner.photo_url ? (
                        <Image src={winner.photo_url} alt={winner.name} fill className="object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-400">
                          <Users className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-amber-500 py-1 text-center text-[10px] font-black text-white uppercase tracking-widest">
                        Winner
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700 border border-amber-100 mb-3">
                        ELECTED
                      </div>
                      <h3 className="text-3xl font-black text-slate-900">{winner.name}</h3>
                      <p className="mt-1 text-lg font-medium text-slate-500">
                        {winner.house !== 'None' ? winner.house : winner.department}
                      </p>
                      <div className="mt-6 flex items-center justify-center md:justify-start gap-4">
                        <div className="bg-slate-50 rounded-2xl px-5 py-3 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vote Count</p>
                          <p className="text-2xl font-black text-slate-900">{winner.vote_count}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other candidates in this position */}
                  {others.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                       {others.map(c => (
                         <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4">
                            <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-slate-50">
                                {c.photo_url ? <Image src={c.photo_url} alt={c.name} width={48} height={48} className="object-contain" /> : <Users className="h-6 w-6 m-3 text-slate-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 truncate">{c.name}</p>
                                <p className="text-xs text-slate-500">{c.vote_count} votes</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-200 pt-10 text-center opacity-50">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Official Election Platform · 2026
        </p>
      </footer>
    </div>
  );
}
