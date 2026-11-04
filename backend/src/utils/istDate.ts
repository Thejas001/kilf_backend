const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * The festival runs in India, so "which day is it" is always an IST calendar
 * day. Returns a Date at UTC midnight of that day, which is how Prisma reads
 * and writes `@db.Date` columns.
 */
export function toIstDate(date: Date): Date {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

/** Whole years between a date of birth and `on` (both treated as calendar dates). */
export function ageOn(dateOfBirth: Date, on: Date): number {
  const dob = toIstDate(dateOfBirth);
  const ref = toIstDate(on);
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    ref.getUTCMonth() < dob.getUTCMonth() ||
    (ref.getUTCMonth() === dob.getUTCMonth() && ref.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
