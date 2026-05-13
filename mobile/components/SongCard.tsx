import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Timing } from '../constants/theme';
import { Song } from '../context/PlayerContext';

interface Props {
  song: Song;
  onPress: () => void;
  isPlaying?: boolean;
  showIndex?: number;
}

export default function SongCard({ song, onPress, isPlaying, showIndex }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Play ${song.name} by ${song.artist?.join(', ')}`}
      >
        {showIndex !== undefined && (
          <Text style={[styles.index, isPlaying && styles.indexActive]}>
            {showIndex}
          </Text>
        )}
        <View style={styles.artworkContainer}>
          <Image source={{ uri: song.imageURL }} style={styles.artwork} />
          {isPlaying && (
            <View style={styles.playingOverlay}>
              <View style={styles.equalizerContainer}>
                <View style={[styles.eqBar, styles.eqBar1]} />
                <View style={[styles.eqBar, styles.eqBar2]} />
                <View style={[styles.eqBar, styles.eqBar3]} />
                <View style={[styles.eqBar, styles.eqBar4]} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.title, isPlaying && styles.titleActive]}
            numberOfLines={1}
          >
            {song.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist?.join(', ')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  index: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    width: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  indexActive: {
    color: Colors.primary,
  },
  artworkContainer: {
    position: 'relative',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  eqBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  eqBar1: { height: 8 },
  eqBar2: { height: 14 },
  eqBar3: { height: 10 },
  eqBar4: { height: 6 },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md + 1,
    fontWeight: '500',
  },
  titleActive: {
    color: Colors.primary,
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  moreBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
