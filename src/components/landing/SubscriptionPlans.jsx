import PricingCard from '../ui/PricingCard'
import ScrollReveal from '../ui/ScrollReveal'

export default function SubscriptionPlans() {
  return (
    <section id="pricing" data-scroll-stage className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Obuna</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Obuna Rejalari
          </h2>
        </ScrollReveal>

        <div className="flex justify-center">
          <ScrollReveal distance={56}>
            <PricingCard />
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
