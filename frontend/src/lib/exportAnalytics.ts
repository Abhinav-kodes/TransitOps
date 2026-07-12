import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import Papa from "papaparse"

interface AnalyticsData {
  fleet_utilization: number
  on_time_delivery: number
  safety_incidents: number
  total_trips: number
  avg_fuel_efficiency: number
  vehicle_status_counts: Record<string, number>
  daily_utilization: { name: string; value: number }[]
  operational_cost: number
  vehicle_roi: number
  monthly_revenue: { month: string; revenue: number }[]
  top_costliest_vehicles: { name: string; cost: number }[]
}

const BRAND = [0, 128, 255] as const
const DARK = [15, 23, 42] as const
const MUTED = [100, 116, 139] as const
const CHART_PALETTE = [
  [0, 128, 255],
  [16, 185, 129],
  [245, 158, 11],
  [239, 68, 68],
  [139, 92, 246],
  [236, 72, 153],
  [20, 184, 166],
]

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return c
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.92): string {
  return canvas.toDataURL("image/png", quality)
}

/* ── Bar Chart ─────────────────────────────────────────────── */
function drawBarChart(
  labels: string[],
  values: number[],
  opts: {
    width?: number
    height?: number
    color?: [number, number, number]
    label?: string
    formatValue?: (v: number) => string
  } = {}
): string {
  const W = opts.width ?? 800
  const H = opts.height ?? 360
  const PAD = { top: 40, right: 30, bottom: 50, left: 70 }
  const barColor = opts.color ?? BRAND
  const fmt = opts.formatValue ?? ((v: number) => v.toLocaleString())

  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...values) * 1.15 || 1
  const barW = Math.min((chartW / labels.length) * 0.6, 50)
  const gap = (chartW - barW * labels.length) / (labels.length + 1)

  // Grid lines
  const gridLines = 5
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = 1
  ctx.font = "11px Inter, Helvetica, Arial, sans-serif"
  ctx.fillStyle = "#94a3b8"
  ctx.textAlign = "right"
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD.top + chartH - (chartH / gridLines) * i
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.moveTo(PAD.left, y)
    ctx.lineTo(W - PAD.right, y)
    ctx.stroke()
    ctx.setLineDash([])
    const val = (maxVal / gridLines) * i
    ctx.fillText(fmt(val), PAD.left - 8, y + 4)
  }

  // Bars with gradient
  labels.forEach((label, i) => {
    const x = PAD.left + gap + i * (barW + gap)
    const barH = (values[i] / maxVal) * chartH
    const y = PAD.top + chartH - barH

    const grad = ctx.createLinearGradient(x, y, x, PAD.top + chartH)
    grad.addColorStop(0, `rgba(${barColor[0]},${barColor[1]},${barColor[2]},1)`)
    grad.addColorStop(1, `rgba(${barColor[0]},${barColor[1]},${barColor[2]},0.6)`)
    ctx.fillStyle = grad

    const radius = Math.min(4, barW / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + barW - radius, y)
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius)
    ctx.lineTo(x + barW, PAD.top + chartH)
    ctx.lineTo(x, PAD.top + chartH)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.fill()

    // Value on top
    ctx.fillStyle = "#334155"
    ctx.font = "bold 10px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(fmt(values[i]), x + barW / 2, y - 6)

    // Label
    ctx.fillStyle = "#64748b"
    ctx.font = "11px Inter, Helvetica, Arial, sans-serif"
    ctx.fillText(label, x + barW / 2, PAD.top + chartH + 20)
  })

  // Title
  if (opts.label) {
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 14px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(opts.label, PAD.left, 24)
  }

  // Baseline
  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD.left, PAD.top + chartH)
  ctx.lineTo(W - PAD.right, PAD.top + chartH)
  ctx.stroke()

  return canvasToDataUrl(canvas)
}

