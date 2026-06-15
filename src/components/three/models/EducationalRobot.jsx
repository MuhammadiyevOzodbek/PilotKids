import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTheme } from '../../../context/ThemeContext'

export default function EducationalRobot({
  scrollRotation = 0,
  hovered = false,
  onWave,
}) {
  const groupRef = useRef()
  const headRef = useRef()
  const bodyRef = useRef()
  const rightArmRef = useRef()
  const leftEyeRef = useRef()
  const rightEyeRef = useRef()
  const mouse = useRef({ x: 0, y: 0 })
  const [waving, setWaving] = useState(false)
  const waveStart = useRef(0)
  const { isDark } = useTheme()

  const bodyColor = isDark ? '#1e293b' : '#cbd5e1'
  const metalColor = isDark ? '#475569' : '#94a3b8'
  const glowIntensity = hovered ? (isDark ? 2.5 : 1.5) : (isDark ? 1.2 : 0.8)
  const eyeColor = isDark ? '#38bdf8' : '#2563eb'

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleClick = () => {
    setWaving(true)
    waveStart.current = performance.now()
    onWave?.()
    setTimeout(() => setWaving(false), 2000)
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.9) * 0.1
      groupRef.current.rotation.y = scrollRotation + Math.sin(t * 0.25) * 0.04
    }

    if (headRef.current) {
      headRef.current.rotation.y += (mouse.current.x * 0.35 - headRef.current.rotation.y) * 0.08
      headRef.current.rotation.x += (mouse.current.y * 0.2 - headRef.current.rotation.x) * 0.08
      const breath = 1 + Math.sin(t * 1.8) * 0.015
      headRef.current.scale.setScalar(breath)
    }

    if (bodyRef.current) {
      const bodyBreath = 1 + Math.sin(t * 1.8) * 0.01
      bodyRef.current.scale.set(1, bodyBreath, 1)
    }

    if (rightArmRef.current) {
      if (waving) {
        const elapsed = (performance.now() - waveStart.current) / 1000
        rightArmRef.current.rotation.z = -0.3 + Math.sin(elapsed * 10) * 0.6
        rightArmRef.current.rotation.x = -0.5
      } else {
        rightArmRef.current.rotation.z += (-0.15 - rightArmRef.current.rotation.z) * 0.05
        rightArmRef.current.rotation.x += (0 - rightArmRef.current.rotation.x) * 0.05
      }
    }

    ;[leftEyeRef, rightEyeRef].forEach((ref) => {
      if (ref.current?.material) {
        ref.current.material.emissiveIntensity = glowIntensity + Math.sin(t * 3) * 0.15
      }
    })
  })

  return (
    <group ref={groupRef} onClick={handleClick} onPointerOver={() => {}}>
      {/* Body */}
      <group ref={bodyRef} position={[0, -0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.3, 0.7]} />
          <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.36]}>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive={eyeColor}
            emissiveIntensity={isDark ? 0.4 : 0.2}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Head */}
      <group ref={headRef} position={[0, 0.85, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.75, 0.8]} />
          <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.06]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={glowIntensity} />
        </mesh>
        {/* Eyes */}
        <mesh ref={leftEyeRef} position={[-0.22, 0.05, 0.41]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={glowIntensity} metalness={0.5} roughness={0.1} />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.22, 0.05, 0.41]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={glowIntensity} metalness={0.5} roughness={0.1} />
        </mesh>
      </group>

      {/* Left arm */}
      <group position={[-0.75, 0.1, 0]} rotation={[0, 0, 0.2]}>
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <sphereGeometry args={[0.14]} />
          <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Right arm (wave) */}
      <group ref={rightArmRef} position={[0.75, 0.1, 0]} rotation={[0, 0, -0.15]}>
        <mesh position={[0, -0.35, 0]}>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <sphereGeometry args={[0.14]} />
          <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Legs */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, -1.1, 0]}>
          <boxGeometry args={[0.25, 0.5, 0.25]} />
          <meshStandardMaterial color={metalColor} metalness={0.75} roughness={0.25} />
        </mesh>
      ))}

      {/* Hover glow ring */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color={eyeColor} transparent opacity={isDark ? 0.4 : 0.25} />
        </mesh>
      )}
    </group>
  )
}
