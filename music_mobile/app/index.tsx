import { API } from "@/constants/api";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!json?.success) {
        Alert.alert(
          "Đăng nhập thất bại",
          json?.message || "Invalid credentials",
        );
        return;
      }

      const token = json.data?.token;
      const user = json.data?.user;

      if (token) await SecureStore.setItemAsync("auth_token", token);
      if (user)
        await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
      await SecureStore.setItemAsync("auth_response", JSON.stringify(json));

      router.replace("/(tabs)/home");
    } catch (e) {
      console.error("Login error", e);
      Alert.alert("Lỗi", "Không thể kết nối tới máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ThemedView style={styles.card}>
          <ThemedText type="title" style={styles.headerTitle}>
            Nghe nhạc trực tuyến
          </ThemedText>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <TextInput
            placeholder="Mật khẩu"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={onSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F12",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 0,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 0,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    margin: 0,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#000",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
  },
});
