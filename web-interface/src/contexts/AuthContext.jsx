import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Cookies from 'js-cookie'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Configure axios defaults
  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    
    // Add response interceptor for token expiry
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout()
          toast.error('Сессия истекла. Войдите снова.')
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = Cookies.get('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get('/api/auth/check')
      if (response.data.valid) {
        setUser(response.data.user)
        setIsAuthenticated(true)
      } else {
        logout()
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      setLoading(true)
      const response = await axios.post('/api/auth/login', credentials)
      
      if (response.data.success) {
        const { token, user } = response.data
        
        // Store token in secure cookie
        Cookies.set('auth_token', token, { 
          expires: 1, // 1 day
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        
        // Set axios header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        setUser(user)
        setIsAuthenticated(true)
        
        toast.success(`Добро пожаловать, ${user.username}!`)
        return { success: true }
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка входа'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    // Remove token
    Cookies.remove('auth_token')
    delete axios.defaults.headers.common['Authorization']
    
    // Clear state
    setUser(null)
    setIsAuthenticated(false)
    
    toast.success('Вы вышли из системы')
  }

  const setupTwoFactor = async () => {
    try {
      const response = await axios.post('/api/auth/2fa/setup')
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка настройки 2FA'
      toast.error(message)
      throw error
    }
  }

  const verifyTwoFactor = async (token) => {
    try {
      const response = await axios.post('/api/auth/2fa/verify', { token })
      if (response.data.success) {
        toast.success('2FA успешно настроен')
        setUser(prev => ({ ...prev, totpEnabled: true }))
        return true
      }
      return false
    } catch (error) {
      const message = error.response?.data?.error || 'Неверный код'
      toast.error(message)
      return false
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    setupTwoFactor,
    verifyTwoFactor,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
