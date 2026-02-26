import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

// Mock data for the network
const alumniNodes = [
  { id: "1", name: "Priya S.", company: "Google", type: "alumni" as const, x: 2, y: 1, z: 0 },
  { id: "2", name: "Arjun M.", company: "Microsoft", type: "alumni" as const, x: -1.5, y: 2, z: 1 },
  { id: "3", name: "Sarah C.", company: "OpenAI", type: "alumni" as const, x: 0, y: -1, z: 2 },
  { id: "4", name: "Maya P.", company: "Razorpay", type: "alumni" as const, x: -2, y: -1.5, z: -1 },
  { id: "5", name: "Vikram S.", company: "Flipkart", type: "alumni" as const, x: 1, y: -2, z: -1.5 },
  { id: "6", name: "Lisa W.", company: "Apple", type: "alumni" as const, x: 3, y: 0, z: 1 },
  { id: "7", name: "Rahul V.", company: "Tesla", type: "alumni" as const, x: -3, y: 0.5, z: -0.5 },
  { id: "8", name: "Amit J.", company: "Stripe", type: "alumni" as const, x: 0, y: 3, z: -1 },
];

const companyNodes = [
  { id: "c1", name: "Google", type: "company" as const, x: 4, y: 1.5, z: 0 },
  { id: "c2", name: "Microsoft", type: "company" as const, x: -3.5, y: 3, z: 1 },
  { id: "c3", name: "OpenAI", type: "company" as const, x: 1, y: -2.5, z: 3 },
  { id: "c4", name: "Razorpay", type: "company" as const, x: -4, y: -2, z: -1 },
  { id: "c5", name: "Flipkart", type: "company" as const, x: 2.5, y: -3, z: -2 },
  { id: "c6", name: "Apple", type: "company" as const, x: 5, y: 0, z: 1.5 },
];

const connections = [
  ["1", "c1"], ["2", "c2"], ["3", "c3"], ["4", "c4"], ["5", "c5"], ["6", "c6"],
  ["1", "3"], ["2", "4"], ["5", "7"], ["1", "8"], ["3", "6"], ["4", "7"], ["2", "5"],
];

const allNodes = [...alumniNodes, ...companyNodes];

function NodeSphere({ position, color, size, name }: { position: [number, number, number]; color: string; size: number; name: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.3} metalness={0.6} />
      </mesh>
      <Billboard position={[position[0], position[1] + size + 0.3, position[2]]}>
        <Text fontSize={0.18} color="#94a3b8" anchorX="center" anchorY="middle" font={undefined}>
          {name}
        </Text>
      </Billboard>
    </group>
  );
}

function ConnectionLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const ref = useRef<THREE.Line>(null);
  const geometry = useMemo(() => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [start, end]);

  const material = useMemo(() => new THREE.LineBasicMaterial({ color: "#334155", opacity: 0.4, transparent: true }), []);

  return <primitive ref={ref} object={new THREE.Line(geometry, material)} />;
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  const nodeMap = useMemo(() => {
    const map: Record<string, { x: number; y: number; z: number }> = {};
    allNodes.forEach((n) => { map[n.id] = { x: n.x, y: n.y, z: n.z }; });
    return map;
  }, []);

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#f59e0b" />

      {connections.map(([from, to], i) => {
        const a = nodeMap[from];
        const b = nodeMap[to];
        if (!a || !b) return null;
        return <ConnectionLine key={i} start={[a.x, a.y, a.z]} end={[b.x, b.y, b.z]} />;
      })}

      {alumniNodes.map((n) => (
        <NodeSphere key={n.id} position={[n.x, n.y, n.z]} color="#f59e0b" size={0.2} name={n.name} />
      ))}

      {companyNodes.map((n) => (
        <NodeSphere key={n.id} position={[n.x, n.y, n.z]} color="#3b82f6" size={0.3} name={n.name} />
      ))}
    </group>
  );
}

export default function NetworkGraph() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Alumni Network Graph</h1>
        <p className="text-muted-foreground text-sm">Interactive 3D visualization of alumni connections, companies, and industries</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card" style={{ height: "calc(100vh - 12rem)" }}>
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">Alumni</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-info" />
            <span className="text-xs text-muted-foreground">Companies</span>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">Click and drag to rotate • Scroll to zoom</span>
        </div>
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} style={{ background: "hsl(222, 60%, 6%)" }}>
          <Scene />
          <OrbitControls enablePan enableZoom enableRotate dampingFactor={0.1} />
        </Canvas>
      </div>
    </div>
  );
}
