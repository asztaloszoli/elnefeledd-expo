const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureAutolinkingGroovy(contents) {
  const applyLine =
    "apply from: file(\"../node_modules/expo-modules-autolinking/scripts/android/autolinking.gradle\")";
  const useLine = 'useExpoModules()';

  const hasApply = contents.includes('expo-modules-autolinking/scripts/android/autolinking.gradle');
  const hasUse = contents.includes('useExpoModules()');

  if (hasApply && hasUse) return contents;

  const inject = `${applyLine}\n${useLine}\n`;

  // Insert near the top, but after any buildscript/pluginManagement blocks if present.
  const lines = contents.split(/\r?\n/);
  let insertAt = 0;

  // If file starts with pluginManagement { ... } (kts usually) skip (but groovy generally doesn't).
  // For safety, just insert after first non-empty line.
  while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++;

  lines.splice(insertAt, 0, inject.trimEnd());
  return lines.join('\n');
}

function ensureAutolinkingKts(contents) {
  const applyLine =
    'apply(from = file("../node_modules/expo-modules-autolinking/scripts/android/autolinking.gradle"))';
  const useLine = 'useExpoModules()';

  const hasApply = contents.includes('expo-modules-autolinking/scripts/android/autolinking.gradle');
  const hasUse = contents.includes('useExpoModules()');

  if (hasApply && hasUse) return contents;

  const inject = `${applyLine}\n${useLine}\n`;

  const lines = contents.split(/\r?\n/);
  let insertAt = 0;
  while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++;
  lines.splice(insertAt, 0, inject.trimEnd());
  return lines.join('\n');
}

module.exports = function withExpoModulesAutolinking(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const settingsGradle = path.join(projectRoot, 'android', 'settings.gradle');
      const settingsGradleKts = path.join(projectRoot, 'android', 'settings.gradle.kts');

      if (fs.existsSync(settingsGradle)) {
        const contents = fs.readFileSync(settingsGradle, 'utf8');
        const updated = ensureAutolinkingGroovy(contents);
        if (updated !== contents) {
          fs.writeFileSync(settingsGradle, updated);
        }
      } else if (fs.existsSync(settingsGradleKts)) {
        const contents = fs.readFileSync(settingsGradleKts, 'utf8');
        const updated = ensureAutolinkingKts(contents);
        if (updated !== contents) {
          fs.writeFileSync(settingsGradleKts, updated);
        }
      } else {
        // android folder doesn't exist yet (will be created by prebuild)
      }

      return config;
    },
  ]);
};
