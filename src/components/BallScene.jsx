// src/components/BallScene.jsx
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
} from "@react-three/postprocessing";

const fontURL = import.meta.env.BASE_URL + "fonts/Orbitron-Bold.ttf";

/* ============================================================
   PROCEDURAL FOG LAYER (aurora-style, no textures)
   ============================================================ */
function FogLayer({
  depth = -1.6,
  scale = [14, 10, 1],
  baseOpacity = 0.23,
  hueShift = 0.3,
  warp = 0.25,
  speed = 0.25,
  mouse,
  offset = 0,
  intensity = 1,
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: baseOpacity },
        uHueShift: { value: hueShift },
        uWarp: { value: warp },
        uIntensity: { value: intensity },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uSpeed: { value: speed },
        uOffset: { value: offset },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uHueShift;
        uniform float uWarp;
        uniform float uIntensity;
        uniform vec2 uMouse;
        uniform float uSpeed;
        uniform float uOffset;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x) +
                 (c - a) * u.y * (1.0 - u.x) +
                 (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float f = 0.0;
          f += 0.5000 * noise(p);
          f += 0.2500 * noise(p * 2.0);
          f += 0.1250 * noise(p * 4.0);
          f += 0.0625 * noise(p * 8.0);
          return f;
        }

        vec3 hsl2rgb(vec3 hsl) {
          vec3 rgb = clamp(abs(mod(hsl.x * 6. + vec3(0,4,2), 6.) - 3.) - 1., 0., 1.);
          return hsl.z + hsl.y * (rgb - 0.5) * (1. - abs(2.*hsl.z - 1.));
        }

        void main() {
          float t = uTime * uSpeed + uOffset;

          vec2 p = vUv * 4.0;

          p += uMouse * uWarp;
          p += vec2(t * 0.05, t * 0.03);

          float f = fbm(p + fbm(p * 0.5 + t * 0.2));

          float alpha = f * (uOpacity * uIntensity);

          float hue = mod(uHueShift * 0.5 + f * 0.4 + t * 0.05, 1.0);
          vec3 col = hsl2rgb(vec3(hue, 0.8, 0.6));

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
  }, [baseOpacity, hueShift, warp, speed, offset, intensity]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    material.uniforms.uIntensity.value = intensity;

    const [mx, my] = mouse.current;
    material.uniforms.uMouse.value.set(mx, my);
  });

  return (
    <mesh position={[0, 0, depth]} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/* ============================================================
   LIGHTNING STREAKS (additive flicker in the fog)
   ============================================================ */
function LightningStreaks({ count = 10 }) {
  const groupRef = useRef();

  const streaks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 3,
        z: -1.4 - Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        length: 0.8 + Math.random() * 1.2,
        tilt: (Math.random() - 0.5) * 0.4,
      });
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 2.5;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((mesh, i) => {
      const data = streaks[i];
      const flicker =
        Math.max(0, Math.sin(t + data.phase) * 1.3 - 0.3) +
        Math.random() * 0.1;
      mesh.material.opacity = flicker * 0.9;
      mesh.scale.y = data.length * (0.4 + flicker * 0.6);
    });
  });

  return (
    <group ref={groupRef}>
      {streaks.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={[0, 0, s.tilt]}>
          <planeGeometry args={[0.06, 1]} />
          <meshBasicMaterial
            color="#9afcff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   NEON NAME (your cyberpunk title)
   ============================================================ */
function NeonName({ mouse }) {
  const glowRef = useRef();
  const mainRef = useRef();
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!glowRef.current || !mainRef.current || !groupRef.current) return;

    const t = clock.getElapsedTime();
    const [mx, my] = mouse.current;

    const cursorX = mx * 1.5;
    const cursorY = my * 1.0;
    const dist = Math.sqrt(cursorX * cursorX + cursorY * cursorY);

    const maxInfluence = 1.4;
    const influence = Math.max(0, 1 - dist / maxInfluence);

    const breathe = Math.sin(t * 0.8) * 0.5 + 0.5;

    const glowWidth = 0.06 + breathe * 0.02 + influence * 0.06;
    glowRef.current.outlineWidth = glowWidth;
    glowRef.current.outlineOpacity =
      0.6 + breathe * 0.2 + influence * 0.35;

    const hue = (t * 8) % 360;
    const glowColor = `hsl(${hue}, 85%, 60%)`;
    const mainColor = `hsl(${hue}, 85%, 92%)`;

    glowRef.current.color = glowColor;
    mainRef.current.color = mainColor;

    const tiltStrength = 0.35;
    groupRef.current.rotation.x = my * tiltStrength;
    groupRef.current.rotation.y = -mx * tiltStrength;

    groupRef.current.position.y = Math.sin(t * 0.7) * 0.03;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Text
        ref={glowRef}
        font={fontURL}
        fontSize={0.9}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.06}
        outlineBlur={0.23}
        outlineOpacity={0.6}
        color="#00eaff"
        position={[0, 0, -0.02]}
      >
        Kai Ohsawa
      </Text>
      <Text
        ref={mainRef}
        font={fontURL}
        fontSize={0.9}
        anchorX="center"
        anchorY="middle"
        material-toneMapped={false}
        color="#ffffff"
      >
        Kai Ohsawa
      </Text>
    </group>
  );
}

