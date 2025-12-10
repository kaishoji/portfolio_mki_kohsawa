// src/components/BallScene.jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";

function InteractiveBall({ data, mouse }) {
  const ref = useRef();
  const velocity = useRef([0, 0, 0]);
  const [hovered, setHovered] = useState(false);

  const { position, color, floatSpeed, radius } = data;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime * floatSpeed;

    // Gentle base bobbing (weaker than before)
    const baseX = position[0] + Math.cos(t * 0.6) * 0.08;
    const baseY = position[1] + Math.sin(t) * 0.12;
    const baseZ = position[2];

    // Mouse position mapped to a plane in front of the cluster
    const [mx, my] = mouse.current; // in [-1, 1]
    const mouseWorldX = mx * 2.0;
    const mouseWorldY = my * 1.2;
    const mouseWorldZ = -1.8;

    // Simple "push away" force when mouse is near
    const posNow = [baseX, baseY, baseZ];
    const dx = posNow[0] - mouseWorldX;
    const dy = posNow[1] - mouseWorldY;
    const dz = posNow[2] - mouseWorldZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const influenceRadius = 2.5; // how far the mouse influence reaches
    if (dist < influenceRadius && dist > 0.001) {
      const strength = (influenceRadius - dist) * 0.015;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      velocity.current[0] += nx * strength;
      velocity.current[1] += ny * strength;
      velocity.current[2] += nz * strength;
    }

    // Dampen velocity so motion calms down over time
    velocity.current[0] *= 0.9;
    velocity.current[1] *= 0.9;
    velocity.current[2] *= 0.9;

    // Subtle global mouse-follow parallax
    const parallaxStrength = 0.4;
    const depthFactor = 1 + Math.abs(baseZ);
    const parallaxX = mx * parallaxStrength * 0.2 * depthFactor;
    const parallaxY = my * parallaxStrength * 0.2 * depthFactor;

    const finalX = baseX + parallaxX + velocity.current[0];
    const finalY = baseY + parallaxY + velocity.current[1];
    const finalZ = baseZ + velocity.current[2];

    ref.current.position.set(finalX, finalY, finalZ);

    // Slow spin
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // Smooth hover scale
    const targetScale = hovered ? 1.4 : 1;
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
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.3}
        // glow-on-hover via emissive
        emissive={color}
        emissiveIntensity={hovered ? 1.8 : 0.35}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 50; // slightly denser
  const mouse = useRef([0, 0]);

  // Generate non-overlapping balls with varying sizes & grey shades
  const balls = useMemo(() => {
    const items = [];
    const maxTries = 6000;
    let tries = 0;

    while (items.length < count && tries < maxTries) {
      tries++;

      const radius = 0.25 + Math.random() * 0.4; // varying size

      // compact cluster behind text
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 2.6;
      const z = -1.5 - Math.random() * 2.5;

      const candidatePos = [x, y, z];

      // spacing based on each ball's radius so they don't clip
      let ok = true;
      for (let i = 0; i < items.length; i++) {
        const other = items[i];
        const dx = other.position[0] - candidatePos[0];
        const dy = other.position[1] - candidatePos[1];
        const dz = other.position[2] - candidatePos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = (other.radius + radius) * 1.15;
        if (dist < minDist) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // random grey shade
      const shade = 0.35 + Math.random() * 0.55; // 0..1
      const hex = Math.round(shade * 255)
        .toString(16)
        .padStart(2, "0");
      const color = `#${hex}${hex}${hex}`;

      const floatSpeed = 0.45 + Math.random() * 0.5;

      items.push({
        position: candidatePos,
        color,
        floatSpeed,
        radius,
      });
    }

    return items;
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
      onPointerMove={(e) => {
        // normalize pointer to [-1, 1]
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        mouse.current = [x, y];
      }}
    >
      {/* Background */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 4, 12]} />

      {/* Lights */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-4, -3, 2]} intensity={0.7} />

      <Suspense fallback={null}>
        {balls.map((data, i) => (
          <InteractiveBall key={i} data={data} mouse={mouse} />
        ))}
      </Suspense>
    </Canvas>
  );
}