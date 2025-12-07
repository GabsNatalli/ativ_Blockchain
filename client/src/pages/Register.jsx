import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import labLogo from '../assets/lab-logo.png'
import WalletHelper from '../components/WalletHelper'
import {
  connectWallet as connectWalletService,
  fetchIdentity,
  fetchIdentityByMatricula,
  detectExistingWalletConnection,
  registerIdentity,
} from '../services/blockchain'

function matchesRevert(err, errorName) {
  const sources = [
    err?.info?.error?.data?.errorName,
    err?.errorName,
    err?.shortMessage,
    err?.reason,
    err?.message,
  ]
  return sources.some((value) => typeof value === 'string' && value.includes(errorName))
}

export default function Register() {
  const vantaRef = useRef(null)
  const navigate = useNavigate()
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('')
  const [name, setName] = useState('')
  const [matricula, setMatricula] = useState('')
  const [curso, setCurso] = useState('Sistemas de Informação')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)
  const [hasWalletProvider, setHasWalletProvider] = useState(true)
  const [checkedExistingWallet, setCheckedExistingWallet] = useState(false)

  useEffect(() => {
    let vantaEffect
    let canceled = false

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`)
        if (existing) {
          if (existing.getAttribute('data-loaded') === 'true') {
            resolve()
            return
          }
          existing.addEventListener('load', resolve, { once: true })
          existing.addEventListener('error', reject, { once: true })
          return
        }

        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.setAttribute('data-loaded', 'false')
        script.onload = () => {
          script.setAttribute('data-loaded', 'true')
          resolve()
        }
        script.onerror = (event) => {
          script.remove()
          reject(event)
        }
        document.body.appendChild(script)
      })

    async function initVanta() {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.net.min.js')

        if (canceled || !vantaRef.current || !window.VANTA || !window.VANTA.NET) return

        vantaEffect = window.VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          backgroundColor: 0x0a3243,
          color: 0xffffff,
          points: 15.0,
          maxDistance: 16.0,
          spacing: 16.0,
        })
      } catch (err) {
        console.error('Erro ao inicializar animação Vanta:', err)
      }
    }

    initVanta()

    return () => {
      canceled = true
      if (vantaEffect) {
        vantaEffect.destroy()
      }
    }
  }, [])

  useEffect(() => {
    let canceled = false

    async function detectWallet() {
      try {
        const info = await detectExistingWalletConnection()
        if (canceled) return

        setHasWalletProvider(info.hasProvider)

        if (info.address) {
          setWalletAddress(info.address)
          setWalletType(info.type || 'injected')
          setMessage('Carteira já autorizada. Continue preenchendo os dados para registrar sua identidade.')
          return
        }

        if (info.hasProvider) {
          setMessage('Carteira detectada. Clique em conectar para reutilizar a autorização sem novos pop-ups.')
        } else {
          setMessage('MetaMask/Hardhat Wallet não detectada. Use a conta de laboratório ou instale uma extensão compatível.')
        }
      } catch (err) {
        if (!canceled) {
          console.warn('Não foi possível verificar carteira instalada.', err)
        }
      } finally {
        if (!canceled) {
          setCheckedExistingWallet(true)
        }
      }
    }

    detectWallet()

    return () => {
      canceled = true
    }
  }, [])

  async function connectWallet() {
    setError('')
    setMessage('')
    try {
      const { address, type } = await connectWalletService({ allowLabWallet: true })
      setWalletAddress(address)
      setWalletType(type)
      setMessage(
        type === 'lab'
          ? 'Carteira de laboratório conectada para testes. Preencha os dados para registrar sua identidade.'
          : 'Carteira conectada. Preencha os dados para registrar sua identidade.'
      )
    } catch (err) {
      console.error(err)
      setError(err.message || 'Não foi possível conectar a carteira.')
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!walletAddress) {
      setError('Conecte sua carteira antes de registrar a identidade.')
      return
    }

    if (!name.trim() || !matricula.trim()) {
      setError('Informe nome completo e matrícula.')
      return
    }

    setLoading(true)
    try {
      const normalizedName = name.trim()
      const normalizedMatricula = matricula.trim()
      const normalizedCurso = curso.trim()

      const [walletIdentity, matriculaIdentity] = await Promise.all([
        fetchIdentity(walletAddress),
        fetchIdentityByMatricula(normalizedMatricula),
      ])

      if (walletIdentity) {
        setError('Sua carteira já possui uma identidade registrada. Use o login para acessá-la ou conecte outra carteira.')
        return
      }

      if (matriculaIdentity && matriculaIdentity.account.toLowerCase() !== walletAddress.toLowerCase()) {
        setError('Já existe uma identidade registrada com essa matrícula na blockchain. Utilize a matrícula correta ou outra carteira.')
        return
      }

      await registerIdentity({
        name: normalizedName,
        matricula: normalizedMatricula,
        curso: normalizedCurso,
      })
      setMessage('Identidade registrada com sucesso!')
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      console.error('Erro ao registrar identidade:', err)
      if (matchesRevert(err, 'MatriculaAlreadyInUse')) {
        setError('Não é possível criar outra identidade com a mesma matrícula. Verifique o número informado.')
        return
      }

      if (matchesRevert(err, 'IdentityAlreadyExists')) {
        setError('Esta carteira já está vinculada a uma identidade registrada. Use o login para entrar.')
        return
      }

      const message = err?.shortMessage || err?.error?.message || err.message || 'Falha ao registrar identidade.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const inputClassName =
    'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 transition focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60'
  const subtleTextClass = 'text-sm text-slate-300'
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div ref={vantaRef} className="absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] items-center px-6 py-14 sm:px-8 lg:px-10">
        <div className="w-full rounded-[28px] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-900/25 backdrop-blur-2xl lg:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-7 lg:gap-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-6">
                <img src={labLogo} alt="Laboratório de Redes" className="h-16 w-auto drop-shadow-xl" />
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1">Identidade descentralizada</span>
                  <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1">Rede Hardhat local</span>
                </div>
              </div>

              <div className="space-y-5 lg:max-w-xl">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Registre sua identidade acadêmica on-chain</h1>
                <p className="text-base text-slate-200">
                  Valide nome, matrícula e curso diretamente na blockchain do laboratório. Cada carteira mantém um perfil único e controla o acesso aos dashboards assinando desafios criptográficos.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left backdrop-blur-sm">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-200">Registro único</p>
                  <p className="mt-2 text-sm text-slate-200">A matrícula não pode ser duplicada em outra carteira.</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/25 bg-emerald-900/30 p-4 text-left backdrop-blur-sm">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-emerald-200">Controle total</p>
                  <p className="mt-2 text-sm text-emerald-50">Use sua carteira ou a conta de laboratório disponibilizada.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-100 backdrop-blur-sm lg:max-w-xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-200">Tutorial passo a passo</p>
                    <p className="mt-2 text-slate-200">
                      Veja como configurar a rede local, conectar a conta de laboratório e registrar sua identidade on-chain.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(true)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/15 sm:mt-0 sm:w-auto"
                  >
                    Abrir tutorial
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:gap-6">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-xl sm:p-7 lg:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white sm:text-xl">Criar identidade on-chain</h2>
                    <p className="mt-1 text-sm text-slate-200">Conecte sua carteira e informe os dados acadêmicos.</p>
                  </div>
                  <button
                    type="button"
                    onClick={connectWallet}
                    className="rounded-lg border border-cyan-300/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-100 hover:text-cyan-50"
                  >
                    {walletAddress ? (walletType === 'lab' ? 'Carteira de laboratório' : 'Carteira conectada') : 'Conectar carteira'}
                  </button>
                </div>

                {(error || message) && (
                  <div className="mt-4 space-y-3 text-sm">
                    {error && (
                      <div className="rounded-xl border border-red-400/40 bg-red-950/60 px-4 py-3 text-red-100 shadow-lg shadow-red-900/25">
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/60 px-4 py-3 text-emerald-100 shadow-lg shadow-emerald-900/25">
                        {message}
                      </div>
                    )}
                  </div>
                )}
                {hasWalletProvider === false && (
                  <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-900/30 px-4 py-3 text-sm text-amber-100 shadow-lg shadow-amber-900/25">
                    Não encontramos uma carteira instalada (MetaMask ou Hardhat Wallet). Instale uma extensão ou utilize o botão
                    “Conectar carteira” para ativar a conta de laboratório.
                  </div>
                )}
                {hasWalletProvider && checkedExistingWallet && !walletAddress && (
                  <div className="mt-4 rounded-xl border border-cyan-200/40 bg-cyan-900/30 px-4 py-3 text-sm text-cyan-100 shadow-lg shadow-cyan-900/25">
                    Detectamos uma carteira compatível no navegador. Clique em “Conectar carteira” para reutilizar a autorização
                    sem novos pop-ups.
                  </div>
                )}

                <form onSubmit={handleRegister} className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-100">Nome completo</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} placeholder="Ex: Maria Silva" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-100">Matrícula</label>
                      <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={inputClassName} placeholder="Ex: 2025001" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-100">Curso</label>
                      <input value={curso} onChange={(e) => setCurso(e.target.value)} className={inputClassName} />
                    </div>
                  </div>
                  <p className={subtleTextClass}>
                    Após a confirmação da transação, sua carteira passa a representar oficialmente essa identidade acadêmica. Qualquer alteração exige uma nova assinatura na blockchain.
                  </p>
                  <button type="submit" className={primaryButtonClass} disabled={loading}>
                    {loading ? 'Registrando…' : 'Registrar na blockchain'}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-100 backdrop-blur-xl sm:p-7 lg:p-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Já possui identidade?</h3>
                    <p className="mt-1 text-slate-200">Retorne à tela de login e assine o desafio para acessar os eventos.</p>
                  </div>
                  <Link
                    to="/"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400/90 via-sky-400/90 to-blue-500/90 px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:scale-[1.01] hover:shadow-lg sm:mt-0 sm:w-auto"
                  >
                    Voltar ao login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-6 py-10 backdrop-blur-xl">
          <div className="relative w-full max-w-5xl rounded-3xl border border-white/15 bg-slate-950/90 p-6 shadow-2xl shadow-cyan-900/40 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Ajuda</p>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Como configurar sua carteira para cadastro</h2>
                <p className="mt-2 text-sm text-slate-200">Escolha uma das opções abaixo e siga o passo a passo para registrar sua identidade.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 max-h-[70vh] overflow-y-auto pr-1">
              <WalletHelper />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
