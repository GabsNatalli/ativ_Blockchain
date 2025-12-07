import React, { useEffect, useState } from 'react'
import { fetchEvents, formatTimestamp } from '../services/blockchain'
import { downloadHistoryReport } from '../utils/report'

export default function Historico() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportError, setReportError] = useState('')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  useEffect(() => {
    const address = localStorage.getItem('walletAddress')
    if (!address) {
      setError('Nenhuma carteira conectada. Faça login novamente.')
      setLoading(false)
      return
    }

    async function load() {
      try {
        const data = await fetchEvents(address)
        setEvents(data)
      } catch (err) {
        console.error('Erro ao carregar eventos:', err)
        setError(err.message || 'Erro ao carregar eventos registrados.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  async function handleDownloadReport() {
    setReportError('')

    if (!events.length) {
      setReportError('Nenhum evento disponível para gerar relatório.')
      return
    }

    setIsGeneratingReport(true)
    try {
      const walletAddress = localStorage.getItem('walletAddress') || 'carteira-desconhecida'
      const maskedWallet =
        walletAddress && walletAddress.length > 10
          ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
          : walletAddress

      const entries = events.map((event) => {
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
        ownerIdentifier: maskedWallet,
        fileNamePrefix: 'relatorio-eventos',
      })
    } catch (err) {
      console.error('Erro ao gerar relatório de eventos:', err)
      setReportError(err.message || 'Falha ao gerar relatório de eventos.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-lg backdrop-blur-xl sm:p-8">
        <h1 className="text-3xl font-semibold">Histórico de eventos</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Todas as presenças e registros criados com sua carteira são consultados diretamente no contrato EventStorage. Cada
          item abaixo corresponde a uma transação confirmada na blockchain local.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-lg backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            {loading && <p className="text-sm text-slate-300">Carregando eventos registrados…</p>}
            {error && <p className="text-sm text-red-200">{error}</p>}
            {reportError && !error && <p className="text-sm text-amber-200">{reportError}</p>}
            {!loading && events.length === 0 && !error && (
              <p className="text-sm text-slate-300">Nenhum evento registrado para esta carteira até o momento.</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isGeneratingReport || loading || !!error}
            className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-200 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingReport ? 'Gerando relatório…' : 'Gerar relatório'}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{event.title || 'Evento sem título'}</h2>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">
                  #{event.id}
                </span>
              </div>
              {event.description && <p className="mt-2 text-sm text-slate-200">{event.description}</p>}
              <dl className={`mt-4 grid gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                <div>
                  <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Registrado em</dt>
                  <dd className="font-medium text-white">{formatTimestamp(event.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Data do evento</dt>
                  <dd className="font-medium text-white">{event.eventDate ? formatTimestamp(event.eventDate) : 'Não informada'}</dd>
                </div>
                {isAdmin && (
                  <div>
                    <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Owner</dt>
                    <dd className="font-mono text-xs text-slate-200">{event.owner}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
