import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Sparkles } from '@react-three/drei'
import ThemeLights from '../ThemeLights'
import SceneController from './SceneController'

// Landing sahifasining YAGONA Canvas'i — butun sahifa uchun fixed fon qatlami.
// pointer-events-none: tugma/link bosishga hech qachon xalaqit bermaydi.
// Mount gate'i (mobil / prefers-reduced-motion) LandingPage'da — bu komponent
// faqat desktop + motion ruxsat etilganda yuklanadi.
export default function ScrollStage() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.4, 6.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <ThemeLights />
        <Suspense fallback={null}>
          <Environment preset="city" />
          {/* Nozik atmosfera — gear/halqa kabi katta shakllar emas (ular HTML
              kontent bilan vizual to'qnashardi), faqat mayda uchqunlar */}
          <Sparkles count={70} scale={[14, 9, 6]} size={2} speed={0.25} color="#38bdf8" opacity={0.35} />
          <SceneController />
        </Suspense>
      </Canvas>
    </div>
  )
}
