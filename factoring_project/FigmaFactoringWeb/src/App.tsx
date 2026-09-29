import { useState } from 'react'
import RegisterPage from './RegisterPage'
import LoginPage from './LoginPage'
import DashboardPage from './DashboardPage'

const NAV_LINKS = ['Soluciones', 'Cómo funciona', 'Beneficios', 'Contacto']

const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
      </svg>
    ),
    title: 'Liquidez Inmediata',
    desc: 'Obtén hasta el 90% del valor de tus facturas en menos de 24 horas. Sin esperar 30, 60 o 90 días.',
    stat: '90%',
    statLabel: 'Anticipo máximo',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: 'Sin Deuda Bancaria',
    desc: 'El factoring no es un préstamo. No afecta tu capacidad crediticia ni requiere garantías adicionales.',
    stat: '0',
    statLabel: 'Deuda generada',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: 'Crecimiento Acelerado',
    desc: 'Reinvierte capital al instante. Tus clientes pagan en sus plazos habituales mientras tú ya operas.',
    stat: '3×',
    statLabel: 'Más rápido que el banco',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: 'Gestión de Cobros',
    desc: 'Nos encargamos del seguimiento y cobranza de tus facturas. Tú enfócate en vender más.',
    stat: '100%',
    statLabel: 'Gestión incluida',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Registra tu empresa',
    desc: 'Crea tu cuenta en minutos. Solo necesitas RUC, estados financieros básicos y datos de contacto.',
  },
  {
    num: '02',
    title: 'Sube tus facturas',
    desc: 'Carga las facturas de tus clientes aprobados. Nuestro sistema las verifica automáticamente.',
  },
  {
    num: '03',
    title: 'Recibe tu dinero',
    desc: 'Aprobamos en horas y transferimos hasta el 90% del valor a tu cuenta bancaria.',
  },
]

const STATS = [
  { value: 'S/ 480M+', label: 'En facturas procesadas' },
  { value: '2,400+', label: 'Empresas activas' },
  { value: '98.2%', label: 'Tasa de aprobación' },
  { value: '< 24h', label: 'Tiempo de desembolso' },
]

