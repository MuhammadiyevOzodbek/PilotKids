import { useState } from 'react'
import { ChevronDown } from '../../lib/icons'
import { motion, AnimatePresence } from 'framer-motion'
import ScrollReveal from '../ui/ScrollReveal'
import { faqs } from '../../data/mockData'

export default function FAQ() {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Ko'p So'raladigan Savollar
          </h2>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal
              key={faq.q}
              index={i}
              distance={32}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
                aria-controls={`faq-panel-${i}`}
                className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-semibold text-slate-900 dark:text-white pr-4">{faq.q}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    id={`faq-panel-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="px-5 pb-5 text-slate-500 dark:text-slate-400 leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
