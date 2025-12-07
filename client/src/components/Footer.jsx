import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div>
          <div className="app-footer__title">Lab Redes • Identidades descentralizadas</div>
          <p className="app-footer__subtitle">
            Autenticação por assinatura digital e eventos registrados diretamente na blockchain local.
          </p>
        </div>

        <div className="app-footer__meta">
          <span className="app-footer__chip">Atualizado {year}</span>
          <span className="app-footer__muted">Hardhat EVM privada • Dados públicos on-chain</span>
        </div>
      </div>
    </footer>
  )
}
