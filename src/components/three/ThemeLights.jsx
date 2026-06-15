import { useTheme } from '../../context/ThemeContext'

export default function ThemeLights({ intensity = 1 }) {
  const { isDark } = useTheme()

  return (
    <>
      <ambientLight intensity={isDark ? 0.35 * intensity : 0.65 * intensity} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={isDark ? 1.2 * intensity : 0.9 * intensity}
        color={isDark ? '#93c5fd' : '#ffffff'}
        castShadow={false}
      />
      <directionalLight
        position={[-4, 2, -3]}
        intensity={isDark ? 0.4 * intensity : 0.3 * intensity}
        color={isDark ? '#06b6d4' : '#38bdf8'}
      />
      <pointLight
        position={[0, 2, 3]}
        intensity={isDark ? 1.5 * intensity : 0.6 * intensity}
        color={isDark ? '#3b82f6' : '#2563eb'}
        distance={12}
      />
      <pointLight
        position={[-3, -1, 2]}
        intensity={isDark ? 0.8 * intensity : 0.4 * intensity}
        color="#06b6d4"
        distance={8}
      />
      {isDark && (
        <spotLight
          position={[0, 5, 0]}
          angle={0.5}
          penumbra={1}
          intensity={0.6 * intensity}
          color="#38bdf8"
        />
      )}
    </>
  )
}
