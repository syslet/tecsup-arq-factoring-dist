import { useState } from 'react'

type LoginPageProps = {
  onBack: () => void
  onSuccess: () => void
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
        <svg viewBox="0 0 20 20" fill="white" className="w-4.5 h-4.5">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="font-display font-bold text-white text-lg tracking-tight">
        Factoring<span className="text-teal-400">Web</span>
      </span>
    </div>
  )
}

export default function LoginPage({ onBack, onSuccess }: LoginPageProps) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const signIn = () => {
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      onSuccess()
    }, 700)
  }

  const formReady = user.length > 2 && password.length > 3 && otp.length === 6

  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="hero-mesh hidden lg:flex flex-col justify-between relative overflow-hidden p-12 xl:p-16">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="relative">
          <Brand />
        </div>

        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-teal-400 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Portal seguro para clientes
          </div>
          <h1 className="font-display text-5xl xl:text-6xl font-bold text-white leading-[1.05] tracking-tight">
            Tu liquidez,
            <span className="gradient-text block">siempre en movimiento.</span>
          </h1>
          <p className="text-lg text-white/55 mt-6 max-w-lg leading-relaxed">
            Gestiona tus solicitudes, negocia facturas y consulta tus desembolsos desde un solo lugar.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            ['SBS', 'Regulado'],
            ['AES-256', 'Encriptación'],
            ['24/7', 'Monitoreo'],
          ].map(([value, label]) => (
            <div key={value} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="font-display font-bold text-white">{value}</div>
              <div className="text-xs text-white/35 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <div className="lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-display font-bold text-navy-900">Factoring<span className="text-teal-400">Web</span></span>
            </div>
          </div>
          <button onClick={onBack} className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold text-blue-500 mb-2">Bienvenido de nuevo</p>
              <h2 className="font-display text-3xl font-bold text-navy-900">Inicia sesión en tu cuenta</h2>
              <p className="text-sm text-slate-500 mt-2">Accede a tu bandeja de solicitudes y operaciones.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={signIn} className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-900 hover:border-blue-300 hover:bg-slate-50 transition-all shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button onClick={signIn} className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-900 hover:border-blue-300 hover:bg-slate-50 transition-all shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>

            <div className="flex items-center gap-4 my-7">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">o ingresa con tus credenciales</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold text-navy-900/60 uppercase tracking-wider mb-1.5">Usuario</span>
                <input value={user} onChange={e => setUser(e.target.value)} placeholder="usuario@empresa.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-navy-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-navy-900/60 uppercase tracking-wider mb-1.5">Contraseña</span>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-navy-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <button type="button" aria-label="Mostrar contraseña" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.04 12.32C3.42 8.15 7.36 5.14 12 5.14s8.58 3.01 9.96 7.18c-1.38 4.17-5.32 7.18-9.96 7.18s-8.58-3.01-9.96-7.18Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12.32a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                </div>
              </label>
              <label className="block">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold text-navy-900/60 uppercase tracking-wider">Código Google Authenticator</span>
                  <span className="text-xs text-slate-400">6 dígitos</span>
                </div>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-center font-display text-lg tracking-[0.45em] text-navy-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </label>

              <button onClick={signIn} disabled={!formReady || loading} className="btn-primary w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
                {loading ? 'Validando acceso…' : 'Iniciar Sesión'}
                {!loading && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
              <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 11.99 11.99 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75-3.2 0-6.1-1.25-8.4-3.29Z" />
              </svg>
              Acceso protegido con autenticación multifactor
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
