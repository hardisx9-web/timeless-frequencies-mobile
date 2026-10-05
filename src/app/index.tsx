import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import OpeningVideo from '../components/OpeningVideo';
import RadioScreen from '../components/RadioScreen';
import { loadUserPreferences } from '../storage/userPreferences';

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

    void loadUserPreferences()
      .then((preferences) => {
        if (!active) {
          return;
        }
        promptAfterOpening.current = preferences.openingAnimation === null;

        if (
          preferences.openingAnimation !== false &&
          openingVideoSource !== null
        ) {
          setLaunchState('opening');
          return;
        }

        setLaunchState('radio');
        setShowOpeningPreferencePrompt(preferences.openingAnimation === null);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setLaunchState('radio');
        setShowOpeningPreferencePrompt(true);
      });

    return () => {
      active = false;
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
