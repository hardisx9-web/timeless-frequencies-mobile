import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  getChannel,
  getStation,
  type RadioStation,
} from '../data/radioCatalog';
import { createSameLanguageRetunePlan } from '../services/retuneEngine';

const CONNECTION_TIMEOUT_MS = 20_000;
const isExpoGo = Constants.expoGoConfig !== null;

export type PlaybackPhase =
  | 'off'
  | 'connecting'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'retuning'
  | 'error';

type FlowReason =
  | 'power-on'
  | 'language-change'
  | 'manual-retune'
  | 'stream-recovery'
  | 'retry';

interface PlaybackFlow {
  id: number;
  channelId: string;
  candidates: RadioStation[];
  nextIndex: number;
  currentStation: RadioStation | null;
  originStation: RadioStation | null;
  reason: FlowReason;
  restoreOriginAfterFailedRetune: boolean;
  restoringOrigin: boolean;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useRadioPlayer(initialChannelId: string) {
  const player = useAudioPlayer(null, { updateInterval: 400 });
  const audioStatus = useAudioPlayerStatus(player);
  const [selectedChannelId, setSelectedChannelId] =
    useState(initialChannelId);
  const [currentStationId, setCurrentStationId] = useState<string | null>(
    null,
  );
  const [phase, setPhase] = useState<PlaybackPhase>('off');
  const [isPowered, setIsPowered] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [retuneSequence, setRetuneSequence] = useState(0);
  const [volume, setVolumeState] = useState(0.72);
  const [appState, setAppState] = useState(AppState.currentState);
  const flowRef = useRef<PlaybackFlow | null>(null);
  const nextFlowIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retuneVisualTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const unexpectedPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const phaseRef = useRef<PlaybackPhase>('off');
  const isPoweredRef = useRef(false);
  const selectedChannelIdRef = useRef(initialChannelId);
  const currentStationIdRef = useRef<string | null>(null);
  const volumeRef = useRef(0.72);
  const handledErrorRef = useRef<string | null>(null);
  const attemptNextRef = useRef<(flow: PlaybackFlow) => void>(() => {});
  const failAttemptRef = useRef<
    (flow: PlaybackFlow, message: string) => void
  >(() => {});

  const updatePhase = useCallback((nextPhase: PlaybackPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const updateCurrentStation = useCallback((stationId: string | null) => {
    currentStationIdRef.current = stationId;
    setCurrentStationId(stationId);
  }, []);

  const clearAttemptTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearUnexpectedPauseTimeout = useCallback(() => {
    if (unexpectedPauseTimerRef.current !== null) {
      clearTimeout(unexpectedPauseTimerRef.current);
      unexpectedPauseTimerRef.current = null;
    }
  }, []);

  const clearRetuneVisualTimeout = useCallback(() => {
    if (retuneVisualTimeoutRef.current !== null) {
      clearTimeout(retuneVisualTimeoutRef.current);
      retuneVisualTimeoutRef.current = null;
    }
  }, []);

  const reportHapticFailure = useCallback((error: unknown) => {
    console.warn('Retune haptic feedback was unavailable.', error);
  }, []);

  const retuneHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      reportHapticFailure,
    );
  }, [reportHapticFailure]);

  const setPlayerLockScreen = useCallback(
    (station: RadioStation, channelId: string) => {
      if (isExpoGo) {
        return;
      }
      const channel = getChannel(channelId);
      if (!channel) {
        return;
      }
      try {
        player.setActiveForLockScreen(true, {
          title: station.name,
          artist: station.broadcaster,
          albumTitle: `Timeless Frequencies · ${channel.displayName}`,
        });
      } catch (error) {
        console.warn('Lock-screen audio controls are unavailable.', error);
        setNotice(
          'Lock-screen controls are unavailable in this app session. Playback remains available in the app.',
        );
      }
    },
    [player],
  );

  const clearPlayerLockScreen = useCallback(() => {
    if (isExpoGo) {
      return;
    }
    try {
      player.setActiveForLockScreen(false);
    } catch (error) {
      console.warn('Could not clear lock-screen audio controls.', error);
    }
  }, [player]);

