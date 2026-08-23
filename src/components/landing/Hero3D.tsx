'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DProps {
  isDark?: boolean;
}

/**
 * Hero3D - Interactive WebGL 3D Hero Canvas.
 * Features a floating, mouse-reactive geometric arcade core surrounded by
 * kinetic orbital rings, volumetric lighting, and deep celestial starfield.
 */
export function Hero3D({ isDark = true }: Hero3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDarkRef = useRef(isDark);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 32;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkRef.current ? 0.8 : 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x38bdf8, 45, 100);
    pointLight1.position.set(15, 15, 15);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0284c7, 35, 100);
    pointLight2.position.set(-15, -15, 10);
    scene.add(pointLight2);

    // 4. Central 3D Interactive Arcade Core (Icosahedron + Wireframe Shell)
    const coreGroup = new THREE.Group();

    // Inner Glassy Core
    const innerGeom = new THREE.IcosahedronGeometry(6.2, 1);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.85,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    coreGroup.add(innerMesh);

    // Outer Glowing Wireframe Cage
    const outerGeom = new THREE.IcosahedronGeometry(7.6, 1);
    const outerEdges = new THREE.EdgesGeometry(outerGeom);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    const outerMesh = new THREE.LineSegments(outerEdges, outerMat);
    coreGroup.add(outerMesh);

    // Dynamic Orbital Rings
    const ring1Geom = new THREE.TorusGeometry(10.5, 0.12, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    const ring1Mesh = new THREE.Mesh(ring1Geom, ring1Mat);
    ring1Mesh.rotation.x = Math.PI / 3;
    coreGroup.add(ring1Mesh);

    const ring2Geom = new THREE.TorusGeometry(12.2, 0.08, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
    });
    const ring2Mesh = new THREE.Mesh(ring2Geom, ring2Mat);
    ring2Mesh.rotation.y = Math.PI / 4;
    ring2Mesh.rotation.x = -Math.PI / 6;
    coreGroup.add(ring2Mesh);

    scene.add(coreGroup);

    // 5. Deep Space Dust & Star Particles
    const starCount = 800;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 120;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 10;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 6. Mouse Move Listener
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseRef.current.targetX = (e.clientX / innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 7. Animation Loop with Smooth Inertia
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Base idle rotation + mouse coordinate influence
      coreGroup.rotation.y = time * 0.25 + mouseRef.current.x * 0.8;
      coreGroup.rotation.x = Math.sin(time * 0.2) * 0.2 + mouseRef.current.y * 0.5;

      // Gentle floating levitation
      coreGroup.position.y = Math.sin(time * 1.2) * 0.8;

      // Counter-rotate orbital rings
      ring1Mesh.rotation.z += 0.008;
      ring2Mesh.rotation.z -= 0.006;

      // Slow star drift
      starField.rotation.y = time * 0.02;

      // Dynamic light color adaptation
      if (isDarkRef.current) {
        innerMat.color.setHex(0x0f172a);
        outerMat.color.setHex(0x38bdf8);
        starMaterial.color.setHex(0x38bdf8);
      } else {
        innerMat.color.setHex(0xe2e8f0);
        outerMat.color.setHex(0x0284c7);
        starMaterial.color.setHex(0x0284c7);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
