import { Canvas } from "@react-three/fiber";

export default function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Canvas>
        <color attach="background" args={["hotpink"]} />
      </Canvas>
    </div>
  );
}
