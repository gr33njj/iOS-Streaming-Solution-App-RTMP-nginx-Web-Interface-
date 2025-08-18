import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const StreamContext = createContext()

export function useStream() {
  const context = useContext(StreamContext)
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider')
  }
  return context
}

export function StreamProvider({ children }) {
  // Stream state
  const [streams, setStreams] = useState([])
  const [activeStream, setActiveStream] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [streamStats, setStreamStats] = useState({
    bitrate: 0,
    fps: 0,
    resolution: '',
    duration: 0,
    viewers: 0
  })

  // DVR state
  const [dvrEnabled, setDvrEnabled] = useState(true)
  const [dvrPosition, setDvrPosition] = useState(0)
  const [dvrDuration, setDvrDuration] = useState(900) // 15 minutes in seconds
  const [isDvrPlaying, setIsDvrPlaying] = useState(false)

  // Video filters
  const [videoFilters, setVideoFilters] = useState({
    brightness: 0,
    contrast: 1,
    saturation: 1,
    sharpness: 0
  })

  // Refs for players
  const livePlayerRef = useRef(null)
  const dvrPlayerRef = useRef(null)

  // Auto-refresh stream list
  useEffect(() => {
    const interval = setInterval(fetchStreams, 5000)
    fetchStreams()
    
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh stats when stream is active
  useEffect(() => {
    if (!activeStream) return

    const interval = setInterval(fetchStreamStats, 2000)
    fetchStreamStats()
    
    return () => clearInterval(interval)
  }, [activeStream])

  const fetchStreams = async () => {
    try {
      const response = await axios.get('/api/streams')
      setStreams(response.data.streams || [])
      
      // Auto-select first stream if none selected
      if (!activeStream && response.data.streams.length > 0) {
        setActiveStream(response.data.streams[0])
      }
    } catch (error) {
      console.error('Failed to fetch streams:', error)
    }
  }

  const fetchStreamStats = async () => {
    if (!activeStream) return

    try {
      const response = await axios.get(`/api/streams/${activeStream.id}/stats`)
      setStreamStats(response.data)
      setIsLive(response.data.isLive)
    } catch (error) {
      console.error('Failed to fetch stream stats:', error)
      setIsLive(false)
    }
  }

  const selectStream = (stream) => {
    setActiveStream(stream)
    setDvrPosition(0)
    setIsDvrPlaying(false)
    
    toast.success(`Переключено на поток: ${stream.name}`)
  }

  // DVR Controls
  const playDvr = () => {
    if (dvrPlayerRef.current) {
      dvrPlayerRef.current.play()
      setIsDvrPlaying(true)
    }
  }

  const pauseDvr = () => {
    if (dvrPlayerRef.current) {
      dvrPlayerRef.current.pause()
      setIsDvrPlaying(false)
    }
  }

  const seekDvr = (position) => {
    if (dvrPlayerRef.current) {
      dvrPlayerRef.current.currentTime = position
      setDvrPosition(position)
    }
  }

  const stepFrame = (direction) => {
    if (!dvrPlayerRef.current) return

    const frameRate = streamStats.fps || 30
    const frameTime = 1 / frameRate
    const newTime = Math.max(0, Math.min(dvrDuration, 
      dvrPlayerRef.current.currentTime + (direction * frameTime)
    ))
    
    seekDvr(newTime)
  }

  const goToLive = () => {
    setDvrPosition(dvrDuration)
    setIsDvrPlaying(false)
    
    if (livePlayerRef.current) {
      // Focus on live player
      livePlayerRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    
    toast.success('Переключено на live')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent shortcuts when typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          isDvrPlaying ? pauseDvr() : playDvr()
          break
        case 'ArrowLeft':
          event.preventDefault()
          stepFrame(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          stepFrame(1)
          break
        case 'KeyL':
          event.preventDefault()
          goToLive()
          break
        case 'KeyF':
          if (event.ctrlKey) {
            event.preventDefault()
            // Toggle fullscreen
            if (document.fullscreenElement) {
              document.exitFullscreen()
            } else {
              document.documentElement.requestFullscreen()
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isDvrPlaying])

  // Video filter functions
  const updateVideoFilter = (filter, value) => {
    setVideoFilters(prev => ({
      ...prev,
      [filter]: value
    }))
  }

  const resetVideoFilters = () => {
    setVideoFilters({
      brightness: 0,
      contrast: 1,
      saturation: 1,
      sharpness: 0
    })
  }

  // Get DVR segments for timeline
  const getDvrSegments = async () => {
    if (!activeStream) return []

    try {
      const response = await axios.get(`/api/dvr/${activeStream.id}/segments`)
      return response.data.segments || []
    } catch (error) {
      console.error('Failed to fetch DVR segments:', error)
      return []
    }
  }

  const value = {
    // Stream data
    streams,
    activeStream,
    isLive,
    streamStats,
    
    // Stream actions
    selectStream,
    fetchStreams,
    
    // DVR state
    dvrEnabled,
    dvrPosition,
    dvrDuration,
    isDvrPlaying,
    
    // DVR actions
    playDvr,
    pauseDvr,
    seekDvr,
    stepFrame,
    goToLive,
    getDvrSegments,
    
    // Video filters
    videoFilters,
    updateVideoFilter,
    resetVideoFilters,
    
    // Player refs
    livePlayerRef,
    dvrPlayerRef
  }

  return (
    <StreamContext.Provider value={value}>
      {children}
    </StreamContext.Provider>
  )
}
