import { supabase, type Candidate } from '@/lib/supabase';
import { isCandidateHouse } from '@/lib/houses';

export const CANDIDATE_SELECT_WITH_HOUSE =
  'id,name,position,house,department,year,bio,photo_url,manifesto,vote_count,created_at';
export const CANDIDATE_SELECT_LEGACY =
  'id,name,position,department,year,bio,photo_url,manifesto,vote_count,created_at';

function normalizeCandidateHouse(candidate: Partial<Candidate> & Omit<Candidate, 'house'>): Candidate {
  return {
    ...candidate,
    house: isCandidateHouse(candidate.house) ? candidate.house : 'None',
  };
}

export async function fetchCandidatesWithHouseSupport() {
  const withHouse = await supabase
    .from('candidates')
    .select(CANDIDATE_SELECT_WITH_HOUSE)
    .order('house')
    .order('position')
    .order('name');

  if (!withHouse.error) {
    return {
      data: (withHouse.data ?? []).map((candidate) => normalizeCandidateHouse(candidate)),
      error: null,
      usedLegacyFallback: false,
    };
  }

  if (withHouse.error.code !== '42703') {
    return {
      data: [] as Candidate[],
      error: withHouse.error,
      usedLegacyFallback: false,
    };
  }

  const legacy = await supabase
    .from('candidates')
    .select(CANDIDATE_SELECT_LEGACY)
    .order('position')
    .order('name');

  if (legacy.error) {
    return {
      data: [] as Candidate[],
      error: legacy.error,
      usedLegacyFallback: true,
    };
  }

  return {
    data: (legacy.data ?? []).map((candidate) =>
      normalizeCandidateHouse({
        ...candidate,
        house: 'None',
      })
    ),
    error: null,
    usedLegacyFallback: true,
  };
}
