import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function PhotoModal({ isOpen, src, alt, onClose }) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const handleOverlayClick = () => {
    onClose?.()
  }

  const stopPropagation = (event) => {
    event.stopPropagation()
  }

  const modalContent = (
    <div
      className="photo-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização da foto de perfil"
      onClick={handleOverlayClick}
    >
      <div className="photo-modal__dialog" onClick={stopPropagation}>
        <button
          type="button"
          className="photo-modal__close"
          onClick={onClose}
          aria-label="Fechar visualização da foto"
        >
          <span className="photo-modal__close-icon" aria-hidden="true" />
        </button>
        {src ? (
          <img src={src} alt={alt || 'Foto de perfil ampliada'} className="photo-modal__image" />
        ) : null}
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return modalContent
  }

  return createPortal(modalContent, document.body)
}
