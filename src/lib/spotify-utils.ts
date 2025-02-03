import { createClient } from "@supabase/supabase-js"
import SpotifyWebApi from "spotify-web-api-node"
import NodeCache from "node-cache"

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const cache = new NodeCache({ stdTTL: 3600 }) // 1 hour TTL

export async function getSpotifyData(title: string, artist: string) {
    const cacheKey = `${title}-${artist}`
    const cachedData = cache.get(cacheKey)

    if (cachedData) return cachedData

    const query = `track:${title} artist:${artist}`
    const data = await spotifyApi.clientCredentialsGrant()
    spotifyApi.setAccessToken(data.body["access_token"])

    const searchResults = await spotifyApi.searchTracks(query, { limit: 1 })
    const spotifyData = searchResults.body.tracks?.items[0]

    if (spotifyData) {
        cache.set(cacheKey, spotifyData)
    }

    return spotifyData
}

export async function updateSongInfo(songId: string) {
    const { data: song } = await supabase.from("songs").select("*").eq("id", songId).single()

    if (song) {
        const spotifyData = await getSpotifyData(song.title, song.artist)
        if (spotifyData) {
            const { error } = await supabase
                .from("songs")
                .update({
                    spotify_id: spotifyData.id,
                    jacket_url: spotifyData.album.images[0]?.url,
                })
                .eq("id", songId)

            if (error) console.error("Error updating song:", error)
        }
    }
}

export async function reportIncorrectImage(songId: string) {
    const { error } = await supabase.from("image_reports").insert({ song_id: songId, reported_at: new Date() })

    if (error) console.error("Error reporting image:", error)
    else {
        // Trigger a re-fetch of Spotify data
        await updateSongInfo(songId)
    }
}

