/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server"
import SpotifyWebApi from "spotify-web-api-node"

const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/spotify-callback`

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
    console.log({
        url: request.url,
        redirectUri,
        code: code ? "受信" : "未受信",
        error,
        state,
        clientId: process.env.SPOTIFY_CLIENT_ID ? "設定済み" : "未設定",
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET ? "設定済み" : "未設定",
    })

    if (error) {
        console.error("Spotify auth error:", error)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}?error=no_code`)
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code)
        const { access_token, refresh_token, expires_in } = data.body

        // アクセストークンをクッキーに保存
        const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}?auth=success`)

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
            `${process.env.NEXT_PUBLIC_BASE_URL}?error=${encodeURIComponent(
                error instanceof Error ? error.message : "Authentication failed",
            )}`,
        )
    }
}

