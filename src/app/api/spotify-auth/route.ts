import { NextResponse } from "next/server"
import SpotifyWebApi from "spotify-web-api-node"

const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/spotify-callback`

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
            scopes,
            state,
            authorizeURL,
        })

        return NextResponse.json({
            authorizeURL,
            debug: {
                redirectUri,
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

