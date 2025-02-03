export interface Song {
    id: string
    title: string
    artist: string
    work: string
    spotify_id?: string
    jacket_url?: string
}

export interface DatabaseError {
    message: string
    details: string
    hint: string
    code: string
}

