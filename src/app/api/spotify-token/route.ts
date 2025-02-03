import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
    const cookieStore = cookies()
    const accessToken = (await cookieStore).get("spotify_access_token")

    if (!accessToken) {
        console.error("No access token found in cookies")
        return NextResponse.json({ error: "No access token found" }, { status: 401 })
    }

    // トークンの有効期限をチェック（例: 1時間）
    const tokenExpiry = (await cookieStore).get("spotify_token_expiry")
    if (tokenExpiry && Date.now() > Number.parseInt(tokenExpiry.value)) {
        console.error("Access token has expired")
        return NextResponse.json({ error: "Access token has expired" }, { status: 401 })
    }

    return NextResponse.json({ access_token: accessToken.value })
}

