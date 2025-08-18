import React, { useEffect, useRef, useState } from 'react'
import flvjs from 'flv.js'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import { useStream } from '../contexts/StreamContext'
import toast from 'react-hot-toast'

export default function LivePlayer() {
  const videoRef = useRef(null)
  const flvPlayerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const { activeStream, livePlayerRef, videoFilters } = useStream()

  useEffect(() => {
    livePlayerRef.current = videoRef.current
  }, [livePlayerRef])

  useEffect(() => {
    if (!activeStream || !videoRef.current) return

    initializePlayer()

    return () => {
      destroyPlayer()
    }
  }, [activeStream])

  // Apply video filters
  useEffect(() => {
    if (videoRef.current) {
      const { brightness, contrast, saturation } = videoFilters
      videoRef.current.style.filter = `
        brightness(${1 + brightness}) 
        contrast(${contrast}) 
        saturate(${saturation})
      `
    }
  }, [videoFilters])

  const initializePlayer = () => {
    if (!flvjs.isSupported()) {
      setError('FLV.js не поддерживается в этом браузере')
      return
    }

    destroyPlayer()
    setError(null)
    setLoading(true)

    const flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: `/live/${activeStream.app}/${activeStream.stream}.flv`,
      isLive: true,
      hasAudio: true,
      hasVideo: true,
      cors: true
    }, {
      enableWorker: false,
      enableStashBuffer: false,
      stashInitialSize: 128,
      autoCleanupSourceBuffer: true,
      autoCleanupMaxBackwardDuration: 30,
      autoCleanupMinBackwardDuration: 10,
      fixAudioTimestampGap: true,
      accurateSeek: false,
      seekType: 'range',
      seekParamStart: 'bstart',
      seekParamEnd: 'bend',
      rangeLoadZeroStart: false,
      lazyLoad: false,
      lazyLoadMaxDuration: 3 * 60,
      lazyLoadRecoverDuration: 30,
      deferLoadAfterSourceOpen: true,
      autoCleanupSourceBuffer: true,
      reuseRedirectedURL: false
    })

    flvPlayer.attachMediaElement(videoRef.current)

    flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
      setLoading(false)
    })

    flvPlayer.on(flvjs.Events.RECOVERED_EARLY_EOF, () => {
      console.log('Recovered from early EOF')
    })

    flvPlayer.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
      console.error('FLV Player Error:', errorType, errorDetail, errorInfo)
      setError(`Ошибка воспроизведения: ${errorDetail}`)
      setLoading(false)
    })

    flvPlayer.on(flvjs.Events.MEDIA_INFO, (mediaInfo) => {
      console.log('Media Info:', mediaInfo)
    })

    try {
      flvPlayer.load()
      flvPlayerRef.current = flvPlayer
    } catch (err) {
      console.error('Failed to load FLV player:', err)
      setError('Не удалось загрузить плеер')
      setLoading(false)
    }
  }

  const destroyPlayer = () => {
    if (flvPlayerRef.current) {
      try {
        flvPlayerRef.current.pause()
        flvPlayerRef.current.unload()
        flvPlayerRef.current.detachMediaElement()
        flvPlayerRef.current.destroy()
      } catch (err) {
        console.error('Error destroying player:', err)
      }
      flvPlayerRef.current = null
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(err => {
        console.error('Play failed:', err)
        toast.error('Не удалось воспроизвести поток')
      })
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return

    if (isMuted) {
      videoRef.current.volume = volume
      setIsMuted(false)
    } else {
      videoRef.current.volume = 0
      setIsMuted(true)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen failed:', err)
      })
    }
  }

  const handleVideoEvents = () => {
    if (!videoRef.current) return

    const video = videoRef.current

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadStart = () => setLoading(true)
    const handleCanPlay = () => setLoading(false)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }

  useEffect(() => {
    return handleVideoEvents()
  }, [])

  if (error) {
    return (
      <div className="player-container aspect-video flex items-center justify-center bg-gray-800">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 mb-2">Ошибка воспроизведения</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button 
            onClick={initializePlayer}
            className="btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="player-container aspect-video group">
      <video
        ref={videoRef}
        className="video-player"
        muted={isMuted}
        playsInline
        controls={false}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      )}

      {/* Video Controls */}
      <div className="video-controls opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 slider"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/80">LIVE</span>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
