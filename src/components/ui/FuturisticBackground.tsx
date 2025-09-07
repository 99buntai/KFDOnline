import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Type definitions
interface MousePosition {
  x: number;
  y: number;
}

interface InstanceData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  gridGeometry: THREE.PlaneGeometry;
  gridMaterial: THREE.ShaderMaterial;
  isActive: boolean;
}

const FuturisticBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });
  const instanceRef = useRef<InstanceData | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear any existing canvas elements
    const existingCanvases = mountRef.current.querySelectorAll('canvas');
    existingCanvases.forEach((canvas: HTMLCanvasElement) => canvas.remove());

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    mountRef.current.appendChild(renderer.domElement);

    // Create vaporwave grid with natural wave motion
    const gridGeometry = new THREE.PlaneGeometry(50, 50, 40, 40);
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        uniform float time;
        uniform vec2 mouse;
        varying vec2 vUv;
        varying float vDistance;
        varying float vMouseEffect;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Natural wave motion - subtle organic movement
          float waveX = sin(pos.x * 0.3 + time * 1.2) * 0.15;
          float waveY = cos(pos.y * 0.4 + time * 0.8) * 0.12;
          float waveZ = sin(pos.x * 0.2 + pos.y * 0.3 + time * 1.0) * 0.1;
          
          // Combine waves for natural flowing effect
          pos.z += waveX + waveY + waveZ;
          
          // Mouse glow effect
          vec2 mouseWorld = mouse * 25.0;
          float mouseDist = length(pos.xy - mouseWorld);
          vMouseEffect = 1.0 / (mouseDist * 0.1 + 1.0);
          pos.z += vMouseEffect * 2.0;
          
          vDistance = length(pos.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vDistance;
        varying float vMouseEffect;
        
        void main() {
          // Create scrolling grid effect
          vec2 scrollingUV = vUv;
          scrollingUV.y += time * 0.08;
          
          // Grid lines
          vec2 grid = abs(fract(scrollingUV * 40.0) - 0.5) / fwidth(scrollingUV * 40.0);
          float line = min(grid.x, grid.y);
          
          // Vaporwave gradient (pink to cyan)
          vec3 color = mix(vec3(1.0, 0.2, 0.8), vec3(0.2, 0.8, 1.0), vUv.y);
          
          // Line intensity and effects
          float intensity = 1.0 - min(line, 1.0);
          float fade = 1.0 - smoothstep(10.0, 25.0, vDistance);
          float glow = vMouseEffect * 0.8;
          
          float alpha = intensity * fade * (0.8 + glow);
          gl_FragColor = vec4(color + glow * 0.5, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = -2;
    scene.add(gridMesh);

    // Camera positioning
    camera.position.set(0, 4, 12);
    camera.lookAt(0, 0, -10);

    // Store instance data for cleanup
    instanceRef.current = {
      scene,
      camera,
      renderer,
      gridGeometry,
      gridMaterial,
      isActive: true
    };

    // Event handlers
    const handleMouseMove = (event: MouseEvent): void => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = (): void => {
      if (!instanceRef.current?.isActive) return;
      
      const { camera, renderer } = instanceRef.current;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Animation loop
    const animate = (time: number): void => {
      if (!instanceRef.current?.isActive) return;
      
      frameRef.current = requestAnimationFrame(animate);
      const elapsedTime = time * 0.001;
      const { camera, renderer, scene, gridMaterial } = instanceRef.current;

      // Update shader uniforms
      gridMaterial.uniforms.time.value = elapsedTime;
      gridMaterial.uniforms.mouse.value.set(mouseRef.current.x, mouseRef.current.y);

      // Smooth camera movement based on mouse
      const targetX = mouseRef.current.x * 1.5;
      const targetY = mouseRef.current.y * 0.8;
      camera.position.x += (targetX - camera.position.x) * 0.02;
      camera.position.y += (4 + targetY - camera.position.y) * 0.02;

      renderer.render(scene, camera);
    };

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Start animation
    animate(0);

    // Cleanup function
    return (): void => {
      // Mark as inactive
      if (instanceRef.current) {
        instanceRef.current.isActive = false;
      }

      // Remove event listeners
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      // Cancel animation frame
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
      
      // Dispose Three.js objects
      if (instanceRef.current) {
        const { gridGeometry, gridMaterial, renderer } = instanceRef.current;
        
        gridGeometry?.dispose();
        gridMaterial?.dispose();
        
        // Remove canvas from DOM
        renderer?.domElement?.remove();
        renderer?.dispose();
        
        instanceRef.current = null;
      }
      
      // Ensure all canvases are removed
      if (mountRef.current) {
        const remainingCanvases = mountRef.current.querySelectorAll('canvas');
        remainingCanvases.forEach((canvas: HTMLCanvasElement) => canvas.remove());
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 0,
      }}
    />
  );
};

export default FuturisticBackground; 