import { getAllNotes } from './storageService';
import { scheduleReminder, setupNotificationChannel } from './notificationService';

export const rescheduleAllReminders = async (): Promise<void> => {
  try {
    await setupNotificationChannel();

    const notes = await getAllNotes();
    const now = Date.now();

    for (const note of notes) {
      if (note.reminderTime && note.reminderTime > now) {
        try {
          const newNotificationId = await scheduleReminder(
            note.id,
            note.title,
            note.content || 'Emlékeztető!',
            new Date(note.reminderTime)
          );
          console.log(
            `Rescheduled reminder for note "${note.title}" (id: ${note.id})`
          );
        } catch (e) {
          console.warn(`Failed to reschedule note "${note.title}":`, e);
        }
      }
    }
  } catch (e) {
    console.warn('rescheduleAllReminders error:', e);
  }
};
