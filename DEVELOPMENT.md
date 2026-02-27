# El ne felejtsd! — Fejlesztői dokumentáció

> **Verzió:** 1.0.0  
> **Platform:** Android (Expo / React Native)  
> **Nyelv:** TypeScript  
> **Utolsó frissítés:** 2025. február

---

## 1. Projekt áttekintés

Az **„El ne felejtsd!"** egy React Native (Expo) alapú emlékeztető alkalmazás Android platformra. A felhasználó létrehozhat emlékeztetőket egy megadott jövőbeli időpontra, és az alkalmazás a beállított időpontban push értesítéssel és a **telefon csengőhangjával** figyelmezteti. Az app teljes egészében magyar nyelvű.

### Fő funkciók

- Emlékeztetők létrehozása címmel, megjegyzéssel és pontos dátum/idő megadásával
- Legördülő menüs (dropdown) dátum- és időválasztó magyar napnevekkel és hónapnevekkel
- Push értesítés az emlékeztető időpontjában
- A telefon beállított csengőhangjának lejátszása az értesítésnél (előtérben)
- Emlékeztetők szerkesztése és törlése
- Közelgő és lejárt emlékeztetők elkülönített megjelenítése
- Relatív időkijelzés (pl. „Holnap", „3 nap múlva", „2 hét múlva")
- Helyi adattárolás (AsyncStorage)

---

## 2. Technológiai stack

| Technológia | Verzió | Szerep |
|---|---|---|
| **Expo** | ~54.0.33 | Keretrendszer, build rendszer |
| **React Native** | 0.81.5 | Natív UI |
| **React** | 19.1.0 | UI komponensek |
| **TypeScript** | ~5.9.2 | Típusbiztos fejlesztés |
| **expo-notifications** | ^0.32.16 | Push értesítések ütemezése |
| **ExpoRingtone** (helyi natív modul) | — | Csengőhang lejátszás (RingtoneManager + MediaPlayer) |
| **expo-device** | ^8.0.10 | Eszközfelismerés |
| **@react-native-async-storage/async-storage** | ^2.2.0 | Helyi adattárolás |
| **@react-navigation/native** | ^7.1.28 | Navigáció |
| **@react-navigation/native-stack** | ^7.13.0 | Stack navigátor |
| **@expo/vector-icons** (MaterialCommunityIcons) | ^15.0.3 | Ikonok |
| **react-native-safe-area-context** | ^5.6.2 | Biztonságos megjelenítési terület |
| **react-native-screens** | ^4.23.0 | Natív képernyőkezelés |
| **react-native-gesture-handler** | ^2.30.0 | Gesztuskezelés |
| **react-native-reanimated** | ^4.2.2 | Animációk |
| **EAS Build** | CLI >=3.0.0 | Felhőalapú Android build |

---

## 3. Projektstruktúra

```
D:\elnefeledd\
├── App.tsx                          # Gyökér komponens, navigáció, értesítés-figyelők
├── index.ts                         # Expo belépési pont (registerRootComponent)
├── app.json                         # Expo konfiguráció (név, ikon, engedélyek, EAS)
├── eas.json                         # EAS Build profilok (preview APK, production AAB)
├── package.json                     # Függőségek és scriptek
├── tsconfig.json                    # TypeScript konfiguráció (strict mód)
├── generate-icons.js                # Ikon-generáló script (canvas alapú)
├── generate-alarm-sound.js          # Alarm hang generátor (30s WAV, pure Node.js)
├── assets/
│   ├── icon.png                     # App ikon (1024x1024, narancs háttér, zöld csengő)
│   ├── adaptive-icon.png            # Android adaptive ikon előtér
│   ├── splash-icon.png              # Splash screen ikon
│   └── favicon.png                  # Web favicon
├── modules/
│   └── expo-ringtone/               # Helyi natív Expo modul — csengőhang lejátszás
│       ├── expo-module.config.json  # Modul konfiguráció (Android platform)
│       ├── index.ts                 # TypeScript bridge (playRingtone, stopRingtone, isPlaying)
│       └── android/
│           ├── build.gradle         # Android build konfiguráció
│           └── src/main/
│               ├── res/raw/alarm_sound.wav  # Saját alarm hang (15 perc, 880/1100Hz beep, ~14MB)
│               └── java/expo/modules/ringtone/
│                   └── ExpoRingtoneModule.kt  # Natív Kotlin kód (RingtoneManager + MediaPlayer)
└── src/
    ├── types/
    │   └── index.ts                 # Note interfész, NoteColor típus
    ├── services/
    │   ├── storageService.ts        # AsyncStorage CRUD műveletek
    │   ├── notificationService.ts   # Push értesítések kezelése
    │   └── ringtoneService.ts       # Csengőhang lejátszás (natív ExpoRingtone modul)
    ├── screens/
    │   ├── HomeScreen.tsx           # Főképernyő: emlékeztetők listája
    │   └── EditNoteScreen.tsx       # Szerkesztő: új/meglévő emlékeztető
    └── navigation/
        └── AppNavigator.tsx         # Stack navigátor (Home ↔ EditNote)
```

---

## 4. Adatmodell

### `Note` interfész (`src/types/index.ts`)

```typescript
interface Note {
  id: string;              // Egyedi azonosító (timestamp + random, base36)
  title: string;           // Emlékeztető neve (max 100 karakter)
  content: string;         // Megjegyzés (opcionális)
  color: string;           // Háttérszín (jelenleg mindig '#FFFFFF')
  reminderTime: number | null;    // Unix timestamp (ms) — mikor szóljon
  notificationId: string | null;  // Expo notification ID (ütemezett értesítéshez)
  createdAt: number;       // Létrehozás ideje (Unix ms)
  updatedAt: number;       // Utolsó módosítás ideje (Unix ms)
  pinned: boolean;         // Kitűzött-e (jelenleg nem használt a UI-ban)
}
```

### `NoteColor` típus

Előre definiált színpaletta 7 színnel. Jelenleg az app nem kínálja fel a színválasztót, minden emlékeztető fehér háttérrel jön létre. A típus és a `NOTE_COLORS` tömb a jövőbeli bővítéshez van előkészítve.

### Azonosító generálás

A `uuid` csomag helyett egyedi `generateId()` függvényt használunk, mert a `crypto.getRandomValues` nem érhető el megbízhatóan React Native környezetben:

```typescript
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};
```

---

## 5. Szolgáltatások (Services)

### 5.1. `storageService.ts` — Adattárolás

**AsyncStorage kulcs:** `elnefeledd_notes`

Az összes emlékeztető egyetlen JSON tömbként van tárolva az AsyncStorage-ban.

| Függvény | Leírás |
|---|---|
| `getAllNotes()` | Összes emlékeztető lekérése. Rendezés: kitűzöttek előre, majd frissítés ideje szerint csökkenő. |
| `saveNote(note)` | Új emlékeztető mentése. Automatikusan generál `id`-t, `createdAt`-ot és `updatedAt`-ot. |
| `updateNote(note)` | Meglévő emlékeztető frissítése `id` alapján. Frissíti az `updatedAt` mezőt. |
| `deleteNote(id)` | Emlékeztető törlése `id` alapján. |
| `getNoteById(id)` | Egyetlen emlékeztető lekérése `id` alapján. `null`-t ad vissza, ha nem létezik. |

**Rendezési logika (`getAllNotes`):**
1. Kitűzött (`pinned: true`) elemek előre
2. Azonos kitűzési státuszon belül: `updatedAt` szerint csökkenő (újabb előre)

### 5.2. `notificationService.ts` — Push értesítések

#### Notification Handler (globális)

Az app indításakor beállított handler, amely meghatározza, hogyan viselkedjen az értesítés amikor megérkezik:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // Felugró értesítés megjelenítése
    shouldPlaySound: true,   // Értesítési hang ENGEDÉLYEZVE
    shouldSetBadge: false,   // Nem módosítja az app badge számot
    shouldShowBanner: true,  // Banner megjelenítése
    shouldShowList: true,    // Értesítési listában megjelenítés
  }),
});
```

> **Fontos:** A `shouldPlaySound: true` biztosítja, hogy az értesítési hang mindig megszólal. Előtérben a `ringtoneService` kiegészítésként megpróbálja a rendszer csengőhangját is lejátszani.

#### Android Notification Channel

| Tulajdonság | Érték | Magyarázat |
|---|---|---|
| **Channel ID** | `reminders_v5` | Egyedi csatorna ID (v5, saját alarm hang) |
| **Név** | `Emlékeztetők` | A felhasználó ezt látja a rendszer beállításaiban |
| **Importance** | `MAX` | Legmagasabb prioritás — heads-up notification |
| **Sound** | `alarm_sound.wav` | Saját alarm hang (15 perc, 880/1100Hz beep minta, `res/raw/`, ~14MB) |
| **AudioAttributes** | `ALARM` usage, `SONIFICATION` contentType | Ébresztő hangerőszinten szól |
| **Vibration** | `[0, 250, 250, 250]` | Rezgésminta (ms) |
| **Lockscreen** | `PUBLIC` | Zárolási képernyőn is megjelenik |

> **Channel verzió történet:**  
> - `reminders_v1` — Eredeti, `HIGH` importance  
> - `reminders_v2` — `MAX` importance, újra létrehozva a hang beállítások alkalmazásához  
> - `reminders_v3` — `ringtoneService` integráció (shouldPlaySound: false — hibás, néma értesítéseket okozott)  
> - `reminders_v4` — `shouldPlaySound: true` + `ALARM` audioAttributes, `default` hang
> - `reminders_v5` — **Jelenlegi.** Saját `alarm_sound.wav` hang (15 perc, appba csomagolva), ALARM hangerő. Minden állapotban (háttér, kilőtt app) az app saját alarm hangja szól.

#### Notification Category — Akciógombok

Az értesítésen megjelenik egy **„⏹ Leállítás"** gomb, amellyel a csengőhang leállítható **zárolási képernyőről is, az app megnyitása nélkül**.

```typescript
await Notifications.setNotificationCategoryAsync('reminder', [
  {
    identifier: 'stop_ringtone',
    buttonTitle: '⏹ Leállítás',
    options: {
      opensAppToForeground: false,  // Nem nyitja meg az appot — zárolt képernyőn is működik
    },
  },
]);
```

| Konstans | Érték | Leírás |
|---|---|---|
| `REMINDER_CATEGORY_ID` | `'reminder'` | Notification category azonosító |
| `STOP_ACTION_ID` | `'stop_ringtone'` | A „Leállítás" gomb action azonosítója |

**Csengőhang leállítási módok:**

| Módszer | Mi történik |
|---|---|
| **„⏹ Leállítás" gomb** az értesítésen | `stopRingtone()` — zárolási képernyőről is, app megnyitása nélkül |
| **Értesítésre koppintás** | `stopRingtone()` + app megnyitása |
| **15 perc automatikus leállás** | Natív `Handler.postDelayed()` a Kotlin modulban (biztonsági limit) |

#### Függvények

| Függvény | Leírás |
|---|---|
| `registerForPushNotifications()` | Engedélykérés + Android channel + notification category létrehozása. `true`-t ad vissza ha van engedély. |
| `registerReminderCategory()` | Notification category regisztrálása a „Leállítás" akciógombbal. |
| `scheduleReminder(title, body, triggerDate)` | Értesítés ütemezése `categoryIdentifier: 'reminder'`-rel. Visszaadja a notification ID-t. |
| `cancelReminder(notificationId)` | Ütemezett értesítés törlése ID alapján. |
| `cancelAllReminders()` | Minden ütemezett értesítés törlése. |

#### Ütemezés logikája

```typescript
trigger: {
  type: Notifications.SchedulableTriggerInputTypes.DATE,
  date: triggerDate,
}
```

A `DATE` trigger típust használja, amely pontos időpontra ütemez (Android-on `AlarmManager.setExactAndAllowWhileIdle()`). Ehhez az `app.json`-ban a `SCHEDULE_EXACT_ALARM` engedély szükséges (már be van állítva).

### 5.3. `ringtoneService.ts` + `ExpoRingtone` natív modul — Csengőhang lejátszás

**Ez az app legfontosabb szolgáltatása.** Célja, hogy az emlékeztető a telefon tényleges csengőhangját játssza le, az ébresztő hangerőszintjén.

#### Miért natív modul?

A korábbi `expo-av` (ExoPlayer) alapú megoldás **nem működött megbízhatóan**, mert:
- Az ExoPlayer nem tudja feloldani a `content://settings/system/ringtone` Android rendszer URI-t
- Ez a URI nem közvetlenül egy hangfájlra mutat, hanem egy Android beállításra, amit csak natív `ContentResolver` tud feloldani
- A hiba csendben történt (try-catch elnyelte), így semmilyen hang nem szólt

