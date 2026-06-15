import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useIsMobile } from '../../hooks/useDevice'
import ThemeLights from './ThemeLights'

export default function SceneCanvas({
  children,
  className = '',
  camera = { position: [0, 0.5, 5], fov: 45 },
  dpr,
  shadows = false,
  lightIntensity = 1,
}) {
  const isMobile = useIsMobile()

  return (
    <div className={className}>
      <Canvas
        dpr={dpr ?? (isMobile ? 1 : [1, 1.75])}
        camera={camera}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        shadows={shadows}
      >
        <ThemeLights intensity={lightIntensity} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  )
}
