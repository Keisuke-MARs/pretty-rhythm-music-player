'use client'

import { useState, useEffect } from "react"
import Image from "next/image"

interface Song {
  id: string
  title: string
  artist: string
  album: string
  jacket_url: string
  work: string
  preview_url: string
}

export default function Home() {
  const [song, setSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const fetchRandomSong = async () => {
    const res = await fetch("/api/random-song")
    const data = await res.json()
    setSong(data)
    if (audio) {
      audio.pause()
      setIsPlaying(false)
    }
    setAudio(new Audio(data.preview_url))
  }

  const togglePlay = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  useEffect(() => {
    fetchRandomSong()
  }, [])

  if (!song) return <div>Loading...</div>

  return (
    <div className="flex items-center judtify-center min-h-screen bg-gray-100">
      <div className="w-64 bg-white round-3xl shadow-xl p-6">
        <div className="mb-4">
          <div className="relative w-48 h-48 mx-auto">
            <Image
              src={song.jacket_url || "/placehplder.svg"}
              alt={song.title}
              layout="fill"
              className="rounded-full animate-apin-slow"
              style={{ animationPlayState: isPlaying ? "running" : "paused" }} />
          </div>
        </div>
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{song.title}</h2>
          <p className="text-gray-600">{song.artist}</p>
          <p className="text-gray-400 text-sm">{song.work}</p>
        </div>
        <div className="flex justify-center space-x-4">
          <button onClick={fetchRandomSong} className="bg-gray-200 rounded-full p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </button>
          <button onClick={togglePlay} className="bg-pink-500 text-white rounded-full p-2">
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