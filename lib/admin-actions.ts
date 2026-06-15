import { supabase } from './supabase';

export type ElectionStatus = 'open' | 'closed' | 'paused' | 'scheduled';
export type ResultsVisibility = 'visible' | 'hidden';

export async function logAdminAction(adminId: string, action: string, details: any) {
  const { error } = await supabase.from('audit_logs').insert({
    admin_id: adminId,
    action,
    details,
  });
  if (error) console.error('Failed to log admin action:', error);
}

export async function updateElectionStatus(status: ElectionStatus, adminId: string) {
  const { error } = await supabase
    .from('election_settings')
    .update({ value: JSON.stringify(status) })
    .eq('key', 'election_status');

  if (!error) {
    console.log("Election status updated:", status);
    await logAdminAction(adminId, 'UPDATE_ELECTION_STATUS', { status });
  }
  return { error };
}

export async function updateResultsVisibility(visibility: ResultsVisibility, adminId: string) {
  const { error } = await supabase
    .from('election_settings')
    .update({ value: JSON.stringify(visibility) })
    .eq('key', 'results_visibility');

  if (!error) {
    await logAdminAction(adminId, 'UPDATE_RESULTS_VISIBILITY', { visibility });
  }
  return { error };
}

export async function fetchStatistics() {
  const [candidates, votes, students] = await Promise.all([
    supabase.from('candidates').select('id, name, vote_count, position'),
    supabase.from('votes').select('id', { count: 'exact' }),
    supabase.from('students').select('id', { count: 'exact' }),
  ]);

  return {
    candidates: candidates.data || [],
    totalVotes: votes.count || 0,
    totalStudents: students.count || 0,
    turnout: students.count ? ((votes.count || 0) / students.count) * 100 : 0,
  };
}

export async function searchCandidate(query: string) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .ilike('name', `%${query}%`);
  return { data, error };
}

export async function searchStudent(query: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`name.ilike.%${query}%,roll_no.ilike.%${query}%`);
  return { data, error };
}

export async function getAuditLogs(limit = 10) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, admins(email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data, error };
}

export async function exportVotesToCsv() {
  const { data: votes, error } = await supabase
    .from('votes')
    .select('*, candidates(name, position)');
  
  if (error) throw error;
  if (!votes?.length) return 'No votes found to export.';

  const header = 'Vote ID,Voter Email,Candidate Name,Position,Timestamp\n';
  const rows = votes.map(v => 
    `${v.id},${v.voter_email},"${(v.candidates as any).name}","${(v.candidates as any).position}",${v.created_at}`
  ).join('\n');

  return header + rows;
}
