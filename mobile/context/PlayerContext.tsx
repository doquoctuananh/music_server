import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { playSong, addHistory } from '../services/api';
import { useAuth } from './AuthContext';

export interface Song {
  _id: string;
  name: string;
  imageURL: string;
  songURL: string;
  album?: string;
  artist: string[];
  language: string;
  category: string[];
  duration?: number;
  playCount?: number;
  lyrics?: string;
}

interface PlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  position: number;
  duration: number;
  playSongFromList: (song: Song, list?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  setQueue: (songs: Song[]) => void;
}

const PlayerContext = createContext<PlayerContextType>({} as PlayerContextType);
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      playNext();
    }
  };

  const playSongFromList = useCallback(
    async (song: Song, list?: Song[]) => {
      try {
        // Unload previous
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: song.songURL },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );

        soundRef.current = sound;
        setCurrentSong(song);
        setIsPlaying(true);

        if (list) setQueueState(list);

        // Track play count + history
        try {
          playSong(song._id);
          if (user) addHistory(song._id);
        } catch (_) {}
      } catch (e) {
        console.error('Play error:', e);
      }
    },
    [user]
  );

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, []);

  const seekTo = useCallback(async (positionMs: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(positionMs);
  }, []);

  const playNext = useCallback(async () => {
    if (!currentSong || queue.length === 0) return;
    const idx = queue.findIndex((s) => s._id === currentSong._id);
    const next = queue[(idx + 1) % queue.length];
    if (next) await playSongFromList(next);
  }, [currentSong, queue, playSongFromList]);

  const playPrev = useCallback(async () => {
    if (!currentSong || queue.length === 0) return;
    const idx = queue.findIndex((s) => s._id === currentSong._id);
    const prev = queue[(idx - 1 + queue.length) % queue.length];
    if (prev) await playSongFromList(prev);
  }, [currentSong, queue, playSongFromList]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        queue,
        isPlaying,
        position,
        duration,
        playSongFromList,
        togglePlayPause,
        seekTo,
        playNext,
        playPrev,
        setQueue: setQueueState,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
