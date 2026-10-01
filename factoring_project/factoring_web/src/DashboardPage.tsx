import { useCallback, useEffect, useRef, useState } from 'react'

type DashboardPageProps = {
  onLogout: () => void
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(name => name[0].toLocaleUpperCase('es-PE'))
    .join('')
}

type InvoiceSheet = {
  invoice_sheet_id: number
  created_at: string | null
  sheet_code: string
  invoice_id: number
  invoice_number: string
  debtor_ruc: string
  debtor_name: string
  amount: number
  currency: string
  status: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseInvoiceSheets(value: unknown): InvoiceSheet[] {
  if (!isRecord(value) || !Array.isArray(value.planillas)) {
    throw new Error('El servicio de venta devolvió una respuesta no válida.')
  }

  return value.planillas.map((item): InvoiceSheet => {
    if (
      !isRecord(item) ||
      typeof item.invoice_sheet_id !== 'number' ||
      (item.created_at !== null && typeof item.created_at !== 'string') ||
      typeof item.sheet_code !== 'string' ||
      typeof item.invoice_id !== 'number' ||
      typeof item.invoice_number !== 'string' ||
      typeof item.debtor_ruc !== 'string' ||
      typeof item.debtor_name !== 'string' ||
      typeof item.amount !== 'number' ||
      typeof item.currency !== 'string' ||
      (item.status !== null && typeof item.status !== 'string')
    ) {
      throw new Error('El servicio de venta devolvió una planilla con datos no válidos.')
    }

    return {
      invoice_sheet_id: item.invoice_sheet_id,
      created_at: item.created_at,
      sheet_code: item.sheet_code,
      invoice_id: item.invoice_id,
      invoice_number: item.invoice_number,
      debtor_ruc: item.debtor_ruc,
      debtor_name: item.debtor_name,
      amount: item.amount,
      currency: item.currency,
      status: item.status,
    }
  })
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

type InvoiceExcelRow = {
  numeroPlanilla: string
  numeroFactura: string
  rucGirador: string
  rucAceptante: string
  nombreAceptante: string
  importe: number
  moneda: string
  fechEmision: Date
  fechaVencimiento: Date
}

type ImportInvoice = {
  numero_factura: string
  ruc_girador: string
  ruc_aceptante: string
  nombre_aceptante: string
  importe: string
  moneda: string
  fech_emision: string
  fecha_vencimiento: string
}

type ImportInvoiceSheet = {
  numero_planilla: string
  facturas: ImportInvoice[]
}

type ImportedInvoiceSheet = {
  id: number
  numero_planilla: string
}

type DisbursementResult = {
  annotation_code: string
  disbursement_amount: number
  disbursement_id: number
  status: string
  processed_at: string
}

type PlanillaSummary = {
  numeroPlanilla: string
  facturas: number
  moneda: string
  monto: number
}

type ExcelSummary = {
  totalPlanillas: number
  totalFacturas: number
  montoPorMoneda: Map<string, number>
  vencimientoPromedio: number
  planillas: PlanillaSummary[]
  facturas: InvoiceExcelRow[]
}

type Pricing = {
  advance_rate: number
  monthly_rate: number
  timestamp: string
}

const PRICING_VALIDITY_SECONDS = 3 * 60

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30)
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function cellText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (isRecord(value)) {
    if (typeof value.text === 'string') return value.text.trim()
    if (Array.isArray(value.richText)) {
      return value.richText
        .map(part => isRecord(part) && typeof part.text === 'string' ? part.text : '')
        .join('')
        .trim()
    }
    if ('result' in value) return cellText(value.result)
  }
  return ''
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(EXCEL_EPOCH_UTC + Math.floor(value) * MILLISECONDS_PER_DAY)
  }
  if (typeof value !== 'string' || !value.trim()) return null

  const text = value.trim()
  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text)
  if (dayFirst) {
    const day = Number(dayFirst[1])
    const month = Number(dayFirst[2])
    const year = Number(dayFirst[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCDate() === day && date.getUTCMonth() === month - 1 ? date : null
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

function parseImporte(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  let normalized = value.trim().replace(/\s/g, '')
  const lastComma = normalized.lastIndexOf(',')
  const lastPeriod = normalized.lastIndexOf('.')
  if (lastComma >= 0 && lastPeriod >= 0) {
    normalized = lastComma > lastPeriod
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '')
  } else if (lastComma >= 0) {
    const decimalDigits = normalized.length - lastComma - 1
    normalized = decimalDigits > 0 && decimalDigits <= 2
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '')
  }
  if (!normalized) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

async function parseInvoiceWorkbook(file: File): Promise<ExcelSummary> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error('El archivo Excel no contiene hojas para procesar.')

  const requiredHeaders = [
    'numero_planilla',
    'numero_factura',
    'ruc_girador',
    'ruc_aceptante',
    'nombre_aceptante',
    'importe',
    'moneda',
    'fech_emision',
    'fecha_vencimiento',
  ]
  const headerIndexes = new Map<string, number>()
  worksheet.getRow(1).eachCell((cell, column) => {
    const header = cellText(cell.value)
    if (header) headerIndexes.set(header, column)
  })

  const missingHeaders = requiredHeaders.filter(header => !headerIndexes.has(header))
  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${missingHeaders.join(', ')}.`)
  }

  const column = (header: string) => {
    const index = headerIndexes.get(header)
    if (index === undefined) throw new Error(`Falta la columna obligatoria ${header}.`)
    return index
  }
  const rows: InvoiceExcelRow[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const numeroPlanilla = cellText(row.getCell(column('numero_planilla')).value)
    const numeroFactura = cellText(row.getCell(column('numero_factura')).value)
    const rucGirador = cellText(row.getCell(column('ruc_girador')).value)
    const rucAceptante = cellText(row.getCell(column('ruc_aceptante')).value)
    const nombreAceptante = cellText(row.getCell(column('nombre_aceptante')).value)
    const importeValue = row.getCell(column('importe')).value
    const moneda = cellText(row.getCell(column('moneda')).value)
    const fechEmisionValue = row.getCell(column('fech_emision')).value
    const fechaVencimientoValue = row.getCell(column('fecha_vencimiento')).value
    const fechEmision = parseExcelDate(fechEmisionValue)
    const fechaVencimiento = parseExcelDate(fechaVencimientoValue)

    if (
      !numeroPlanilla && !numeroFactura && !rucGirador && !rucAceptante &&
      !nombreAceptante && !moneda && importeValue == null &&
      fechEmisionValue == null && fechaVencimientoValue == null
    ) return
    const importe = parseImporte(importeValue)
    if (
      !numeroPlanilla || !numeroFactura || !rucGirador || !rucAceptante ||
      !nombreAceptante || !moneda || importe === null || !fechEmision ||
      !fechaVencimiento
    ) {
      throw new Error(`La fila ${rowNumber} contiene datos incompletos o inválidos.`)
    }
    rows.push({
      numeroPlanilla,
      numeroFactura,
      rucGirador,
      rucAceptante,
      nombreAceptante,
      importe,
      moneda,
      fechEmision,
      fechaVencimiento,
    })
  })

  if (rows.length === 0) throw new Error('El archivo no contiene facturas para resumir.')

  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const uniqueSheets = new Set<string>()
  const totalsByCurrency = new Map<string, number>()
  const groups = new Map<string, PlanillaSummary>()
  let totalDaysToMaturity = 0

  for (const row of rows) {
    uniqueSheets.add(row.numeroPlanilla)
    totalsByCurrency.set(row.moneda, (totalsByCurrency.get(row.moneda) || 0) + row.importe)
    totalDaysToMaturity += Math.round((row.fechaVencimiento.getTime() - todayUtc) / MILLISECONDS_PER_DAY)

    const groupKey = `${row.numeroPlanilla}\u0000${row.moneda}`
    const group = groups.get(groupKey)
    if (group) {
      group.facturas += 1
      group.monto += row.importe
    } else {
      groups.set(groupKey, {
        numeroPlanilla: row.numeroPlanilla,
        facturas: 1,
        moneda: row.moneda,
        monto: row.importe,
      })
    }
  }

  return {
    totalPlanillas: uniqueSheets.size,
    totalFacturas: rows.length,
    montoPorMoneda: totalsByCurrency,
    vencimientoPromedio: Math.round(totalDaysToMaturity / rows.length),
    planillas: [...groups.values()],
    facturas: rows,
  }
}

function formatImportAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatImportDate(date: Date): string {
  return `${date.getUTCDate()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}

function parsePricing(value: unknown): Pricing {
  if (isRecord(value) && typeof value.error === 'string' && value.error) {
    throw new Error(value.error)
  }
  if (
    !isRecord(value) ||
    value.type !== 'pricing_update' ||
    typeof value.advance_rate !== 'number' ||
    !Number.isFinite(value.advance_rate) ||
    typeof value.monthly_rate !== 'number' ||
    !Number.isFinite(value.monthly_rate) ||
    typeof value.timestamp !== 'string'
  ) {
    throw new Error('El servicio de pricing devolvió una respuesta no válida.')
  }
  return {
    advance_rate: value.advance_rate,
    monthly_rate: value.monthly_rate,
    timestamp: value.timestamp,
  }
}

function parseImportedInvoiceSheets(value: unknown): ImportedInvoiceSheet[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('El servicio de venta devolvió una respuesta no válida.')
  }

  return value.map((item): ImportedInvoiceSheet => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'number' ||
      !Number.isInteger(item.id) ||
      item.id <= 0 ||
      typeof item.numero_planilla !== 'string' ||
      !item.numero_planilla
    ) {
      throw new Error('El servicio de venta devolvió una planilla con datos no válidos.')
    }
    return { id: item.id, numero_planilla: item.numero_planilla }
  })
}

