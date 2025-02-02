import { NextResponse } from "next/server"
import SpotifyWebApi from "spotify-web-api-node"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
// Fix the double slash issue by ensuring proper URL joining
const redirectUri = new URL("/api/spotify-callback", baseUrl).toString()

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: redirectUri,
})

export async function GET() {
    try {
        const scopes = ["streaming", "user-read-email", "user-read-private"]
        const state = Math.random().toString(36).substring(7)
        const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state)

        // デバッグ情報をログに出力
        console.log({
            clientId: process.env.SPOTIFY_CLIENT_ID ? "設定済み" : "未設定",
            redirectUri,
            baseUrl,
            scopes,
            state,
            authorizeURL,
        })

        return NextResponse.json({
            authorizeURL,
            debug: {
                redirectUri,
                baseUrl,
                scopes,
                state,
            },
        })
    } catch (error) {
        console.error("Spotify auth error:", error)
        return NextResponse.json(
            {
                error: "Failed to create authorization URL",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            {
                status: 500,
            },
        )
    }
}

