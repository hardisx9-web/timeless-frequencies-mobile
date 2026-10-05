# Timeless Frequencies — Native Android Phase 2

## Product and source of truth

Replace the temporary “Timeless Frequencies — Native Android Preview” with the
real Timeless Frequencies experience in this existing Expo/React Native
application. The live product at <https://timeless-frequencies.vercel.app/> is
the source of truth for the product concept, existing functionality, mood, and
visual identity, except where this brief explicitly changes or expands it.
Inspect the live site and this repository before making design or technical
decisions. Do not confuse this product with another project or import unrelated
features.

Timeless Frequencies is an atmospheric, nostalgic receiver for live broadcasts
and accidental discovery, not a conventional station directory. The radio is
the hero. Preserve the existing old-radio idea, tactile controls, quiet
listening mood, source attribution, and purposeful discovery while translating
browser-only interactions into native Android interactions. Do not embed the
website in a WebView.

The live product's discovered vocabulary and behavior includes a physical
receiver presentation and frequency scale, power control, station browsing,
saved/favorite frequencies, current-broadcast information and broadcaster
attribution, signal retry, and a sleep timer. Preserve/adapt these legitimate
features where they fit the native language-first radio. Retain relevant
broadcast/source information; Timeless Frequencies is a receiver, not the
broadcaster. Do not claim that the app supplies or owns the broadcast.

## Language-first catalogue and data

The primary catalogue presents **one visible radio/channel option per
language and region**. A listener chooses a language, tunes in, and listens.
Keep alternate stations hidden; they exist for same-language retuning and
failover, not for browsing. Similar languages from different regions need
clear labels, for example Indian Bengali versus Bangladesh Bengali and Indian
Urdu versus Pakistan Urdu.

Research and include a legitimate, publicly accessible or authorized stream
where one can reasonably be obtained for each of these Indian languages:
Malayalam, Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Punjabi,
Urdu, Odia, and Assamese. Investigate other major Indian languages and include
them where practical. Also investigate and provide English, Sri Lanka/Sinhala,
Pakistan/Urdu, Arabic, Bangladesh/Bengali, and Nepal/Nepali options. If a
requested language genuinely has no sufficiently reliable legitimate source,
document the research result instead of inventing a station or availability.

Keep the data independent of UI code and extensible. A language/channel record
should be able to express a stable language identifier, display and native
script names, country/region, primary station, hidden fallback stations,
broadcaster/station name, stream URL and type, source metadata/attribution,
and optional legitimate artwork. Keep stream provenance and verification
evidence with the data. Do not invent station names, broadcasters, URLs, or
availability claims. Prefer stable direct streams and broadcaster-owned
sources. A URL responding to a request is not, by itself, proof of a working
radio stream. Verify candidates as far as the environment permits, and do not
bypass authentication, DRM, paywalls, or geographic/access controls. Do not
proxy, download, or rebroadcast copyrighted audio through our servers, expose
secrets/API keys, or invent unofficial APIs.

The live website's curated station/source information and useful product
concepts may be reused after verification. Do not blindly port browser-specific
audio, DOM, directory, or input implementation into React Native.

## Native radio and audio behavior

Implement a native player that correctly handles play, pause, selected
language, current broadcaster where appropriate, loading, buffering,
connection/stream failure, retry, station switching, and retuning. Never play
two radio streams at once. Stop/release the prior stream when a new stream
starts. Handle network changes, interruptions, app/screen lifecycle and
stream-transition failures with understandable states, useful retry behavior,
and no unexplained blank/frozen screen or infinite retry loop. Be conservative
with automatic stream-failure recovery; make it understandable, reuse the
same-language retuning engine, and bound the number of attempts.

Preserve audio continuity as reasonably as the source and platform allow.
Treat retuning as an intentional radio action rather than a crash/restart. A
locally bundled analogue static/tuning cue is optional; if used it must be
brief, legally safe, and balanced below the broadcast level. Visual
reception/tuning effects must remain subtle and must not be the only way to
communicate state.

## Shake to Retune

