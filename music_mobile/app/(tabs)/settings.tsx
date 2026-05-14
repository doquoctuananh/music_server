import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_ORIGIN } from "@/constants/api";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Divider, List } from "react-native-paper";

export default function SettingsScreen() {
  const [user, setUser] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync("auth_user");
        if (raw) setUser(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to load auth_user", e);
      }
    })();
  }, []);

  const onLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("auth_token");
          await SecureStore.deleteItemAsync("auth_user");
          await SecureStore.deleteItemAsync("auth_response");
          router.replace("/");
        },
      },
    ]);
  };

  const avatar = (() => {
    const url = user?.imageURL;
    if (!url) return null;
    try {
      const s = url.toString();
      return s.startsWith("http") ? s : `${API_ORIGIN}${s}`;
    } catch (e) {
      return null;
    }
  })();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Cài đặt</ThemedText>
      </View>

      <List.Section>
        <View style={styles.accountRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}

          <View style={styles.accountInfo}>
            <ThemedText type="defaultSemiBold">{user?.name || "-"}</ThemedText>
            <ThemedText type="default">{user?.email || "-"}</ThemedText>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <ThemedText type="link">Đăng xuất</ThemedText>
          </TouchableOpacity>
        </View>

        <Divider />

        {/* <List.Item
          title="Thông tin tài khoản"
          description="Quản lý tài khoản"
        />
        <Divider />
        <List.Item title="Thông báo" description="Cài đặt thông báo" />
        <Divider />
        <List.Item title="Giao diện" description="Sáng / Tối" /> */}
      </List.Section>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 28 },
  header: { padding: 12 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEE",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
