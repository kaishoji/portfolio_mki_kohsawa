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

/* ===========================
   INTERACTIVE NEON BALL
   =========================== */
function InteractiveBall({ data, mouse, isMobile, onBallClick }) {
  const ref = useRef();
  const velocity = useRef([0, 0, 0]);
  const { position, radius, baseHue, sat, light, floatSpeed, shiftSpeed } = data;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle idle bobbing
    const bobFactor = isMobile ? 0.5 : 0.6;
    const bobX = Math.cos(t * floatSpeed * bobFactor) * 0.03;
    const bobY = Math.sin(t * floatSpeed) * 0.05;
    const baseX = position[0] + bobX;
    const baseY = position[1] + bobY;
    const baseZ = position[2];

    // Mouse mapping (NDC → pseudo world plane)
    const [mx, my] = mouse.current;
    const mouseWorldX = mx * 2.0;
    const mouseWorldY = my * 1.5;
    const mouseWorldZ = 0.0;

    // Push-away physics
    const dx = baseX - mouseWorldX;
    const dy = baseY - mouseWorldY;
    const dz = baseZ - mouseWorldZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const influenceRadius = isMobile ? 1.4 : 1.8;
    if (dist < influenceRadius && dist > 0.0001) {
      const strength = (influenceRadius - dist) * (isMobile ? 0.045 : 0.06);
      velocity.current[0] += (dx / dist) * strength;
      velocity.current[1] += (dy / dist) * strength;
      velocity.current[2] += (dz / dist) * strength;
    }

    // Damping
    const damping = isMobile ? 0.9 : 0.88;
    velocity.current[0] *= damping;
    velocity.current[1] *= damping;
    velocity.current[2] *= damping;

    const finalX = baseX + velocity.current[0];
    const finalY = baseY + velocity.current[1];
    const finalZ = baseZ + velocity.current[2];

    ref.current.position.set(finalX, finalY, finalZ);

    // Spin
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // Color-shift in HSL over time
    const mat = ref.current.material;
    if (mat) {
      const hueDeg = (baseHue + t * shiftSpeed * 30) % 360;
      const h = hueDeg / 360;
      const s = sat / 100;
      const l = light / 100;

      mat.color.setHSL(h, s, l);
      mat.emissive.setHSL(h, s, Math.min(l + 0.2, 1));
    }

    ref.current.scale.set(1, 1, 1);
  });

  return (
    <mesh ref={ref} onClick={onBallClick}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color="white"
        metalness={0.4}
        roughness={0.25}
        emissive="#000000"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

/* ===========================
   HOLOGRAPHIC PARALLAX GRID
   =========================== */
function HolographicGrid({ mouse, isMobile }) {
  const ref = useRef();
  const basePositions = useRef(null);

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.getElapsedTime();
    const geom = ref.current.geometry;
    const posAttr = geom.attributes.position;
    const arr = posAttr.array;

    if (!basePositions.current) {
      basePositions.current = Float32Array.from(arr);
    }
    const base = basePositions.current;

    const [mx, my] = mouse.current;
    const planeWidth = 6;
    const planeHeight = 3.2;
    const targetX = (mx * planeWidth) / 2;
    const targetY = (my * planeHeight) / 2;

    const bendRadius = isMobile ? 2.0 : 2.4;
    const maxOffset = isMobile ? 0.25 : 0.4;

    for (let i = 0; i < arr.length; i += 3) {
      const x0 = base[i];
      const y0 = base[i + 1];
      const z0 = base[i + 2];

      const dx = x0 - targetX;
      const dy = y0 - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const influence = Math.max(0, 1 - dist / bendRadius);
      const offset = influence * maxOffset;

      const waveAmp = isMobile ? 0.04 : 0.06;
      const wave = Math.sin(t * 1.2 + (x0 + y0) * 2.0) * waveAmp * influence;

      arr[i] = x0;
      arr[i + 1] = y0;
      arr[i + 2] = z0 + offset + wave;
    }
    posAttr.needsUpdate = true;

    ref.current.rotation.x = -0.35 + my * 0.08;
    ref.current.rotation.y = mx * 0.12;
    ref.current.position.x = mx * 0.25;
    ref.current.position.y = my * 0.18;

    const mat = ref.current.material;
    if (mat) {
      const baseOpacity = isMobile ? 0.18 : 0.24;
      const pulse = Math.sin(t * 1.1) * 0.04;
      mat.opacity = baseOpacity + pulse;
    }
  });

  return (
    <mesh position={[0, 0, -0.7]} ref={ref}>
      <planeGeometry
        args={[
          6,
          3.2,
          isMobile ? 20 : 40, // fewer segments on mobile
          isMobile ? 10 : 20,
        ]}
      />
      <meshBasicMaterial
        color="#41f5ff"
        wireframe
        transparent
        opacity={0.25}
      />
    </mesh>
  );
}

