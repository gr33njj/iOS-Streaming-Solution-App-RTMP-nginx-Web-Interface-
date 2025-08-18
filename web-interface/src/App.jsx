import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { StreamProvider } from './contexts/StreamContext'
import LoginPage from './components/LoginPage'
import StreamingInterface from './components/StreamingInterface'
import { useAuth } from './contexts/AuthContext'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    )
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />
}

// Main App Router
function AppRouter() {
  const { isAuthenticated } = useAuth()
  
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" /> : <LoginPage />
          } 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <StreamingInterface />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <StreamProvider>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#374151',
                color: '#fff',
                border: '1px solid #4B5563',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </StreamProvider>
      </AuthProvider>
    </div>
  )
}

export default App
