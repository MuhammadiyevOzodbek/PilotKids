import { Environment } from '@react-three/drei'
import SceneCanvas from '../SceneCanvas'
import AssistantRobot from '../models/AssistantRobot'

export default function AssistantScene({ expression = 'happy', className = '' }) {
  return (
    <SceneCanvas
      className={`w-full h-32 ${className}`}
      camera={{ position: [0, 0.2, 2.5], fov: 40 }}
      lightIntensity={0.8}
    >
      <Environment preset="city" />
      <AssistantRobot expression={expression} />
    </SceneCanvas>
  )
}