/* ===========================
   NEON PARTICLE STREAKS
   =========================== */
function NeonParticles({ particleCount }) {
  const ref = useRef();

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      positions[ix + 0] = (Math.random() - 0.5) * 8;
      positions[ix + 1] = (Math.random() - 0.5) * 5;
      positions[ix + 2] = -3 - Math.random() * 5;

      speeds[i] = 0.6 + Math.random() * 1.4;
    }

    return { positions, speeds };
  }, [particleCount]);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;

    const posAttr = pts.geometry.attributes.position;
    const arr = posAttr.array;
    const speedsArr = pts.userData.speeds;

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      arr[ix + 2] += speedsArr[i] * delta;
      arr[ix + 1] += delta * 0.08;

      if (arr[ix + 2] > -2.5) {
        arr[ix + 0] = (Math.random() - 0.5) * 8;
        arr[ix + 1] = (Math.random() - 0.5) * 5;
        arr[ix + 2] = -8 - Math.random() * 4;
        speedsArr[i] = 0.6 + Math.random() * 1.4;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points
      ref={ref}
      onUpdate={(pts) => {
        pts.userData.speeds = speeds;
      }}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        color="#7cfbff"
        transparent
        opacity={0.6}
      />
    </points>
  );
}

/* ===========================
   MAIN SCENE
   =========================== */
export default function BallScene({ onBallClick }) {
  const mouse = useRef([0, 0]);

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  const count = isMobile ? 24 : 40;
  const particleCount = isMobile ? 90 : 180;

  const balls = useMemo(() => {
    const items = [];
    const maxTries = 8000;
    let tries = 0;

    const textWidth = 2.4;
    const textHeight = 0.9;
    const frontChance = 0.18;

    while (items.length < count && tries < maxTries) {
      tries++;

      const radius = 0.22 + Math.random() * 0.32;
      const isFront = Math.random() < frontChance;

      let x = (Math.random() - 0.5) * 4.4;
      let y = (Math.random() - 0.5) * 2.6;

      if (isFront) {
        let safe = 0;
        while (
          Math.abs(x) < textWidth / 2 + radius * 1.2 &&
          Math.abs(y) < textHeight / 2 + radius * 1.2 &&
          safe < 30
        ) {
          x = (Math.random() - 0.5) * 4.4;
          y = (Math.random() - 0.5) * 2.6;
          safe++;
        }
      }

      const z = isFront
        ? 0.3 + Math.random() * 0.4
        : -1.4 - Math.random() * 2.0;

      const candidate = [x, y, z];

      // Non-intersection
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

      // Cyberpunk HSL base color
      const hueRanges = [
        [280, 320], // magenta → hot pink
        [250, 280], // ultraviolet purple
        [200, 230], // cyber blue
        [170, 195], // neon teal
      ];
      const [hMin, hMax] =
        hueRanges[Math.floor(Math.random() * hueRanges.length)];

      const baseHue = hMin + Math.random() * (hMax - hMin);
      const sat = 70 + Math.random() * 25;
      const light = 45 + Math.random() * 25;

      const floatSpeed = 0.4 + Math.random() * 0.4;
      const shiftSpeed = 0.4 + Math.random() * 0.8;

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
      camera={{
        fov: isMobile ? 55 : 50,
        position: [0, 0, 5],
      }}
      dpr={isMobile ? [1, 1.3] : [1, 2]}
      onPointerMove={(e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        mouse.current = [x, y];
      }}
      gl={{ antialias: !isMobile }}
    >
      {/* Background & depth fog */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#070b25", 4, 13]} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-4, -3, 2]} intensity={0.6} />

      {/* Parallax holographic grid */}
      <HolographicGrid mouse={mouse} isMobile={isMobile} />

      {/* Neon particle streaks */}
      <NeonParticles particleCount={particleCount} />

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

      {/* Neon balls */}
      <Suspense fallback={null}>
        {balls.map((data, i) => (
          <InteractiveBall
            key={i}
            data={data}
            mouse={mouse}
            isMobile={isMobile}
            onBallClick={onBallClick}
          />
        ))}
      </Suspense>

      {/* Postprocessing */}
      <EffectComposer multisampling={isMobile ? 0 : 8}>
        <Bloom
          intensity={isMobile ? 0.6 : 0.9}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.9}
          radius={0.7}
        />
        <Noise opacity={isMobile ? 0.03 : 0.04} />
        <Vignette eskil={false} offset={0.25} darkness={0.6} />
        {!isMobile && (
          <Glitch
            delay={[2, 5]}
            duration={[0.4, 0.8]}
            strength={[0.1, 0.3]}
          />
        )}
      </EffectComposer>
    </Canvas>
  );
}
