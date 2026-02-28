package expo.modules.ringtone

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class AlarmPlaybackService : Service() {

    companion object {
        const val TAG = "AlarmPlaybackService"
        const val CHANNEL_ID = "alarm_playback_channel"
        const val NOTIFICATION_ID = 9999
        const val EXTRA_ALARM_ID = "alarm_id"
        const val EXTRA_ALARM_TITLE = "alarm_title"
        const val EXTRA_ALARM_BODY = "alarm_body"
        const val AUTO_STOP_MS = 15L * 60 * 1000 // 15 minutes
    }

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP_ALARM") {
            Log.d(TAG, "Stop action received")
            stopSelf()
            return START_NOT_STICKY
        }

        val alarmId = intent?.getStringExtra(EXTRA_ALARM_ID) ?: "unknown"
        val title = intent?.getStringExtra(EXTRA_ALARM_TITLE) ?: "Emlékeztető!"
        val body = intent?.getStringExtra(EXTRA_ALARM_BODY) ?: ""

        Log.d(TAG, "Starting alarm playback for: $alarmId")

        // Acquire wake lock to keep CPU running
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "elnefeledd:alarm_playback"
        ).apply {
            acquire(AUTO_STOP_MS)
        }

        // Build foreground notification with Stop action
        val stopIntent = Intent(this, AlarmPlaybackService::class.java).apply {
            action = "STOP_ALARM"
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Tap action: open the app
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val launchPendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this, 1, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🔔 $title")
            .setContentText(body.ifEmpty { "Emlékeztető!" })
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "⏹ Leállítás", stopPendingIntent)
            .apply {
                if (launchPendingIntent != null) {
                    setContentIntent(launchPendingIntent)
                }
            }
            .build()

        startForeground(NOTIFICATION_ID, notification)

        // Start playing alarm sound
        startPlayback()

        // Auto-stop after 15 minutes
        android.os.Handler(mainLooper).postDelayed({
            Log.d(TAG, "Auto-stop after 15 minutes")
            stopSelf()
        }, AUTO_STOP_MS)

        return START_NOT_STICKY
    }

    private fun startPlayback() {
        try {
            stopPlayback()

            val resId = resources.getIdentifier("alarm_sound", "raw", packageName)
            if (resId == 0) {
                Log.e(TAG, "alarm_sound resource not found!")
                stopSelf()
                return
            }

            val player = MediaPlayer.create(this, resId)
            if (player == null) {
                Log.e(TAG, "Failed to create MediaPlayer")
                stopSelf()
                return
            }

            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            player.isLooping = true
            player.setVolume(1.0f, 1.0f)
            player.start()

            mediaPlayer = player
            Log.d(TAG, "Alarm playback started (looping)")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting playback", e)
            stopSelf()
        }
    }

    private fun stopPlayback() {
        mediaPlayer?.let { player ->
            try {
                if (player.isPlaying) player.stop()
                player.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping playback", e)
            }
        }
        mediaPlayer = null
    }

    override fun onDestroy() {
        Log.d(TAG, "Service destroyed, stopping playback")
        stopPlayback()
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm lejátszás",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Emlékeztető alarm hang lejátszása"
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }
}
