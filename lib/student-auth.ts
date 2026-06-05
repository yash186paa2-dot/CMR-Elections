/** Internal auth email for roll-number students (not used for inbox delivery). */
export function rollStudentAuthEmail(rollNo: string): string {
  const normalized = normalizeRollNo(rollNo);
  return `roll.${normalized}@voters.cmr.internal`;
}

export function normalizeRollNo(rollNo: string): string {
  return rollNo.trim().toUpperCase();
}

export type RollLoginFieldErrors = {
  roll_no?: string;
  dob?: string;
};

export type RollLoginValidationResult =
  | { valid: true; roll_no: string; dob: string }
  | { valid: false; errors: RollLoginFieldErrors; message: string };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateRollLoginInput(
  rollNo: string,
  dob: string
): RollLoginValidationResult {
  const errors: RollLoginFieldErrors = {};
  const trimmedRoll = rollNo.trim();
  const trimmedDob = dob.trim();

  if (!trimmedRoll) {
    errors.roll_no = 'Roll number is required.';
  } else if (trimmedRoll.length < 3) {
    errors.roll_no = 'Roll number must be at least 3 characters.';
  } else if (!/^[A-Za-z0-9/-]+$/.test(trimmedRoll)) {
    errors.roll_no = 'Roll number can only contain letters, numbers, / and -.';
  }

  if (!trimmedDob) {
    errors.dob = 'Date of birth is required.';
  } else if (!ISO_DATE_PATTERN.test(trimmedDob)) {
    errors.dob = 'Use the date picker to select your date of birth.';
  } else {
    const parsed = new Date(`${trimmedDob}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      errors.dob = 'Date of birth is not valid.';
    } else {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (parsed > today) {
        errors.dob = 'Date of birth cannot be in the future.';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      errors,
      message: 'Please fix the highlighted fields.',
    };
  }

  return {
    valid: true,
    roll_no: normalizeRollNo(trimmedRoll),
    dob: trimmedDob,
  };
}

export function isRollStudentUser(user: { user_metadata?: Record<string, unknown> } | null): boolean {
  return user?.user_metadata?.login_type === 'roll_student';
}
