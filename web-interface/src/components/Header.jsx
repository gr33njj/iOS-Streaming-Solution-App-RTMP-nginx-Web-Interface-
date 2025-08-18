import React from 'react'
import { LogOut, Settings, Smartphone, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useStream } from '../contexts/StreamContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { isLive, streamStats, activeStream } = useStream()

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      logout()
    }
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                iPhone 15 Pro Max
              </h1>
              <p className="text-xs text-gray-400">
                Streaming Control Panel
              </p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isLive ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                {isLive ? 'Подключено' : 'Отключено'}
              </span>
            </div>

            {/* Stream Info */}
            {activeStream && (
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-300">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Поток:</span>
                  <span className="font-medium">{activeStream.name}</span>
                </div>
                
                {isLive && (
                  <>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">FPS:</span>
                      <span className="font-mono">{streamStats.fps || 0}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">Битрейт:</span>
                      <span className="font-mono">
                        {streamStats.bitrate ? `${(streamStats.bitrate / 1000000).toFixed(1)} Mbps` : '0 Mbps'}
                      </span>
                    </div>
                    
                    {streamStats.resolution && (
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400">Разрешение:</span>
                        <span className="font-mono">{streamStats.resolution}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Live Indicator */}
            {isLive && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-medium text-sm">В ЭФИРЕ</span>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Настройки"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Status Bar */}
      <div className="md:hidden bg-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {activeStream && (
              <span className="text-gray-300">
                {activeStream.name}
              </span>
            )}
            
            {isLive && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">
                  {streamStats.fps || 0} FPS
                </span>
                <span className="text-gray-400">
                  {streamStats.bitrate ? `${(streamStats.bitrate / 1000000).toFixed(1)} Mbps` : '0 Mbps'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isLive ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
