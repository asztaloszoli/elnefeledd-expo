package expo.modules.ringtone

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val TAG = "AlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra(AlarmPlaybackService.EXTRA_ALARM_ID) ?: "unknown"
        val title = intent.getStringExtra(AlarmPlaybackService.EXTRA_ALARM_TITLE) ?: "Emlékeztető!"
        val body = intent.getStringExtra(AlarmPlaybackService.EXTRA_ALARM_BODY) ?: ""

        Log.d(TAG, "Alarm triggered for: $alarmId")

        val serviceIntent = Intent(context, AlarmPlaybackService::class.java).apply {
            putExtra(AlarmPlaybackService.EXTRA_ALARM_ID, alarmId)
            putExtra(AlarmPlaybackService.EXTRA_ALARM_TITLE, title)
            putExtra(AlarmPlaybackService.EXTRA_ALARM_BODY, body)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
