export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,  // muestra decimales solo si los tiene
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const STATUS_COLORS = {
  confirmada: 'bg-orange-100 text-orange-800',
  completada: 'bg-blue-100 text-blue-800',
  cancelada: 'bg-red-100 text-red-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  pagado: 'bg-orange-100 text-orange-800',
  parcial: 'bg-orange-100 text-orange-800',
  inscripcion: 'bg-blue-100 text-blue-800',
  en_curso: 'bg-orange-100 text-orange-800',
  finalizado: 'bg-gray-100 text-gray-800',
} as const

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmada: 'Confirmada',
    completada: 'Completada',
    cancelada: 'Cancelada',
    pendiente: 'Pendiente',
    pagado: 'Pagado',
    parcial: 'Parcial',
    inscripcion: 'Inscripción',
    en_curso: 'En Curso',
    finalizado: 'Finalizado',
    programado: 'Programado',
    en_juego: 'En Juego',
  }
  return labels[status] || status
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export function getLast30Days(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}
