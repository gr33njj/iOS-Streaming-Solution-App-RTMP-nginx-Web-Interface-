import React from 'react'
import Header from './Header'
import LivePlayer from './LivePlayer'
import DVRPlayer from './DVRPlayer'
import Timeline from './Timeline'
import ControlPanel from './ControlPanel'
import StreamSelector from './StreamSelector'
import VideoFilters from './VideoFilters'
import StreamStats from './StreamStats'
import { useStream } from '../contexts/StreamContext'

export default function StreamingInterface() {
  const { activeStream, isLive } = useStream()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Stream Selection */}
        <div className="mb-6">
          <StreamSelector />
        </div>

        {activeStream ? (
          <>
            {/* Main Video Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Live Player */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Live Stream</h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className="text-sm text-gray-400">
                      {isLive ? 'В эфире' : 'Офлайн'}
                    </span>
                  </div>
                </div>
                <LivePlayer />
                <StreamStats />
              </div>

              {/* DVR Player */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">DVR Playback</h2>
                  <span className="text-sm text-gray-400">
                    Последние 15 минут
                  </span>
                </div>
                <DVRPlayer />
                <ControlPanel />
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-6">
              <Timeline />
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Video Filters */}
              <VideoFilters />

              {/* Additional Controls */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Дополнительные настройки</h3>
                
                <div className="space-y-4">
                  {/* Quality Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Качество Live потока
                    </label>
                    <select className="input-field">
                      <option value="auto">Автоматически</option>
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="480p">480p</option>
                    </select>
                  </div>

                  {/* Audio Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Громкость
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="100"
                      className="slider"
                    />
                  </div>

                  {/* DVR Settings */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">
                      Автоматический DVR
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Performance Mode */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">
                      Режим производительности
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Stream Selected */
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Нет активных потоков
            </h3>
            <p className="text-gray-500">
              Начните стриминг с iPhone 15 Pro Max для просмотра
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
