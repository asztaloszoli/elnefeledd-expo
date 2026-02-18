export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  reminderTime: number | null;
  notificationId: string | null;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

export type NoteColor =
  | '#FFFFFF'
  | '#FEF3C7'
  | '#DCFCE7'
  | '#DBEAFE'
  | '#FCE7F3'
  | '#F3E8FF'
  | '#FFEDD5';

export const NOTE_COLORS: NoteColor[] = [
  '#FFFFFF',
  '#FEF3C7',
  '#DCFCE7',
  '#DBEAFE',
  '#FCE7F3',
  '#F3E8FF',
  '#FFEDD5',
];
