import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API, API_ORIGIN } from "@/constants/api";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  IconButton,
  List,
  Modal,
  Portal,
  TextInput,
} from "react-native-paper";

export default function ArtistsScreen() {
  const [artists, setArtists] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const limit = 6;
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();

  // modal / artist songs state
  const [artistModalVisible, setArtistModalVisible] = useState(false);
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(
    null,
  );
  const [artistSongs, setArtistSongs] = useState<any[]>([]);
  const [artistIdNameMap, setArtistIdNameMap] = useState<
    Record<string, string>
  >({});
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistPagination, setArtistPagination] = useState<any>(null);
  const [artistPage, setArtistPage] = useState(1);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const url = `${API}/artists/getall?page=${page}&limit=${limit}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const json = await res.json();
        if (json?.success) {
          const items = json.data?.data || [];
          if (mounted) {
            setArtists(items);
            setPagination(json.data?.pagination || null);
          }
        } else {
          if (mounted) {
            setArtists([]);
            setPagination(null);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch artists", e);
        if (mounted) {
          setArtists([]);
          setPagination(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [page, limit]);

  const fetchSongsByArtist = async (name: string, pageNum = 1) => {
    setArtistLoading(true);
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const url = `${API}/songs/by-artist?name=${encodeURIComponent(
        name,
      )}&page=${pageNum}&limit=${limit}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (json?.success) {
        const songs = json.data?.songs || [];
        setArtistSongs(songs);
        setArtistPagination(json.data?.pagination || null);
        setArtistPage(pageNum);

        // resolve artist ids in songs -> names (cached)
        const ids: string[] = Array.from(
          new Set(
            songs.reduce(
              (acc: string[], s: any) => acc.concat(s.artist || []),
              [] as string[],
            ),
          ),
        );
        const toFetch = ids.filter((id) => id && !artistIdNameMap[id]);
        if (toFetch.length > 0) {
          const results: Record<string, string> = {};
          await Promise.all(
            toFetch.map(async (id) => {
              try {
                const r = await fetch(`${API}/artists/getone/${id}`, {
                  headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : undefined,
                });
                const j = await r.json();
                if (j?.success && j.data) results[id] = j.data.name;
              } catch (e) {
                // ignore per-id error
              }
            }),
          );
          if (Object.keys(results).length > 0) {
            setArtistIdNameMap((prev) => ({ ...prev, ...results }));
          }
        }
      } else {
        setArtistSongs([]);
        setArtistPagination(null);
      }
    } catch (e) {
      console.warn("Failed to fetch songs by artist", e);
      setArtistSongs([]);
      setArtistPagination(null);
    } finally {
      setArtistLoading(false);
    }
  };

  const openArtistModal = async (artistId: string, fallbackName?: string) => {
    setArtistModalVisible(true);
    // fetch artist display name by id
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const res = await fetch(`${API}/artists/getone/${artistId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      const displayName =
        json?.success && json.data ? json.data.name : fallbackName || "";
      setSelectedArtistName(displayName || null);
      await fetchSongsByArtist(displayName || "", 1);
    } catch (e) {
      console.warn("Failed to fetch artist details", e);
      setSelectedArtistName(fallbackName || null);
      await fetchSongsByArtist(fallbackName || "", 1);
    }
  };

  const closeArtistModal = () => {
    setArtistModalVisible(false);
    setSelectedArtistName(null);
    setArtistSongs([]);
    setArtistPagination(null);
    setArtistPage(1);
  };

  const playSongAndSaveHistory = async (song: any) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      // send history (fire-and-forget)
      fetch(`${API}/history/add`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ song: song._id }),
      }).catch((err) => console.error("Add history failed", err));
    } catch (e) {
      console.error("Add history failed", e);
    }

    // navigate to player
    router.push({
      pathname: "/player",
      params: {
        id: song._id,
        name: song.name,
        songUrl: song.songUrl || song.songURL || "",
        imageURL: song.imageURL || "",
        artist: (song.artist || []).join(", "),
      },
    });
    // close modal after navigation
    closeArtistModal();
  };
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Nghệ sĩ</ThemedText>
      </View>

      <TextInput
        placeholder="Tìm tên nghệ sĩ"
        mode="outlined"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => setSearch(query)}
        returnKeyType="search"
        style={{ marginHorizontal: 12, marginBottom: 8 }}
        right={
          <TextInput.Icon icon="magnify" onPress={() => setSearch(query)} />
        }
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={artists.filter((a) =>
            (a.name || "").toLowerCase().includes((search || "").toLowerCase()),
          )}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() => openArtistModal(item._id, item.name)}
            >
              <Card.Content>
                <View style={styles.row}>
                  {item.imageURL ? (
                    <Avatar.Image
                      size={56}
                      source={{
                        uri: item.imageURL.startsWith("http")
                          ? item.imageURL
                          : `${API_ORIGIN}${item.imageURL}`,
                      }}
                      style={styles.cardAvatar}
                    />
                  ) : (
                    <Avatar.Icon
                      size={56}
                      icon="account-music"
                      style={styles.cardAvatar}
                    />
                  )}

                  <View style={styles.info}>
                    <Text style={styles.nameText}>{item.name}</Text>
                    <View style={styles.subtitle}>
                      {item.twitter ? (
                        <Text
                          style={styles.metaText}
                        >{`Twitter: ${item.twitter}`}</Text>
                      ) : null}
                      {item.instagram ? (
                        <Text
                          style={styles.metaText}
                        >{`Instagram: ${item.instagram}`}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        />
      )}

      <Portal>
        <Modal
          visible={artistModalVisible}
          onDismiss={closeArtistModal}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={{ maxHeight: 520 }}>
            <ThemedText type="title">{selectedArtistName}</ThemedText>
            {artistLoading ? (
              <ActivityIndicator style={{ marginTop: 12 }} />
            ) : (
              <FlatList
                data={artistSongs}
                keyExtractor={(s) => s._id}
                style={{ marginTop: 8 }}
                renderItem={({ item }) => (
                  <List.Item
                    title={item.name}
                    description={(item.artist || [])
                      .map((id: string) => artistIdNameMap[id] || id)
                      .join(", ")}
                    left={() =>
                      item.imageURL ? (
                        <Avatar.Image
                          size={48}
                          source={{
                            uri: item.imageURL.startsWith("http")
                              ? item.imageURL
                              : `${API_ORIGIN}${item.imageURL}`,
                          }}
                        />
                      ) : (
                        <Avatar.Icon size={48} icon="music" />
                      )
                    }
                    right={() => (
                      <IconButton
                        icon="play"
                        onPress={() => playSongAndSaveHistory(item)}
                      />
                    )}
                    onPress={() => playSongAndSaveHistory(item)}
                  />
                )}
              />
            )}

            <View style={styles.modalPager}>
              <Button
                disabled={!artistPagination?.hasPrevPage}
                onPress={() =>
                  fetchSongsByArtist(
                    selectedArtistName || "",
                    Math.max(1, (artistPage || 1) - 1),
                  )
                }
              >
                Prev
              </Button>
              <Text
                style={{ color: "#fff", alignSelf: "center" }}
              >{` ${artistPagination?.page || 1} / ${artistPagination?.totalPages || 1} `}</Text>
              <Button
                disabled={!artistPagination?.hasNextPage}
                onPress={() =>
                  fetchSongsByArtist(
                    selectedArtistName || "",
                    (artistPage || 1) + 1,
                  )
                }
              >
                Next
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <View style={styles.pager}>
        <IconButton
          icon="chevron-left"
          disabled={!pagination?.hasPrevPage}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        />
        <Text
          style={styles.pageText}
        >{` ${pagination?.page || 1} / ${pagination?.totalPages || 1} `}</Text>
        <IconButton
          icon="chevron-right"
          disabled={!pagination?.hasNextPage}
          onPress={() => setPage((p) => p + 1)}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, paddingTop: 28 },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageText: { textAlign: "center", color: "#fff" },
  metaText: { color: "#999", fontSize: 12, marginTop: 4 },
  card: {
    marginHorizontal: 12,
    marginBottom: 18,
    backgroundColor: "#111",
    paddingVertical: 8,
  },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardAvatar: { borderRadius: 28, marginRight: 0 },
  subtitle: { marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center" },
  info: { flex: 1, paddingLeft: 16 },
  nameText: { fontSize: 16, color: "#fff", marginBottom: 4 },
  modalContainer: {
    backgroundColor: "#111",
    padding: 12,
    margin: 20,
    borderRadius: 8,
  },
  modalPager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
});
