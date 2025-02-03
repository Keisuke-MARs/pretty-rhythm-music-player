import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSpotifyData, updateSongInfo } from "@/lib/spotify-utils"
import type { SpotifyTrack } from "@/types/spotify"

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
            const spotifyData = (await getSpotifyData(song.title, song.artist)) as SpotifyTrack
            if (spotifyData) {
                song.spotify_data = {
                    album_art: spotifyData.album.images[0]?.url || "/default-album-art.png",
                    preview_url: spotifyData.preview_url,
                    spotify_url: spotifyData.external_urls.spotify,
                    track_id: spotifyData.id,
                }
                // Update the song info in the background
                updateSongInfo(song.id).catch(console.error)
            } else {
                throw new Error("No Spotify data found")
            }
        } catch (spotifyError) {
            console.error("Spotify API error:", spotifyError)
            song.spotify_data = {
                album_art: song.jacket_url || "/default-album-art.png",
                preview_url: null,
                spotify_url: null,
                track_id: null,
            }
        }
        console.log("Song data:", JSON.stringify(song, null, 2))
        return NextResponse.json(song)
    } catch (error) {
        console.error("Error in random-song API:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

