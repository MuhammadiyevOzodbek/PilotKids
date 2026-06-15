export default function SceneFallback({ className = '' }) {
  return (
    <div className={`flex items-center justify-center bg-slate-900/20 animate-pulse ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-sky/30 border-t-sky animate-spin" />
        <span className="text-xs text-slate-400">3D yuklanmoqda...</span>
      </div>
    </div>
  )
}
