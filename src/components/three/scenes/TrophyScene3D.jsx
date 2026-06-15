import { OrbitControls, Environment } from '@react-three/drei'
import SceneCanvas from '../SceneCanvas'
import TrophyPodium from '../models/TrophyPodium'
import { useIsMobile } from '../../../hooks/useDevice'

export default function TrophyScene3D({ className = '' }) {
  const isMobile = useIsMobile()

  return (
    <SceneCanvas
      className={`w-full h-48 sm:h-56 ${className}`}
      camera={{ position: [0, 1.5, 4], fov: 40 }}
    >
      <Environment preset="sunset" />
      <TrophyPodium />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
        dampingFactor={0.05}
        enableDamping
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
      />
    </SceneCanvas>
  )
}
