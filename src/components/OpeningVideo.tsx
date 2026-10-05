import { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OpeningVideo({
  source,
  onFinished,
}: {
  source: number;
  onFinished: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const finished = useRef(false);
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
    videoPlayer.volume = 1;
    videoPlayer.play();
  });

  useEffect(() => {
    const finish = () => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      onFinished();
    };
    const endSubscription = player.addListener('playToEnd', finish);
    const errorSubscription = player.addListener(
      'statusChange',
      ({ status, error }) => {
        if (status === 'error') {
          console.error('Opening animation could not be played.', error);
          finish();
        }
      },
    );
    if (player.status === 'error') {
      console.error('Opening animation could not be played.');
      finish();
    }

    return () => {
      endSubscription.remove();
      errorSubscription.remove();
    };
  }, [onFinished, player]);

  const skip = () => {
    if (!finished.current) {
      player.pause();
    }
    if (!finished.current) {
      finished.current = true;
      onFinished();
    }
  };

  return (
    <View style={styles.container}>
      <VideoView
        allowsPictureInPicture={false}
        contentFit="cover"
        fullscreenOptions={{ enable: false }}
        nativeControls={false}
        player={player}
        style={{ width, height }}
      />
      <Pressable
        accessibilityLabel="Skip opening animation"
        accessibilityRole="button"
        hitSlop={12}
        onPress={skip}
        style={[
          styles.skipButton,
          { top: insets.top + 12, right: Math.max(insets.right, 18) },
        ]}
      >
        <Text style={styles.skipText}>SKIP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  skipButton: {
    position: 'absolute',
    minWidth: 58,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231,189,124,0.55)',
    borderRadius: 21,
    backgroundColor: 'rgba(16,12,10,0.62)',
  },
  skipText: {
    color: '#E6CBA7',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.2,
  },
});
