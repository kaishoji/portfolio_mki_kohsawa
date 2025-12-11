// src/components/BallScene.jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";

function InteractiveBall({ data, mouse }) {
  const ref = useRef();
  const velocity = useRef([0, 0, 0]);
  const [hovered, setHovered] = useState(false);

  const { position, color, floatSpeed, radius } = data;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime * floatSpeed;

    // Gentle base bobbing
    const baseX = position[0] + Math.cos(t * 0.6) * 0.08;
    const baseY = position[1] + Math.sin(t) * 0.12;
    const baseZ = position[2];

    // Mouse in normalized device coords [-1, 1]
    const [mx, my] = mouse.current;
    const mouseWorldX = mx * 2.0;
    const mouseWorldY = my * 1.2;
    const mouseWorldZ = -1.0; // plane around the text

    // Push away from mouse when close
    const posNow = [baseX, baseY, baseZ];
    const dx = posNow[0] - mouseWorldX;
    const dy = posNow[1] - mouseWorldY;
    const dz = posNow[2] - mouseWorldZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const influenceRadius = 2.2;
    if (dist < influenceRadius && dist > 0.001) {
      const strength = (influenceRadius - dist) * 0.015;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      velocity.current[0] += nx * strength;
      velocity.current[1] += ny * strength;
      velocity.current[2] += nz * strength;
    }

    // Damping
    velocity.current[0] *= 0.9;
    velocity.current[1] *= 0.9;
    velocity.current[2] *= 0.9;

    // Subtle parallax follow
    const parallaxStrength = 0.35;
    const depthFactor = 1 + Math.abs(baseZ);
    const parallaxX = mx * parallaxStrength * 0.2 * depthFactor;
    const parallaxY = my * parallaxStrength * 0.2 * depthFactor;

    const finalX = baseX + parallaxX + velocity.current[0];
    const finalY = baseY + parallaxY + velocity.current[1];
    const finalZ = baseZ + velocity.current[2];

    ref.current.position.set(finalX, finalY, finalZ);

    // Spin
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // Hover scale
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
        emissive={color}
        emissiveIntensity={hovered ? 1.8 : 0.35}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 55;
  const mouse = useRef([0, 0]);

  // Generate balls with varied size, grey, and depth
  const balls = useMemo(() => {
    const items = [];
    const maxTries = 7000;
    let tries = 0;

    while (items.length < count && tries < maxTries) {
      tries++;

      const radius = 0.22 + Math.random() * 0.4;

      // decide if this ball is in front or behind the text
      const front = Math.random() < 0.35; // ~35% in front
      const z = front
        ? 0.25 + Math.random() * 0.9   // in front of text (z ~ 0)
        : -1.4 - Math.random() * 2.4;  // behind text

      const x = (Math.random() - 0.5) * 4.2;
      const y = (Math.random() - 0.5) * 2.8;

      const candidatePos = [x, y, z];

      // keep them from overlapping, respecting radius
      let ok = true;
      for (let i = 0; i < items.length; i++) {
        const other = items[i];
        const dx = other.position[0] - candidatePos[0];
        const dy = other.position[1] - candidatePos[1];
        const dz = other.position[2] - candidatePos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = (other.radius + radius) * 1.1;
        if (dist < minDist) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // random grey shade
      const shade = 0.3 + Math.random() * 0.6;
      const hex = Math.round(shade * 255)
        .toString(16)
        .padStart(2, "0");
      const color = `#${hex}${hex}${hex}`;

      const floatSpeed = 0.4 + Math.random() * 0.5;

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
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1, // stay behind HTML content
      }}
      camera={{ position: [0, 0, 5], fov: 50 }}
      onPointerMove={(e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        mouse.current = [x, y];
      }}
    >
      {/* Background & fog */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 4, 13]} />

      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-4, -3, 2]} intensity={0.7} />

      {/* 3D Name */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.9}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
      >
        Kai Ohsawa
      </Text>

      <Suspense fallback={null}>
        {balls.map((data, i) => (
          <InteractiveBall key={i} data={data} mouse={mouse} />
        ))}
      </Suspense>
    </Canvas>
  );
}