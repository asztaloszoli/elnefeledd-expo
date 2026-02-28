import React, { useState, useEffect, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Note } from '../types';
import { saveNote, updateNote, getNoteById } from '../services/storageService';
import {
  scheduleReminder,
  cancelReminder,
  registerForPushNotifications,
} from '../services/notificationService';
import { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
  const ps = useMemo(() => makePickerStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const selected = items.find((i) => i.value === selectedValue);

  return (
    <View style={[ps.wrapper, width ? { width } : { flex: 1 }]}>
      <Text style={ps.label}>{label}</Text>
      <TouchableOpacity
        style={ps.button}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={ps.buttonText}>{selected?.label ?? '–'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={ps.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={ps.modal}>
            <Text style={ps.modalTitle}>{label}</Text>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.value)}
              style={ps.list}
              initialScrollIndex={Math.max(0, items.findIndex((i) => i.value === selectedValue))}
              getItemLayout={(_, index) => ({ length: 60, offset: 60 * index, index })}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    ps.option,
                    item.value === selectedValue && ps.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      ps.optionText,
                      item.value === selectedValue && ps.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <MaterialCommunityIcons name="check" size={20} color="#EC4899" />
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

const makePickerStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrapper: {},
    label: { fontSize: 11, fontWeight: '600', color: c.textSecondary, marginBottom: 6, textAlign: 'center' },
    button: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bgInput, borderRadius: 12, paddingVertical: 12,
      paddingHorizontal: 6, borderWidth: 1, borderColor: c.border, gap: 2,
    },
    buttonText: { fontSize: 15, fontWeight: '700', color: c.textPrimary, flexShrink: 0 },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center' },
    modal: {
      backgroundColor: c.modalBg, borderRadius: 24, width: '90%', maxHeight: '60%',
      paddingTop: 20, paddingBottom: 10, borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary, textAlign: 'center', marginBottom: 12 },
    list: { paddingHorizontal: 12 },
    option: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, height: 56, marginBottom: 4,
    },
    optionSelected: { backgroundColor: 'rgba(124, 58, 237, 0.15)' },
    optionText: { fontSize: 18, color: c.textSecondary, textAlign: 'center', fontWeight: '600' },
    optionTextSelected: { fontWeight: '800', color: '#EC4899' },
  });

function buildYearItems(): PickerItem[] {
  const now = new Date().getFullYear();
  const items: PickerItem[] = [];
  for (let y = now; y <= now + 1; y++) {
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
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
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

  const canSubmit = isDateValid() && title.trim().length > 0;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[colors.bg, colors.bgEnd] as const}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.flex}>
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.header}>
            <LinearGradient
              colors={colors.gradientSecondary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.headerGradientLine}
            />
            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>
                {isEditing ? 'Szerkesztés' : 'Új emlékeztető'}
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          <ScrollView style={s.content} keyboardShouldPersistTaps="handled">
            <View style={s.inputGroup}>
              <View style={s.labelRow}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#EC4899" />
                <Text style={s.label}>Mire emlékeztesselek?</Text>
              </View>
              <TextInput
                style={s.titleInput}
                placeholder="pl. Fogorvos, Szülinap, Határidő..."
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <View style={s.inputGroup}>
              <View style={s.labelRow}>
                <MaterialCommunityIcons name="text-box-outline" size={16} color="#7C3AED" />
                <Text style={s.label}>Megjegyzés (opcionális)</Text>
              </View>
              <TextInput
                style={s.noteInput}
                placeholder="Részletek, cím, telefonszám..."
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={s.inputGroup}>
              <View style={s.labelRow}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#06B6D4" />
                <Text style={s.label}>Mikor?</Text>
              </View>
              <View style={s.dateCard}>
                <View style={s.dateRow}>
                  <DropdownPicker
                    label="Év"
                    items={buildYearItems()}
                    selectedValue={year}
                    onSelect={handleYearChange}
                    width={90}
                  />
                  <View style={{ width: 6 }} />
                  <DropdownPicker
                    label="Hónap"
                    items={buildMonthItems()}
                    selectedValue={month}
                    onSelect={handleMonthChange}
                  />
                  <View style={{ width: 6 }} />
                  <DropdownPicker
                    label="Nap"
                    items={buildDayItems(year, month)}
                    selectedValue={day}
                    onSelect={setDay}
                  />
                </View>

                <View style={s.timeRow}>
                  <DropdownPicker
                    label="Óra"
                    items={buildHourItems()}
                    selectedValue={hour}
                    onSelect={setHour}
                  />
                  <Text style={s.timeColon}>:</Text>
                  <DropdownPicker
                    label="Perc"
                    items={buildMinuteItems()}
                    selectedValue={minute}
                    onSelect={setMinute}
                  />
                </View>

                <View style={[s.previewRow, isDateValid() ? s.previewValid : s.previewInvalid]}>
                  <MaterialCommunityIcons
                    name={isDateValid() ? 'calendar-check' : 'calendar-alert'}
                    size={18}
                    color={isDateValid() ? colors.success : colors.danger}
                  />
                  <Text style={[s.previewText, !isDateValid() && s.previewTextError]}>
                    {isDateValid() ? getDatePreview() : 'Válassz jövőbeli időpontot!'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit}
              style={{ marginBottom: 40 }}
            >
              <LinearGradient
                colors={canSubmit ? colors.gradientPrimary : [colors.textMuted, colors.textMuted] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.submitButton}
              >
                <MaterialCommunityIcons name="bell-plus" size={22} color={colors.white} />
                <Text style={s.submitButtonText}>
                  {isEditing ? 'Emlékeztető frissítése' : 'Emlékeztető beállítása'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: {},
    headerGradientLine: { height: 3, borderRadius: 2 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    backButton: {
      width: 40, height: 40, borderRadius: 14, backgroundColor: c.bgCard,
      borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
    content: { flex: 1, padding: 20 },
    inputGroup: { marginBottom: 20 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    label: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    titleInput: {
      backgroundColor: c.bgInput, borderRadius: 16, padding: 16,
      fontSize: 16, fontWeight: '600', color: c.textPrimary, borderWidth: 1, borderColor: c.border,
    },
    noteInput: {
      backgroundColor: c.bgInput, borderRadius: 16, padding: 16,
      fontSize: 15, color: c.textSecondary, lineHeight: 22, minHeight: 70,
      borderWidth: 1, borderColor: c.border,
    },
    dateCard: {
      backgroundColor: c.bgCard, borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: c.border,
    },
    dateRow: { flexDirection: 'row', marginBottom: 16 },
    timeRow: {
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
      marginBottom: 16, paddingHorizontal: 40,
    },
    timeColon: {
      fontSize: 24, fontWeight: '800', color: c.textSecondary,
      paddingHorizontal: 8, paddingBottom: 12,
    },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
    previewValid: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    previewInvalid: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    previewText: { fontSize: 14, fontWeight: '600', color: c.success, flex: 1 },
    previewTextError: { color: c.danger },
    submitButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, borderRadius: 18, paddingVertical: 18,
    },
    submitButtonText: { color: c.white, fontSize: 17, fontWeight: '700' },
  });
