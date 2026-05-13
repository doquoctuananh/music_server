import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, signupUser } from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  imageURL: string;
  role: string;
  favourites: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (credentials: any) => Promise<void>;
  signUp: (credentials: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (credentials: any) => {
    setLoading(true);
    try {
      const res = await loginUser(credentials);
      const { user: userData, token: authToken } = res.data.data;
      
      if (userData && authToken) {
        setToken(authToken);
        setUser(userData);
        await AsyncStorage.setItem('auth_token', authToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      }
    } catch (e: any) {
      console.error('Sign in failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: any) => {
    setLoading(true);
    try {
      const res = await signupUser(credentials);
      const { user: userData, token: authToken } = res.data.data;
      
      if (userData && authToken) {
        setToken(authToken);
        setUser(userData);
        await AsyncStorage.setItem('auth_token', authToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      }
    } catch (e: any) {
      console.error('Sign up failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdmin: user?.role === 'admin',
        loading,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
