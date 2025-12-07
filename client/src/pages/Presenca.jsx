import React, { useEffect, useState } from 'react'
import { useToast } from '../components/ToastProvider'

const AULA_FIXA = 'Redes de Computadores'

export default function Presenca() {
  const [presencas, setPresencas] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const userName = localStorage.getItem('userName') || localStorage.getItem('nome') || ''
  const userDID = localStorage.getItem('userDID')
  const { show } = useToast()

  async function loadPresencas() {
    // Prefere buscar do backend por DID, senão usa localStorage
    if (userDID) {
      try {
        const res = await fetch(`/api/presencas?did=${encodeURIComponent(userDID)}`)
        if (!res.ok) return setPresencas([])
        const data = await res.json()
        setPresencas(data)
        return
      } catch (err) {
        // fallback para local
      }
    }

    const raw = localStorage.getItem('presencas')
    try {
      const arr = raw ? JSON.parse(raw) : []
      // filtrar somente do did atual se houver
      const filtered = userDID ? arr.filter((p) => p.did === userDID) : arr
      setPresencas(filtered)
    } catch (err) {
      setPresencas([])
    }
  }

  useEffect(() => {
    loadPresencas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatDateTime(iso) {
    try {
      const d = new Date(iso)
      return {
        data: d.toLocaleDateString(),
        hora: d.toLocaleTimeString(),
      }
    } catch {
      return { data: iso, hora: '' }
    }
  }

  async function handleRegister() {
    // Prefere did
    const did = userDID
    if (!did) return setMsg('Usuário não autenticado')

    setLoading(true)
    try {
      // Primeiro tenta postar no backend
      const payload = { did, eventoID: AULA_FIXA, nomeEvento: AULA_FIXA }
      const res = await fetch('/api/presenca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao registrar presença no servidor')
      }

      const data = await res.json()
      const { dataHora } = data
      const dt = formatDateTime(dataHora)
  setMsg(`Presença registrada com sucesso em ${dt.data} às ${dt.hora}`)
  show('Presença registrada com sucesso!')
      // Atualiza lista local
      await loadPresencas()
      // guarda local como fallback
      try {
        const raw = localStorage.getItem('presencas')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(data)
        localStorage.setItem('presencas', JSON.stringify(arr))
      } catch {}

      // limpa mensagem após 5s
      setTimeout(() => setMsg(''), 5000)
    } catch (err) {
  setMsg(err.message || 'Erro ao registrar')
  show(err.message || 'Erro ao registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-start">
      <div className="max-w-3xl mx-auto w-full">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">Olá, {userName}</h1>
        </header>

        <section className="card p-6 mb-6 text-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-lg font-medium">Aula</div>
              <div className="text-sm text-gray-600">{AULA_FIXA}</div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleRegister} disabled={loading} className="btn-primary">
                {loading ? 'Registrando...' : 'Registrar Presença'}
              </button>
            </div>
          </div>

          {msg && <div className="mt-4 font-medium text-success">{msg}</div>}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-white">Histórico de Presenças</h2>

          {presencas.length === 0 ? (
            <div className="text-sm text-gray-200">Nenhuma presença registrada.</div>
          ) : (
            <div className="overflow-x-auto card">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Aula</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Data</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {presencas.map((p) => {
                    const dt = formatDateTime(p.dataHora)
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-sm">{p.nomeEvento || p.eventoID}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{dt.data}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{dt.hora}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
