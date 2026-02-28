/**
 * Alarm hangfájl generátor — El ne felejtsd! app
 * 
 * Generál egy 15 perces alarm hangot WAV formátumban.
 * Minta: rövid sípolás (880Hz) ismétlődő mintával.
 * 8000Hz sample rate — beep mintához bőven elég, és ~14MB a fájlméret.
 * 
 * Futtatás: node generate-alarm-sound.js
 * Kimenet: modules/expo-ringtone/android/src/main/res/raw/alarm_sound.wav
 */

const fs = require('fs');
const path = require('path');

// Audio paraméterek
const SAMPLE_RATE = 8000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;
const DURATION_SEC = 15 * 60; // 15 perc
const AMPLITUDE = 0.9; // 0.0 - 1.0

// Beep minta: 200ms beep, 100ms szünet, 200ms beep, 500ms szünet (ismétlődik)
const BEEP_FREQ = 880;      // Hz (A5 — éles, figyelemfelkeltő)
const BEEP_FREQ2 = 1100;    // Hz (C#6 — második hang a mintában)

function generateAlarmPattern(sampleRate, durationSec) {
  const totalSamples = sampleRate * durationSec;
  const samples = new Float64Array(totalSamples);

  // Minta definíció (milliszekundumban): [freq, duration]
  const pattern = [
    [BEEP_FREQ, 150],   // beep
    [0, 80],             // szünet
    [BEEP_FREQ, 150],   // beep
    [0, 80],             // szünet
    [BEEP_FREQ2, 150],  // magasabb beep
    [0, 80],             // szünet
    [BEEP_FREQ2, 150],  // magasabb beep
    [0, 600],            // hosszabb szünet
  ];

  // Teljes minta hossz ms-ben
  const patternLenMs = pattern.reduce((sum, [, dur]) => sum + dur, 0);

  for (let i = 0; i < totalSamples; i++) {
    const timeMs = (i / sampleRate) * 1000;
    const posInPattern = timeMs % patternLenMs;

    let accumulated = 0;
    let freq = 0;
    for (const [f, dur] of pattern) {
      accumulated += dur;
      if (posInPattern < accumulated) {
        freq = f;
        break;
      }
    }

    if (freq > 0) {
      const t = i / sampleRate;
      // Sine wave + enyhe envelope a kattanás elkerülésére
      const envelope = Math.min(1, Math.min(
        (posInPattern - (accumulated - pattern.find(([f]) => f === freq)?.[1] || 0)) / 5,
        1
      ));
      samples[i] = Math.sin(2 * Math.PI * freq * t) * AMPLITUDE * Math.min(envelope, 1);
    } else {
      samples[i] = 0;
    }
  }

  return samples;
}

function samplesToInt16(samples) {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    const int16 = val < 0 ? val * 0x8000 : val * 0x7FFF;
    buffer.writeInt16LE(Math.round(int16), i * 2);
  }
  return buffer;
}

function createWav(pcmData, sampleRate, bitsPerSample, numChannels) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);         // chunk size
  header.writeUInt16LE(1, 20);          // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// Generálás
console.log('Alarm hang generálása...');
console.log(`  Hossz: ${DURATION_SEC}s, Sample rate: ${SAMPLE_RATE}Hz, ${BITS_PER_SAMPLE}bit`);

const samples = generateAlarmPattern(SAMPLE_RATE, DURATION_SEC);
const pcmData = samplesToInt16(samples);
const wavData = createWav(pcmData, SAMPLE_RATE, BITS_PER_SAMPLE, NUM_CHANNELS);

// Kimeneti könyvtár létrehozása
const outputDir = path.join(__dirname, 'assets', 'sounds');
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, 'alarm_sound.wav');
fs.writeFileSync(outputPath, wavData);

const sizeMB = (wavData.length / (1024 * 1024)).toFixed(2);
console.log(`✅ Kész: ${outputPath}`);
console.log(`   Méret: ${sizeMB} MB`);
