import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTheme } from '../../../context/ThemeContext'

export default function AssistantRobot({ expression = 'happy' }) {
  const groupRef = useRef()
  const headRef = useRef()
  const leftEyeRef = useRef()
  const rightEyeRef = useRef()
  const { isDark } = useTheme()

  const bodyColor = isDark ? '#1e293b' : '#e2e8f0'
  const accent = isDark ? '#38bdf8' : '#2563eb'
  const eyeScale = expression === 'excited' ? 1.2 : 1

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.05
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.15
    }
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(t * 0.8) * 0.05
    }
    ;[leftEyeRef, rightEyeRef].forEach((ref, i) => {
      if (ref.current) {
        const blink = Math.sin(t * 2 + i) > 0.95 ? 0.1 : eyeScale
        ref.current.scale.y = blink
        if (ref.current.material) {
          ref.current.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.2
        }
      }
    })
  })

  return (
    <group ref={groupRef} scale={0.7}>
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </mesh>
      <group ref={headRef} position={[0, 0.35, 0]}>
        <mesh>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color={isDark ? '#475569' : '#cbd5e1'} metalness={0.75} roughness={0.2} />
        </mesh>
        <mesh ref={leftEyeRef} position={[-0.15, 0.05, 0.38]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.15, 0.05, 0.38]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
        </mesh>
        {expression === 'happy' && (
          <mesh position={[0, -0.1, 0.4]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} />
          </mesh>
        )}
      </group>
      {/* Small arms */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.45, 0, 0]} rotation={[0, 0, side * 0.4]}>
          <capsuleGeometry args={[0.05, 0.2]} />
          <meshStandardMaterial color={isDark ? '#64748b' : '#94a3b8'} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}