  const attemptNext = useCallback(
    (flow: PlaybackFlow) => {
      if (flowRef.current?.id !== flow.id) {
        return;
      }

      const station = flow.candidates[flow.nextIndex];
      if (!station) {
        failAttemptRef.current(
          flow,
          'No further verified station is available for this language.',
        );
        return;
      }

      flow.nextIndex += 1;
      flow.currentStation = station;
      updateCurrentStation(station.id);
      clearAttemptTimeout();
      clearRetuneVisualTimeout();
      clearUnexpectedPauseTimeout();
      handledErrorRef.current = null;
      setPlayerLockScreen(station, flow.channelId);
      updatePhase(
        flow.reason === 'manual-retune' && !flow.restoringOrigin
          ? 'retuning'
          : 'connecting',
      );

      try {
        player.pause();
        player.replace({ uri: station.streamUrl });
        player.volume = volumeRef.current;
        player.play();
      } catch (error) {
        const message = getErrorMessage(error);
        console.error(`Could not start ${station.name}.`, error);
        failAttemptRef.current(flow, message);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (flowRef.current?.id === flow.id) {
          failAttemptRef.current(
            flow,
            `The stream did not connect in time: ${station.name}.`,
          );
        }
      }, CONNECTION_TIMEOUT_MS);
      if (
        flow.reason === 'manual-retune' &&
        !flow.restoringOrigin
      ) {
        retuneVisualTimeoutRef.current = setTimeout(() => {
          if (
            flowRef.current?.id === flow.id &&
            phaseRef.current === 'retuning'
          ) {
            updatePhase('buffering');
          }
        }, 1400);
      }
    },
    [
      clearAttemptTimeout,
      clearRetuneVisualTimeout,
      clearUnexpectedPauseTimeout,
      player,
      setPlayerLockScreen,
      updateCurrentStation,
      updatePhase,
    ],
  );
  attemptNextRef.current = attemptNext;

  const failAttempt = useCallback(
    (flow: PlaybackFlow, message: string) => {
      if (flowRef.current?.id !== flow.id) {
        return;
      }

      clearAttemptTimeout();
      clearRetuneVisualTimeout();
      const nextStation = flow.candidates[flow.nextIndex];
      if (nextStation) {
        setNotice(`No signal from ${flow.currentStation?.name ?? 'that station'}; trying another ${getChannel(flow.channelId)?.languageName ?? ''} broadcast.`);
        attemptNextRef.current(flow);
        return;
      }

      if (
        flow.restoreOriginAfterFailedRetune &&
        !flow.restoringOrigin &&
        flow.originStation
      ) {
        flow.candidates = [flow.originStation];
        flow.nextIndex = 0;
        flow.restoringOrigin = true;
        setNotice(
          `The alternate signals are unavailable. Reconnecting to ${flow.originStation.name}.`,
        );
        attemptNextRef.current(flow);
        return;
      }

      flowRef.current = null;
      player.pause();
      clearPlayerLockScreen();
      if (flow.restoringOrigin) {
        updateCurrentStation(flow.originStation?.id ?? null);
      }
      updatePhase('error');
      const channel = getChannel(flow.channelId);
      setNotice(
        `${message} Try again when the connection is available${
          channel ? ` · ${channel.displayName}` : ''
        }.`,
      );
    },
    [
      clearAttemptTimeout,
      clearRetuneVisualTimeout,
      player,
      clearPlayerLockScreen,
      updateCurrentStation,
      updatePhase,
    ],
  );
  failAttemptRef.current = failAttempt;

  const startFlow = useCallback(
    (
      channelId: string,
      candidates: RadioStation[],
      reason: FlowReason,
      originStation: RadioStation | null = null,
      restoreOriginAfterFailedRetune = false,
    ) => {
      clearAttemptTimeout();
      clearRetuneVisualTimeout();
      clearUnexpectedPauseTimeout();
      const flow: PlaybackFlow = {
        id: ++nextFlowIdRef.current,
        channelId,
        candidates,
        nextIndex: 0,
        currentStation: null,
        originStation,
        reason,
        restoreOriginAfterFailedRetune,
        restoringOrigin: false,
      };
      flowRef.current = flow;
      handledErrorRef.current = null;
      isPoweredRef.current = true;
      setIsPowered(true);
      setNotice(
        reason === 'manual-retune'
          ? 'Retuning…'
          : 'Finding a live signal…',
      );
      if (reason === 'manual-retune') {
        setRetuneSequence((sequence) => sequence + 1);
      }
      attemptNextRef.current(flow);
    },
    [
      clearAttemptTimeout,
      clearRetuneVisualTimeout,
      clearUnexpectedPauseTimeout,
    ],
  );

  const completeFlow = useCallback(
    (flow: PlaybackFlow) => {
      if (flowRef.current?.id !== flow.id || !flow.currentStation) {
        return;
      }

      clearAttemptTimeout();
      clearRetuneVisualTimeout();
      flowRef.current = null;
      updateCurrentStation(flow.currentStation.id);
      updatePhase('playing');

      if (flow.restoringOrigin) {
        setNotice(`Back on air with ${flow.currentStation.name}.`);
      } else if (flow.reason === 'manual-retune') {
        setNotice(`Now receiving ${flow.currentStation.name}.`);
      } else if (flow.reason === 'stream-recovery') {
        setNotice(`Signal restored with ${flow.currentStation.name}.`);
      } else if (flow.reason === 'retry') {
        setNotice(`Signal reacquired from ${flow.currentStation.name}.`);
      } else {
        setNotice(null);
      }
    },
    [
      clearAttemptTimeout,
      clearRetuneVisualTimeout,
      updateCurrentStation,
      updatePhase,
    ],
  );

  const recoverFromStreamFailure = useCallback(
    (channelId: string, stationId: string, errorMessage: string) => {
      if (flowRef.current || !isPoweredRef.current) {
        return;
      }
      const candidates = createSameLanguageRetunePlan(channelId, stationId);
      if (candidates.length === 0) {
        clearPlayerLockScreen();
        updatePhase('error');
        setNotice(
          `Signal lost from ${getStation(channelId, stationId)?.name ?? 'the station'}. No alternate stream is available yet; retry when ready.`,
        );
        return;
      }

      setNotice(`Signal lost. Trying another ${getChannel(channelId)?.languageName ?? ''} broadcast.`);
      startFlow(channelId, candidates, 'stream-recovery');
      console.warn('Radio stream failed; trying a same-language fallback.', {
        stationId,
        errorMessage,
      });
    },
    [clearPlayerLockScreen, startFlow, updatePhase],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((error: unknown) => {
      if (!active) {
        return;
      }
      console.error('Could not configure the radio audio session.', error);
      setNotice('Audio setup failed. Restart the app and try again.');
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (audioStatus.error) {
      const flow = flowRef.current;
      const stationId =
        flow?.currentStation?.id ?? currentStationIdRef.current;
      const signature = `${flow?.id ?? 'active'}:${stationId ?? 'none'}:${audioStatus.error}`;
      if (signature === handledErrorRef.current) {
        return;
      }
      handledErrorRef.current = signature;

      if (flow) {
        failAttemptRef.current(flow, audioStatus.error);
      } else if (stationId && isPoweredRef.current) {
        recoverFromStreamFailure(
          selectedChannelIdRef.current,
          stationId,
          audioStatus.error,
        );
      }
      return;
    }

    handledErrorRef.current = null;
    const flow = flowRef.current;
    if (audioStatus.playing && flow && player.playing) {
      completeFlow(flow);
      return;
    }
    if (audioStatus.isBuffering && flow) {
      updatePhase('buffering');
      return;
    }

    if (
      audioStatus.playing &&
      isPoweredRef.current &&
      phaseRef.current !== 'playing'
    ) {
      updatePhase('playing');
    }

    if (
      !audioStatus.playing &&
      !audioStatus.isBuffering &&
      !flow &&
      isPoweredRef.current &&
      appState === 'active' &&
      phaseRef.current === 'playing'
    ) {
      clearUnexpectedPauseTimeout();
      unexpectedPauseTimerRef.current = setTimeout(() => {
        if (
          isPoweredRef.current &&
          phaseRef.current === 'playing' &&
          !player.playing
        ) {
          updatePhase('paused');
          setNotice(
            'Playback paused by the audio system. Tap Play to resume.',
          );
        }
      }, 1800);
    } else {
      clearUnexpectedPauseTimeout();
    }
  }, [
    audioStatus.error,
    audioStatus.isBuffering,
    audioStatus.playing,
    appState,
    clearUnexpectedPauseTimeout,
    completeFlow,
    player,
    recoverFromStreamFailure,
    updatePhase,
  ]);

  useEffect(
    () => () => {
      clearAttemptTimeout();
      clearRetuneVisualTimeout();
      clearUnexpectedPauseTimeout();
    },
    [
      clearAttemptTimeout,
      clearRetuneVisualTimeout,
      clearUnexpectedPauseTimeout,
    ],
  );

  const powerOn = useCallback(() => {
    const channel = getChannel(selectedChannelIdRef.current);
    if (!channel) {
      setNotice('Choose a language before turning the radio on.');
      return;
    }
    startFlow(
      channel.id,
      [channel.primaryStation, ...channel.fallbackStations],
      'power-on',
    );
  }, [startFlow]);

  const powerOff = useCallback(() => {
    clearAttemptTimeout();
    clearRetuneVisualTimeout();
    clearUnexpectedPauseTimeout();
    flowRef.current = null;
    isPoweredRef.current = false;
    setIsPowered(false);
    player.pause();
    clearPlayerLockScreen();
    updatePhase('off');
    setNotice('Receiver off.');
  }, [
    clearAttemptTimeout,
    clearRetuneVisualTimeout,
    clearUnexpectedPauseTimeout,
    clearPlayerLockScreen,
    player,
    updatePhase,
  ]);

  const pause = useCallback(() => {
    if (!isPoweredRef.current) {
      return;
    }
    clearAttemptTimeout();
    flowRef.current = null;
    player.pause();
    updatePhase('paused');
    setNotice('Radio paused.');
  }, [clearAttemptTimeout, player, updatePhase]);

  const resume = useCallback(() => {
    const stationId = currentStationIdRef.current;
    const channelId = selectedChannelIdRef.current;
    const current = stationId ? getStation(channelId, stationId) : undefined;
    const channel = getChannel(channelId);
    if (!channel) {
      setNotice('Choose a language before playing.');
      return;
    }
    const first = current ?? channel.primaryStation;
    startFlow(
      channelId,
      [
        first,
        ...createSameLanguageRetunePlan(channelId, first.id),
      ],
      'retry',
    );
  }, [startFlow]);

  const togglePlayPause = useCallback(() => {
    if (!isPoweredRef.current) {
      powerOn();
    } else if (
      phaseRef.current === 'paused' ||
      phaseRef.current === 'error'
    ) {
      resume();
    } else {
      pause();
    }
  }, [pause, powerOn, resume]);

  const selectChannel = useCallback(
    (channelId: string) => {
      const channel = getChannel(channelId);
      if (!channel || selectedChannelIdRef.current === channelId) {
        return;
      }
      selectedChannelIdRef.current = channelId;
      setSelectedChannelId(channelId);
      updateCurrentStation(channel.primaryStation.id);
      setNotice(null);
      if (isPoweredRef.current) {
        startFlow(
          channelId,
          [channel.primaryStation, ...channel.fallbackStations],
          'language-change',
        );
      }
    },
    [startFlow, updateCurrentStation],
  );

  const retuneNext = useCallback(() => {
    retuneHaptic();
    if (!isPoweredRef.current || phaseRef.current !== 'playing') {
      setNotice('Play a station before retuning.');
      return;
    }
    if (flowRef.current) {
      setNotice('The receiver is already tuning.');
      return;
    }

    const channelId = selectedChannelIdRef.current;
    const currentId = currentStationIdRef.current;
    const originStation = currentId
      ? getStation(channelId, currentId) ?? null
      : null;
    const candidates = createSameLanguageRetunePlan(channelId, currentId);
    if (candidates.length === 0) {
      setNotice(
        `No alternate ${getChannel(channelId)?.languageName ?? ''} station is available. The current stream is unchanged.`,
      );
      return;
    }

    startFlow(
      channelId,
      candidates,
      'manual-retune',
      originStation,
      true,
    );
  }, [retuneHaptic, startFlow]);

  const retrySignal = useCallback(() => {
    if (!isPoweredRef.current) {
      powerOn();
      return;
    }
    const channelId = selectedChannelIdRef.current;
    const channel = getChannel(channelId);
    const stationId = currentStationIdRef.current;
    const first = stationId
      ? getStation(channelId, stationId)
      : channel?.primaryStation;
    if (!first) {
      setNotice('Choose a language before retrying the signal.');
      return;
    }
    startFlow(
      channelId,
      [
        first,
        ...createSameLanguageRetunePlan(channelId, first.id),
      ],
      'retry',
    );
  }, [powerOn, startFlow]);

  const setVolume = useCallback(
    (nextVolume: number) => {
      const safeVolume = Math.min(1, Math.max(0, nextVolume));
      volumeRef.current = safeVolume;
      setVolumeState(safeVolume);
      player.volume = safeVolume;
    },
    [player],
  );

  return {
    selectedChannelId,
    currentStationId,
    currentStation: currentStationId
      ? getStation(selectedChannelId, currentStationId) ?? null
      : null,
    phase,
    isPowered,
    isPlaying: phase === 'playing' && isPowered,
    isBuffering: audioStatus.isBuffering,
    notice,
    retuneSequence,
    volume,
    selectChannel,
    powerOn,
    powerOff,
    pause,
    resume,
    togglePlayPause,
    retuneNext,
    retrySignal,
    setVolume,
    setNotice,
  };
}
