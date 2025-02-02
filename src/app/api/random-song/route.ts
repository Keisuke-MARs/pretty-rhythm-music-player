import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import SpotifyWebApi from "spotify-web-api-node"

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

export async function GET() {
    try {
        console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log("Supabase Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not Set")

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase environment variables")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        console.log("Creating Supabase client...")
        const supabase = createClient(supabaseUrl, supabaseKey)

        console.log("Fetching random song...")
        const { data: songs, error: supabaseError } = await supabase.from("songs").select("*")

        if (supabaseError) {
            console.error("Supabase error:", supabaseError)
            return NextResponse.json({ error: "Database error", details: supabaseError.message }, { status: 500 })
        }

        if (!songs || songs.length === 0) {
            return NextResponse.json({ error: "No songs found" }, { status: 404 })
        }

        const randomIndex = Math.floor(Math.random() * songs.length)
        const song = songs[randomIndex]

        try {
            const data = await spotifyApi.clientCredentialsGrant()
            spotifyApi.setAccessToken(data.body["access_token"])

            // Spotify API を使用して曲の情報を取得する
            const searchResults = await spotifyApi.searchTracks(`${song.title} ${song.artist}`)
            console.log("Spotify search results:", JSON.stringify(searchResults.body, null, 2))
            if (searchResults.body.tracks && searchResults.body.tracks.items.length > 0) {
                const trackInfo = searchResults.body.tracks.items[0]
                song.spotify_data = {
                    album_art: trackInfo.album.images[0]?.url || "/default-album-art.png",
                    preview_url: trackInfo.preview_url,
                    spotify_url: trackInfo.external_urls.spotify,
                    track_id: trackInfo.id, // 追加
                }
            } else {
                console.log("No Spotify track found for the song")
                song.spotify_data = {
                    album_art: "/default-album-art.png",
                    preview_url: null,
                    spotify_url: null,
                    track_id: null, // 追加
                }
            }
        } catch (spotifyError) {
            console.error("Spotify API error:", spotifyError)
            song.spotify_data = {
                album_art: "/default-album-art.png",
                preview_url: null,
                spotify_url: null,
                track_id: null, //追加
            }
        }
        console.log("Song data:", JSON.stringify(song, null, 2))
        return NextResponse.json(song)
    } catch (error) {
        console.error("Error in random-song API:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

