import { useState } from 'react'

/* ── Types ────────────────────────────────────────────────── */
interface FormData {
  // step 1
  socialProvider: 'google' | 'facebook' | null
  socialEmail: string
  socialName: string
  // step 2
  dni: string
  telefono: string
  clave: string
  confirmarClave: string
  // step 3
  ruc: string
  razonSocial: string
  numeroCuenta: string
  moneda: 'PEN' | 'USD'
}

const INITIAL: FormData = {
  socialProvider: null,
  socialEmail: '',
  socialName: '',
  dni: '',
  telefono: '',
  clave: '',
  confirmarClave: '',
  ruc: '',
  razonSocial: '',
  numeroCuenta: '',
  moneda: 'PEN',
}

/* ── Step meta ────────────────────────────────────────────── */
const STEPS = [
  { label: 'Acceso', short: '1' },
  { label: 'Representante Legal', short: '2' },
  { label: 'Empresa', short: '3' },
  { label: 'Resumen', short: '4' },
  { label: 'Confirmación', short: '5' },
]

/* ── Helpers ──────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#0a1628]/60 uppercase tracking-wider mb-1.5">{children}</label>
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[#0a1628] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e6bff]/30 focus:border-[#1e6bff] transition-all placeholder:text-slate-300"
    />
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[#0a1628] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e6bff]/30 focus:border-[#1e6bff] transition-all appearance-none cursor-pointer"
    >
      {children}
    </select>
  )
}

/* ── Progress bar ─────────────────────────────────────────── */
function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full max-w-2xl mx-auto">
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            {/* circle */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  done
                    ? 'bg-[#00d4aa] text-white shadow-md shadow-teal-400/30'
                    : active
                    ? 'bg-[#1e6bff] text-white shadow-lg shadow-blue-500/30 ring-4 ring-[#1e6bff]/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  s.short
                )}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block whitespace-nowrap ${active ? 'text-[#1e6bff]' : done ? 'text-[#00d4aa]' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {/* connector */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-[#00d4aa] to-[#1e6bff] transition-all duration-500"
                  style={{ width: done ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Step 1: Social login ─────────────────────────────────── */
function Step1({
  data,
  onSelect,
}: {
  data: FormData
  onSelect: (provider: 'google' | 'facebook', email: string, name: string) => void
}) {
  const [pending, setPending] = useState<'google' | 'facebook' | null>(null)

  const simulate = (provider: 'google' | 'facebook') => {
    setPending(provider)
    setTimeout(() => {
      const mock = provider === 'google'
        ? { email: 'usuario@gmail.com', name: 'Carlos Medina' }
        : { email: 'usuario@facebook.com', name: 'Carlos Medina' }
      onSelect(provider, mock.email, mock.name)
      setPending(null)
    }, 1200)
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-bold text-[#0a1628] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Crea tu cuenta
        </h2>
        <p className="text-sm text-gray-500">Elige cómo quieres registrarte. Es gratis y toma menos de 3 minutos.</p>
      </div>

      {/* Providers */}
      <div className="space-y-3">
        <button
          onClick={() => simulate('google')}
          disabled={!!pending}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
            data.socialProvider === 'google'
              ? 'border-[#1e6bff] bg-[#f0f4ff] text-[#1e6bff]'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#0a1628]'
          }`}
        >
          {pending === 'google' ? (
            <svg className="w-5 h-5 animate-spin text-[#1e6bff]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {data.socialProvider === 'google' ? `Conectado como ${data.socialEmail}` : 'Continuar con Google'}
        </button>

        <button
          onClick={() => simulate('facebook')}
          disabled={!!pending}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
            data.socialProvider === 'facebook'
              ? 'border-[#1877F2] bg-blue-50 text-[#1877F2]'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#0a1628]'
          }`}
        >
          {pending === 'facebook' ? (
            <svg className="w-5 h-5 animate-spin text-[#1877F2]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
          {data.socialProvider === 'facebook' ? `Conectado como ${data.socialEmail}` : 'Continuar con Facebook'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs text-slate-400">Acceso seguro y encriptado</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        Al registrarte aceptas nuestros{' '}
        <a href="#" className="text-[#1e6bff] hover:underline">Términos de servicio</a> y{' '}
        <a href="#" className="text-[#1e6bff] hover:underline">Política de privacidad</a>.
      </p>
    </div>
  )
}

/* ── Step 2: Datos Representante Legal ───────────────────── */
function Step2({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  const [showClave, setShowClave] = useState(false)

  const strength = (() => {
    const p = data.clave
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()

  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength]
  const strengthColor = ['', '#ef4444', '#f97316', '#3b82f6', '#00d4aa'][strength]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#0a1628] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Representante Legal
        </h2>
        <p className="text-sm text-gray-500">Datos del responsable de la empresa ante FactoringWeb.</p>
      </div>

      {data.socialProvider && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f0f4ff] border border-[#1e6bff]/20">
          <svg className="w-4 h-4 text-[#1e6bff] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span className="text-sm text-[#1e6bff]">Cuenta vinculada: <strong>{data.socialEmail}</strong></span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre completo</Label>
          <Input value={data.socialName} onChange={v => set('socialName', v)} placeholder="Carlos Medina Ríos" />
        </div>
        <div>
          <Label>DNI</Label>
          <Input value={data.dni} onChange={v => set('dni', v.replace(/\D/g, ''))} placeholder="12345678" maxLength={8} />
        </div>
        <div>
          <Label>Teléfono celular</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 select-none">+51</span>
            <input
              type="tel"
              value={data.telefono}
              onChange={e => set('telefono', e.target.value.replace(/\D/g, ''))}
              placeholder="987 654 321"
              maxLength={9}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-[#0a1628] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e6bff]/30 focus:border-[#1e6bff] transition-all placeholder:text-slate-300"
            />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Contraseña</Label>
          <div className="relative">
            <input
              type={showClave ? 'text' : 'password'}
              value={data.clave}
              onChange={e => set('clave', e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 text-[#0a1628] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e6bff]/30 focus:border-[#1e6bff] transition-all placeholder:text-slate-300"
            />
            <button
              type="button"
              onClick={() => setShowClave(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showClave ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
          {data.clave && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <div
                    key={n}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: n <= strength ? strengthColor : '#e2e8f0' }}
                  />
                ))}
              </div>
              <p className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
            </div>
          )}
        </div>
        <div>
          <Label>Confirmar contraseña</Label>
          <input
            type="password"
            value={data.confirmarClave}
            onChange={e => set('confirmarClave', e.target.value)}
            placeholder="Repite tu contraseña"
            className={`w-full px-4 py-3 rounded-xl border text-[#0a1628] text-sm bg-white focus:outline-none focus:ring-2 focus:border-[#1e6bff] transition-all placeholder:text-slate-300 ${
              data.confirmarClave && data.clave !== data.confirmarClave
                ? 'border-red-300 focus:ring-red-200'
                : 'border-slate-200 focus:ring-[#1e6bff]/30'
            }`}
          />
          {data.confirmarClave && data.clave !== data.confirmarClave && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Step 3: Datos de la Empresa ──────────────────────────── */
function Step3({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#0a1628] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Datos de la Empresa
        </h2>
        <p className="text-sm text-gray-500">Información de la empresa que deseas registrar en FactoringWeb.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>RUC</Label>
          <Input value={data.ruc} onChange={v => set('ruc', v.replace(/\D/g, ''))} placeholder="20123456789" maxLength={11} />
          {data.ruc && data.ruc.length !== 11 && (
            <p className="text-xs text-amber-500 mt-1">El RUC debe tener 11 dígitos</p>
          )}
        </div>
        <div>
          <Label>Razón Social</Label>
          <Input value={data.razonSocial} onChange={v => set('razonSocial', v)} placeholder="Mi Empresa S.A.C." />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Número de Cuenta Bancaria</Label>
          <Input value={data.numeroCuenta} onChange={v => set('numeroCuenta', v.replace(/\D/g, ''))} placeholder="001-2345678-0-01" maxLength={20} />
        </div>
        <div>
          <Label>Moneda</Label>
          <div className="relative">
            <Select value={data.moneda} onChange={v => set('moneda', v)}>
              <option value="PEN">🇵🇪  Soles (PEN)</option>
              <option value="USD">🇺🇸  Dólares (USD)</option>
            </Select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-[#f0f4ff] border border-[#1e6bff]/15">
        <svg className="w-5 h-5 text-[#1e6bff] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <p className="text-xs text-[#1e6bff]/80 leading-relaxed">
          El número de cuenta bancaria será usado para depositar los montos anticipados de tus facturas. Verifica que los datos sean correctos antes de continuar.
        </p>
      </div>
    </div>
  )
}

/* ── Step 4: Resumen ──────────────────────────────────────── */
function Step4({ data, goTo }: { data: FormData; goTo: (s: number) => void }) {
  const Row = ({ label, value, step }: { label: string; value: string; step: number }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 group">
      <div>
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="font-medium text-[#0a1628] text-sm mt-0.5">{value || '—'}</div>
      </div>
      <button
        onClick={() => goTo(step)}
        className="text-xs text-[#1e6bff] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Editar
      </button>
    </div>
  )

  const providerIcon = data.socialProvider === 'google'
    ? <svg viewBox="0 0 24 24" className="w-4 h-4 inline mr-1"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
    : <svg viewBox="0 0 24 24" className="w-4 h-4 inline mr-1" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0a1628] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          Resumen del registro
        </h2>
        <p className="text-sm text-gray-500">Revisa tus datos antes de confirmar. Pasa el cursor sobre cada fila para editar.</p>
      </div>

      {/* Personal */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#f8faff] border-b border-slate-100">
          <span className="text-xs font-bold text-[#0a1628]/60 uppercase tracking-wider">Representante Legal</span>
          <button onClick={() => goTo(1)} className="text-xs text-[#1e6bff] hover:underline">Editar</button>
        </div>
        <div className="px-5">
          <Row label="Acceso" value={`${providerIcon}${data.socialEmail}`} step={0} />
          <Row label="Nombre completo" value={data.socialName} step={1} />
          <Row label="DNI" value={data.dni} step={1} />
          <Row label="Teléfono" value={data.telefono ? `+51 ${data.telefono}` : ''} step={1} />
          <Row label="Contraseña" value="••••••••" step={1} />
        </div>
      </div>

      {/* Empresa */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#f8faff] border-b border-slate-100">
          <span className="text-xs font-bold text-[#0a1628]/60 uppercase tracking-wider">Empresa</span>
          <button onClick={() => goTo(2)} className="text-xs text-[#1e6bff] hover:underline">Editar</button>
        </div>
        <div className="px-5">
          <Row label="RUC" value={data.ruc} step={2} />
          <Row label="Razón Social" value={data.razonSocial} step={2} />
          <Row label="Número de Cuenta" value={data.numeroCuenta} step={2} />
          <Row label="Moneda" value={data.moneda === 'PEN' ? '🇵🇪 Soles (PEN)' : '🇺🇸 Dólares (USD)'} step={2} />
        </div>
      </div>

      <div className="flex gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
        <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          Una vez confirmado, recibirás un correo de verificación en <strong>{data.socialEmail}</strong>. Tus datos son procesados con encriptación AES-256.
        </p>
      </div>
    </div>
  )
}

/* ── Step 5: Confirmación ─────────────────────────────────── */
function Step5({ data, onHome }: { data: FormData; onHome: () => void }) {
  return (
    <div className="text-center space-y-8">
      {/* Success animation */}
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-[#00d4aa]/15 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#1e6bff] flex items-center justify-center shadow-2xl shadow-teal-400/30">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-[#0a1628]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
          ¡Registro exitoso!
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
          Tu cuenta en FactoringWeb ha sido creada correctamente. Hemos enviado un correo de verificación a <strong className="text-[#0a1628]">{data.socialEmail}</strong>.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 gap-4 text-left">
        <div className="rounded-2xl border border-slate-100 p-5 space-y-3 bg-[#f8faff]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1e6bff]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1e6bff]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#0a1628]/60 uppercase tracking-wider">Representante Legal</span>
          </div>
          <div className="space-y-2">
            <InfoRow icon="👤" label={data.socialName} />
            <InfoRow icon="🪪" label={`DNI: ${data.dni}`} />
            <InfoRow icon="📱" label={`+51 ${data.telefono}`} />
            <InfoRow icon="✉️" label={data.socialEmail} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 p-5 space-y-3 bg-[#f8faff]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00d4aa]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#00d4aa]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#0a1628]/60 uppercase tracking-wider">Empresa</span>
          </div>
          <div className="space-y-2">
            <InfoRow icon="🏢" label={data.razonSocial} />
            <InfoRow icon="🔢" label={`RUC: ${data.ruc}`} />
            <InfoRow icon="🏦" label={`Cta: ${data.numeroCuenta}`} />
            <InfoRow icon="💰" label={data.moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares (USD)'} />
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="rounded-2xl bg-[#0a1628] p-6 text-left space-y-3">
        <p className="text-sm font-semibold text-white mb-4">Próximos pasos</p>
        {[
          'Verifica tu correo electrónico para activar tu cuenta',
          'Carga tu primera factura y recibe tu liquidez en 24h',
          'Tu ejecutivo de cuenta te contactará en las próximas horas',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#1e6bff]/20 text-[#4d8fff] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-white/70">{step}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onHome}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#1e6bff] to-[#1550cc] text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200"
      >
        Ir al Panel Principal
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  )
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  )
}

/* ── Validation ───────────────────────────────────────────── */
function canAdvance(step: number, data: FormData): boolean {
  if (step === 0) return !!data.socialProvider
  if (step === 1)
    return data.dni.length === 8 && data.telefono.length === 9 && data.clave.length >= 8 && data.clave === data.confirmarClave && !!data.socialName
  if (step === 2)
    return data.ruc.length === 11 && !!data.razonSocial && data.numeroCuenta.length >= 8
  return true
}

/* ── Main RegisterPage ────────────────────────────────────── */
export default function RegisterPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)

  const set = (k: keyof FormData, v: string) => setData(prev => ({ ...prev, [k]: v }))

  const next = () => {
    if (step === 3) {
      setSubmitting(true)
      setTimeout(() => { setSubmitting(false); setStep(4) }, 1600)
      return
    }
    setStep(s => s + 1)
  }

  const back = () => setStep(s => s - 1)

  const isLast = step === 4

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col">
      {/* Top bar */}
      <header className="hero-mesh border-b border-white/10 h-14 flex items-center px-6 lg:px-8 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors mr-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Volver al inicio
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1e6bff] to-[#00d4aa] flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            Factoring<span className="text-[#00d4aa]">Web</span>
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        {/* Stepper — hide on final */}
        {!isLast && (
          <div className="w-full max-w-2xl mb-10">
            <Stepper current={step} />
          </div>
        )}

        {/* Card */}
        <div className={`w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 lg:p-10 ${isLast ? 'max-w-2xl' : 'max-w-2xl'}`}>
          {step === 0 && (
            <Step1 data={data} onSelect={(provider, email, name) => setData(prev => ({ ...prev, socialProvider: provider, socialEmail: email, socialName: name }))} />
          )}
          {step === 1 && <Step2 data={data} set={set} />}
          {step === 2 && <Step3 data={data} set={set} />}
          {step === 3 && <Step4 data={data} goTo={s => setStep(s)} />}
          {step === 4 && <Step5 data={data} onHome={onBack} />}

          {/* Navigation */}
          {!isLast && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={step === 0 ? onBack : back}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0a1628] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                {step === 0 ? 'Cancelar' : 'Atrás'}
              </button>

              <button
                onClick={next}
                disabled={!canAdvance(step, data) || submitting}
                className={`inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 ${
                  canAdvance(step, data) && !submitting
                    ? 'bg-gradient-to-r from-[#1e6bff] to-[#1550cc] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando…
                  </>
                ) : step === 3 ? (
                  <>
                    Confirmar registro
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </>
                ) : (
                  <>
                    Continuar
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Step counter */}
        {!isLast && (
          <p className="mt-4 text-xs text-slate-400">
            Paso {step + 1} de {STEPS.length}
          </p>
        )}
      </main>
    </div>
  )
}
