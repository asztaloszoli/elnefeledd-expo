import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Note } from '../types';
import { getAllNotes, deleteNote } from '../services/storageService';
import { cancelReminder } from '../services/notificationService';
import { triggerTestAlarm, stopAlarm } from '../../modules/expo-ringtone';
import { CARD_ACCENT, getGreeting, ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const DAYS_HU = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
const MONTHS_HU = ['jan.', 'feb.', 'már.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const { mode, colors, toggle } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [reminders, setReminders] = useState<Note[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    const data = await getAllNotes();
    const sorted = data.sort((a, b) => {
      const aTime = a.reminderTime || 0;
      const bTime = b.reminderTime || 0;
      return aTime - bTime;
    });
    setReminders(sorted);
  };

  const handleDelete = (item: Note) => {
    Alert.alert('Törlés', `Törlöd: "${item.title}"?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: async () => {
          if (item.notificationId) {
            await cancelReminder(item.notificationId);
          }
          await deleteNote(item.id);
          loadReminders();
        },
      },
    ]);
  };

  const formatReminderDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const dayName = DAYS_HU[d.getDay()];
    const monthName = MONTHS_HU[d.getMonth()];
    return `${d.getFullYear()}. ${monthName} ${d.getDate()}. (${dayName})`;
  };

  const formatReminderTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getDaysUntil = (timestamp: number): string => {
    const now = Date.now();
    const diff = timestamp - now;
    if (diff < 0) return 'Lejárt';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days === 0 && hours === 0) return 'Hamarosan';
    if (days === 0) return `${hours} óra múlva`;
    if (days === 1) return 'Holnap';
    if (days < 7) return `${days} nap múlva`;
    if (days < 30) return `${Math.floor(days / 7)} hét múlva`;
    return `${Math.floor(days / 30)} hónap múlva`;
  };

  const isExpired = (timestamp: number) => timestamp < Date.now();

  const upcoming = reminders.filter((r) => r.reminderTime && !isExpired(r.reminderTime));
  const expired = reminders.filter((r) => r.reminderTime && isExpired(r.reminderTime));
  const greeting = getGreeting();

  const renderReminder = ({ item, index }: { item: Note; index?: number }) => {
    if (!item.reminderTime) return null;
    const exp = isExpired(item.reminderTime);
    const accent = exp ? colors.textMuted : CARD_ACCENT(index ?? 0, colors);

    return (
      <TouchableOpacity
        style={[s.card, exp && s.cardExpired]}
        onPress={() => navigation.navigate('EditNote', { noteId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[s.accentStrip, { backgroundColor: accent }]} />
        <View style={s.cardBody}>
          <View style={s.cardHeader}>
            <View style={[s.iconCircle, { backgroundColor: accent + '25' }]}>
              <MaterialCommunityIcons
                name={exp ? 'bell-off-outline' : 'bell-ring-outline'}
                size={20}
                color={accent}
              />
            </View>
            <View style={s.cardTitleWrap}>
              <Text style={[s.cardTitle, exp && s.cardTitleExpired]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.content ? (
                <Text style={s.cardNote} numberOfLines={1}>{item.content}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={s.deleteBtn}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.cardFooter}>
            <View style={s.cardDateRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={s.cardDate}>{formatReminderDate(item.reminderTime)}</Text>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
              <Text style={s.cardDate}>{formatReminderTime(item.reminderTime)}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: accent + '20' }]}>
              <Text style={[s.badgeText, { color: accent }]}>
                {getDaysUntil(item.reminderTime)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[colors.bg, colors.bgEnd] as const}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.flex}>
        <View style={s.header}>
          <LinearGradient
            colors={colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.headerGradientLine}
          />
          <View style={s.headerContent}>
            <View style={s.headerLeft}>
              <Text style={s.greeting}>{greeting.emoji} {greeting.text}</Text>
              <Text style={s.headerTitle}>El ne felejtsd!</Text>
              <Text style={s.headerSubtitle}>
                {upcoming.length === 0
                  ? 'Nincs aktív emlékeztető'
                  : `${upcoming.length} aktív emlékeztető`}
              </Text>
            </View>
            <TouchableOpacity onPress={toggle} style={s.themeBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons
                name={mode === 'dark' ? 'white-balance-sunny' : 'moon-waning-crescent'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            {/* Teszt gombok — kikommentelve, később szükség lehet rá
            <View style={s.headerActions}>
              <TouchableOpacity
                style={s.testBtn}
                onPress={async () => {
                  try {
                    await triggerTestAlarm();
                    Alert.alert('Teszt', 'Alarm beállítva 5 mp múlva!\nZárd be az appot és várd meg.');
                  } catch (e: any) {
                    Alert.alert('Hiba', e.message || String(e));
                  }
                }}
              >
                <MaterialCommunityIcons name="bell-ring" size={16} color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.testBtn}
                onPress={async () => { try { await stopAlarm(); } catch (_) {} }}
              >
                <MaterialCommunityIcons name="stop-circle" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
            */}
          </View>
        </View>

        {reminders.length === 0 ? (
          <View style={s.emptyContainer}>
            <LinearGradient
              colors={colors.gradientPrimary}
              style={s.emptyIconWrap}
            >
              <MaterialCommunityIcons name="bell-plus-outline" size={44} color={colors.white} />
            </LinearGradient>
            <Text style={s.emptyTitle}>Nincs emlékeztetőd</Text>
            <Text style={s.emptySubtitle}>
              {'Koppints az alábbi gombra\nés állítsd be az első emlékeztetődet'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditNote', {})}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.emptyButton}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                <Text style={s.emptyButtonText}>Új emlékeztető</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={upcoming}
            renderItem={({ item, index }) => renderReminder({ item, index })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              upcoming.length > 0 ? (
                <View style={s.sectionRow}>
                  <LinearGradient
                    colors={colors.gradientPrimary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.sectionDot}
                  />
                  <Text style={s.sectionLabel}>Közelgő</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              expired.length > 0 ? (
                <View>
                  <View style={s.sectionRow}>
                    <View style={[s.sectionDot, { backgroundColor: colors.textMuted }]} />
                    <Text style={s.sectionLabel}>Lejárt</Text>
                  </View>
                  {expired.map((item, i) => (
                    <View key={item.id}>{renderReminder({ item, index: i })}</View>
                  ))}
                </View>
              ) : null
            }
          />
        )}

        {reminders.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditNote', {})}
            activeOpacity={0.85}
            style={s.fabWrap}
          >
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.fab}
            >
              <MaterialCommunityIcons name="plus" size={28} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: { paddingBottom: 4 },
    headerGradientLine: { height: 3, borderRadius: 2 },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerLeft: {},
    greeting: { fontSize: 14, color: c.textSecondary, marginBottom: 2 },
    headerTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    headerSubtitle: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    themeBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
    },
    headerActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    testBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      marginTop: 8,
    },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
      flexDirection: 'row',
      backgroundColor: c.bgCard,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    cardExpired: { opacity: 0.5 },
    accentStrip: { width: 4 },
    cardBody: { flex: 1, padding: 14, paddingLeft: 12 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardTitleWrap: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    cardTitleExpired: { color: c.textMuted, textDecorationLine: 'line-through' },
    cardNote: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    deleteBtn: { padding: 6, marginLeft: 8 },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    cardDate: { fontSize: 12, color: c.textSecondary, marginRight: 4 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    emptySubtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 28,
      paddingVertical: 16,
      marginTop: 28,
    },
    emptyButtonText: { color: c.white, fontSize: 16, fontWeight: '700' },
    fabWrap: { position: 'absolute', right: 20, bottom: 28 },
    fab: {
      width: 60,
      height: 60,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
  });
