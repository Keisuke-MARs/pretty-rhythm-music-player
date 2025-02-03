import { NextResponse } from "next/server"
import SpotifyWebApi from "spotify-web-api-node"

// Remove trailing slashes from base URL if present
const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, "")
const redirectUri = `${baseUrl}/api/spotify-callback`

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
        const debugInfo = {
            clientId: process.env.SPOTIFY_CLIENT_ID ? "設定済み" : "未設定",
            redirectUri,
            baseUrl,
            scopes,
            state,
            authorizeURL,
        }
        console.log("Auth Debug Info:", debugInfo)

        return NextResponse.json({
            authorizeURL,
            debug: debugInfo,
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

