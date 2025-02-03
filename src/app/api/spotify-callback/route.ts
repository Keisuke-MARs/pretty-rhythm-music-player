/* eslint-disable @typescript-eslint/no-unused-vars */
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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const state = searchParams.get("state")

    // デバッグ情報をログに出力
    const debugInfo = {
        url: request.url,
        redirectUri,
        code: code ? "受信" : "未受信",
        error,
        state,
        clientId: process.env.SPOTIFY_CLIENT_ID ? "設定済み" : "未設定",
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET ? "設定済み" : "未設定",
    }
    console.log("Callback Debug Info:", debugInfo)

    if (error) {
        console.error("Spotify auth error:", error)
        return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}?error=no_code`)
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code)
        const { access_token, refresh_token, expires_in } = data.body

        // アクセストークンをクッキーに保存
        const response = NextResponse.redirect(`${baseUrl}?auth=success`)

        response.cookies.set("spotify_access_token", access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: expires_in,
        })

        return response
    } catch (error) {
        console.error("Error in Spotify callback:", error)
        return NextResponse.redirect(
            `${baseUrl}?error=${encodeURIComponent(error instanceof Error ? error.message : "Authentication failed")}`,
        )
    }
}

