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

// ======================================
// DYNAMIC FONT PATH (safe for Vite + GH Pages)
// ======================================
const fontURL = import.meta.env.BASE_URL + "fonts/Orbitron-Bold.ttf";

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

    // Idle bobbing
    const bobFactor = isMobile ? 0.5 : 0.6;
    const bobX = Math.cos(t * floatSpeed * bobFactor) * 0.03;
    const bobY = Math.sin(t * floatSpeed) * 0.05;

    const baseX = position[0] + bobX;
    const baseY = position[1] + bobY;
    const baseZ = position[2];

    // Mouse force field
    const [mx, my] = mouse.current;
    const mdx = baseX - mx * 2.0;
    const mdy = baseY - my * 1.5;
    const mdz = baseZ - 0.0;

    const dist = Math.sqrt(mdx * mdx + mdy * mdy + mdz * mdz);
    const influenceRadius = isMobile ? 1.4 : 1.8;

    if (dist < influenceRadius && dist > 0.0001) {
      const strength = (influenceRadius - dist) * (isMobile ? 0.045 : 0.06);
      velocity.current[0] += (mdx / dist) * strength;
      velocity.current[1] += (mdy / dist) * strength;
      velocity.current[2] += (mdz / dist) * strength;
    }

    // damping
    const damping = isMobile ? 0.9 : 0.88;
    velocity.current[0] *= damping;
    velocity.current[1] *= damping;
    velocity.current[2] *= damping;

    ref.current.position.set(
      baseX + velocity.current[0],
      baseY + velocity.current[1],
      baseZ + velocity.current[2]
    );

    // spin
    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    // color shift
    const mat = ref.current.material;
    if (mat) {
      const hueDeg = (baseHue + t * shiftSpeed * 30) % 360;
      mat.color.setHSL(hueDeg / 360, sat / 100, light / 100);
      mat.emissive.setHSL(hueDeg / 360, sat / 100, Math.min(light / 100 + 0.2, 1));
    }
  });

  return (
    <mesh ref={ref} onClick={onBallClick}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color="white"
        metalness={0.4}
        roughness={0.25}
        emissive="#000"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

/* ===========================
   HOLOGRAPHIC GRID
   =========================== */
function HolographicGrid({ mouse, isMobile }) {
  const ref = useRef();
  const basePositions = useRef(null);

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.getElapsedTime();
    const geom = ref.current.geometry;
    const arr = geom.attributes.position.array;

    if (!basePositions.current) {
      basePositions.current = Float32Array.from(arr);
    }
    const base = basePositions.current;

    const [mx, my] = mouse.current;
    const targetX = mx * 3;
    const targetY = my * 1.6;

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

      const waveAmp = isMobile ? 0.04 : 0.06;
      const wave = Math.sin(t * 1.3 + (x0 + y0) * 2.0) * waveAmp * influence;

      arr[i] = x0;
      arr[i + 1] = y0;
      arr[i + 2] = z0 + influence * maxOffset + wave;
    }

    geom.attributes.position.needsUpdate = true;

    // slight parallax tilt
    ref.current.rotation.x = -0.35 + my * 0.08;
    ref.current.rotation.y = mx * 0.12;
  });

  return (
    <mesh position={[0, 0, -0.7]} ref={ref}>
      <planeGeometry
        args={[6, 3.2, isMobile ? 20 : 40, isMobile ? 10 : 20]}
      />
      <meshBasicMaterial color="#41f5ff" wireframe transparent opacity={0.25} />
    </mesh>
  );
}

/* ===========================
   PARTICLE STREAKS
   =========================== */
