import { AlertCircle, Loader2 } from '../../lib/icons'

// API so'rovlarining loading/error holatlari uchun umumiy blok.
export function LoadingState({ label = 'Yuklanmoqda...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-sky mb-3" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" aria-hidden="true" />
      </div>
      <p className="font-medium text-slate-900 dark:text-white">Ma'lumotni yuklab bo'lmadi</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        {error?.message || 'Noma\'lum xatolik yuz berdi'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Qayta urinish
        </button>
      )}
    </div>
  )
}