Implement the signature **Shake to Retune** interaction. During active playback,
a deliberate physical shake retunes to a different verified station belonging
to the selected language without changing that language or exposing the
fallback list. Use an Expo SDK 57-compatible sensor. Distinguish an intentional
shake from walking, picking up, rotating, and ordinary handling with a
comfortable acceleration threshold, multiple-sample/pattern confirmation,
debounce, and cooldown; do not require violent shaking or switch stations
constantly.

On a valid shake, provide subtle haptics where supported, a short “Retuning…”
state and a restrained analog tuning/reception disturbance, then switch to the
next usable same-language station and resume playback. The user may shake for
any reason; do not claim to detect advertisements. A very short local analogue
static cue is optional, never loud or required.

Manual Retune must be an accessible, discoverable control and must call the
same underlying same-language retuning engine as Shake to Retune and any
conservative automatic stream-failure recovery. Cycle through verified
alternatives without immediately returning to the just-playing station. A
failed alternate may lead to another known fallback, but attempts must be
bounded. If only one usable stream exists, or all known alternatives are
temporarily unavailable, do not stop a working stream; give feedback that no
alternate is available.

Provide a “Shake to Retune” setting, allow it to be turned off, and persist the
preference locally where practical. Subscribe to the accelerometer only while
the setting is enabled and radio playback is active/appropriate; stop sensor
updates and remove subscriptions when not appropriate or on unmount.

## Native UX, responsiveness, and accessibility

Use Expo Router and native React Native controls. Build an atmospheric,
nostalgic, tactile and polished physical-radio experience rather than a
generic Material/Expo template. Preserve the live brand's own typography,
colors, wood/brass/amber mood, backgrounds, lighting, gradients, glow,
textures, panels, icon character, spacing, frequency/dial treatment, and
motion where appropriate to native components. The receiver stays visually
dominant; the language catalogue must stay uncluttered.

Provide useful but restrained animation for tuning, frequency movement, power,
language changes, signal acquisition, loading and retuning. Maintain
responsiveness and performance. Remove the temporary preview animation and
preview copy. Handle Android screen sizes, safe areas, status bar, gesture
navigation, Android back behavior, touch targets, scrolling, app/audio
lifecycle, and network/loading/buffering/failure/retry states. Use readable
text, accessible labels/roles and non-color/non-motion alternatives for
important states. The full experience must work with Shake to Retune disabled.

## Technical foundation and constraints

Keep the existing working project and verified Expo Go foundation:

- Expo SDK 57; do not upgrade or downgrade Expo.
- App name: Timeless Frequencies.
- Slug: `timeless-frequencies`.
- Android package: `com.timelessfrequencies.app`.
- Use only Expo SDK 57-compatible dependencies, preferring Expo-supported
  packages. Check the matching versioned Expo SDK documentation and dependency
  compatibility before changing code or adding packages.
- Preserve the currently working Expo Go setup. If a feature requires a later
  development/production native build, implement the Expo Go-compatible part
  cleanly and document the native-build limitation rather than damaging Expo
  Go.
- Do not rebuild/reinitialize/delete the repository, use `--force`, edit or
  create generated `ios/` or `android/` directories, use Android Studio, or
  require a local Android SDK.
- Do not commit, push, deploy, or build an APK/AAB in this phase.

## Implementation and validation

Implement in this order: inspect the actual live website and existing
repository; preserve the Expo foundation; keep this specification in this
file; establish the native visual system; replace the preview with the real
radio experience; implement the language-first interface and separate
extensible radio data; research and verify primary/fallback streams; implement
robust audio playback and shared same-language retuning; add Manual Retune,
Shake to Retune, sensor feedback/cleanup and persistent setting; adapt the
remaining legitimate site functionality; polish responsiveness, accessibility,
safe areas, system UI and failure states.

Run TypeScript validation, Expo Doctor, and Expo's dependency compatibility
check. Fix genuine errors without destructive upgrades. Do not get blocked by
interactive ESLint setup. Start or reuse the Expo Go tunnel and verify that
Metro runs, the Android bundle is served, the manifest/update endpoint works,
the public tunnel is reachable, and the implementation has no obvious runtime
crash. Do not claim a stream works without verification.

