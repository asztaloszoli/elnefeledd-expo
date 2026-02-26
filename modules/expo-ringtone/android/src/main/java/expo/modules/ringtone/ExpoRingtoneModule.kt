package expo.modules.ringtone

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoRingtoneModule : Module() {
    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var autoStopRunnable: Runnable? = null

    override fun definition() = ModuleDefinition {
        Name("ExpoRingtone")

        AsyncFunction("playRingtone") { durationMs: Int ->
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")

            stopPlayback()

            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: throw Exception("No ringtone URI available on this device")

            val player = MediaPlayer()

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            player.setAudioAttributes(audioAttributes)
            player.setDataSource(context, ringtoneUri)
            player.isLooping = true
            player.setVolume(1.0f, 1.0f)
            player.prepare()
            player.start()

            mediaPlayer = player

            val stopRunnable = Runnable { stopPlayback() }
            autoStopRunnable = stopRunnable
            handler.postDelayed(stopRunnable, durationMs.toLong())
        }

        AsyncFunction("stopRingtone") {
            stopPlayback()
        }

        AsyncFunction("isPlaying") {
            mediaPlayer?.isPlaying ?: false
        }
    }

    private fun stopPlayback() {
        autoStopRunnable?.let { handler.removeCallbacks(it) }
        autoStopRunnable = null

        mediaPlayer?.let { player ->
            try {
                if (player.isPlaying) {
                    player.stop()
                }
                player.release()
            } catch (e: Exception) {
                // Player may already be released
            }
        }
        mediaPlayer = null
    }
}
