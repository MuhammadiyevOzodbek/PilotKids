import { useState } from 'react'
import { ContactShadows, Environment } from '@react-three/drei'
import SceneCanvas from '../SceneCanvas'
import EngineeringEnvironment from '../EngineeringEnvironment'
import EducationalRobot from '../models/EducationalRobot'
import { useScrollY } from '../../../hooks/useDevice'

// Mobil gate Hero.jsx'da (lazy import'dan oldin) — bu komponent faqat desktopda mount qilinadi.
export default function HeroScene3D({ className = '' }) {
  const [hovered, setHovered] = useState(false)
  const scrollY = useScrollY()
  const scrollRotation = Math.min(scrollY * 0.0008, 0.5)

  return (
    <SceneCanvas
      className={`w-full h-[420px] xl:h-[480px] cursor-pointer ${className}`}
      camera={{ position: [0, 0.3, 4.5], fov: 42 }}
    >
      <Environment preset="city" />
      <EngineeringEnvironment density="full" />
      <group
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <EducationalRobot scrollRotation={scrollRotation} hovered={hovered} />
      </group>
      <ContactShadows position={[0, -1.4, 0]} opacity={0.4} scale={5} blur={2} />
    </SceneCanvas>
  )
}
