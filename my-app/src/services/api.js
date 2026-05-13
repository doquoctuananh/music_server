const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Helper function để thêm Authorization header
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// User APIs
export const userAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  createUser: async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('role', data.role);
    
    // Thêm ảnh nếu có
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await fetch(`${API_BASE_URL}/api/users/create-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  getUsers: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/api/users/getusers?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  updateUser: async (userId, data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    
    // Thêm ảnh nếu có
    if (data.image) {
      formData.append('image', data.image);
    }

    const response = await fetch(`${API_BASE_URL}/api/users/updateuser/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/api/users/deleteuser/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },
};

// Statistics APIs
export const statisticsAPI = {
  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/api/statistics/users`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getArtists: async () => {
    const response = await fetch(`${API_BASE_URL}/api/artists/stats`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getSongs: async () => {
    const response = await fetch(`${API_BASE_URL}/api/songs/stats`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getAlbums: async () => {
    const response = await fetch(`${API_BASE_URL}/api/albums/stats`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getTodayStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/history/stats-today`, {
      headers: getHeaders(),
    });
    return response.json();
  },
};

// Album APIs
export const albumAPI = {
  getAlbums: async (page = 1, limit = 6) => {
    const response = await fetch(`${API_BASE_URL}/api/albums/getall?page=${page}&limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    });
    return response.json();
  },

  getAlbumsForSelect: async () => {
    const response = await fetch(`${API_BASE_URL}/api/albums/all`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    });
    return response.json();
  },

  createAlbum: async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.artist) {
      formData.append('artist', data.artist);
    }
    if (data.imageFile) {
      formData.append('imageFile', data.imageFile);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/albums/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  updateAlbum: async (albumId, data) => {
    const formData = new FormData();
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.artist) {
      formData.append('artist', data.artist);
    }
    if (data.imageFile) {
      formData.append('imageFile', data.imageFile);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/albums/${albumId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  deleteAlbum: async (albumId) => {
    const response = await fetch(`${API_BASE_URL}/api/albums/${albumId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  getAlbumDetail: async (albumId) => {
    const response = await fetch(`${API_BASE_URL}/api/albums/getone/${albumId}`, {
      headers: getHeaders(),
    });
    return response.json();
  },
};

// Artist APIs
export const artistAPI = {
  getArtists: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/api/artists/getall?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  searchArtists: async (q = '', page = 1, limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/api/artists/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  createArtist: async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    
    // Thêm các trường optional
    if (data.twitter) {
      formData.append('twitter', data.twitter);
    }
    if (data.instagram) {
      formData.append('instagram', data.instagram);
    }
    if (data.imageFile) {
      formData.append('imageFile', data.imageFile);
    }

    const response = await fetch(`${API_BASE_URL}/api/artists/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  updateArtist: async (artistId, data) => {
    const formData = new FormData();
    
    // Tất cả fields đều optional
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.twitter) {
      formData.append('twitter', data.twitter);
    }
    if (data.instagram) {
      formData.append('instagram', data.instagram);
    }
    if (data.imageFile) {
      formData.append('imageFile', data.imageFile);
    }

    const response = await fetch(`${API_BASE_URL}/api/artists/${artistId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  deleteArtist: async (artistId) => {
    const response = await fetch(`${API_BASE_URL}/api/artists/${artistId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },
};

// Song APIs
export const songAPI = {
  getSongs: async (page = 1, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/api/songs/getall?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  searchSongs: async (q = '', page = 1, limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/api/songs/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getArtistsForSelect: async () => {
    const response = await fetch(`${API_BASE_URL}/api/songs/artists-all`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  createSong: async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('artist', data.artist);
    
    if (data.album) {
      formData.append('album', data.album);
    }
    if (data.duration) {
      formData.append('duration', data.duration);
    }
    if (data.language) {
      formData.append('language', data.language);
    }
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.songFile) {
      formData.append('songFile', data.songFile);
    }
    if (data.imageFile) {
      formData.append('imageFile', data.imageFile);
    }

    const response = await fetch(`${API_BASE_URL}/api/songs/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  updateSong: async (songId, data) => {
    const formData = new FormData();
    
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.artist) {
      formData.append('artist', data.artist);
    }
    if (data.album) {
      formData.append('album', data.album);
    }
    if (data.language) {
      formData.append('language', data.language);
    }
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.duration) {
      formData.append('duration', data.duration);
    }
    if (data.songFile) {
      formData.append('songFile', data.songFile);
    }
    if (data.imageFile) {
      formData.append('imageFile', data.imageFile);
    }

    const response = await fetch(`${API_BASE_URL}/api/songs/${songId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });
    return response.json();
  },

  deleteSong: async (songId) => {
    const response = await fetch(`${API_BASE_URL}/api/songs/${songId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  getSongDetail: async (songId) => {
    const response = await fetch(`${API_BASE_URL}/api/songs/getone/${songId}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getArtistDetail: async (artistId) => {
    const response = await fetch(`${API_BASE_URL}/api/artists/getone/${artistId}`, {
      headers: getHeaders(),
    });
    return response.json();
  },
};
