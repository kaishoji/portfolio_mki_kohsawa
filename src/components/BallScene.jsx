// src/components/BallScene.jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";

function InteractiveBall({ position, color, floatSpeed, mouse }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime * floatSpeed;

    // Base bobbing around its "home" position
    const baseX = position[0] + Math.cos(t * 0.7) * 0.15;
    const baseY = position[1] + Math.sin(t) * 0.25;
    const baseZ = position[2];

    // Mouse-based parallax (subtle follow)
    const [mx, my] = mouse.current;
    const parallaxStrength = 0.6; // tweak for more / less follow
    const depthFactor = 1 + Math.abs(baseZ); // farther = slightly more movement

    const offsetX = mx * parallaxStrength * 0.3 * depthFactor;
    const offsetY = my * parallaxStrength * 0.3 * depthFactor;

    ref.current.position.set(baseX + offsetX, baseY + offsetY, baseZ);

    // Slow spin
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // Smooth hover scale
    const targetScale = hovered ? 1.35 : 1;
    ref.current.scale.lerp(
      { x: targetScale, y: targetScale, z: targetScale },
      0.12
    );
  });

  return (
    <mesh
      ref={ref}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.45, 32, 32]} />
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.25}
        // "Glow" effect via emissive
        emissive={color}
        emissiveIntensity={hovered ? 1.6 : 0.3}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 45; // denser cluster
  const mouse = useRef([0, 0]);

  // Generate non-overlapping positions
  const { positions, colors, speeds } = useMemo(() => {
    const positions = [];
    const colors = [];
    const speeds = [];

    const palette = ["#9cd3ff", "#ff9ce6", "#9effc4", "#ffe29c", "#b69cff"];

    const radius = 0.45;
    const minDist = radius * 2.3; // keep them from clipping
    const maxTries = 5000;
    let tries = 0;

    while (positions.length < count && tries < maxTries) {
      tries++;

      // Compact cluster behind the text
      const x = (Math.random() - 0.5) * 4;  // tighter horizontally
      const y = (Math.random() - 0.5) * 2.5;
      const z = -1.5 - Math.random() * 2.5; // behind the text

      const candidate = [x, y, z];

      let ok = true;
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const dx = p[0] - candidate[0];
        const dy = p[1] - candidate[1];
        const dz = p[2] - candidate[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) {
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      positions.push(candidate);
      colors.push(palette[Math.floor(Math.random() * palette.length)]);
      speeds.push(0.4 + Math.random() * 0.7);
    }

    return { positions, colors, speeds };
  }, [count]);

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
      // track mouse in normalized device coords
      onPointerMove={(e) => {
        const x = (e.pointer.x / window.innerWidth) * 2 - 1;
        const y = -((e.pointer.y / window.innerHeight) * 2 - 1);
        mouse.current = [x, y];
      }}
    >
      {/* Background */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 4, 12]} />

      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-4, -3, 2]} intensity={0.7} />

      <Suspense fallback={null}>
        {positions.map((pos, i) => (
          <InteractiveBall
            key={i}
            position={pos}
            color={colors[i]}
            floatSpeed={speeds[i]}
            mouse={mouse}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
