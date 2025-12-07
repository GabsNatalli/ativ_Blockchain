import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((text, timeout = 3000) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((s) => [...s, { id, text }])
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), timeout)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
