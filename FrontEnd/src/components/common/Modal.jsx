import Button from './Button'
import { X } from 'lucide-react'

function Modal({ title, children, onClose, footer }) {
  // Modal simple para confirmaciones o formularios cortos.
  let footerContent = null

  if (footer) {
    footerContent = <div className="mt-5 flex justify-end gap-2">{footer}</div>
  }

  return (
    <aside className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <button
            className="grid size-9 place-items-center rounded-full border border-emerald-100 text-xl font-black text-emerald-900 hover:bg-emerald-50"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div>{children}</div>
        {footerContent}
      </section>
    </aside>
  )
}

export function ModalCloseButton({ onClick }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      Cancelar
    </Button>
  )
}

export default Modal
