export interface Album {
  _id: string;
  name: string;
  imageURL: string;
}

export interface Artist {
  _id: string;
  name: string;
  imageURL: string;
}

export interface Playlist {
  _id: string;
  name: string;
  imageURL?: string;
  songs: { songId: string }[];
  userId?: string;
}

export interface HistoryEntry {
  _id: string;
  songId: string;
  userId: string;
  createdAt: string;
}
