import React, { useState } from 'react'
import { Eye, EyeOff, Smartphone, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    totp: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('credentials') // 'credentials' or '2fa'

  const { login } = useAuth()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(formData)
      
      if (!result.success && result.error?.includes('TOTP')) {
        setStep('2fa')
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTotpSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(formData)
    } catch (error) {
      console.error('2FA error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            iPhone 15 Pro Max
          </h2>
          <p className="text-gray-400 mt-2">
            Streaming Control Panel
          </p>
        </div>

        {/* Login Form */}
        <div className="card p-8">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Имя пользователя
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Введите имя пользователя"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-10"
                    placeholder="Введите пароль"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center"
              >
                {loading ? (
                  <div className="loading-spinner w-5 h-5"></div>
                ) : (
                  'Войти'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit} className="space-y-6">
              <div className="text-center">
                <Shield className="mx-auto w-12 h-12 text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Двухфакторная аутентификация
                </h3>
                <p className="text-gray-400 text-sm">
                  Введите 6-значный код из приложения аутентификатора
                </p>
              </div>

              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-gray-300 mb-2">
                  Код аутентификатора
                </label>
                <input
                  id="totp"
                  name="totp"
                  type="text"
                  required
                  maxLength="6"
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="000000"
                  value={formData.totp}
                  onChange={handleInputChange}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="flex-1 btn-secondary"
                  disabled={loading}
                >
                  Назад
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center"
                >
                  {loading ? (
                    <div className="loading-spinner w-5 h-5"></div>
                  ) : (
                    'Подтвердить'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Учетные данные по умолчанию:</p>
          <p className="font-mono">admin / admin123</p>
          <p className="mt-2 text-xs">
            Измените пароль после первого входа
          </p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="text-center text-gray-500 text-xs">
          <details className="cursor-pointer">
            <summary className="hover:text-gray-400">Горячие клавиши</summary>
            <div className="mt-2 space-y-1">
              <p><kbd className="px-1 py-0.5 bg-gray-800 rounded">Space</kbd> - Воспроизведение/Пауза DVR</p>
              <p><kbd className="px-1 py-0.5 bg-gray-800 rounded">←/→</kbd> - Покадровая навигация</p>
              <p><kbd className="px-1 py-0.5 bg-gray-800 rounded">L</kbd> - Переход к Live</p>
              <p><kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl+F</kbd> - Полноэкранный режим</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
