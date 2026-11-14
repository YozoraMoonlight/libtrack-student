export interface Student {
  lrn: string;
  name: string;
  gradeSection: string;
  /** Live: shown on the registration review card. */
  schoolName?: string | null;
  schoolCode?: string | null;
  gradeLevel?: string | null;
  section?: string | null;
  /** Registry contact number, when the school stored one. */
  phone?: string | null;
  academicStrand?: string | null;
}