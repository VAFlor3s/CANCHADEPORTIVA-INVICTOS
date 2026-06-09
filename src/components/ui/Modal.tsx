'use client'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-2xl', xl:'max-w-4xl' }

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full ${sizes[size]} rounded-2xl flex flex-col max-h-[90vh]`}
        style={{ background: '#1a0f12', border: '1px solid rgba(249,115,22,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <button onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
