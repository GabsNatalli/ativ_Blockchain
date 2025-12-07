import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEvent, fetchEvents, fetchIdentity, formatTimestamp } from '../services/blockchain'

export default function Home() {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingIdentity, setLoadingIdentity] = useState(true)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const getCurrentLocalDateTime = () => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  }

  const [eventDate, setEventDate] = useState(() => getCurrentLocalDateTime())
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const address = localStorage.getItem('walletAddress')
    if (!address) {
      navigate('/')
      return
    }

    async function loadIdentity() {
      setLoadingIdentity(true)
      try {
        const data = await fetchIdentity(address)
        setIdentity(data)
        if (!data) {
          setFeedback('Nenhuma identidade foi encontrada para esta carteira. Registre-se antes de continuar.')
        } else {
          setFeedback('')
        }
      } catch (err) {
        console.error('Erro ao carregar identidade:', err)
        setError(err.message || 'Erro ao carregar identidade.')
      } finally {
        setLoadingIdentity(false)
      }
    }

    async function loadEvents() {
      try {
        const list = await fetchEvents(address)
        setEvents(list)
      } catch (err) {
        console.error('Erro ao carregar eventos:', err)
        setError(err.message || 'Erro ao carregar eventos.')
      }
    }

    loadIdentity()
    loadEvents()
  }, [navigate])

  async function handleCreateEvent(e) {
    e.preventDefault()
    setError('')
    setFeedback('')

    if (!identity) {
      setError('Cadastre sua identidade antes de criar eventos.')
      return
    }

    if (!title.trim()) {
      setError('Informe um título para o evento.')
      return
    }

    const timestamp = eventDate ? Math.floor(new Date(eventDate).getTime() / 1000) : 0
    if (eventDate && Number.isNaN(timestamp)) {
      setError('Data do evento inválida.')
      return
    }

    setCreatingEvent(true)
    try {
      const receipt = await createEvent({
        title: title.trim(),
        description: description.trim(),
        eventDate: timestamp,
      })
      setFeedback('Evento registrado na blockchain com sucesso!')
      setTitle('')
      setDescription('')
      setEventDate(getCurrentLocalDateTime())
      const address = localStorage.getItem('walletAddress')
      if (address) {
        const list = await fetchEvents(address)
        setEvents(list)
      }
    } catch (err) {
      console.error('Erro ao criar evento:', err)
      const message = err?.shortMessage || err?.error?.message || err.message || 'Falha ao registrar evento.'
      setError(message)
    } finally {
      setCreatingEvent(false)
    }
  }

  const activeAddress = localStorage.getItem('walletAddress')
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  const identityInitial = identity?.name?.charAt(0)?.toUpperCase() || '—'

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Identidade</p>
            <h1 className="mt-2 text-3xl font-semibold">Bem-vindo ao painel da sua identidade soberana</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Todos os dados exibidos abaixo são lidos diretamente da blockchain local. Use a carteira conectada para assinar
              novas transações e manter seu histórico acadêmico seguro.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-slate-950/70 px-5 py-4 text-sm">
            <p className="text-xs text-slate-300">Carteira conectada</p>
            <p className="font-mono text-base text-cyan-200" title={activeAddress || 'Nenhuma carteira conectada'}>
              {activeAddress ? `${activeAddress.slice(0, 8)}…${activeAddress.slice(-6)}` : '—'}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div className="rounded-xl border border-white/10 bg-gradient-to-r from-cyan-500/15 via-emerald-400/10 to-indigo-500/10 p-4 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-semibold text-white shadow-md shadow-cyan-500/20">
                    {identityInitial}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-100">Dados cadastrais</p>
                    <h2 className="text-xl font-semibold text-white">Identidade on-chain</h2>
                    <p className="text-xs text-slate-100/80">Informações verificadas e assinadas com sua carteira.</p>
                  </div>
                </div>
                {identity && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 shadow shadow-emerald-500/20">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-sm shadow-emerald-300" />
                    Identidade ativa
                  </span>
                )}
              </div>
              {identity?.matricula && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  <span className="rounded-full bg-cyan-400/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-950">ID</span>
                  Matrícula {identity.matricula}
                </div>
              )}
            </div>

            {loadingIdentity && <p className="mt-5 text-sm text-slate-300">Carregando identidade…</p>}
            {!loadingIdentity && !identity && (
              <div className="mt-5 space-y-3 rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-200">
                <p>{feedback || 'Nenhuma identidade registrada.'}</p>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/60 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-100 hover:bg-cyan-300/10 hover:text-cyan-50"
                >
                  Registrar identidade
                </button>
              </div>
            )}
            {identity && (
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Nome completo</dt>
                  <dd className="mt-2 text-base font-semibold text-white">{identity.name || '—'}</dd>
                  <p className="mt-1 text-xs text-slate-300">O nome apresentado como titular desta identidade.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Curso</dt>
                  <dd className="mt-2 text-base font-semibold text-white">{identity.curso || '—'}</dd>
                  <p className="mt-1 text-xs text-slate-300">Programa acadêmico associado ao seu registro.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Matrícula</dt>
                  <dd className="mt-2 text-base font-semibold text-white">{identity.matricula || '—'}</dd>
                  <p className="mt-1 text-xs text-slate-300">Identificador exclusivo para consultas e verificações.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Criada em</dt>
                  <dd className="mt-2 text-base font-semibold text-white">{identity.createdAt ? new Date(identity.createdAt * 1000).toLocaleString() : '—'}</dd>
                  <p className="mt-1 text-xs text-slate-300">Registro temporal gravado na blockchain.</p>
                </div>
              </dl>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold text-white">Registrar novo evento</h2>
            <p className="mt-1 text-sm text-slate-200">
              Os eventos ficam vinculados ao endereço da sua carteira. Utilize-os para provar presença ou ações acadêmicas.
            </p>
            <form onSubmit={handleCreateEvent} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                  placeholder="Ex: Aula inaugural"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                  placeholder="Resumo do evento ou observações"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Data do evento (opcional)</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                />
                <p className="text-xs text-slate-300">Preenchido automaticamente com a data e hora atual; edite se precisar.</p>
              </div>
              <button
                type="submit"
                disabled={creatingEvent}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:scale-[1.01] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingEvent ? 'Registrando…' : 'Registrar evento'}
              </button>
            </form>
            {(feedback || error) && (
              <div className="mt-4 space-y-2 text-sm">
                {feedback && <div className="text-emerald-200">{feedback}</div>}
                {error && <div className="text-red-200">{error}</div>}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-lg backdrop-blur-xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Histórico</p>
            <h2 className="mt-2 text-2xl font-semibold">Eventos registrados</h2>
            <p className="mt-1 text-sm text-slate-300">A lista é carregada diretamente do contrato inteligente EventStorage.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {events.length === 0 && <p className="text-sm text-slate-300">Nenhum evento cadastrado até o momento.</p>}
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{event.title || 'Evento sem título'}</h3>
                <span className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  #{event.id}
                </span>
              </div>
              {event.description && <p className="mt-2 text-slate-200">{event.description}</p>}
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Registrado em</dt>
                  <dd className="font-medium text-white">{formatTimestamp(event.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Data do evento</dt>
                  <dd className="font-medium text-white">{event.eventDate ? formatTimestamp(event.eventDate) : 'Não informada'}</dd>
                </div>
              </dl>
              {isAdmin && <p className="mt-4 text-xs text-slate-400">Owner: {event.owner}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
