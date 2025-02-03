import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getSpotifyData } from "@/lib/spotify-utils"

export async function GET() {
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase environment variables")
        }

        const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

        const { data: songs, error: supabaseError } = await supabase.from("songs").select("*")

        if (supabaseError) {
            console.error("Database error:", supabaseError)
            return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        if (!songs || songs.length === 0) {
            return NextResponse.json({ error: "No songs found" }, { status: 404 })
        }

        const randomIndex = Math.floor(Math.random() * songs.length)
        const song = songs[randomIndex]

        try {
            const spotifyData = await getSpotifyData(song.title, song.artist, song.spotify_track_id)
            if (spotifyData) {
                song.spotify_data = {
                    album_art: spotifyData.album.images[0]?.url || "/default-album-art.png",
                    preview_url: spotifyData.preview_url,
                    spotify_url: spotifyData.external_urls.spotify,
                    track_id: spotifyData.id,
                }
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

        return NextResponse.json(song)
    } catch (error) {
        console.error("Error in random-song API:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

