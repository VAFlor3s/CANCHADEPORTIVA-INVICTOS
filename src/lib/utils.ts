export function fmt(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount)
}

export function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function fmtTime(t: string) { return t.slice(0, 5) }

export function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function getLast30Days() {
  const end   = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return {
    start: start.toISOString().split('T')[0],
    end:   end.toISOString().split('T')[0],
  }
}

export const STATUS_COLOR: Record<string, string> = {
  confirmada:  'bg-orange-100 text-orange-800',
  completada:  'bg-blue-100 text-blue-800',
  cancelada:   'bg-red-100 text-red-800',
  pendiente:   'bg-yellow-100 text-yellow-800',
  pagado:      'bg-green-100 text-green-800',
  parcial:     'bg-yellow-100 text-yellow-800',
  inscripcion: 'bg-sky-100 text-sky-800',
  en_curso:    'bg-orange-100 text-orange-800',
  finalizado:  'bg-gray-100 text-gray-600',
}

export const STATUS_LABEL: Record<string, string> = {
  confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada',
  pendiente: 'Pendiente', pagado: 'Pagado', parcial: 'Parcial',
  inscripcion: 'Inscripción', en_curso: 'En Curso', finalizado: 'Finalizado',
}
