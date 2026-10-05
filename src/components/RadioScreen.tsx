import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RADIO_CATALOG, type RadioChannel, type RadioStation } from '../data/radioCatalog';
import { useRadioPlayer } from '../hooks/useRadioPlayer';
import {
  DEFAULT_PREFERENCES,
  loadUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from '../storage/userPreferences';

type SheetName = 'language' | 'settings' | 'sleep' | 'information' | null;

const SLEEP_CHOICES = [15, 30, 45, 60];
const CABINET_COLORS = {
  night: '#100C0A',
  walnut: '#482214',
  walnutDeep: '#190C08',
  walnutEdge: '#714021',
  brass: '#BF8A4C',
  brassBright: '#E7BD7C',
  amber: '#F0A950',
  paper: '#F1D69D',
  dial: '#17110D',
  dialLit: '#F4B557',
  ink: '#E6CBA7',
  muted: '#A28465',
  green: '#F0A950',
  red: '#C47762',
};

const LANGUAGE_MARKS: Record<string, string> = {
  en: 'ENG',
  hi: 'HIN',
  ml: 'MAL',
  ta: 'TAM',
  te: 'TEL',
  kn: 'KAN',
  bn: 'BEN',
  mr: 'MAR',
  gu: 'GUJ',
  pa: 'PUN',
  ur: 'URD',
  or: 'ODI',
  as: 'ASM',
  si: 'SIN',
  ar: 'ARA',
  ne: 'NEP',
  kok: 'KON',
  sa: 'SAN',
};

function playbackLabel(phase: ReturnType<typeof useRadioPlayer>['phase']) {
  switch (phase) {
    case 'connecting':
      return 'ACQUIRING';
    case 'buffering':
      return 'BUFFERING';
    case 'playing':
      return 'ON AIR';
    case 'paused':
      return 'PAUSED';
    case 'retuning':
      return 'RETUNING';
    case 'error':
      return 'NO SIGNAL';
    default:
      return 'STANDBY';
  }
}

function impactHaptic(style: Parameters<typeof Haptics.impactAsync>[0]) {
  void Haptics.impactAsync(style).catch((error: unknown) => {
    console.warn('Radio control haptic feedback was unavailable.', error);
  });
}

function selectionHaptic() {
  void Haptics.selectionAsync().catch((error: unknown) => {
    console.warn('Radio selection haptic feedback was unavailable.', error);
  });
}

function RotaryControl({
  accessibilityLabel,
  accessibilityValue,
  rotation,
  diameter,
  engraved,
  onPress,
  onAccessibilityAction,
  panHandlers,
  testID,
}: {
  accessibilityLabel: string;
  accessibilityValue: { min: number; max: number; now: number; text: string };
  rotation: Animated.Value;
  diameter: number;
  engraved: string;
  onPress: () => void;
  onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => void;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  testID: string;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const rotationStyle = rotation.interpolate({
    inputRange: [-145, 145],
    outputRange: ['-145deg', '145deg'],
    extrapolate: 'clamp',
  });
  const grooveCount = 20;
  const scaleMarkCount = 16;
  const turningDiameter = diameter * 0.84;

  return (
    <Animated.View
      {...panHandlers}
      accessibilityActions={[
        { name: 'increment', label: 'Increase' },
        { name: 'decrement', label: 'Decrease' },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={accessibilityValue}
      onAccessibilityAction={onAccessibilityAction}
      onTouchStart={() =>
        Animated.spring(pressScale, {
          toValue: 0.985,
          speed: 30,
          useNativeDriver: true,
        }).start()
      }
      onTouchEnd={() =>
        Animated.spring(pressScale, {
          toValue: 1,
          speed: 24,
          bounciness: 0,
          useNativeDriver: true,
        }).start()
      }
      style={[styles.knobTouchArea, { width: diameter + 18 }]}
      testID={testID}
    >
      <View style={[styles.knobShadow, { width: diameter, height: diameter }]}>
        <View
          pointerEvents="none"
          style={[
            styles.knobBezel,
            { width: diameter, height: diameter },
          ]}
        />
        {Array.from({ length: scaleMarkCount }, (_, index) => (
          <View
            key={`scale-${index}`}
            pointerEvents="none"
            style={[
              styles.knobScaleMark,
              {
                left:
                  diameter / 2 +
                  Math.sin((Math.PI * 2 * index) / scaleMarkCount) *
                    diameter *
                    0.46 -
                  0.5,
                top:
                  diameter / 2 -
                  Math.cos((Math.PI * 2 * index) / scaleMarkCount) *
                    diameter *
                    0.46 -
                  (index % 4 === 0 ? 4 : 2),
                height: index % 4 === 0 ? 8 : 4,
                transform: [{ rotate: `${(360 / scaleMarkCount) * index}deg` }],
              },
            ]}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.knobTurning,
            {
              width: turningDiameter,
              height: turningDiameter,
              transform: [{ rotate: rotationStyle }, { scale: pressScale }],
            },
          ]}
        >
          {Array.from({ length: grooveCount }, (_, index) => (
            <View
              key={index}
              style={[
                styles.knobRidge,
                {
                  height: turningDiameter * 0.085,
                  left:
                    turningDiameter / 2 +
                    Math.sin((Math.PI * 2 * index) / grooveCount) *
                      turningDiameter *
                      0.43 -
                    1,
                  top:
                    turningDiameter / 2 -
                    Math.cos((Math.PI * 2 * index) / grooveCount) *
                      turningDiameter *
                      0.43 -
                    (turningDiameter * 0.085) / 2,
                  transform: [{ rotate: `${(360 / grooveCount) * index}deg` }],
                },
              ]}
            />
          ))}
          <View style={styles.knobFace}>
            <View style={styles.knobFaceHighlight} />
            <Text numberOfLines={1} style={styles.knobEngraving}>
              {engraved}
            </Text>
          </View>
          <View style={styles.knobNotch} />
        </Animated.View>
        <Pressable
          accessibilityLabel={`${accessibilityLabel}. Activate`}
          accessibilityRole="button"
          onPress={onPress}
          style={styles.knobCentreAction}
        >
          <View style={styles.knobCap}>
            <View style={styles.knobCapHighlight} />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function SpeakerGrille({ active, compact }: { active: boolean; compact: boolean }) {
  const fibers = compact ? 18 : 24;
  const crossFibers = compact ? 11 : 14;
  const speakerDiameter = compact ? 92 : 108;
  return (
    <View
      accessibilityLabel={active ? 'Speaker grille, radio playing' : 'Radio speaker grille'}
      accessibilityRole="image"
      style={[
        styles.speakerHousing,
        compact && styles.speakerHousingCompact,
        { height: '100%' },
      ]}
    >
      <View style={styles.speakerFabric}>
        <View
          pointerEvents="none"
          style={[
            styles.speakerRings,
            {
              width: speakerDiameter,
              height: speakerDiameter,
              marginLeft: -speakerDiameter / 2,
              marginTop: -speakerDiameter / 2,
            },
          ]}
        >
          <View style={[styles.speakerRing, styles.speakerRingOuter]} />
          <View style={[styles.speakerRing, styles.speakerRingMiddle]} />
          <View style={[styles.speakerRing, styles.speakerRingInner]} />
        </View>
        <View pointerEvents="none" style={styles.speakerWarp}>
          {Array.from({ length: fibers }, (_, index) => (
            <View key={index} style={styles.speakerWarpFiber} />
          ))}
        </View>
        <View pointerEvents="none" style={styles.speakerWeft}>
          {Array.from({ length: crossFibers }, (_, index) => (
            <View
              key={index}
              style={[
                styles.speakerWeftFiber,
                active && index === Math.floor(crossFibers / 2) && styles.speakerWeftActive,
              ]}
            />
          ))}
        </View>
        <View pointerEvents="none" style={styles.speakerClothInset} />
        <View style={styles.speakerClothHighlight} />
      </View>
      <View style={styles.speakerBadge}>
        <Text style={styles.speakerBadgeText}>TF</Text>
      </View>
    </View>
  );
}

function BroadcastDetails({
  channel,
  station,
  onOpenSource,
}: {
  channel: RadioChannel;
  station: RadioStation;
  onOpenSource: () => void;
}) {
  return (
    <>
      <View style={styles.detailHero}>
        <Text style={styles.sheetEyebrow}>CURRENT BROADCAST</Text>
        <Text style={styles.detailLanguage}>{channel.languageName}</Text>
        <Text style={styles.detailNative}>{channel.nativeName} · {channel.regionLabel}</Text>
      </View>
      <DetailRow label="Station" value={station.name} />
      <DetailRow label="Broadcaster" value={station.broadcaster} />
      <DetailRow label="Stream" value={station.format.toUpperCase()} />
      <DetailRow label="Verified" value={station.verifiedAt} />
      <Text style={styles.sourceCopy}>{station.sourceAttribution}</Text>
      <Text style={styles.sourceCopy}>
        Timeless Frequencies receives the live broadcast; the broadcaster
        supplies the source.
      </Text>
      {station.sourceHomepage ? (
        <Pressable
          accessibilityRole="link"
          onPress={onOpenSource}
          style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}
        >
          <Text style={styles.sheetActionText}>OPEN BROADCASTER ↗</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function RadioSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close panel"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalScrim}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.sheetScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function RadioScreen({
  showOpeningPreferencePrompt,
  onOpeningPreferenceResolved,
}: {
  showOpeningPreferencePrompt: boolean;
  onOpeningPreferenceResolved: () => void;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const preferencesRef = useRef(preferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [openingPreferenceError, setOpeningPreferenceError] = useState<
    string | null
  >(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sleepDeadline, setSleepDeadline] = useState<number | null>(null);
  const [secondsToSleep, setSecondsToSleep] = useState<number | null>(null);
  const [dialWidth, setDialWidth] = useState(0);
  const [tuningIndex, setTuningIndex] = useState(0);
  const [warming, setWarming] = useState(false);

  const radio = useRadioPlayer(preferences.selectedChannelId);
  const selectedIndex = Math.max(
    0,
    RADIO_CATALOG.findIndex((channel) => channel.id === radio.selectedChannelId),
  );
  const selectedChannel = RADIO_CATALOG[selectedIndex] ?? RADIO_CATALOG[0];
  const dialChannel = RADIO_CATALOG[tuningIndex] ?? selectedChannel;
  const currentStation = radio.currentStation ?? selectedChannel.primaryStation;
  const isFavorite = preferences.favoriteChannelIds.includes(selectedChannel.id);

  const tuningRotation = useRef(new Animated.Value(-145)).current;
  const volumeRotation = useRef(new Animated.Value(0)).current;
  const needlePosition = useRef(new Animated.Value(12)).current;
  const dialLight = useRef(new Animated.Value(0)).current;
  const retuneFlicker = useRef(new Animated.Value(0)).current;
  const tuningIndexRef = useRef(0);
  const tuneAccumulator = useRef(0);
  const lastGestureY = useRef(0);
  const volumeGestureStart = useRef(0);
  const volumeGestureValue = useRef(0);
  const volumePowerTriggered = useRef(false);
  const lastDetentHaptic = useRef(0);
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumePanRef = useRef<(dy: number) => void>(() => {});
  const tunePanRef = useRef<(dy: number) => void>(() => {});
  const releaseTuneRef = useRef<() => void>(() => {});
  const releaseVolumeRef = useRef<() => void>(() => {});
  const volumeStartRef = useRef<(y: number) => void>(() => {});

  const compact = windowHeight < 780;
  const micro = windowHeight < 620;
  const narrow = windowWidth < 360;
  const diameter = Math.round(
    Math.min(
      micro ? 74 : compact ? 84 : 94,
      Math.max(micro ? 58 : compact ? 66 : 72, (windowWidth - 140) / 3),
    ),
  );
  const tuningDiameter = Math.min(diameter + (micro ? 4 : 6), micro ? 78 : compact ? 90 : 100);
  const volumeDiameter = Math.round(diameter * 0.9);
  const cabinetWidth = Math.min(windowWidth - 28, 520);
  const dialHeight = micro ? 100 : 106;
  const minimumCabinetHeight =
    dialHeight + 20 + tuningDiameter + 28 + 48 + 71;
  const cabinetHeight = Math.min(
    windowHeight * 0.7,
    Math.max(windowHeight * 0.43, cabinetWidth * 0.98, minimumCabinetHeight),
  );
  const channelCount = RADIO_CATALOG.length;
  const visibleChannels = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return RADIO_CATALOG.filter((channel) => {
      if (favoritesOnly && !preferences.favoriteChannelIds.includes(channel.id)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        channel.languageName,
        channel.nativeName,
        channel.regionLabel,
        channel.displayName,
      ].some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [favoritesOnly, preferences.favoriteChannelIds, search]);

  const persistPreferences = useCallback(
    (next: UserPreferences) => {
      preferencesRef.current = next;
      setPreferences(next);
      if (preferencesLoaded) {
        void saveUserPreferences(next).catch((error: unknown) => {
          console.error('Could not save radio preferences.', error);
          radio.setNotice('This setting could not be saved on this device.');
        });
      }
    },
    [preferencesLoaded, radio.setNotice],
  );

  const updatePreference = useCallback(
    (patch: Partial<UserPreferences>) => {
      persistPreferences({ ...preferencesRef.current, ...patch });
    },
    [persistPreferences],
  );

  const saveOpeningPreference = useCallback(
    async (openingAnimation: boolean) => {
      const previous = preferencesRef.current;
      const next = { ...previous, openingAnimation };
      preferencesRef.current = next;
      setPreferences(next);
      setOpeningPreferenceError(null);
      try {
        await saveUserPreferences(next);
        onOpeningPreferenceResolved();
      } catch (error) {
        preferencesRef.current = previous;
        setPreferences(previous);
        setOpeningPreferenceError(
          'This choice could not be saved. Please try again.',
        );
        console.error('Could not save opening animation preference.', error);
      }
    },
    [onOpeningPreferenceResolved],
  );

  useEffect(() => {
    let active = true;
    void loadUserPreferences()
      .then((stored) => {
        if (!active) {
          return;
        }
        preferencesRef.current = stored;
        setPreferences(stored);
        setPreferencesLoaded(true);
        radio.selectChannel(stored.selectedChannelId);
        radio.setVolume(stored.volume);
        const index = Math.max(
          0,
          RADIO_CATALOG.findIndex((channel) => channel.id === stored.selectedChannelId),
        );
        tuningIndexRef.current = index;
        setTuningIndex(index);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error('Could not load saved radio preferences.', error);
        setPreferencesLoaded(true);
        radio.setNotice('Saved settings could not be read; radio defaults are active.');
      });
    return () => {
      active = false;
    };
  }, [radio.selectChannel, radio.setNotice, radio.setVolume]);

  useEffect(() => {
    const targetIndex = selectedIndex;
    tuningIndexRef.current = targetIndex;
    setTuningIndex(targetIndex);
  }, [selectedIndex]);

  const animateDial = useCallback(
    (index: number) => {
      const fraction = channelCount < 2 ? 0 : index / (channelCount - 1);
      Animated.spring(tuningRotation, {
        toValue: -145 + fraction * 290,
        speed: 17,
        bounciness: 3,
        useNativeDriver: true,
      }).start();
      if (dialWidth > 0) {
        const needleTarget = Math.max(
          0,
          Math.min(
            dialWidth - 2,
            ((index + 0.5) / channelCount) * dialWidth - 1,
          ),
        );
        Animated.spring(needlePosition, {
          toValue: needleTarget,
          speed: 14,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
      }
    },
    [channelCount, dialWidth, needlePosition, tuningRotation],
  );

  useEffect(() => {
    animateDial(tuningIndex);
  }, [animateDial, tuningIndex]);

  useEffect(() => {
    const normalizedAngle = radio.isPowered ? -135 + radio.volume * 270 : -135;
    volumeRotation.setValue(normalizedAngle);
  }, [radio.isPowered, radio.volume, volumeRotation]);

  useEffect(() => {
    Animated.timing(dialLight, {
      toValue: radio.isPowered || warming ? 1 : 0,
      duration: radio.isPowered || warming ? 620 : 500,
      useNativeDriver: true,
    }).start();
  }, [dialLight, radio.isPowered, warming]);

  useEffect(() => {
    if (!radio.retuneSequence) {
      return;
    }
    retuneFlicker.setValue(0.82);
    Animated.sequence([
      Animated.timing(retuneFlicker, { toValue: 0.16, duration: 100, useNativeDriver: true }),
      Animated.timing(retuneFlicker, { toValue: 0.62, duration: 110, useNativeDriver: true }),
      Animated.timing(retuneFlicker, { toValue: 0, duration: 430, useNativeDriver: true }),
    ]).start();
  }, [radio.retuneSequence, retuneFlicker]);

  const detent = useCallback(() => {
    const now = Date.now();
    if (now - lastDetentHaptic.current < 72) {
      return;
    }
    lastDetentHaptic.current = now;
    selectionHaptic();
  }, []);

  const commitTuning = useCallback(() => {
    if (settleTimeout.current !== null) {
      clearTimeout(settleTimeout.current);
    }
    settleTimeout.current = setTimeout(() => {
      const channel = RADIO_CATALOG[tuningIndexRef.current];
      if (!channel) {
        return;
      }
      radio.selectChannel(channel.id);
      updatePreference({ selectedChannelId: channel.id });
    }, 240);
  }, [radio.selectChannel, updatePreference]);

  const changeTuning = useCallback(
    (delta: number, deferCommit = true) => {
      const next = Math.min(channelCount - 1, Math.max(0, tuningIndexRef.current + delta));
      if (next === tuningIndexRef.current) {
        return;
      }
      tuningIndexRef.current = next;
      setTuningIndex(next);
      detent();
      if (deferCommit) {
        commitTuning();
      }
    },
    [channelCount, commitTuning, detent],
  );

  tunePanRef.current = (dy) => {
    const current = -dy;
    tuneAccumulator.current += current - lastGestureY.current;
    lastGestureY.current = current;
    while (tuneAccumulator.current >= 24) {
      tuneAccumulator.current -= 24;
      changeTuning(1);
    }
    while (tuneAccumulator.current <= -24) {
      tuneAccumulator.current += 24;
      changeTuning(-1);
    }
  };
  releaseTuneRef.current = () => {
    tuneAccumulator.current = 0;
    lastGestureY.current = 0;
    commitTuning();
  };

  const selectLanguage = useCallback(
    (channel: RadioChannel) => {
      if (settleTimeout.current !== null) {
        clearTimeout(settleTimeout.current);
      }
      tuningIndexRef.current = RADIO_CATALOG.findIndex((item) => item.id === channel.id);
      setTuningIndex(tuningIndexRef.current);
      radio.selectChannel(channel.id);
      updatePreference({ selectedChannelId: channel.id });
      setSearch('');
      setFavoritesOnly(false);
      setSheet(null);
      detent();
    },
    [detent, radio.selectChannel, updatePreference],
  );

  const setVolumeAndPersist = useCallback(
    (value: number) => {
      const safeValue = Math.min(1, Math.max(0, value));
      radio.setVolume(safeValue);
      updatePreference({ volume: safeValue });
    },
    [radio.setVolume, updatePreference],
  );

  volumePanRef.current = (dy) => {
    const next = Math.min(1, Math.max(0, volumeGestureStart.current - dy * 0.008));
    volumeGestureValue.current = next;
    radio.setVolume(next);
    volumeRotation.setValue(-135 + next * 270);
    if (!radio.isPowered && dy < -22 && !volumePowerTriggered.current) {
      volumePowerTriggered.current = true;
      setWarming(true);
      impactHaptic(Haptics.ImpactFeedbackStyle.Light);
      powerTimeout.current = setTimeout(() => {
        radio.powerOn();
        setWarming(false);
        powerTimeout.current = null;
      }, 430);
    } else if (
      radio.isPowered &&
      next <= 0 &&
      dy >= volumeGestureStart.current / 0.008 + 18
    ) {
      radio.powerOff();
    }
  };
  volumeStartRef.current = () => {
    volumeGestureStart.current = radio.volume;
    volumeGestureValue.current = radio.volume;
    volumePowerTriggered.current = false;
  };
  releaseVolumeRef.current = () => {
    updatePreference({ volume: volumeGestureValue.current });
  };

  const tuningResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 5 || Math.abs(gesture.dx) > 8,
        onPanResponderGrant: () => {
          tuneAccumulator.current = 0;
          lastGestureY.current = 0;
        },
        onPanResponderMove: (_, gesture) => tunePanRef.current(gesture.dy),
        onPanResponderRelease: () => releaseTuneRef.current(),
        onPanResponderTerminate: () => releaseTuneRef.current(),
      }),
    [],
  );
  const volumeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 5 || Math.abs(gesture.dx) > 8,
        onPanResponderGrant: () => volumeStartRef.current(0),
        onPanResponderMove: (_, gesture) => volumePanRef.current(gesture.dy),
        onPanResponderRelease: () => releaseVolumeRef.current(),
        onPanResponderTerminate: () => releaseVolumeRef.current(),
      }),
    [],
  );

  const togglePower = useCallback(() => {
    if (radio.isPowered || warming) {
      if (powerTimeout.current !== null) {
        clearTimeout(powerTimeout.current);
        powerTimeout.current = null;
      }
      setWarming(false);
      radio.powerOff();
      impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    setWarming(true);
    impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
    powerTimeout.current = setTimeout(() => {
      radio.powerOn();
      setWarming(false);
      powerTimeout.current = null;
    }, 430);
  }, [radio.isPowered, radio.powerOff, radio.powerOn, warming]);

  const togglePlay = useCallback(() => {
    if (radio.phase === 'error') {
      radio.retrySignal();
    } else if (!radio.isPowered) {
      togglePower();
    } else {
      radio.togglePlayPause();
    }
  }, [radio.isPowered, radio.phase, radio.retrySignal, radio.togglePlayPause, togglePower]);

  const saveFavorite = useCallback(() => {
    const current = preferencesRef.current.favoriteChannelIds;
    const next = isFavorite
      ? current.filter((id) => id !== selectedChannel.id)
      : [...current, selectedChannel.id];
    updatePreference({ favoriteChannelIds: next });
    selectionHaptic();
  }, [isFavorite, selectedChannel.id, updatePreference]);

  const finishSleepTimer = useCallback(() => {
    setSleepDeadline(null);
    setSecondsToSleep(null);
    setSheet(null);
    radio.powerOff();
    radio.setNotice('The sleep timer turned the receiver off.');
  }, [radio.powerOff, radio.setNotice]);

  useEffect(() => {
    if (sleepDeadline === null) {
      setSecondsToSleep(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((sleepDeadline - Date.now()) / 1000));
      setSecondsToSleep(remaining);
      if (remaining === 0) {
        finishSleepTimer();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [finishSleepTimer, sleepDeadline]);

  useEffect(() => {
    if (sleepDeadline === null) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && sleepDeadline <= Date.now()) {
        finishSleepTimer();
      }
    });
    return () => subscription.remove();
  }, [finishSleepTimer, sleepDeadline]);

  useEffect(
    () => () => {
      if (settleTimeout.current !== null) {
        clearTimeout(settleTimeout.current);
      }
      if (powerTimeout.current !== null) {
        clearTimeout(powerTimeout.current);
      }
    },
    [],
  );

  const openSource = useCallback(async () => {
    if (!currentStation.sourceHomepage) {
      return;
    }
    try {
      await Linking.openURL(currentStation.sourceHomepage);
    } catch (error) {
      console.error('Could not open broadcaster website.', error);
      radio.setNotice('The broadcaster website could not be opened.');
    }
  }, [currentStation.sourceHomepage, radio.setNotice]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepDeadline(minutes === null ? null : Date.now() + minutes * 60_000);
    setSheet(null);
  }, []);

  const knobPowerLabel = radio.isPowered ? 'VOL' : 'OFF';
  const timerLabel =
    secondsToSleep === null ? 'SLEEP' : `${Math.ceil(secondsToSleep / 60)} MIN`;
  const currentPosition = String(tuningIndex + 1).padStart(2, '0');
  const currentBandName = dialChannel.languageName.toLocaleUpperCase();
  const maxContentWidth = Math.min(windowWidth, 580);
  const dialGlowOpacity = dialLight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.22],
  });
  const glassGlowOpacity = dialLight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.13],
  });
  const dialInkOpacity = dialLight.interpolate({
    inputRange: [0, 1],
    outputRange: [0.62, 1],
  });
  const dialOffShade = dialLight.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0],
  });
  const ambientGlow = dialLight.interpolate({
    inputRange: [0, 1],
    outputRange: [0.035, 0.13],
  });

  const renderControls = () => (
    <View style={styles.utilityRow}>
      <Pressable
        accessibilityLabel={isFavorite ? 'Remove favorite language' : 'Save favorite language'}
        accessibilityRole="button"
        accessibilityState={{ selected: isFavorite }}
        onPress={saveFavorite}
        style={({ pressed }) => [styles.utilityControl, pressed && styles.pressed]}
      >
        <View style={styles.smallButtonFace}>
          <Text style={[styles.utilityGlyph, isFavorite && styles.starOn]}>
            {isFavorite ? '★' : '☆'}
          </Text>
        </View>
        <Text style={styles.utilityLabel}>FAVOURITE</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Retune to another station in this language"
        accessibilityHint="Keeps the selected language and changes only the broadcast"
        accessibilityRole="button"
        onPress={radio.retuneNext}
        style={({ pressed }) => [styles.retuneButton, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.retuneButtonFace,
            radio.phase === 'retuning' && styles.retuneButtonFaceActive,
          ]}
        >
          <Text style={styles.retuneGlyph}>↻</Text>
        </View>
        <Text style={styles.utilityLabel}>RETUNE</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={
          radio.phase === 'error'
            ? 'Retry radio signal'
            : radio.phase === 'playing'
              ? 'Pause radio'
              : 'Play radio'
        }
        accessibilityRole="button"
        onPress={togglePlay}
        style={({ pressed }) => [styles.utilityControl, pressed && styles.pressed]}
      >
        <View style={styles.smallButtonFace}>
          <Text style={styles.utilityGlyph}>
            {radio.phase === 'error' ? '↻' : radio.phase === 'playing' ? 'Ⅱ' : '▶'}
          </Text>
        </View>
        <Text style={styles.utilityLabel}>
          {radio.phase === 'playing' ? 'PAUSE' : radio.phase === 'error' ? 'RETRY' : 'PLAY'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Current broadcast information"
        accessibilityRole="button"
        onPress={() => setSheet('information')}
        style={({ pressed }) => [styles.utilityControl, pressed && styles.pressed]}
      >
        <View style={styles.smallButtonFace}>
          <Text style={styles.utilityGlyph}>ⓘ</Text>
        </View>
        <Text style={styles.utilityLabel}>INFO</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={[styles.page, { maxWidth: maxContentWidth }]}>
        <View pointerEvents="none" style={styles.roomBackdrop}>
          <View style={styles.roomUpperShade} />
          <View style={styles.roomWarmth} />
          <View style={styles.roomFloorShadow} />
        </View>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}>
              <View style={styles.brandMarkInner} />
            </View>
            <View>
              <Text style={styles.brand}>TIMELESS FREQUENCIES</Text>
              <Text style={styles.brandSub}>A WORLD RECEIVER</Text>
            </View>
          </View>
          <View style={styles.topActions}>
            <Pressable
              accessibilityLabel={`Sleep timer ${timerLabel}`}
              accessibilityRole="button"
              onPress={() => setSheet('sleep')}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>◷</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open radio settings"
              accessibilityRole="button"
              onPress={() => setSheet('settings')}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>⚙</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.radioStage}>
          <Animated.View
            pointerEvents="none"
            style={[styles.ambientHalo, { opacity: ambientGlow }]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.castShadow,
              { top: '50%', marginTop: cabinetHeight / 2 + 2 },
            ]}
          />
          <View style={[styles.cabinetWrap, { height: cabinetHeight }]}>
            <View style={styles.cabinetTopStrip}>
              <View pointerEvents="none" style={styles.topStripTone} />
              <View pointerEvents="none" style={styles.topStripBandOne} />
              <View pointerEvents="none" style={styles.topStripBandTwo} />
              <View pointerEvents="none" style={styles.topStripBandThree} />
              <View pointerEvents="none" style={styles.topStripHighlight} />
              <Text style={styles.topStripMark}>TF · WORLD BAND</Text>
              <View style={styles.topStripBadge}>
                <Text style={styles.topStripBadgeTitle}>TIMELESS</Text>
                <Text style={styles.topStripBadgeSub}>FREQUENCIES</Text>
              </View>
              <Text style={styles.topStripMark}>No. 07 · STEREO</Text>
              <View style={[styles.topStripScrew, styles.topStripScrewLeft]} />
              <View style={[styles.topStripScrew, styles.topStripScrewRight]} />
            </View>
            <View style={styles.cabinetRim}>
              <View style={[styles.cabinetFace, micro && styles.cabinetFaceMicro]}>
                <View style={styles.faceEdgeTop} />
                <View pointerEvents="none" style={styles.veneerHighlight} />
                <View pointerEvents="none" style={styles.veneerShadowLine} />
                <View pointerEvents="none" style={styles.faceEdgeLeft} />
                <View pointerEvents="none" style={styles.faceEdgeRight} />
                <View pointerEvents="none" style={styles.woodGrain}>
                  <View style={[styles.woodGrainLine, styles.woodGrainLineOne]} />
                  <View style={[styles.woodGrainLine, styles.woodGrainLineTwo]} />
                  <View style={[styles.woodGrainLine, styles.woodGrainLineThree]} />
                  <View style={[styles.woodGrainLine, styles.woodGrainLineFour]} />
                  <View style={[styles.woodGrainLine, styles.woodGrainLineFive]} />
                </View>
                <View style={styles.powerLampWrap}>
                  <Animated.View style={[styles.powerLamp, { opacity: dialLight }]} />
                </View>

                <View
                  style={[
                    styles.upperAssembly,
                    { height: dialHeight },
                    micro && styles.upperAssemblyMicro,
                  ]}
                >
                <Pressable
                  accessibilityLabel={`Choose language. Currently ${dialChannel.displayName}, ${currentPosition} of ${channelCount}.`}
                  accessibilityHint="Opens the language selector"
                  accessibilityRole="button"
                  onPress={() => setSheet('language')}
                  style={[styles.dialWindow, { height: dialHeight }]}
                >
                  <View style={styles.dialGlassEdge}>
                    <View style={styles.dialGlass}>
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.dialIllumination, { opacity: dialGlowOpacity }]}
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.dialInnerGlow, { opacity: glassGlowOpacity }]}
                      />
                      <Animated.View style={[styles.dialInk, { opacity: dialInkOpacity }]}>
                        <View style={styles.dialTopline}>
                          <Text style={styles.dialType}>TIMELESS · WORLD BAND</Text>
                          <Text style={styles.dialPosition}>TF {currentPosition}</Text>
                        </View>
                        <View
                          onLayout={(event) => setDialWidth(event.nativeEvent.layout.width)}
                          style={styles.ticksTrack}
                        >
                          {Array.from({ length: 41 }, (_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.frequencyTick,
                                index % 4 === 0 && styles.frequencyTickMajor,
                                index % 10 === 0 && styles.frequencyTickLong,
                              ]}
                            />
                          ))}
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              styles.tuningNeedle,
                              { transform: [{ translateX: needlePosition }] },
                            ]}
                          >
                            <View style={styles.needleTip} />
                          </Animated.View>
                        </View>
                        <View style={styles.dialMarks}>
                          {RADIO_CATALOG.map((channel, index) => (
                            <Text
                              key={channel.id}
                              numberOfLines={1}
                              style={[
                                styles.dialMark,
                                narrow && styles.dialMarkNarrow,
                                index === tuningIndex && styles.dialMarkSelected,
                                narrow && index === tuningIndex && styles.dialMarkSelectedNarrow,
                              ]}
                            >
                              {LANGUAGE_MARKS[channel.languageIdentifier] ??
                                channel.languageName.slice(0, 3).toUpperCase()}
                            </Text>
                          ))}
                        </View>
                        <View style={styles.dialReadout}>
                          <Text numberOfLines={1} style={styles.dialLanguage}>
                            {currentBandName}
                          </Text>
                          <Text numberOfLines={1} style={styles.dialNative}>
                            {dialChannel.nativeName}
                          </Text>
                        </View>
                      </Animated.View>
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.dialOffShade, { opacity: dialOffShade }]}
                      />
                      <View pointerEvents="none" style={styles.dialReflectionEdge} />
                      <View pointerEvents="none" style={styles.glassReflection} />
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.staticFlicker, { opacity: retuneFlicker }]}
                      />
                    </View>
                  </View>
                </Pressable>
                  <SpeakerGrille active={radio.isPlaying} compact={compact} />
              </View>

              <View style={[styles.currentStationLine, micro && styles.currentStationLineMicro]}>
                <View
                  style={[
                    styles.statusLed,
                    radio.isPlaying && styles.statusLedOn,
                    radio.phase === 'error' && styles.statusLedError,
                    warming && styles.statusLedWarm,
                  ]}
                />
                <Text
                  accessibilityLiveRegion="polite"
                  numberOfLines={1}
                  style={styles.stationName}
                >
                  {radio.phase === 'retuning'
                    ? 'RETUNING…'
                    : radio.phase === 'connecting' || radio.phase === 'buffering'
                      ? 'FINDING SIGNAL…'
                      : currentStation.name}
                </Text>
                <Text style={styles.statusMark}>{playbackLabel(radio.phase)}</Text>
              </View>

              <View
                style={[
                  styles.knobDeck,
                  { minHeight: micro ? 96 : compact ? 98 : 100 },
                ]}
              >
                <View style={styles.knobGroup}>
                  <RotaryControl
                    accessibilityLabel="Language tuning knob"
                    accessibilityValue={{
                      min: 1,
                      max: channelCount,
                      now: tuningIndex + 1,
                      text: `${selectedChannel.languageName}, ${tuningIndex + 1} of ${channelCount}`,
                    }}
                    diameter={tuningDiameter}
                    engraved="TUNE"
                    onAccessibilityAction={({ nativeEvent }) =>
                      changeTuning(nativeEvent.actionName === 'increment' ? 1 : -1)
                    }
                    onPress={() => changeTuning(1)}
                    panHandlers={tuningResponder.panHandlers}
                    rotation={tuningRotation}
                    testID="language-tuning-knob"
                  />
                  <Text style={styles.knobLabel}>TUNING</Text>
                  <Text style={styles.knobSubLabel}>LANGUAGE BAND</Text>
                </View>
                <View
                  style={[
                    styles.knobCenter,
                    { width: Math.max(34, Math.min(58, windowWidth * 0.14)) },
                  ]}
                >
                  <Text style={styles.receiverStatus}>{playbackLabel(radio.phase)}</Text>
                  {radio.phase === 'connecting' || radio.phase === 'buffering' ? (
                    <ActivityIndicator color={CABINET_COLORS.brassBright} size="small" />
                  ) : (
                    <Text style={styles.receiverStatusGlyph}>
                      {radio.isPlaying ? '●' : radio.phase === 'error' ? '!' : '·'}
                    </Text>
                  )}
                </View>
                <View style={styles.volumeGroup}>
                  <View style={[styles.volumeScale, { width: volumeDiameter + 18 }]} pointerEvents="none">
                    <Text style={styles.volumeScaleEnd}>OFF</Text>
                    <Text style={styles.volumeScaleMid}>VOL</Text>
                    <Text style={styles.volumeScaleEnd}>MAX</Text>
                  </View>
                  <RotaryControl
                    accessibilityLabel={`Volume and power knob, ${radio.isPowered ? `${Math.round(radio.volume * 100)} percent volume` : 'off'}`}
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: radio.isPowered ? Math.round(radio.volume * 100) : 0,
                      text: radio.isPowered ? `${Math.round(radio.volume * 100)} percent` : 'Off',
                    }}
                    diameter={volumeDiameter}
                    engraved={knobPowerLabel}
                    onAccessibilityAction={({ nativeEvent }) => {
                      if (nativeEvent.actionName === 'increment') {
                        if (!radio.isPowered) {
                          togglePower();
                        } else {
                          setVolumeAndPersist(radio.volume + 0.05);
                        }
                      } else if (radio.volume <= 0.05) {
                        togglePower();
                      } else {
                        setVolumeAndPersist(radio.volume - 0.05);
                      }
                    }}
                    onPress={togglePower}
                    panHandlers={volumeResponder.panHandlers}
                    rotation={volumeRotation}
                    testID="volume-power-knob"
                  />
                  <Text style={styles.knobLabel}>VOLUME · POWER</Text>
                </View>
              </View>

              <View style={styles.utilityArea}>
                {renderControls()}
              </View>
            </View>
          </View>
            <View style={styles.cabinetFeet}>
              <View style={styles.cabinetFoot} />
              <View style={styles.cabinetFoot} />
            </View>
          </View>
        </View>

        {radio.notice ? (
          <Text accessibilityLiveRegion="polite" numberOfLines={2} style={styles.notice}>
            {radio.notice}
          </Text>
        ) : null}
      </View>

      <RadioSheet
        onClose={() => setSheet(null)}
        title={
          sheet === 'language'
            ? 'Choose a language'
            : sheet === 'settings'
              ? 'Receiver settings'
              : sheet === 'sleep'
                ? 'Sleep timer'
                : 'Broadcast source'
        }
        visible={sheet !== null}
      >
        {sheet === 'language' ? (
          <View>
            <Text style={styles.sheetIntro}>
              Turn the dial or choose one channel for each language.
            </Text>
            <View style={styles.searchField}>
              <Text style={styles.searchGlyph}>⌕</Text>
              <TextInput
                accessibilityLabel="Search languages"
                onChangeText={setSearch}
                placeholder="Language or region"
                placeholderTextColor="#8E887C"
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
              <Pressable
                accessibilityLabel={favoritesOnly ? 'Show all languages' : 'Show favorite languages'}
                accessibilityRole="button"
                onPress={() => setFavoritesOnly((value) => !value)}
              >
                <Text style={[styles.favoriteFilter, favoritesOnly && styles.starOn]}>
                  {favoritesOnly ? '★' : '☆'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.languageList}>
              {visibleChannels.map((channel, index) => {
                const active = channel.id === selectedChannel.id;
                const saved = preferences.favoriteChannelIds.includes(channel.id);
                return (
                  <Pressable
                    key={channel.id}
                    accessibilityLabel={`${channel.displayName}, ${channel.nativeName}${saved ? ', favorite' : ''}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => selectLanguage(channel)}
                    style={({ pressed }) => [
                      styles.languageRow,
                      active && styles.languageRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.languageIndex, active && styles.languageIndexActive]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <View style={styles.languageRowCopy}>
                      <Text style={styles.languageRowName}>{channel.languageName}</Text>
                      <Text style={styles.languageRowMeta}>
                        {channel.nativeName} · {channel.regionLabel}
                      </Text>
                    </View>
                    <Text style={styles.languageFavorite}>{saved ? '★' : active ? '●' : ''}</Text>
                  </Pressable>
                );
              })}
              {visibleChannels.length === 0 ? (
                <Text style={styles.emptyList}>
                  {favoritesOnly ? 'No saved languages yet.' : 'No matching languages.'}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {sheet === 'settings' ? (
          <View>
            <View style={styles.settingsOption}>
              <View style={styles.settingsCopy}>
                <Text style={styles.settingsTitle}>Opening Animation</Text>
                <Text style={styles.settingsDescription}>
                  Play the Timeless opening whenever the app starts.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Opening Animation"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: preferences.openingAnimation === true,
                }}
                onValueChange={(openingAnimation) =>
                  updatePreference({ openingAnimation })
                }
                thumbColor={
                  preferences.openingAnimation === true ? '#F2E8D3' : '#AAA18F'
                }
                trackColor={{ false: '#413A30', true: '#806C4C' }}
                value={preferences.openingAnimation === true}
              />
            </View>
            <DetailRow label="Saved languages" value={String(preferences.favoriteChannelIds.length)} />
            <DetailRow label="Current band" value={selectedChannel.displayName} />
          </View>
        ) : null}

        {sheet === 'sleep' ? (
          <View>
            <Text style={styles.sheetIntro}>Let the receiver fall quiet after a little while.</Text>
            <View style={styles.timerChoices}>
              {SLEEP_CHOICES.map((minutes) => (
                <Pressable
                  key={minutes}
                  accessibilityRole="button"
                  onPress={() => setSleepTimer(minutes)}
                  style={({ pressed }) => [styles.timerChoice, pressed && styles.pressed]}
                >
                  <Text style={styles.timerNumber}>{minutes}</Text>
                  <Text style={styles.timerUnit}>MIN</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.timerActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSleepTimer(null)}
                style={styles.sheetAction}
              >
                <Text style={styles.sheetActionText}>
                  {sleepDeadline === null ? 'NO TIMER SET' : 'CANCEL TIMER'}
                </Text>
              </Pressable>
              {secondsToSleep !== null ? (
                <Text style={styles.timerRemaining}>
                  {Math.floor(secondsToSleep / 60)}:{String(secondsToSleep % 60).padStart(2, '0')} REMAINING
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {sheet === 'information' ? (
          <BroadcastDetails
            channel={selectedChannel}
            onOpenSource={() => void openSource()}
            station={currentStation}
          />
        ) : null}
      </RadioSheet>

      <Modal
        animationType="fade"
        onRequestClose={() => {}}
        statusBarTranslucent
        transparent
        visible={
          showOpeningPreferencePrompt &&
          preferencesLoaded &&
          preferences.openingAnimation === null
        }
      >
        <View style={styles.openingPromptScrim}>
          <View style={styles.openingPromptCard}>
            <Text style={styles.openingPromptEyebrow}>TIMELESS FREQUENCIES</Text>
            <Text accessibilityRole="header" style={styles.openingPromptTitle}>
              Keep the Timeless opening?
            </Text>
            <Text style={styles.openingPromptDescription}>
              Play the opening whenever Timeless Frequencies starts.
            </Text>
            {openingPreferenceError ? (
              <Text style={styles.openingPromptError}>
                {openingPreferenceError}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveOpeningPreference(true)}
              style={({ pressed }) => [
                styles.openingPromptPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.openingPromptPrimaryText}>KEEP OPENING</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveOpeningPreference(false)}
              style={({ pressed }) => [
                styles.openingPromptSecondary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.openingPromptSecondaryText}>TURN IT OFF</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CABINET_COLORS.night,
  },
  page: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 8,
  },
  roomBackdrop: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#100C0A',
  },
  roomUpperShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: '#0D0B0A',
    opacity: 0.8,
  },
  roomWarmth: {
    position: 'absolute',
    left: '-35%',
    right: '-35%',
    bottom: '18%',
    height: 240,
    borderRadius: 180,
    backgroundColor: '#25150D',
    opacity: 0.24,
    shadowColor: '#B76027',
    shadowOpacity: 0.22,
    shadowRadius: 90,
  },
  roomFloorShadow: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: 20,
    height: 44,
    borderRadius: 100,
    backgroundColor: '#050403',
    opacity: 0.34,
  },
  castShadow: {
    position: 'absolute',
    width: '88%',
    height: 22,
    borderRadius: 100,
    backgroundColor: '#030201',
    opacity: 0.65,
    shadowColor: '#000000',
    shadowOpacity: 0.9,
    shadowRadius: 24,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    marginBottom: 2,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#80532E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandMarkInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7BD7C',
  },
  brand: {
    color: '#E6CBA7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  brandSub: {
    marginTop: 3,
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 7,
    letterSpacing: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A2920',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17110D',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  iconButtonText: {
    color: '#BF8A4C',
    fontSize: 17,
  },
  radioStage: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientHalo: {
    position: 'absolute',
    width: '120%',
    height: '36%',
    borderRadius: 400,
    backgroundColor: '#4A2613',
    shadowColor: '#F0A950',
    shadowOpacity: 0.18,
    shadowRadius: 55,
  },
  cabinetWrap: {
    width: '100%',
    maxWidth: 520,
    justifyContent: 'space-between',
    borderRadius: 15,
    padding: 5,
    backgroundColor: '#190C08',
    borderWidth: 1,
    borderTopColor: '#805332',
    borderLeftColor: '#482818',
    borderRightColor: '#160B07',
    borderBottomColor: '#0A0604',
    shadowColor: '#000000',
    shadowOpacity: 0.92,
    shadowRadius: 23,
    shadowOffset: { width: 0, height: 17 },
    elevation: 16,
  },
  cabinetTopStrip: {
    height: 28,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 2,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderTopColor: '#8B5A35',
    borderLeftColor: '#6E4127',
    borderRightColor: '#26130C',
    borderBottomColor: '#160A06',
    backgroundColor: '#35190E',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  topStripTone: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#714021',
    opacity: 0.22,
  },
  topStripBandOne: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: '17%',
    width: '18%',
    backgroundColor: '#27120C',
    opacity: 0.34,
  },
  topStripBandTwo: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: '39%',
    width: '21%',
    backgroundColor: '#714021',
    opacity: 0.38,
  },
  topStripBandThree: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    right: '15%',
    width: '19%',
    backgroundColor: '#452014',
    opacity: 0.4,
  },
  topStripHighlight: {
    position: 'absolute',
    top: 1,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: '#E7BD7C',
    opacity: 0.32,
  },
  topStripMark: {
    color: '#D0AA76',
    fontFamily: 'monospace',
    fontSize: 6,
    letterSpacing: 0.55,
  },
  topStripBadge: {
    minWidth: 88,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    borderWidth: 1,
    borderTopColor: '#F0D09A',
    borderLeftColor: '#E7BD7C',
    borderRightColor: '#80532E',
    borderBottomColor: '#684326',
    backgroundColor: '#8A5A32',
    shadowColor: '#F0A950',
    shadowOpacity: 0.16,
    shadowRadius: 4,
  },
  topStripBadgeTitle: {
    color: '#F1D69D',
    fontFamily: 'serif',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  topStripBadgeSub: {
    marginTop: -1,
    color: '#3A2012',
    fontFamily: 'monospace',
    fontSize: 4,
    letterSpacing: 1.2,
  },
  topStripScrew: {
    position: 'absolute',
    top: 10,
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#C3945E',
    backgroundColor: '#342016',
  },
  topStripScrewLeft: {
    left: 3,
  },
  topStripScrewRight: {
    right: 3,
  },
  cabinetFeet: {
    height: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: '11%',
  },
  cabinetFoot: {
    width: '17%',
    height: 7,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1,
    borderTopColor: '#5A3823',
    borderLeftColor: '#31180D',
    borderRightColor: '#110905',
    borderBottomColor: '#090503',
    backgroundColor: '#211109',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cabinetRim: {
    flex: 1,
    minHeight: 0,
    borderRadius: 9,
    marginTop: 3,
    padding: 3,
    borderWidth: 1,
    borderTopColor: '#E0A86A',
    borderLeftColor: '#8E5832',
    borderRightColor: '#241108',
    borderBottomColor: '#100704',
    backgroundColor: '#2B130B',
    shadowColor: '#F0A950',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cabinetFace: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    paddingTop: 4,
    paddingBottom: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderTopColor: '#D79A5E',
    borderLeftColor: '#704126',
    borderRightColor: '#211008',
    borderBottomColor: '#100704',
    backgroundColor: '#482214',
    shadowColor: '#000000',
    shadowOpacity: 0.62,
    shadowRadius: 8,
  },
  cabinetFaceMicro: {
    paddingTop: 3,
    paddingBottom: 2,
  },
  faceEdgeTop: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: '#F1C58D',
    opacity: 0.42,
  },
  veneerHighlight: {
    position: 'absolute',
    top: 31,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E7BD7C',
    opacity: 0.13,
  },
  veneerShadowLine: {
    position: 'absolute',
    top: 33,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#100704',
    opacity: 0.34,
  },
  faceEdgeLeft: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 1,
    width: 11,
    backgroundColor: '#714021',
    opacity: 0.11,
  },
  faceEdgeRight: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    right: 1,
    width: 12,
    backgroundColor: '#190C08',
    opacity: 0.22,
  },
  woodGrain: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 5,
  },
  woodGrainLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E7BD7C',
  },
  woodGrainLineOne: {
    top: '18%',
    left: '9%',
    right: '27%',
    opacity: 0.035,
  },
  woodGrainLineTwo: {
    top: '34%',
    left: '22%',
    right: '5%',
    backgroundColor: '#120804',
    opacity: 0.16,
  },
  woodGrainLineThree: {
    top: '49%',
    left: '4%',
    right: '31%',
    opacity: 0.025,
  },
  woodGrainLineFour: {
    top: '68%',
    left: '18%',
    right: '12%',
    backgroundColor: '#120804',
    opacity: 0.14,
  },
  woodGrainLineFive: {
    top: '82%',
    left: '3%',
    right: '24%',
    opacity: 0.03,
  },
  powerLampWrap: {
    position: 'absolute',
    top: 6,
    right: 7,
    zIndex: 2,
  },
  powerLamp: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F0A950',
    shadowColor: '#F4B557',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  upperAssembly: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    marginTop: 2,
    marginBottom: 0,
  },
  upperAssemblyMicro: {
    marginTop: 1,
  },
  dialWindow: {
    flex: 1,
    minWidth: 0,
    padding: 3,
    borderRadius: 5,
    backgroundColor: '#0C0907',
    borderWidth: 1,
    borderTopColor: '#100905',
    borderLeftColor: '#27150C',
    borderRightColor: '#BF8A4C',
    borderBottomColor: '#80532E',
    shadowColor: '#000000',
    shadowOpacity: 0.94,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  dialGlassEdge: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 3,
    borderWidth: 1,
    borderTopColor: '#100B08',
    borderLeftColor: '#24180F',
    borderRightColor: '#5A3A22',
    borderBottomColor: '#80532E',
    backgroundColor: '#17110D',
    shadowColor: '#F0A950',
    shadowOpacity: 0.09,
    shadowRadius: 8,
  },
  dialGlass: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingTop: 5,
    paddingBottom: 4,
    backgroundColor: '#0C0907',
  },
  dialInk: {
    flex: 1,
  },
  dialIllumination: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F0A950',
  },
  dialInnerGlow: {
    position: 'absolute',
    top: '40%',
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#F1D69D',
    shadowColor: '#F4B557',
    shadowOpacity: 0.32,
    shadowRadius: 20,
  },
  dialReflectionEdge: {
    position: 'absolute',
    top: 1,
    right: 9,
    width: '28%',
    height: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1D69D',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    backgroundColor: '#F1D69D',
    opacity: 0.045,
    transform: [{ rotate: '-3deg' }],
  },
  glassReflection: {
    position: 'absolute',
    top: '19%',
    left: '12%',
    width: '52%',
    height: 1,
    backgroundColor: '#F1D69D',
    opacity: 0.08,
    transform: [{ rotate: '-1.5deg' }],
  },
  dialTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialType: {
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 7,
    letterSpacing: 1.4,
  },
  dialPosition: {
    color: '#E7BD7C',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1,
  },
  dialMarks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 3,
  },
  dialMark: {
    flex: 1,
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 4,
    letterSpacing: -0.25,
    opacity: 0.72,
    textAlign: 'center',
  },
  dialMarkNarrow: {
    fontSize: 3.4,
    letterSpacing: -0.4,
  },
  dialMarkSelected: {
    color: '#F1D69D',
    fontSize: 4.8,
    opacity: 1,
    textShadowColor: '#F4B557',
    textShadowRadius: 4,
  },
  dialMarkSelectedNarrow: {
    fontSize: 4,
  },
  ticksTrack: {
    height: 32,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#BF8A4C',
  },
  frequencyTick: {
    width: StyleSheet.hairlineWidth,
    height: 7,
    backgroundColor: '#A28465',
    opacity: 0.7,
  },
  frequencyTickMajor: {
    height: 14,
    width: 1,
    backgroundColor: '#E7BD7C',
  },
  frequencyTickLong: {
    height: 20,
    width: 1,
    backgroundColor: '#F1D69D',
  },
  tuningNeedle: {
    position: 'absolute',
    top: -1,
    left: 0,
    width: 2,
    height: 32,
    backgroundColor: '#F1D69D',
    shadowColor: '#F4B557',
    shadowOpacity: 0.93,
    shadowRadius: 7,
    elevation: 5,
  },
  needleTip: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    width: 8,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#F1D69D',
  },
  dialOffShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#050302',
  },
  dialReadout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  dialLanguage: {
    flex: 1,
    color: '#F1D69D',
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: '#F4B557',
    textShadowRadius: 7,
  },
  dialNative: {
    maxWidth: '38%',
    marginLeft: 5,
    color: '#E6CBA7',
    fontSize: 10,
  },
  staticFlicker: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#DCC183',
  },
  currentStationLine: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 3,
  },
  currentStationLineMicro: {
    minHeight: 20,
    marginTop: 1,
  },
  statusLed: {
    width: 5,
    height: 5,
    marginRight: 7,
    borderRadius: 3,
    backgroundColor: '#60452D',
  },
  statusLedOn: {
    backgroundColor: CABINET_COLORS.green,
    shadowColor: CABINET_COLORS.green,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  statusLedError: {
    backgroundColor: CABINET_COLORS.red,
  },
  statusLedWarm: {
    backgroundColor: '#F0A950',
    shadowColor: '#F4B557',
    shadowOpacity: 0.78,
    shadowRadius: 5,
  },
  stationName: {
    flex: 1,
    color: '#E6CBA7',
    fontFamily: 'serif',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  statusMark: {
    marginLeft: 6,
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 7,
    letterSpacing: 1,
  },
  speakerHousing: {
    width: '42%',
    minWidth: 104,
    minHeight: 0,
    overflow: 'hidden',
    alignItems: 'stretch',
    padding: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderTopColor: '#BF8A4C',
    borderLeftColor: '#80532E',
    borderRightColor: '#211108',
    borderBottomColor: '#100704',
    backgroundColor: '#17110D',
    shadowColor: '#000',
    shadowOpacity: 0.86,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  speakerHousingCompact: {
    padding: 3,
  },
  speakerRings: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 1,
  },
  speakerRingOuter: {
    width: '100%',
    height: '100%',
    borderColor: '#8A795C',
    opacity: 0.22,
  },
  speakerRingMiddle: {
    width: '72%',
    height: '72%',
    borderColor: '#A18A66',
    opacity: 0.19,
  },
  speakerRingInner: {
    width: '46%',
    height: '46%',
    borderColor: '#C0A477',
    opacity: 0.15,
  },
  speakerFabric: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    borderRadius: 3,
    borderWidth: 1,
    borderTopColor: '#3B3426',
    borderLeftColor: '#30291D',
    borderRightColor: '#100D09',
    borderBottomColor: '#090705',
    backgroundColor: '#211D15',
  },
  speakerWarp: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  speakerWarpFiber: {
    width: 1,
    height: '100%',
    backgroundColor: '#A28465',
    opacity: 0.18,
  },
  speakerWeft: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
  },
  speakerWeftFiber: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C2A171',
    opacity: 0.21,
  },
  speakerWeftActive: {
    backgroundColor: '#BF8A4C',
    opacity: 0.28,
    shadowColor: '#CDB56D',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  speakerClothInset: {
    ...StyleSheet.absoluteFill,
    borderWidth: 6,
    borderColor: '#080604',
    opacity: 0.18,
  },
  speakerClothHighlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderTopColor: '#E6CBA7',
    opacity: 0.17,
  },
  speakerBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 19,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    backgroundColor: '#BF8A4C',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7BD7C',
  },
  speakerBadgeText: {
    color: '#190C08',
    fontFamily: 'serif',
    fontSize: 8,
    fontWeight: '700',
  },
  knobDeck: {
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  knobGroup: {
    alignItems: 'center',
  },
  volumeGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  knobShadow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    backgroundColor: '#120905',
    borderWidth: 1,
    borderTopColor: '#E7BD7C',
    borderLeftColor: '#BF8A4C',
    borderRightColor: '#55331E',
    borderBottomColor: '#291409',
    shadowColor: '#000',
    shadowOpacity: 0.83,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  knobBezel: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    borderTopColor: '#E7BD7C',
    borderLeftColor: '#BF8A4C',
    borderRightColor: '#5A3922',
    borderBottomColor: '#392112',
    backgroundColor: '#2B170C',
    shadowColor: '#E7BD7C',
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  knobScaleMark: {
    position: 'absolute',
    width: 1,
    borderRadius: 1,
    backgroundColor: '#E6CBA7',
    opacity: 0.72,
  },
  knobTurning: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 100,
    borderWidth: 1,
    borderTopColor: '#E7BD7C',
    borderLeftColor: '#BF8A4C',
    borderRightColor: '#52331E',
    borderBottomColor: '#2A160C',
    backgroundColor: '#714021',
    shadowColor: '#000',
    shadowOpacity: 0.46,
    shadowRadius: 4,
  },
  knobRidge: {
    position: 'absolute',
    width: 2,
    borderRadius: 2,
    backgroundColor: '#29160C',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#D9AE72',
  },
  knobFace: {
    width: '70%',
    height: '70%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: 1,
    borderTopColor: '#E7BD7C',
    borderLeftColor: '#BF8A4C',
    borderRightColor: '#3B2414',
    borderBottomColor: '#241309',
    backgroundColor: '#482A18',
  },
  knobFaceHighlight: {
    position: 'absolute',
    top: '8%',
    left: '20%',
    width: '60%',
    height: '24%',
    borderRadius: 100,
    backgroundColor: '#F1D69D',
    opacity: 0.14,
    transform: [{ rotate: '-18deg' }],
  },
  knobEngraving: {
    color: '#F1D69D',
    fontFamily: 'monospace',
    fontSize: 7,
    letterSpacing: 1,
  },
  knobNotch: {
    position: 'absolute',
    top: '7%',
    width: 3,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#F1D69D',
    shadowColor: '#F4B557',
    shadowOpacity: 0.65,
    shadowRadius: 4,
  },
  knobCentreAction: {
    position: 'absolute',
    width: '41%',
    height: '41%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  knobCap: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 1,
    borderTopColor: '#F1D69D',
    borderLeftColor: '#E7BD7C',
    borderRightColor: '#684326',
    borderBottomColor: '#3C2414',
    backgroundColor: '#A0703C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobCapHighlight: {
    width: '42%',
    height: '19%',
    borderRadius: 100,
    backgroundColor: '#F1D69D',
    opacity: 0.4,
    transform: [{ rotate: '-25deg' }],
  },
  knobCenter: {
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobLabel: {
    marginTop: -1,
    color: '#D2C2A0',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1.15,
  },
  knobSubLabel: {
    marginTop: 3,
    color: '#918268',
    fontFamily: 'monospace',
    fontSize: 6,
    letterSpacing: 0.8,
  },
  receiverStatus: {
    color: '#BF8A4C',
    fontFamily: 'monospace',
    fontSize: 7,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  receiverStatusGlyph: {
    marginTop: 5,
    marginBottom: 3,
    color: '#E7BD7C',
    fontSize: 14,
  },
  volumeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 13,
    paddingHorizontal: 2,
  },
  volumeScaleEnd: {
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 6,
    letterSpacing: 0.5,
  },
  volumeScaleMid: {
    color: '#E7BD7C',
    fontFamily: 'monospace',
    fontSize: 6,
    letterSpacing: 1,
  },
  utilityArea: {
    marginTop: 0,
  },
  utilityRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#80532E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#190C08',
  },
  utilityControl: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  smallButtonFace: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderTopColor: '#BF8A4C',
    borderLeftColor: '#80532E',
    borderRightColor: '#241309',
    borderBottomColor: '#100704',
    backgroundColor: '#211109',
    shadowColor: '#000',
    shadowOpacity: 0.72,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  utilityGlyph: {
    color: '#E7BD7C',
    fontSize: 13,
    lineHeight: 15,
  },
  utilityLabel: {
    marginTop: 2,
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 7,
    letterSpacing: 0.7,
  },
  starOn: {
    color: '#EDCB78',
  },
  retuneButton: {
    minWidth: 58,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retuneButtonFace: {
    width: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderTopColor: '#E7BD7C',
    borderLeftColor: '#BF8A4C',
    borderRightColor: '#503018',
    borderBottomColor: '#29160B',
    backgroundColor: '#5A351D',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  retuneButtonFaceActive: {
    backgroundColor: '#A46A30',
    shadowColor: '#F0A950',
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },
  retuneGlyph: {
    color: '#F1D69D',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  notice: {
    minHeight: 17,
    paddingTop: 4,
    color: '#B7AE9C',
    fontSize: 10,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000055',
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#00000088',
  },
  sheet: {
    maxHeight: '84%',
    minHeight: 220,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#65543D',
    backgroundColor: '#171614',
  },
  sheetHandle: {
    width: 39,
    height: 4,
    alignSelf: 'center',
    marginBottom: 11,
    borderRadius: 3,
    backgroundColor: '#756B5A',
  },
  sheetHeader: {
    minHeight: 41,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#423B30',
  },
  sheetTitle: {
    color: '#EAE0CB',
    fontFamily: 'serif',
    fontSize: 22,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#D4C6A9',
    fontSize: 28,
    lineHeight: 30,
  },
  sheetScroll: {
    paddingTop: 13,
    paddingBottom: 12,
  },
  sheetIntro: {
    marginBottom: 13,
    color: '#B4AA97',
    fontSize: 13,
    lineHeight: 19,
  },
  sheetEyebrow: {
    color: '#B89B68',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  searchField: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#494337',
    backgroundColor: '#20201D',
  },
  searchGlyph: {
    marginRight: 9,
    color: '#C4B28D',
    fontSize: 19,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    color: '#E7DECB',
    fontSize: 14,
  },
  favoriteFilter: {
    paddingHorizontal: 8,
    color: '#D7C9AC',
    fontSize: 20,
  },
  languageList: {
    gap: 5,
  },
  languageRow: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageRowActive: {
    borderColor: '#80704D',
    backgroundColor: '#28241D',
  },
  languageIndex: {
    width: 33,
    color: '#857D6D',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  languageIndexActive: {
    color: '#D2B976',
  },
  languageRowCopy: {
    flex: 1,
  },
  languageRowName: {
    color: '#E5DCC8',
    fontSize: 15,
  },
  languageRowMeta: {
    marginTop: 2,
    color: '#A49A86',
    fontSize: 11,
  },
  languageFavorite: {
    width: 22,
    color: '#D6BD7A',
    textAlign: 'right',
  },
  emptyList: {
    paddingVertical: 18,
    color: '#B4AA97',
    textAlign: 'center',
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#423B30',
  },
  settingsCopy: {
    flex: 1,
    paddingRight: 15,
  },
  settingsTitle: {
    color: '#E6DDCB',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsDescription: {
    marginTop: 5,
    color: '#AEA594',
    fontSize: 12,
    lineHeight: 18,
  },
  openingPromptScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(5,3,2,0.76)',
  },
  openingPromptCard: {
    width: '100%',
    maxWidth: 390,
    padding: 22,
    borderWidth: 1,
    borderColor: '#80532E',
    borderRadius: 12,
    backgroundColor: '#21130D',
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  openingPromptEyebrow: {
    color: '#BF8A4C',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  openingPromptTitle: {
    marginTop: 12,
    color: '#E6CBA7',
    fontFamily: 'serif',
    fontSize: 23,
  },
  openingPromptDescription: {
    marginTop: 8,
    marginBottom: 18,
    color: '#A28465',
    fontSize: 14,
    lineHeight: 21,
  },
  openingPromptError: {
    marginBottom: 12,
    color: '#E0A18B',
    fontSize: 12,
    lineHeight: 18,
  },
  openingPromptPrimary: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BF8A4C',
    borderRadius: 7,
    backgroundColor: '#482214',
  },
  openingPromptPrimaryText: {
    color: '#F1D69D',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  openingPromptSecondary: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#513823',
    borderRadius: 7,
    backgroundColor: '#190C08',
  },
  openingPromptSecondaryText: {
    color: '#A28465',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  detailHero: {
    marginBottom: 13,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#423B30',
  },
  detailLanguage: {
    marginTop: 6,
    color: '#E2C586',
    fontFamily: 'serif',
    fontSize: 25,
  },
  detailNative: {
    marginTop: 2,
    color: '#B2A893',
    fontSize: 13,
  },
  detailRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38342D',
  },
  detailLabel: {
    color: '#9F9583',
    fontSize: 12,
  },
  detailValue: {
    flexShrink: 1,
    marginLeft: 16,
    color: '#DED5C2',
    fontSize: 12,
    textAlign: 'right',
  },
  sourceCopy: {
    marginTop: 11,
    color: '#AAA18F',
    fontSize: 12,
    lineHeight: 18,
  },
  sheetAction: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#806D4D',
    backgroundColor: '#28251F',
  },
  sheetActionText: {
    color: '#DCC892',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  timerChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  timerChoice: {
    minWidth: 69,
    minHeight: 67,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#554A38',
    backgroundColor: '#24221E',
  },
  timerNumber: {
    color: '#E3D4B5',
    fontFamily: 'serif',
    fontSize: 23,
  },
  timerUnit: {
    marginTop: 1,
    color: '#A89A7D',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1,
  },
  timerActions: {
    marginTop: 12,
  },
  timerRemaining: {
    marginTop: 11,
    color: '#C1AE83',
    fontFamily: 'monospace',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
