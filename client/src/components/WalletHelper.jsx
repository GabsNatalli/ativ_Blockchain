import React from 'react'
import { labWalletAddress } from '../services/blockchain'

export default function WalletHelper() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-100 backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Tutorial detalhado</p>
            <h3 className="text-base font-semibold text-white">Passo a passo para conectar e registrar</h3>
            <p className="text-slate-200">
              Configure a rede local, escolha uma carteira e complete o login ou cadastro assinando os desafios exibidos na
              interface.
            </p>
          </div>
          <span className="inline-flex w-fit items-center justify-center rounded-lg bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Ajuda rápida
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-lg shadow-cyan-900/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Extensão do navegador</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-relaxed text-slate-100 marker:text-cyan-200">
              <li>Instale MetaMask ou Hardhat Wallet para ter uma carteira local.</li>
              <li>
                Aponte a rede RPC para
                <code className="ml-1 rounded bg-white/10 px-2 py-1">http://127.0.0.1:8545</code> e confirme a seleção no cabeçalho da extensão.
              </li>
              <li>
                Importe uma chave privada listada ao executar
                <code className="ml-1 rounded bg-white/10 px-2 py-1">npm run chain</code> ou crie uma conta nova.
              </li>
              <li>Retorne à aplicação e clique em “Conectar carteira instalada”.</li>
              <li>Preencha matrícula e nome exatamente como cadastrados e assine o desafio apresentado.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-emerald-200/30 bg-emerald-900/25 p-5 shadow-lg shadow-emerald-900/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Conta de laboratório</p>
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-emerald-50">
              <p>
                Ideal para máquinas de laboratório ou demonstrações rápidas. O botão “Usar conta de laboratório” conecta
                diretamente ao endereço abaixo, já configurado na rede local.
              </p>
              <div className="rounded-lg border border-emerald-200/40 bg-emerald-900/30 px-3 py-2 font-mono text-[12px] text-emerald-100">
                {labWalletAddress}
              </div>
            </div>
            <p className="mt-3 text-[12px] text-emerald-100/90">
              Use essa opção para registrar identidades de teste ou fazer login imediato sem instalar extensões. Para
              desabilitar, defina
              <code className="ml-1 rounded bg-white/10 px-2 py-1">VITE_ENABLE_LAB_WALLET=false</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
