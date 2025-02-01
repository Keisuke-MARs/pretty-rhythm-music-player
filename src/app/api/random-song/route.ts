import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { spotifyApi } from "@/lib/spotify"

export async function GET() {
    try {
        // Supabaseからランダムな曲を取得
        const { data: song, error } = await supabase.from("songs").select("*").order("RANDOM()").limit(1).single()

        if (error) throw error

        // Spotify APIのアクセストークンを取得
        const data = await spotifyApi.clientCredentialsGrant()
        spotifyApi.setAccessToken(data.body["access_token"])

        // Spotifyから曲の情報を取得
        const trackData = await spotifyApi.searchTracks(`track:${song.title} artist:${song.artist}`)
        const track = trackData.body.tracks?.items[0]

        return NextResponse.json({
            ...song,
            preview_url: track?.preview_url,
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

