import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useTheme } from '../../../context/ThemeContext'

function FloatingPart({ position, geometry, args, rotationSpeed = 1 }) {
  const ref = useRef()
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * rotationSpeed
      ref.current.rotation.z += delta * rotationSpeed * 0.5
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.15
    }
  })

  return (
    <mesh ref={ref} position={position}>
      {geometry === 'box' && <boxGeometry args={args} />}
      {geometry === 'sphere' && <sphereGeometry args={args} />}
      {geometry === 'cylinder' && <cylinderGeometry args={args} />}
      <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
    </mesh>
  )
}

export default function BrokenRobot() {
  const bodyRef = useRef()
  const headRef = useRef()
  const antennaRef = useRef()
  const scanRef = useRef()
  const { isDark } = useTheme()

  const eyeColor = isDark ? '#38bdf8' : '#2563eb'

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(t * 0.5) * 0.08 + 0.15
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.4
      headRef.current.rotation.x = Math.sin(t * 0.6) * 0.2
    }
    if (antennaRef.current) {
      const blink = Math.sin(t * 4) > 0 ? 1 : 0.2
      if (antennaRef.current.material) {
        antennaRef.current.material.emissiveIntensity = blink * 2
      }
    }
    if (scanRef.current) {
      scanRef.current.rotation.y = t * 1.5
      scanRef.current.material.opacity = 0.15 + Math.sin(t * 2) * 0.1
    }
  })

  return (
    <group>
      {/* Broken body */}
      <group ref={bodyRef} position={[0, -0.2, 0]} rotation={[0, 0, 0.15]}>
        <mesh>
          <boxGeometry args={[1, 1.2, 0.7]} />
          <meshStandardMaterial color={isDark ? '#334155' : '#94a3b8'} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Crack line */}
        <mesh position={[0.1, 0.2, 0.36]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.05, 0.6, 0.02]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Head searching */}
      <group ref={headRef} position={[0.3, 0.7, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.65, 0.7]} />
          <meshStandardMaterial color={isDark ? '#475569' : '#cbd5e1'} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.18, 0.05, 0.36]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.18, 0.05, 0.36]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.3} />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.35]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh ref={antennaRef} position={[0, 0.65, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Scan ring */}
      <mesh ref={scanRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[1, 1.8, 32]} />
        <meshBasicMaterial color={eyeColor} transparent opacity={0.2} side={2} />
      </mesh>

      {/* Floating broken parts */}
      <FloatingPart position={[-1.2, 0.8, 0.3]} geometry="box" args={[0.2, 0.2, 0.2]} />
      <FloatingPart position={[1.3, 0.5, -0.2]} geometry="cylinder" args={[0.08, 0.08, 0.3, 8]} />
      <FloatingPart position={[-0.8, -0.5, 0.5]} geometry="sphere" args={[0.12]} rotationSpeed={0.7} />
      <FloatingPart position={[1, -0.3, 0.4]} geometry="box" args={[0.15, 0.25, 0.1]} rotationSpeed={1.2} />

      <Float speed={2} floatIntensity={0.5}>
        <mesh position={[0, 1.5, 0]}>
          <octahedronGeometry args={[0.1]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} wireframe />
        </mesh>
      </Float>
    </group>
  )
}
