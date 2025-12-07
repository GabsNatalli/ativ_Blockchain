import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Historico from './pages/Historico'
import AdminDashboard from './pages/AdminDashboard'
import Header from './components/Header'
import Footer from './components/Footer'

function isAuthenticated() {
  return Boolean(localStorage.getItem('authToken') && localStorage.getItem('walletAddress'))
}

function Protected({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return children
}

function AdminProtected({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  if (!isAdmin) {
    return <Navigate to="/home" replace />
  }
  return children
}

function Layout() {
  return (
    <div className="app-shell">
      <div className="app-shell__background" aria-hidden="true">
        <div className="app-shell__wallpaper" />
        <div className="app-shell__gradient" />
        <div className="app-shell__grid" />
      </div>
      <Header />
      <main className="app-shell__content">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/historico" element={<Historico />} />
        </Route>
        <Route
          element={
            <AdminProtected>
              <Layout />
            </AdminProtected>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
