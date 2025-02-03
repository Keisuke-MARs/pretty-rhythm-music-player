import { createClient } from "@supabase/supabase-js"
import SpotifyWebApi from "spotify-web-api-node"
import NodeCache from "node-cache"
import type { SpotifyTrack, SpotifySearchResponse, SpotifyCredentials } from "@/types/spotify"

// Spotifyクライアントの初期化を関数化
const createSpotifyApi = () => {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error("Missing Spotify credentials:", {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
        })
        throw new Error("Spotify credentials not configured")
    }

    return new SpotifyWebApi({
        clientId,
        clientSecret,
    })
}

// Supabaseクライアントの初期化を関数化
const createSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials:", {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
        })
        throw new Error("Supabase credentials not configured")
    }

    return createClient(supabaseUrl, supabaseKey)
}

// キャッシュの初期化
const cache = new NodeCache({ stdTTL: 3600 })

export async function getSpotifyData(title: string, artist: string): Promise<SpotifyTrack | null> {
    try {
        const spotifyApi = createSpotifyApi()

        // Clean up the input data
        const cleanTitle = title.trim()
        const cleanArtist = artist.trim()

        const cacheKey = `${cleanTitle}-${cleanArtist}`
        const cachedData = cache.get<SpotifyTrack>(cacheKey)

        if (cachedData) {
            console.log("Cache hit for:", cacheKey)
            return cachedData
        }

        console.log("Cache miss for:", cacheKey)

        // Remove parentheses content and CV information
        const searchTitle = cleanTitle
            .replace(/$$.*?$$/g, "")
            .replace(/［.*?］/g, "")
            .trim()
        const searchArtist = cleanArtist
            .replace(/$$CV\..*?$$/g, "")
            .replace(/（CV\..*?）/g, "")
            .replace(/$$C\.V\..*?$$/g, "")
            .split("・")[0]
            .trim()

        console.log("Requesting Spotify credentials...")
        const data = (await spotifyApi.clientCredentialsGrant()) as SpotifyCredentials
        console.log("Received Spotify credentials")

        spotifyApi.setAccessToken(data.body.access_token)

        const query = `track:"${searchTitle}" artist:"${searchArtist}"`
        console.log("Searching Spotify with query:", query)

        const searchResults = (await spotifyApi.searchTracks(query, { limit: 5 })) as SpotifySearchResponse
        console.log(`Found ${searchResults.body.tracks?.items.length || 0} results from Spotify`)

        if (!searchResults.body.tracks?.items.length) {
            console.log("No results found, trying lenient search...")
            const lenientQuery = searchTitle
            const lenientResults = await spotifyApi.searchTracks(lenientQuery, { limit: 5 })

            const bestMatch = lenientResults.body.tracks?.items.find(
                (track) =>
                    track.name.toLowerCase().includes(searchTitle.toLowerCase()) ||
                    searchTitle.toLowerCase().includes(track.name.toLowerCase()),
            ) as SpotifyTrack | undefined

            if (bestMatch && bestMatch.artists.length > 0) {
                console.log("Found match with lenient search:", {
                    title: bestMatch.name,
                    artist: bestMatch.artists[0].name,
                })
                cache.set(cacheKey, bestMatch)
                return bestMatch
            }
        }

        const spotifyData = searchResults.body.tracks?.items[0] || null

        if (spotifyData) {
            console.log("Found exact match:", {
                title: spotifyData.name,
                artist: spotifyData.artists[0].name,
            })
            cache.set(cacheKey, spotifyData)
        } else {
            console.log("No matches found for:", { searchTitle, searchArtist })
        }

        return spotifyData
    } catch (error) {
        console.error("Error in getSpotifyData:", {
            error: error instanceof Error ? error.message : "Unknown error",
            title,
            artist,
        })
        return null
    }
}

export async function updateSongInfo(songId: string): Promise<void> {
    const supabase = createSupabaseClient()

    try {
        console.log("Fetching song from Supabase:", songId)
        const { data: song, error: selectError } = await supabase.from("songs").select("*").eq("id", songId).single()

        if (selectError) {
            console.error("Error fetching song:", {
                error: selectError,
                songId,
            })
            return
        }

        if (!song) {
            console.error("No song found with id:", songId)
            return
        }

        console.log("Fetching Spotify data for song:", {
            title: song.title,
            artist: song.artist,
        })

        const spotifyData = await getSpotifyData(song.title, song.artist)
        if (spotifyData) {
            console.log("Updating song with Spotify data:", {
                songId,
                spotifyId: spotifyData.id,
            })

            const { error: updateError } = await supabase
                .from("songs")
                .update({
                    spotify_id: spotifyData.id,
                    jacket_url: spotifyData.album.images[0]?.url,
                    title: song.title.trim(),
                    artist: song.artist.trim(),
                })
                .eq("id", songId)

            if (updateError) {
                console.error("Error updating song:", {
                    error: updateError,
                    songId,
                    spotifyId: spotifyData.id,
                })
            } else {
                console.log("Successfully updated song:", songId)
            }
        } else {
            console.log("No Spotify data found for song:", {
                title: song.title,
                artist: song.artist,
            })
        }
    } catch (error) {
        console.error("Error in updateSongInfo:", {
            error: error instanceof Error ? error.message : "Unknown error",
            songId,
        })
    }
}