#### Natív megoldás: `ExpoRingtone` modul (`modules/expo-ringtone/`)

Helyi Expo Module, Kotlin natív kóddal. Az EAS Build automatikusan belinkeli.

**Kotlin kód működése (`ExpoRingtoneModule.kt`):**

1. `RingtoneManager.getDefaultUri(TYPE_RINGTONE)` — lekéri a telefon beállított csengőhangjának **tényleges** URI-ját
2. Ha nincs csengőhang: `TYPE_ALARM` → `TYPE_NOTIFICATION` fallback
3. `MediaPlayer` — lejátssza a hangot (a natív Android API, nem ExoPlayer!)
4. `AudioAttributes.USAGE_ALARM` — az ébresztő hangerőszintjén szól
5. `isLooping = true` — ismétlődik amíg le nem állítják
6. Auto-stop 15 perc után (biztonsági limit)

#### Architektúra

```
App.tsx (notification listener)
  → ringtoneService.ts (JS wrapper)
    → modules/expo-ringtone/index.ts (bridge)
      → ExpoRingtoneModule.kt (natív Android)
        → RingtoneManager.getDefaultUri() → MediaPlayer.start()
```

#### Hang viselkedés

| Helyzet | Hang viselkedés |
|---|---|
| **App előtérben** | ✅ **Telefon csengőhangja** (natív ExpoRingtone, ALARM hangerő, 15 perc looping) + **saját alarm hang** (channel) |
| **App háttérben** | ✅ **Saját alarm hang** (`alarm_sound.wav`, 15 perc, ALARM hangerő) |
| **App leállítva (kill)** | ✅ **Saját alarm hang** (`alarm_sound.wav`, 15 perc, ALARM hangerő) |
| **Telefon újraindítás után** | ✅ Az `expo-notifications` automatikusan újraütemezi (`RECEIVE_BOOT_COMPLETED`) |

