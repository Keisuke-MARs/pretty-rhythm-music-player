"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

interface Song {
  id: string
  title: string
  artist: string
  work: string
  spotify_data?: {
    album_art: string
    preview_url: string | null
    spotify_url: string | null
  }
}

export default function Home() {
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const fetchRandomSong = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/random-song")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP errpr! status:${res.status}`)
      }
      const data: Song = await res.json()
      setSong(data)
      if (audio) {
        audio.pause()
        setIsPlaying(false)
      }
      if (data.spotify_data?.preview_url) {
        const newAudio = new Audio(data.spotify_data.preview_url)
        newAudio.addEventListener("ended", () => setIsPlaying(false))
        setAudio(null)
      }
    } catch (error: unknown) {
      console.error("Error fetching random song:", error)
      setSong(null)
      setAudio(null)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("An unknown error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }, [audio])

  const togglePlay = useCallback(() => {
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsLoading(!isPlaying)
    }
  }, [audio, isPlaying])

  useEffect(() => {
    fetchRandomSong()
    return () => {
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    }
  }, [fetchRandomSong, audio])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error:{error}</div>
  if (!song) return <div>No song found</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-80 bg-white rounded-3xl shadow-xl p-6">
        <div className="mb-4">
          <div className="relative w-64 h-64 mx-auto">
            <Image
              src={song.spotify_data?.album_art || "/default-album-art.png"}
              alt={`Album art for ${song.title} by ${song.artist}`}
              layout="fill"
              objectFit="cover"
              className="rounded-full animate-spin-slow"
              style={{ animationPlayState: isPlaying ? "running" : "paused" }}
            />
          </div>
        </div>
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{song.title}</h2>
          <p className="text-gray-600">{song.artist}</p>
          <p className="text-gray-400 text-sm">{song.work}</p>
          {song.spotify_data?.spotify_url && (
            <a
              href={song.spotify_data.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Listen on Spotify
            </a>
          )}
        </div>
        <div className="flex justify-center space-x-4">
          <button onClick={fetchRandomSong}
            className="bg-gray-200 rounded-full p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button onClick={togglePlay} className="bg-pink-500 text-white rounded-full p-2" disabled={!audio}>
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}