/* ── Horizontal Bar Chart ──────────────────────────────────── */
function drawHorizontalBarChart(
  labels: string[],
  values: number[],
  opts: {
    width?: number
    height?: number
    colors?: [number, number, number][]
    label?: string
    formatValue?: (v: number) => string
  } = {}
): string {
  const W = opts.width ?? 800
  const H = opts.height ?? 360
  const PAD = { top: 40, right: 60, bottom: 20, left: 120 }
  const palette = opts.colors ?? CHART_PALETTE
  const fmt = opts.formatValue ?? ((v: number) => v.toLocaleString())

  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...values) * 1.15 || 1
  const barH = Math.min((chartH / labels.length) * 0.65, 36)
  const gap = (chartH - barH * labels.length) / (labels.length + 1)

  labels.forEach((label, i) => {
    const y = PAD.top + gap + i * (barH + gap)
    const w = (values[i] / maxVal) * chartW
    const color = palette[i % palette.length]

    // Bar with rounded right end
    const grad = ctx.createLinearGradient(PAD.left, 0, PAD.left + w, 0)
    grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.85)`)
    grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},1)`)
    ctx.fillStyle = grad

    const radius = Math.min(4, barH / 2)
    ctx.beginPath()
    ctx.moveTo(PAD.left, y)
    ctx.lineTo(PAD.left + w - radius, y)
    ctx.quadraticCurveTo(PAD.left + w, y, PAD.left + w, y + radius)
    ctx.quadraticCurveTo(PAD.left + w, y + barH, PAD.left + w - radius, y + barH)
    ctx.lineTo(PAD.left, y + barH)
    ctx.closePath()
    ctx.fill()

    // Label
    ctx.fillStyle = "#334155"
    ctx.font = "12px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.fillText(label.length > 14 ? label.slice(0, 13) + "…" : label, PAD.left - 10, y + barH / 2)

    // Value
    ctx.fillStyle = "#475569"
    ctx.font = "bold 11px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(fmt(values[i]), PAD.left + w + 8, y + barH / 2)
  })

  if (opts.label) {
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 14px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText(opts.label, PAD.left, 10)
  }

  return canvasToDataUrl(canvas)
}

/* ── Donut / Pie Chart ─────────────────────────────────────── */
function drawDonutChart(
  labels: string[],
  values: number[],
  opts: {
    width?: number
    height?: number
    colors?: [number, number, number][]
    label?: string
  } = {}
): string {
  const W = opts.width ?? 500
  const H = opts.height ?? 360
  const palette = opts.colors ?? CHART_PALETTE
  const total = values.reduce((a, b) => a + b, 0) || 1

  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const cx = W * 0.35
  const cy = H * 0.52
  const outerR = Math.min(cx - 30, cy - 30, 120)
  const innerR = outerR * 0.55

  let startAngle = -Math.PI / 2
  values.forEach((val, i) => {
    const sliceAngle = (val / total) * Math.PI * 2
    const color = palette[i % palette.length]

    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle)
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true)
    ctx.closePath()
    ctx.fill()

    // White separator
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.stroke()

    startAngle += sliceAngle
  })

  // Center text
  ctx.fillStyle = "#0f172a"
  ctx.font = "bold 22px Inter, Helvetica, Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(String(total), cx, cy - 6)
  ctx.fillStyle = "#94a3b8"
  ctx.font = "11px Inter, Helvetica, Arial, sans-serif"
  ctx.fillText("Total", cx, cy + 14)

  // Legend
  const legendX = W * 0.65
  let legendY = H * 0.2
  labels.forEach((label, i) => {
    const color = palette[i % palette.length]
    const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : "0"

    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`
    ctx.beginPath()
    ctx.arc(legendX, legendY, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#334155"
    ctx.font = "12px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(label.replace(/_/g, " "), legendX + 14, legendY)

    ctx.fillStyle = "#94a3b8"
    ctx.font = "11px Inter, Helvetica, Arial, sans-serif"
    ctx.fillText(`${values[i]} (${pct}%)`, legendX + 14, legendY + 16)

    legendY += 36
  })

  if (opts.label) {
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 14px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText(opts.label, 20, 14)
  }

  return canvasToDataUrl(canvas)
}

/* ── Line Chart ────────────────────────────────────────────── */
function drawLineChart(
  labels: string[],
  values: number[],
  opts: {
    width?: number
    height?: number
    color?: [number, number, number]
    label?: string
    formatValue?: (v: number) => string
    unit?: string
  } = {}
): string {
  const W = opts.width ?? 800
  const H = opts.height ?? 300
  const PAD = { top: 40, right: 30, bottom: 50, left: 60 }
  const lineColor = opts.color ?? BRAND
  const fmt = opts.formatValue ?? ((v: number) => `${v}${opts.unit ?? ""}`)

  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...values) * 1.2 || 1
  const minVal = 0

  // Grid
  const gridLines = 4
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = 1
  ctx.font = "11px Inter, Helvetica, Arial, sans-serif"
  ctx.fillStyle = "#94a3b8"
  ctx.textAlign = "right"
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD.top + chartH - (chartH / gridLines) * i
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.moveTo(PAD.left, y)
    ctx.lineTo(W - PAD.right, y)
    ctx.stroke()
    ctx.setLineDash([])
    const val = minVal + ((maxVal - minVal) / gridLines) * i
    ctx.fillText(fmt(val), PAD.left - 8, y + 4)
  }

  // Points and lines
  const points: [number, number][] = values.map((val, i) => {
    const x = PAD.left + (chartW / (labels.length - 1 || 1)) * i
    const y = PAD.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH
    return [x, y]
  })

  // Area fill
  const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH)
  areaGrad.addColorStop(0, `rgba(${lineColor[0]},${lineColor[1]},${lineColor[2]},0.15)`)
  areaGrad.addColorStop(1, `rgba(${lineColor[0]},${lineColor[1]},${lineColor[2]},0.01)`)
  ctx.fillStyle = areaGrad
  ctx.beginPath()
  ctx.moveTo(points[0][0], PAD.top + chartH)
  points.forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.lineTo(points[points.length - 1][0], PAD.top + chartH)
  ctx.closePath()
  ctx.fill()

  // Line
  ctx.strokeStyle = `rgb(${lineColor[0]},${lineColor[1]},${lineColor[2]})`
  ctx.lineWidth = 2.5
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.stroke()

  // Dots
  points.forEach(([x, y], i) => {
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgb(${lineColor[0]},${lineColor[1]},${lineColor[2]})`
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = "#334155"
    ctx.font = "bold 10px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(fmt(values[i]), x, y - 12)
  })

  // X labels
  ctx.fillStyle = "#64748b"
  ctx.font = "11px Inter, Helvetica, Arial, sans-serif"
  ctx.textAlign = "center"
  points.forEach(([x], i) => {
    ctx.fillText(labels[i], x, PAD.top + chartH + 20)
  })

  // Baseline
  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD.left, PAD.top + chartH)
  ctx.lineTo(W - PAD.right, PAD.top + chartH)
  ctx.stroke()

  if (opts.label) {
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 14px Inter, Helvetica, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(opts.label, PAD.left, 24)
  }

  return canvasToDataUrl(canvas)
}