> **Megjegyzés:** Háttérben/kilőtt appnál a `addNotificationReceivedListener` nem fut le, ezért a natív csengőhang lejátszás nem lehetséges. Ilyenkor a notification channel `sound: 'alarm_sound.wav'` + `ALARM` audioAttributes biztosítja, hogy az app saját alarm hangja az ébresztő hangerőszintjén szólal meg.

#### Függvények

**`ringtoneService.ts` (JS):**

| Függvény | Leírás |
|---|---|
| `playRingtone()` | Natív csengőhang lejátszás indítása (15 perc auto-stop). |
| `stopRingtone()` | Csengőhang azonnali leállítása. |

**`ExpoRingtoneModule.kt` (natív):**

| Függvény | Leírás |
|---|---|
| `playRingtone(durationMs)` | Csengőhang betöltése és lejátszása MediaPlayer-rel, ALARM hangerőn. |
| `stopRingtone()` | Lejátszás leállítása és MediaPlayer felszabadítása. |
| `isPlaying()` | Éppen szól-e a csengőhang. |

#### Build követelmény

A natív modul miatt **EAS Build szükséges** (nem működik Expo Go-ban):
```bash
npx eas-cli build --platform android --profile preview
```

---

## 6. Képernyők (Screens)

### 6.1. `HomeScreen.tsx` — Főképernyő

