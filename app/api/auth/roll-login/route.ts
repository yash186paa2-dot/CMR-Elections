import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  normalizeRollNo,
  rollStudentAuthEmail,
  validateRollLoginInput,
} from '@/lib/student-auth';

export const runtime = 'nodejs';

type StudentRow = {
  id: string;
  roll_no: string;
  dob: string;
  name: string;
  class: string;
  has_voted: boolean;
  auth_user_id: string | null;
};

async function ensureAuthUserForStudent(
  admin: ReturnType<typeof getSupabaseAdmin>,
  student: StudentRow
): Promise<string> {
  if (student.auth_user_id) {
    return student.auth_user_id;
  }

  const authEmail = rollStudentAuthEmail(student.roll_no);
  const metadata = {
    login_type: 'roll_student',
    roll_no: student.roll_no,
    student_id: student.id,
    name: student.name,
    class: student.class,
  };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    user_metadata: metadata,
  });

  let userId = created.user?.id;

  if (createError) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      throw listError;
    }

    const existing = listed.users.find(
      (user) => user.email?.toLowerCase() === authEmail.toLowerCase()
    );

    if (!existing) {
      throw createError;
    }

    userId = existing.id;

    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: {
        ...existing.user_metadata,
        ...metadata,
      },
    });
  }

  if (!userId) {
    throw new Error('Unable to create or resolve auth user for student.');
  }

  const { error: linkError } = await admin
    .from('students')
    .update({ auth_user_id: userId })
    .eq('id', student.id);

  if (linkError) {
    throw linkError;
  }

  return userId;
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const rollNoInput = typeof (body as { roll_no?: unknown }).roll_no === 'string'
      ? (body as { roll_no: string }).roll_no
      : '';
    const dobInput = typeof (body as { dob?: unknown }).dob === 'string'
      ? (body as { dob: string }).dob
      : '';

    const validation = validateRollLoginInput(rollNoInput, dobInput);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.message,
          fieldErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const normalizedRoll = normalizeRollNo(validation.roll_no);

    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id, roll_no, dob, name, class, has_voted, auth_user_id')
      .eq('roll_no', normalizedRoll)
      .maybeSingle();

    if (studentError) {
      console.error('Student lookup failed:', studentError);
      return NextResponse.json(
        { error: 'Unable to verify credentials. Please try again.' },
        { status: 500 }
      );
    }

    if (!student || student.dob !== validation.dob) {
      return NextResponse.json(
        { error: 'Invalid roll number or date of birth.' },
        { status: 401 }
      );
    }

    await ensureAuthUserForStudent(admin, student as StudentRow);
    const authEmail = rollStudentAuthEmail(normalizedRoll);

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authEmail,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('Session link generation failed:', linkError);
      return NextResponse.json(
        { error: 'Unable to start your session. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      email: authEmail,
      token_hash: linkData.properties.hashed_token,
      student: {
        id: student.id,
        roll_no: student.roll_no,
        name: student.name,
      },
    });
  } catch (error) {
    console.error('Roll login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
