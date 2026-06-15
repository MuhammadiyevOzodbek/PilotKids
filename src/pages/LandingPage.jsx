import { useEffect } from 'react'
import AOS from 'aos'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Hero from '../components/landing/Hero'
import WhatIsPilotKids from '../components/landing/WhatIsPilotKids'
import Benefits from '../components/landing/Benefits'
import LearningRoadmap from '../components/landing/LearningRoadmap'
import SubscriptionPlans from '../components/landing/SubscriptionPlans'
import StudentAchievements from '../components/landing/StudentAchievements'
import FAQ from '../components/landing/FAQ'
import Testimonials from '../components/landing/Testimonials'
import PageTransition from '../components/ui/PageTransition'

export default function LandingPage() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, offset: 80 })
  }, [])

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <Navbar />
        <Hero />
        <WhatIsPilotKids />
        <Benefits />
        <LearningRoadmap />
        <SubscriptionPlans />
        <StudentAchievements />
        <Testimonials />
        <FAQ />
        <Footer />
      </div>
    </PageTransition>
  )
}
