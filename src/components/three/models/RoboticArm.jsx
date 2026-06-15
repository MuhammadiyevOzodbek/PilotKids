import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTheme } from '../../../context/ThemeContext'

export default function RoboticArm() {
  const baseRef = useRef()
  const shoulderRef = useRef()
  const elbowRef = useRef()
  const wristRef = useRef()
  const gripperRef = useRef()
  const { isDark } = useTheme()

  const metal = isDark ? '#64748b' : '#94a3b8'
  const accent = isDark ? '#06b6d4' : '#2563eb'
  const joint = isDark ? '#334155' : '#cbd5e1'

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (shoulderRef.current) shoulderRef.current.rotation.z = Math.sin(t * 0.5) * 0.4 - 0.3
    if (elbowRef.current) elbowRef.current.rotation.z = Math.sin(t * 0.7 + 1) * 0.5 + 0.8
    if (wristRef.current) wristRef.current.rotation.y = Math.sin(t * 0.9) * 0.6
    if (gripperRef.current) {
      gripperRef.current.rotation.z = Math.sin(t * 2) * 0.1
    }
    if (baseRef.current) baseRef.current.rotation.y = Math.sin(t * 0.2) * 0.1
  })

  return (
    <group ref={baseRef} position={[0, -1.2, 0]}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.3, 24]} />
        <meshStandardMaterial color={joint} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Shoulder */}
      <group ref={shoulderRef} position={[0, 0.35, 0]}>
        <mesh>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.25, 1, 0.25]} />
          <meshStandardMaterial color={metal} metalness={0.85} roughness={0.15} />
        </mesh>

        {/* Elbow */}
        <group ref={elbowRef} position={[0, 1, 0]}>
          <mesh>
            <sphereGeometry args={[0.16]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.2, 0.9, 0.2]} />
            <meshStandardMaterial color={metal} metalness={0.85} roughness={0.15} />
          </mesh>

          {/* Wrist */}
          <group ref={wristRef} position={[0, 0.9, 0]}>
            <mesh>
              <sphereGeometry args={[0.12]} />
              <meshStandardMaterial color={joint} metalness={0.8} roughness={0.2} />
            </mesh>
            <group ref={gripperRef} position={[0, 0.2, 0]}>
              <mesh position={[-0.08, 0.15, 0]}>
                <boxGeometry args={[0.06, 0.3, 0.08]} />
                <meshStandardMaterial color={metal} metalness={0.9} roughness={0.1} />
              </mesh>
              <mesh position={[0.08, 0.15, 0]}>
                <boxGeometry args={[0.06, 0.3, 0.08]} />
                <meshStandardMaterial color={metal} metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Part being assembled */}
              <mesh position={[0, 0.35, 0]}>
                <boxGeometry args={[0.15, 0.15, 0.15]} />
                <meshStandardMaterial
                  color={accent}
                  emissive={accent}
                  emissiveIntensity={isDark ? 0.6 : 0.3}
                  metalness={0.7}
                  roughness={0.2}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* Work surface */}
      <mesh position={[0, -0.05, 0.8]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.8, 0.08, 1]} />
        <meshStandardMaterial color={isDark ? '#1e293b' : '#e2e8f0'} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}
