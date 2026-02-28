export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgEnd: string;
  bgCard: string;
  bgInput: string;
  gradientPrimary: readonly [string, string];
  gradientSecondary: readonly [string, string];
  accents: string[];
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  border: string;
  white: string;
  overlay: string;
  modalBg: string;
  statusBar: 'light' | 'dark';
}

export const DARK: ThemeColors = {
  bg: '#0B0B1E',
  bgEnd: '#1A1033',
  bgCard: 'rgba(28, 28, 58, 0.85)',
  bgInput: 'rgba(35, 35, 72, 0.9)',
  gradientPrimary: ['#7C3AED', '#EC4899'],
  gradientSecondary: ['#06B6D4', '#7C3AED'],
  accents: ['#7C3AED', '#EC4899', '#06B6D4', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'],
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  border: 'rgba(148, 163, 184, 0.12)',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
  modalBg: '#1C1C3A',
  statusBar: 'light',
};

export const LIGHT: ThemeColors = {
  bg: '#F0F0FA',
  bgEnd: '#E8E0F0',
  bgCard: 'rgba(255, 255, 255, 0.92)',
  bgInput: 'rgba(255, 255, 255, 0.95)',
  gradientPrimary: ['#7C3AED', '#EC4899'],
  gradientSecondary: ['#06B6D4', '#7C3AED'],
  accents: ['#7C3AED', '#EC4899', '#06B6D4', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E'],
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0891B2',
  border: 'rgba(15, 23, 42, 0.1)',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',
  modalBg: '#FFFFFF',
  statusBar: 'dark',
};

export const getTheme = (mode: ThemeMode): ThemeColors =>
  mode === 'dark' ? DARK : LIGHT;

export const CARD_ACCENT = (index: number, colors: ThemeColors) =>
  colors.accents[index % colors.accents.length];

export const getGreeting = (): { text: string; emoji: string } => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Jó reggelt', emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'Szép napot', emoji: '🌤️' };
  if (h >= 18 && h < 22) return { text: 'Jó estét', emoji: '🌙' };
  return { text: 'Szép álmokat', emoji: '✨' };
};
