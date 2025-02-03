/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import SpotifyPlayer from "react-spotify-web-playback"
import { motion, AnimatePresence } from "framer-motion"
import VanillaTilt from "vanilla-tilt"

interface Song {
  id: string
  title: string
  artist: string
  work: string
  spotify_data?: {
    album_art: string
    preview_url: string | null
    spotify_url: string | null
    track_id: string | null
  }
}

const LoadingAnimation = () => (
  <motion.div
    className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-200 to-purple-300 p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="w-20 h-20 border-4 border-purple-500 rounded-full"
      animate={{
        rotate: 360,
        borderRadius: ["50%", "25%", "50%"],
      }}
      transition={{
        duration: 2,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    />
    <motion.p
      className="mt-4 text-xl font-semibold text-purple-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      Loading...
    </motion.p>
  </motion.div>
)

export default function Home() {
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const albumArtRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cardRef.current) {
      VanillaTilt.init(cardRef.current, {
        max: 5,
        speed: 400,
        glare: true,
        "max-glare": 0.2,
      })
    }

    if (albumArtRef.current) {
      VanillaTilt.init(albumArtRef.current, {
        max: 15,
        speed: 400,
        scale: 1.05,
        glare: true,
        "max-glare": 0.3,
      })
    }

    return () => {
      if (cardRef.current && (cardRef.current as any).vanillaTilt) {
        ; (cardRef.current as any).vanillaTilt.destroy()
      }
      if (albumArtRef.current && (albumArtRef.current as any).vanillaTilt) {
        ; (albumArtRef.current as any).vanillaTilt.destroy()
      }
    }
  }, [])

  const fetchRandomSong = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/random-song")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }
      const data: Song = await res.json()
      setSong(data)
    } catch (error: unknown) {
      console.error("Error fetching random song:", error)
      setSong(null)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("An unknown error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const initiateSpotifyAuth = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL
      const response = await fetch(`${baseUrl}/api/spotify-auth`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.authorizeURL) {
        throw new Error("No authorization URL received")
      }

      window.location.href = data.authorizeURL
    } catch (error) {
      console.error("Error initiating Spotify auth:", error)
      setError(error instanceof Error ? error.message : "Failed to initiate Spotify authentication")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRandomSong()

    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL
    const urlParams = new URLSearchParams(window.location.search)
    const authStatus = urlParams.get("auth")
    const errorParam = urlParams.get("error")

    if (authStatus === "success") {
      setIsAuthenticated(true)
      fetchAccessToken()
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [fetchRandomSong])

  const fetchAccessToken = async () => {
    try {
      const response = await fetch("/api/spotify-token")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.access_token) {
        setAccessToken(data.access_token)
        checkUserPremiumStatus(data.access_token)
      } else {
        throw new Error("No access token received")
      }
    } catch (error) {
      console.error("Error fetching access token:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch access token")
      setIsAuthenticated(false)
    }
  }

  const checkUserPremiumStatus = async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      setIsPremium(data.product === "premium")
    } catch (error) {
      console.error("Error checking premium status:", error)
    }
  }

  if (isLoading) return <LoadingAnimation />
  if (error)
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen text-purple-900 bg-gradient-to-br from-pink-200 to-purple-300 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
        <p className="text-lg mb-4">{error}</p>
        <motion.button
          onClick={() => {
            setError(null)
            fetchRandomSong()
          }}
          className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          再試行
        </motion.button>
      </motion.div>
    )
  if (!song)
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen text-purple-900 bg-gradient-to-br from-pink-200 to-purple-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        No song found
      </motion.div>
    )

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-200 to-purple-300 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={cardRef}
        className="w-full max-w-md bg-white bg-opacity-30 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl p-6 md:p-8 lg:p-10 border border-pink-200 border-opacity-50"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="mb-6 md:mb-8"
          key={song.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            ref={albumArtRef}
            className="relative w-48 h-48 md:w-64 md:h-64 mx-auto album-art-container overflow-hidden rounded-full"
          >
            <Image
              src={song.spotify_data?.album_art || "/default-album-art.png"}
              alt={`Album art for ${song.title} by ${song.artist}`}
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
        </motion.div>
        <motion.div
          className="text-center mb-6 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-purple-900">{song.title}</h2>
          <p className="text-lg mb-1 text-purple-800">{song.artist}</p>
          <p className="text-sm mb-3 text-purple-700">{song.work}</p>
        </motion.div>
        <motion.div
          className="flex justify-center space-x-4 mb-6 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={fetchRandomSong}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-colors"
            aria-label="Get random song"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6 md:w-8 md:h-8 text-purple-800"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </motion.button>
        </motion.div>
        <AnimatePresence mode="wait">
          {isAuthenticated ? (
            isPremium && song.spotify_data?.track_id ? (
              <motion.div
                key="spotify-player"
                className="mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <SpotifyPlayer
                  token={accessToken}
                  uris={[`spotify:track:${song.spotify_data.track_id}`]}
                  autoPlay={false}
                  styles={{
                    activeColor: "#fff",
                    bgColor: "#1db954",
                    color: "#fff",
                    loaderColor: "#fff",
                    sliderColor: "#fff",
                    trackArtistColor: "#ccc",
                    trackNameColor: "#fff",
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="open-spotify"
                className="mt-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <motion.a
                  href={song.spotify_data?.spotify_url || "https://www.spotify.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-pink-400 hover:bg-pink-500 text-white px-6 py-3 rounded-full transition-colors text-sm md:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Open in Spotify
                </motion.a>
                <motion.p
                  className="text-sm md:text-base text-purple-900 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {isPremium ? "再生できない楽曲です" : "再生にはSpotify Premiumが必要です"}
                </motion.p>
              </motion.div>
            )
          ) : (
            <motion.div
              key="connect-spotify"
              className="mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <motion.button
                onClick={initiateSpotifyAuth}
                className="w-full bg-pink-400 hover:bg-pink-500 text-white px-6 py-3 rounded-full transition-colors text-sm md:text-base"
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? "Connecting..." : "Connect Spotify"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

