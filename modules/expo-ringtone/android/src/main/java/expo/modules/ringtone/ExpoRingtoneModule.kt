package expo.modules.ringtone

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoRingtoneModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ExpoRingtone")

        AsyncFunction("canScheduleExactAlarms") {
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.canScheduleExact(context)
        }

        AsyncFunction("requestExactAlarmPermission") {
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.openExactAlarmSettings(context)
        }

        AsyncFunction("scheduleAlarm") { alarmId: String, triggerAtMillis: Double, title: String, body: String ->
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.schedule(context, alarmId, triggerAtMillis.toLong(), title, body)
        }

        AsyncFunction("cancelAlarm") { alarmId: String ->
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.cancel(context, alarmId)
        }

        AsyncFunction("cancelAllAlarms") {
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.cancelAll(context)
        }

        AsyncFunction("stopAlarm") {
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.stopCurrentAlarm(context)
        }

        AsyncFunction("triggerTestAlarm") {
            val context = appContext.reactContext
                ?: throw Exception("React context is not available")
            AlarmScheduler.schedule(
                context,
                "test_alarm",
                System.currentTimeMillis() + 5000,
                "Teszt alarm",
                "Ez egy teszt — 5 másodperc múlva szól!"
            )
        }
    }
}
