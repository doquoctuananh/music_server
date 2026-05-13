import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API, API_ORIGIN } from "@/constants/api";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Appbar,
  Avatar,
  Card,
  Chip,
  IconButton,
  List,
  TextInput,
} from "react-native-paper";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState<any>(null);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [artistMap, setArtistMap] = useState<
    Record<string, { name: string; imageURL?: string }>
  >({});

  const filteredSongs = songs.filter((s) =>
    (s.name || "").toLowerCase().includes((search || "").toLowerCase()),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const endpoint = selectedCategory
          ? `${API}/songs/by-category?category=${encodeURIComponent(
              selectedCategory,
            )}&page=${page}&limit=${limit}`
          : `${API}/songs/getall?page=${page}&limit=${limit}`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "application/json",
          },
        });
        const json = await res.json();
        if (!mounted) return;
        if (json?.success) {
          setSongs(json.data.songs || []);
          setPagination(json.data.pagination || null);
        } else {
          setSongs([]);
          setPagination(null);
        }
      } catch (e) {
        console.error("Fetch songs error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [page, selectedCategory]);

  // fetch artist details (name, image) for artist id references in songs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ids = Array.from(
          new Set(
            songs.reduce(
              (acc: string[], s) => acc.concat(s.artist || []),
              [] as string[],
            ),
          ),
        );
        if (ids.length === 0) return;
        const token = await SecureStore.getItemAsync("auth_token");
        const results: Record<string, { name: string; imageURL?: string }> = {};
        await Promise.all(
          ids.map(async (id) => {
            if (!id) return;
            try {
              const res = await fetch(`${API}/artists/getone/${id}`, {
                headers: { Authorization: token ? `Bearer ${token}` : "" },
              });
              const json = await res.json();
              if (json?.success && json.data) {
                results[id] = {
                  name: json.data.name,
                  imageURL: json.data.imageURL,
                };
              }
            } catch (e) {
              // ignore
            }
          }),
        );
        if (!mounted) return;
        setArtistMap((prev) => ({ ...prev, ...results }));
      } catch (e) {
        console.error("Fetch artists error", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [songs]);

  const renderItem = ({ item }: { item: any }) => {
    const imageUri = item.imageURL?.startsWith("http")
      ? item.imageURL
      : `${API_ORIGIN}${item.imageURL}`;
    return (
      <Card style={styles.card}>
        {item.imageURL ? (
          <Card.Cover source={{ uri: imageUri }} style={styles.cover} />
        ) : null}
        <Card.Content>
          <ThemedText type="title">{item.name}</ThemedText>
          <Text style={styles.artistText}>
            {(item.artist || []).join(", ")}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const genres = [
    "Tất cả",
    "Pop",
    "Rock",
    "Jazz",
    "Classical",
    "Hip-Hop",
    "Electronic",
    "Country",
    "R&B",
  ];

  return (
    <ThemedView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="Nghe nhạc trực tuyến" />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={{ padding: 12 }}>
          <TextInput
            placeholder="Tìm kiếm bài hát"
            mode="outlined"
            value={search}
            onChangeText={setSearch}
            style={{ marginBottom: 12, borderRadius: 24 }}
            left={<TextInput.Icon icon="magnify" />}
            right={
              <TextInput.Icon
                icon="magnify"
                onPress={() => {
                  /* explicit search */
                }}
              />
            }
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {genres.map((g) => {
              const ALL_LABEL = "Tất cả";
              const selected =
                g === ALL_LABEL
                  ? selectedCategory === null
                  : selectedCategory === g;
              return (
                <Chip
                  key={g}
                  style={[styles.chip, selected && styles.chipSelected]}
                  mode={selected ? "flat" : "outlined"}
                  onPress={() => {
                    // toggle: "Tất cả" should clear the category filter (null)
                    if (g === ALL_LABEL) {
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory((prev) => (prev === g ? null : g));
                    }
                    setPage(1);
                  }}
                >
                  {g}
                </Chip>
              );
            })}
          </ScrollView>

          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <ThemedText type="title">Bài hát</ThemedText>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <View>
              {filteredSongs.map((t) => (
                <List.Item
                  key={t._id}
                  title={t.name}
                  description={(t.artist || [])
                    .map((id: string) => artistMap[id]?.name || id)
                    .join(", ")}
                  left={() =>
                    t.imageURL ? (
                      <Avatar.Image
                        size={48}
                        source={{
                          uri: t.imageURL?.startsWith("http")
                            ? t.imageURL
                            : `${API_ORIGIN}${t.imageURL}`,
                        }}
                      />
                    ) : (
                      <Avatar.Icon size={48} icon="music" />
                    )
                  }
                  right={() => (
                    <IconButton
                      icon="play"
                      onPress={async () => {
                        try {
                          const token =
                            await SecureStore.getItemAsync("auth_token");
                          const res = await fetch(
                            `${API}/songs/getone/${t._id}`,
                            {
                              headers: {
                                Authorization: token ? `Bearer ${token}` : "",
                              },
                            },
                          );
                          const json = await res.json();

                          // determine song id (prefer fetched detail)
                          const songId =
                            json?.success && json.data ? json.data._id : t._id;

                          // fire-and-forget: send history add request
                          try {
                            fetch(`${API}/history/add`, {
                              method: "POST",
                              headers: {
                                Authorization: token ? `Bearer ${token}` : "",
                                "Content-Type": "application/json",
                                Accept: "application/json",
                              },
                              body: JSON.stringify({ song: songId }),
                            }).catch((err) =>
                              console.error("Add history failed", err),
                            );
                          } catch (e) {
                            console.error("Add history failed", e);
                          }

                          if (json?.success && json.data) {
                            const d = json.data;
                            router.push({
                              pathname: "/player",
                              params: {
                                id: d._id,
                                name: d.name,
                                songUrl: d.songUrl || d.songURL || "",
                                imageURL: d.imageURL || "",
                                artist: (d.artist || []).join(", "),
                              },
                            });
                          } else {
                            // fallback to local data
                            router.push({
                              pathname: "/player",
                              params: {
                                id: t._id,
                                name: t.name,
                                songUrl: t.songUrl || t.songURL || "",
                                imageURL: t.imageURL || "",
                                artist: (t.artist || []).join(", "),
                              },
                            });
                          }
                        } catch (e) {
                          console.error("Fetch song detail error", e);

                          // still attempt to add history with local id
                          try {
                            const token =
                              await SecureStore.getItemAsync("auth_token");
                            fetch(`${API}/history/add`, {
                              method: "POST",
                              headers: {
                                Authorization: token ? `Bearer ${token}` : "",
                                "Content-Type": "application/json",
                                Accept: "application/json",
                              },
                              body: JSON.stringify({ song: t._id }),
                            }).catch((err) =>
                              console.error("Add history failed", err),
                            );
                          } catch (e2) {
                            console.error("Add history failed", e2);
                          }

                          router.push({
                            pathname: "/player",
                            params: {
                              id: t._id,
                              name: t.name,
                              songUrl: t.songUrl || t.songURL || "",
                              imageURL: t.imageURL || "",
                              artist: (t.artist || []).join(", "),
                            },
                          });
                        }
                      }}
                    />
                  )}
                />
              ))}
            </View>
          )}

          <View style={styles.pager}>
            <IconButton
              icon="chevron-left"
              disabled={!pagination?.hasPrevPage}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              containerColor="#fff"
              iconColor="#FFD700"
            />
            <Text
              style={{ color: "#fff" }}
            >{`Trang ${pagination?.page || 1} / ${pagination?.totalPages || 1}`}</Text>
            <IconButton
              icon="chevron-right"
              disabled={!pagination?.hasNextPage}
              onPress={() => setPage((p) => p + 1)}
              containerColor="#fff"
              iconColor="#FFD700"
            />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, alignItems: "center" },
  chip: { marginRight: 8 },
  chipSelected: { backgroundColor: "#fff" },
  card: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  cover: { width: "100%", height: 160, backgroundColor: "#eee" },
  cardContent: { padding: 8 },
  artistText: { color: "#666", marginTop: 4 },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  pagerButton: { padding: 8, borderRadius: 6, backgroundColor: "#eee" },
  disabledButton: { opacity: 0.5 },
});
