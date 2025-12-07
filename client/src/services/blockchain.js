import { ethers } from 'ethers'
import identityDescriptor from '../contracts/IdentityRegistry.json'
import eventDescriptor from '../contracts/EventStorage.json'
import getDeployments, { getCachedDeployments } from '../utils/loadDeployments'

const DEFAULT_RPC = import.meta.env.VITE_RPC_URL || null
const LAB_WALLET_KEY =
  import.meta.env.VITE_LAB_WALLET_KEY ||
  // Primeira chave privada padrão do Hardhat (rede local apenas)
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
// LAB_WALLET_ENABLED will be determined at runtime based on deployments.network
// EXPECTED_CHAIN_ID will be read from deployments at runtime when needed

function assertDescriptor(descriptor, name) {
  if (!descriptor || !descriptor.address || !descriptor.abi) {
    throw new Error(`Contrato ${name} não configurado. Execute "npm run deploy" para gerar os artefatos.`)
  }
}

assertDescriptor(identityDescriptor, 'IdentityRegistry')
assertDescriptor(eventDescriptor, 'EventStorage')

export async function getDeploymentsInfo() {
  return await getCachedDeployments()
}

export async function getReadOnlyProvider() {
  if (DEFAULT_RPC) return new ethers.JsonRpcProvider(DEFAULT_RPC)
  // Se não houver RPC via env, deduzir a partir do arquivo de deployments (cache)
  const deployments = await getCachedDeployments()
  const targetNetwork = deployments?.network || 'localhost'
  if (targetNetwork === 'localhost') {
    return new ethers.JsonRpcProvider('http://127.0.0.1:8545')
  }
  // Para redes públicas (ex: Sepolia): preferir VITE_RPC_URL, mas se não definido
  // usar provider injetado (MetaMask) como fallback para operações que dependem
  // de um provider (isso permite que usuários conectados via MetaMask funcionem
  // mesmo sem VITE_RPC_URL). Caso não haja provider injetado, lançar erro.
  if (import.meta.env.VITE_RPC_URL) {
    return new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL)
  }
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum)
  }
  throw new Error(
    `RPC da rede ${targetNetwork} não configurado e nenhum provider injetado detectado. Defina VITE_RPC_URL ou conecte MetaMask antes de carregar o frontend.`
  )
}

export async function assertCorrectNetwork(provider) {
  // provider pode ser BrowserProvider/Signer provider ou null
  if (!provider) return
  try {
    const network = await provider.getNetwork()
    const deployments = await getCachedDeployments()
    const EXPECTED_CHAIN_ID = deployments?.chainId || 31337
    const TARGET_NETWORK = deployments?.network || 'localhost'
    if (Number(network.chainId) !== Number(EXPECTED_CHAIN_ID)) {
      throw new Error(
        `Rede incorreta detectada (chainId ${network.chainId}). Conecte-se à rede ${TARGET_NETWORK} (chainId ${EXPECTED_CHAIN_ID}) configurada nos deployments e redesploye os contratos se necessário.`
      )
    }
  } catch (err) {
    if (err.code === 'NETWORK_ERROR') {
      throw new Error(
        `Não foi possível detectar a rede. Verifique se o nó está acessível em ${DEFAULT_RPC} e tente novamente.`
      )
    }
    throw err
  }
}

function getInjectedProvider() {
  if (typeof window === 'undefined' || !window.ethereum) return null
  return new ethers.BrowserProvider(window.ethereum)
}

async function getInjectedConnection({ requestAccessIfNeeded = true } = {}) {
  const provider = getInjectedProvider()
  if (!provider) return null

  let accounts = []
  try {
    accounts = await provider.send('eth_accounts', [])
  } catch (err) {
    console.warn('Não foi possível listar contas injetadas.', err)
  }

  if ((!accounts || accounts.length === 0) && requestAccessIfNeeded) {
    await provider.send('eth_requestAccounts', [])
    accounts = await provider.send('eth_accounts', [])
  }

  if (!accounts || accounts.length === 0) {
    return { provider, accounts: [] }
  }

  const signer = await provider.getSigner()
  await assertCorrectNetwork(signer.provider)
  const address = accounts[0] || (await signer.getAddress())
  return { provider, signer, accounts, address }
}

async function ensureRpcReachable(provider) {
  try {
    await provider.getBlockNumber()
  } catch (err) {
    console.error('Falha ao conectar à RPC configurada:', err)
    // tentar recuperar nome da network para mensagem mais clara
    let targetName = 'desconhecida'
    try {
      const deployments = await getCachedDeployments()
      targetName = deployments?.network || targetName
    } catch (e) {
      // ignore
    }
    throw new Error(
      `Não foi possível conectar ao RPC ${DEFAULT_RPC}. Verifique se o endpoint da rede ${targetName} está acessível (ex.: Hardhat local com npm run chain ou RPC público da Sepolia configurado em VITE_RPC_URL).`
    )
  }
}

export async function getWalletProvider() {
  const connection = await getInjectedConnection()
  if (!connection?.provider) {
    throw new Error('Nenhuma carteira encontrada. Instale MetaMask ou configure a carteira de laboratório (apenas rede local).')
  }
  return connection.provider
}

