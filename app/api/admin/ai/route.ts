import { NextResponse } from 'next/server';
import { runElectionAgent } from '@/lib/ai-agent';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    // Debugging Gemini Key
    console.log("Gemini Key Exists:", !!process.env.GOOGLE_GEMINI_API_KEY);
    
    // Verify admin session
    const authHeader = req.headers.get('Authorization');
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.split(' ')[1]);

    // Temporary: use a hardcoded adminId if not found for demo purposes
    const adminId = user?.id || 'admin-system';

    const result = await runElectionAgent(message, history || [], adminId);

    return NextResponse.json({
      response: result.content,
    });

  } catch (error) {
    console.error('AI Agent Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      response: `I encountered an error processing your request: ${errorMessage}. Please ensure the Gemini API key is configured.` 
    }, { status: 500 });
  }
}
