import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.1.107:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== AUTH =====
export const loginUser = (data: any) => api.post('/users/login', data);
export const signupUser = (data: any) => api.post('/users/signup', data);
export const getUsers = () => api.get('/users/getusers');
export const updateUserRole = (userId: string, role: string) =>
  api.put(`/users/updaterole/${userId}`, { role });
export const deleteUser = (userId: string) =>
  api.delete(`/users/deleteuser/${userId}`);
export const toggleFavourite = (userId: string, songId: string) =>
  api.put(`/users/updateFavourites/${userId}`, { songId });

// ===== SONGS (read-only) =====
export const getAllSongs = (params?: Record<string, string>) =>
  api.get('/songs/getall', { params });
export const getSong = (id: string) => api.get(`/songs/getone/${id}`);
export const getSongStats = () => api.get('/songs/stats');
export const playSong = (id: string) => api.put(`/songs/play/${id}`);

// ===== PLAYLISTS =====
export const getAllPlaylists = () => api.get('/playlists/getall');
export const getPlaylist = (id: string) =>
  api.get(`/playlists/getplaylist/${id}`);
export const savePlaylist = (data: any) =>
  api.post('/playlists/savePlaylist', data);
export const updatePlaylist = (id: string, data: any) =>
  api.put(`/playlists/update/${id}`, data);
export const addSongToPlaylist = (playlistId: string, songId: string) =>
  api.put(`/playlists/update/${playlistId}/add`, { songId });
export const removeSongFromPlaylist = (playlistId: string, songId: string) =>
  api.put(`/playlists/update/${playlistId}/remove`, { songId });
export const deletePlaylist = (id: string) =>
  api.delete(`/playlists/deleteplaylist/${id}`);

// ===== HISTORY =====
export const addHistory = (songId: string) =>
  api.post('/history/add', { songId });
export const getHistory = () => api.get('/history/getall');

// ===== AI RECOMMENDATIONS =====
export const getRecommendations = () => api.get('/recommendations');

export default api;
