import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API, API_ORIGIN } from "@/constants/api";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Card,
  IconButton,
  List,
} from "react-native-paper";

export default function AlbumsScreen() {
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);

  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [albumSongs, setAlbumSongs] = useState<any[]>([]);
  const [loadingAlbumSongs, setLoadingAlbumSongs] = useState(false);
  const [albumSongsPage, setAlbumSongsPage] = useState(1);
  const [albumSongsPagination, setAlbumSongsPagination] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const res = await fetch(
          `${API}/albums/all?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              Accept: "application/json",
            },
          },
        );
        const json = await res.json();
        if (!mounted) return;
        if (json?.success) {
          setAlbums(json.data?.albums || []);
        } else {
          setAlbums(json?.albums || json?.data || []);
        }
      } catch (e) {
        console.error("Fetch albums error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [page]);

  // auto-select first album when list loads
  useEffect(() => {
    if (albums.length > 0 && !selectedAlbum) {
      setSelectedAlbum(albums[0]);
      setAlbumSongsPage(1);
    }
  }, [albums]);

  useEffect(() => {
    if (!selectedAlbum) return;
    let mounted = true;
    (async () => {
      setLoadingAlbumSongs(true);
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const res = await fetch(
          `${API}/albums/${selectedAlbum._id}/songs?page=${albumSongsPage}&limit=${limit}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              Accept: "application/json",
            },
          },
        );
        const json = await res.json();
        if (!mounted) return;
        if (json?.success) {
          setAlbumSongs(json.data?.songs || []);
          setAlbumSongsPagination(json.data?.pagination || null);
        } else {
          setAlbumSongs(json?.songs || json?.data?.songs || []);
          setAlbumSongsPagination(json?.data?.pagination || null);
        }
      } catch (e) {
        console.error("Fetch album songs error", e);
      } finally {
        if (mounted) setLoadingAlbumSongs(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedAlbum, albumSongsPage]);

  return (
    <ThemedView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Albums" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {albums.map((alb, idx) => {
                const imageUri = alb.imageURL?.startsWith("http")
                  ? alb.imageURL
                  : `${API_ORIGIN}${alb.imageURL}`;
                const bg = idx % 2 === 0 ? "#ffffff" : "#cfe2ff";
                return (
                  <Card
                    key={alb._id}
                    style={[
                      styles.card,
                      { width: 200, marginRight: 12, backgroundColor: bg },
                    ]}
                    onPress={() => {
                      setSelectedAlbum(alb);
                      setAlbumSongsPage(1);
                    }}
                  >
                    {alb.imageURL ? (
                      <Card.Cover
                        source={{ uri: imageUri }}
                        style={styles.cover}
                      />
                    ) : null}
                    <Card.Content style={styles.cardContent}>
                      <ThemedText type="title" style={styles.albumTitle}>
                        {alb.name}
                      </ThemedText>
                      {alb.description ? (
                        <Text style={styles.albumSubtitle} numberOfLines={2}>
                          {alb.description}
                        </Text>
                      ) : null}
                    </Card.Content>
                  </Card>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: 8 }}>
              {selectedAlbum ? (
                <View>
                  <ThemedText type="title">{`Album: ${selectedAlbum.name}`}</ThemedText>

                  {loadingAlbumSongs ? (
                    <ActivityIndicator style={{ marginTop: 12 }} />
                  ) : (
                    <View>
                      {albumSongs.map((t) => (
                        <List.Item
                          key={t._id}
                          title={t.name}
                          description={(t.artist || [])
                            .map((a: any) => a.name)
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
                                    await SecureStore.getItemAsync(
                                      "auth_token",
                                    );
                                  const res = await fetch(
                                    `${API}/songs/getone/${t._id}`,
                                    {
                                      headers: {
                                        Authorization: token
                                          ? `Bearer ${token}`
                                          : "",
                                      },
                                    },
                                  );
                                  const json = await res
                                    .json()
                                    .catch(() => null);

                                  const songId =
                                    json?.success && json.data
                                      ? json.data._id
                                      : t._id;

                                  // add to history (fire-and-forget)
                                  try {
                                    fetch(`${API}/history/add`, {
                                      method: "POST",
                                      headers: {
                                        Authorization: token
                                          ? `Bearer ${token}`
                                          : "",
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
                                        artist: (d.artist || [])
                                          .map((a: any) => a.name)
                                          .join(", "),
                                      },
                                    });
                                  } else {
                                    router.push({
                                      pathname: "/player",
                                      params: {
                                        id: t._id,
                                        name: t.name,
                                        songUrl: t.songUrl || t.songURL || "",
                                        imageURL: t.imageURL || "",
                                        artist: (t.artist || [])
                                          .map((a: any) => a.name || a)
                                          .join(", "),
                                      },
                                    });
                                  }
                                } catch (e) {
                                  console.error("Play song error", e);
                                  router.push({
                                    pathname: "/player",
                                    params: {
                                      id: t._id,
                                      name: t.name,
                                      songUrl: t.songUrl || t.songURL || "",
                                      imageURL: t.imageURL || "",
                                      artist: (t.artist || [])
                                        .map((a: any) => a.name || a)
                                        .join(", "),
                                    },
                                  });
                                }
                              }}
                            />
                          )}
                        />
                      ))}

                      <View style={styles.pager}>
                        <IconButton
                          icon="chevron-left"
                          disabled={!albumSongsPagination?.hasPrevPage}
                          onPress={() =>
                            setAlbumSongsPage((p) => Math.max(1, p - 1))
                          }
                        />
                        <Text
                          style={{ color: "#fff" }}
                        >{`Trang ${albumSongsPagination?.page || 1} / ${albumSongsPagination?.totalPages || 1}`}</Text>
                        <IconButton
                          icon="chevron-right"
                          disabled={!albumSongsPagination?.hasNextPage}
                          onPress={() => setAlbumSongsPage((p) => p + 1)}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={{ color: "#888", marginTop: 8 }}>
                  Chọn một album để xem bài hát
                </Text>
              )}
            </View>

            {!selectedAlbum && (
              <View style={styles.pager}>
                <IconButton
                  icon="chevron-left"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Text style={{ alignSelf: "center" }}>{`Trang ${page}`}</Text>
                <IconButton
                  icon="chevron-right"
                  onPress={() => setPage((p) => p + 1)}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cover: {
    width: "100%",
    height: 140,
    backgroundColor: "#eee",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: { paddingVertical: 12, paddingHorizontal: 10 },
  albumTitle: { color: "#062a78", fontSize: 16, fontWeight: "700" },
  albumSubtitle: { color: "#333", fontSize: 12, marginTop: 6 },
  artistText: { color: "#666", marginTop: 4 },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
});