/* ── PDF Helpers ───────────────────────────────────────────── */
function addPageNumber(doc: jsPDF, pageTotal: number) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`TransitOps Analytics Report`, 14, h - 10)
  doc.text(`Page ${pageTotal}`, w - 14, h - 10, { align: "right" })
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(14, h - 14, w - 14, h - 14)
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2])
  doc.rect(0, 0, w, 6, "F")
  doc.setFontSize(10)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text("TRANSITOPS", 14, 16)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.setFontSize(8)
  doc.text("Fleet Operations Platform", 14, 21)
  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
  doc.setLineWidth(0.4)
  doc.line(14, 24, w - 14, 24)
}

function drawKPICard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: readonly number[],
  unit?: string
) {
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(x, y, w, h, 3, 3, "F")
  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.rect(x, y, 3, h, "F")
  doc.setDrawColor(230, 230, 230)
  doc.roundedRect(x, y, w, h, 3, 3, "S")

  doc.setFontSize(7)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.setFont("helvetica", "normal")
  doc.text(label.toUpperCase(), x + 10, y + 10)

  doc.setFontSize(18)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text(value, x + 10, y + 24)

  if (unit) {
    const textW = doc.getTextWidth(value)
    doc.setFontSize(9)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont("helvetica", "normal")
    doc.text(unit, x + 10 + textW + 3, y + 24)
  }
}

