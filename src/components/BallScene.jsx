import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function FloatingBall() {
  const mesh = useRef();

  // Randomized starting offsets
  const dx = Math.random() * Math.PI * 2;
  const dy = Math.random() * Math.PI * 2;
  const speed = 0.5 + Math.random() * 0.5;

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    mesh.current.position.x = Math.sin(t + dx) * 2.5;
    mesh.current.position.y = Math.cos(t + dy) * 2;
    mesh.current.position.z = Math.sin(t * 0.7) * 1.5;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.35, 32, 32]} />
      <meshStandardMaterial color={"#9cd3ff"} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

export default function BallScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      style={{ height: "100vh", width: "100vw", position: "absolute", top: 0, left: 0 }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* Spawn a cluster */}
      {Array.from({ length: 25 }).map((_, i) => (
        <FloatingBall key={i} />
      ))}

      {/* You can disable this on production */}
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}
