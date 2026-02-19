package expo.modules.ringtoneplayer

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RingtonePlayerModule : Module() {
    private var mediaPlayer: MediaPlayer? = null

    override fun definition() = ModuleDefinition {
        Name("RingtonePlayer")

        AsyncFunction("play") {
            playRingtone()
        }

        AsyncFunction("stop") {
            stopRingtone()
        }

        AsyncFunction("isPlaying") {
            mediaPlayer?.isPlaying ?: false
        }
    }

    private fun playRingtone() {
        stopRingtone()

        val context = appContext.reactContext ?: return

        val ringtoneUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: return

        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(context, ringtoneUri)

                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )

                isLooping = true

                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            stopRingtone()
        }
    }

    private fun stopRingtone() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        mediaPlayer = null
    }
}