A főképernyő az összes emlékeztetőt listázza, időrendi sorrendben.

#### Állapotkezelés

```typescript
const [reminders, setReminders] = useState<Note[]>([]);
```

A `useFocusEffect` hook-kal minden alkalommal újratölti az adatokat, amikor a képernyő fókuszba kerül (pl. visszanavigálás a szerkesztőből).

#### Rendezés és szűrés

- **Elsődleges rendezés:** `reminderTime` szerint növekvő (legkorábbi előre)
- **Szekciók:**
  - **Közelgő** (`upcoming`): `reminderTime > Date.now()`
  - **Lejárt** (`expired`): `reminderTime <= Date.now()`

#### Relatív időkijelzés (`getDaysUntil`)

| Feltétel | Kijelzés |
|---|---|
| `diff < 0` | „Lejárt" |
| `days === 0 && hours === 0` | „Hamarosan" |
| `days === 0` | „X óra múlva" |
| `days === 1` | „Holnap" |
| `days < 7` | „X nap múlva" |
| `days < 30` | „X hét múlva" |
| `days >= 30` | „X hónap múlva" |

#### Dátumformázás

- **Dátum:** `2025. jan. 15. (Szerda)` — magyar hónapnevek és napnevek
- **Idő:** `09:00` — 24 órás formátum, nulla-paddelt

