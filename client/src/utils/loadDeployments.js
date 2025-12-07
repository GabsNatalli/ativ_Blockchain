
// client/src/utils/loadDeployments.js
export default async function getDeployments() {
  if (typeof window === 'undefined' || !window.ethereum) {
    const d = (await import('../contracts/deployments.localhost.json')).default
    console.log('[loadDeployments] no window.ethereum — using deployments.localhost.json', d)
    return d
  }
  const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
  const chainId = parseInt(chainIdHex, 16)
  if (chainId === 11155111) {
    const d = (await import('../contracts/deployments.sepolia.json')).default
    console.log('[loadDeployments] detected Sepolia (11155111) — using deployments.sepolia.json', d)
    return d
  } else if (chainId === 31337) {
    const d = (await import('../contracts/deployments.localhost.json')).default
    console.log('[loadDeployments] detected localhost (31337) — using deployments.localhost.json', d)
    return d
  } else {
    const d = (await import('../contracts/deployments.sepolia.json')).default
    console.log('[loadDeployments] detected unknown chain', chainId, '— falling back to deployments.sepolia.json', d)
    return d
  }
}

let _deploymentsCache = null
export async function getCachedDeployments() {
  if (!_deploymentsCache) _deploymentsCache = getDeployments()
  return await _deploymentsCache
}