export default function App() {
  const [page, setPage] = useState<'home' | 'register' | 'login' | 'dashboard'>('home')
  const [mobileOpen, setMobileOpen] = useState(false)

  if (page === 'register') return <RegisterPage onBack={() => setPage('home')} />
  if (page === 'login') return <LoginPage onBack={() => setPage('home')} onSuccess={() => setPage('dashboard')} />
  if (page === 'dashboard') return <DashboardPage onLogout={() => setPage('home')} />

  return (
    <div className="min-h-screen bg-[#f8faff] text-[#0a1628] overflow-x-hidden">
      {/* ── NAV ────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 hero-mesh border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e6bff] to-[#00d4aa] flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-display font-700 text-white text-lg tracking-tight" style={{ fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700 }}>
              Factoring<span className="text-[#00d4aa]">Web</span>
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a key={link} href="#" className="text-sm text-white/60 hover:text-white transition-colors duration-150">
                {link}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => setPage('login')} className="btn-outline px-5 py-2 rounded-lg text-sm font-medium text-white/90">
              Iniciar Sesión
            </button>
            <button onClick={() => setPage('register')} className="btn-primary px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-lg">
              Regístrate
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 text-white/70 hover:text-white"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#0a1628] border-t border-white/10 px-6 py-4 space-y-3">
            {NAV_LINKS.map(link => (
              <a key={link} href="#" className="block text-sm text-white/70 hover:text-white py-1">
                {link}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setPage('login')} className="btn-outline px-5 py-2.5 rounded-lg text-sm font-medium text-white text-center">
                Iniciar Sesión
              </button>
              <button onClick={() => setPage('register')} className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold text-white text-center">
                Regístrate
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────── */}
      <section className="hero-mesh pt-16 min-h-screen flex items-center relative overflow-hidden">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full py-24 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-[#00d4aa] backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
              Plataforma líder en factoring electrónico
            </div>

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.05] tracking-tight" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Convierte tus{' '}
              <span className="gradient-text">facturas</span>{' '}
              en capital hoy
            </h1>

            <p className="text-lg text-white/60 leading-relaxed max-w-md">
              FactoringWeb adelanta el cobro de tus cuentas por cobrar en menos de 24 horas. Liquidez inmediata, sin deuda, sin esperas.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => setPage('register')} className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white shadow-xl shadow-blue-500/25">
                Regístrate gratis
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <button onClick={() => setPage('login')} className="btn-outline inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium text-white">
                Iniciar Sesión
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 pt-2">
              {['SBS Regulado', 'ISO 27001', 'Datos Encriptados'].map(badge => (
                <div key={badge} className="flex items-center gap-2 text-xs text-white/40">
                  <svg className="w-4 h-4 text-[#00d4aa]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right image + floating card */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 aspect-[4/3] bg-[#1a3358]">
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop&auto=format"
                alt="Equipo financiero revisando facturas"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0a1628]/60 via-transparent to-transparent" />
            </div>

            {/* Floating stat card */}
            <div className="absolute -bottom-8 -left-8 bg-white rounded-2xl shadow-2xl p-5 w-52">
              <div className="text-xs text-gray-500 font-medium mb-1">Monto anticipado</div>
              <div className="text-2xl font-bold text-[#0a1628]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>S/ 48,500</div>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-2 h-2 rounded-full bg-[#00d4aa]" />
                <span className="text-xs text-[#00d4aa] font-medium">Transferido hoy</span>
              </div>
            </div>

            {/* Floating approval badge */}
            <div className="absolute -top-5 -right-5 bg-[#1e6bff] rounded-2xl shadow-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-blue-200">Factura aprobada</div>
                <div className="text-sm font-semibold text-white">En 2.4 horas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────── */}
      <section className="bg-[#0f2040] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center space-y-1">
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{s.value}</div>
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ───────────────────────────── */}
      <section className="py-24 bg-[#f8faff]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[#1e6bff] mb-3 tracking-wider uppercase">Por qué elegirnos</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0a1628] leading-tight" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Financia tu empresa sin complicaciones
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="card-hover bg-white rounded-2xl p-7 border border-slate-100 shadow-sm group">
                <div className="w-12 h-12 rounded-xl bg-[#f0f4ff] flex items-center justify-center text-[#1e6bff] mb-5 group-hover:bg-[#1e6bff] group-hover:text-white transition-colors duration-200">
                  {b.icon}
                </div>
                <div className="text-3xl font-bold text-[#0a1628] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{b.stat}</div>
                <div className="text-xs text-[#1e6bff] font-medium mb-3">{b.statLabel}</div>
                <h3 className="font-semibold text-[#0a1628] mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section className="py-24 bg-[#0a1628] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[#00d4aa] mb-3 tracking-wider uppercase">El proceso</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              3 pasos para obtener tu liquidez
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative group">
                {/* connector line (desktop) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#1e6bff]/40 to-transparent z-0 translate-x-4" />
                )}
                <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-250">
                  <div className="flex items-center gap-4 mb-5">
                    <span className="text-5xl font-bold text-[#1e6bff]/30 select-none" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                      {step.num}
                    </span>
                    <div className="w-10 h-px bg-white/20" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO + QUOTE ──────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-[#e1e9ff] shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&auto=format"
                alt="Revisión de facturas y documentos financieros"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative block */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-2xl bg-gradient-to-br from-[#1e6bff] to-[#00d4aa] opacity-20 -z-10" />
          </div>

          <div className="space-y-6">
            <p className="text-sm font-semibold text-[#1e6bff] tracking-wider uppercase">Para tu negocio</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0a1628] leading-tight" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              Tu flujo de caja, bajo control total
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Miles de empresas peruanas confían en FactoringWeb para mantener operaciones sin interrupciones. Desde PYMES hasta corporaciones, nuestra plataforma se adapta a tu volumen de facturación.
            </p>
            <ul className="space-y-3">
              {[
                'Dashboard en tiempo real con estado de cada factura',
                'Integración directa con SUNAT para validación automática',
                'Soporte dedicado 24/7 con ejecutivo asignado',
                'Tasas competitivas desde 0.8% mensual',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-[#00d4aa] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={() => setPage('register')} className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
                Regístrate gratis
              </button>
              <a href="#" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-[#1e6bff] border border-[#1e6bff]/30 hover:border-[#1e6bff] transition-colors">
                Ver demo en vivo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ────────────────────────── */}
      <section className="py-16 bg-[#f0f4ff]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center space-y-6">
          <svg className="w-10 h-10 text-[#1e6bff] mx-auto opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="text-2xl lg:text-3xl font-semibold text-[#0a1628] leading-snug" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            "Con FactoringWeb redujimos nuestro ciclo de cobranza de 75 días a menos de 24 horas. Fue el cambio más importante para nuestro crecimiento."
          </blockquote>
          <div className="space-y-1">
            <div className="font-semibold text-[#0a1628]">María Rodríguez</div>
            <div className="text-sm text-gray-500">CFO — Constructora Andina SAC</div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────── */}
      <section className="hero-mesh py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
            ¿Listo para financiar tu empresa?
          </h2>
          <p className="text-white/60 text-lg">
            Únete a más de 2,400 empresas que ya tienen liquidez inmediata con FactoringWeb. Sin burocracia, sin esperas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setPage('register')} className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white shadow-2xl shadow-blue-500/30 w-full sm:w-auto justify-center">
              Regístrate gratis
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <button onClick={() => setPage('login')} className="btn-outline inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium text-white w-full sm:w-auto justify-center">
              Iniciar Sesión
            </button>
          </div>
          <p className="text-xs text-white/30">Sin tarjeta de crédito · Aprobación en minutos · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="bg-[#05101f] border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-10">
            <div className="space-y-3 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1e6bff] to-[#00d4aa] flex items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-bold text-white" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Factoring<span className="text-[#00d4aa]">Web</span>
                </span>
              </div>
              <p className="text-sm text-white/35 leading-relaxed">
                La plataforma de factoring electrónico más rápida y segura del mercado peruano.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              {[
                { heading: 'Producto', links: ['Cómo funciona', 'Precios', 'Integraciones', 'API'] },
                { heading: 'Empresa', links: ['Nosotros', 'Blog', 'Prensa', 'Carreras'] },
                { heading: 'Legal', links: ['Privacidad', 'Términos', 'Cookies', 'Compliance'] },
              ].map(col => (
                <div key={col.heading} className="space-y-3">
                  <h4 className="font-semibold text-white/80 text-xs tracking-wider uppercase">{col.heading}</h4>
                  {col.links.map(l => (
                    <a key={l} href="#" className="block text-white/35 hover:text-white/70 transition-colors">{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/25">
            <span>© 2026 FactoringWeb S.A.C. Todos los derechos reservados.</span>
            <span>Regulado por la SBS — Resolución N° 4799-2015</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
