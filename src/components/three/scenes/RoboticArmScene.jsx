import { OrbitControls, Environment } from '@react-three/drei'
import SceneCanvas from '../SceneCanvas'
import RoboticArm from '../models/RoboticArm'
import EngineeringEnvironment from '../EngineeringEnvironment'
import { useIsMobile } from '../../../hooks/useDevice'

export default function RoboticArmScene({ className = '' }) {
  const isMobile = useIsMobile()

  return (
    <SceneCanvas
      className={`w-full h-[320px] sm:h-[380px] lg:h-[420px] ${className}`}
      camera={{ position: [2, 1, 3], fov: 45 }}
    >
      <Environment preset="warehouse" />
      <EngineeringEnvironment density="minimal" />
      <RoboticArm />
      <OrbitControls
        enableZoom={!isMobile}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.5}
        dampingFactor={0.05}
        enableDamping
      />
    </SceneCanvas>
  )
}
