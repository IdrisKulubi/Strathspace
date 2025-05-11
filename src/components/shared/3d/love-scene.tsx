"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";

type HeartProps = {
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
};

function Heart({ position, scale = 1, rotation = [0, 0, 0] }: HeartProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
  });

  // Create a heart shape using Three.js shapes
  const heartShape = new THREE.Shape();
  const x = 0,
    y = 0;
  heartShape.moveTo(x + 0.5, y + 0.5);
  heartShape.bezierCurveTo(x + 0.5, y + 0.5, x + 0.4, y, x, y);
  heartShape.bezierCurveTo(x - 0.6, y, x - 0.6, y + 0.7, x - 0.6, y + 0.7);
  heartShape.bezierCurveTo(
    x - 0.6,
    y + 1.1,
    x - 0.3,
    y + 1.54,
    x + 0.5,
    y + 1.9
  );
  heartShape.bezierCurveTo(
    x + 1.2,
    y + 1.54,
    x + 1.6,
    y + 1.1,
    x + 1.6,
    y + 0.7
  );
  heartShape.bezierCurveTo(x + 1.6, y + 0.7, x + 1.6, y, x + 1.0, y);
  heartShape.bezierCurveTo(x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5);

  const geometry = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.1,
    bevelThickness: 0.1,
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        ref={meshRef}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geometry={geometry as any}
        position={position}
        scale={scale}
        rotation={rotation}
      >
        <meshStandardMaterial
          color="#ff69b4"
          metalness={0.8}
          roughness={0.2}
          emissive="#ff1493"
          emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <Heart position={[-2, 2, -2]} scale={0.3} />
      <Heart
        position={[2, -1, -3]}
        scale={0.2}
        rotation={[0, Math.PI / 4, 0]}
      />
      <Heart
        position={[1, 2, -4]}
        scale={0.15}
        rotation={[Math.PI / 6, 0, 0]}
      />
    </Canvas>
  );
}
