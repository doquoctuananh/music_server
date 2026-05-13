import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signIn({ email, password });
      router.replace('/');
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Đăng nhập thất bại';
      Alert.alert('Lỗi', message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/splash-icon.png')}
          style={styles.image}
          resizeMode="cover"
        />
        <Text style={styles.title}>Nghe nhạc</Text>
        <Text style={styles.subtitleSmall}>Đăng nhập để tiếp tục</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Đăng nhập" onPress={handleLogin} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitleSmall: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  form: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
});
