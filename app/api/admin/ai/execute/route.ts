import { NextResponse } from 'next/server';
import { 
  updateElectionStatus, 
  updateResultsVisibility, 
  fetchStatistics, 
  searchCandidate, 
  searchStudent,
  getAuditLogs,
  exportVotesToCsv,
  logAdminAction
} from '@/lib/admin-actions';

export async function POST(req: Request) {
  try {
    const { action, params, adminId } = await req.json();

    switch (action) {
      case 'OPEN_ELECTION': {
        const { error } = await updateElectionStatus('open', adminId);
        if (error) throw error;
        return NextResponse.json({ message: 'Election is now OPEN. Students can start voting.' });
      }
      case 'CLOSE_ELECTION': {
        const { error } = await updateElectionStatus('closed', adminId);
        if (error) throw error;
        return NextResponse.json({ message: 'Election is now CLOSED. Voting has been disabled.' });
      }
      case 'PAUSE_ELECTION': {
        const { error } = await updateElectionStatus('paused', adminId);
        if (error) throw error;
        return NextResponse.json({ message: 'Election is now PAUSED. Voting is temporarily suspended.' });
      }
      case 'SCHEDULE_ELECTION': {
        const { error } = await updateElectionStatus('scheduled', adminId);
        if (error) throw error;
        return NextResponse.json({ message: 'Election has been set to SCHEDULED status.' });
      }
      case 'PUBLISH_RESULTS': {
        const { error } = await updateResultsVisibility('visible', adminId);
        if (error) throw error;
        return NextResponse.json({ message: 'Election results are now PUBLISHED and visible to the public.' });
      }
      case 'HIDE_RESULTS': {
        const { error } = await updateResultsVisibility('hidden', adminId);
        if (error) throw error;
        return NextResponse.json({ message: 'Election results are now HIDDEN from public view.' });
      }
      case 'SHOW_STATISTICS': {
        const stats = await fetchStatistics();
        const topCandidates = [...stats.candidates]
          .sort((a, b) => b.vote_count - a.vote_count)
          .slice(0, 3)
          .map(c => `- ${c.name} (${c.position}): ${c.vote_count} votes`)
          .join('\n');
          
        return NextResponse.json({ 
          message: `Election Statistics:\n- Total Students: ${stats.totalStudents}\n- Total Votes Cast: ${stats.totalVotes}\n- Turnout: ${stats.turnout.toFixed(2)}%\n\nTop Candidates:\n${topCandidates || 'No votes yet.'}`
        });
      }
      case 'SEARCH_CANDIDATE': {
        const { data, error } = await searchCandidate(params.query);
        if (error) throw error;
        if (!data?.length) return NextResponse.json({ message: `No candidates found matching "${params.query}".` });
        const list = data.map(c => `- ${c.name} (${c.position})`).join('\n');
        return NextResponse.json({ message: `Found ${data.length} candidate(s):\n${list}` });
      }
      case 'SEARCH_STUDENT': {
        const { data, error } = await searchStudent(params.query);
        if (error) throw error;
        if (!data?.length) return NextResponse.json({ message: `No students found matching "${params.query}".` });
        const list = data.map(s => `- ${s.name} (${s.roll_no}) - Voted: ${s.has_voted ? 'Yes' : 'No'}`).join('\n');
        return NextResponse.json({ message: `Found ${data.length} student(s):\n${list}` });
      }
      case 'SHOW_LOGS': {
        const { data, error } = await getAuditLogs(5);
        if (error) throw error;
        if (!data?.length) return NextResponse.json({ message: 'No audit logs found.' });
        const list = data.map(l => `- [${new Date(l.created_at).toLocaleString()}] ${l.action}`).join('\n');
        return NextResponse.json({ message: `Recent Administrative Activity:\n${list}` });
      }
      case 'EXPORT_CSV': {
        const csv = await exportVotesToCsv();
        await logAdminAction(adminId, 'EXPORT_CSV', {});
        return NextResponse.json({ message: 'CSV Data Generated Successfully:\n\n' + csv });
      }
      case 'CREATE_ANNOUNCEMENT': {
        await logAdminAction(adminId, 'CREATE_ANNOUNCEMENT', { message: params.query });
        return NextResponse.json({ message: `Announcement Broadcasted: "${params.query}"` });
      }
      default:
        return NextResponse.json({ message: 'Unknown action requested.' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Execution Error:', error);
    return NextResponse.json({ message: `Error: ${error instanceof Error ? error.message : 'Execution failed'}` }, { status: 500 });
  }
}
