// src/components/BallScene.jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";

function InteractiveBall({ data, mouse }) {
  const ref = useRef();
  const velocity = useRef([0, 0, 0]);

  const { position, color, floatSpeed, radius } = data;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.getElapsedTime() * floatSpeed;

    // Gentle bobbing so they feel alive but not chaotic
    const bobX = Math.cos(t * 0.6) * 0.03;
    const bobY = Math.sin(t) * 0.05;
    const baseX = position[0] + bobX;
    const baseY = position[1] + bobY;
    const baseZ = position[2];

    // Mouse in normalized device coordinates [-1, 1]
    const [mx, my] = mouse.current;
    const mouseWorldX = mx * 2.0;   // horizontal mapping
    const mouseWorldY = my * 1.5;   // vertical mapping
    const mouseWorldZ = 0.0;        // near text plane

    // Vector from mouse to ball
    const dx = baseX - mouseWorldX;
    const dy = baseY - mouseWorldY;
    const dz = baseZ - mouseWorldZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Push-away effect when cursor is close
    const influenceRadius = 1.2;
    if (dist < influenceRadius && dist > 0.0001) {
      const strength = (influenceRadius - dist) * 0.03; // tweak for more/less push
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      velocity.current[0] += nx * strength;
      velocity.current[1] += ny * strength;
      velocity.current[2] += nz * strength;
    }

    // Damping so they don't drift off forever
    const damping = 0.9;
    velocity.current[0] *= damping;
    velocity.current[1] *= damping;
    velocity.current[2] *= damping;

    // Final position = base position + velocity offset
    const finalX = baseX + velocity.current[0];
    const finalY = baseY + velocity.current[1];
    const finalZ = baseZ + velocity.current[2];

    ref.current.position.set(finalX, finalY, finalZ);

    // Slow spin for subtle motion
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // Keep scale uniform (no hover effects)
    ref.current.scale.set(1, 1, 1);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.35}
        emissive={"#000000"}
        emissiveIntensity={0.0}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 40; // number of balls
  const mouse = useRef([0, 0]);

  const balls = useMemo(() => {
    const items = [];
    const maxTries = 8000;
    let tries = 0;

    // Rough bounds for where the 3D text sits
    const textWidth = 2.2;   // world units
    const textHeight = 0.7;
    const frontChance = 0.18; // fraction of balls in front of the text

    while (items.length < count && tries < maxTries) {
      tries++;

      const radius = 0.25 + Math.random() * 0.35; // varying ball size
      const isFront = Math.random() < frontChance;

      let x = (Math.random() - 0.5) * 4.5;
      let y = (Math.random() - 0.5) * 2.8;

      // For front-layer balls, avoid the text area so they don't cover your name
      if (isFront) {
        let safe = 0;
        while (
          Math.abs(x) < textWidth / 2 + radius * 1.2 &&
          Math.abs(y) < textHeight / 2 + radius * 1.2 &&
          safe < 30
        ) {
          x = (Math.random() - 0.5) * 4.5;
          y = (Math.random() - 0.5) * 2.8;
          safe++;
        }
      }

      const z = isFront
        ? 0.3 + Math.random() * 0.4   // slightly in front of text plane
        : -1.4 - Math.random() * 2.2; // behind text

      const candidate = [x, y, z];

      // Enforce non-intersection: distance >= sum of radii * margin
      let ok = true;
      for (let i = 0; i < items.length; i++) {
        const other = items[i];
        const ox = other.position[0];
        const oy = other.position[1];
        const oz = other.position[2];

        const ddx = ox - candidate[0];
        const ddy = oy - candidate[1];
        const ddz = oz - candidate[2];
        const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);

        const minDist = (other.radius + radius) * 1.3; // margin to avoid overlap even while bobbing
        if (d < minDist) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Procedural forest green using HSL
    const hue = 110 + Math.random() * 20;   // 110–130: deep forest greens
    const sat = 35 + Math.random() * 25;    // less saturated → more earthy
    const light = 15 + Math.random() * 25;  // dark → mid forest tones
    const color = `hsl(${hue}, ${sat}%, ${light}%)`;

      const floatSpeed = 0.4 + Math.random() * 0.4;

      items.push({
        position: candidate,
        radius,
        color,
        floatSpeed,
      });
    }

    return items;
  }, [count]);

  return (
    <Canvas
      style={{
        position: "fixed",
        inset: 0,
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
      {/* Background + lighting */}
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