import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import OpeningVideo from '../components/OpeningVideo';
import RadioScreen from '../components/RadioScreen';
import { loadUserPreferences } from '../storage/userPreferences';

const PREFERENCES_LOAD_TIMEOUT_MS = 5000;

type MetroRequire = NodeRequire & {
  context(
    path: string,
    recursive?: boolean,
    filter?: RegExp,
  ): {
    keys(): string[];
    <T>(path: string): T;
  };
};

const openingAssets = (require as MetroRequire).context(
  '../../assets/video',
  false,
  /^\.\/opening\.mp4$/,
);
const openingVideoSource = openingAssets.keys().length
  ? openingAssets<number>('./opening.mp4')
  : null;

type LaunchState = 'loading' | 'opening' | 'radio';

export default function HomeScreen() {
  const [launchState, setLaunchState] = useState<LaunchState>('loading');
  const [showOpeningPreferencePrompt, setShowOpeningPreferencePrompt] =
    useState(false);
  const promptAfterOpening = useRef(false);

  useEffect(() => {
    let active = true;
    let startupResolved = false;

    const continueStartup = (openingAnimation: boolean | null) => {
      if (!active || startupResolved) {
        return;
      }
      startupResolved = true;
      promptAfterOpening.current = openingAnimation === null;

      if (openingAnimation !== false && openingVideoSource !== null) {
        setLaunchState('opening');
        return;
      }

      setLaunchState('radio');
      setShowOpeningPreferencePrompt(openingAnimation === null);
    };

    const timeout = setTimeout(() => {
      console.warn(
        'Radio preferences took too long to load; continuing with defaults.',
      );
      continueStartup(null);
    }, PREFERENCES_LOAD_TIMEOUT_MS);

    void loadUserPreferences()
      .then((preferences) => {
        continueStartup(preferences.openingAnimation);
      })
      .catch((error: unknown) => {
        console.error('Could not load radio preferences.', error);
        continueStartup(null);
      });

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  const finishOpening = useCallback(() => {
    setLaunchState('radio');
    setShowOpeningPreferencePrompt(promptAfterOpening.current);
  }, []);

  if (launchState === 'loading') {
    return <View style={{ flex: 1, backgroundColor: '#100C0A' }} />;
  }

  if (launchState === 'opening' && openingVideoSource !== null) {
    return (
      <OpeningVideo source={openingVideoSource} onFinished={finishOpening} />
    );
  }

  return (
    <RadioScreen
      onOpeningPreferenceResolved={() => setShowOpeningPreferencePrompt(false)}
      showOpeningPreferencePrompt={showOpeningPreferencePrompt}
    />
  );
}
