export type BookTone = 'amber' | 'amberDark' | 'ember' | 'ink' | 'paper';

export interface ShelfBook {
  width: number;
  height: number;
  tone: BookTone;
  tilt?: number;
  /** The one book that wakes the owl */
  secret?: boolean;
}

export const shelfBooks: ShelfBook[] = [
{ width: 22, height: 70, tone: 'ink' },
{ width: 16, height: 82, tone: 'amber' },
{ width: 26, height: 64, tone: 'ember' },
{ width: 18, height: 76, tone: 'paper' },
{ width: 14, height: 88, tone: 'ink' },
{ width: 24, height: 72, tone: 'amberDark', tilt: -8, secret: true },
{ width: 12, height: 20, tone: 'paper' },
{ width: 20, height: 80, tone: 'ember' },
{ width: 16, height: 68, tone: 'amber' },
{ width: 24, height: 84, tone: 'ink' },
{ width: 18, height: 62, tone: 'paper' },
{ width: 14, height: 74, tone: 'amberDark' },
{ width: 22, height: 78, tone: 'ink' },
{ width: 18, height: 66, tone: 'ember', tilt: 7 }];