export function downloadHistoryReport(entries, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Geração de relatório disponível apenas no navegador')
  }

  const {
    ownerName = '',
    ownerIdentifier = '',
    ownerDid = '',
    fileNamePrefix = 'relatorio-presencas',
  } = options

  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : []
  const sortedEntries = safeEntries
    .slice()
    .sort((a, b) => new Date(a?.dataHora || 0) - new Date(b?.dataHora || 0))

  const now = new Date()
  const localeDate = now.toLocaleString()
  const lines = []

  lines.push('Relatório de presenças')
  lines.push(`Gerado em: ${localeDate}`)
  if (ownerName) {
    lines.push(`Participante: ${ownerName}`)
  }
  if (ownerIdentifier) {
    lines.push(`Identificador: ${ownerIdentifier}`)
  }
  if (ownerDid) {
    lines.push(`DID: ${ownerDid}`)
  }
  lines.push('')
  lines.push(`Total de registros: ${sortedEntries.length}`)
  lines.push('')

  if (sortedEntries.length === 0) {
    lines.push('Nenhuma presença encontrada para o período.')
  } else {
    sortedEntries.forEach((entry, index) => {
      const evento = entry?.nomeEvento || entry?.eventoID || 'Evento não informado'
      const codigoEvento = entry?.eventoID && entry?.eventoID !== entry?.nomeEvento ? entry.eventoID : ''
      let dataHora = '—'
      if (entry?.dataHora) {
        try {
          dataHora = new Date(entry.dataHora).toLocaleString()
        } catch (err) {
          dataHora = entry.dataHora
        }
      }

      lines.push(`${index + 1}. Evento: ${evento}`)
      if (codigoEvento) {
        lines.push(`   Código do evento: ${codigoEvento}`)
      }
      lines.push(`   Data e hora: ${dataHora}`)
      if (entry?.hash) {
        lines.push(`   Hash: ${entry.hash}`)
      }
      lines.push('')
    })
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })

  const normalizedIdentifier = (ownerIdentifier || ownerName || 'participante')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'participante'

  const timestamp = now.toISOString().replace(/[:.]/g, '-')
  const filename = `${fileNamePrefix}-${normalizedIdentifier}-${timestamp}.txt`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
