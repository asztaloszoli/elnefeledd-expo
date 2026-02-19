const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function addBootReceiver(androidManifest) {
  const app = androidManifest.manifest.application[0];

  if (!app.receiver) {
    app.receiver = [];
  }

  const hasBootReceiver = app.receiver.some(
    (r) => r.$?.["android:name"] === ".BootReceiver"
  );

  if (!hasBootReceiver) {
    app.receiver.push({
      $: {
        "android:name": ".BootReceiver",
        "android:enabled": "true",
        "android:exported": "true",
        "android:directBootAware": "true",
      },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
            {
              $: {
                "android:name": "android.intent.action.QUICKBOOT_POWERON",
              },
            },
            {
              $: {
                "android:name":
                  "android.intent.action.LOCKED_BOOT_COMPLETED",
              },
            },
          ],
        },
      ],
    });
  }

  return androidManifest;
}

function generateBootReceiverKotlin(packageName) {
  return `package ${packageName}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED
        ) {
            Log.d("BootReceiver", "Device booted - Notifee will reschedule trigger notifications automatically")
            // Notifee automatically reschedules trigger notifications on boot
            // when @notifee/react-native is installed and configured.
            // This receiver ensures the app is woken up on boot so Notifee
            // can perform the reschedule.
        }
    }
}
`;
}

function withBootReceiverKotlinFile(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const packageName =
        config.android?.package || "com.elnefeledd.app";
      const packagePath = packageName.replace(/\./g, "/");
      const projectRoot = config.modRequest.projectRoot;
      const receiverDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...packagePath.split("/")
      );

      fs.mkdirSync(receiverDir, { recursive: true });

      const receiverPath = path.join(receiverDir, "BootReceiver.kt");
      fs.writeFileSync(
        receiverPath,
        generateBootReceiverKotlin(packageName)
      );

      return config;
    },
  ]);
}

module.exports = function withBootReceiver(config) {
  config = withAndroidManifest(config, (config) => {
    config.modResults = addBootReceiver(config.modResults);
    return config;
  });
  config = withBootReceiverKotlinFile(config);
  return config;
};
