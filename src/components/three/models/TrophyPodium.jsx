import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

function Trophy() {
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5
  })

  return (
    <group ref={ref}>
      <Float speed={2} floatIntensity={0.3}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.15, 0.2, 16]} />
          <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.35, 24, 24]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.95}
            roughness={0.05}
            emissive="#f59e0b"
            emissiveIntensity={0.5}
          />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.35, 1.45, 0]} rotation={[0, 0, side * 0.5]}>
            <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
        ))}
      </Float>
    </group>
  )
}

function Podium({ position, height, color }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.5, 0.55, height, 16]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Badge({ position, delay = 0 }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.1
      ref.current.rotation.y = state.clock.elapsedTime * 0.5 + delay
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.12]} />
      <meshStandardMaterial color="#38bdf8" emissive="#06b6d4" emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
    </mesh>
  )
}

// Zarrachalar geometriyasi render tanasidan tashqarida (modul darajasida) yaratiladi —
// react-hooks purity qoidasi Math.random'ni render/hook ichida chaqirishni taqiqlaydi.
function createParticleGeometry() {
  const arr = new Float32Array(60 * 3)
  for (let i = 0; i < 60; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 2
    arr[i * 3 + 1] = Math.random() * 2
    arr[i * 3 + 2] = (Math.random() - 0.5) * 2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  return geo
}

export default function TrophyPodium() {
  const particlesRef = useRef()
  const particleGeometry = useMemo(() => createParticleGeometry(), [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  return (
    <group position={[0, -0.8, 0]}>
      <Sparkles count={40} scale={4} size={2} speed={0.2} color="#fbbf24" opacity={0.7} />
      <Podium position={[-0.9, 0, 0]} height={0.6} color="#94a3b8" />
      <Podium position={[0, 0, 0]} height={1} color="#fbbf24" />
      <Podium position={[0.9, 0, 0]} height={0.4} color="#cd7f32" />
      <Trophy />
      <Badge position={[-1.2, 1.8, 0.3]} delay={0} />
      <Badge position={[1.2, 1.5, -0.2]} delay={1} />
      <Badge position={[0, 2.2, 0.5]} delay={2} />
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial size={0.05} color="#fbbf24" transparent opacity={0.6} sizeAttenuation />
      </points>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.5, 1.7, 48]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}
