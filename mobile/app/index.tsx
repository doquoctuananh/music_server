import { StyleSheet, Text, View, Button, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import Login from "./login";

export default function Page() {
  const { token, loading, user, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return <Login />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>{user ? `Xin chào, ${user.name}` : 'Trang chính'}</Text>
        <Button title="Đăng xuất" onPress={() => signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 960,
    marginHorizontal: "auto",
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 36,
    color: "#38434D",
  },
});
