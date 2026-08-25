'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { usePerformance } from '@/components/shared';

interface Hero3DProps {
  className?: string;
}

/**
  * High-Performance WebGL Hero Canvas built with Three.js.
  * Optimized with IntersectionObserver auto-pause, adaptive pixel ratio,
  * visibility detection, and a lightweight 2D CSS Aurora mode for low-power devices.
  */
export function Hero3D({ className = '' }: Hero3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { graphicsMode } = usePerformance();
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    // If Eco Mode is active, skip WebGL entirely to save 100% GPU/CPU load
    if (graphicsMode === 'eco') return;

    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability safely
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    // ── 1. Scene & Camera Setup ──────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      50
    );
    camera.position.set(0, 0, 7.5);

    // Adaptive pixel ratio capped at 1.25 to prevent 4x fill-rate overload on Retina screens
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: pixelRatio <= 1.25,
        alpha: true,
        powerPreference: 'default',
      });
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
    } catch {
      setWebGlSupported(false);
      return;
    }

    // ── 2. Geometric Core (Arcade Crystal) ────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Inner Faceted Core
    const coreGeometry = new THREE.IcosahedronGeometry(1.6, 0);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.8,
      flatShading: true,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
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
    });
    const cageLines = new THREE.LineSegments(wireframe, cageMaterial);
    mainGroup.add(cageLines);

    // Secondary Accent Ring (Floating Gyroscope)
    const ringGeometry = new THREE.TorusGeometry(2.7, 0.02, 12, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    mainGroup.add(ringMesh);

    // ── 3. Optimized Particle Starfield (80 particles instead of 200) ──
    const particleCount = 80;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ── 4. Dynamic Lighting Rig (2 bounded lights) ────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const lightCyan = new THREE.PointLight(0x38bdf8, 18, 16);
    lightCyan.position.set(3, 3, 3);
    scene.add(lightCyan);

    const lightViolet = new THREE.PointLight(0xa855f7, 14, 16);
    lightViolet.position.set(-3, -2, 2);
    scene.add(lightViolet);

    // ── 5. Mouse Pointer Tracking with Smooth Lerp Damping ────────
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handlePointerMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      mouse.targetX = (clientX / rect.width) * 2 - 1;
      mouse.targetY = -(clientY / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    // ── 6. Resize Handling ───────────────────────────────────────
    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = Math.max(container.clientHeight, 1);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(pixelRatio);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ── 7. Smart Render Loop with Visibility & Intersection Observer ──
    let animationFrameId: number | null = null;
    let isVisible = true;
    let isTabActive = true;
    const clock = new THREE.Clock();

    const render = () => {
      if (!renderer || !isVisible || !isTabActive) {
        animationFrameId = null;
        return;
      }

      animationFrameId = requestAnimationFrame(render);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse damping (lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Base rotation + pointer interaction
      mainGroup.rotation.x = elapsedTime * 0.12 + mouse.y * 0.3;
      mainGroup.rotation.y = elapsedTime * 0.16 + mouse.x * 0.45;
      mainGroup.position.y = Math.sin(elapsedTime * 0.6) * 0.12;

      // Counter-rotate outer cage
      cageLines.rotation.x = -elapsedTime * 0.08;
      cageLines.rotation.y = -elapsedTime * 0.1;

      // Spin ring
      ringMesh.rotation.z = elapsedTime * 0.2;

      // Orbit dynamic light around pointer position
      lightCyan.position.x = mouse.x * 3 + Math.cos(elapsedTime * 0.8) * 1.5;
      lightCyan.position.y = mouse.y * 2.5 + Math.sin(elapsedTime * 0.8) * 1.5;

      lightViolet.position.x = -mouse.x * 2.5 - Math.sin(elapsedTime * 0.6) * 1.8;
      lightViolet.position.y = -mouse.y * 2 - Math.cos(elapsedTime * 0.6) * 1.8;

      // Particle drift
      particles.rotation.y = elapsedTime * 0.015 + mouse.x * 0.05;

      renderer.render(scene, camera);
    };

    const startRendering = () => {
      if (!animationFrameId && isVisible && isTabActive) {
        clock.start();
        render();
      }
    };

    const stopRendering = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    // IntersectionObserver: PAUSES 3D rendering immediately when scrolled out of viewport!
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        isVisible = entry.isIntersecting;
        if (isVisible) {
          startRendering();
        } else {
          stopRendering();
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // Page Visibility: Pause when tab is inactive
    const handleVisibilityChange = () => {
      isTabActive = document.visibilityState === 'visible';
      if (isTabActive && isVisible) {
        startRendering();
      } else {
        stopRendering();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    startRendering();

    // ── 8. Cleanup & Resource Disposal ───────────────────────────
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      stopRendering();

      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js memory allocations
      coreGeometry.dispose();
      coreMaterial.dispose();
      cageGeometry.dispose();
      wireframe.dispose();
      cageMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer?.dispose();
    };
  }, [graphicsMode]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 -z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* 2D CSS Aurora fallback when in Eco Mode or on unsupported hardware (0% WebGL GPU Load) */}
      {(graphicsMode === 'eco' || !webGlSupported) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative h-80 w-80 sm:h-96 sm:w-96 rounded-full bg-gradient-to-tr from-sky-500/20 via-blue-600/15 to-violet-500/20 blur-2xl dark:opacity-40" />
          <div className="absolute h-56 w-56 rounded-full border border-sky-400/20 [animation:pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          <div className="absolute h-72 w-72 rounded-full border border-indigo-400/15 [animation:pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        </div>
      )}
    </div>
  );
}

export default Hero3D;
