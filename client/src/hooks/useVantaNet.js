import { useEffect, useRef } from 'react'

const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
const VANTA_NET_SRC = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js'

const scriptPromises = {}

function loadScript(src) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document is not available'))
  }

  if (scriptPromises[src]) {
    return scriptPromises[src]
  }

  scriptPromises[src] = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve()
      } else {
        existing.addEventListener('load', resolve, { once: true })
        existing.addEventListener(
          'error',
          () => reject(new Error(`Falha ao carregar script: ${src}`)),
          { once: true }
        )
      }
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true')
      resolve()
    })
    script.addEventListener('error', () => {
      reject(new Error(`Falha ao carregar script: ${src}`))
    })
    document.body.appendChild(script)
  })

  return scriptPromises[src]
}

export default function useVantaNet() {
  const elementRef = useRef(null)

  useEffect(() => {
    let effect = null
    let isActive = true

    const initialize = async () => {
      try {
        await loadScript(THREE_SRC)
        await loadScript(VANTA_NET_SRC)

        if (!isActive || !elementRef.current) {
          return
        }

        const vanta = typeof window !== 'undefined' ? window.VANTA : undefined
        if (!vanta?.NET) {
          return
        }

        effect = vanta.NET({
          el: elementRef.current,
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
      } catch (error) {
        console.error('Erro ao iniciar o efeito Vanta', error)
      }
    }

    initialize()

    return () => {
      isActive = false
      if (effect && typeof effect.destroy === 'function') {
        effect.destroy()
      }
    }
  }, [])

  return elementRef
}
