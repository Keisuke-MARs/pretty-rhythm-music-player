export interface Song {
    id: string
    title: string
    artist: string
    work: string
    jacket_url?: string
    spotify_track_id?: string // Optional Spotify track ID
}

export interface Database {
    public: {
        Tables: {
            songs: {
                Row: Song
                Insert: Omit<Song, "id">
                Update: Partial<Song>
            }
        }
    }
}

