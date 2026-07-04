import { Suspense } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Hero from '../components/landing/Hero'
import WhatIsPilotKids from '../components/landing/WhatIsPilotKids'
import Benefits from '../components/landing/Benefits'
import LearningRoadmap from '../components/landing/LearningRoadmap'
import SubscriptionPlans from '../components/landing/SubscriptionPlans'
import StudentAchievements from '../components/landing/StudentAchievements'
import Testimonials from '../components/landing/Testimonials'
import FAQ from '../components/landing/FAQ'
import FinalCTA from '../components/landing/FinalCTA'
import LandingBackdrop from '../components/landing/LandingBackdrop'
import PageTransition from '../components/ui/PageTransition'
import { ScrollStage } from '../components/three/lazy'
import { useIsMobile, usePrefersReducedMotion } from '../hooks/useDevice'
import { useScrollStage } from '../hooks/useScrollStage'

export default function LandingPage() {
  // Scroll-driven 3D faqat desktop + motion ruxsat etilganda: mobilda three.js
  // chunk'i umuman yuklanmaydi, reduced-motion'da sahifa statik qoladi (a11y).
  const isMobile = useIsMobile(1024)
  const reducedMotion = usePrefersReducedMotion()
  const enable3D = !isMobile && !reducedMotion

  // Bo'lim-asosli scroll progress → zustand store → SceneController (useFrame)
  useScrollStage(enable3D)

  return (
    <>
      {/* Fixed qatlamlar PageTransition TASHQARISIDA turishi shart: uning
          transform/filter animatsiyasi fixed elementlarning containing block'ini
          o'zgartirib, canvas'ni butun hujjat balandligiga cho'zib yuboradi. */}
      <LandingBackdrop />
      {enable3D && (
        <Suspense fallback={null}>
          <ScrollStage />
        </Suspense>
      )}

      <PageTransition>
        <div className="relative z-10 min-h-screen">
          <Navbar />
          <Hero />
          <WhatIsPilotKids />
          <Benefits />
          <LearningRoadmap />
          <SubscriptionPlans />
          <StudentAchievements />
          <Testimonials />
          <FAQ />
          <FinalCTA />
          <Footer />
        </div>
      </PageTransition>
    </>
  )
}
