import { Bot } from '../../lib/icons'
import { Link } from 'react-router-dom'
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-dark overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-circuit" />
        <div className="absolute top-20 left-20 w-32 h-32 border border-sky/20 rounded-full animate-pulse-glow" />
        <div className="absolute bottom-32 right-16 w-24 h-24 border border-accent/30 rounded-lg rotate-45 animate-float" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-blue">
            <Bot className="w-12 h-12 text-white" />
          </div>
          <p className="font-display text-3xl font-bold text-white mb-3">PilotKids</p>
          <p className="text-sky text-lg mb-6">Kelajak muhandislari shu yerda boshlanadi</p>
          <p className="text-slate-400 text-sm">
            Robototexnika, elektronika va muhandislikni onlayn o'rganing. Amaliy loyihalar va professional mentorlar bilan.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center p-4 sm:p-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-slate-900 dark:text-white">PilotKids</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:text-left">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