/* ── Main PDF Generator ───────────────────────────────────── */
function generatePDF(data: AnalyticsData) {
  const doc = new jsPDF("p", "mm", "a4")
  const W = doc.internal.pageSize.getWidth()
  const MARGIN = 14
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  /* ── Page 1: Cover + KPIs + Revenue Chart ─────────────── */
  addHeader(doc, "TransitOps Analytics Report")

  // Title block
  doc.setFontSize(20)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text("Reports & Analytics", MARGIN, 38)

  doc.setFontSize(10)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.setFont("helvetica", "normal")
  doc.text(`Generated on ${dateStr} at ${timeStr}  |  Fleet Operations Dashboard`, MARGIN, 45)

  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2])
  doc.setLineWidth(0.8)
  doc.line(MARGIN, 49, W / 2 - 20, 49)

  // KPI Cards - 2 rows of 4
  const cardW = (W - MARGIN * 2 - 12) / 4
  const cardH = 28
  const kpiY = 55

  drawKPICard(doc, MARGIN, kpiY, cardW, cardH, "Fuel Efficiency", String(data.avg_fuel_efficiency), BRAND, "km/l")
  drawKPICard(doc, MARGIN + cardW + 4, kpiY, cardW, cardH, "Fleet Utilization", `${data.fleet_utilization}`, [16, 185, 129], "%")
  drawKPICard(doc, MARGIN + (cardW + 4) * 2, kpiY, cardW, cardH, "Operational Cost", `₹${data.operational_cost.toLocaleString("en-IN")}`, [245, 158, 11])
  drawKPICard(doc, MARGIN + (cardW + 4) * 3, kpiY, cardW, cardH, "Vehicle ROI", `${data.vehicle_roi}`, [16, 185, 129], "%")

  const kpiY2 = kpiY + cardH + 6
  drawKPICard(doc, MARGIN, kpiY2, cardW, cardH, "On-Time Delivery", `${data.on_time_delivery}`, BRAND, "%")
  drawKPICard(doc, MARGIN + cardW + 4, kpiY2, cardW, cardH, "Safety Incidents", String(data.safety_incidents), [239, 68, 68])
  drawKPICard(doc, MARGIN + (cardW + 4) * 2, kpiY2, cardW, cardH, "Total Trips", String(data.total_trips), [139, 92, 246])
  drawKPICard(doc, MARGIN + (cardW + 4) * 3, kpiY2, cardW, cardH, "Fleet Status", String(Object.values(data.vehicle_status_counts).reduce((a, b) => a + b, 0)), [20, 184, 166], "units")

  // Revenue Bar Chart
  const chartY = kpiY2 + cardH + 12
  const revenueImg = drawBarChart(
    data.monthly_revenue.map((r) => r.month),
    data.monthly_revenue.map((r) => r.revenue),
    { width: 780, height: 280, label: "Monthly Revenue (₹)", formatValue: (v) => `₹${(v / 1000).toFixed(0)}k` }
  )
  doc.addImage(revenueImg, "PNG", MARGIN, chartY, W - MARGIN * 2, 80)

  addPageNumber(doc, 1)

  /* ── Page 2: Vehicle Costs + Status Donut ──────────────── */
  doc.addPage()
  addHeader(doc, "TransitOps Analytics Report")

  doc.setFontSize(14)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text("Fleet Expenditure Analysis", MARGIN, 36)

  doc.setFontSize(9)
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.setFont("helvetica", "normal")
  doc.text("Vehicle-wise cost breakdown and fleet status distribution", MARGIN, 42)

  // Horizontal bar chart - costliest vehicles
  const hbarImg = drawHorizontalBarChart(
    data.top_costliest_vehicles.map((v) => v.name),
    data.top_costliest_vehicles.map((v) => v.cost),
    {
      width: 780,
      height: 280,
      label: "Top Costliest Vehicles (₹)",
      formatValue: (v) => `₹${v.toLocaleString("en-IN")}`,
    }
  )
  doc.addImage(hbarImg, "PNG", MARGIN, 48, W - MARGIN * 2, 76)

  // Donut chart
  const statusLabels = Object.keys(data.vehicle_status_counts)
  const statusValues = Object.values(data.vehicle_status_counts)
  const donutImg = drawDonutChart(statusLabels, statusValues, {
    width: 500,
    height: 320,
    label: "Vehicle Status Distribution",
  })
  doc.addImage(donutImg, "PNG", MARGIN, 128, W - MARGIN * 2, 72)

  addPageNumber(doc, 2)

  /* ── Page 3: Utilization + Detailed Tables ─────────────── */
  doc.addPage()
  addHeader(doc, "TransitOps Analytics Report")

  doc.setFontSize(14)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text("Operational Trends & Data", MARGIN, 36)

  // Daily Utilization line chart
  const lineImg = drawLineChart(
    data.daily_utilization.map((d) => d.name),
    data.daily_utilization.map((d) => d.value),
    {
      width: 780,
      height: 240,
      color: [16, 185, 129],
      label: "Daily Fleet Utilization (%)",
      formatValue: (v) => `${v}%`,
    }
  )
  doc.addImage(lineImg, "PNG", MARGIN, 42, W - MARGIN * 2, 60)

  // Detailed Data Tables
  let tableY = 108

  doc.setFontSize(11)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text("Monthly Revenue Detail", MARGIN, tableY)
  tableY += 4

  autoTable(doc, {
    startY: tableY,
    head: [["Month", "Revenue (₹)"]],
    body: data.monthly_revenue.map((r) => [r.month, `₹${r.revenue.toLocaleString("en-IN")}`]),
    theme: "striped",
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], fontSize: 9, fontStyle: "bold", cellPadding: 3 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "right", cellPadding: 3 } },
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: () => {},
  })

  tableY = (doc as any).lastAutoTable.finalY + 10

  doc.setFontSize(11)
  doc.setTextColor(DARK[0], DARK[1], DARK[2])
  doc.setFont("helvetica", "bold")
  doc.text("Vehicle Status Breakdown", MARGIN, tableY)
  tableY += 4

  autoTable(doc, {
    startY: tableY,
    head: [["Status", "Count", "Percentage"]],
    body: Object.entries(data.vehicle_status_counts).map(([status, count]) => {
      const total = Object.values(data.vehicle_status_counts).reduce((a, b) => a + b, 0)
      return [status.replace(/_/g, " "), String(count), `${total > 0 ? ((count / total) * 100).toFixed(1) : 0}%`]
    }),
    theme: "striped",
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], fontSize: 9, fontStyle: "bold", cellPadding: 3 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: MARGIN, right: MARGIN },
  })

  tableY = (doc as any).lastAutoTable.finalY + 10

  if (tableY < 220) {
    doc.setFontSize(11)
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.setFont("helvetica", "bold")
    doc.text("Daily Utilization", MARGIN, tableY)
    tableY += 4

    autoTable(doc, {
      startY: tableY,
      head: [["Day", "Utilization (%)"]],
      body: data.daily_utilization.map((d) => [d.name, `${d.value}%`]),
      theme: "striped",
      headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], fontSize: 9, fontStyle: "bold", cellPadding: 3 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: MARGIN, right: MARGIN },
    })
  }

  addPageNumber(doc, 3)

  doc.save(`TransitOps_Report_${dateStr.replace(/\s/g, "_")}.pdf`)
}

