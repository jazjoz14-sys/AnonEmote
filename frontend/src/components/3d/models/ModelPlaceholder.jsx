import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Rotating wireframe sphere placeholder for loading state.
 * Displays while a GLB model is being downloaded/parsed.
 * Rotates at 1 rad/s on the Y-axis using frame-rate-independent timing.
 *
 * @param {object} props
 * @param {number} props.size - Sphere radius
 * @param {string} props.color - Wire color (hex string)
 */
export default function ModelPlaceholder({ size, color }) {
  const meshRef = useRef()

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 1 * delta // 1 rad/s, frame-rate independent
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.5}
      />
    </mesh>
  )
}
