import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Note } from '../types';
import { saveNote, updateNote, getNoteById } from '../services/storageService';
import {
  scheduleReminder,
  cancelReminder,
  registerForPushNotifications,
} from '../services/notificationService';

const DAYS_HU = ['Vas', 'Hét', 'Kedd', 'Sze', 'Csüt', 'Pén', 'Szo'];
const MONTHS_HU = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];

interface Props {
  navigation: any;
  route: any;
}

export default function EditNoteScreen({ navigation, route }: Props) {
  const noteId = route.params?.noteId;
  const isEditing = !!noteId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [existingNotificationId, setExistingNotificationId] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const [year, setYear] = useState(String(tomorrow.getFullYear()));
  const [month, setMonth] = useState(String(tomorrow.getMonth() + 1));
  const [day, setDay] = useState(String(tomorrow.getDate()));
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId]);

  const loadNote = async () => {
    const note = await getNoteById(noteId);
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setExistingNotificationId(note.notificationId);
      if (note.reminderTime) {
        const d = new Date(note.reminderTime);
        setYear(String(d.getFullYear()));
        setMonth(String(d.getMonth() + 1));
        setDay(String(d.getDate()));
        setHour(String(d.getHours()));
        setMinute(String(d.getMinutes()).padStart(2, '0'));
      }
    }
  };

  const getSelectedDate = (): Date | null => {
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    const h = parseInt(hour);
    const min = parseInt(minute);

    if (!y || !m || !d || isNaN(h) || isNaN(min)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;

    return new Date(y, m - 1, d, h, min);
  };

  const getDatePreview = (): string => {
    const date = getSelectedDate();
    if (!date) return 'Adj meg érvényes dátumot';
    const dayName = DAYS_HU[date.getDay()];
    const monthName = MONTHS_HU[date.getMonth()];
    return `${date.getFullYear()}. ${monthName} ${date.getDate()}. (${dayName}) ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const isDateValid = (): boolean => {
    const date = getSelectedDate();
    return date !== null && date.getTime() > Date.now();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Hiba', 'Adj meg egy nevet az emlékeztetőnek!');
      return;
    }

    const date = getSelectedDate();
    if (!date) {
      Alert.alert('Hiba', 'Adj meg érvényes dátumot és időt!');
      return;
    }
    if (date.getTime() <= Date.now()) {
      Alert.alert('Hiba', 'Az időpont a jövőben kell legyen!');
      return;
    }

    let notificationId: string | null = null;

    if (existingNotificationId) {
      await cancelReminder(existingNotificationId);
    }

    const hasPermission = await registerForPushNotifications();
    if (hasPermission) {
      notificationId = await scheduleReminder(
        title.trim(),
        content.trim() || 'Emlékeztető!',
        date
      );
    } else {
      Alert.alert('Figyelem', 'Az emlékeztetőkhöz engedélyezd az értesítéseket a beállításokban!');
    }

    try {
      if (isEditing) {
        const existing = await getNoteById(noteId);
        if (existing) {
          await updateNote({
            ...existing,
            title: title.trim(),
            content: content.trim(),
            reminderTime: date.getTime(),
            notificationId,
          });
        }
      } else {
        await saveNote({
          title: title.trim(),
          content: content.trim(),
          color: '#FFFFFF',
          reminderTime: date.getTime(),
          notificationId,
          pinned: false,
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült menteni');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Szerkesztés' : 'Új emlékeztető'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Mire emlékeztesselek?</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="pl. Fogorvos, Szülinap, Határidő..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Megjegyzés (opcionális)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Részletek, cím, telefonszám..."
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Mikor?</Text>
          <View style={styles.dateCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateFieldLarge}>
                <Text style={styles.dateFieldLabel}>Év</Text>
                <TextInput
                  style={styles.dateInput}
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <Text style={styles.dateSeparator}>.</Text>
              <View style={styles.dateFieldSmall}>
                <Text style={styles.dateFieldLabel}>Hó</Text>
                <TextInput
                  style={styles.dateInput}
                  value={month}
                  onChangeText={setMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateSeparator}>.</Text>
              <View style={styles.dateFieldSmall}>
                <Text style={styles.dateFieldLabel}>Nap</Text>
                <TextInput
                  style={styles.dateInput}
                  value={day}
                  onChangeText={setDay}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.timeRow}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#64748B" />
              <View style={styles.timeFieldWrap}>
                <TextInput
                  style={styles.timeInput}
                  value={hour}
                  onChangeText={setHour}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeFieldWrap}>
                <TextInput
                  style={styles.timeInput}
                  value={minute}
                  onChangeText={setMinute}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.previewRow}>
              <MaterialCommunityIcons
                name={isDateValid() ? 'calendar-check' : 'calendar-alert'}
                size={18}
                color={isDateValid() ? '#16A34A' : '#EF4444'}
              />
              <Text style={[styles.previewText, !isDateValid() && styles.previewTextError]}>
                {getDatePreview()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !isDateValid() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isDateValid() || !title.trim()}
          >
            <MaterialCommunityIcons name="bell-plus" size={22} color="#FFF" />
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Emlékeztető frissítése' : 'Emlékeztető beállítása'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteInput: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    minHeight: 70,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  dateFieldLarge: {
    flex: 2,
    alignItems: 'center',
  },
  dateFieldSmall: {
    flex: 1,
    alignItems: 'center',
  },
  dateFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dateSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CBD5E1',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  timeFieldWrap: {
    width: 64,
  },
  timeInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  timeColon: {
    fontSize: 28,
    fontWeight: '800',
    color: '#475569',
    paddingHorizontal: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
    flex: 1,
  },
  previewTextError: {
    color: '#EF4444',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
