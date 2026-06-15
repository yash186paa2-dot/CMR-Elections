'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart2,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  FileText,
  GraduationCap,
  Lock,
  LogOut,
  Shield,
  Sparkles,
  Wallet,
  type LucideIcon,
  Vote as VoteIcon,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { CandidateCard } from '@/components/candidate-card';
import { ErrorModal } from '@/components/error-modal';
import { VoteConfirmModal } from '@/components/vote-confirm-modal';
import { VoteSuccessModal } from '@/components/vote-success-modal';
import { fetchCandidates } from '@/lib/candidates';
import { supabase, type Candidate, type Vote, type House } from '@/lib/supabase';
import { fetchHouses, getHouseTheme, hexToRgb } from '@/lib/houses';
import { normalizeStatus } from '@/lib/utils';

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type PositionGroup = {
  position: string;
  candidates: Candidate[];
};

type PositionVisual = {
  icon: LucideIcon;
  tint: string;
  surface: string;
  border: string;
};

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const name = user?.user_metadata?.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  const email = user?.email?.trim();
  if (email) {
    return email.split('@')[0];
  }

  return 'Authenticated voter';
}

function isSupabaseErrorLike(error: unknown): error is SupabaseErrorLike {
  return typeof error === 'object' && error !== null && 'message' in error;
}

