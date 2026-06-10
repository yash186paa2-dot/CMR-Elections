import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

type EnsureStudentResponse =
  | {
      ok: true;
      auth_user_id: string;
      action: 'already_linked';
      student: { id: string; auth_user_id: string | null; roll_no: string | null };
    }
  | {
      ok: true;
      auth_user_id: string;
      action: 'linked_existing';
      student: { id: string; auth_user_id: string | null; roll_no: string | null };
    }
  | {
      ok: true;
      auth_user_id: string;
      action: 'created';
      student: { id: string; auth_user_id: string | null; roll_no: string | null };
    }
  | { ok: false; error: string };

function normalizeBearerToken(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
}

export async function POST(request: Request) {
  try {
    const token = normalizeBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json<EnsureStudentResponse>({ ok: false, error: 'Missing auth token.' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json<EnsureStudentResponse>(
        { ok: false, error: userError?.message || 'Invalid session.' },
        { status: 401 }
      );
    }

    const user = userData.user;
    const authUserId = user.id;

    const rollNo = typeof user.user_metadata?.roll_no === 'string' ? String(user.user_metadata.roll_no) : null;
    const studentId =
      typeof user.user_metadata?.student_id === 'string' ? String(user.user_metadata.student_id) : null;

    const { data: byAuth, error: byAuthError } = await admin
      .from('students')
      .select('id, auth_user_id, roll_no')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (byAuthError) {
      return NextResponse.json<EnsureStudentResponse>(
        { ok: false, error: byAuthError.message },
        { status: 500 }
      );
    }

    if (byAuth) {
      return NextResponse.json<EnsureStudentResponse>({
        ok: true,
        auth_user_id: authUserId,
        action: 'already_linked',
        student: byAuth,
      });
    }

    let lookup:
      | { id: string; auth_user_id: string | null; roll_no: string | null }
      | null = null;

    if (studentId) {
      const { data, error } = await admin
        .from('students')
        .select('id, auth_user_id, roll_no')
        .eq('id', studentId)
        .maybeSingle();
      if (error) {
        return NextResponse.json<EnsureStudentResponse>({ ok: false, error: error.message }, { status: 500 });
      }
      lookup = data ?? null;
    }

    if (!lookup && rollNo) {
      const { data, error } = await admin
        .from('students')
        .select('id, auth_user_id, roll_no')
        .eq('roll_no', rollNo.trim().toUpperCase())
        .maybeSingle();
      if (error) {
        return NextResponse.json<EnsureStudentResponse>({ ok: false, error: error.message }, { status: 500 });
      }
      lookup = data ?? null;
    }

    if (lookup) {
      if (lookup.auth_user_id && lookup.auth_user_id !== authUserId) {
        return NextResponse.json<EnsureStudentResponse>(
          { ok: false, error: 'Student record is already linked to a different user.' },
          { status: 409 }
        );
      }

      const { data: updated, error: updateError } = await admin
        .from('students')
        .update({ auth_user_id: authUserId })
        .eq('id', lookup.id)
        .select('id, auth_user_id, roll_no')
        .maybeSingle();

      if (updateError) {
        return NextResponse.json<EnsureStudentResponse>(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json<EnsureStudentResponse>({
        ok: true,
        auth_user_id: authUserId,
        action: 'linked_existing',
        student: updated ?? lookup,
      });
    }

    const { data: inserted, error: insertError } = await admin
      .from('students')
      .insert({
        auth_user_id: authUserId,
        roll_no: rollNo ? rollNo.trim().toUpperCase() : null,
      })
      .select('id, auth_user_id, roll_no')
      .maybeSingle();

    if (insertError) {
      return NextResponse.json<EnsureStudentResponse>(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json<EnsureStudentResponse>({
      ok: true,
      auth_user_id: authUserId,
      action: 'created',
      student: inserted ?? {
        id: '',
        auth_user_id: authUserId,
        roll_no: rollNo ? rollNo.trim().toUpperCase() : null,
      },
    });
  } catch (error) {
    return NextResponse.json<EnsureStudentResponse>(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error.' },
      { status: 500 }
    );
  }
}
