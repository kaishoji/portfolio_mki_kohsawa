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

    const baseX = position[0] + Math.cos(t * 0.6) * 0.06;
    const baseY = position[1] + Math.sin(t) * 0.1;
    const baseZ = position[2];

    const [mx, my] = mouse.current;
    const mouseWorldX = mx * 2.0;
    const mouseWorldY = my * 1.2;
    const mouseWorldZ = -0.3;

    const posNow = [baseX, baseY, baseZ];
    const dx = posNow[0] - mouseWorldX;
    const dy = posNow[1] - mouseWorldY;
    const dz = posNow[2] - mouseWorldZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const influenceRadius = 2.0;
    if (dist < influenceRadius && dist > 0.001) {
      const strength = (influenceRadius - dist) * 0.012;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      velocity.current[0] += nx * strength;
      velocity.current[1] += ny * strength;
      velocity.current[2] += nz * strength;
    }

    velocity.current[0] *= 0.9;
    velocity.current[1] *= 0.9;
    velocity.current[2] *= 0.9;

    const parallaxStrength = 0.25;
    const depthFactor = 1 + Math.abs(baseZ);

    const finalX = baseX + mx * parallaxStrength * depthFactor + velocity.current[0];
    const finalY = baseY + my * parallaxStrength * depthFactor + velocity.current[1];
    const finalZ = baseZ + velocity.current[2];

    ref.current.position.set(finalX, finalY, finalZ);

    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    const targetScale = hovered ? 1.3 : 1;
    const s = ref.current.scale;
    s.x += (targetScale - s.x) * 0.12;
    s.y += (targetScale - s.y) * 0.12;
    s.z += (targetScale - s.z) * 0.12;
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
        emissive={color}
        emissiveIntensity={hovered ? 1.4 : 0.25}
        metalness={0.4}
        roughness={0.3}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 50;
  const mouse = useRef([0, 0]);

  const balls = useMemo(() => {
    const arr = [];
    const holeRadius = 1.2; // keep clear around the 3D text

    while (arr.length < count) {
      const radius = 0.25 + Math.random() * 0.4;
      const isFront = Math.random() < 0.2;

      let x = (Math.random() - 0.5) * 4.2;
      let y = (Math.random() - 0.5) * 2.8;

      // Avoid the name area
      if (isFront) {
        let r2 = x * x + y * y;
        let safety = 0;
        while (r2 < holeRadius * holeRadius && safety < 20) {
          x = (Math.random() - 0.5) * 4.2;
          y = (Math.random() - 0.5) * 2.8;
          r2 = x * x + y * y;
          safety++;
        }
      }

      const z = isFront
        ? 0.3 + Math.random() * 0.6
        : -1.4 - Math.random() * 2.4;

      const shade = 0.3 + Math.random() * 0.6;
      const hex = Math.round(shade * 255).toString(16).padStart(2, "0");
      const color = `#${hex}${hex}${hex}`;

      arr.push({
        position: [x, y, z],
        radius,
        color,
        floatSpeed: 0.4 + Math.random() * 0.5,
      });
    }

    return arr;
  }, [count]);

  return (
    <Canvas
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
      camera={{ fov: 50, position: [0, 0, 5] }}
      onPointerMove={(e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        mouse.current = [x, y];
      }}
    >
      <color attach="background" args={["#050816"]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />

      {/* 3D Name */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.9}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
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
