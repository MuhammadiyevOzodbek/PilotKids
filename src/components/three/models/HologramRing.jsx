import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import { useTheme } from '../../../context/ThemeContext'

export default function HologramRing() {
  const ringRef = useRef()
  const ring2Ref = useRef()
  const cardRef = useRef()
  const { isDark } = useTheme()

  const primary = isDark ? '#3b82f6' : '#2563eb'
  const accent = isDark ? '#06b6d4' : '#38bdf8'

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) ringRef.current.rotation.z = t * 0.4
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 2
      ring2Ref.current.rotation.z = -t * 0.3
    }
    if (cardRef.current) {
      cardRef.current.position.y = Math.sin(t * 0.8) * 0.05
    }
  })

  return (
    <group>
      <Sparkles count={50} scale={3} size={isDark ? 2 : 1.5} speed={0.25} color={accent} opacity={isDark ? 0.7 : 0.4} />

      {/* Holographic card */}
      <Float speed={1.5} floatIntensity={0.2}>
        <group ref={cardRef}>
          <mesh>
            <boxGeometry args={[2, 2.6, 0.05]} />
            <meshPhysicalMaterial
              color={isDark ? '#111827' : '#ffffff'}
              metalness={0.2}
              roughness={0.1}
              transmission={0.6}
              thickness={0.5}
              transparent
              opacity={0.85}
            />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.6, 0.4]} />
            <meshBasicMaterial color={primary} transparent opacity={0.3} />
          </mesh>
          <mesh position={[0, 0.5, 0.03]}>
            <planeGeometry args={[1.2, 0.15]} />
            <meshBasicMaterial color={accent} transparent opacity={0.5} />
          </mesh>
        </group>
      </Float>

      {/* Rotating rings */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.6, 0.02, 8, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isDark ? 0.8 : 0.4} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.8, 0.015, 8, 64]} />
        <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={isDark ? 0.5 : 0.25} metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>

      {/* Energy pillars */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 1.2, -1.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 3, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}
