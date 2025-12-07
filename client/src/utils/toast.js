export function showToast(text, timeout = 3000) {
  const containerId = 'app-toasts-container'
  let container = document.getElementById(containerId)
  if (!container) {
    container = document.createElement('div')
    container.id = containerId
    container.className = 'toast-container'
    document.body.appendChild(container)
  }

  const el = document.createElement('div')
  el.className = 'toast'
  el.innerText = text
  container.appendChild(el)

  setTimeout(() => {
    el.style.transition = 'opacity 0.25s ease'
    el.style.opacity = '0'
    setTimeout(() => container.removeChild(el), 250)
  }, timeout)
}