#### Emlékeztető kártya elemei

Minden kártya egy `TouchableOpacity`, ami megnyomásra a szerkesztő képernyőre navigál:

- **Bal oldal:** Csengő ikon (aktív: kék `bell-ring-outline`, lejárt: szürke `bell-off-outline`)
- **Közép:** Cím, megjegyzés (1 soros, csonkolt), dátum és idő
- **Jobb oldal:** Relatív idő badge (kék/piros háttérrel) + törlés gomb

#### Üres állapot

Ha nincs emlékeztető, egy illusztráció jelenik meg szöveggel és egy „Új emlékeztető" gombbal.

#### FAB (Floating Action Button)

Kék, lekerekített `+` gomb a jobb alsó sarokban, amely az `EditNote` képernyőre navigál üres paraméterekkel.

#### Törlés

Megerősítő `Alert.alert` dialógus után:
1. Ha van `notificationId`, törli az ütemezett értesítést (`cancelReminder`)
2. Törli az emlékeztetőt az AsyncStorage-ból (`deleteNote`)
3. Újratölti a listát

### 6.2. `EditNoteScreen.tsx` — Szerkesztő képernyő

Ez a képernyő szolgál új emlékeztető létrehozására és meglévő szerkesztésére.

#### Navigációs paraméterek

- **Új:** `navigation.navigate('EditNote', {})` — üres paraméter
- **Szerkesztés:** `navigation.navigate('EditNote', { noteId: 'xxx' })` — meglévő ID

#### Állapot

```typescript
const [title, setTitle] = useState('');          // Emlékeztető neve
const [content, setContent] = useState('');      // Megjegyzés
const [year, setYear] = useState(tomorrow.getFullYear());
const [month, setMonth] = useState(tomorrow.getMonth() + 1);
const [day, setDay] = useState(tomorrow.getDate());
const [hour, setHour] = useState(9);
const [minute, setMinute] = useState(0);
const [existingNotificationId, setExistingNotificationId] = useState<string | null>(null);
```

**Alapértelmezett időpont:** Holnap 09:00.

#### DropdownPicker komponens

Egyedi, az `EditNoteScreen.tsx`-ben definiált belső komponens a dátum/idő kiválasztásához.

**Props:**

| Prop | Típus | Leírás |
|---|---|---|
| `label` | `string` | Felirat a gomb felett |
| `items` | `PickerItem[]` | Választható elemek (`{ label, value }`) |
| `selectedValue` | `number` | Aktuálisan kiválasztott érték |
| `onSelect` | `(value) => void` | Kiválasztás callback |
| `width` | `number?` | Opcionális fix szélesség (px) |

**Működés:**
1. Egy gomb mutatja a kiválasztott értéket
2. Megnyomásra `Modal` jelenik meg, félátlátszó háttérrel
3. A `FlatList` jeleníti meg az opciókat
4. `getItemLayout` fix 56px magassággal optimalizálja a scrollozást
5. `initialScrollIndex` a kiválasztott elemre scrolloz automatikusan
6. Kiválasztásnál a modal bezárul

**Dátum/idő generátor függvények:**

| Függvény | Kimenet | Példa |
|---|---|---|
| `buildYearItems()` | Aktuális + következő év | `2025, 2026` |
| `buildMonthItems()` | 12 hónap magyar nevekkel | `Január, Február, ...` |
| `buildDayItems(year, month)` | Adott hónap napjai, napnévvel | `1. (Sze), 2. (Csüt), ...` |
| `buildHourItems()` | 0–23 óra | `00 óra, 01 óra, ...` |
| `buildMinuteItems()` | 0–55 perc, 5-ös lépésközzel | `00 perc, 05 perc, 10 perc, ...` |

> **Évválasztó tartomány:** Szándékosan csak 2 év (aktuális + következő). Korábban 5 év volt, de ez túl hosszú távnak bizonyult egy emlékeztető apphoz.

#### Dátum validáció

- A hónap vagy év változásakor a nap automatikusan korrigálódik, ha a hónap rövidebb (pl. 31 → 28 februárban)
- A „Mikor?" szekció alján élő előnézet mutatja a kiválasztott dátumot
- Ha a dátum a múltban van: piros figyelmeztető szöveg és letiltott mentés gomb

#### Mentés (`handleSubmit`)