/* ── CSV Generator (unchanged) ──────────────────────────────── */
function generateCSV(data: AnalyticsData) {
  const sections: Record<string, Record<string, string | number>[]> = {
    "Key Performance Indicators": [
      { Metric: "Fuel Efficiency", Value: `${data.avg_fuel_efficiency} km/l` },
      { Metric: "Fleet Utilization", Value: `${data.fleet_utilization}%` },
      { Metric: "Operational Cost", Value: data.operational_cost },
      { Metric: "Vehicle ROI", Value: `${data.vehicle_roi}%` },
      { Metric: "On-Time Delivery", Value: `${data.on_time_delivery}%` },
      { Metric: "Safety Incidents", Value: data.safety_incidents },
      { Metric: "Total Trips", Value: data.total_trips },
    ],
    "Vehicle Status Breakdown": Object.entries(data.vehicle_status_counts).map(([status, count]) => ({
      Status: status.replace(/_/g, " "),
      Count: count,
    })),
    "Monthly Revenue": data.monthly_revenue.map((r) => ({
      Month: r.month,
      Revenue: r.revenue,
    })),
    "Top Costliest Vehicles": data.top_costliest_vehicles.map((v) => ({
      Vehicle: v.name,
      Cost: v.cost,
    })),
    "Daily Utilization": data.daily_utilization.map((d) => ({
      Day: d.name,
      "Utilization (%)": d.value,
    })),
  }

  let csv = ""
  for (const [section, rows] of Object.entries(sections)) {
    csv += `\n## ${section}\n`
    csv += Papa.unparse(rows)
  }

  const blob = new Blob([csv.trim()], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s/g, "_")
  a.download = `TransitOps_Report_${dateStr}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportAnalytics(data: AnalyticsData, format: "pdf" | "csv") {
  if (format === "pdf") {
    generatePDF(data)
  } else {
    generateCSV(data)
  }
}
