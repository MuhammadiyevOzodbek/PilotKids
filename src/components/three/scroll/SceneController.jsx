import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '../../../store/useScrollStore'
import { MODEL_KEYS, WAVE_THRESHOLD, createSample, sampleStage } from './keyframes'
import EducationalRobot from '../models/EducationalRobot'
import CircuitBoard from '../models/CircuitBoard'
import RoboticArm from '../models/RoboticArm'
import HologramRing from '../models/HologramRing'
import TrophyPodium from '../models/TrophyPodium'

// Scroll bosqichini useFrame ichida store.getState() bilan o'qib (React
// re-render'siz!), kamera va model guruhlarini keyframe'lar orasida damping
// bilan silliq boshqaradi. Progress hech qachon to'g'ridan-to'g'ri pozitsiyaga
// bog'lanmaydi — har frame'da exponential damping qo'llanadi.
export default function SceneController() {
  const { camera } = useThree()
  // Model guruhlari bitta ref-map'da (callback ref orqali to'ldiriladi) —
  // useFrame ichida .current mutatsiyasi lint qoidalariga zid kelmaydi.
  const groups = useRef({})
  const lookRef = useRef(new THREE.Vector3(0.9, 0.2, 0))
  const sample = useMemo(() => createSample(), [])

  // Zustand selector — boolean faqat flip bo'lganda bitta yengil re-render
  const finale = useScrollStore((s) => s.stage > WAVE_THRESHOLD)

  useFrame((_, delta) => {
    const stage = useScrollStore.getState().stage
    sampleStage(stage, sample)

    // Frame-rate'dan mustaqil damping (60fps ham, 144fps ham bir xil his)
    const alpha = 1 - Math.exp(-4.5 * Math.min(delta, 0.05))

    camera.position.lerp(sample.cam, alpha)
    lookRef.current.lerp(sample.look, alpha)
    camera.lookAt(lookRef.current)

    for (const key of MODEL_KEYS) {
      const group = groups.current[key]
      if (!group) continue
      const target = sample.models[key]
      group.position.lerp(target.pos, alpha)
      group.rotation.y += (target.rotY - group.rotation.y) * alpha
      const s = THREE.MathUtils.lerp(group.scale.x, target.scale, alpha)
      group.scale.setScalar(Math.max(s, 0.0001))
      // Ko'rinmas modellar renderdan chiqariladi (performance)
      group.visible = s > 0.02
    }
  })

  return (
    <>
      <group ref={(el) => { groups.current.robot = el }} position={[1.9, 0, 0]}>
        <EducationalRobot waving={finale} />
      </group>
      <group ref={(el) => { groups.current.board = el }} position={[2.2, -2.2, 0]} visible={false}>
        <CircuitBoard />
      </group>
      <group ref={(el) => { groups.current.arm = el }} position={[-2.1, -2.4, 0]} visible={false}>
        <RoboticArm />
      </group>
      <group ref={(el) => { groups.current.holo = el }} position={[0, -1.8, -2.4]} visible={false}>
        <HologramRing />
      </group>
      <group ref={(el) => { groups.current.trophy = el }} position={[2.0, -2.6, 0]} visible={false}>
        <TrophyPodium />
      </group>
    </>
  )
}