export async function getLabWalletSigner() {
  const deployments = await getCachedDeployments()
  const labEnabled = deployments?.network === 'localhost' && import.meta.env.VITE_ENABLE_LAB_WALLET !== 'false'
  if (!labEnabled) {
    throw new Error('Carteira de laboratório desabilitada. Configure VITE_ENABLE_LAB_WALLET=true para habilitar o fallback.')
  }
  const provider = await getReadOnlyProvider()
  return new ethers.Wallet(LAB_WALLET_KEY, provider)
}

export const labWalletAddress = new ethers.Wallet(LAB_WALLET_KEY).address

export async function getSignerWithFallback({ allowLabWallet = true } = {}) {
  const injected = await getInjectedConnection()

  if (injected?.signer) {
    return { signer: injected.signer, address: injected.address, type: 'injected' }
  }

  if (allowLabWallet) {
    const signer = await getLabWalletSigner()
    await assertCorrectNetwork(signer.provider)
    const address = await signer.getAddress()
    return { signer, address, type: 'lab' }
  }

  throw new Error('Nenhuma carteira encontrada. Instale MetaMask ou habilite a carteira de laboratório (somente para rede local).')
}

export async function connectWallet(options = {}) {
  const { signer, type, address } = await getSignerWithFallback(options)
  const resolvedAddress = address || (await signer.getAddress())
  return { signer, address: resolvedAddress, type }
}

export async function connectLabWallet() {
  const signer = await getLabWalletSigner()
  await assertCorrectNetwork(signer.provider)
  const address = await signer.getAddress()
  return { signer, address, type: 'lab' }
}

export async function getWalletSigner(options = {}) {
  const { signer } = await getSignerWithFallback(options)
  return signer
}

export async function detectExistingWalletConnection() {
  const injected = await getInjectedConnection({ requestAccessIfNeeded: false })
  if (!injected) {
    return { hasProvider: false, address: null, type: null }
  }

  if (!injected.address) {
    return { hasProvider: true, address: null, type: null }
  }

  return { hasProvider: true, address: injected.address, type: 'injected' }
}

function getIdentityContract(providerOrSigner) {
  return new ethers.Contract(identityDescriptor.address, identityDescriptor.abi, providerOrSigner)
}

function getEventContract(providerOrSigner) {
  return new ethers.Contract(eventDescriptor.address, eventDescriptor.abi, providerOrSigner)
}

export async function fetchIdentity(address) {
  const provider = await getReadOnlyProvider()
  await ensureRpcReachable(provider)
  const contract = getIdentityContract(provider)
  const [identity, exists] = await contract.getIdentity(address)
  if (!exists) return null
  return formatIdentity(identity)
}

export async function fetchIdentities() {
  const provider = await getReadOnlyProvider()
  await ensureRpcReachable(provider)
  const contract = getIdentityContract(provider)
  const identities = await contract.getAllIdentities()
  return identities.map(formatIdentity)
}

export async function fetchIdentityByMatricula(matricula) {
  const provider = await getReadOnlyProvider()
  await ensureRpcReachable(provider)
  const contract = getIdentityContract(provider)
  const [identity, exists] = await contract.getIdentityByMatricula(matricula)
  if (!exists || identity.account === ethers.ZeroAddress) return null
  return formatIdentity(identity)
}

export async function registerIdentity({ name, matricula, curso }) {
  const signer = await getWalletSigner()
  const contract = getIdentityContract(signer)
  const tx = await contract.registerIdentity(name, matricula, curso)
  const receipt = await tx.wait()
  return receipt
}

export async function updateIdentity({ name, curso }) {
  const signer = await getWalletSigner()
  const contract = getIdentityContract(signer)
  const tx = await contract.updateIdentity(name, curso)
  return tx.wait()
}

export async function fetchEvents(ownerAddress) {
  const provider = await getReadOnlyProvider()
  await ensureRpcReachable(provider)
  const contract = getEventContract(provider)
  if (ownerAddress) {
    const events = await contract.getEventsByOwner(ownerAddress)
    return events.map(formatEvent)
  }
  const events = await contract.getAllEvents()
  return events.map(formatEvent)
}

export async function fetchEventById(id) {
  const provider = await getReadOnlyProvider()
  await ensureRpcReachable(provider)
  const contract = getEventContract(provider)
  const [event, exists] = await contract.getEvent(id)
  if (!exists) return null
  return formatEvent(event)
}

export async function createEvent({ title, description, eventDate }) {
  const signer = await getWalletSigner()
  const contract = getEventContract(signer)
  const tx = await contract.createEvent(title, description, eventDate)
  const receipt = await tx.wait()
  return receipt
}

export function formatIdentity(identity) {
  return {
    account: identity.account,
    name: identity.name,
    matricula: identity.matricula,
    curso: identity.curso,
    createdAt: identity.createdAt ? Number(identity.createdAt) : 0,
  }
}

export function formatEvent(event) {
  return {
    id: event.id ? Number(event.id) : 0,
    owner: event.owner,
    title: event.title,
    description: event.description,
    eventDate: event.eventDate ? Number(event.eventDate) : 0,
    createdAt: event.createdAt ? Number(event.createdAt) : 0,
  }
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(Number(timestamp) * 1000)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString()
}
