import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types';

const NOTES_KEY = 'elnefeledd_notes';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};

export const getAllNotes = async (): Promise<Note[]> => {
  const json = await AsyncStorage.getItem(NOTES_KEY);
  if (!json) return [];
  const notes: Note[] = JSON.parse(json);
  return notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
};

export const saveNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> => {
  const notes = await getAllNotes();
  const now = Date.now();
  const newNote: Note = {
    ...note,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  notes.push(newNote);
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return newNote;
};

export const updateNote = async (note: Note): Promise<Note> => {
  const notes = await getAllNotes();
  const index = notes.findIndex((n) => n.id === note.id);
  if (index === -1) throw new Error('Note not found');
  const updated = { ...note, updatedAt: Date.now() };
  notes[index] = updated;
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return updated;
};

export const deleteNote = async (id: string): Promise<void> => {
  const notes = await getAllNotes();
  const filtered = notes.filter((n) => n.id !== id);
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
};

export const getNoteById = async (id: string): Promise<Note | null> => {
  const notes = await getAllNotes();
  return notes.find((n) => n.id === id) || null;
};