1. **Validáció:** Cím nem üres + dátum a jövőben
2. **Meglévő értesítés törlése** (szerkesztés esetén): `cancelReminder(existingNotificationId)`
3. **Engedélykérés:** `registerForPushNotifications()`
4. **Értesítés ütemezése:** `scheduleReminder(title, content, date)` — ha az ütemezés sikertelen, a mentés így is folytatódik
5. **Adatmentés:**
   - Új: `saveNote({...})`
   - Szerkesztés: `updateNote({...})`
6. **Visszanavigálás:** `navigation.goBack()`
7. **Hiba kezelés:** Alert dialógus, ha a mentés sikertelen

---

## 7. Navigáció (`AppNavigator.tsx`)

Egyszerű kétképernyős stack navigátor:

```
Stack.Navigator (headerShown: false)
├── "Home"     → HomeScreen
└── "EditNote" → EditNoteScreen (animation: slide_from_right)
```

A fejléc minden képernyőn el van rejtve (`headerShown: false`), mert mindkét képernyő saját fejlécet implementál.

---

## 8. Belépési pont (`App.tsx`)

A gyökér komponens felelősségei:

1. **Értesítés regisztráció:** `registerForPushNotifications()` hívása az app indításakor
2. **Csengőhang figyelő:** `addNotificationReceivedListener` — értesítés érkezésekor meghívja a `playRingtone()` függvényt
3. **Koppintás figyelő:** `addNotificationResponseReceivedListener` — értesítésre koppintáskor `stopRingtone()` hívás
4. **Cleanup:** Unmount-kor mindkét listener `.remove()` hívása

**Komponens hierarchia:**

```
<SafeAreaProvider>
  <NavigationContainer>
    <StatusBar style="dark" />
    <AppNavigator />
  </NavigationContainer>
</SafeAreaProvider>
```

---

## 9. Expo konfiguráció (`app.json`)

| Mező | Érték | Leírás |
|---|---|---|
| `name` | „El ne felejtsd!" | Alkalmazás megjelenített neve |
| `slug` | `elnefeledd` | URL-barát azonosító |
| `version` | `1.0.0` | Alkalmazás verzió |
| `orientation` | `portrait` | Csak álló mód |
| `userInterfaceStyle` | `light` | Világos téma |
| `newArchEnabled` | `true` | React Native új architektúra |
| `android.package` | `com.elnefeledd.app` | Android csomagnév |
| `android.edgeToEdgeEnabled` | `true` | Teljes képernyő |
| `android.permissions` | `SCHEDULE_EXACT_ALARM`, `POST_NOTIFICATIONS` | Szükséges engedélyek |
| `splash.backgroundColor` | `#F59E0B` | Splash háttér (narancs) |
| `android.adaptiveIcon.backgroundColor` | `#F59E0B` | Adaptive ikon háttér (narancs) |
| EAS Project ID | `293224f2-18d2-42a6-b8bc-22b17cc2be37` | EAS projektazonosító |

---

## 10. Build konfiguráció (`eas.json`)

### Preview profil (teszteléshez)

```json
{
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

- **Output:** `.apk` fájl, közvetlenül telepíthető
- **Terjesztés:** Belső (internal) — direct link-kel telepíthető

### Production profil (Play Store-hoz)

```json
{
  "android": {
    "buildType": "app-bundle"
  }
}
```

- **Output:** `.aab` fájl, Google Play feltöltéshez

---

## 11. Ikon generálás (`generate-icons.js`)

Node.js script, amely a `canvas` (node-canvas) csomag segítségével programmatikusan generálja az app ikonjait.

### Vizuális design

- **Háttér:** Amber → narancs lineáris gradiens (`#F59E0B` → `#EA580C`), lekerekített sarkokkal
- **Ikon:** Zöld (`#16A34A`) csengő (bell) alakzat felkiáltójellel
- **Splash:** Fehér háttéren zöld csengő + „El ne felejtsd!" felirat

### Generált fájlok

| Fájl | Méret | Leírás |
|---|---|---|
| `icon.png` | 1024×1024 | Fő app ikon |
| `adaptive-icon.png` | 1024×1024 | Android adaptive ikon előtér (átlátszó háttér) |
| `splash-icon.png` | 200×200 | Splash screen ikon |
| `favicon.png` | 48×48 | Web favicon |

### Futtatás

```bash
node generate-icons.js
```

