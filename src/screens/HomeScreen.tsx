import React, { useState, useCallback } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Note } from '../types';
import { getAllNotes, deleteNote } from '../services/storageService';
import { cancelReminder } from '../services/notificationService';
import { playAlarmSound, stopRingtone } from '../../modules/expo-ringtone';

const DAYS_HU = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
const MONTHS_HU = ['jan.', 'feb.', 'már.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
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

  const renderReminder = ({ item }: { item: Note }) => {
    if (!item.reminderTime) return null;
    const expired = isExpired(item.reminderTime);

    return (
      <TouchableOpacity
        style={[styles.card, expired && styles.cardExpired]}
        onPress={() => navigation.navigate('EditNote', { noteId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconWrap, expired ? styles.iconExpired : styles.iconActive]}>
            <MaterialCommunityIcons
              name={expired ? 'bell-off-outline' : 'bell-ring-outline'}
              size={22}
              color={expired ? '#94A3B8' : '#2563EB'}
            />
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={[styles.cardTitle, expired && styles.cardTitleExpired]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.content ? (
            <Text style={styles.cardNote} numberOfLines={1}>{item.content}</Text>
          ) : null}
          <Text style={styles.cardDate}>
            {formatReminderDate(item.reminderTime)} · {formatReminderTime(item.reminderTime)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.badge, expired ? styles.badgeExpired : styles.badgeActive]}>
            {getDaysUntil(item.reminderTime)}
          </Text>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>El ne felejtsd!</Text>
          <Text style={styles.headerSubtitle}>
            {upcoming.length === 0
              ? 'Nincs aktív emlékeztető'
              : `${upcoming.length} aktív emlékeztető`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
            onPress={() => playAlarmSound(10000)}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>🔊 Teszt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
            onPress={() => stopRingtone()}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>⏹ Stop</Text>
          </TouchableOpacity>
        </View>
      </View>

      {reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="bell-plus-outline" size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Nincs emlékeztetőd</Text>
          <Text style={styles.emptySubtitle}>
            {'Koppints az alábbi gombra\nés állítsd be az első emlékeztetődet'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('EditNote', {})}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
            <Text style={styles.emptyButtonText}>Új emlékeztető</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={upcoming}
          renderItem={renderReminder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            upcoming.length > 0 ? (
              <Text style={styles.sectionLabel}>Közelgő</Text>
            ) : null
          }
          ListFooterComponent={
            expired.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>Lejárt</Text>
                {expired.map((item) => (
                  <View key={item.id}>{renderReminder({ item })}</View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      {reminders.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EditNote', {})}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardExpired: {
    opacity: 0.6,
  },
  cardLeft: {
    marginRight: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconActive: {
    backgroundColor: '#EFF6FF',
  },
  iconExpired: {
    backgroundColor: '#F1F5F9',
  },
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardTitleExpired: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardNote: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeActive: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  badgeExpired: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