At completion report: what the actual live website contains; what was adapted;
languages implemented; verified primary and fallback stations by language;
languages lacking a sufficiently reliable legitimate source; player,
same-language failover, manual-retune, shake, threshold/debounce/cooldown,
haptic/tuning effect, and preference status; packages and reasons; important
files; TypeScript, Expo Doctor and compatibility-check results; warnings and
limitations; anything deferred to a later native APK/AAB stage; and Metro/
tunnel status. Do not commit, push, deploy, or build an APK/AAB.

## Phase 2 implementation research notes

Research inspected the live page's shipped HTML, CSS, JavaScript, and embedded
catalogue. The live receiver uses warm ink/paper text, deep wood,
brass and amber accents, DM Mono and Libre Baskerville, an analog tuner,
speaker grille, power control, volume, saved stations, a station information
drawer, signal retry, and a sleep timer. Its browser player also makes local
Web Audio tuning/static sounds and uses stream-level retry; the embedded
records did not supply current-track metadata endpoints. Preserve the source,
language and broadcaster information, but do not fabricate a song title.

The native catalogue now has one visible channel per supported language and
region, with 48 hidden primary/fallback station records across 20 channel
options. All 48 direct URLs were requested from the development environment on
the verification date: direct audio endpoints returned audio bytes and HLS
endpoints returned a playlist and media segment. This verifies HTTP transport
and source availability at that time, not audible playback on a physical
Android device or ongoing broadcaster uptime. Re-check streams periodically.

The requested language/region options have a verified primary source. The
available fallbacks are grouped by the same language and region; the Indian
Urdu, Arabic, Nepali, Konkani, and Sanskrit options currently have only one
verified source each and therefore do not change station when retuned. The
catalogue also investigates/ships Konkani and Sanskrit. Dedicated,
sufficiently reliable stream sources were not verified in this pass for
Kashmiri, Sindhi, Meitei/Manipuri, Bodo, Dogri, Maithili, or Santali; do not
add these as playable channels until a legitimate source and stream can be
verified. A legacy Akashvani Nagaon URL returned 404 and was excluded.

Expo Audio, Sensors, Haptics, and AsyncStorage are Expo SDK 57-compatible and
included in Expo Go. The app config enables Expo Audio background playback
and lock-screen controls for a future native binary; Expo Go cannot apply this
project's config plugin to its own native manifest, so sustained background
playback/lock-screen behavior must be confirmed on a development or production
build before promising it. No bundled static audio is required; native retunes
use a brief visual disturbance and subtle haptics instead.

## Next implementation pass: radio-first physical interface

The current native screen is an intermediate implementation, not the intended
final visual design. Its long brown page, rectangular cards/buttons, and
language catalogue beneath the receiver make it feel like a webpage rather
than an object. Redesign the radio itself as the dominant interface: a
believable physical cabinet with convincing depth/material/shadows, prominent
circular rotary controls, tactile tuning and volume/power knobs, a speaker
grille, an illuminated analogue frequency window with a moving indicator,
restrained labels, and polished tactile tuning animation. Language selection,
favorites, settings, and secondary controls must remain subordinate to the
receiver. Preserve Shake to Retune, hidden same-language station fallbacks,
audio/player architecture, and existing language/station data; this design
direction does not authorize changing those behaviors or data.

## Expo Go physical-device delivery investigation

The current running Metro manifest reports runtime `exposdk:57.0.0`, the
Android launch bundle, and an empty `assets` list. An empty asset list is
expected for this development-server manifest; it is not an EAS Update asset
manifest. There are no local font or audio files referenced by the app. The
manifest's JS bundle and icon URLs were externally requested successfully in
the development environment, but that does not verify reachability from the
listener's Android phone.

The current process was launched with
`EXPO_FORCE_WEBCONTAINER_ENV=1` and uses Expo CLI's WebContainer/WebSocket
tunnel (`boltexpo.dev`), whereas the earlier standard tunnel attempt used
ngrok (`exp.direct`). This is a concrete development-server-mode difference
to investigate against the last known phone-working setup. Do not claim this
mode or a successful HTTP response proves phone delivery. At the time of this
note the physical-device download failure remains unconfirmed/unresolved; do
not change Expo SDK, remove Phase 2 modules/features, or infer a UI/runtime
failure from the generic Expo Go download error. Obtain phone-side failure
details or test a supported standard Expo Go tunnel mode before attributing
the error to application code.