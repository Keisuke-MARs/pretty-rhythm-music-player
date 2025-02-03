/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server"
import SpotifyWebApi from "spotify-web-api-node"

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

    if (error) {
        console.error("Spotify auth error:", error)
        return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
        console.error("No code received from Spotify")
        return NextResponse.redirect(`${baseUrl}?error=no_code`)
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code)
        const { access_token, refresh_token, expires_in } = data.body

        // リダイレクトレスポンスの作成
        const response = NextResponse.redirect(new URL("/?auth=success", baseUrl))

        // Cookieの設定
        response.cookies.set("spotify_access_token", access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: expires_in,
            path: "/",
        })

        if (refresh_token) {
            response.cookies.set("spotify_refresh_token", refresh_token, {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                maxAge: 30 * 24 * 60 * 60, // 30 days
                path: "/",
            })
        }

        return response
    } catch (error) {
        console.error("Error in Spotify callback:", error)
        const errorMessage = error instanceof Error ? error.message : "Authentication failed"
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorMessage)}`, baseUrl))
    }
}

