"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// --- Dino Component ---
const Dino = ({ isJumping, onLanding, active, isDead }: { isJumping: boolean; onLanding: () => void; active: boolean; isDead: boolean }) => {
  const meshRef = useRef<THREE.Group>(null!);
  const [velocity, setVelocity] = useState(0);
  const [y, setY] = useState(0);

  useFrame((state, delta) => {
    if (isDead) {
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, Math.PI / 2, 0.1);
      return;
    }
    if (!active && y === 0) return;

    if (isJumping || y > 0) {
      const gravity = -50;
      const newVelocity = velocity + gravity * delta;
      const newY = y + newVelocity * delta;

      if (newY <= 0) {
        setY(0);
        setVelocity(0);
        onLanding();
      } else {
        setY(newY);
        setVelocity(newVelocity);
      }
    }
    meshRef.current.position.y = y + 0.6;
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
  });

  useEffect(() => {
    if (isJumping && y === 0) setVelocity(18);
  }, [isJumping, y]);

  return (
    <group ref={meshRef} name="player">
      <mesh castShadow>
        <boxGeometry args={[0.8, 1, 1.2]} />
        {/* Dino is now Black for high contrast against the White floor */}
        <meshStandardMaterial color={isDead ? "#ff4444" : "#1a1a1a"} />
      </mesh>
    </group>
  );
};

// --- Obstacle Component ---
const Obstacle = ({ speed, onCollide, active, isDead }: { speed: number; onCollide: () => void; active: boolean; isDead: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state, delta) => {
    if (!active || isDead) return;
    meshRef.current.position.z += speed * delta;

    const player = state.scene.getObjectByName("player");
    if (player) {
      const dz = Math.abs(player.position.z - meshRef.current.position.z);
      const dy = player.position.y;
      if (dz < 0.7 && dy < 1.2) onCollide();
    }

    if (meshRef.current.position.z > 10) {
      meshRef.current.position.z = -30 - Math.random() * 20;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.8, -30]} castShadow>
      <boxGeometry args={[0.4, 1.6, 0.4]} />
      {/* Obstacles remain Red for danger visibility */}
      <meshStandardMaterial color="#ff0044" />
    </mesh>
  );
};

// --- Main Page Component ---
export default function Page() {
  const [state, setState] = useState<"START" | "PLAY" | "DEAD">("START");
  const [score, setScore] = useState(0);
  const [jump, setJump] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (state === "PLAY") setJump(true);
        else { setScore(0); setState("PLAY"); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state]);

  useEffect(() => {
    let timer: any;
    if (state === "PLAY") {
      timer = setInterval(() => setScore(s => s + 1), 100);
    }
    return () => clearInterval(timer);
  }, [state]);

  return (
    <div className="relative w-full h-screen bg-[#f0f0f0] overflow-hidden select-none">
      {/* Score UI - Changed to Black for visibility on White */}
      <div className="absolute top-10 left-10 z-10 pointer-events-none">
        <p className="text-black text-7xl font-mono font-black italic tracking-tighter opacity-80">
          {score.toString().padStart(5, '0')}
        </p>
      </div>

      {/* Game Menu */}
      {state !== "PLAY" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="text-center p-12 border border-black/5 rounded-[3rem] bg-white shadow-2xl">
            <h1 className={`text-7xl font-black italic mb-4 ${state === 'DEAD' ? 'text-red-600' : 'text-black'}`}>
              {state === "START" ? "DINO 3D" : "CRASHED"}
            </h1>
            <button 
              onClick={() => { setScore(0); setState("PLAY"); }}
              className="bg-black text-white px-12 py-5 rounded-full font-black text-xl hover:bg-red-600 transition-all shadow-xl"
            >
              {state === "DEAD" ? "REBOOT SYSTEM" : "START MISSION"}
            </button>
          </div>
        </div>
      )}

      {/* 3D Scene */}
      <Canvas shadows>
        {/* Light Gray Background */}
        <color attach="background" args={["#ffffff"]} />
        <PerspectiveCamera makeDefault position={[0, 4, 12]} fov={45} />
        
        {/* Soft, clean lighting for a "Studio" look */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        
        <Suspense fallback={null}>
          <Dino active={state === "PLAY"} isDead={state === "DEAD"} isJumping={jump} onLanding={() => setJump(false)} />
          <Obstacle active={state === "PLAY"} isDead={state === "DEAD"} speed={22 + (score / 150)} onCollide={() => setState("DEAD")} />
          
          {/* White floor with light grey grid */}
          <gridHelper args={[100, 40, "#e0e0e0", "#f5f5f5"]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </Suspense>
      </Canvas>
    </div>
  );
} 