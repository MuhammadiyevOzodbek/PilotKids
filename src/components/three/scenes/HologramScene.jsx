import SceneCanvas from '../SceneCanvas'
import HologramRing from '../models/HologramRing'
import { Environment } from '@react-three/drei'

export default function HologramScene({ className = '' }) {
  return (
    <SceneCanvas
      className={`absolute inset-0 -z-0 pointer-events-none ${className}`}
      camera={{ position: [0, 0, 4], fov: 45 }}
    >
      <Environment preset="night" />
      <HologramRing />
    </SceneCanvas>
  )
}
