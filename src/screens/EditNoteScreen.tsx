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
  Modal,
  FlatList,
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

interface PickerItem {
  label: string;
  value: number;
}

interface DropdownPickerProps {
  label: string;
  items: PickerItem[];
  selectedValue: number;
  onSelect: (value: number) => void;
  width?: number;
}

function DropdownPicker({ label, items, selectedValue, onSelect, width }: DropdownPickerProps) {
  const [visible, setVisible] = useState(false);
  const selected = items.find((i) => i.value === selectedValue);

  return (
    <View style={[pickerStyles.wrapper, width ? { width } : { flex: 1 }]}>
      <Text style={pickerStyles.label}>{label}</Text>
      <TouchableOpacity
        style={pickerStyles.button}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={pickerStyles.buttonText}>{selected?.label ?? '–'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={pickerStyles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={pickerStyles.modal}>
            <Text style={pickerStyles.modalTitle}>{label}</Text>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.value)}
              style={pickerStyles.list}
              initialScrollIndex={Math.max(0, items.findIndex((i) => i.value === selectedValue))}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    pickerStyles.option,
                    item.value === selectedValue && pickerStyles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.optionText,
                      item.value === selectedValue && pickerStyles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <MaterialCommunityIcons name="check" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: {},
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '80%',
    maxHeight: '60%',
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 48,
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 16,
    color: '#334155',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#2563EB',
  },
});

function buildYearItems(): PickerItem[] {
  const now = new Date().getFullYear();
  const items: PickerItem[] = [];
  for (let y = now; y <= now + 5; y++) {
    items.push({ label: String(y), value: y });
  }
  return items;
}

function buildMonthItems(): PickerItem[] {
  return MONTHS_HU.map((name, i) => ({ label: name, value: i + 1 }));
}

function buildDayItems(year: number, month: number): PickerItem[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const items: PickerItem[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayName = DAYS_HU[date.getDay()];
    items.push({ label: `${d}. (${dayName})`, value: d });
  }
  return items;
}

function buildHourItems(): PickerItem[] {
  const items: PickerItem[] = [];
  for (let h = 0; h <= 23; h++) {
    items.push({ label: `${String(h).padStart(2, '0')} óra`, value: h });
  }
  return items;
}

function buildMinuteItems(): PickerItem[] {
  const items: PickerItem[] = [];
  for (let m = 0; m <= 59; m += 5) {
    items.push({ label: `${String(m).padStart(2, '0')} perc`, value: m });
  }
  return items;
}

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

  const [year, setYear] = useState(tomorrow.getFullYear());
  const [month, setMonth] = useState(tomorrow.getMonth() + 1);
  const [day, setDay] = useState(tomorrow.getDate());
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

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
        setYear(d.getFullYear());
        setMonth(d.getMonth() + 1);
        setDay(d.getDate());
        setHour(d.getHours());
        setMinute(d.getMinutes());
      }
    }
  };

  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    const maxDay = new Date(year, newMonth, 0).getDate();
    if (day > maxDay) setDay(maxDay);
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const maxDay = new Date(newYear, month, 0).getDate();
    if (day > maxDay) setDay(maxDay);
  };

  const getSelectedDate = (): Date => {
    return new Date(year, month - 1, day, hour, minute);
  };

  const getDatePreview = (): string => {
    const date = getSelectedDate();
    const dayName = DAYS_HU[date.getDay()];
    const monthName = MONTHS_HU[date.getMonth()];
    return `${date.getFullYear()}. ${monthName} ${date.getDate()}. (${dayName}) ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const isDateValid = (): boolean => {
    return getSelectedDate().getTime() > Date.now();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Hiba', 'Adj meg egy nevet az emlékeztetőnek!');
      return;
    }

    const date = getSelectedDate();
    if (date.getTime() <= Date.now()) {
      Alert.alert('Hiba', 'Az időpont a jövőben kell legyen!');
      return;
    }

    let notificationId: string | null = null;

    if (existingNotificationId) {
      await cancelReminder(existingNotificationId);
    }

    try {
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
    } catch (e) {
      // notification scheduling failed, continue saving
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
      Alert.alert('Hiba', 'Nem sikerült menteni. Próbáld újra!');
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
              <DropdownPicker
                label="Év"
                items={buildYearItems()}
                selectedValue={year}
                onSelect={handleYearChange}
              />
              <View style={{ width: 8 }} />
              <DropdownPicker
                label="Hónap"
                items={buildMonthItems()}
                selectedValue={month}
                onSelect={handleMonthChange}
              />
              <View style={{ width: 8 }} />
              <DropdownPicker
                label="Nap"
                items={buildDayItems(year, month)}
                selectedValue={day}
                onSelect={setDay}
              />
            </View>

            <View style={styles.timeRow}>
              <DropdownPicker
                label="Óra"
                items={buildHourItems()}
                selectedValue={hour}
                onSelect={setHour}
              />
              <Text style={styles.timeColon}>:</Text>
              <DropdownPicker
                label="Perc"
                items={buildMinuteItems()}
                selectedValue={minute}
                onSelect={setMinute}
              />
            </View>

            <View style={styles.previewRow}>
              <MaterialCommunityIcons
                name={isDateValid() ? 'calendar-check' : 'calendar-alert'}
                size={18}
                color={isDateValid() ? '#16A34A' : '#EF4444'}
              />
              <Text style={[styles.previewText, !isDateValid() && styles.previewTextError]}>
                {isDateValid() ? getDatePreview() : 'Válassz jövőbeli időpontot!'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!isDateValid() || !title.trim()) && styles.submitButtonDisabled]}
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
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '800',
    color: '#475569',
    paddingHorizontal: 8,
    paddingBottom: 12,
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
