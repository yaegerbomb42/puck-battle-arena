import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ============================================
// LEGENDARY SHADER MATERIAL
// ============================================
export const LegendaryMaterial = shaderMaterial(
  { time: 0, map: null, color: new THREE.Color(0.2, 0.6, 1.0) },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    uniform sampler2D map;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec4 texColor = texture2D(map, vUv);
      
      // holographic wave effect
      float wave = sin(vPosition.y * 10.0 + time * 2.0) * 0.5 + 0.5;
      float shine = max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0)));
      
      // pulse
      float pulse = sin(time * 3.0) * 0.2 + 0.8;
      
      // Combine functionality: keep icon visible but add magical glow
      vec3 finalColor = texColor.rgb * pulse + color * wave * 0.5;
      
      // Rim light
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 3.0);
      finalColor += vec3(0.5, 0.8, 1.0) * rim;

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
);


// ============================================
// COSMIC SHADER (TIER 9) - Dark Matter & Rainbows
// ============================================
export const CosmicMaterial = shaderMaterial(
  { time: 0, map: null },
  // Vertex
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float time;
    uniform sampler2D map;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Swirling UVs
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      float angle = atan(centered.y, centered.x);
      
      float spiral = angle + dist * 5.0 - time * 1.5;
      vec2 spiralUv = vec2(cos(spiral), sin(spiral)) * dist + 0.5;
      
      // Chromatic aberration
      float shift = sin(time) * 0.01;
      vec4 texColorR = texture2D(map, spiralUv + vec2(shift, 0.0));
      vec4 texColorG = texture2D(map, spiralUv);
      vec4 texColorB = texture2D(map, spiralUv - vec2(shift, 0.0));
      
      vec3 finalColor = vec3(texColorR.r, texColorG.g, texColorB.b);
      
      // Dark Matter void edges
      float voidEdge = smoothstep(0.4, 0.5, dist + sin(time * 2.0)*0.05);
      finalColor = mix(finalColor, vec3(0.05, 0.0, 0.1), voidEdge); // Dark purple void
      
      // Rainbow rim
      vec3 rimColor = 0.5 + 0.5 * cos(time + vUv.xyx + vec3(0, 2, 4));
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 2.0);
      
      finalColor += rimColor * rim * 0.8;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

// ============================================
// DIVINE SHADER (TIER 10) - Golden Light & Pulse
// ============================================
export const DivineMaterial = shaderMaterial(
  { time: 0, map: null },
  // Vertex
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float time;
    uniform sampler2D map;
    varying vec2 vUv;
    varying vec3 vNormal;
    
    // Simplex noise function would be huge, using simple pseudo-noise
    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vec4 texColor = texture2D(map, vUv);
      
      // Golden Pulse
      float heartbeat = abs(sin(time * 2.0));
      vec3 gold = vec3(1.0, 0.84, 0.0);
      
      // "Ascending" particles (noise moving up)
      float particle = step(0.98, rand(vUv + vec2(0.0, -time * 0.5)));
      
      vec3 finalColor = texColor.rgb + (gold * heartbeat * 0.3);
      finalColor += gold * particle; // Add particles
      
      // Intense White Rim
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 4.0);
      finalColor += vec3(1.0) * rim * 1.5;

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
);

