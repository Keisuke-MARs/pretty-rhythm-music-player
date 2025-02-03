export interface SpotifyImage {
    url: string
    height: number
    width: number
}

export interface SpotifyAlbum {
    images: SpotifyImage[]
}

export interface SpotifyExternalUrls {
    spotify: string
}

export interface SpotifyTrack {
    id: string
    name: string
    preview_url: string | null
    external_urls: SpotifyExternalUrls
    album: SpotifyAlbum
}

export interface SpotifySearchResponse {
    body: {
        tracks?: {
            items: SpotifyTrack[]
        }
    }
}

export interface SpotifyCredentials {
    body: {
        access_token: string
    }
}

