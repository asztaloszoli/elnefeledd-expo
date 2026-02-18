import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Note } from '../types';
import { getAllNotes, deleteNote, updateNote } from '../services/storageService';
import { cancelReminder } from '../services/notificationService';

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async () => {
    const data = await getAllNotes();
    setNotes(data);
  };

  const handleDelete = (note: Note) => {
    Alert.alert('Törlés', `Biztosan törlöd: "${note.title}"?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: async () => {
          if (note.notificationId) {
            await cancelReminder(note.notificationId);
          }
          await deleteNote(note.id);
          loadNotes();
        },
      },
    ]);
  };

  const handleTogglePin = async (note: Note) => {
    await updateNote({ ...note, pinned: !note.pinned });
    loadNotes();
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderNote = ({ item }: { item: Note }) => {
    const hasReminder = item.reminderTime && item.reminderTime > Date.now();

    return (
      <TouchableOpacity
        style={[styles.noteCard, { backgroundColor: item.color || '#FFFFFF' }]}
        onPress={() => navigation.navigate('EditNote', { noteId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.noteActions}>
            <TouchableOpacity onPress={() => handleTogglePin(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons
                name={item.pinned ? 'pin' : 'pin-outline'}
                size={20}
                color={item.pinned ? '#2563EB' : '#94A3B8'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {item.content ? (
          <Text style={styles.noteContent} numberOfLines={3}>
            {item.content}
          </Text>
        ) : null}

        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
          {hasReminder && (
            <View style={styles.reminderBadge}>
              <MaterialCommunityIcons name="bell-ring-outline" size={14} color="#F59E0B" />
              <Text style={styles.reminderText}>
                {formatDate(item.reminderTime!)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>El ne felejtsd!</Text>
        <Text style={styles.headerSubtitle}>{notes.length} jegyzet</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={22} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Keresés..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="note-text-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nincs találat' : 'Még nincsenek jegyzeteid'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Próbálj más keresőszót'
              : 'Koppints a + gombra az első jegyzeted létrehozásához'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('EditNote', {})}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 14,
  },
  noteContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 10,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  reminderText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
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
