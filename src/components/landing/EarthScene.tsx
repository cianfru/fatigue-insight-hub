import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  // Create procedural textures for Earth
  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunDirection: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          // Generate continent-like patterns
          vec3 pos = vPosition * 2.0;
          float continent = snoise(pos * 0.8);
          continent += snoise(pos * 1.6) * 0.5;
          continent += snoise(pos * 3.2) * 0.25;
          continent = smoothstep(-0.2, 0.3, continent);
          
          // Colors
          vec3 oceanDeep = vec3(0.02, 0.08, 0.18);
          vec3 oceanShallow = vec3(0.04, 0.15, 0.35);
          vec3 landLow = vec3(0.15, 0.25, 0.12);
          vec3 landHigh = vec3(0.35, 0.30, 0.22);
          
          // Mix ocean depths
          float oceanDetail = snoise(pos * 4.0) * 0.5 + 0.5;
          vec3 ocean = mix(oceanDeep, oceanShallow, oceanDetail);
          
          // Mix land heights
          float landDetail = snoise(pos * 6.0) * 0.5 + 0.5;
          vec3 land = mix(landLow, landHigh, landDetail);
          
          vec3 surfaceColor = mix(ocean, land, continent);
          
          // Lighting
          float diffuse = max(dot(vNormal, sunDirection), 0.0);
          
          // Sunrise gradient on terminator
          float terminator = dot(vNormal, sunDirection);
          vec3 sunriseColor = vec3(1.0, 0.4, 0.1);
          float sunriseGlow = smoothstep(-0.1, 0.2, terminator) * smoothstep(0.4, 0.0, terminator);
          
          // Ambient light (from atmosphere scatter)
          vec3 ambient = vec3(0.08, 0.12, 0.2);
          
          // Night side city lights
          float nightMask = smoothstep(0.1, -0.2, terminator);
          float cityNoise = snoise(pos * 20.0);
          float cities = step(0.7, cityNoise) * continent * nightMask * 0.8;
          vec3 cityColor = vec3(1.0, 0.85, 0.5);
          
          // Final color
          vec3 lit = surfaceColor * (ambient + diffuse * vec3(1.0, 0.95, 0.9));
          lit += sunriseColor * sunriseGlow * 0.5;
          lit += cityColor * cities;
          
          gl_FragColor = vec4(lit, 1.0);
        }
      `
    });
  }, []);

  // Atmosphere shader
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          
          float sunAngle = dot(vNormal, sunDirection);
          
          // Sunrise colors at terminator
          vec3 dayAtmosphere = vec3(0.3, 0.6, 1.0);
          vec3 sunriseAtmosphere = vec3(1.0, 0.4, 0.15);
          vec3 nightAtmosphere = vec3(0.05, 0.1, 0.2);
          
          float sunriseMask = smoothstep(-0.3, 0.2, sunAngle) * smoothstep(0.5, 0.0, sunAngle);
          float dayMask = smoothstep(0.0, 0.5, sunAngle);
          
          vec3 atmosphereColor = mix(nightAtmosphere, dayAtmosphere, dayMask);
          atmosphereColor = mix(atmosphereColor, sunriseAtmosphere, sunriseMask * 0.8);
          
          // Stronger glow on the sunrise edge
          float edgeGlow = fresnel * (0.5 + sunriseMask * 1.5);
          
          gl_FragColor = vec4(atmosphereColor, edgeGlow * 0.6);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, []);

  // Cloud layer material
  const cloudMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunDirection: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vec3 pos = vPosition * 1.5 + vec3(time * 0.02, 0.0, 0.0);
          float cloud = snoise(pos * 2.0);
          cloud += snoise(pos * 4.0) * 0.5;
          cloud += snoise(pos * 8.0) * 0.25;
          cloud = smoothstep(0.2, 0.8, cloud);
          
          float diffuse = max(dot(vNormal, sunDirection), 0.0);
          float terminator = dot(vNormal, sunDirection);
          float sunriseMask = smoothstep(-0.2, 0.3, terminator) * smoothstep(0.5, 0.0, terminator);
          
          vec3 cloudColor = vec3(1.0, 1.0, 1.0);
          vec3 sunriseCloudColor = vec3(1.0, 0.6, 0.3);
          cloudColor = mix(cloudColor, sunriseCloudColor, sunriseMask);
          
          float lit = 0.3 + diffuse * 0.7;
          
          gl_FragColor = vec4(cloudColor * lit, cloud * 0.4);
        }
      `,
      transparent: true,
      depthWrite: false
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (earthRef.current) {
      earthRef.current.rotation.y = time * 0.015;
      (earthRef.current.material as THREE.ShaderMaterial).uniforms.time.value = time;
    }
    
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = time * 0.018;
      (cloudsRef.current.material as THREE.ShaderMaterial).uniforms.time.value = time;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = time * 0.015;
    }
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={earthRef} material={earthMaterial}>
        <sphereGeometry args={[2, 128, 128]} />
      </mesh>
      
      {/* Clouds */}
      <mesh ref={cloudsRef} material={cloudMaterial}>
        <sphereGeometry args={[2.02, 64, 64]} />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef} material={atmosphereMaterial}>
        <sphereGeometry args={[2.3, 64, 64]} />
      </mesh>
    </group>
  );
}

function Stars() {
  const starsRef = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 50;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Slight color variation
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness + Math.random() * 0.2;
    }
    
    return [positions, colors];
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
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

export function EarthScene() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#000408']} />
        <ambientLight intensity={0.1} />
        <Stars />
        <Earth />
      </Canvas>
    </div>
  );
}
