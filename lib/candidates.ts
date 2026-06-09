import { supabase, type Candidate } from '@/lib/supabase';

export const CANDIDATE_SELECT =
  'id,name,position,department,year,bio,photo_url,manifesto,vote_count,house,created_at';

export type CandidateMutation = Pick<
  Candidate,
  'name' | 'position' | 'department' | 'year' | 'bio' | 'photo_url' | 'manifesto' | 'house'
>;

export async function fetchCandidates() {
  const result = await supabase
    .from('candidates')
    .select(CANDIDATE_SELECT)
    .order('position')
    .order('name');

  return {
    data: (result.data ?? []) as Candidate[],
    error: result.error,
  };
}
