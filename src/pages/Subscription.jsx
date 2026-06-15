import { Link } from 'react-router-dom'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import PageTransition from '../components/ui/PageTransition'
import PricingCard from '../components/ui/PricingCard'
import { HologramScene } from '../components/three/lazy'

export default function Subscription() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />

        <section className="pt-32 pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4"
            >
              Premium <span className="text-gradient">Obuna</span>
            </motion.h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Barcha kurslar va imkoniyatlarga to'liq kirish
            </p>
          </div>

          <div className="flex justify-center px-4 relative">
            <div className="relative max-w-lg w-full min-h-[520px]">
              <Suspense fallback={null}>
                <HologramScene />
              </Suspense>
              <div className="relative z-10 flex justify-center pt-8">
                <PricingCard showLink={false} />
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/dashboard" className="text-primary dark:text-sky hover:underline text-sm transition-colors duration-300">
              Dashboardga qaytish →
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  )
}
