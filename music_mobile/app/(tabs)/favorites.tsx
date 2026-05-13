import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API, API_ORIGIN } from "@/constants/api";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, List } from "react-native-paper";

export default function FavoritesScreen() {
  const [songs, setSongs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFavourites = async (p = 1, q = "") => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("auth_token");
      const qPart = q ? `&q=${encodeURIComponent(q)}` : "";
      const endpoint = q ? "search" : "list";
      const res = await fetch(
        `${API}/favourites/${endpoint}?page=${p}&limit=${limit}${qPart}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        },
      );
      const json = await res.json();
      if (json?.success && json.data) {
        const fetched = json.data.songs || [];
        // resolve artist names for display (API returns ids)
        // artists may be returned as ids or as objects with { _id, name }
        const artistMap: Record<string, string> = {};
        // collect string ids only
        const stringIds = Array.from(
          new Set(
            fetched.flatMap((s: any) =>
              Array.isArray(s.artist)
                ? s.artist.filter((a: any) => typeof a === "string")
                : [],
            ),
          ),
        );
        if (stringIds.length > 0) {
          await Promise.all(
            stringIds.map(async (id) => {
              try {
                const token2 = await SecureStore.getItemAsync("auth_token");
                const r = await fetch(`${API}/artists/getone/${id}`, {
                  headers: { Authorization: token2 ? `Bearer ${token2}` : "" },
                });
                const ajson = await r.json();
                artistMap[id] =
                  ajson?.success && ajson.data ? ajson.data.name || id : id;
              } catch (e) {
                artistMap[id] = id;
              }
            }),
          );
        }

        const withNames = fetched.map((s: any) => {
          const artistNames = (s.artist || []).map((a: any) => {
            if (typeof a === "string") return artistMap[a] || a;
            if (a && typeof a === "object") return a.name || a._id || "";
            return "";
          });
          return { ...s, artistNames };
        });

        setSongs(withNames);
        setPage(json.data.page || p);
        setTotalPages(json.data.totalPages || 1);
      } else {
        setSongs([]);
        setPage(1);
        setTotalPages(1);
      }
    } catch (e) {
      console.error("Fetch favourites failed", e);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites(page, searchQuery);
  }, [page]);

  // trigger fetch when searchQuery changes (set when user presses search icon)
  useEffect(() => {
    setPage(1);
    fetchFavourites(1, searchQuery);
  }, [searchQuery]);

  const removeFromFavourites = async (songId: string) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const res = await fetch(`${API}/favourites/remove/${songId}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = await res.json();
      if (json?.success) {
        // refetch current page
        fetchFavourites(page, searchQuery);
      }
    } catch (e) {
      console.error("Remove favourite from list failed", e);
    }
  };

  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      fetchFavourites(1, searchQuery);
      return () => {};
    }, [searchQuery]),
  );

  const renderItem = ({ item }: { item: any }) => {
    const artwork = item.imageURL ? `${API_ORIGIN}${item.imageURL}` : null;
    return (
      <View style={styles.item}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.itemPlaceholder]} />
        )}
        <View style={styles.itemBody}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>
            {(item.artistNames || item.artist || []).join(", ")}
          </Text>
        </View>
        <IconButton
          icon="play"
          color="#fff"
          size={28}
          onPress={() => {
            // navigate to player and pass song params
            router.push({
              pathname: "/player",
              params: {
                id: item._id,
                name: item.name,
                songUrl: item.songUrl,
                imageURL: item.imageURL,
                artist: Array.isArray(item.artist)
                  ? item.artist.join(",")
                  : item.artist || "",
              },
            });
          }}
        />
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Bài hát yêu thích</ThemedText>
      </View>

      <View
        style={[
          styles.searchRow,
          { flexDirection: "row", alignItems: "center" },
        ]}
      >
        <TextInput
          placeholder="Tìm theo tên bài hát..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
          style={[styles.searchInput, { flex: 1 }]}
        />
        <IconButton
          icon="magnify"
          size={24}
          onPress={() => setSearchQuery(searchText)}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : songs.length === 0 ? (
        <List.Section>
          <List.Item
            title="Chưa có bài hát yêu thích"
            description="Thêm bài hát bằng cách nhấn vào biểu tượng trái tim"
          />
        </List.Section>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 12,
            paddingTop: 20,
            paddingBottom: 140,
          }}
          // ensure list isn't hidden under tab bar
        />
      )}

      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => page > 1 && setPage(page - 1)}
          disabled={page <= 1}
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
        >
          <Text style={styles.pageButtonText}>Trước</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>{`Trang ${page} / ${totalPages}`}</Text>
        <TouchableOpacity
          onPress={() => page < totalPages && setPage(page + 1)}
          disabled={page >= totalPages}
          style={[
            styles.pageButton,
            page >= totalPages && styles.pageButtonDisabled,
          ]}
        >
          <Text style={styles.pageButtonText}>Sau</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, marginTop: 30 },
  searchRow: { paddingHorizontal: 12, paddingBottom: 8 },
  searchInput: {
    backgroundColor: "#111",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  item: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  itemImage: { width: 64, height: 64, borderRadius: 6, marginRight: 12 },
  itemPlaceholder: { backgroundColor: "#333" },
  itemBody: { flex: 1 },
  itemTitle: { color: "#fff", fontSize: 16, marginBottom: 4 },
  itemSubtitle: { color: "#888", fontSize: 12 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#222",
    borderRadius: 6,
  },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonText: { color: "#fff" },
  pageInfo: { color: "#999", marginHorizontal: 12 },
});
