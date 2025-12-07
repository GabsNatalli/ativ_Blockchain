import React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import labLogo from '../assets/lab-logo.png'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const walletAddress = localStorage.getItem('walletAddress')
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  function handleLogout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('isAdmin')
    navigate('/')
  }

  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Desconectado'

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src={labLogo} alt="Laboratório de Redes" className="h-10 w-10" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Lab Redes</p>
            <p className="text-base font-medium text-white">Identidades e eventos on-chain</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
          <NavLink to="/home" className={({ isActive }) => (isActive ? 'text-cyan-200' : 'hover:text-white')}>
            Início
          </NavLink>
          <NavLink to="/historico" className={({ isActive }) => (isActive ? 'text-cyan-200' : 'hover:text-white')}>
            Meus eventos
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'text-cyan-200' : 'hover:text-white')}>
              Administração
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            {isAdmin ? 'Admin' : 'Identidade'}
          </span>
          <div className="text-right">
            <p className="text-xs text-slate-300">Carteira ativa</p>
            <p className="font-mono text-sm text-white" title={walletAddress || 'Nenhuma carteira conectada'}>
              {shortAddress}
            </p>
          </div>
          {location.pathname !== '/' && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-200 hover:text-cyan-200"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
