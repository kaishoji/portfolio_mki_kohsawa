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
   ⭐ STARFIELDS (three layers)
   Now placed between fog layers (Option B)
   ============================================================ */

function StarLayer({
  count = 300,
  depth = -3,
  spreadX = 10,
  spreadY = 6,
  size = 0.045,
  baseOpacity = 0.9,
  color1 = new THREE.Color("#6ea4ff"),
  color2 = new THREE.Color("#b18cff"),
  mouse,
  parallax = 0.2,
  twinkleSpeed = 1.2,
}) {
  const groupRef = useRef();
  const materialRef = useRef();

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const j = i * 3;
      pos[j] = (Math.random() - 0.5) * spreadX;
      pos[j + 1] = (Math.random() - 0.5) * spreadY;
      pos[j + 2] = depth - Math.random() * 0.4;

      const t = Math.random();
      const c = color1.clone().lerp(color2, t);
      col[j] = c.r;
      col[j + 1] = c.g;
      col[j + 2] = c.b;
    }

    return { positions: pos, colors: col };
  }, [count, depth, spreadX, spreadY, color1, color2]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const [mx, my] = mouse.current;

    if (groupRef.current) {
      groupRef.current.position.x = mx * parallax * 1.2;
      groupRef.current.position.y = my * parallax * 0.9;
    }

    if (materialRef.current) {
      const pulse = 0.8 + 0.2 * Math.sin(t * twinkleSpeed + depth);
      materialRef.current.opacity = baseOpacity * pulse;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={size}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={baseOpacity}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function StarField({ mouse }) {
  return (
    <>
      {/* Far */}
      <StarLayer
        count={260}
        depth={-3.4}
        spreadX={18}
        spreadY={10}
        size={0.035}
        baseOpacity={0.75}
        parallax={0.08}
        twinkleSpeed={0.7}
        mouse={mouse}
      />

      {/* Mid */}
      <StarLayer
        count={320}
        depth={-2.8}
        spreadX={14}
        spreadY={8}
        size={0.045}
        baseOpacity={0.9}
        parallax={0.16}
        twinkleSpeed={1.0}
        mouse={mouse}
      />

      {/* Near */}
      <StarLayer
        count={260}
        depth={-2.3}
        spreadX={12}
        spreadY={7}
        size={0.06}
        baseOpacity={1.0}
        parallax={0.25}
        twinkleSpeed={1.4}
        mouse={mouse}
      />
    </>
  );
}

/* ============================================================
   🌫 PROCEDURAL FOG LAYERS
   ============================================================ */

function FogLayer({
  depth = -1.6,
  scale = [14, 10, 1],
  baseOpacity = 0.22,
  hueShift = 0.3,
  warp = 0.25,
  speed = 0.25,
  mouse,
  offset = 0,
  intensity = 1,
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: baseOpacity },
          uHueShift: { value: hueShift },
          uWarp: { value: warp },
          uIntensity: { value: intensity },
          uMouse: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

          float hash(vec2 p){
            return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
          }

          float noise(vec2 p){
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i+vec2(1.0,0.0));
            float c = hash(i+vec2(0.0,1.0));
            float d = hash(i+vec2(1.0,1.0));
            vec2 u = f*f*(3.0 - 2.0*f);
            return mix(a,b,u.x) +
                   (c-a)*u.y*(1.0-u.x) +
                   (d-b)*u.x*u.y;
          }

          float fbm(vec2 p){
            float f = 0.0;
            f += 0.5 * noise(p);
            f += 0.25 * noise(p*2.0);
            f += 0.125 * noise(p*4.0);
            f += 0.0625 * noise(p*8.0);
            return f;
          }

          vec3 hsl2rgb(vec3 hsl){
            vec3 rgb = clamp( abs(mod(hsl.x*6.0 + vec3(0,4,2),6.0)-3.0)-1.0, 0.0,1.0 );
            return hsl.z + hsl.y*(rgb-0.5)*(1.0-abs(2.0*hsl.z-1.0));
          }

          void main(){
            float t = uTime * 0.25;

            vec2 p = vUv*4.0;
            p += uMouse * uWarp;
            p += vec2(t*0.05, t*0.03);

            float f = fbm(p + fbm(p*0.5 + t*0.2));
            float alpha = f * (uOpacity * uIntensity);

            float hue = mod(uHueShift*0.5 + f*0.4 + t*0.05, 1.0);
            vec3 col = hsl2rgb(vec3(hue, 0.8, 0.6));

            gl_FragColor = vec4(col, alpha);
          }
        `,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    const [mx, my] = mouse.current;
    material.uniforms.uMouse.value.set(mx, my);
    material.uniforms.uIntensity.value = intensity;
  });

  return (
    <mesh position={[0, 0, depth]} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}

/* ============================================================
   ✨ NEON NAME
   ============================================================ */

function NeonName({ mouse }) {
  const glowRef = useRef();
  const mainRef = useRef();
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const [mx, my] = mouse.current;
    if (!glowRef.current || !groupRef.current) return;

    const dist = Math.sqrt(mx * mx + my * my);
    const influence = Math.max(0, 1 - dist / 1.4);
    const breathe = Math.sin(t * 0.8) * 0.5 + 0.5;

    glowRef.current.outlineWidth = 0.06 + breathe * 0.02 + influence * 0.06;
    glowRef.current.outlineOpacity =
      0.6 + breathe * 0.2 + influence * 0.35;

    const hue = (t * 8) % 360;
    glowRef.current.color = `hsl(${hue}, 85%, 60%)`;
    mainRef.current.color = `hsl(${hue}, 85%, 92%)`;

    groupRef.current.rotation.x = my * 0.35;
    groupRef.current.rotation.y = -mx * 0.35;

    groupRef.current.position.y = Math.sin(t * 0.7) * 0.03;
  });

  return (
    <group ref={groupRef}>
      <Text
        ref={glowRef}
        font={fontURL}
        fontSize={0.9}
        outlineWidth={0.06}
        outlineBlur={0.23}
        outlineOpacity={0.6}
        anchorX="center"
        anchorY="middle"
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
   🌀 VORTEX BALLS
   ============================================================ */

function InteractiveBall({
  data,
  mouse,
  isMobile,
  onBallClick,
  vortexStrength,
}) {
  const ref = useRef();
  const vel = useRef([0, 0, 0]);
  const { position, baseHue, sat, light, floatSpeed, shiftSpeed, radius } =
    data;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    const bx = position[0] + Math.cos(t * floatSpeed) * 0.03;
    const by = position[1] + Math.sin(t * floatSpeed) * 0.05;
    const bz = position[2];

    const [mx, my] = mouse.current;
    const dx = bx + mx;
    const dy = by + my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const radial = vortexStrength * 0.04;
    const tangential = vortexStrength * 0.025;

    const nx = dx / (dist + 0.01);
    const ny = dy / (dist + 0.01);

    vel.current[0] += -nx * radial + -ny * tangential;
    vel.current[1] += -ny * radial + nx * tangential;
    vel.current[0] *= 0.88;
    vel.current[1] *= 0.88;

    ref.current.position.set(
      bx + vel.current[0],
      by + vel.current[1],
      bz
    );

    const hue = (baseHue + t * shiftSpeed * 30) % 360;
    ref.current.material.color.setHSL(hue / 360, sat / 100, light / 100);
  });

  return (
    <mesh ref={ref} onClick={onBallClick}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial roughness={0.25} metalness={0.4} emissive="#000" />
    </mesh>
  );
}

/* ============================================================
   🧿 HOLOGRAPHIC GRID
   ============================================================ */

function HolographicGrid({ mouse, isMobile }) {
  const ref = useRef();
  const basePositions = useRef(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    const t = clock.getElapsedTime();

    const arr = geom.attributes.position.array;

    if (!basePositions.current) {
      basePositions.current = Float32Array.from(arr);
    }
    const base = basePositions.current;

    const [mx, my] = mouse.current;
    const targetX = mx * 2.5;
    const targetY = my * 1.3;

    const bendRadius = isMobile ? 2.0 : 2.4;

    for (let i = 0; i < arr.length; i += 3) {
      const x0 = base[i];
      const y0 = base[i + 1];
      const dx = x0 - targetX;
      const dy = y0 - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const influence = Math.max(0, 1 - dist / bendRadius);
      arr[i + 2] =
        Math.sin(t * 1.1 + (x0 + y0) * 2.0) * 0.05 * influence -
        influence * 0.35;
    }

    geom.attributes.position.needsUpdate = true;

    ref.current.rotation.x = -0.3 + my * 0.06;
    ref.current.rotation.y = mx * 0.1;
  });

  return (
    <mesh position={[0, 0, -0.7]} ref={ref}>
      <planeGeometry args={[6, 3.2, 40, 20]} />
      <meshBasicMaterial
        color="#41f5ff"
        wireframe
        transparent
        opacity={0.22}
      />
    </mesh>
  );
}

/* ============================================================
   ⚡ UPGRADED COMET PARTICLES
   ============================================================ */

function NeonParticles({ particleCount }) {
  const ref = useRef();

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const j = i * 3;
      pos[j] = (Math.random() - 0.5) * 8;
      pos[j + 1] = (Math.random() - 0.5) * 5;
      pos[j + 2] = -3.0 - Math.random() * 1.6;
      vel[j + 1] = 0.15 + Math.random() * 0.2;
      vel[j + 2] = 0.8 + Math.random() * 1.2;
    }

    return { positions: pos, velocities: vel };
  }, [particleCount]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: `
          varying float vDepth;
          varying float vNoise;

          float hash(vec2 p){
            return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
          }

          void main(){
            vDepth = position.z;
            vNoise = hash(position.xy * 3.17);
            gl_PointSize = 42.0 / -position.z;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying float vDepth;
          varying float vNoise;

          vec3 hsl2rgb(vec3 hsl){
            vec3 rgb = clamp(abs(mod(hsl.x*6.0 + vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
            return hsl.z + hsl.y*(rgb-0.5)*(1.0-abs(2.0*hsl.z-1.0));
          }

          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float alpha = smoothstep(0.5, 0.15, d);

            float depthFactor = clamp((-vDepth - 1.0) / 6.0, 0.0, 1.0);

            float hue =
              mod(0.55 + vNoise * 0.35 + uTime * 0.07, 1.0);

            vec3 col = hsl2rgb(vec3(hue, 0.9, 0.6 + depthFactor * 0.2));

            gl_FragColor = vec4(col, alpha * 1.3);
          }
        `,
      }),
    []
  );

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    const geo = ref.current.geometry;
    const pos = geo.attributes.position.array;
    const vel = velocities;

    for (let i = 0; i < particleCount; i++) {
      const j = i * 3;
      pos[j] += Math.sin(t * 0.6 + i * 0.3) * 0.0015;
      pos[j + 1] += vel[j + 1] * delta * 1.3;
      pos[j + 2] += vel[j + 2] * delta * 1.3;

      if (pos[j + 2] > -0.5) {
        pos[j] = (Math.random() - 0.5) * 8;
        pos[j + 1] = (Math.random() - 0.5) * 5;
        pos[j + 2] = -3.0 - Math.random() * 2.5;
        vel[j + 1] = 0.15 + Math.random() * 0.2;
        vel[j + 2] = 0.8 + Math.random() * 1.2;
      }
    }

    geo.attributes.position.needsUpdate = true;
    material.uniforms.uTime.value = t;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <primitive attach="material" object={material} />
    </points>
  );
}

/* ============================================================
   🎛 MAIN SCENE + HOLOGRAM PANEL
   ============================================================ */

export default function BallScene({ onBallClick }) {
  const mouse = useRef([0, 0]);
  const isMobile = window.innerWidth < 768;

  const [fogIntensity, setFogIntensity] = useState(1);
  const [fogSpeed, setFogSpeed] = useState(1);

  // ✔ Default vortex = MINIMUM
  const [vortexStrength, setVortexStrength] = useState(0);

  const [showControls, setShowControls] = useState(false);

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
        camera={{ fov: isMobile ? 55 : 50, position: [0, 0, 5] }}
        dpr={isMobile ? [1, 1.3] : [1, 2]}
        style={{ width: "100%", height: "100%" }}
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

        <StarField mouse={mouse} />

        <FogLayer
          depth={-2.0}
          scale={[15, 10, 1]}
          baseOpacity={0.14}
          hueShift={0.15}
          warp={0.08}
          speed={0.2 * fogSpeed}
          mouse={mouse}
          intensity={fogIntensity}
        />
        <FogLayer
          depth={-1.6}
          scale={[14, 10, 1]}
          baseOpacity={0.20}
          hueShift={0.25}
          warp={0.18}
          speed={0.28 * fogSpeed}
          mouse={mouse}
          intensity={fogIntensity}
        />
        <FogLayer
          depth={-1.2}
          scale={[16, 12, 1]}
          baseOpacity={0.26}
          hueShift={0.35}
          warp={0.3}
          speed={0.35 * fogSpeed}
          mouse={mouse}
          intensity={fogIntensity}
        />

        <HolographicGrid mouse={mouse} isMobile={isMobile} />
        <NeonParticles particleCount={particleCount} />
        <NeonName mouse={mouse} />

        <Suspense fallback={null}>
          {balls.map((b, i) => (
            <InteractiveBall
              key={i}
              data={b}
              mouse={mouse}
              isMobile={isMobile}
              vortexStrength={vortexStrength}
              onBallClick={onBallClick}
            />
          ))}
        </Suspense>

        <EffectComposer multisampling={isMobile ? 0 : 4}>
          <Bloom intensity={0.9} luminanceThreshold={0.18} radius={0.7} />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.25} darkness={0.6} />
        </EffectComposer>
      </Canvas>

      {/* ⚙ HOLOGRAM OPEN BUTTON */}
      <div
        onClick={() => setShowControls((s) => !s)}
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          padding: "10px 16px",
          background: "rgba(0, 255, 255, 0.12)",
          border: "1px solid rgba(0, 255, 255, 0.35)",
          borderRadius: 10,
          cursor: "pointer",
          userSelect: "none",
          fontSize: 13,
          color: "#9ffcff",
          letterSpacing: "0.5px",
          fontFamily: "Orbitron, sans-serif",
          textShadow: "0 0 8px #00faff",
          backdropFilter: "blur(6px)",
          transition: "background 0.25s ease, transform 0.3s ease",
          boxShadow: "0 0 12px rgba(0,255,255,0.25)",
          transform: showControls ? "scale(0.9)" : "scale(1.0)",
        }}
      >
        ⚙ SYSTEMS
      </div>

      {/* ⚙ HOLOGRAM PANEL */}
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 70,
          width: 260,
          padding: "18px 18px 22px",
          borderRadius: 14,
          background: "rgba(10, 20, 40, 0.55)",
          border: "1px solid rgba(0, 255, 255, 0.35)",
          backdropFilter: "blur(14px)",
          boxShadow:
            "0 0 20px rgba(0,255,255,0.25), inset 0 0 20px rgba(0,255,255,0.15)",
          color: "#cfffff",
          fontFamily: "Orbitron, sans-serif",
          fontSize: 12,
          letterSpacing: "0.4px",
          overflow: "hidden",
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          transform: showControls
            ? "translateY(0px) scale(1)"
            : "translateY(12px) scale(0.92)",
          transition:
            "opacity 0.45s ease, transform 0.45s cubic-bezier(.23,1.2,.32,1)",
        }}
      >
        {/* Scanline overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient( 0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.02) 2px, transparent 4px )",
            pointerEvents: "none",
            mixBlendMode: "overlay",
            animation: "scan 6s linear infinite",
          }}
        />

        {/* Glow border */}
        <div
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: 14,
            border: "1px solid rgba(0,255,255,0.55)",
            filter: "blur(3px)",
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />

        {/* Panel Content */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, color: "#a8faff" }}>
            CONTROL MATRIX
          </div>

          <label style={{ display: "block", marginTop: 6 }}>
            Fog Intensity
            <input
              type="range"
              min="0"
              max="1.8"
              step="0.05"
              value={fogIntensity}
              onChange={(e) =>
                setFogIntensity(parseFloat(e.target.value))
              }
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "block", marginTop: 6 }}>
            Fog Speed
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={fogSpeed}
              onChange={(e) =>
                setFogSpeed(parseFloat(e.target.value))
              }
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "block", marginTop: 6 }}>
            Vortex Strength
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={vortexStrength}
              onChange={(e) =>
                setVortexStrength(parseFloat(e.target.value))
              }
              style={{ width: "100%" }}
            />
          </label>
        </div>
      </div>

      {/* Scan animation keyframes */}
      <style>
        {`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}
      </style>
    </div>
  );
}
