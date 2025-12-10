import { Canvas } from "@react-three/fiber";

export default function BallScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={1} />

      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    </Canvas>
  );
}