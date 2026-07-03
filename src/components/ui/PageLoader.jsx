import { Bot } from '../../lib/icons'

// Route lazy-load paytida ko'rsatiladigan to'liq ekranli yuklovchi.
export default function PageLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-950"
      role="status"
      aria-live="polite"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse motion-reduce:animate-none">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400">Yuklanmoqda...</span>
    </div>
  )
}
