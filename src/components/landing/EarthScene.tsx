import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import earthTexture from '@/assets/earth-blue-marble.jpg';
import earthBump from '@/assets/earth-topology.png';
import earthSpec from '@/assets/earth-water.png';

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const [colorMap, bumpMap, specMap] = useTexture([
    earthTexture,
    earthBump,
    earthSpec
  ]);

  // Atmospheric glow shader for the limb
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(0.8, 0.2, 0.5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          
          // Fresnel for atmospheric rim
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 4.0);
          
          // Sun angle for color
          float sunAngle = dot(vNormal, sunDirection);
          
          // Sunrise/sunset colors
          vec3 dayColor = vec3(0.4, 0.7, 1.0);
          vec3 sunriseColor = vec3(1.0, 0.5, 0.2);
          vec3 nightColor = vec3(0.1, 0.15, 0.3);
          
          float sunriseMask = smoothstep(-0.3, 0.1, sunAngle) * smoothstep(0.4, 0.0, sunAngle);
          float dayMask = smoothstep(-0.1, 0.3, sunAngle);
          
          vec3 atmosphereColor = mix(nightColor, dayColor, dayMask);
          atmosphereColor = mix(atmosphereColor, sunriseColor, sunriseMask * 0.9);
          
          // Stronger on the sunrise edge
          float intensity = fresnel * (0.6 + sunriseMask * 0.8);
          
          gl_FragColor = vec4(atmosphereColor, intensity * 0.7);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, []);

  // Slow rotation
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (earthRef.current) {
      // Very slow rotation
      earthRef.current.rotation.y = time * 0.008;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = time * 0.008;
    }
  });

  return (
    <group>
      {/* Main Earth */}
      <mesh ref={earthRef} position={[0, -48, 0]}>
        <sphereGeometry args={[50, 128, 128]} />
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.5}
          metalnessMap={specMap}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      
      {/* Atmosphere shell */}
      <mesh ref={atmosphereRef} material={atmosphereMaterial} position={[0, -48, 0]}>
        <sphereGeometry args={[50.8, 64, 64]} />
      </mesh>
    </group>
  );
}

function AtmosphericHaze() {
  const hazeRef = useRef<THREE.Mesh>(null);
  
  const hazeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        
        void main() {
          // Atmospheric blue gradient from bottom
          float gradient = smoothstep(0.0, 0.4, vUv.y);
          
          // Sunrise orange on the right side
          float sunriseX = smoothstep(0.5, 1.0, vUv.x);
          float sunriseY = smoothstep(0.0, 0.3, vUv.y) * smoothstep(0.5, 0.2, vUv.y);
          float sunrise = sunriseX * sunriseY;
          
          vec3 blueHaze = vec3(0.2, 0.4, 0.8);
          vec3 sunriseHaze = vec3(1.0, 0.5, 0.2);
          
          vec3 color = mix(blueHaze, sunriseHaze, sunrise);
          float alpha = (1.0 - gradient) * 0.3 + sunrise * 0.2;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, []);

  return (
    <mesh ref={hazeRef} position={[0, -2, -5]} material={hazeMaterial}>
      <planeGeometry args={[30, 10]} />
    </mesh>
  );
}

function Stars() {
  const starsRef = useRef<THREE.Points>(null);
  
  const [positions, sizes] = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Stars only in upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4; // Upper portion only
      const r = 80 + Math.random() * 40;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 10; // Offset up
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 30;
      
      sizes[i] = Math.random() * 0.5 + 0.1;
    }
    
    return [positions, sizes];
  }, []);

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function SunGlow() {
  const glowRef = useRef<THREE.Mesh>(null);
  
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Multi-layer glow
          float glow1 = smoothstep(0.5, 0.0, dist);
          float glow2 = smoothstep(0.3, 0.0, dist) * 0.5;
          float glow3 = smoothstep(0.15, 0.0, dist) * 0.8;
          
          vec3 sunColor = vec3(1.0, 0.9, 0.7);
          vec3 coronaColor = vec3(1.0, 0.6, 0.3);
          
          vec3 color = mix(coronaColor, sunColor, glow2);
          float alpha = glow1 * 0.4 + glow2 * 0.3 + glow3 * 0.5;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);

  return (
    <mesh ref={glowRef} position={[15, 1, -20]} material={glowMaterial}>
      <planeGeometry args={[20, 20]} />
    </mesh>
  );
}

function Scene() {
  const { camera } = useThree();
  
  // Position camera for 100,000ft view
  useMemo(() => {
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 0, -5);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight 
        position={[20, 10, 15]} 
        intensity={2.5} 
        color="#fff5e6"
      />
      <Stars />
      <SunGlow />
      <Earth />
      <AtmosphericHaze />
    </>
  );
}

export function EarthScene() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(to bottom, #000308 0%, #0a1628 50%, #1a3a5c 100%)' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