function parseDisbursementResults(value: unknown): DisbursementResult[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('El servicio de desembolso devolvió una respuesta no válida.')
  }

  const processedAt = new Date().toISOString()
  return value.map((item): DisbursementResult => {
    if (
      !isRecord(item) ||
      typeof item.annotation_code !== 'string' ||
      typeof item.disbursement_amount !== 'number' ||
      !Number.isFinite(item.disbursement_amount) ||
      typeof item.disbursement_id !== 'number' ||
      !Number.isInteger(item.disbursement_id) ||
      typeof item.status !== 'string'
    ) {
      throw new Error('El servicio de desembolso devolvió datos no válidos.')
    }
    return {
      annotation_code: item.annotation_code,
      disbursement_amount: item.disbursement_amount,
      disbursement_id: item.disbursement_id,
      status: item.status,
      processed_at: processedAt,
    }
  })
}

function buildDisbursementPlanillas(
  invoices: InvoiceExcelRow[],
  importedSheets: ImportedInvoiceSheet[],
  pricing: Pricing | null,
) {
  if (!pricing) throw new Error('No hay un pricing vigente para ejecutar el desembolso.')

  const importedByCode = new Map(
    importedSheets.map(sheet => [sheet.numero_planilla, sheet.id]),
  )
  const totalsByCode = new Map<string, number>()
  for (const invoice of invoices) {
    totalsByCode.set(
      invoice.numeroPlanilla,
      (totalsByCode.get(invoice.numeroPlanilla) || 0) + invoice.importe,
    )
  }

  return [...totalsByCode.entries()].map(([numeroPlanilla, importe]) => {
    const id = importedByCode.get(numeroPlanilla)
    if (id === undefined) {
      throw new Error(`No se encontró el identificador importado de la planilla ${numeroPlanilla}.`)
    }
    return {
      id_planilla: id,
      numero_planilla: numeroPlanilla,
      importe: importe.toFixed(2),
      tasa_descuento: String(pricing.advance_rate),
      tasa_comision: String(pricing.monthly_rate),
    }
  })
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function buildImportPayload(rows: InvoiceExcelRow[]): ImportInvoiceSheet[] {
  const sheets = new Map<string, ImportInvoiceSheet>()
  for (const row of rows) {
    let sheet = sheets.get(row.numeroPlanilla)
    if (!sheet) {
      sheet = { numero_planilla: row.numeroPlanilla, facturas: [] }
      sheets.set(row.numeroPlanilla, sheet)
    }
    sheet.facturas.push({
      numero_factura: row.numeroFactura,
      ruc_girador: row.rucGirador,
      ruc_aceptante: row.rucAceptante,
      nombre_aceptante: row.nombreAceptante,
      importe: formatImportAmount(row.importe),
      moneda: row.moneda,
      fech_emision: formatImportDate(row.fechEmision),
      fecha_vencimiento: formatImportDate(row.fechaVencimiento),
    })
  }
  return [...sheets.values()]
}

async function responseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const result: unknown = await response.json()
    if (isRecord(result)) {
      if (typeof result.error === 'string' && result.error) return result.error
      if (typeof result.message === 'string' && result.message) return result.message
    }
  } catch {
    return fallback
  }
  return fallback
}