/* ============================================================
   INTERACTIVE BALLS (with vortex field)
   ============================================================ */
function InteractiveBall({ data, mouse, isMobile, onBallClick, vortexStrength }) {
  const ref = useRef();
  const velocity = useRef([0, 0, 0]);
  const { position, baseHue, sat, light, floatSpeed, shiftSpeed, radius } = data;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    const bobX = Math.cos(t * floatSpeed * (isMobile ? 0.5 : 0.6)) * 0.03;
    const bobY = Math.sin(t * floatSpeed) * 0.05;
    const baseX = position[0] + bobX;
    const baseY = position[1] + bobY;
    const baseZ = position[2];

    const [mx, my] = mouse.current;
    const mouseX = mx * 2.0;
    const mouseY = my * 1.5;

    const dx = baseX - mouseX;
    const dy = baseY - mouseY;
    const dz = baseZ - 0;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const influenceRadius = isMobile ? 1.4 : 1.8;

    // Mouse push-away
    if (dist < influenceRadius && dist > 0.001) {
      const strength = (influenceRadius - dist) * (isMobile ? 0.045 : 0.06);
      velocity.current[0] += (dx / dist) * strength;
      velocity.current[1] += (dy / dist) * strength;
      velocity.current[2] += (dz / dist) * strength;
    }

    // Vortex towards center with swirl (only in X/Y)
    const cx = 0;
    const cy = 0;
    const vx = cx - baseX;
    const vy = cy - baseY;
    const vLen = Math.sqrt(vx * vx + vy * vy) + 0.0001;

    const radialX = vx / vLen;
    const radialY = vy / vLen;
    const tangentialX = -radialY;
    const tangentialY = radialX;

    const vortex = vortexStrength * 0.02;
    velocity.current[0] += radialX * vortex + tangentialX * vortex * 0.7;
    velocity.current[1] += radialY * vortex + tangentialY * vortex * 0.7;

    // Damping
    velocity.current[0] *= 0.88;
    velocity.current[1] *= 0.88;
    velocity.current[2] *= 0.88;

    ref.current.position.set(
      baseX + velocity.current[0],
      baseY + velocity.current[1],
      baseZ + velocity.current[2]
    );

    ref.current.rotation.y += 0.01;
    ref.current.rotation.x += 0.006;

    const hueDeg = (baseHue + t * shiftSpeed * 30) % 360;
    const h = hueDeg / 360;
    const s = sat / 100;
    const l = light / 100;

    const mat = ref.current.material;
    if (mat && mat.color) {
      mat.color.setHSL(h, s, l);
      mat.emissive?.setHSL?.(h, s, Math.min(l + 0.2, 1));
    }
  });

  return (
    <mesh ref={ref} onClick={onBallClick}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial roughness={0.25} metalness={0.4} emissive="#000" />
    </mesh>
  );
}

/* ============================================================
   HOLOGRAPHIC GRID (bends toward mouse)
   ============================================================ */
function HolographicGrid({ mouse, isMobile }) {
  const ref = useRef();
  const basePositions = useRef(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
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

      const wave = Math.sin(t * 1.3 + (x0 + y0) * 2.0) * 0.06 * influence;

      arr[i] = x0;
      arr[i + 1] = y0;
      arr[i + 2] = z0 + influence * maxOffset + wave;
    }
    geom.attributes.position.needsUpdate = true;

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

/* ============================================================
   PARTICLE STREAKS (nebula dust trails)
   ============================================================ */
function NeonParticles({ particleCount }) {
  const ref = useRef();

  const { positions, speeds } = useMemo(() => {
    const p = new Float32Array(particleCount * 3);
    const s = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const j = i * 3;
      p[j] = (Math.random() - 0.5) * 8;
      p[j + 1] = (Math.random() - 0.5) * 5;
      p[j + 2] = -3 - Math.random() * 5;
      s[i] = 0.6 + Math.random() * 1.4;
    }
    return { positions: p, speeds: s };
  }, [particleCount]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;

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
    <points ref={ref} onUpdate={(p) => (p.userData.speeds = speeds)}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          itemSize={3}
          count={positions.length / 3}
          array={positions}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#7cfbff" transparent opacity={0.6} />
    </points>
  );
}

/* ============================================================
   MAIN SCENE + FOG PANEL
   ============================================================ */
