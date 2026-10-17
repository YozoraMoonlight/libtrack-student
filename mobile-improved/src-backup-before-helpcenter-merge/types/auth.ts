export interface Student {
  lrn: string;
  name: string;
  gradeSection: string;
  /** Live: shown on the registration review card. */
  schoolName?: string | null;
  schoolCode?: string | null;
  gradeLevel?: string | null;
  section?: string | null;
}