import PricingCard from '../ui/PricingCard'

export default function SubscriptionPlans() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16" data-aos="fade-up">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Obuna</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Obuna Rejalari
          </h2>
        </div>

        <div className="flex justify-center">
          <PricingCard />
        </div>
      </div>
    </section>
  )
}
