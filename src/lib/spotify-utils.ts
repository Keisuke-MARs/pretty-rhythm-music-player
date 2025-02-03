import { createClient } from "@supabase/supabase-js"
import SpotifyWebApi from "spotify-web-api-node"
import NodeCache from "node-cache"
import type { SpotifyTrack, SpotifySearchResponse, SpotifyCredentials } from "@/types/spotify"

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const cache = new NodeCache({ stdTTL: 3600 })

export async function getSpotifyData(title: string, artist: string): Promise<SpotifyTrack | null> {
    const cacheKey = `${title}-${artist}`
    const cachedData = cache.get<SpotifyTrack>(cacheKey)

    if (cachedData) return cachedData

    const query = `track:${title} artist:${artist}`
    const data = (await spotifyApi.clientCredentialsGrant()) as SpotifyCredentials
    spotifyApi.setAccessToken(data.body.access_token)

    const searchResults = (await spotifyApi.searchTracks(query, { limit: 1 })) as SpotifySearchResponse
    const spotifyData = searchResults.body.tracks?.items[0] || null

    if (spotifyData) {
        cache.set(cacheKey, spotifyData)
    }

    return spotifyData
}

export async function updateSongInfo(songId: string): Promise<void> {
    const { data: song, error: selectError } = await supabase.from("songs").select("*").eq("id", songId).single()

    if (selectError || !song) {
        console.error("Error fetching song:", selectError)
        return
    }

    const spotifyData = await getSpotifyData(song.title, song.artist)
    if (spotifyData) {
        const { error } = await supabase
            .from("songs")
            .update({
                spotify_id: spotifyData.id,
                jacket_url: spotifyData.album.images[0]?.url,
            })
            .eq("id", songId)

        if (error) {
            console.error("Error updating song:", error)
        }
    }
}

