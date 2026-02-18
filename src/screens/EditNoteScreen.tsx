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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Note, NOTE_COLORS, NoteColor } from '../types';
import { saveNote, updateNote, getNoteById } from '../services/storageService';
import {
  scheduleReminder,
  cancelReminder,
  registerForPushNotifications,
} from '../services/notificationService';

interface Props {
  navigation: any;
  route: any;
}

export default function EditNoteScreen({ navigation, route }: Props) {
  const noteId = route.params?.noteId;
  const isEditing = !!noteId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>('#FFFFFF');
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [existingNotificationId, setExistingNotificationId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

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
      setColor(note.color);
      setPinned(note.pinned);
      setExistingNotificationId(note.notificationId);
      if (note.reminderTime) {
        setReminderTime(new Date(note.reminderTime));
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hiba', 'Kérlek adj meg egy címet!');
      return;
    }

    let notificationId: string | null = existingNotificationId;

    if (existingNotificationId) {
      await cancelReminder(existingNotificationId);
      notificationId = null;
    }

    if (reminderTime && reminderTime.getTime() > Date.now()) {
      const hasPermission = await registerForPushNotifications();
      if (hasPermission) {
        notificationId = await scheduleReminder(
          title.trim(),
          content.trim() || 'Emlékeztető!',
          reminderTime
        );
      } else {
        Alert.alert('Figyelem', 'Az emlékeztetőkhöz engedélyezd az értesítéseket!');
      }
    }

    try {
      if (isEditing) {
        const existing = await getNoteById(noteId);
        if (existing) {
          await updateNote({
            ...existing,
            title: title.trim(),
            content: content.trim(),
            color,
            reminderTime: reminderTime?.getTime() || null,
            notificationId,
            pinned,
          });
        }
      } else {
        await saveNote({
          title: title.trim(),
          content: content.trim(),
          color,
          reminderTime: reminderTime?.getTime() || null,
          notificationId,
          pinned,
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült menteni a jegyzetet');
    }
  };

  const handleSetReminder = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    setTempDate(reminderTime || now);
    setShowDatePicker(true);
  };

  const handleRemoveReminder = async () => {
    if (existingNotificationId) {
      await cancelReminder(existingNotificationId);
    }
    setReminderTime(null);
    setExistingNotificationId(null);
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
  };

  const onTimeChange = (_event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const finalDate = new Date(tempDate);
      finalDate.setHours(selectedTime.getHours());
      finalDate.setMinutes(selectedTime.getMinutes());
      setReminderTime(finalDate);
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Szerkesztés' : 'Új jegyzet'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <MaterialCommunityIcons name="check" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="Cím"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Írd ide a jegyzeted..."
          placeholderTextColor="#94A3B8"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.sectionTitle}>Szín</Text>
        <View style={styles.colorRow}>
          {NOTE_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.colorCircleActive,
              ]}
              onPress={() => setColor(c)}
            >
              {color === c && (
                <MaterialCommunityIcons name="check" size={18} color="#1E293B" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Emlékeztető</Text>
        {reminderTime ? (
          <View style={styles.reminderCard}>
            <View style={styles.reminderInfo}>
              <MaterialCommunityIcons name="bell-ring" size={22} color="#F59E0B" />
              <Text style={styles.reminderDateText}>{formatDate(reminderTime)}</Text>
            </View>
            <View style={styles.reminderActions}>
              <TouchableOpacity onPress={handleSetReminder} style={styles.reminderEditBtn}>
                <MaterialCommunityIcons name="pencil" size={18} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemoveReminder} style={styles.reminderDeleteBtn}>
                <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addReminderButton} onPress={handleSetReminder}>
            <MaterialCommunityIcons name="bell-plus-outline" size={22} color="#2563EB" />
            <Text style={styles.addReminderText}>Emlékeztető hozzáadása</Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            is24Hour={true}
          />
        )}

        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity
            style={styles.iosConfirmButton}
            onPress={() => {
              setShowDatePicker(false);
              setShowTimePicker(true);
            }}
          >
            <Text style={styles.iosConfirmText}>Dátum kiválasztva - Idő</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'ios' && showTimePicker && (
          <TouchableOpacity
            style={styles.iosConfirmButton}
            onPress={() => {
              setShowTimePicker(false);
              setReminderTime(tempDate);
            }}
          >
            <Text style={styles.iosConfirmText}>Kész</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    paddingVertical: 8,
  },
  contentInput: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    minHeight: 150,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleActive: {
    borderColor: '#2563EB',
    borderWidth: 3,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 24,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderEditBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 24,
  },
  addReminderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  iosConfirmButton: {
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  iosConfirmText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