> **Előfeltétel:** `canvas` (node-canvas) csomag telepítve kell legyen (`devDependencies`-ben van).

---

## 12. UI / UX Design

### Színpaletta

| Szín | Hex | Használat |
|---|---|---|
| **Háttér** | `#F1F5F9` | Mindkét képernyő háttere |
| **Kártya háttér** | `#FFFFFF` | Kártyák, input mezők |
| **Elsődleges kék** | `#2563EB` | FAB, mentés gomb, kiválasztott elemek |
| **Szöveg fekete** | `#0F172A` | Címek, fontos szövegek |
| **Szöveg szürke** | `#94A3B8` | Másodlagos szövegek, placeholder |
| **Sikeres zöld** | `#16A34A` | Érvényes dátum, ikon |
| **Hiba piros** | `#EF4444` | Érvénytelen dátum |
| **Lejárt piros** | `#DC2626` / `#FEE2E2` | Lejárt badge |
| **Aktív kék** | `#1D4ED8` / `#DBEAFE` | Aktív badge |

### Tipográfia

- **Fejléc:** 24px, fontWeight 800
- **Kártya cím:** 15px, fontWeight 700
- **Gomb szöveg:** 17px, fontWeight 700
- **Label:** 14px, fontWeight 700
- **Másodlagos:** 12–13px, fontWeight 600

### Layout

- `SafeAreaView` mindkét képernyőn a notch/statusbar kezeléshez
- `KeyboardAvoidingView` a szerkesztő képernyőn (iOS: padding, Android: height)
- Kártyák: `borderRadius: 14`, enyhe árnyék (`elevation: 1`)
- FAB: `borderRadius: 18`, erősebb árnyék (`elevation: 6`)

---

## 13. Magyar lokalizáció

Az app teljes egészében magyar nyelvű. A következő konstansok biztosítják a lokalizációt:

### Napnevek (rövid — EditNoteScreen)

```typescript
const DAYS_HU = ['Vas', 'Hét', 'Kedd', 'Sze', 'Csüt', 'Pén', 'Szo'];
```

### Napnevek (hosszú — HomeScreen)

```typescript
const DAYS_HU = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
```

### Hónapnevek (teljes — EditNoteScreen dropdown)

```typescript
const MONTHS_HU = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
                   'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
```

### Hónapnevek (rövid — HomeScreen lista)

```typescript
const MONTHS_HU = ['jan.', 'feb.', 'már.', 'ápr.', 'máj.', 'jún.',
                   'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
```

### UI szövegek

| Kulcs | Szöveg |
|---|---|
| Fejléc | „El ne felejtsd!" |
| Üres állapot | „Nincs emlékeztetőd" |
| Új gomb | „Új emlékeztető" |
| Szerkesztő fejléc (új) | „Új emlékeztető" |
| Szerkesztő fejléc (szerkesztés) | „Szerkesztés" |
| Cím label | „Mire emlékeztesselek?" |
| Cím placeholder | „pl. Fogorvos, Szülinap, Határidő..." |
| Megjegyzés label | „Megjegyzés (opcionális)" |
| Megjegyzés placeholder | „Részletek, cím, telefonszám..." |
| Dátum label | „Mikor?" |
| Mentés gomb | „Emlékeztető beállítása" / „Emlékeztető frissítése" |
| Törlés megerősítés | „Törlöd: \"{cím}\"?" |
| Hiba: üres cím | „Adj meg egy nevet az emlékeztetőnek!" |
| Hiba: múltbeli dátum | „Az időpont a jövőben kell legyen!" |
| Hiba: nincs engedély | „Az emlékeztetőkhöz engedélyezd az értesítéseket a beállításokban!" |
| Hiba: mentés | „Nem sikerült menteni. Próbáld újra!" |

---

## 14. Fejlesztési és build útmutató

### Előfeltételek

- **Node.js** >= 18
- **npm** (a projektben package-lock.json van)
- **Expo CLI** (`npx expo`)
- **EAS CLI** (`npx eas-cli` vagy globálisan `npm install -g eas-cli`)
- **Expo fiók** (bejelentkezve: `npx eas-cli login`)

### Fejlesztés

```bash
# Függőségek telepítése
npm install

# Expo Dev Server indítása
npx expo start

# Android emulátoron / fizikai eszközön
npx expo start --android
```

### Preview Build (APK)

