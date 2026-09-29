import { useState } from 'react'

type DashboardPageProps = {
  onLogout: () => void
}

const REQUESTS = [
  { fecha: '18 Jun 2026', planilla: 'PLA-2026-0184', ruc: '20123456789', razon: 'Distribuidora Andina S.A.C.', moneda: 'PEN', monto: 'S/ 128,450.00', estado: 'En evaluación' },
  { fecha: '17 Jun 2026', planilla: 'PLA-2026-0183', ruc: '20548796321', razon: 'Servicios Industriales del Pacífico', moneda: 'USD', monto: 'US$ 42,780.00', estado: 'Desembolsado' },
  { fecha: '14 Jun 2026', planilla: 'PLA-2026-0182', ruc: '20478523619', razon: 'Comercial San Martín S.R.L.', moneda: 'PEN', monto: 'S/ 86,200.00', estado: 'Pendiente MFA' },
  { fecha: '12 Jun 2026', planilla: 'PLA-2026-0181', ruc: '20632147895', razon: 'Logística Integral Perú S.A.C.', moneda: 'PEN', monto: 'S/ 214,900.00', estado: 'Desembolsado' },
  { fecha: '10 Jun 2026', planilla: 'PLA-2026-0180', ruc: '20198745632', razon: 'Tecnología y Datos del Sur S.A.', moneda: 'USD', monto: 'US$ 31,650.00', estado: 'Observado' },
  { fecha: '08 Jun 2026', planilla: 'PLA-2026-0179', ruc: '20512369874', razon: 'Inversiones Costa Verde S.A.C.', moneda: 'PEN', monto: 'S/ 175,300.00', estado: 'Desembolsado' },
]

