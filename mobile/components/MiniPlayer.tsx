import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';

export default function MiniPlayer({ onPress }: { onPress?: () => void }) {
  const { currentSong, isPlaying, togglePlayPause, position, duration } =
    usePlayer();

  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!currentSong) return null;

  const progress = duration > 0 ? position / duration : 0;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel={`Now playing ${currentSong.name}. Tap to open player`}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.content}>
              <Image
                source={{ uri: currentSong.imageURL }}
                style={styles.artwork}
              />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                  {currentSong.name}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                  {currentSong.artist?.join(', ')}
                </Text>
              </View>

              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    togglePlayPause();
                  }}
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={22}
                    color={Colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  blurContainer: {
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
  },
  container: {
    backgroundColor: 'rgba(40, 40, 40, 0.85)',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: 2,
    backgroundColor: Colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  controlBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
