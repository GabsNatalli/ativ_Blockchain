const VAULT_KEY = 'identityVault'

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const did = typeof entry.did === 'string' ? entry.did : ''
  if (!did) return null
  const status = entry.status === 'revoked' ? 'revoked' : 'active'
  return {
    did,
    matricula: typeof entry.matricula === 'string' ? entry.matricula : '',
    privateKeyJwk:
      status === 'revoked'
        ? ''
        : typeof entry.privateKeyJwk === 'string'
        ? entry.privateKeyJwk
        : '',
    status,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
    revokedAt: typeof entry.revokedAt === 'string' ? entry.revokedAt : null,
  }
}

export function loadIdentityVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(sanitizeEntry)
      .filter(Boolean)
  } catch (err) {
    console.warn('Não foi possível carregar o cofre de identidades.', err)
    return []
  }
}

function persistIdentityVault(entries) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(entries))
  } catch (err) {
    console.warn('Não foi possível salvar o cofre de identidades.', err)
  }
}

export function upsertIdentityInVault({ did, matricula = '', privateKeyJwk = '', status = 'active' }) {
  if (!did) return
  const vault = loadIdentityVault()
  const now = new Date().toISOString()
  const isRevoked = status === 'revoked'
  let found = false
  const nextVault = vault.map((entry) => {
    if (entry.did !== did) return entry
    found = true
    return {
      ...entry,
      matricula: matricula || entry.matricula || '',
      privateKeyJwk: isRevoked ? '' : privateKeyJwk || entry.privateKeyJwk || '',
      status: isRevoked ? 'revoked' : 'active',
      updatedAt: now,
      revokedAt: isRevoked ? entry.revokedAt || now : null,
    }
  })
  if (!found) {
    nextVault.push({
      did,
      matricula: matricula || '',
      privateKeyJwk: isRevoked ? '' : privateKeyJwk || '',
      status: isRevoked ? 'revoked' : 'active',
      createdAt: now,
      updatedAt: now,
      revokedAt: isRevoked ? now : null,
    })
  }
  persistIdentityVault(nextVault)
}

export function getIdentityFromVault(did) {
  if (!did) return null
  const vault = loadIdentityVault()
  return vault.find((entry) => entry.did === did) || null
}

export function setActiveIdentity({ did, matricula = '', privateKeyJwk = '' }) {
  if (!did) return
  const now = new Date().toISOString()
  const vault = loadIdentityVault()
  let found = false
  const nextVault = vault.map((entry) => {
    if (entry.did === did) {
      found = true
      return {
        ...entry,
        matricula: matricula || entry.matricula || '',
        privateKeyJwk: privateKeyJwk || entry.privateKeyJwk || '',
        status: 'active',
        updatedAt: now,
        revokedAt: null,
      }
    }

    if (entry.status === 'revoked' && (!entry.privateKeyJwk || entry.privateKeyJwk === '')) {
      if (entry.revokedAt) {
        return entry
      }
      return {
        ...entry,
        revokedAt: entry.revokedAt || now,
        updatedAt: entry.updatedAt || now,
      }
    }

    return {
      ...entry,
      status: 'revoked',
      privateKeyJwk: '',
      revokedAt: entry.revokedAt || now,
      updatedAt: now,
    }
  })

  if (!found) {
    nextVault.push({
      did,
      matricula: matricula || '',
      privateKeyJwk: privateKeyJwk || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    })
  }

  persistIdentityVault(nextVault)
}

export function clearVault() {
  try {
    localStorage.removeItem(VAULT_KEY)
  } catch (err) {
    console.warn('Não foi possível limpar o cofre de identidades.', err)
  }
}
