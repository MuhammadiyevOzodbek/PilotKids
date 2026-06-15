import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import { useTheme } from '../../context/ThemeContext'
import { useIsMobile } from '../../hooks/useDevice'

function Gear({ position, scale = 1, speed = 1 }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed * 0.4
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <torusGeometry args={[0.5, 0.12, 8, 16]} />
      <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
    </mesh>
  )
}

function CircuitPanel({ position, rotation = [0, 0, 0] }) {
  const { isDark } = useTheme()
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh position={position} rotation={rotation}>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial
          color={isDark ? '#1e293b' : '#e2e8f0'}
          metalness={0.6}
          roughness={0.3}
          emissive={isDark ? '#06b6d4' : '#2563eb'}
          emissiveIntensity={isDark ? 0.15 : 0.05}
        />
      </mesh>
    </Float>
  )
}

function MechRing({ position, scale = 1 }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += delta * 0.2
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <torusGeometry args={[1, 0.03, 8, 48]} />
      <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.1} emissive="#06b6d4" emissiveIntensity={0.3} />
    </mesh>
  )
}

export default function EngineeringEnvironment({ density = 'full' }) {
  const { isDark } = useTheme()
  const isMobile = useIsMobile()
  const count = density === 'minimal' || isMobile ? 30 : 80

  return (
    <group>
      <Sparkles
        count={count}
        scale={[12, 8, 8]}
        size={isMobile ? 1.5 : 2}
        speed={0.3}
        color={isDark ? '#38bdf8' : '#2563eb'}
        opacity={isDark ? 0.6 : 0.35}
      />
      {!isMobile && (
        <>
          <Gear position={[-3, 1.5, -2]} scale={0.6} speed={-1} />
          <Gear position={[3.5, -0.5, -1]} scale={0.45} />
          <Gear position={[-2, -1.8, 0]} scale={0.35} speed={0.8} />
          <CircuitPanel position={[2.5, 1, -1.5]} rotation={[0.3, 0.5, 0]} />
          <CircuitPanel position={[-2.8, 0.2, -2]} rotation={[-0.2, -0.4, 0.1]} />
          <MechRing position={[0, 0, -3]} scale={1.8} />
          <MechRing position={[0, 0, -3]} rotation={[Math.PI / 2, 0, 0]} scale={1.2} />
        </>
      )}
    </group>
  )
}
