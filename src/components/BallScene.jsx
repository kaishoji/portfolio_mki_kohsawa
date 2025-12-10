import { Canvas } from "@react-three/fiber";

export default function BallScene() {
  return (
    <Canvas>
      <color attach="background" args={["blue"]} />
    </Canvas>
  );
}
