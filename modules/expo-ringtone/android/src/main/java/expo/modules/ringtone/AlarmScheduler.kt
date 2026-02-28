package expo.modules.ringtone

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

object AlarmScheduler {

    private const val TAG = "AlarmScheduler"
    private const val PREFS_NAME = "alarm_scheduler_prefs"
    private const val KEY_ALARMS = "scheduled_alarms"

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return alarmManager.canScheduleExactAlarms()
    }

    fun openExactAlarmSettings(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }

    fun schedule(
        context: Context,
        alarmId: String,
        triggerAtMillis: Long,
        title: String,
        body: String
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra(AlarmPlaybackService.EXTRA_ALARM_ID, alarmId)
            putExtra(AlarmPlaybackService.EXTRA_ALARM_TITLE, title)
            putExtra(AlarmPlaybackService.EXTRA_ALARM_BODY, body)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
            )
            Log.d(TAG, "Alarm scheduled (exact): id=$alarmId")
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Fallback: still use setExactAndAllowWhileIdle on API 23-30,
            // or setAndAllowWhileIdle if exact not permitted on 31+
            try {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
                Log.d(TAG, "Alarm scheduled (exact fallback): id=$alarmId")
            } catch (e: SecurityException) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
                Log.w(TAG, "Alarm scheduled (inexact fallback): id=$alarmId")
            }
        } else {
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
            )
            Log.d(TAG, "Alarm scheduled (exact pre-M): id=$alarmId")
        }

        // Persist for reboot rescheduling
        saveAlarm(context, alarmId, triggerAtMillis, title, body)
    }

    fun cancel(context: Context, alarmId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.cancel(pendingIntent)
        removeAlarm(context, alarmId)

        Log.d(TAG, "Alarm cancelled: id=$alarmId")
    }

    fun cancelAll(context: Context) {
        val alarms = loadAlarms(context)
        for (i in 0 until alarms.length()) {
            val alarm = alarms.getJSONObject(i)
            val id = alarm.getString("id")
            cancel(context, id)
        }
        clearAlarms(context)
        Log.d(TAG, "All alarms cancelled")
    }

    fun rescheduleAll(context: Context) {
        val alarms = loadAlarms(context)
        val now = System.currentTimeMillis()
        val remaining = JSONArray()

        for (i in 0 until alarms.length()) {
            val alarm = alarms.getJSONObject(i)
            val id = alarm.getString("id")
            val triggerAt = alarm.getLong("triggerAt")
            val title = alarm.getString("title")
            val body = alarm.getString("body")

            if (triggerAt > now) {
                schedule(context, id, triggerAt, title, body)
                remaining.put(alarm)
                Log.d(TAG, "Rescheduled alarm: id=$id")
            } else {
                Log.d(TAG, "Skipping expired alarm: id=$id")
            }
        }

        // Save only non-expired alarms
        saveAlarms(context, remaining)
        Log.d(TAG, "Rescheduled ${remaining.length()} alarms after boot")
    }

    fun stopCurrentAlarm(context: Context) {
        val stopIntent = Intent(context, AlarmPlaybackService::class.java).apply {
            action = "STOP_ALARM"
        }
        context.startService(stopIntent)
    }

    // --- Persistence helpers ---

    private fun saveAlarm(context: Context, id: String, triggerAt: Long, title: String, body: String) {
        val alarms = loadAlarms(context)

        // Remove existing with same id
        val updated = JSONArray()
        for (i in 0 until alarms.length()) {
            val alarm = alarms.getJSONObject(i)
            if (alarm.getString("id") != id) {
                updated.put(alarm)
            }
        }

        // Add new
        updated.put(JSONObject().apply {
            put("id", id)
            put("triggerAt", triggerAt)
            put("title", title)
            put("body", body)
        })

        saveAlarms(context, updated)
    }

    private fun removeAlarm(context: Context, id: String) {
        val alarms = loadAlarms(context)
        val updated = JSONArray()
        for (i in 0 until alarms.length()) {
            val alarm = alarms.getJSONObject(i)
            if (alarm.getString("id") != id) {
                updated.put(alarm)
            }
        }
        saveAlarms(context, updated)
    }

    private fun loadAlarms(context: Context): JSONArray {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_ALARMS, "[]") ?: "[]"
        return try {
            JSONArray(json)
        } catch (e: Exception) {
            JSONArray()
        }
    }

    private fun saveAlarms(context: Context, alarms: JSONArray) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ALARMS, alarms.toString())
            .apply()
    }

    private fun clearAlarms(context: Context) {
        saveAlarms(context, JSONArray())
    }
}
