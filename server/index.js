const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { ethers } = require('ethers')
const dotenvPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath })
}

const app = express()
const PORT = process.env.PORT || 4000
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545'
const JWT_SECRET = process.env.JWT_SECRET || 'lab-redes-super-secret'
const NONCE_TTL_MS = 5 * 60 * 1000
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || '')
  .split(',')
  .map((addr) => addr.trim().toLowerCase())
  .filter(Boolean)

app.use(cors())
app.use(express.json({ limit: '5mb' }))

const provider = new ethers.JsonRpcProvider(RPC_URL)
const nonceStore = new Map()
const deploymentsPath = path.join(__dirname, '..', 'blockchain', 'deployments', 'localhost.json')
let cachedDeployments = null

function readDeployments() {
  if (!fs.existsSync(deploymentsPath)) {
    return null
  }
  try {
    const raw = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'))
    return {
      ...raw,
      IdentityRegistry: {
        address: raw.IdentityRegistry.address,
        abi: typeof raw.IdentityRegistry.abi === 'string' ? JSON.parse(raw.IdentityRegistry.abi) : raw.IdentityRegistry.abi,
      },
      EventStorage: {
        address: raw.EventStorage.address,
        abi: typeof raw.EventStorage.abi === 'string' ? JSON.parse(raw.EventStorage.abi) : raw.EventStorage.abi,
      },
    }
  } catch (err) {
    console.error('Erro ao carregar metadados dos contratos:', err)
    return null
  }
}

function ensureDeployments() {
  if (!cachedDeployments) {
    cachedDeployments = readDeployments()
  }
  return cachedDeployments
}

function getIdentityContract() {
  const deployments = ensureDeployments()
  if (!deployments || !deployments.IdentityRegistry) {
    throw new Error('Contratos não implantados. Execute "npm run deploy" para gerar os artefatos.')
  }
  return new ethers.Contract(deployments.IdentityRegistry.address, deployments.IdentityRegistry.abi, provider)
}

function getEventContract() {
  const deployments = ensureDeployments()
  if (!deployments || !deployments.EventStorage) {
    throw new Error('Contratos não implantados. Execute "npm run deploy" para gerar os artefatos.')
  }
  return new ethers.Contract(deployments.EventStorage.address, deployments.EventStorage.abi, provider)
}

function formatIdentity(identity) {
  return {
    account: identity.account,
    name: identity.name,
    matricula: identity.matricula,
    curso: identity.curso,
    createdAt: identity.createdAt ? Number(identity.createdAt) : 0,
  }
}

function formatEvent(event) {
  return {
    id: event.id ? Number(event.id) : 0,
    owner: event.owner,
    title: event.title,
    description: event.description,
    eventDate: event.eventDate ? Number(event.eventDate) : 0,
    createdAt: event.createdAt ? Number(event.createdAt) : 0,
  }
}

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Olá do backend integrado à blockchain!' })
})

app.get('/api/contracts', (req, res) => {
  const deployments = ensureDeployments()
  if (!deployments) {
    return res.status(503).json({ error: 'Contratos não implantados. Execute "npm run deploy".' })
  }
  return res.json({
    network: deployments.network,
    chainId: deployments.chainId,
    deployedAt: deployments.deployedAt,
    identityRegistry: deployments.IdentityRegistry.address,
    eventStorage: deployments.EventStorage.address,
  })
})

app.post('/auth/nonce', (req, res) => {
  const { address } = req.body || {}
  if (!address) {
    return res.status(400).json({ error: 'Campo "address" é obrigatório.' })
  }
  const normalized = address.toLowerCase()
  const nonce = `Assine para entrar no Lab Redes: ${crypto.randomBytes(16).toString('hex')}`
  nonceStore.set(normalized, { nonce, expiresAt: Date.now() + NONCE_TTL_MS })
  return res.json({ nonce })
})

app.post('/auth/verify', (req, res) => {
  const { address, signature } = req.body || {}
  if (!address || !signature) {
    return res.status(400).json({ error: 'Campos "address" e "signature" são obrigatórios.' })
  }
  const normalized = address.toLowerCase()
  const stored = nonceStore.get(normalized)
  if (!stored) {
    return res.status(400).json({ error: 'Nonce não encontrado. Solicite um novo desafio.' })
  }
  if (Date.now() > stored.expiresAt) {
    nonceStore.delete(normalized)
    return res.status(401).json({ error: 'Nonce expirado. Solicite um novo desafio.' })
  }

  let recovered
  try {
    recovered = ethers.verifyMessage(stored.nonce, signature).toLowerCase()
  } catch (err) {
    console.error('Erro ao validar assinatura:', err)
    return res.status(400).json({ error: 'Assinatura inválida.' })
  }

  if (recovered !== normalized) {
    return res.status(401).json({ error: 'Assinatura não corresponde ao endereço informado.' })
  }

  nonceStore.delete(normalized)
  const isAdmin = ADMIN_ADDRESSES.includes(normalized)
  const token = jwt.sign({ sub: normalized, isAdmin }, JWT_SECRET, { expiresIn: '1h' })
  return res.json({ token, address: normalized, isAdmin })
})

app.get('/api/identities', async (req, res) => {
  try {
    const contract = getIdentityContract()
    const identities = await contract.getAllIdentities()
    return res.json(identities.map(formatIdentity))
  } catch (err) {
    console.error('Erro ao listar identidades:', err)
    return res.status(500).json({ error: err.message || 'Erro interno ao buscar identidades.' })
  }
})

app.get('/api/identities/:address', async (req, res) => {
  try {
    const contract = getIdentityContract()
    const [identity, exists] = await contract.getIdentity(req.params.address)
    if (!exists) {
      return res.status(404).json({ error: 'Identidade não encontrada.' })
    }
    return res.json(formatIdentity(identity))
  } catch (err) {
    console.error('Erro ao obter identidade:', err)
    return res.status(500).json({ error: err.message || 'Erro interno ao buscar identidade.' })
  }
})

app.get('/api/events', async (req, res) => {
  try {
    const contract = getEventContract()
    if (req.query.owner) {
      const events = await contract.getEventsByOwner(req.query.owner)
      return res.json(events.map(formatEvent))
    }
    const events = await contract.getAllEvents()
    return res.json(events.map(formatEvent))
  } catch (err) {
    console.error('Erro ao listar eventos:', err)
    return res.status(500).json({ error: err.message || 'Erro interno ao buscar eventos.' })
  }
})

app.get('/api/events/:id', async (req, res) => {
  try {
    const contract = getEventContract()
    const [eventData, exists] = await contract.getEvent(Number(req.params.id))
    if (!exists) {
      return res.status(404).json({ error: 'Evento não encontrado.' })
    }
    return res.json(formatEvent(eventData))
  } catch (err) {
    console.error('Erro ao obter evento:', err)
    return res.status(500).json({ error: err.message || 'Erro interno ao buscar evento.' })
  }
})

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`)
})
