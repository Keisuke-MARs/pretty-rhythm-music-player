import { createClient } from "@supabase/supabase-js"
import SpotifyWebApi from "spotify-web-api-node"
import NodeCache from "node-cache"
import type { SpotifyTrack, SpotifySearchResponse } from "@/types/spotify"
import type { Database } from "@/types/database"

const createSpotifyApi = (): SpotifyWebApi => {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error("Missing Spotify credentials")
        throw new Error("Spotify credentials not configured")
    }

    return new SpotifyWebApi({
        clientId,
        clientSecret,
    })
}

const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const cache = new NodeCache({ stdTTL: 3600 })

export async function getSpotifyData(title: string, artist: string, trackId?: string): Promise<SpotifyTrack | null> {
    try {
        const cacheKey = trackId ? `track-${trackId}` : `${title}-${artist}`
        const cachedData = cache.get<SpotifyTrack>(cacheKey)

        if (cachedData) {
            console.log("Cache hit for:", cacheKey)
            return cachedData
        }

        console.log("Cache miss for:", cacheKey)

        const spotifyApi = createSpotifyApi()
        const credentials = await spotifyApi.clientCredentialsGrant()
        spotifyApi.setAccessToken(credentials.body.access_token)

        let track: SpotifyTrack | null = null

        if (trackId) {
            const response = await spotifyApi.getTrack(trackId)
            track = response.body as unknown as SpotifyTrack // 型アサーションを追加
        } else {
            const searchTitle = title
                .replace(/$$.*?$$/g, "")
                .replace(/［.*?］/g, "")
                .trim()
            const searchArtist = artist
                .replace(/$$CV\..*?$$/g, "")
                .replace(/（CV\..*?）/g, "")
                .replace(/$$C\.V\..*?$$/g, "")
                .split("・")[0]
                .trim()

            const query = `track:"${searchTitle}" artist:"${searchArtist}"`
            console.log("Searching Spotify with query:", query)

            const searchResults = (await spotifyApi.searchTracks(query, { limit: 1 })) as SpotifySearchResponse
            track = searchResults.body.tracks?.items[0] || null
        }

        if (track) {
            console.log("Found Spotify data for:", track.name)
            cache.set(cacheKey, track)
        } else {
            console.log("No Spotify data found for:", title, artist)
        }

        return track
    } catch (error) {
        console.error("Error in getSpotifyData:", error)
        return null
    }
}

export async function updateSongInfo(songId: string): Promise<void> {
    try {
        console.log("Fetching song from database:", songId)
        const { data: song, error: selectError } = await supabase.from("songs").select("*").eq("id", songId).single()

        if (selectError || !song) {
            console.error("Error fetching song:", selectError)
            return
        }

        const trackData = await getSpotifyData(song.title, song.artist, song.spotify_track_id)
        if (trackData) {
            console.log("Updating song with Spotify data:", {
                songId,
                trackId: trackData.id,
            })

            const { error: updateError } = await supabase
                .from("songs")
                .update({
                    jacket_url: trackData.album.images[0]?.url,
                    spotify_track_id: trackData.id,
                })
                .eq("id", songId)

            if (updateError) {
                console.error("Error updating song:", updateError)
            } else {
                console.log("Successfully updated song:", songId)
            }
        } else {
            console.log("No Spotify data found for song:", song.title, song.artist)
        }
    } catch (error) {
        console.error("Error in updateSongInfo:", error)
    }
}