function formatCurrencyTotals(totals: Map<string, number>): string {
  return [...totals.entries()]
    .map(([currency, amount]) => formatAmount(amount, currency))
    .join(' · ')
}

function formatCurrencyRateTotals(totals: Map<string, number>, rate: number, negative = false): string {
  return [...totals.entries()]
    .map(([currency, amount]) => formatAmount(amount * rate * (negative ? -1 : 1), currency))
    .join(' · ')
}

function formatSystemDate(date: Date): string {
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

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
    QUOTED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    DISBURSED: 'bg-teal-400/10 text-teal-600 border-teal-400/20',
    REJECTED: 'bg-red-50 text-red-600 border-red-100',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
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

function WizardContent({ step, fileName, onFileSelect, summary, parsingFile, fileError, otp, setOtp, pricing, pricingLoading, pricingError, pricingSecondsRemaining, disbursements, currency }: {
  step: number
  fileName: string
  onFileSelect: (file: File | null) => void
  summary: ExcelSummary | null
  parsingFile: boolean
  fileError: string | null
  otp: string
  setOtp: (value: string) => void
  pricing: Pricing | null
  pricingLoading: boolean
  pricingError: string | null
  pricingSecondsRemaining: number
  disbursements: DisbursementResult[]
  currency: string
}) {
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Adjunta tus facturas</h2>
          <p className="text-sm text-slate-500 mt-1">Carga la planilla Excel con el detalle de las facturas que deseas negociar.</p>
        </div>
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/25 bg-blue-500/[0.03] p-8 text-center hover:border-blue-500/50 hover:bg-blue-500/[0.05] transition-all">
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={e => onFileSelect(e.target.files?.[0] || null)}
          />
          <span className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </span>
          <span className="font-semibold text-navy-900">{fileName || 'Arrastra tu archivo o haz clic para seleccionar'}</span>
          <span className="text-xs text-slate-400 mt-2">Formato XLSX · Máximo 10 MB</span>
          {parsingFile && <span className="mt-3 text-sm text-blue-600" role="status">Leyendo y validando el archivo…</span>}
          {fileError && <span className="mt-3 text-sm text-red-600" role="alert">{fileError}</span>}
          {fileName && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-400/10 px-3 py-1.5 text-xs font-semibold text-teal-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              Archivo listo para procesar
            </span>
          )}
        </label>
        <a
          href="/plantilla/plantilla_ejemplo.xlsx"
          download="plantilla_ejemplo.xlsx"
          className="text-sm font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M8.25 12 12 15.75 15.75 12M12 15.75V3" /></svg>
          Descargar plantilla de ejemplo
        </a>
      </div>
    )
  }

  if (step === 1) {
    if (!summary) {
      return <p className="py-12 text-center text-sm text-slate-500">Adjunta un archivo Excel válido para generar el resumen.</p>
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Resumen de planillas</h2>
          <p className="text-sm text-slate-500 mt-1">Resumen calculado a partir del archivo Excel adjunto.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <MetricCard label="Facturas" value={String(summary.totalFacturas)} caption="Facturas en el archivo" />
          <MetricCard
            label="Monto total"
            value={formatCurrencyTotals(summary.montoPorMoneda)}
            caption={`${summary.totalPlanillas} ${summary.totalPlanillas === 1 ? 'planilla' : 'planillas'}`}
            accent="teal"
          />
          <MetricCard
            label="Vencimiento prom."
            value={`${summary.vencimientoPromedio} días`}
            caption={`Al ${formatSystemDate(new Date())}`}
          />
        </div>
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="text-left px-5 py-3">Planilla</th><th className="text-left px-5 py-3">Facturas</th><th className="text-left px-5 py-3">Moneda</th><th className="text-right px-5 py-3">Monto</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-navy-900">
              {summary.planillas.map(planilla => (
                <tr key={`${planilla.numeroPlanilla}-${planilla.moneda}`}>
                  <td className="px-5 py-4 font-semibold">{planilla.numeroPlanilla}</td>
                  <td className="px-5 py-4">{planilla.facturas}</td>
                  <td className="px-5 py-4">{planilla.moneda}</td>
                  <td className="px-5 py-4 text-right font-semibold">{formatAmount(planilla.monto, planilla.moneda)}</td>
                </tr>
              ))}
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
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${pricingError ? 'bg-amber-50 text-amber-700' : 'bg-teal-400/10 text-teal-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pricingError ? 'bg-amber-500' : 'bg-teal-400 animate-pulse'}`} />
            {pricingLoading && !pricing ? 'Consultando pricing…' : pricingError ? 'Pricing no disponible' : 'Pricing disponible'}
          </span>
          <h2 className="font-display text-2xl font-bold text-navy-900">Tasa de descuento</h2>
          <p className="text-sm text-slate-500 mt-1">Tasas vigentes para la negociación de tus facturas.</p>
        </div>
        <div className="hero-mesh rounded-2xl p-7 text-white relative overflow-hidden">
          <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-white/45 uppercase tracking-wider">Tasa de Descuento</div>
              <div className="font-display text-3xl font-bold mt-2">{pricing ? formatRate(pricing.advance_rate) : '—'}</div>
              <div className="text-xs text-teal-400 mt-1">Pricing vigente</div>
            </div>
            <div>
              <div className="text-xs text-white/45 uppercase tracking-wider">Tasa de Comisión</div>
              <div className="font-display text-3xl font-bold mt-2">{pricing ? formatRate(pricing.monthly_rate) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-white/45 uppercase tracking-wider">Plazo promedio</div>
              <div className="font-display text-3xl font-bold mt-2">{summary?.vencimientoPromedio ?? '—'} días</div>
            </div>
            <div>
              <div className="text-xs text-white/45 uppercase tracking-wider">Vigencia</div>
              <div className="font-display text-3xl font-bold mt-2">{formatCountdown(pricingSecondsRemaining)}</div>
              <div className="text-xs text-white/40 mt-1">{pricingLoading ? 'actualizando pricing…' : 'hasta la próxima consulta'}</div>
            </div>
          </div>
        </div>
        {pricingError && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {pricingError} Se volverá a consultar automáticamente cuando termine el temporizador.
          </p>
        )}
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 flex gap-3 text-sm text-blue-700">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.04-.02a.75.75 0 0 1 1.06.85l-.7 2.84a.75.75 0 0 0 1.06.85l.04-.02M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.01v.01H12V8.25Z" /></svg>
          La tasa incluye validación, administración y gestión de cobranza.
        </div>
      </div>
    )
  }

  if (step === 4) {
    const totalAmount = summary ? formatCurrencyTotals(summary.montoPorMoneda) : '—'
    const discountAmount = summary && pricing
      ? formatCurrencyRateTotals(summary.montoPorMoneda, pricing.advance_rate, true)
      : '—'
    const commissionAmount = summary && pricing
      ? formatCurrencyRateTotals(summary.montoPorMoneda, pricing.monthly_rate, true)
      : '—'
    const netDisbursement = summary && pricing
      ? formatCurrencyRateTotals(
        summary.montoPorMoneda,
        1 - pricing.advance_rate - pricing.monthly_rate,
      )
      : '—'

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Simulación de negociación</h2>
          <p className="text-sm text-slate-500 mt-1">Revisa el detalle final antes de solicitar el desembolso.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {[
            ['Valor nominal de facturas', totalAmount],
            ['Tasa de descuento', pricing ? formatRate(pricing.advance_rate) : '—'],
            ['Tasa de comisión', pricing ? formatRate(pricing.monthly_rate) : '—'],
            ['Descuento por financiamiento', discountAmount],
            ['Comisión operativa', commissionAmount],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between px-6 py-4 border-b border-slate-100 text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold text-navy-900">{value}</span></div>
          ))}
          <div className="flex justify-between items-end px-6 py-6 bg-navy-900 text-white">
            <div><div className="text-xs text-white/45 uppercase tracking-wider">Monto a Desembolsar</div><div className="text-sm text-white/60 mt-1">Cuenta BCP terminada en 4821</div></div>
            <div className="font-display text-3xl font-bold">{netDisbursement}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-3">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-teal-400/15 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-teal-400/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          </div>
        </div>
        <h2 className="font-display text-3xl font-bold text-navy-900 mt-7">Desembolso realizado</h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">La transferencia fue procesada correctamente a la cuenta bancaria registrada del cliente.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 text-left">Operación</th>
              <th className="px-5 py-3 text-right">Monto Transferido</th>
              <th className="px-5 py-3 text-left">Fecha y Hora</th>
              <th className="px-5 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-navy-900">
            {disbursements.map(result => (
              <tr key={result.disbursement_id}>
                <td className="px-5 py-4 font-semibold">{result.annotation_code}</td>
                <td className="px-5 py-4 text-right font-semibold text-teal-600">
                  {formatAmount(result.disbursement_amount, currency)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {new Date(result.processed_at).toLocaleString('es-PE')}
                </td>
                <td className="px-5 py-4">{result.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NegotiationWizard({ companyId, currency, onClose, onReturnToDashboard }: {
  companyId: number
  currency: string
  onClose: () => void
  onReturnToDashboard: () => void
}) {
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [summary, setSummary] = useState<ExcelSummary | null>(null)
  const [importedSheets, setImportedSheets] = useState<ImportedInvoiceSheet[]>([])
  const [disbursements, setDisbursements] = useState<DisbursementResult[]>([])
  const [parsingFile, setParsingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)
  const [submittingOtp, setSubmittingOtp] = useState(false)
  const [submittingDisbursement, setSubmittingDisbursement] = useState(false)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingSecondsRemaining, setPricingSecondsRemaining] = useState(PRICING_VALIDITY_SECONDS)
  const parseRequestId = useRef(0)
  const apiErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canContinue = step !== 0 || Boolean(summary && !parsingFile && !fileError)

  useEffect(() => () => {
    if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current)
  }, [])

  useEffect(() => {
    if (step !== 3) return

    let active = true
    let refreshInProgress = false
    let secondsRemaining = PRICING_VALIDITY_SECONDS

    const fetchPricing = async () => {
      if (refreshInProgress) return
      refreshInProgress = true
      if (active) setPricingLoading(true)
      try {
        const response = await fetch('/api/pricing/latest', {
          credentials: 'same-origin',
        })
        if (!response.ok) {
          throw new Error(await responseErrorMessage(
            response,
            'No fue posible consultar el pricing.',
          ))
        }
        const latestPricing = parsePricing(await response.json())
        if (active) {
          setPricing(latestPricing)
          setPricingError(null)
        }
      } catch (error) {
        if (active) {
          setPricingError(
            error instanceof Error
              ? error.message
              : 'No fue posible consultar el pricing.',
          )
        }
      } finally {
        refreshInProgress = false
        secondsRemaining = PRICING_VALIDITY_SECONDS
        if (active) {
          setPricingSecondsRemaining(PRICING_VALIDITY_SECONDS)
          setPricingLoading(false)
        }
      }
    }

    setPricingSecondsRemaining(PRICING_VALIDITY_SECONDS)
    void fetchPricing()
    const timer = setInterval(() => {
      if (refreshInProgress) return
      secondsRemaining -= 1
      if (secondsRemaining <= 0) {
        secondsRemaining = 0
        setPricingSecondsRemaining(0)
        void fetchPricing()
      } else {
        setPricingSecondsRemaining(secondsRemaining)
      }
    }, 1000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [step])

  const showApiError = (message: string) => {
    if (apiErrorTimer.current) clearTimeout(apiErrorTimer.current)
    setApiError(message)
    apiErrorTimer.current = setTimeout(() => {
      setApiError(null)
      apiErrorTimer.current = null
    }, 5000)
  }

  const validateOtpAndImport = async () => {
    if (!summary) return
    setSubmittingOtp(true)
    setApiError(null)
    if (apiErrorTimer.current) {
      clearTimeout(apiErrorTimer.current)
      apiErrorTimer.current = null
    }
    try {
      const otpResponse = await fetch('/api/security/validotp', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_code: otp }),
      })
      if (!otpResponse.ok) {
        throw new Error(await responseErrorMessage(
          otpResponse,
          'No fue posible validar el código OTP. Inténtalo nuevamente.',
        ))
      }

      const importResponse = await fetch(
        `/api/venta/planilla/importar?companyId=${encodeURIComponent(String(companyId))}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildImportPayload(summary.facturas)),
        },
      )
      if (!importResponse.ok) {
        throw new Error(await responseErrorMessage(
          importResponse,
          'No fue posible importar las planillas. Inténtalo nuevamente.',
        ))
      }

      setImportedSheets(parseImportedInvoiceSheets(await importResponse.json()))
      setStep(current => current + 1)
    } catch (error) {
      showApiError(
        error instanceof Error
          ? error.message
          : 'No fue posible procesar la operación. Inténtalo nuevamente.',
      )
    } finally {
      setSubmittingOtp(false)
    }
  }

  const executeDisbursement = async () => {
    if (!summary) return
    setSubmittingDisbursement(true)
    setApiError(null)
    if (apiErrorTimer.current) {
      clearTimeout(apiErrorTimer.current)
      apiErrorTimer.current = null
    }
    try {
      const planillas = buildDisbursementPlanillas(
        summary.facturas,
        importedSheets,
        pricing,
      )
      const response = await fetch('/api/desembolso/masivo', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planillas }),
      })
      if (!response.ok) {
        throw new Error(await responseErrorMessage(
          response,
          'No fue posible procesar el desembolso. Inténtalo nuevamente.',
        ))
      }

      setDisbursements(parseDisbursementResults(await response.json()))
      setStep(5)
    } catch (error) {
      showApiError(
        error instanceof Error
          ? error.message
          : 'No fue posible procesar el desembolso. Inténtalo nuevamente.',
      )
    } finally {
      setSubmittingDisbursement(false)
    }
  }

  const handleFileSelect = async (file: File | null) => {
    const requestId = ++parseRequestId.current
    setFileName(file?.name || '')
    setSummary(null)
    setFileError(null)

    if (!file) {
      setParsingFile(false)
      return
    }
    if (!file.name.toLocaleLowerCase('en-US').endsWith('.xlsx')) {
      setParsingFile(false)
      setFileError('Selecciona un archivo con formato .xlsx.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setParsingFile(false)
      setFileError('El archivo supera el tamaño máximo de 10 MB.')
      return
    }

    setParsingFile(true)
    try {
      const parsedSummary = await parseInvoiceWorkbook(file)
      if (requestId === parseRequestId.current) setSummary(parsedSummary)
    } catch (error) {
      if (requestId === parseRequestId.current) {
        setFileError(
          error instanceof Error
            ? error.message
            : 'No fue posible leer el archivo Excel.',
        )
      }
    } finally {
      if (requestId === parseRequestId.current) setParsingFile(false)
    }
  }

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
            {apiError && (
              <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiError}
              </div>
            )}
            <WizardContent
              step={step}
              fileName={fileName}
              onFileSelect={handleFileSelect}
              summary={summary}
              parsingFile={parsingFile}
              fileError={fileError}
              otp={otp}
              setOtp={setOtp}
              pricing={pricing}
              pricingLoading={pricingLoading}
              pricingError={pricingError}
              pricingSecondsRemaining={pricingSecondsRemaining}
              disbursements={disbursements}
              currency={currency}
            />
          </div>
          <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-t border-slate-100 bg-slate-50/70">
            {step === 5 ? <span /> : (
              <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)} disabled={submittingOtp || submittingDisbursement} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-900 disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                {step === 0 ? 'Cancelar' : 'Atrás'}
              </button>
            )}
            {step === 5 ? (
              <button onClick={onReturnToDashboard} className="btn-primary ml-auto rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">Ir a Bandeja de Solicitudes</button>
            ) : (
              <button
                onClick={() => step === 2
                  ? void validateOtpAndImport()
                  : step === 4
                    ? void executeDisbursement()
                    : setStep(s => s + 1)}
                disabled={!canContinue || (step === 2 && (otp.length !== 6 || submittingOtp)) || (step === 3 && (!pricing || pricingLoading)) || (step === 4 && submittingDisbursement)}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submittingOtp ? 'Validando…' : submittingDisbursement ? 'Desembolsando…' : step === 4 ? 'Desembolsar' : step === 3 ? 'Aceptar tasa' : 'Continuar'}
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
  const [fullName, setFullName] = useState('')
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [currency, setCurrency] = useState('PEN')
  const [requests, setRequests] = useState<InvoiceSheet[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const refreshRequestId = useRef(0)
  const statuses = [...new Set(requests.map(row => row.status).filter((status): status is string => Boolean(status)))]
  const visible = filter === 'Todos' ? requests : requests.filter(row => row.status === filter)

  const refreshRequests = useCallback(async () => {
    const requestId = ++refreshRequestId.current
    setRequestsLoading(true)
    setRequestsError(null)

    try {
      const sessionResponse = await fetch('/api/auth/session', {
        credentials: 'same-origin',
      })
      if (sessionResponse.status === 401) {
        if (requestId === refreshRequestId.current) onLogout()
        return
      }
      if (!sessionResponse.ok) {
        throw new Error('No fue posible validar la sesión. Inténtalo nuevamente.')
      }

      const session: unknown = await sessionResponse.json()
      if (
        !isRecord(session) ||
        typeof session.full_name !== 'string' ||
        !session.full_name.trim() ||
        typeof session.company_id !== 'number' ||
        !Number.isInteger(session.company_id) ||
        session.company_id <= 0 ||
        typeof session.currency !== 'string' ||
        !session.currency
      ) {
        if (requestId === refreshRequestId.current) onLogout()
        return
      }

      if (requestId === refreshRequestId.current) {
        setFullName(session.full_name)
        setCompanyId(session.company_id)
        setCurrency(session.currency)
        setSessionChecked(true)
      }

      const response = await fetch(
        `/api/venta/planillas?company_id=${encodeURIComponent(String(session.company_id))}`,
        { credentials: 'same-origin' },
      )
      if (response.status === 401) {
        if (requestId === refreshRequestId.current) onLogout()
        return
      }
      if (!response.ok) {
        throw new Error('No fue posible cargar las planillas. Inténtalo nuevamente.')
      }

      const result: unknown = await response.json()
      const planillas = parseInvoiceSheets(result)
      if (requestId === refreshRequestId.current) {
        setRequests(planillas)
        setRequestsError(null)
      }
    } catch (error) {
      if (requestId === refreshRequestId.current) {
        setRequestsError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar las planillas. Inténtalo nuevamente.',
        )
        setSessionChecked(true)
      }
    } finally {
      if (requestId === refreshRequestId.current) setRequestsLoading(false)
    }
  }, [onLogout])

  useEffect(() => {
    void refreshRequests()
    return () => {
      refreshRequestId.current += 1
    }
  }, [refreshRequests])

  const returnToDashboard = () => {
    setWizardOpen(false)
    void refreshRequests()
  }

  const logout = async () => {
    setLoggingOut(true)
    setLogoutError(null)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        throw new Error('No fue posible cerrar la sesión. Inténtalo nuevamente.')
      }
      onLogout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'No fue posible cerrar la sesión.')
    } finally {
      setLoggingOut(false)
    }
  }

  if (!sessionChecked) {
    return <div className="min-h-screen bg-slate-50" role="status" aria-label="Validando sesión" />
  }

  const initials = getInitials(fullName)

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
          <div className="text-right">
            <div className="hidden text-xs font-semibold text-white sm:block">{fullName}</div>
            <button onClick={logout} disabled={loggingOut} className="text-[11px] text-white/40 hover:text-white/70 disabled:opacity-50">
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
          <div role="img" aria-label={fullName} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 text-white flex items-center justify-center text-xs font-bold">{initials}</div>
        </div>
      </header>

      {logoutError && (
        <p role="alert" className="mx-auto mt-4 max-w-7xl px-5 text-sm text-red-600 lg:px-8">
          {logoutError}
        </p>
      )}

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
                  {['Todos', ...statuses].map(status => <option key={status}>{status}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400">
                  {['Fecha', 'Facturas', 'RUC', 'Razón Social', 'Moneda', 'Monto', 'Estado'].map((heading, i) => (
                    <th key={heading} className={`${i === 5 ? 'text-right' : 'text-left'} px-5 lg:px-6 py-3.5 font-semibold whitespace-nowrap`}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestsLoading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400" role="status">Cargando solicitudes…</td></tr>
                ) : requestsError ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-600" role="alert">{requestsError}</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-sm font-medium text-slate-500">Todavia no se han negociado Facturas</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No hay solicitudes para este estado.</td></tr>
                ) : visible.map(row => (
                  <tr key={row.invoice_id} className="hover:bg-blue-500/[0.025] transition-colors">
                    <td className="px-5 lg:px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-5 lg:px-6 py-4 font-semibold text-blue-500 whitespace-nowrap">{row.invoice_number}</td>
                    <td className="px-5 lg:px-6 py-4 text-slate-500 whitespace-nowrap">{row.debtor_ruc}</td>
                    <td className="px-5 lg:px-6 py-4 font-medium text-navy-900 min-w-60">{row.debtor_name}</td>
                    <td className="px-5 lg:px-6 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">{row.currency}</span></td>
                    <td className="px-5 lg:px-6 py-4 text-right font-semibold text-navy-900 whitespace-nowrap">{formatAmount(row.amount, row.currency)}</td>
                    <td className="px-5 lg:px-6 py-4 whitespace-nowrap"><StatusBadge status={row.status || '—'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando {visible.length} de {requests.length} solicitudes</span>
          </div>
        </section>
      </main>

      {wizardOpen && companyId !== null && (
        <NegotiationWizard
          companyId={companyId}
          currency={currency}
          onClose={() => setWizardOpen(false)}
          onReturnToDashboard={returnToDashboard}
        />
      )}
    </div>
  )
}