function NeonParticles({ particleCount }) {
  const ref = useRef();

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const j = i * 3;
      positions[j] = (Math.random() - 0.5) * 8;
      positions[j + 1] = (Math.random() - 0.5) * 5;
      positions[j + 2] = -3 - Math.random() * 5;
      speeds[i] = 0.6 + Math.random() * 1.4;
    }
    return { positions, speeds };
  }, [particleCount]);

  useFrame((_, delta) => {
    const pts = ref.current;
    const arr = pts.geometry.attributes.position.array;
    const v = pts.userData.speeds;

    for (let i = 0; i < particleCount; i++) {
      const j = i * 3;
      arr[j + 2] += v[i] * delta;
      arr[j + 1] += delta * 0.08;

      if (arr[j + 2] > -2.5) {
        arr[j] = (Math.random() - 0.5) * 8;
        arr[j + 1] = (Math.random() - 0.5) * 5;
        arr[j + 2] = -8 - Math.random() * 4;
        v[i] = 0.6 + Math.random() * 1.4;
      }
    }

    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points
      ref={ref}
      onUpdate={(p) => (p.userData.speeds = speeds)}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
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

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const ballCount = isMobile ? 24 : 40;
  const particleCount = isMobile ? 90 : 180;

  // Generate ball positions & colors
  const balls = useMemo(() => {
    const arr = [];
    const maxAttempts = 9000;
    let attempts = 0;

    const textW = 2.4;
    const textH = 0.9;

    while (arr.length < ballCount && attempts < maxAttempts) {
      attempts++;
      const radius = 0.22 + Math.random() * 0.32;
      let x = (Math.random() - 0.5) * 4.4;
      let y = (Math.random() - 0.5) * 2.6;
      let z = Math.random() < 0.18 ? 0.4 : -1.4 - Math.random() * 2.2;

      // avoid overlapping name area (front orbs only)
      if (z > 0) {
        let guard = 0;
        while (
          Math.abs(x) < textW / 2 + radius &&
          Math.abs(y) < textH / 2 + radius &&
          guard < 40
        ) {
          x = (Math.random() - 0.5) * 4.4;
          y = (Math.random() - 0.5) * 2.6;
          guard++;
        }
      }

      // avoid intersecting other balls
      let ok = true;
      for (const other of arr) {
        const dx = x - other.position[0];
        const dy = y - other.position[1];
        const dz = z - other.position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < (other.radius + radius) * 1.2) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Cyberpunk color ranges
      const hueRanges = [
        [280, 320],
        [250, 280],
        [200, 230],
        [170, 195],
      ];
      const [hMin, hMax] =
        hueRanges[Math.floor(Math.random() * hueRanges.length)];

      arr.push({
        position: [x, y, z],
        radius,
        baseHue: hMin + Math.random() * (hMax - hMin),
        sat: 70 + Math.random() * 25,
        light: 45 + Math.random() * 25,
        floatSpeed: 0.4 + Math.random() * 0.4,
        shiftSpeed: 0.4 + Math.random() * 0.8,
      });
    }
    return arr;
  }, [ballCount]);

  return (
    <Canvas
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
      camera={{ fov: isMobile ? 55 : 50, position: [0, 0, 5] }}
      dpr={isMobile ? [1, 1.3] : [1, 2]}
      onPointerMove={(e) => {
        mouse.current = [
          (e.clientX / window.innerWidth) * 2 - 1,
          -((e.clientY / window.innerHeight) * 2 - 1),
        ];
      }}
      gl={{ antialias: !isMobile }}
    >
      {/* Colors & fog */}
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#070b25", 4, 13]} />

      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-4, -3, 2]} intensity={0.6} />

      {/* Grid */}
      <HolographicGrid mouse={mouse} isMobile={isMobile} />

      {/* Particle streaks */}
      <NeonParticles particleCount={particleCount} />

      {/* ===== CYBERPUNK 3D NAME WITH GLOW ===== */}
      <group position={[0, 0, 0]}>
        <Text
          font={fontURL}
          fontSize={0.9}
          color="#00eaff"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, -0.02]}
          outlineWidth={0.14}
          outlineColor="#00eaff"
          outlineOpacity={1}
          outlineBlur={0.6}
        >
          Kai Ohsawa
        </Text>

        <Text
          font={fontURL}
          fontSize={0.9}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
        >
          Kai Ohsawa
        </Text>
      </group>

      {/* Interactive balls */}
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

      {/* Post processing */}
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