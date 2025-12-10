import { Canvas } from "@react-three/fiber";

export default function BallScene() {
  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <color attach="background" args={["blue"]} />
    </Canvas>
  );
}