```bash
npx eas-cli build --platform android --profile preview
```

Az APK-t az Expo Dashboard-ról vagy a terminálban kapott linkről lehet letölteni.

### Production Build (AAB)

```bash
npx eas-cli build --platform android --profile production
```

### Ikonok újragenerálása

```bash
node generate-icons.js
```

---

## 15. Ismert korlátozások és fejlesztési lehetőségek

### Jelenlegi korlátozások

1. **Csengőhang csak előtérben:** A telefon csengőhangja csak akkor szól, ha az app előtérben van az értesítés pillanatában. Háttérben az alapértelmezett notification hang szól.
2. **iOS build hiányzik:** Nincs Apple Developer fiók, így iOS build nem készül.
3. **Színválasztó nem aktív:** A `NoteColor` és `NOTE_COLORS` definiálva vannak, de a UI nem kínálja fel.
4. **Perc lépésköz:** 5 perces lépésköz a percválasztóban (0, 5, 10, ... 55).
5. **Offline only:** Nincs felhő szinkronizáció, az adatok kizárólag az eszközön tárolódnak.
6. **Nincs ismétlődő emlékeztető:** Csak egyszeri értesítések.

### Lehetséges fejlesztések

- Ismétlődő emlékeztetők (napi, heti, havi)
- Felhő szinkronizáció (pl. Supabase, Firebase)
- Widget az Android kezdőképernyőn
- Sötét téma
- Színes kártyák (a meglévő `NoteColor` rendszer aktiválása)
- Kategóriák / címkék
- Keresés az emlékeztetők között
- iOS támogatás
- Háttérben futó csengőhang (natív modul szükséges)
- Értesítési hang testreszabás az appon belül
- Snooze funkció (halasztás)
- Export/import funkció

---

## 16. Hibaelhárítás és korábban javított problémák

| Probléma | Megoldás |
|---|---|
| `uuidv4()` runtime hiba | Egyedi `generateId()` függvényre cserélve (`Date.now` + `Math.random` base36) |
| Évszámok csonkolódtak a dropdownban | `FlatList.getItemLayout` `length` értéke nem egyezett az `option.height`-tal (48 → 56) |
| Értesítési hang nem szólt (v1-v2) | Channel ID váltás (`reminders_v1` → `v2` → `v3`), `importance: MAX` beállítás |
| Értesítési hang nem szólt (v3) | `shouldPlaySound: false` letiltotta a hangot; `content://settings/system/ringtone` URI nem működött expo-av ExoPlayer-rel. Javítás: `shouldPlaySound: true` + `ALARM` audioAttributes + channel v4 |
| Lejárt emlékeztetők duplán jelentek meg | `FlatList` `data` és `ListFooterComponent` is renderelte a lejárt elemeket. Javítás: `data` csak `upcoming` elemeket tartalmaz |
| Git push rejected | `git push --force` — a remote és local eltérés miatt |
| `removeNotificationSubscription` nem létezik | Subscription `.remove()` metódusra cserélve (újabb expo-notifications API) |
| `useRef` TypeScript hiba | Kezdőérték megadása: `useRef<T | null>(null)` |

---

## 17. Függőségi gráf

```
App.tsx
├── expo-notifications (listener-ek)
├── ringtoneService.ts
│   └── modules/expo-ringtone (natív ExpoRingtone modul → RingtoneManager + MediaPlayer)
├── notificationService.ts
│   ├── expo-notifications
│   └── expo-device
├── AppNavigator.tsx
│   ├── HomeScreen.tsx
│   │   ├── storageService.ts
│   │   │   └── @react-native-async-storage/async-storage
│   │   ├── notificationService.ts (cancelReminder)
│   │   └── types/index.ts (Note)
│   └── EditNoteScreen.tsx
│       ├── storageService.ts (saveNote, updateNote, getNoteById)
│       ├── notificationService.ts (scheduleReminder, cancelReminder, registerForPushNotifications)
│       └── types/index.ts (Note)
└── @react-navigation/native (NavigationContainer)
```

---

## 18. Git & Verziókezelés

- **Repository:** `https://github.com/asztaloszoli/elnefeledd-expo`
- **Branch:** `master`
- **EAS Project:** `293224f2-18d2-42a6-b8bc-22b17cc2be37`
- **Expo Account:** `asztaloszoli`

---

*Készítette: Cascade AI Fejlesztő Asszisztens — 2025. február*