function formatSupabaseError(error: unknown) {
  if (!isSupabaseErrorLike(error)) {
    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: null,
      hint: null,
    };
  }

  return {
    code: error.code ?? 'UNKNOWN',
    message: error.message ?? 'Unknown Supabase error',
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function buildBallotErrorMessage(source: string, error: unknown) {
  const formatted = formatSupabaseError(error);
  const parts = [`${source} failed: [${formatted.code}] ${formatted.message}`];

  if (formatted.details) {
    parts.push(`Details: ${formatted.details}`);
  }

  if (formatted.hint) {
    parts.push(`Hint: ${formatted.hint}`);
  }

  return parts.join(' ');
}

function groupCandidatesByPosition(candidates: Candidate[]) {
  const grouped = new Map<string, { candidates: Candidate[]; order: number }>();

  for (const candidate of candidates) {
    const position = candidate.position.trim() || 'Unassigned Position';
    const current = grouped.get(position) ?? { candidates: [], order: candidate.display_order ?? 0 };
    current.candidates.push(candidate);
    if (candidate.display_order < current.order) {
      current.order = candidate.display_order;
    }
    grouped.set(position, current);
  }

  return Array.from(grouped.entries())
    .sort(([nameA, dataA], [nameB, dataB]) => {
      if (dataA.order !== dataB.order) {
        return dataA.order - dataB.order;
      }
      return nameA.localeCompare(nameB);
    })
    .map(([position, data]) => ({
      position,
      candidates: [...data.candidates].sort((a, b) => a.name.localeCompare(b.name)),
    })) satisfies PositionGroup[];
}

function getPositionVisual(position: string): PositionVisual {
  const normalized = position.toLowerCase();

  if (normalized.includes('president') || normalized.includes('head')) {
    return {
      icon: Crown,
      tint: 'text-amber-400',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-amber-400/30',
    };
  }

  if (normalized.includes('vice')) {
    return {
      icon: GraduationCap,
      tint: 'text-blue-300',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-blue-400/30',
    };
  }

  if (normalized.includes('secretary')) {
    return {
      icon: FileText,
      tint: 'text-blue-300',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-blue-400/30',
    };
  }

  if (normalized.includes('treasurer')) {
    return {
      icon: Wallet,
      tint: 'text-blue-300',
      surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
      border: 'border-blue-400/30',
    };
  }

  return {
    icon: Briefcase,
    tint: 'text-blue-300',
    surface: 'from-[#001F3F] via-[#001F3F] to-[#002B5B]',
    border: 'border-blue-400/30',
  };
}

function getNextPendingPosition(candidateGroups: PositionGroup[], completedPositions: Set<string>) {
  return candidateGroups.find((group) => !completedPositions.has(group.position))?.position ?? null;
}

export default function HomePage() {
  const { user, loading, signOut, isAdmin, isGuest } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [successCandidate, setSuccessCandidate] = useState<Candidate | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [openPosition, setOpenPosition] = useState<string | null>(null);
  const [hasStartedVoting, setHasStartedVoting] = useState(false);
  const [isReviewScreenOpen, setIsReviewScreenOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showResultsAnyway, setShowResultsAnyway] = useState(false);
  const [isSelectingHouse, setIsSelectingHouse] = useState(false);
  const [houseToConfirm, setHouseToConfirm] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [electionStatus, setElectionStatus] = useState<'open' | 'closed' | 'paused' | 'scheduled' | null>(null);
  const [resultsVisibility, setResultsVisibility] = useState<'visible' | 'hidden'>('hidden');
  const [statusFetched, setStatusFetched] = useState(false);

  const TIMER_DEFAULTS = useMemo(
    () => ({
      timer_enabled: false,
      timer_duration: 60,
      timer_status: 'stopped' as 'stopped' | 'running' | 'paused',
      timer_start_time: null as string | null,
    }),
    []
  );

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [user, isGuest, loading, router]);

  const fetchElectionSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('election_settings')
        .select('key, value');
      
      if (data) {
        const statusItem = data.find(i => i.key === 'election_status');
        const visibilityItem = data.find(i => i.key === 'results_visibility');
        
        if (statusItem) {
          const normalized = normalizeStatus(statusItem.value);
          console.log('[Student] Status Fetched:', normalized);
          setElectionStatus(normalized as any);
        }
        
        if (visibilityItem) {
          setResultsVisibility(normalizeStatus(visibilityItem.value) as any);
        }
      }
      setStatusFetched(true);
    } catch (err) {
      console.error("[Student] Fetch Failed:", err);
    }
  };

  useEffect(() => {
    void fetchElectionSettings();

    const channel = supabase
      .channel('student_election_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'election_settings' },
        (payload) => {
          console.log('[Student] Realtime Update:', payload);
          void fetchElectionSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (resultsVisibility !== 'visible') return;

    const channel = supabase
      .channel('public_candidates_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidates',
        },
        (payload) => {
          setCandidates((current) =>
            current.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resultsVisibility]);

  useEffect(() => {
    const fetchTimer = async () => {
      const settingKeys = Object.keys(TIMER_DEFAULTS);
      const { data, error } = await supabase
        .from('election_settings')
        .select('key, value')
        .in('key', settingKeys);

      if (error) {
        console.error('Error fetching timer settings:', error);
        setTimerStatus('stopped');
        setTimeLeft(null);
        return;
      }

      const settingsMap = new Map((data ?? []).map((item) => [item.key, item.value]));
      for (const key of settingKeys) {
        if (!settingsMap.has(key)) {
          settingsMap.set(key, TIMER_DEFAULTS[key as keyof typeof TIMER_DEFAULTS]);
        }
      }

      const enabledValue = settingsMap.get('timer_enabled');
      const durationValue = settingsMap.get('timer_duration');
      const statusValue = settingsMap.get('timer_status');
      const startTimeValue = settingsMap.get('timer_start_time');

      const enabled = enabledValue === true || enabledValue === 'true';
      const duration = Number(durationValue ?? TIMER_DEFAULTS.timer_duration);
      const status = (statusValue ?? TIMER_DEFAULTS.timer_status) as 'stopped' | 'running' | 'paused';
      const startTime = startTimeValue ? new Date(String(startTimeValue)).getTime() : null;

      setTimerStatus(status);

      if (enabled && status === 'running' && startTime) {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(remaining);
      } else if (enabled && status === 'paused') {
        setTimeLeft(duration);
      } else {
        setTimeLeft(null);
      }
    };

    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [TIMER_DEFAULTS]);

  useEffect(() => {
    if (timerStatus === 'running' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timerStatus, timeLeft]);

  useEffect(() => {
    if (!loading && user) {
      const isCollegeEmail = user.email?.endsWith('@cmr.ac.in');
      const isRollStudent = user.user_metadata?.login_type === 'roll_student';
      if (!isCollegeEmail && !isRollStudent) {
        signOut().then(() => router.replace('/login?error=invalid_domain'));
      }
    }
  }, [user, loading, signOut, router]);

  const fetchData = useCallback(async (forcedHouse?: string) => {
    if (!user && !isGuest) return;

    setDataLoading(true);

    try {
      const [candidatesRes, housesRes, votesRes, studentRes] = await Promise.all([
        fetchCandidates(),
        fetchHouses(),
        user
          ? supabase
              .from('votes')
              .select('id,voter_id,voter_email,candidate_id,position,created_at')
              .eq('voter_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Vote[], error: null }),
        user
          ? supabase
              .from('students')
              .select('*')
              .eq('auth_user_id', user.id)
          : Promise.resolve({ data: null, error: null })
      ]);
      const studentRow = Array.isArray(studentRes?.data) ? studentRes.data[0] ?? null : studentRes?.data ?? null;

      if (candidatesRes.error) {
        throw new Error(buildBallotErrorMessage('Candidate query', candidatesRes.error));
      }

      if (housesRes.error) {
        console.error('Error fetching houses:', housesRes.error);
      }

      if (votesRes.error) {
        throw new Error(buildBallotErrorMessage('Vote history query', votesRes.error));
      }

      if (studentRes?.error) {
        throw new Error(buildBallotErrorMessage('Student record query', studentRes.error));
      }

      setHouses(housesRes.data ?? []);

      if (studentRow?.has_voted) {
        router.replace('/thank-you');
        return;
      }

      let filteredCandidates = candidatesRes.data ?? [];
      let currentStudentHouse: string | null = forcedHouse || null;
      
      if (user && studentRow?.class) {
        currentStudentHouse = studentRow.class;
        if (currentStudentHouse) {
          const key = `selectedHouse_${user.id}`;
          localStorage.setItem(key, currentStudentHouse);
        }
      } else if (!currentStudentHouse) {
        const key = user ? `selectedHouse_${user.id}` : 'selectedHouse';
        currentStudentHouse = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      }

      if (user && !currentStudentHouse) {
        setIsSelectingHouse(true);
      } else {
        setIsSelectingHouse(false);
        if (isGuest && !currentStudentHouse) {
          currentStudentHouse = housesRes.data?.[0]?.name || 'Agni House';
        }
      }

      filteredCandidates = filteredCandidates.filter(
        c => c.house === 'None' || (currentStudentHouse && c.house === currentStudentHouse)
      );

      setCandidates(filteredCandidates);
      setSelectedHouse(currentStudentHouse);
      setVotes(votesRes.data ?? []);
    } catch (err) {
      console.error('Data loading error:', err);
      setErrorModal({
        title: 'Ballot Load Error',
        message: err instanceof Error ? err.message : buildBallotErrorMessage('Ballot loader', err),
      });
    } finally {
      setDataLoading(false);
    }
  }, [isGuest, user, router]);

  useEffect(() => {
    if (user || isGuest) {
      void fetchData();
    }
  }, [fetchData, isGuest, user]);

  const candidateGroups = useMemo(() => groupCandidatesByPosition(candidates), [candidates]);
  const votesByPosition = useMemo(() => new Map(votes.map((vote) => [vote.position, vote])), [votes]);
  const votedCandidateIds = useMemo(() => new Set(votes.map((vote) => vote.candidate_id)), [votes]);
  const totalPositions = candidateGroups.length;
  const completedPositions = votesByPosition.size;
  const progressPercentage = totalPositions === 0 ? 0 : Math.round((completedPositions / totalPositions) * 100);
  const firstPendingPosition = useMemo(
    () => getNextPendingPosition(candidateGroups, new Set(votesByPosition.keys())),
    [candidateGroups, votesByPosition]
  );
  const allPositionsCompleted = totalPositions > 0 && completedPositions === totalPositions;

  useEffect(() => {
    if (candidateGroups.length > 0 && !openPosition) {
      setOpenPosition(firstPendingPosition ?? candidateGroups[0].position);
    }
  }, [candidateGroups, firstPendingPosition, openPosition]);

  useEffect(() => {
    if (!candidateGroups.length || !openPosition) {
      return;
    }

    if (votesByPosition.has(openPosition) && firstPendingPosition) {
      setOpenPosition(firstPendingPosition);
    }
  }, [candidateGroups.length, firstPendingPosition, openPosition, votesByPosition]);

  const recordedSelections = useMemo(
    () =>
      candidateGroups
        .map((group) => {
          const recordedVote = votesByPosition.get(group.position);
          if (!recordedVote) return null;
          const candidate = candidates.find((item) => item.id === recordedVote.candidate_id) ?? null;
          if (!candidate) return null;
          return { position: group.position, candidate };
        })
        .filter((item): item is { position: string; candidate: Candidate } => item !== null),
    [candidateGroups, candidates, votesByPosition]
  );

  const handleHouseSelect = async (house: string) => {
    if (user) {
      try {
        setVotingLoading(true);
        const { data: existing, error: fetchError } = await supabase
          .from('students')
          .select('id, class')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        const finalHouse = (existing && existing.class && existing.class !== '') ? existing.class : house;

        if (existing && (!existing.class || existing.class === '')) {
          const { error: updateError } = await supabase
            .from('students')
            .update({ class: house })
            .eq('auth_user_id', user.id);

          if (updateError) throw updateError;
        }

        const key = `selectedHouse_${user.id}`;
        localStorage.setItem(key, finalHouse);
        
        setSelectedHouse(finalHouse);
        setIsSelectingHouse(false);
        setHouseToConfirm(null);

        await fetchData(finalHouse);
      } catch (err) {
        console.error('House selection error:', err);
        setErrorModal({
          title: 'Selection Error',
          message: 'Failed to save your house selection. Please try again.',
        });
      } finally {
        setVotingLoading(false);
      }
    } else {
      const key = 'selectedHouse';
      localStorage.setItem(key, house);
      setSelectedHouse(house);
      setIsSelectingHouse(false);
      setHouseToConfirm(null);
      await fetchData(house);
    }
  };

  const handleVoteConfirm = async () => {
    if (!confirmCandidate) return;

    // SECURITY: Fresh check of election status before vote
    const { data: statusData } = await supabase.from('election_settings').select('value').eq('key', 'election_status').single();
    const currentStatus = statusData ? normalizeStatus(statusData.value) : electionStatus;

    if (currentStatus !== 'open' && !isAdmin) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Election Not Open',
        message: `The election is currently ${currentStatus?.toUpperCase()}. You cannot cast a vote at this time.`,
      });
      setElectionStatus(currentStatus as any);
      return;
    }

    if (isGuest) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Login Required',
        message: "You're currently previewing the election. Please log in with your student credentials to cast an official vote.",
      });
      return;
    }

    if (!user) return;

    if (votesByPosition.has(confirmCandidate.position)) {
      setConfirmCandidate(null);
      setErrorModal({
        title: 'Position Already Submitted',
        message: `Your vote for ${confirmCandidate.position} has already been recorded.`,
      });
      return;
    }

    setVotingLoading(true);
    try {
      const nextPendingPosition = candidateGroups.find(
        (group) => group.position !== confirmCandidate.position && !votesByPosition.has(group.position)
      )?.position;
      const { data, error } = await supabase
        .from('votes')
        .insert({
          voter_id: user.id,
          voter_email: user.email ?? '',
          candidate_id: confirmCandidate.id,
          position: confirmCandidate.position,
        })
        .select('id,voter_id,voter_email,candidate_id,position,created_at')
        .single();

      if (error) throw error;

      const recordedVote = data as Vote;

      setVotes((current) => [...current, recordedVote].sort((a, b) => a.position.localeCompare(b.position)));
      setSuccessCandidate(confirmCandidate);
      setSelectedCandidateIds((current) => {
        const next = { ...current };
        delete next[confirmCandidate.position];
        return next;
      });
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === confirmCandidate.id
            ? { ...candidate, vote_count: candidate.vote_count + 1 }
            : candidate
        )
      );
      setConfirmCandidate(null);
      setOpenPosition(nextPendingPosition ?? null);
      setHasStartedVoting(true);
      setIsReviewScreenOpen(!nextPendingPosition);
    } catch (err) {
      console.error('Vote submission error:', err);
      setErrorModal({
        title: 'Voting Error',
        message: 'Your vote could not be submitted. Please try again.',
      });
    } finally {
      setVotingLoading(false);
    }
  };

  const handleFinalBallotSubmit = async () => {
    if (!user || isGuest) return;

    // SECURITY: Fresh check of election status before final submission
    const { data: statusData } = await supabase.from('election_settings').select('value').eq('key', 'election_status').single();
    const currentStatus = statusData ? normalizeStatus(statusData.value) : electionStatus;

    if (currentStatus !== 'open' && !isAdmin) {
      setErrorModal({
        title: 'Election Not Open',
        message: `The election is currently ${currentStatus?.toUpperCase()}. You cannot submit your final ballot at this time.`,
      });
      setElectionStatus(currentStatus as any);
      return;
    }

    setVotingLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('students')
        .update({ has_voted: true })
        .eq('auth_user_id', user.id);

      if (updateError) throw updateError;
      router.push('/thank-you');
    } catch (error) {
      console.error('FINAL SUBMIT ERROR:', error);
      setErrorModal({
        title: 'Submission Error',
        message: 'There was a problem finalizing your ballot. Please try again.',
      });
    } finally {
      setVotingLoading(false);
    }
  };

  if (loading || dataLoading || !statusFetched) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-700" />
          <p className="text-base font-medium text-slate-600">Loading your ballot...</p>
        </div>
      </div>
    );
  }

  if (electionStatus !== 'open' && !isAdmin && !showResultsAnyway) {
    if (electionStatus === 'paused') {
      return (
        <ElectionPausedScreen 
          onBackToLogin={() => router.replace('/login')}
        />
      );
    }

    return (
      <ElectionClosedScreen 
        resultsVisibility={resultsVisibility} 
        onViewResults={() => setShowResultsAnyway(true)} 
        onBackToLogin={() => router.replace('/login')}
      />
    );
  }

  if (isSelectingHouse) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start bg-[#f8fafc] p-4 sm:p-8 overflow-y-auto">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px]" />
          <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>

        <div className="w-full max-w-2xl animate-fade-in flex flex-col pt-2 sm:pt-4 relative z-10">
          <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
            <div className="relative mb-4 h-32 w-32 sm:h-40 sm:w-40 transition-transform duration-700 hover:scale-105">
              <Image src="/logo.png" alt="CMR Logo" fill className="object-contain drop-shadow-2xl" priority />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">CMR National PU College</h1>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] text-blue-600/60">Student Council Elections 2026</p>
            </div>
          </div>
          
          <div className="mb-8 flex flex-col items-center">
            <div className="w-full rounded-[2.5rem] bg-white/40 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(15,23,42,0.08)] border border-white/60 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Welcome, <span className="text-blue-600">{getDisplayName(user)}</span>
                </h2>
                <div className="mt-6 flex flex-col items-center">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 border border-blue-100/50">Election Message</div>
                  <p className="text-lg sm:text-xl text-slate-700 font-medium leading-relaxed max-w-lg mx-auto italic">"Your vote is your voice. Choose leaders who will shape the future of CMR."</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl mx-auto space-y-8">
            <div className="flex items-center gap-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Select Your House</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
            </div>

            <div className="space-y-4">
              {houses.map((house) => {
                const theme = getHouseTheme(house.color, house.name);
                const isHex = house.color.startsWith('#');
                const rgb = isHex ? hexToRgb(house.color) : null;
                const IconComp = theme.icon || Shield;
                const glowStyle = isHex ? { '--glow-color': `${rgb?.r} ${rgb?.g} ${rgb?.b}` } as React.CSSProperties : {};

                return (
                  <button
                    key={house.id}
                    onClick={() => setHouseToConfirm(house.name)}
                    style={glowStyle}
                    className="group relative flex items-center justify-between w-full rounded-[2rem] bg-white border border-slate-200/60 p-6 pr-8 text-left transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(var(--glow-color,100_116_139),0.25)] hover:-translate-y-1.5 active:scale-[0.98] overflow-hidden"
                  >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${theme.surface}`} />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${!isHex ? theme.borderColor : ''}`} style={{ backgroundColor: isHex ? house.color : undefined }}>
                        <IconComp className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 transition-colors group-hover:text-blue-600">{house.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`h-1.5 w-6 rounded-full ${!isHex ? theme.borderColor : ''}`} style={{ backgroundColor: isHex ? house.color : undefined }} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Official Ballot</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-500 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-2 shadow-sm">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {houseToConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
            <div className="w-full max-w-md animate-scale-in bg-white rounded-[2.5rem] p-10 shadow-2xl border border-white/20">
              <div className="flex flex-col items-center text-center">
                {(() => {
                  const houseObj = houses.find(h => h.name === houseToConfirm);
                  const theme = getHouseTheme(houseObj?.color, houseObj?.name);
                  const IconComp = theme.icon || Shield;
                  const isHex = houseObj?.color.startsWith('#');
                  return (
                    <div className={`mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] shadow-xl ${!isHex ? theme.borderColor : ''}`} style={{ backgroundColor: isHex ? houseObj?.color : undefined }}>
                      <IconComp className="h-10 w-10 text-white" />
                    </div>
                  );
                })()}
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Confirm House</h3>
                <div className="mt-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 w-full text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">You have selected</p>
                  <p className="text-2xl font-black text-slate-900 mt-2">{houseToConfirm}</p>
                </div>
                <p className="mt-8 text-base text-slate-500 font-medium leading-relaxed px-2">This choice is final and <span className="text-rose-600 font-bold">cannot be changed</span> later. Are you sure?</p>
                <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                  <button onClick={() => setHouseToConfirm(null)} className="flex h-14 items-center justify-center rounded-2xl border-2 border-slate-100 font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all text-sm uppercase tracking-widest">Cancel</button>
                  <button onClick={() => houseToConfirm && handleHouseSelect(houseToConfirm)} disabled={votingLoading} className="flex h-14 items-center justify-center rounded-2xl bg-slate-900 font-black text-white shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest">
                    {votingLoading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {errorModal && <ErrorModal title={errorModal.title} message={errorModal.message} onDismiss={() => setErrorModal(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-950 relative">
      {resultsVisibility === 'visible' && (electionStatus === 'open' || showResultsAnyway) && (
        <div className="bg-emerald-600 text-white py-3 px-6 text-center font-bold sticky top-0 z-[45] shadow-lg animate-in slide-in-from-top duration-500">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span>Official Election Results are now LIVE!</span>
            <button onClick={() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })} className="ml-4 bg-white text-emerald-600 px-4 py-1 rounded-full text-sm hover:bg-emerald-50 transition-colors">View Results</button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo.png" alt="CMR" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">CMR Elections</p>
              <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">Official Student Ballot 2026</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {timeLeft !== null && (
              <div className={`mr-2 hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold sm:flex ${timeLeft < 10 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                <Clock className="h-3.5 w-3.5" />
                <span>{timeLeft > 0 ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : "Time's Up!"}</span>
              </div>
            )}
            {isAdmin && <button onClick={() => router.push('/admin')} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"><BarChart2 className="h-4 w-4" /><span className="hidden sm:inline">Admin</span></button>}
            {isGuest ? (
              <button onClick={() => router.push('/login')} className="flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"><LogOut className="h-4 w-4 rotate-180" /><span>Log in</span></button>
            ) : (
              <button onClick={signOut} className="flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-white/70 px-5 py-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.4)] sm:px-8 sm:py-8">
          <div className="absolute inset-x-8 top-0 h-32 rounded-full bg-gradient-to-r from-sky-200/60 via-violet-200/60 to-emerald-200/60 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"><Shield className="h-3.5 w-3.5" />Secure Student Ballot</div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">CMR National PU College</h1>
              <p className="mt-2 text-base font-semibold text-slate-700 sm:text-lg">Student Council Elections 2026</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">A guided voting experience for first-time student voters. Choose your candidate and confirm each vote with confidence.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/50"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Progress</p><p className="mt-1 text-lg font-black text-slate-950">{completedPositions} / {totalPositions}</p></div>
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/50"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Voter</p><p className="mt-1 text-lg font-bold text-slate-950">{isGuest ? 'Guest' : getDisplayName(user)}</p></div>
                {selectedHouse && (
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your House</p>
                    <div className="mt-1 flex items-center gap-2">
                      {(() => {
                        const houseObj = houses.find(h => h.name === selectedHouse);
                        const theme = getHouseTheme(houseObj?.color, houseObj?.name);
                        const isHex = houseObj?.color.startsWith('#');
                        return <div className={`h-2.5 w-2.5 rounded-full ${!isHex ? `bg-gradient-to-r ${theme.accent}` : ''}`} style={{ backgroundColor: isHex ? houseObj?.color : undefined }} />;
                      })()}
                      <p className="text-lg font-black text-slate-950">{selectedHouse}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-900/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.22),_transparent_38%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200"><Sparkles className="h-3.5 w-3.5" />Read before you vote</div>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li className="flex items-start gap-3"><span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">1</span>Start guided ballot.</li>
                  <li className="flex items-start gap-3"><span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">2</span>Choose one candidate per position.</li>
                  <li className="flex items-start gap-3"><span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">3</span>Confirm and submit your final ballot.</li>
                </ul>
                <div className="mt-5 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 transition-all duration-500" style={{ width: `${progressPercentage}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        {dataLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm" />)}</div>
        ) : candidates.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Ballot is not ready yet</h2>
          </div>
        ) : (
          <>
            {!hasStartedVoting && !isReviewScreenOpen ? (
              <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <h2 className="text-3xl font-black text-slate-950">Start your guided ballot</h2>
                  <div className="mt-10">
                    <button onClick={() => { setHasStartedVoting(true); setIsReviewScreenOpen(false); if (!openPosition) setOpenPosition(firstPendingPosition || candidateGroups[0]?.position); }} className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#002B5B] px-8 text-lg font-black uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                      <span>{completedPositions > 0 ? 'Continue' : 'Start'} Guided Ballot</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Position Overview</p>
                  <div className="mt-5 space-y-3">
                    {candidateGroups.map((group) => {
                      const visual = getPositionVisual(group.position);
                      const isCompleted = votesByPosition.has(group.position);
                      return (
                        <div key={group.position} className={`rounded-[1.35rem] border bg-gradient-to-br ${visual.surface} ${visual.border} px-4 py-4 shadow-sm`}>
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1"><p className="truncate text-base font-semibold text-white">{group.position}</p></div>
                            <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-[#001F3F]'}`}>{isCompleted ? 'Voted' : 'Pending'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : isReviewScreenOpen ? (
              <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:p-8">
                  <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black text-slate-950">Review selections</h2>
                    <button onClick={() => { setIsReviewScreenOpen(false); setHasStartedVoting(true); }} className="flex h-11 items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">Back</button>
                  </div>
                  <div className="mt-6 space-y-4">
                    {recordedSelections.map(({ position, candidate }) => (
                      <div key={position} className="rounded-[1.5rem] border border-emerald-200 bg-white/80 p-4 flex items-center gap-4">
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-500 uppercase">{position}</p><p className="text-lg font-bold text-slate-950">{candidate.name}</p></div>
                        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">Submitted</div>
                      </div>
                    ))}
                  </div>
                </div>
                <aside className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-xl sm:p-8">
                  <h3 className="text-2xl font-black text-slate-950">{allPositionsCompleted ? 'Ready to submit' : 'In progress'}</h3>
                  {allPositionsCompleted && (
                    <button onClick={handleFinalBallotSubmit} disabled={votingLoading} className="mt-8 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-[#059669] px-8 text-lg font-black uppercase text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50">
                      {votingLoading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Submit Final Ballot"}
                    </button>
                  )}
                </aside>
              </section>
            ) : (
              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="glass-panel rounded-[1.75rem] border border-white/70 p-5 shadow-xl sm:p-6">
                    <div className="flex justify-between items-end">
                      <h2 className="text-2xl font-black text-slate-950">Guided Ballot</h2>
                      <button onClick={() => setIsReviewScreenOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">Review</button>
                    </div>
                  </div>
                  {candidateGroups.map((group) => {
                    const visual = getPositionVisual(group.position);
                    const selectedCandidateId = selectedCandidateIds[group.position];
                    const selectedCandidate = group.candidates.find(c => c.id === selectedCandidateId) || null;
                    const votedForPosition = votesByPosition.get(group.position);
                    const submittedCandidate = votedForPosition ? candidates.find(c => c.id === votedForPosition.candidate_id) || null : null;
                    const isOpen = openPosition === group.position && !isReviewScreenOpen;

                    return (
                      <section key={group.position} className="glass-panel rounded-[1.75rem] border border-white/70 overflow-hidden">
                        <button onClick={() => setOpenPosition(group.position)} className={`flex w-full items-center gap-4 px-6 py-5 text-left ${isOpen ? 'bg-white' : 'bg-white/60'}`}>
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${visual.surface} text-white`}><Crown className="h-6 w-6" /></div>
                          <div className="flex-1"><h3 className="text-xl font-black">{group.position}</h3></div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-6 py-6 bg-white/40 border-t border-slate-100">
                            {submittedCandidate ? (
                              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 font-bold">Voted for {submittedCandidate.name}</div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {group.candidates.map((c, idx) => (
                                    <CandidateCard key={c.id} candidate={c} hasVoted={!!votedForPosition} isVotedFor={selectedCandidateId === c.id} onSelect={(next) => setSelectedCandidateIds(prev => ({ ...prev, [next.position]: next.id }))} rank={idx} />
                                  ))}
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                  <button onClick={() => selectedCandidate && setConfirmCandidate(selectedCandidate)} disabled={!selectedCandidate || votingLoading} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${selectedCandidate ? 'bg-[#002B5B] text-white' : 'bg-slate-100 text-slate-400'}`}>Submit Vote</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
                <aside className="hidden xl:block">
                  <div className="sticky top-24 glass-panel rounded-[1.75rem] border border-white/70 p-6 shadow-xl">
                    <h3 className="text-2xl font-black mb-4">Progress</h3>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progressPercentage}%` }} /></div>
                    <p className="mt-4 font-bold">{completedPositions} / {totalPositions} Completed</p>
                    {allPositionsCompleted && <button onClick={handleFinalBallotSubmit} className="mt-6 w-full py-4 rounded-xl bg-emerald-600 text-white font-bold uppercase">Submit Final Ballot</button>}
                  </div>
                </aside>
              </section>
            )}
          </>
        )}

        {resultsVisibility === 'visible' && (
          <section id="results-section" className="mt-12 bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h2 className="text-3xl font-black mb-8">Official Results</h2>
            <div className="space-y-12">
              {candidateGroups.map((group) => (
                <div key={group.position} className="space-y-4">
                  <h3 className="text-xl font-black border-l-4 border-emerald-500 pl-4">{group.position}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.candidates.sort((a, b) => b.vote_count - a.vote_count).map((c) => {
                      const max = Math.max(...group.candidates.map(x => x.vote_count));
                      const pct = max > 0 ? (c.vote_count / max) * 100 : 0;
                      return (
                        <div key={c.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                          <div className="flex justify-between font-bold mb-2"><span>{c.name}</span><span className="text-emerald-600">{c.vote_count}</span></div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-20 border-t border-slate-200 py-10 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Election Platform</p>
          <p className="mt-3 text-sm font-medium text-slate-600">Designed & Developed by <span className="text-slate-900 font-bold">Yeshwanth B</span></p>
        </footer>
      </main>

      {confirmCandidate && <VoteConfirmModal candidate={confirmCandidate} onConfirm={handleVoteConfirm} onCancel={() => !votingLoading && setConfirmCandidate(null)} loading={votingLoading} />}
      {successCandidate && <VoteSuccessModal candidate={successCandidate} onDismiss={() => setSuccessCandidate(null)} />}
      {errorModal && <ErrorModal title={errorModal.title} message={errorModal.message} onDismiss={() => setErrorModal(null)} />}
    </div>
  );
}

function ElectionClosedScreen({ 
  resultsVisibility, 
  onViewResults, 
  onBackToLogin 
}: { 
  resultsVisibility: 'visible' | 'hidden';
  onViewResults: () => void;
  onBackToLogin: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md p-6 text-center">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] mx-auto shadow-2xl bg-rose-500">
          <Lock className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">
          Election Closed
        </h2>
        <p className="text-xl text-slate-400 font-medium mb-12">
          The election has been closed. Voting is no longer permitted.
        </p>
        
        <div className="flex flex-col gap-4">
          {resultsVisibility === 'visible' && (
            <button
              onClick={onViewResults}
              className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
            >
              View Live Results
            </button>
          )}
          <button
            onClick={onBackToLogin}
            className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function ElectionPausedScreen({ 
  onBackToLogin 
}: { 
  onBackToLogin: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md p-6 text-center">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] mx-auto shadow-2xl bg-amber-500">
          <Clock className="h-12 w-12 text-white animate-pulse" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight mb-4 uppercase">
          Election Temporarily Paused
        </h2>
        <p className="text-xl text-slate-400 font-medium mb-12">
          The election is currently paused by the administrator. Please wait for it to resume.
        </p>
        
        <button
          onClick={onBackToLogin}
          className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
