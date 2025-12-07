import React from 'react'

export default function ModalConfirm({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-surface">
        <h4 className="modal-title">{title || 'Confirmação'}</h4>
        <p className="section-subtitle">{message}</p>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="btn-danger" onClick={onConfirm} type="button">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
