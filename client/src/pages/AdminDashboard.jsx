import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchEvents, fetchIdentities, formatTimestamp } from '../services/blockchain'
import { downloadHistoryReport } from '../utils/report'

export default function AdminDashboard() {
  const [identities, setIdentities] = useState([])
  const [events, setEvents] = useState([])
  const [identitiesError, setIdentitiesError] = useState('')
  const [eventsError, setEventsError] = useState('')
  const [identitySearch, setIdentitySearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [selectedIdentity, setSelectedIdentity] = useState(null)
  const [reportStatus, setReportStatus] = useState({ account: '', type: '', message: '' })
  const [reportingAccount, setReportingAccount] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchIdentities()
        setIdentities(data)
      } catch (err) {
        console.error('Erro ao carregar identidades:', err)
        setIdentitiesError(err.message || 'Erro ao carregar identidades.')
      }

      try {
        const data = await fetchEvents()
        setEvents(data)
      } catch (err) {
        console.error('Erro ao carregar eventos:', err)
        setEventsError(err.message || 'Erro ao carregar eventos.')
      }
      setLoading(false)
    }

    load()
  }, [])

  const normalizedIdentitySearch = identitySearch.trim().toLowerCase()
  const normalizedEventSearch = eventSearch.trim().toLowerCase()

  const identityMap = useMemo(() => {
    const map = new Map()
    identities.forEach((identity) => {
      if (identity?.account) {
        map.set(identity.account.toLowerCase(), identity)
      }
    })
    return map
  }, [identities])

  const registeredEvents = useMemo(
    () => events.filter((event) => identityMap.has(event.owner?.toLowerCase())),
    [events, identityMap]
  )

  const filteredIdentities = useMemo(() => {
    if (!normalizedIdentitySearch) return identities
    return identities.filter((identity) => {
      const tokens = [identity.name, identity.matricula, identity.account, identity.curso].filter(Boolean)
      return tokens.some((token) => token.toLowerCase().includes(normalizedIdentitySearch))
    })
  }, [identities, normalizedIdentitySearch])

  const eventsByOwner = useMemo(() => {
    const map = new Map()

    registeredEvents.forEach((event) => {
      const key = event.owner?.toLowerCase()
      if (!key) return

      const collection = map.get(key) || []
      collection.push(event)
      map.set(key, collection)
    })

    return map
  }, [registeredEvents])

  function filterEventsForIdentity(identity) {
    if (!identity) return []

    const ownerKey = identity.account?.toLowerCase()
    const identityEvents = eventsByOwner.get(ownerKey) || []

    if (!normalizedEventSearch) return identityEvents

    return identityEvents.filter((event) => {
      const tokens = [
        event.title,
        event.description,
        event.owner,
        identity?.name,
        identity?.matricula,
        identity?.curso,
      ].filter(Boolean)

      return tokens.some((token) => token.toLowerCase().includes(normalizedEventSearch))
    })
  }

  const selectedIdentityEvents = useMemo(
    () => (selectedIdentity ? eventsByOwner.get(selectedIdentity.account?.toLowerCase()) || [] : []),
    [eventsByOwner, selectedIdentity]
  )

  const filteredSelectedIdentityEvents = useMemo(
    () => filterEventsForIdentity(selectedIdentity),
    [selectedIdentity, eventsByOwner, normalizedEventSearch]
  )

  useEffect(() => {
    if (!selectedIdentity) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedIdentity(null)
        setEventSearch('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedIdentity])

  function openEventsModal(identity) {
    setSelectedIdentity(identity)
    setEventSearch('')
  }

  function closeEventsModal() {
    setSelectedIdentity(null)
    setEventSearch('')
  }

  async function handleDownloadReport(identity, identityEvents) {
    setReportStatus({ account: identity.account, type: '', message: '' })

    if (!identityEvents || identityEvents.length === 0) {
      setReportStatus({
        account: identity.account,
        type: 'error',
        message: 'Esta identidade ainda não possui eventos registrados.',
      })
      return
    }

    setReportingAccount(identity.account)

    try {
      const entries = identityEvents.map((event) => {
        const targetDate = event.eventDate || event.createdAt
        const date = targetDate ? new Date(Number(targetDate) * 1000) : null
        const isoDate = date && !Number.isNaN(date.getTime()) ? date.toISOString() : ''

        return {
          nomeEvento: event.title || 'Evento sem título',
          eventoID: `#${event.id}`,
          dataHora: isoDate,
          hash: '',
        }
      })

      downloadHistoryReport(entries, {
        ownerName: identity.name,
        ownerIdentifier: identity.matricula || identity.account,
        fileNamePrefix: 'relatorio-eventos',
      })
      setReportStatus({
        account: identity.account,
        type: 'success',
        message: 'Relatório gerado com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao gerar relatório de eventos:', err)
      setReportStatus({
        account: identity.account,
        type: 'error',
        message: err.message || 'Falha ao gerar relatório de eventos.',
      })
    } finally {
      setReportingAccount('')
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl sm:p-8">
        <h1 className="text-3xl font-semibold">Painel administrativo</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Acompanhe as identidades registradas no contrato <strong>IdentityRegistry</strong> e os eventos públicos armazenados em
          <strong> EventStorage</strong>. Todos os dados exibidos aqui são provenientes da blockchain Hardhat local.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Identidades</p>
            <p className="mt-2 text-3xl font-semibold text-white">{identities.length}</p>
            <p className="text-sm text-slate-300">Carteiras registradas</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Eventos</p>
            <p className="mt-2 text-3xl font-semibold text-white">{registeredEvents.length}</p>
            <p className="text-sm text-slate-300">Registros vinculados a identidades</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Rede</p>
            <p className="mt-2 text-base font-semibold text-white">Hardhat localhost</p>
            <p className="text-sm text-slate-300">Chain ID {import.meta.env.VITE_CHAIN_ID || '31337'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-lg backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Identidades cadastradas</h2>
            <p className="text-sm text-slate-300">Dados fornecidos pelo contrato IdentityRegistry.</p>
          </div>
          <input
            value={identitySearch}
            onChange={(e) => setIdentitySearch(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 md:w-72"
            placeholder="Buscar por nome, matrícula ou carteira"
          />
        </div>
        {loading && <p className="mt-4 text-sm text-slate-300">Carregando identidades…</p>}
        {identitiesError && <p className="mt-4 text-sm text-red-200">{identitiesError}</p>}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-[0.3em] text-xs text-slate-300">Carteira</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-[0.3em] text-xs text-slate-300">Nome</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-[0.3em] text-xs text-slate-300">Matrícula</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-[0.3em] text-xs text-slate-300">Curso</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-[0.3em] text-xs text-slate-300">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredIdentities.map((identity) => (
                <tr key={identity.account} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-cyan-100">{identity.account}</td>
                  <td className="px-4 py-3 text-white">{identity.name || '—'}</td>
                  <td className="px-4 py-3 text-white">{identity.matricula || '—'}</td>
                  <td className="px-4 py-3 text-white">{identity.curso || '—'}</td>
                  <td className="px-4 py-3 text-white">{identity.createdAt ? formatTimestamp(identity.createdAt) : '—'}</td>
                </tr>
              ))}
              {!loading && filteredIdentities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-slate-300">
                    Nenhuma identidade corresponde ao filtro informado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-lg backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Eventos registrados</h2>
            <p className="text-sm text-slate-300">
              Apenas eventos vinculados a identidades do contrato <strong>IdentityRegistry</strong>. Escolha uma pessoa para abrir
              o histórico em uma janela dedicada, buscar eventos específicos e gerar relatórios.
            </p>
          </div>
        </div>
        {eventsError && <p className="mt-4 text-sm text-red-200">{eventsError}</p>}
        <div className="mt-6 grid gap-4">
          {identities.map((identity) => {
            const allEvents = eventsByOwner.get(identity.account?.toLowerCase()) || []
            const hasEvents = allEvents.length > 0
            const isLoadingReport = reportingAccount === identity.account

            return (
              <article key={identity.account} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{identity.name || 'Identidade sem nome'}</h3>
                    <p className="text-sm text-slate-200">{identity.matricula || identity.account}</p>
                    <p className="text-xs text-slate-300">Eventos vinculados: {allEvents.length}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEventsModal(identity)}
                      className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-200 hover:text-cyan-200"
                    >
                      Ver eventos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReport(identity, allEvents)}
                      disabled={isLoadingReport}
                      className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-200 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingReport ? 'Gerando relatório…' : 'Gerar relatório'}
                    </button>
                  </div>
                </div>

                {reportStatus.account === identity.account && reportStatus.message && (
                  <p
                    className={`mt-3 text-sm ${
                      reportStatus.type === 'error' ? 'text-amber-200' : 'text-emerald-200'
                    }`}
                  >
                    {reportStatus.message}
                  </p>
                )}
              </article>
            )
          })}
          {!loading && identities.length === 0 && !eventsError && (
            <p className="text-sm text-slate-300">Nenhuma identidade registrada para exibir eventos.</p>
          )}
        </div>
      </section>

      {selectedIdentity
        ? typeof document !== 'undefined'
          ? createPortal(
              <div className="modal-overlay" role="dialog" aria-modal="true">
                <div className="history-modal">
                  <div className="history-modal__header">
                    <div className="history-modal__title-group">
                      <p className="history-modal__eyebrow">Eventos da identidade</p>
                      <h3 className="history-modal__title">{selectedIdentity.name || 'Identidade sem nome'}</h3>
                      <div className="history-modal__meta">
                        <span className="history-modal__chip history-modal__chip--accent">
                          Eventos: <strong>{selectedIdentityEvents.length}</strong>
                        </span>
                        <span className="history-modal__chip">
                          Matrícula: <strong>{selectedIdentity.matricula || '—'}</strong>
                        </span>
                        <span className="history-modal__chip">
                          Carteira: <code>{selectedIdentity.account}</code>
                        </span>
                      </div>
                    </div>
                    <button type="button" className="history-modal__close" onClick={closeEventsModal} aria-label="Fechar modal">
                      <span aria-hidden>×</span>
                    </button>
                  </div>

                  <div className="history-modal__body">
                    <div className="history-modal__search">
                      <label className="history-modal__search-label" htmlFor="event-search">
                        Buscar nos eventos
                      </label>
                      <div className="input-with-icon">
                        <input
                          id="event-search"
                          value={eventSearch}
                          onChange={(e) => setEventSearch(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                          placeholder="Buscar por título, descrição ou carteira"
                        />
                      </div>
                    </div>

                    <div className="history-modal__events space-y-3">
                      {selectedIdentityEvents.length === 0 && (
                        <p className="history-modal__status history-modal__status--empty">
                          Nenhum evento registrado para esta identidade.
                        </p>
                      )}

                      {selectedIdentityEvents.length > 0 && filteredSelectedIdentityEvents.length === 0 && (
                        <p className="history-modal__status history-modal__status--empty">
                          Nenhum evento corresponde ao filtro informado.
                        </p>
                      )}

                      {filteredSelectedIdentityEvents.map((event) => (
                        <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-white">{event.title || 'Evento sem título'}</h4>
                              {event.description && <p className="text-sm text-slate-200">{event.description}</p>}
                            </div>
                            <span className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                              #{event.id}
                            </span>
                          </div>
                          <dl className="mt-3 grid gap-3 md:grid-cols-3">
                            <div>
                              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Registrado em</dt>
                              <dd className="font-medium text-white">{formatTimestamp(event.createdAt)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Data do evento</dt>
                              <dd className="font-medium text-white">{event.eventDate ? formatTimestamp(event.eventDate) : 'Não informada'}</dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Carteira</dt>
                              <dd className="font-mono text-xs text-slate-200">{event.owner}</dd>
                            </div>
                          </dl>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadReport(selectedIdentity, selectedIdentityEvents)}
                        disabled={reportingAccount === selectedIdentity.account}
                        className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-200 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reportingAccount === selectedIdentity.account ? 'Gerando relatório…' : 'Gerar relatório'}
                      </button>
                      <button
                        type="button"
                        onClick={closeEventsModal}
                        className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-200 hover:text-cyan-200"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null
        : null}
    </div>
  )
}
