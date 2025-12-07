import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import labLogo from '../assets/lab-logo.png'
import WalletHelper from '../components/WalletHelper'
import {
  connectLabWallet as connectLabWalletService,
  connectWallet as connectWalletService,
  fetchIdentity,
  registerIdentity,
  detectExistingWalletConnection,
  getWalletSigner,
} from '../services/blockchain'

export default function Login() {
  const vantaRef = useRef(null)
  const navigate = useNavigate()
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('')
  const [matricula, setMatricula] = useState('')
  const [fullName, setFullName] = useState('')
  const [lastIdentity, setLastIdentity] = useState(null)
  const [status, setStatus] = useState('Conecte sua carteira para continuar.')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [hasWalletProvider, setHasWalletProvider] = useState(true)
  const [checkedExistingWallet, setCheckedExistingWallet] = useState(false)

  const ADMIN_FALLBACK_IDENTITY = {
    name: 'Administrador Padrão',
    matricula: 'ADM-0001',
    curso: 'Administração de Redes',
  }

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
    if (localStorage.getItem('authToken') && localStorage.getItem('walletAddress')) {
      setStatus('Carteira já autenticada. Redirecionando…')
      setTimeout(() => navigate('/home'), 600)
    }
  }, [navigate])

  useEffect(() => {
    let canceled = false

    async function detectWallet() {
      try {
        if (localStorage.getItem('authToken') && localStorage.getItem('walletAddress')) {
          return
        }

        const info = await detectExistingWalletConnection()
        if (canceled) return
        setHasWalletProvider(info.hasProvider)

        if (info.address) {
          setWalletAddress(info.address)
          setWalletType(info.type || 'injected')
          setStatus('Carteira já autorizada. Confirme os dados e prossiga.')
          return
        }

        if (info.hasProvider) {
          setStatus('Carteira detectada. Clique em conectar para autorizar o uso.')
        } else {
          setStatus('MetaMask/Hardhat Wallet não detectada. Use a conta de laboratório ou instale uma extensão.')
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('activeIdentity')
      if (stored) {
        setLastIdentity(JSON.parse(stored))
      }
    } catch (err) {
      console.warn('Não foi possível ler a identidade ativa salva.', err)
    }
  }, [])

  async function connectWallet() {
    setError('')
    setStatus('Solicitando conexão com a carteira…')
    try {
      const { address, type } = await connectWalletService({ allowLabWallet: true })
      setWalletAddress(address)
      setWalletType(type)
      const identity = await fetchIdentity(address)
      if (identity) {
        setMatricula(identity.matricula)
        setFullName(identity.name)
        setLastIdentity(identity)
        localStorage.setItem('activeIdentity', JSON.stringify(identity))
        setStatus(
          type === 'lab'
            ? 'Carteira de laboratório conectada. Identidade encontrada: confirme os dados antes de assinar o desafio.'
            : 'Carteira conectada. Identidade encontrada: confirme os dados antes de assinar o desafio.'
        )
      } else {
        setStatus(
          type === 'lab'
            ? 'Carteira de laboratório conectada, mas nenhuma identidade foi localizada para este endereço.'
            : 'Carteira conectada, mas nenhuma identidade foi localizada para este endereço.'
        )
        setError(
          'Não encontramos uma identidade registrada para esta carteira. Verifique se a rede/local RPC é a mesma do cadastro ou registre uma nova identidade.'
        )
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Não foi possível conectar a carteira.')
      setStatus('Conecte sua carteira para continuar.')
    }
  }

  async function connectLabWallet() {
    setError('')
    setStatus('Conectando carteira de laboratório…')
    try {
      const { address, type } = await connectLabWalletService()
      setWalletAddress(address)
      setWalletType(type)
      setStatus('Carteira de laboratório conectada. Valide os dados antes de assinar o desafio.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Não foi possível conectar a carteira de laboratório.')
      setStatus('Conecte sua carteira para continuar.')
    }
  }

  async function handleLogin({ addressOverride, identityOverride } = {}) {
    const addressToUse = addressOverride || walletAddress

    if (!addressToUse) {
      setError('Conecte uma carteira antes de autenticar.')
      return
    }

    const matriculaToUse = (identityOverride?.matricula || matricula).trim()
    const nameToUse = (identityOverride?.name || fullName).trim()

    if (!matriculaToUse || !nameToUse) {
      setError('Informe matrícula e nome exatamente como estão registrados na blockchain.')
      return
    }

    setError('')
    setIsLoading(true)
    setStatus('Validando identidade on-chain…')

    try {
      const identity = identityOverride || (await fetchIdentity(addressToUse))
      if (!identity) {
        setStatus('Nenhuma identidade encontrada para esta carteira.')
        throw new Error(
          'Nenhuma identidade está associada à carteira conectada. Confirme se é a mesma carteira usada no cadastro ou crie uma identidade antes de continuar.'
        )
      }

      const normalizedMatricula = matriculaToUse.toLowerCase()
      if (identity.matricula.trim().toLowerCase() !== normalizedMatricula) {
        throw new Error('A matrícula informada não corresponde à identidade desta carteira.')
      }

      const normalizedName = nameToUse.toLowerCase()
      if (identity.name.trim().toLowerCase() !== normalizedName) {
        throw new Error('O nome informado não corresponde à identidade desta carteira.')
      }

      setStatus('Identidade validada. Gerando desafio de assinatura…')

      const nonceResponse = await fetch('/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToUse }),
      })
      if (!nonceResponse.ok) {
        throw new Error('Não foi possível obter o nonce de autenticação.')
      }
      const { nonce } = await nonceResponse.json()
      setStatus('Assine o desafio na sua carteira…')

      const signer = await getWalletSigner()
      const signature = await signer.signMessage(nonce)

      const verifyResponse = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToUse, signature }),
      })
      let payload = {}
      try {
        payload = await verifyResponse.json()
      } catch {
        payload = {}
      }
      if (!verifyResponse.ok) {
        throw new Error(payload.error || 'Falha ao validar assinatura.')
      }

      localStorage.setItem('authToken', payload.token)
      localStorage.setItem('walletAddress', payload.address)
      localStorage.setItem('isAdmin', payload.isAdmin ? 'true' : 'false')
      localStorage.setItem('activeIdentity', JSON.stringify(identity))
      setLastIdentity(identity)
      setStatus('Autenticado com sucesso! Redirecionando…')
      setTimeout(() => {
        if (payload.isAdmin) {
          navigate('/admin')
        } else {
          navigate('/home')
        }
      }, 500)
    } catch (err) {
      console.error('Erro ao fazer login:', err)
      setError(err.message || 'Erro ao autenticar a carteira.')
      setStatus('Conecte sua carteira para continuar.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdminQuickLogin() {
    setError('')
    setIsLoading(true)
    setStatus('Preparando login administrativo automático…')

    try {
      const { address, type } = await connectLabWalletService()
      setWalletAddress(address)
      setWalletType(type)

      let identity = await fetchIdentity(address)
      if (!identity) {
        setStatus('Nenhuma identidade admin encontrada. Registrando identidade padrão…')
        try {
          await registerIdentity(ADMIN_FALLBACK_IDENTITY)
          identity = await fetchIdentity(address)
        } catch (registerErr) {
          console.error('Erro ao registrar identidade admin padrão:', registerErr)
          throw new Error(
            'Não foi possível registrar a identidade administrativa automaticamente. Verifique se a rede local está ativa e tente novamente.'
          )
        }
      }

      if (identity) {
        setMatricula(identity.matricula)
        setFullName(identity.name)
        setLastIdentity(identity)
      }

      await handleLogin({ addressOverride: address, identityOverride: identity })
    } catch (err) {
      console.error('Erro no login automático de admin:', err)
      setError(err.message || 'Não foi possível entrar como administrador automaticamente.')
      setStatus('Conecte sua carteira para continuar.')
    } finally {
      setIsLoading(false)
    }
  }

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
                  <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1">Blockchain acadêmica</span>
                  <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1">Rede Hardhat local</span>
                </div>
              </div>

              <div className="space-y-5 lg:max-w-xl">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Acesse com sua carteira e valide sua identidade descentralizada
                </h1>
                <p className="text-base text-slate-200">
                  Conecte uma carteira para provar a matrícula registrada na nossa blockchain Hardhat. Assine um desafio criptográfico para entrar —
                  sem senhas salvas no servidor.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left backdrop-blur-sm">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-200">Login seguro</p>
                  <p className="mt-2 text-sm text-slate-200">Assine um nonce único para liberar o dashboard e os eventos.</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/25 bg-emerald-900/30 p-4 text-left backdrop-blur-sm">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-emerald-200">Controle total</p>
                  <p className="mt-2 text-sm text-emerald-50">Use sua extensão favorita ou a conta de laboratório fornecida.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-100 backdrop-blur-sm lg:max-w-xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-200">Tutorial passo a passo</p>
                    <p className="mt-2 text-slate-200">
                      Aprenda rapidamente como conectar sua carteira, usar a conta de laboratório e assinar o desafio de login.
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
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white sm:text-xl">Login com carteira</h2>
                      <p className="mt-1 text-sm text-slate-200">
                        Confirme os dados da sua identidade antes de assinar o desafio criptográfico. Entrar com outra identidade substitui a anterior salva neste navegador.
                      </p>
                    </div>
                  </div>

                  {(error || status) && (
                    <div className="mt-3 flex flex-col items-center space-y-3 text-center text-sm">
                      {error && (
                        <div className="w-full rounded-xl border border-red-400/40 bg-red-950/60 px-4 py-3 text-red-100 shadow-lg shadow-red-900/25">
                          {error}
                        </div>
                      )}
                      {status && (
                        <div className="w-full rounded-xl border border-cyan-400/40 bg-cyan-950/45 px-4 py-3 text-cyan-100 shadow-lg shadow-cyan-900/25">
                          {status}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 text-left text-sm">
                        <label className="font-semibold text-slate-100">Matrícula</label>
                        <input
                          value={matricula}
                          onChange={(e) => setMatricula(e.target.value)}
                          placeholder="Ex: 2025001"
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                        />
                      </div>
                      <div className="space-y-2 text-left text-sm">
                        <label className="font-semibold text-slate-100">Nome completo</label>
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: Maria Silva"
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={connectWallet}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                      >
                        {walletAddress && walletType !== 'lab' ? 'Carteira conectada' : 'Conectar carteira instalada'}
                      </button>
                      <button
                        type="button"
                        onClick={connectLabWallet}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200/50 bg-emerald-900/40 px-4 py-3 font-semibold text-emerald-50 shadow-lg shadow-emerald-900/20 transition hover:scale-[1.01] hover:border-emerald-100 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                      >
                        {walletType === 'lab' ? 'Conta de laboratório conectada' : 'Usar conta de laboratório'}
                      </button>
                    </div>
                    {hasWalletProvider === false && (
                      <div className="rounded-xl border border-amber-300/50 bg-amber-900/30 px-4 py-3 text-left text-sm text-amber-100 shadow-lg shadow-amber-900/25">
                        Não encontramos uma carteira instalada (MetaMask ou Hardhat Wallet). Você pode instalar uma extensão ou
                        usar a conta de laboratório acima para continuar os testes.
                      </div>
                    )}
                    {hasWalletProvider && checkedExistingWallet && !walletAddress && (
                      <div className="rounded-xl border border-cyan-200/40 bg-cyan-900/30 px-4 py-3 text-left text-sm text-cyan-100 shadow-lg shadow-cyan-900/25">
                        Detectamos uma carteira instalada. Clique em “Conectar carteira instalada” para autorizar o acesso sem
                        precisar repetir a conexão a cada visita.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleLogin}
                      disabled={!walletAddress || isLoading}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-300/60 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? 'Assinando…' : 'Assinar desafio e entrar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminQuickLogin}
                      disabled={isLoading}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-amber-200/70 bg-amber-900/40 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:scale-[1.01] hover:border-amber-100 hover:bg-amber-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? 'Preparando acesso admin…' : 'Login rápido como admin (conta de laboratório)'}
                    </button>
                    <p className="text-left text-xs text-amber-100/90">
                      Usa a primeira conta do Hardhat (já listada como administradora) e registra uma identidade padrão se ela ainda não existir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-100 backdrop-blur-xl sm:p-7 lg:p-8">
                <h3 className="text-base font-semibold text-white">Ainda não possui identidade?</h3>
                <p className="mt-2 text-slate-200">
                  Gere sua identidade acadêmica registrando seu nome, matrícula e curso diretamente na blockchain.
                </p>
                <Link
                  to="/register"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400/90 via-teal-400/90 to-cyan-500/90 px-4 py-3 font-semibold text-slate-900 transition hover:scale-[1.01] hover:shadow-lg"
                >
                  Criar identidade on-chain
                </Link>
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
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Como configurar sua carteira para acesso</h2>
                <p className="mt-2 text-sm text-slate-200">Escolha uma das opções abaixo e siga o passo a passo para entrar com segurança.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Voltar ao login
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