// ============================================
// MYSTERY SHADER (UNIQUE) - Reality Glitch
// ============================================
export const MysteryMaterial = shaderMaterial(
  { time: 0, map: null },
  // Vertex
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Vertex jitter glitch
      vec3 pos = position;
      float glitch = step(0.95, sin(time * 10.0 + position.y * 5.0));
      pos.x += glitch * 0.1 * sin(time * 20.0);
      
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment
  `
    uniform float time;
    uniform sampler2D map;
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      // Voronoi-ish fracture (simplified grid)
      vec2 grid = fract(vUv * 10.0);
      float cellBorder = step(0.9, grid.x) + step(0.9, grid.y);
      
      vec4 texColor = texture2D(map, vUv);
      
      // Void background showing through cracks
      vec3 voidColor = vec3(0.0); // Pitch black
      
      // Intermittent "Reality Failure"
      float failure = smoothstep(0.4, 0.6, sin(time * 0.5)); // Slow fade in/out
      
      vec3 finalColor = mix(texColor.rgb, voidColor, cellBorder * failure);
      
      // Matrix rain overlay? No, keeping it subtle void.
      
      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
);

// ============================================
// SYMBIOTE SHADER (UNIQUE 999) - Live Cyber-Organic Telemetry
// ============================================
export const SymbioteMaterial = shaderMaterial(
  {
    time: 0,
    map: null,
    winStreak: 0.0, // 0 to 3 scale for color (Blue -> Red -> White)
    kpm: 0.0,       // Kills per minute (controls spike displacement)
    speed: 0.0,     // Normalized speed (controls liquid chrome effect)
    idleFactor: 0.0 // 0 to 1 scale (controls rust and desaturation)
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    uniform float kpm;
    uniform float speed;
    
    // Simplex 3D Noise function for spikes
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
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      vec3 pos = position;
      
      // VERTEX DISPLACEMENT based on KPM
      if (kpm > 0.0) {
          float noiseVal = snoise(pos * 5.0 + time * 0.5);
          float spikeIntensity = smoothstep(0.4, 0.8, noiseVal) * min(kpm, 3.0) * 0.05;
          // Smoothen out speed effect - chrome doesn't spike
          float spikeFactor = mix(1.0, 0.2, speed); 
          pos += normal * spikeIntensity * spikeFactor;
      }
      
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    uniform sampler2D map;
    uniform float winStreak;
    uniform float kpm;
    uniform float speed;
    uniform float idleFactor;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Hash function for noise
    vec2 hash22(vec2 p) {
        p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
        return -1.0 + 2.0 * fract(sin(p)*43758.5453123);
    }

    // 2D Noise
    float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(dot(hash22(i+vec2(0.0,0.0)), f-vec2(0.0,0.0)),
                       dot(hash22(i+vec2(1.0,0.0)), f-vec2(1.0,0.0)), u.x),
                   mix(dot(hash22(i+vec2(0.0,1.0)), f-vec2(0.0,1.0)),
                       dot(hash22(i+vec2(1.0,1.0)), f-vec2(1.0,1.0)), u.x), u.y);
    }
    
    // Voronoi for the vascular system
    float voronoi(vec2 x) {
        vec2 n = floor(x);
        vec2 f = fract(x);
        float res = 8.0;
        for(int j=-1; j<=1; j++)
        for(int i=-1; i<=1; i++) {
            vec2 g = vec2(float(i),float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.5*sin(time + 6.2831*o);
            vec2 r = g + o - f;
            float d = dot(r,r);
            res = min(res, d);
        }
        return sqrt(res);
    }

    void main() {
      // 1. BASE SUBSTRATE (Nano-carbon fiber)
      vec2 grid = fract(vUv * 40.0);
      float carbonPattern = (smoothstep(0.4, 0.6, grid.x) * smoothstep(0.4, 0.6, grid.y)) * 0.2 + 0.1;
      vec3 baseColor = vec3(carbonPattern);
      
      // 2. BIOLUMINESCENT VASCULAR SYSTEM (Win Streak)
      float vFlow = time * 2.0;
      float vPattern = voronoi(vUv * 8.0 + vec2(0.0, -vFlow));
      
      float pulse = sin(vUv.y * 20.0 - time * 5.0) * 0.5 + 0.5;
      float veinIntensity = smoothstep(0.4, 0.1, vPattern) * pulse * (0.5 + winStreak * 0.5);
      
      vec3 streakColorBlue = vec3(0.0, 0.7, 1.0);
      vec3 streakColorRed = vec3(1.0, 0.1, 0.1);
      vec3 streakColorWhite = vec3(1.0, 0.9, 0.8);
      
      vec3 veinColor = mix(streakColorBlue, streakColorRed, clamp(winStreak, 0.0, 1.0));
      veinColor = mix(veinColor, streakColorWhite, clamp(winStreak - 1.0, 0.0, 1.0));
      
      vec3 finalColor = baseColor + (veinColor * veinIntensity);
      
      // 3. IDLE / CAMPING (Rust and Desaturation)
      if (idleFactor > 0.0) {
          float rustNoise = noise2(vUv * 30.0);
          vec3 rustColor = vec3(0.6, 0.3, 0.1) * (rustNoise * 0.5 + 0.5);
          float rustMask = smoothstep(0.3, 0.7, noise2(vUv * 10.0 + time * 0.1)) * idleFactor;
          
          float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
          vec3 desatColor = mix(finalColor, vec3(luma), idleFactor * 0.8);
          finalColor = mix(desatColor, rustColor, rustMask);
      }
      
      // 4. MOVEMENT SPEED (Liquid Chrome Mercury)
      if (speed > 0.0) {
          float chromeWave = noise2(vUv * 5.0 + time * 3.0);
          float chromeMask = smoothstep(0.4, 0.6, speed + chromeWave * 0.2) * speed;
          
          float chromeLight = pow(max(0.0, dot(vNormal, vec3(0.5, 1.0, 0.5))), 4.0);
          vec3 chromeColor = vec3(0.8, 0.9, 1.0) * (0.5 + chromeLight * 2.0);
          
          vec2 screenUv = gl_FragCoord.xy / 1024.0;
          float envReflect = noise2(screenUv * 10.0 - time);
          chromeColor += vec3(envReflect * 0.2);
          
          finalColor = mix(finalColor, chromeColor, clamp(chromeMask, 0.0, 1.0));
      }
      
      // Rim highlight
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      finalColor += vec3(1.0) * pow(rim, 4.0) * mix(0.3, 1.0, speed);

      vec4 texColor = texture2D(map, vUv);
      if (texColor.a > 0.1) {
          vec3 tintedIcon = mix(texColor.rgb, veinColor, min(winStreak * 0.2, 0.5));
          finalColor = mix(finalColor, tintedIcon, texColor.a);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);
