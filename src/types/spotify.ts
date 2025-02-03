export interface SpotifyTrack {
    id: string
    name: string
    preview_url: string | null
    external_urls: {
        spotify: string
    }
    album: {
        images: Array<{
            url: string
            height: number
            width: number
        }>
    }
}

