import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useTheme } from '../../../context/ThemeContext'

// Arduino-uslubidagi o'quv platasi — scroll sahnasining "Elektronika" bosqichi.
// Oddiy primitivlardan yig'ilgan (GLTF yo'q): PCB, MCU chip, pin header'lar,
// USB port, pulsatsiyalanuvchi LED va kondensatorlar.
export default function CircuitBoard() {
  const ledRef = useRef()
  const led2Ref = useRef()
  const groupRef = useRef()
  const { isDark } = useTheme()

  const pcb = isDark ? '#065f46' : '#059669'
  const chip = isDark ? '#0f172a' : '#1e293b'
  const pin = isDark ? '#fbbf24' : '#d97706'
  const trace = isDark ? '#34d399' : '#6ee7b7'

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ledRef.current?.material) {
      // "Blink" sketch'i — Arduino'ning klassik birinchi dasturi
      ledRef.current.material.emissiveIntensity = Math.sin(t * 4) > 0 ? 2.2 : 0.15
    }
    if (led2Ref.current?.material) {
      led2Ref.current.material.emissiveIntensity = 1 + Math.sin(t * 2.5) * 0.6
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.25
    }
  })

  return (
    <group ref={groupRef}>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.5}>
        {/* Musbat X qiyalik — plata yuqori yuzasi kameraga qaraydi
            (model kamera ko'z sathidan yuqorida joylashadi) */}
        <group rotation={[0.55, 0, 0.08]}>
          {/* PCB plata */}
          <mesh>
            <boxGeometry args={[2.4, 0.08, 1.6]} />
            <meshStandardMaterial color={pcb} metalness={0.35} roughness={0.5} />
          </mesh>

          {/* Mis yo'lakchalar (traces) */}
          {[[-0.7, 0.35], [0.2, -0.3], [0.9, 0.15], [-0.2, 0.55], [0.55, -0.55]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.045, z]} rotation={[0, i % 2 ? 0.9 : 0, 0]}>
              <boxGeometry args={[0.55, 0.005, 0.03]} />
              <meshStandardMaterial
                color={trace}
                emissive={trace}
                emissiveIntensity={isDark ? 0.5 : 0.2}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          ))}

          {/* MCU chip */}
          <mesh position={[-0.3, 0.1, 0]}>
            <boxGeometry args={[0.7, 0.12, 0.5]} />
            <meshStandardMaterial color={chip} metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Chip oyoqchalari — ikki yon tomonda kumushrang qatorlar */}
          {[-0.29, 0.29].map((z) => (
            <mesh key={z} position={[-0.3, 0.07, z]}>
              <boxGeometry args={[0.65, 0.02, 0.06]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
            </mesh>
          ))}

          {/* Pin header'lar (GPIO) */}
          {[-0.95, 0.95].map((z) => (
            <group key={z} position={[0.1, 0.12, z * 0.62]}>
              {Array.from({ length: 8 }, (_, i) => (
                <mesh key={i} position={[i * 0.22 - 0.77, 0, 0]}>
                  <boxGeometry args={[0.05, 0.22, 0.05]} />
                  <meshStandardMaterial color={pin} metalness={0.9} roughness={0.15} />
                </mesh>
              ))}
            </group>
          ))}

          {/* USB port */}
          <mesh position={[-1.05, 0.13, -0.35]}>
            <boxGeometry args={[0.35, 0.18, 0.35]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
          </mesh>

          {/* Blink LED */}
          <mesh ref={ledRef} position={[0.55, 0.1, 0.25]}>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={2} />
          </mesh>
          {/* Power LED */}
          <mesh ref={led2Ref} position={[0.85, 0.1, 0.25]}>
            <boxGeometry args={[0.08, 0.07, 0.08]} />
            <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={1.2} />
          </mesh>

          {/* Kondensatorlar */}
          {[[0.5, -0.35], [0.75, -0.15]].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.16, z]}>
              <cylinderGeometry args={[0.07, 0.07, 0.22, 12]} />
              <meshStandardMaterial color={isDark ? '#1e40af' : '#3b82f6'} metalness={0.5} roughness={0.35} />
            </mesh>
          ))}

          {/* Kvars rezonator */}
          <mesh position={[-0.75, 0.09, 0.4]}>
            <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      </Float>
    </group>
  )
}
