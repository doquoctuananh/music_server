import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API, API_ORIGIN } from "@/constants/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar, IconButton } from "react-native-paper";

export default function PlayerScreen() {
  const params = useLocalSearchParams?.() ?? {};
  const router = useRouter();
  const { name = "", songUrl = "", imageURL = "", artist = "" } = params as any;

  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [artistName, setArtistName] = useState(artist || "");
  const [isFavourite, setIsFavourite] = useState<boolean | null>(null);
  const [confirmAction, setConfirmAction] = useState<"add" | "remove" | null>(
    null,
  );
  const spin = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        try {
          if (typeof Audio.setAudioModeAsync === "function") {
            const opts: any = {
              allowsRecordingIOS: false,
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
            };

            if (typeof Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX !== "undefined") {
              opts.interruptionModeIOS = Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX;
            }
            if (
              typeof Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== "undefined"
            ) {
              opts.interruptionModeAndroid =
                Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
            }

            await Audio.setAudioModeAsync(opts);
          }
        } catch (modeErr) {
          console.warn(
            "setAudioModeAsync failed, retrying minimal options",
            modeErr,
          );
          try {
            if (typeof Audio.setAudioModeAsync === "function") {
              await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
            }
          } catch (e) {
            console.warn("Fallback setAudioModeAsync also failed", e);
          }
        }

        const url = songUrl.startsWith("http")
          ? songUrl?.toString()
          : `${API_ORIGIN}${songUrl?.toString()}`;
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
        );

        soundRef.current = sound;
        setPlaying(Boolean(status.isPlaying));
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);

        soundRef.current.setOnPlaybackStatusUpdate((st) => {
          if (!st) return;
          if (!mounted) return;
          setPlaying(Boolean(st.isPlaying));
          setPosition(st.positionMillis || 0);
          setDuration(st.durationMillis || 0);
        });
      } catch (e) {
        console.error("Audio load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch (e) {}
      })();
    };
  }, [songUrl]);

  // fetch artist name if param is an id
  useEffect(() => {
    (async () => {
      try {
        if (!artist) return;
        // if artist looks like an ID (24 hex chars) fetch name
        const firstId = (artist || "").split(",")[0];
        if (/^[0-9a-fA-F]{24}$/.test(firstId)) {
          const token = await SecureStore.getItemAsync("auth_token");
          const res = await fetch(`${API}/artists/getone/${firstId}`, {
            headers: { Authorization: token ? `Bearer ${token}` : "" },
          });
          const json = await res.json();
          if (json?.success && json.data)
            setArtistName(json.data.name || firstId);
        } else {
          setArtistName(firstId);
        }
      } catch (e) {
        console.error("Fetch artist for player failed", e);
      }
    })();
  }, [artist]);

  // spin animation while playing
  useEffect(() => {
    if (playing) {
      spin.setValue(0);
      animationRef.current = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animationRef.current.start();
    } else {
      if (animationRef.current) animationRef.current.stop();
      spin.setValue(0);
    }
    return () => {
      if (animationRef.current) animationRef.current.stop();
    };
  }, [playing]);

  const songId =
    (params as any)?.id ||
    (params as any)?.songId ||
    (params as any)?._id ||
    null;

  // check favourite status
  useEffect(() => {
    (async () => {
      try {
        if (!songId) return;
        const token = await SecureStore.getItemAsync("auth_token");
        const res = await fetch(`${API}/favourites/check/${songId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        const json = await res.json();
        if (
          json?.success &&
          json.data &&
          typeof json.data.isFavourite === "boolean"
        ) {
          setIsFavourite(Boolean(json.data.isFavourite));
        } else {
          setIsFavourite(false);
        }
      } catch (e) {
        console.error("Check favourite failed", e);
        setIsFavourite(false);
      }
    })();
  }, [songId]);

  const addFavourite = async () => {
    try {
      if (!songId) return;
      const token = await SecureStore.getItemAsync("auth_token");
      const res = await fetch(`${API}/favourites/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ songId }),
      });
      const json = await res.json();
      if (json?.success) {
        setIsFavourite(true);
      }
    } catch (e) {
      console.error("Add favourite failed", e);
    } finally {
      setConfirmAction(null);
    }
  };

  const removeFavourite = async () => {
    try {
      if (!songId) return;
      const token = await SecureStore.getItemAsync("auth_token");
      const res = await fetch(`${API}/favourites/remove/${songId}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = await res.json();
      if (json?.success) {
        setIsFavourite(false);
      }
    } catch (e) {
      console.error("Remove favourite failed", e);
    } finally {
      setConfirmAction(null);
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (e) {}
  };

  const artwork = imageURL
    ? imageURL.toString().startsWith("http")
      ? imageURL.toString()
      : `${API_ORIGIN}${imageURL.toString()}`
    : null;

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const formatTime = (ms: number | null | undefined) => {
    const n = Number(ms) || 0;
    const total = Math.floor(n / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <ThemedView style={styles.container}>
      <IconButton
        icon="arrow-left"
        onPress={() => router.replace("/(tabs)/home")}
        style={styles.close}
      />
      <View style={styles.content}>
        <View style={styles.artworkContainer}>
          {artwork ? (
            <Animated.Image
              source={{ uri: artwork }}
              style={[styles.artwork, { transform: [{ rotate }] }]}
            />
          ) : (
            <Animated.View
              style={[
                styles.artwork,
                {
                  justifyContent: "center",
                  alignItems: "center",
                  transform: [{ rotate }],
                },
              ]}
            >
              <Avatar.Icon size={120} icon="music" style={styles.avatarIcon} />
            </Animated.View>
          )}
        </View>

        <ThemedText type="title" style={{ marginTop: 16 }}>
          {name}
        </ThemedText>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
        >
          <IconButton
            icon={() => (
              <Text
                style={[styles.heart, isFavourite ? styles.heartActive : {}]}
              >
                ♥
              </Text>
            )}
            size={44}
            onPress={async () => {
              if (isFavourite) {
                setConfirmAction("remove");
              } else {
                setConfirmAction("add");
              }
            }}
          />
        </View>
        <ThemedText type="default" style={{ marginTop: 4 }}>
          {artistName}
        </ThemedText>

        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: duration ? `${(position / duration) * 100}%` : "0%" },
              ]}
            />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={async () => {
              if (!soundRef.current) return;
              const status = await soundRef.current.getStatusAsync();
              const newPos = Math.max(0, (status.positionMillis || 0) - 10000);
              await soundRef.current.setPositionAsync(newPos);
            }}
            style={[styles.iconCircle, styles.leftIcon]}
          >
            <MaterialCommunityIcons
              name="skip-previous"
              size={28}
              color="#fff"
            />
          </Pressable>

          <Pressable onPress={togglePlay} style={styles.playCircle}>
            <MaterialCommunityIcons
              name={playing ? "pause-circle" : "play-circle"}
              size={64}
              color="#fff"
            />
          </Pressable>

          <Pressable
            onPress={async () => {
              if (!soundRef.current) return;
              const status = await soundRef.current.getStatusAsync();
              const newPos = Math.min(
                status.durationMillis || 0,
                (status.positionMillis || 0) + 10000,
              );
              await soundRef.current.setPositionAsync(newPos);
            }}
            style={[styles.iconCircle, styles.rightIcon]}
          >
            <MaterialCommunityIcons name="skip-next" size={28} color="#fff" />
          </Pressable>
          <Pressable
            onPress={async () => {
              try {
                const token = await SecureStore.getItemAsync("auth_token");
                const q = songId
                  ? `?excludeId=${encodeURIComponent(songId)}`
                  : "";
                const res = await fetch(`${API}/songs/random${q}`, {
                  headers: { Authorization: token ? `Bearer ${token}` : "" },
                });
                const json = await res.json();
                if (json?.success && json.data) {
                  const s = json.data;
                  router.replace({
                    pathname: "/player",
                    params: {
                      id: s._id,
                      name: s.name,
                      songUrl: s.songUrl || s.songURL || "",
                      imageURL: s.imageURL || "",
                      artist: (s.artist || []).join(", "),
                    },
                  });
                } else {
                  console.error("Random song not available", json);
                }
              } catch (e) {
                console.error("Fetch random song failed", e);
              }
            }}
            style={[styles.iconCircle, styles.shuffleIcon]}
          >
            <MaterialCommunityIcons name="shuffle" size={22} color="#fff" />
          </Pressable>
        </View>
        <Modal
          visible={confirmAction !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmAction(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={{ marginBottom: 12, color: "#fff", fontSize: 16 }}>
                {confirmAction === "remove"
                  ? "Bạn có muốn bỏ yêu thích bài hát này?"
                  : "Thêm bài hát vào yêu thích?"}
              </Text>
              <View
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <Pressable
                  onPress={() => setConfirmAction(null)}
                  style={[
                    styles.modalButton,
                    styles.modalButtonCancel,
                    { marginRight: 8 },
                  ]}
                >
                  <Text style={styles.modalButtonText}>Huỷ</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (confirmAction === "remove") await removeFavourite();
                    else await addFavourite();
                  }}
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                >
                  <Text style={styles.modalButtonText}>
                    {confirmAction === "remove" ? "Bỏ yêu thích" : "Thêm"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  close: { position: "absolute", left: 8, top: 36, zIndex: 10 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  artwork: { width: 240, height: 240, borderRadius: 8 },
  artworkContainer: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: "hidden",
    marginBottom: 12,
  },
  avatarIcon: { backgroundColor: "#444" },
  controls: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  leftIcon: { marginRight: 18 },
  rightIcon: { marginLeft: 18 },
  playCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  shuffleIcon: { marginLeft: 10, backgroundColor: "#0ea5a4" },
  progressRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  timeText: { color: "#999", width: 40, textAlign: "center" },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "#333",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: 6, backgroundColor: "#fff" },
  playButtonContainer: {
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  seekText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  seekButton: {
    borderRadius: 999,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  heart: { fontSize: 22, color: "#ccc" },
  heartActive: { color: "#e0245e" },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalButtonCancel: {
    backgroundColor: "#e0245e",
  },
  modalButtonConfirm: {
    backgroundColor: "#007aff",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 8,
    minWidth: 260,
  },
});
