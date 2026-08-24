'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DProps {
  className?: string;
}

/**
 * Interactive WebGL Hero Canvas built with Three.js.
 * Features a dynamic faceted crystal core, orbital wireframe geometry,
 * floating particle cosmos, and real-time pointer-following lighting & rotation.
 */
export function Hero3D({ className = '' }: Hero3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── 1. Scene & Camera Setup ──────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ── 2. Geometric Core (Arcade Crystal) ────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Inner Faceted Core
    const coreGeometry = new THREE.IcosahedronGeometry(1.6, 0);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.18,
      metalness: 0.85,
      flatShading: true,
      emissive: 0x0284c7,
      emissiveIntensity: 0.15,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    mainGroup.add(coreMesh);

    // Outer Neon Wireframe Cage
    const cageGeometry = new THREE.IcosahedronGeometry(2.1, 1);
    const wireframe = new THREE.WireframeGeometry(cageGeometry);
    const cageMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    });
    const cageLines = new THREE.LineSegments(wireframe, cageMaterial);
    mainGroup.add(cageLines);

    // Secondary Accent Ring (Floating Gyroscope)
    const ringGeometry = new THREE.TorusGeometry(2.7, 0.02, 16, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    mainGroup.add(ringMesh);

    // ── 3. Particle Starfield / Floating Digital Dust ─────────────
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 16;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      particleScales[i] = Math.random() * 0.04 + 0.01;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.045,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ── 4. Dynamic Lighting Rig ──────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Pointer-following dynamic point lights
    const lightCyan = new THREE.PointLight(0x38bdf8, 25, 20);
    lightCyan.position.set(3, 3, 3);
    scene.add(lightCyan);

    const lightViolet = new THREE.PointLight(0xa855f7, 20, 20);
    lightViolet.position.set(-3, -2, 2);
    scene.add(lightViolet);

    const lightAmber = new THREE.PointLight(0xf59e0b, 12, 15);
    lightAmber.position.set(0, 4, -2);
    scene.add(lightAmber);

    // ── 5. Mouse Pointer Tracking with Smooth Lerp Damping ────────
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handlePointerMove = (event: MouseEvent) => {
      // Normalize mouse coordinates [-1, 1]
      const rect = container.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      mouse.targetX = (clientX / rect.width) * 2 - 1;
      mouse.targetY = -(clientY / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    // ── 6. Resize Handling ───────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ── 7. Render Loop ───────────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse damping (lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Base idle rotation + pointer interaction
      mainGroup.rotation.x = elapsedTime * 0.15 + mouse.y * 0.4;
      mainGroup.rotation.y = elapsedTime * 0.2 + mouse.x * 0.6;
      mainGroup.position.y = Math.sin(elapsedTime * 0.8) * 0.15;

      // Counter-rotate the outer cage for multi-layered mechanical motion
      cageLines.rotation.x = -elapsedTime * 0.1;
      cageLines.rotation.y = -elapsedTime * 0.12;

      // Spin floating ring
      ringMesh.rotation.z = elapsedTime * 0.25;

      // Orbit dynamic light around pointer position
      lightCyan.position.x = mouse.x * 4 + Math.cos(elapsedTime) * 1.5;
      lightCyan.position.y = mouse.y * 3 + Math.sin(elapsedTime) * 1.5;
      lightCyan.position.z = 3.5;

      lightViolet.position.x = -mouse.x * 3 - Math.sin(elapsedTime * 0.7) * 2;
      lightViolet.position.y = -mouse.y * 2 - Math.cos(elapsedTime * 0.7) * 2;

      // Subtle particle drift
      particles.rotation.y = elapsedTime * 0.02 + mouse.x * 0.08;
      particles.rotation.x = mouse.y * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // ── 8. Cleanup & Disposal ────────────────────────────────────
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js resources
      coreGeometry.dispose();
      coreMaterial.dispose();
      cageGeometry.dispose();
      wireframe.dispose();
      cageMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 -z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}

export default Hero3D;
