import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Divider, List } from "react-native-paper";

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Cài đặt</ThemedText>
      </View>

      <List.Section>
        <List.Item
          title="Thông tin tài khoản"
          description="Quản lý tài khoản"
        />
        <Divider />
        <List.Item title="Thông báo" description="Cài đặt thông báo" />
        <Divider />
        <List.Item title="Giao diện" description="Sáng / Tối" />
      </List.Section>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12 },
});
