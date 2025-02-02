import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("spotify_access_token")

    if (!accessToken) {
        return NextResponse.json({ error: "No access token found" }, { status: 401 })
    }

    return NextResponse.json({ access_token: accessToken.value })
}

