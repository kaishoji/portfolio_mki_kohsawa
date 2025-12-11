// src/components/BallScene.jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  Glitch,
} from "@react-three/postprocessing";

function InteractiveBall({ data, mouse }) {
  const ref = useRef();
  const velocity = useRef([0, 0, 0]);
  const { position, radius, baseHue, sat, light, floatSpeed, shiftSpeed } = data;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle idle bobbing
    const bobX = Math.cos(t * floatSpeed * 0.6) * 0.03;
    const bobY = Math.sin(t * floatSpeed) * 0.05;
    const baseX = position[0] + bobX;
    const baseY = position[1] + bobY;
    const baseZ = position[2];

    // Mouse mapping (NDC -> approximate world plane near text)
    const [mx, my] = mouse.current;
    const mouseWorldX = mx * 2.0;
    const mouseWorldY = my * 1.5;
    const mouseWorldZ = 0.0;

    // Push-away force when cursor is near
    const dx = baseX - mouseWorldX;
    const dy = baseY - mouseWorldY;
    const dz = baseZ - mouseWorldZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const influenceRadius = 1.2;
    if (dist < influenceRadius && dist > 0.0001) {
      const strength = (influenceRadius - dist) * 0.03;
      velocity.current[0] += (dx / dist) * strength;
      velocity.current[1] += (dy / dist) * strength;
      velocity.current[2] += (dz / dist) * strength;
    }

    // Damping so they don't drift off forever
    const damping = 0.9;
    velocity.current[0] *= damping;
    velocity.current[1] *= damping;
    velocity.current[2] *= damping;

    // Final position
    const finalX = baseX + velocity.current[0];
    const finalY = baseY + velocity.current[1];
    const finalZ = baseZ + velocity.current[2];

    ref.current.position.set(finalX, finalY, finalZ);

    // Slow rotation
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // Color-shift over time in HSL
    const mat = ref.current.material;
    if (mat) {
      const hueDeg = (baseHue + t * shiftSpeed * 30) % 360; // slow rotation through neon spectrum
      const h = hueDeg / 360;
      const s = sat / 100;
      const l = light / 100;

      mat.color.setHSL(h, s, l);
      // emissive slightly brighter for a soft neon halo
      mat.emissive.setHSL(h, s, Math.min(l + 0.2, 1));
    }

    // Keep scale constant
    ref.current.scale.set(1, 1, 1);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color="white" // will be overridden in useFrame
        metalness={0.4}
        roughness={0.25}
        emissive="#000000"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

function HolographicGrid() {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();

    // Slight opacity pulse + tiny rotation jitter for holographic feel
    const baseOpacity = 0.22;
    const pulse = Math.sin(t * 0.8) * 0.05;
    ref.current.material.opacity = baseOpacity + pulse;

    ref.current.rotation.z = Math.sin(t * 0.15) * 0.08;
  });

  return (
    <mesh position={[0, 0, -0.6]} ref={ref}>
      <planeGeometry args={[6, 3.2, 20, 10]} />
      <meshBasicMaterial
        color="#41f5ff"
        wireframe
        transparent
        opacity={0.25}
      />
    </mesh>
  );
}

export default function BallScene() {
  const count = 40;
  const mouse = useRef([0, 0]);

  const balls = useMemo(() => {
    const items = [];
    const maxTries = 8000;
    let tries = 0;

    const textWidth = 2.4;  // text area bounds in world units
    const textHeight = 0.9;
    const frontChance = 0.18;

    while (items.length < count && tries < maxTries) {
      tries++;

      const radius = 0.25 + Math.random() * 0.35;
      const isFront = Math.random() < frontChance;

      let x = (Math.random() - 0.5) * 4.8;
      let y = (Math.random() - 0.5) * 2.8;

      // Avoid front-layer balls overlapping the text area
      if (isFront) {
        let safe = 0;
        while (
          Math.abs(x) < textWidth / 2 + radius * 1.2 &&
          Math.abs(y) < textHeight / 2 + radius * 1.2 &&
          safe < 30
        ) {
          x = (Math.random() - 0.5) * 4.8;
          y = (Math.random() - 0.5) * 2.8;
          safe++;
        }
      }

      const z = isFront
        ? 0.3 + Math.random() * 0.4   // slightly in front of text
        : -1.4 - Math.random() * 2.2; // behind text

      const candidate = [x, y, z];

      // Non-intersection check
      let ok = true;
      for (const other of items) {
        const dx = other.position[0] - x;
        const dy = other.position[1] - y;
        const dz = other.position[2] - z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < (other.radius + radius) * 1.3) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Cyberpunk HSL color ranges: magenta → purple → blue → teal
      const hueRanges = [
        [280, 320], // magenta → hot pink
        [250, 280], // ultraviolet purple
        [200, 230], // cyber blue
        [170, 195], // neon teal
      ];
      const [hMin, hMax] =
        hueRanges[Math.floor(Math.random() * hueRanges.length)];

      const baseHue = hMin + Math.random() * (hMax - hMin); // degrees
      const sat = 70 + Math.random() * 25;   // 70–95%
      const light = 45 + Math.random() * 25; // 45–70%
      const floatSpeed = 0.4 + Math.random() * 0.4;
      const shiftSpeed = 0.4 + Math.random() * 0.8; // how fast hue cycles

      items.push({
        position: candidate,
        radius,
        baseHue,
        sat,
        light,
        floatSpeed,
        shiftSpeed,
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
      {/* Background & depth fog */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#070b25", 4, 13]} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-4, -3, 2]} intensity={0.6} />

      {/* Holographic grid behind the name */}
      <HolographicGrid />

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

      {/* Neon spheres */}
      <Suspense fallback={null}>
        {balls.map((data, i) => (
          <InteractiveBall key={i} data={data} mouse={mouse} />
        ))}
      </Suspense>

      {/* Postprocessing: bloom, noise, vignette, glitch */}
      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          radius={0.8}
        />
        <Noise opacity={0.04} />
        <Vignette eskil={false} offset={0.25} darkness={0.65} />
        <Glitch
          delay={[2, 5]}
          duration={[0.4, 0.8]}
          strength={[0.1, 0.3]}
        />
      </EffectComposer>
    </Canvas>
  );
}