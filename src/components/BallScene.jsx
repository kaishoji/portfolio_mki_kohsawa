// src/components/BallScene.jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, Suspense } from "react";
import { OrbitControls } from "@react-three/drei";

function InteractiveBall({ seed }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  // Stable random-ish values based on the seed
  const { position, color, floatSpeed } = useMemo(() => {
    const rand = (n) => {
      const x = Math.sin(seed * 9999 * (n + 1)) * 43758.5453;
      return x - Math.floor(x);
    };

    // Spread them in a cluster behind the text
    const x = (rand(1) - 0.5) * 6;   // left/right
    const y = (rand(2) - 0.5) * 3;   // up/down
    const z = -1.5 - rand(3) * 2;    // slightly behind the text

    const colors = ["#9cd3ff", "#ff9ce6", "#9effc4", "#ffe29c"];
    const color = colors[Math.floor(rand(4) * colors.length)];

    const floatSpeed = 0.4 + rand(5) * 0.6;

    return {
      position: [x, y, z],
      color,
      floatSpeed,
    };
  }, [seed]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * floatSpeed;
    if (!ref.current) return;

    // Gentle bobbing motion
    ref.current.position.y =
      position[1] + Math.sin(t + seed) * 0.25;
    ref.current.position.x =
      position[0] + Math.cos(t * 0.7 + seed) * 0.15;

    // Slow rotation
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.005;

    // Hover scale animation
    const targetScale = hovered ? 1.3 : 1;
    ref.current.scale.lerp(
      { x: targetScale, y: targetScale, z: targetScale },
      0.1
    );
  });

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.45, 32, 32]} />
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.3}
        emissive={hovered ? color : "black"}
        emissiveIntensity={hovered ? 0.7 : 0.2}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 30;

  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
      camera={{ position: [0, 0, 5], fov: 50 }}
    >
      {/* Background */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 4, 12]} />

      {/* Lights */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-4, -3, 2]} intensity={0.6} />

      <Suspense fallback={null}>
        {Array.from({ length: count }).map((_, i) => (
          <InteractiveBall key={i} seed={i + 1} />
        ))}
      </Suspense>

      {/* Optional: let you orbit the camera a bit; disable zoom so it feels like a background */}
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