const WIZARD_STEPS = [
  'Adjuntar Excel',
  'Resumen',
  'Validación MFA',
  'Pricing',
  'Simulación',
  'Resultado',
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
        <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="font-display font-bold text-white tracking-tight">Factoring<span className="text-teal-400">Web</span></span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Desembolsado': 'bg-teal-400/10 text-teal-600 border-teal-400/20',
    'En evaluación': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Pendiente MFA': 'bg-amber-50 text-amber-700 border-amber-200',
    'Observado': 'bg-red-50 text-red-600 border-red-100',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function MetricCard({ label, value, caption, accent = 'blue' }: { label: string; value: string; caption: string; accent?: 'blue' | 'teal' }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent === 'teal' ? 'bg-teal-400/10 text-teal-400' : 'bg-blue-500/10 text-blue-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={accent === 'teal' ? 'm4.5 12.75 6 6 9-13.5' : 'M3 13.13C3 12.5 3.5 12 4.13 12h2.25c.62 0 1.12.5 1.12 1.13v6.75c0 .62-.5 1.12-1.13 1.12H4.13C3.5 21 3 20.5 3 19.88v-6.75ZM9.75 8.63c0-.63.5-1.13 1.13-1.13h2.25c.62 0 1.12.5 1.12 1.13v11.25c0 .62-.5 1.12-1.13 1.12h-2.25c-.62 0-1.12-.5-1.12-1.13V8.63ZM16.5 4.13c0-.63.5-1.13 1.13-1.13h2.25C20.5 3 21 3.5 21 4.13v15.75c0 .62-.5 1.12-1.13 1.12h-2.25c-.62 0-1.12-.5-1.12-1.13V4.13Z'} />
          </svg>
        </span>
      </div>
      <div className="font-display text-2xl font-bold text-navy-900 mt-3">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{caption}</div>
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="grid grid-cols-6 border-b border-slate-100 bg-slate-50/70 px-5 lg:px-8 py-5">
      {WIZARD_STEPS.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <div key={label} className="relative flex flex-col items-center gap-2">
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`absolute top-4 left-1/2 w-full h-0.5 ${index < current ? 'bg-teal-400' : 'bg-slate-200'}`} />
            )}
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              done ? 'bg-teal-400 text-white' : active ? 'bg-blue-500 text-white ring-4 ring-blue-500/15' : 'bg-white border border-slate-200 text-slate-400'
            }`}>
              {done ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : index + 1}
            </div>
            <span className={`hidden md:block text-[10px] font-semibold text-center ${active ? 'text-blue-500' : done ? 'text-teal-500' : 'text-slate-400'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function WizardContent({ step, fileName, setFileName, otp, setOtp }: {
  step: number
  fileName: string
  setFileName: (name: string) => void
  otp: string
  setOtp: (value: string) => void
}) {
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Adjunta tus facturas</h2>
          <p className="text-sm text-slate-500 mt-1">Carga la planilla Excel con el detalle de las facturas que deseas negociar.</p>
        </div>
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/25 bg-blue-500/[0.03] p-8 text-center hover:border-blue-500/50 hover:bg-blue-500/[0.05] transition-all">
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
          <span className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </span>
          <span className="font-semibold text-navy-900">{fileName || 'Arrastra tu archivo o haz clic para seleccionar'}</span>
          <span className="text-xs text-slate-400 mt-2">Formato XLS o XLSX · Máximo 10 MB</span>
          {fileName && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-400/10 px-3 py-1.5 text-xs font-semibold text-teal-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              Archivo listo para procesar
            </span>
          )}
        </label>
        <button className="text-sm font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M8.25 12 12 15.75 15.75 12M12 15.75V3" /></svg>
          Descargar plantilla de ejemplo
        </button>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Resumen de planillas</h2>
          <p className="text-sm text-slate-500 mt-1">Validamos el archivo y encontramos 12 facturas en 2 planillas.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <MetricCard label="Facturas" value="12" caption="Sin observaciones" />
          <MetricCard label="Monto total" value="S/ 284,500" caption="2 planillas" accent="teal" />
          <MetricCard label="Vencimiento prom." value="47 días" caption="Al 04 Ago 2026" />
        </div>
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="text-left px-5 py-3">Planilla</th><th className="text-left px-5 py-3">Facturas</th><th className="text-left px-5 py-3">Moneda</th><th className="text-right px-5 py-3">Monto</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-navy-900">
              <tr><td className="px-5 py-4 font-semibold">PLA-2026-0185</td><td className="px-5 py-4">7</td><td className="px-5 py-4">PEN</td><td className="px-5 py-4 text-right font-semibold">S/ 174,800.00</td></tr>
              <tr><td className="px-5 py-4 font-semibold">PLA-2026-0186</td><td className="px-5 py-4">5</td><td className="px-5 py-4">PEN</td><td className="px-5 py-4 text-right font-semibold">S/ 109,700.00</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="text-center max-w-md mx-auto py-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 11.99 11.99 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75-3.2 0-6.1-1.25-8.4-3.29Z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-navy-900 mt-6">Autoriza la operación</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Ingresa el código temporal generado por Google Authenticator para subir las planillas a la plataforma.</p>
        <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus placeholder="000000" className="mt-7 w-full rounded-2xl border border-slate-200 py-4 text-center font-display text-2xl font-bold tracking-[0.5em] text-navy-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
        <div className="flex justify-between text-xs text-slate-400 mt-3"><span>Código de 6 dígitos</span><span>Se renueva cada 30 segundos</span></div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-600 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />Pricing disponible</span>
          <h2 className="font-display text-2xl font-bold text-navy-900">Tasa de descuento</h2>
          <p className="text-sm text-slate-500 mt-1">Oferta calculada según el perfil de riesgo y plazo de tus facturas.</p>
        </div>
        <div className="hero-mesh rounded-2xl p-7 text-white relative overflow-hidden">
          <div className="relative grid sm:grid-cols-3 gap-6">
            <div><div className="text-xs text-white/45 uppercase tracking-wider">Tasa mensual</div><div className="font-display text-4xl font-bold mt-2">1.18%</div><div className="text-xs text-teal-400 mt-1">Oferta preferencial</div></div>
            <div><div className="text-xs text-white/45 uppercase tracking-wider">Plazo promedio</div><div className="font-display text-3xl font-bold mt-2">47 días</div></div>
            <div><div className="text-xs text-white/45 uppercase tracking-wider">Vigencia</div><div className="font-display text-3xl font-bold mt-2">14:52</div><div className="text-xs text-white/40 mt-1">minutos restantes</div></div>
          </div>
        </div>
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 flex gap-3 text-sm text-blue-700">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.04-.02a.75.75 0 0 1 1.06.85l-.7 2.84a.75.75 0 0 0 1.06.85l.04-.02M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.01v.01H12V8.25Z" /></svg>
          La tasa incluye validación, administración y gestión de cobranza.
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Simulación de negociación</h2>
          <p className="text-sm text-slate-500 mt-1">Revisa el detalle final antes de solicitar el desembolso.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {[
            ['Valor nominal de facturas', 'S/ 284,500.00'],
            ['Tasa de descuento mensual', '1.18%'],
            ['Descuento por financiamiento', '− S/ 5,269.72'],
            ['Comisión operativa', '− S/ 420.00'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between px-6 py-4 border-b border-slate-100 text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold text-navy-900">{value}</span></div>
          ))}
          <div className="flex justify-between items-end px-6 py-6 bg-navy-900 text-white">
            <div><div className="text-xs text-white/45 uppercase tracking-wider">Monto a desembolsar</div><div className="text-sm text-white/60 mt-1">Cuenta BCP terminada en 4821</div></div>
            <div className="font-display text-3xl font-bold">S/ 278,810.28</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-3">
      <div className="relative w-24 h-24 mx-auto">
        <div className="absolute inset-0 rounded-full bg-teal-400/15 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-teal-400/30">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        </div>
      </div>
      <h2 className="font-display text-3xl font-bold text-navy-900 mt-7">Desembolso realizado</h2>
      <p className="text-slate-500 mt-2 max-w-md mx-auto">La transferencia fue procesada correctamente a la cuenta bancaria registrada del cliente.</p>
      <div className="mt-7 max-w-md mx-auto rounded-2xl bg-slate-50 border border-slate-100 p-5 grid grid-cols-2 gap-4 text-left">
        <div><div className="text-xs text-slate-400">Operación</div><div className="text-sm font-semibold text-navy-900 mt-1">OP-9841026</div></div>
        <div><div className="text-xs text-slate-400">Monto transferido</div><div className="text-sm font-semibold text-teal-600 mt-1">S/ 278,810.28</div></div>
        <div><div className="text-xs text-slate-400">Fecha y hora</div><div className="text-sm font-semibold text-navy-900 mt-1">18 Jun, 10:42</div></div>
        <div><div className="text-xs text-slate-400">Estado</div><div className="text-sm font-semibold text-teal-600 mt-1">Completado</div></div>
      </div>
    </div>
  )
}

function NegotiationWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [otp, setOtp] = useState('')
  const canContinue = step !== 0 || !!fileName

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/65 backdrop-blur-sm p-3 lg:p-8 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-500">Nueva negociación</div>
              <div className="font-display font-bold text-navy-900 mt-0.5">Negociar Facturas</div>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-navy-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <Stepper current={step} />
          <div className="px-6 lg:px-10 py-8 min-h-[27rem]">
            <WizardContent step={step} fileName={fileName} setFileName={setFileName} otp={otp} setOtp={setOtp} />
          </div>
          <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-t border-slate-100 bg-slate-50/70">
            {step === 5 ? <span /> : (
              <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                {step === 0 ? 'Cancelar' : 'Atrás'}
              </button>
            )}
            {step === 5 ? (
              <button onClick={onClose} className="btn-primary ml-auto rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">Ir a Bandeja de Solicitudes</button>
            ) : (
              <button onClick={() => setStep(s => s + 1)} disabled={!canContinue || (step === 2 && otp.length !== 6)} className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
                {step === 4 ? 'Desembolsar' : step === 3 ? 'Aceptar tasa' : 'Continuar'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage({ onLogout }: DashboardPageProps) {
  const [filter, setFilter] = useState('Todos')
  const [wizardOpen, setWizardOpen] = useState(false)
  const visible = filter === 'Todos' ? REQUESTS : REQUESTS.filter(row => row.estado === filter)

  return (
    <div className="min-h-screen bg-slate-50 text-navy-900">
      <header className="bg-navy-900 h-16 px-5 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-navy-900/10">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden md:flex items-center gap-1">
            <span className="bg-white/10 text-white rounded-lg px-3 py-2 text-sm font-medium">Solicitudes</span>
            <span className="text-white/45 px-3 py-2 text-sm">Reportes</span>
            <span className="text-white/45 px-3 py-2 text-sm">Ayuda</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-full bg-white/5 text-white/55 flex items-center justify-center hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.86 17.08a23.85 23.85 0 0 0 5.45-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.31 6.02c1.78.58 3.6 1.02 5.45 1.31m5.72 0a24.26 24.26 0 0 1-5.72 0m5.72 0a3 3 0 1 1-5.72 0" /></svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400 border-2 border-navy-900" />
          </button>
          <div className="h-8 w-px bg-white/10" />
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-white">Carlos Medina</div>
            <button onClick={onLogout} className="text-[11px] text-white/40 hover:text-white/70">Cerrar sesión</button>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 text-white flex items-center justify-center text-xs font-bold">CM</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><span>Portal de Clientes</span><span>/</span><span className="text-blue-500">Solicitudes</span></div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">Bandeja de Solicitudes</h1>
            <p className="text-sm text-slate-500 mt-2">Gestiona y consulta tus operaciones de factoring.</p>
          </div>
          <button onClick={() => setWizardOpen(true)} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Negociar Facturas
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <MetricCard label="En proceso" value="3 solicitudes" caption="S/ 429,550 negociados" />
          <MetricCard label="Desembolsado" value="S/ 390,200" caption="Durante junio 2026" accent="teal" />
          <MetricCard label="Tasa promedio" value="1.21%" caption="Últimos 90 días" />
          <MetricCard label="Tiempo promedio" value="6.4 h" caption="Hasta desembolso" accent="teal" />
        </div>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 lg:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
            <div>
              <h2 className="font-display font-bold text-navy-900">Solicitudes recientes</h2>
              <p className="text-xs text-slate-400 mt-1">{visible.length} operaciones encontradas</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">Estado</label>
              <div className="relative">
                <select value={filter} onChange={e => setFilter(e.target.value)} className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10">
                  {['Todos', 'En evaluación', 'Pendiente MFA', 'Desembolsado', 'Observado'].map(status => <option key={status}>{status}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400">
                  {['Fecha', 'Planilla', 'RUC', 'Razón Social', 'Moneda', 'Monto', 'Estado'].map((heading, i) => (
                    <th key={heading} className={`${i === 5 ? 'text-right' : 'text-left'} px-5 lg:px-6 py-3.5 font-semibold whitespace-nowrap`}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(row => (
                  <tr key={row.planilla} className="hover:bg-blue-500/[0.025] transition-colors">
                    <td className="px-5 lg:px-6 py-4 text-slate-500 whitespace-nowrap">{row.fecha}</td>
                    <td className="px-5 lg:px-6 py-4 font-semibold text-blue-500 whitespace-nowrap">{row.planilla}</td>
                    <td className="px-5 lg:px-6 py-4 text-slate-500 whitespace-nowrap">{row.ruc}</td>
                    <td className="px-5 lg:px-6 py-4 font-medium text-navy-900 min-w-60">{row.razon}</td>
                    <td className="px-5 lg:px-6 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">{row.moneda}</span></td>
                    <td className="px-5 lg:px-6 py-4 text-right font-semibold text-navy-900 whitespace-nowrap">{row.monto}</td>
                    <td className="px-5 lg:px-6 py-4 whitespace-nowrap"><StatusBadge status={row.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando {visible.length} de {REQUESTS.length} solicitudes</span>
            <div className="flex gap-1"><button className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400">‹</button><button className="w-8 h-8 rounded-lg bg-blue-500 text-white font-semibold">1</button><button className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400">›</button></div>
          </div>
        </section>
      </main>

      {wizardOpen && <NegotiationWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
