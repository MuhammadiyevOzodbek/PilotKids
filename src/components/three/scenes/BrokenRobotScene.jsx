import { Environment } from '@react-three/drei'
import SceneCanvas from '../SceneCanvas'
import BrokenRobot from '../models/BrokenRobot'
import EngineeringEnvironment from '../EngineeringEnvironment'

export default function BrokenRobotScene({ className = '' }) {
  return (
    <SceneCanvas
      className={`w-full h-64 sm:h-80 ${className}`}
      camera={{ position: [0, 0.5, 4], fov: 45 }}
    >
      <Environment preset="night" />
      <EngineeringEnvironment density="minimal" />
      <BrokenRobot />
    </SceneCanvas>
  )
}