export default function BallScene({ onBallClick }) {
  const mouse = useRef([0, 0]);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const [fogIntensity, setFogIntensity] = useState(1);
  const [fogSpeed, setFogSpeed] = useState(1);
  const [vortexStrength, setVortexStrength] = useState(1);

  const ballCount = isMobile ? 24 : 40;
  const particleCount = isMobile ? 90 : 180;

  const balls = useMemo(() => {
    const list = [];
    const maxAttempts = 9000;
    const textW = 2.4;
    const textH = 0.9;

    let attempts = 0;
    while (list.length < ballCount && attempts < maxAttempts) {
      attempts++;

      const radius = 0.22 + Math.random() * 0.32;
      let x = (Math.random() - 0.5) * 4.4;
      let y = (Math.random() - 0.5) * 2.6;
      const front = Math.random() < 0.18;
      let z = front ? 0.4 : -1.4 - Math.random() * 2.2;

      if (front) {
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

      let ok = true;
      for (const b of list) {
        const dx = b.position[0] - x;
        const dy = b.position[1] - y;
        const dz = b.position[2] - z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < (b.radius + radius) * 1.2) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const ranges = [
        [280, 320],
        [250, 280],
        [200, 230],
        [170, 195],
      ];
      const [hMin, hMax] = ranges[Math.floor(Math.random() * ranges.length)];

      list.push({
        position: [x, y, z],
        radius,
        baseHue: hMin + Math.random() * (hMax - hMin),
        sat: 70 + Math.random() * 25,
        light: 45 + Math.random() * 25,
        floatSpeed: 0.4 + Math.random() * 0.4,
        shiftSpeed: 0.4 + Math.random() * 0.8,
      });
    }

    return list;
  }, [ballCount]);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ fov: isMobile ? 55 : 50, position: [0, 0, 5] }}
        dpr={isMobile ? [1, 1.3] : [1, 2]}
        onPointerMove={(e) => {
          mouse.current = [
            (e.clientX / window.innerWidth) * 2 - 1,
            -((e.clientY / window.innerHeight) * 2 - 1),
          ];
        }}
      >
        <color attach="background" args={["#050816"]} />
        <fog attach="fog" args={["#070b25", 4, 13]} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.4} />
        <pointLight position={[-4, -3, 2]} intensity={0.6} />

        {/* 🌫 Procedural fog layers */}
        <FogLayer
          depth={-2.0}
          scale={[15, 10, 1]}
          baseOpacity={0.18}
          hueShift={0.15}
          warp={0.08}
          speed={0.2 * fogSpeed}
          mouse={mouse}
          offset={0}
          intensity={fogIntensity}
        />
        <FogLayer
          depth={-1.6}
          scale={[14, 10, 1]}
          baseOpacity={0.24}
          hueShift={0.25}
          warp={0.18}
          speed={0.28 * fogSpeed}
          mouse={mouse}
          offset={7.3}
          intensity={fogIntensity}
        />
        <FogLayer
          depth={-1.2}
          scale={[16, 12, 1]}
          baseOpacity={0.32}
          hueShift={0.35}
          warp={0.3}
          speed={0.35 * fogSpeed}
          mouse={mouse}
          offset={13.1}
          intensity={fogIntensity}
        />

        <LightningStreaks count={10} />
        <HolographicGrid mouse={mouse} isMobile={isMobile} />
        <NeonParticles particleCount={particleCount} />
        <NeonName mouse={mouse} />

        <Suspense fallback={null}>
          {balls.map((data, i) => (
            <InteractiveBall
              key={i}
              data={data}
              mouse={mouse}
              isMobile={isMobile}
              onBallClick={onBallClick}
              vortexStrength={vortexStrength}
            />
          ))}
        </Suspense>

        <EffectComposer multisampling={isMobile ? 0 : 4}>
          <Bloom intensity={0.9} luminanceThreshold={0.18} radius={0.7} />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.25} darkness={0.6} />
        </EffectComposer>
      </Canvas>

      {/* 🎛 Fog / Vortex Control Panel (always on) */}
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(5, 8, 22, 0.92)",
          border: "1px solid rgba(120, 220, 255, 0.4)",
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          color: "#e5f7ff",
          backdropFilter: "blur(10px)",
          maxWidth: 240,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Fog & Vortex Controls
        </div>

        <label style={{ display: "block", marginTop: 4 }}>
          Fog Intensity
          <input
            type="range"
            min="0"
            max="1.8"
            step="0.05"
            value={fogIntensity}
            onChange={(e) => setFogIntensity(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label style={{ display: "block", marginTop: 4 }}>
          Fog Speed
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={fogSpeed}
            onChange={(e) => setFogSpeed(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label style={{ display: "block", marginTop: 4 }}>
          Vortex Strength
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={vortexStrength}
            onChange={(e) => setVortexStrength(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </div>
    </div>
  );
}
