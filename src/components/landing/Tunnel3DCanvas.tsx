'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Tunnel3DCanvasProps {
  scrollProgress: number; // 0 to 1
  mousePos: { x: number; y: number }; // normalized -0.5 to 0.5
  isDark?: boolean;
}

export function Tunnel3DCanvas({ scrollProgress, mousePos, isDark = true }: Tunnel3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(scrollProgress);
  const mouseRef = useRef(mousePos);
  const isDarkRef = useRef(isDark);

  // References to materials that change on theme toggle
  const materialsRef = useRef<{
    scene?: THREE.Scene;
    renderer?: THREE.WebGLRenderer;
    tubeMat?: THREE.LineBasicMaterial;
    rings?: THREE.MeshBasicMaterial[];
    deepStarsMat?: THREE.PointsMaterial;
    warpStarsMat?: THREE.PointsMaterial;
    nebulaMat?: THREE.PointsMaterial;
  }>({});

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    mouseRef.current = mousePos;
  }, [mousePos]);

  useEffect(() => {
    isDarkRef.current = isDark;
    const { scene, renderer, tubeMat, rings, deepStarsMat, warpStarsMat, nebulaMat } = materialsRef.current;
    if (!renderer || !scene) return;

    if (isDark) {
      scene.fog = new THREE.FogExp2(0x020617, 0.0032);
      renderer.setClearColor(0x020617, 1);
      if (tubeMat) {
        tubeMat.color.setHex(0x0284c7);
        tubeMat.opacity = 0.35;
      }
      if (deepStarsMat) {
        deepStarsMat.color.setHex(0xe0f2fe);
        deepStarsMat.opacity = 0.9;
      }
      if (warpStarsMat) {
        warpStarsMat.color.setHex(0x38bdf8);
        warpStarsMat.opacity = 0.85;
      }
      if (nebulaMat) {
        nebulaMat.color.setHex(0x0284c7);
        nebulaMat.opacity = 0.4;
      }
      rings?.forEach((m, i) => {
        m.color.setHex(i % 3 === 0 ? 0x38bdf8 : 0x1e293b);
        m.opacity = i % 3 === 0 ? 0.85 : 0.3;
      });
    } else {
      scene.fog = new THREE.FogExp2(0xf8fafc, 0.0028);
      renderer.setClearColor(0xf8fafc, 1);
      if (tubeMat) {
        tubeMat.color.setHex(0x0284c7);
        tubeMat.opacity = 0.25;
      }
      if (deepStarsMat) {
        deepStarsMat.color.setHex(0x0284c7);
        deepStarsMat.opacity = 0.6;
      }
      if (warpStarsMat) {
        warpStarsMat.color.setHex(0x2563eb);
        warpStarsMat.opacity = 0.75;
      }
      if (nebulaMat) {
        nebulaMat.color.setHex(0x38bdf8);
        nebulaMat.opacity = 0.3;
      }
      rings?.forEach((m, i) => {
        m.color.setHex(i % 3 === 0 ? 0x0284c7 : 0xcbd5e1);
        m.opacity = i % 3 === 0 ? 0.7 : 0.25;
      });
    }
  }, [isDark]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const isInitialDark = isDarkRef.current;
    scene.fog = new THREE.FogExp2(isInitialDark ? 0x020617 : 0xf8fafc, 0.0032);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2000);
    camera.position.set(0, 0, 150);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(isInitialDark ? 0x020617 : 0xf8fafc, 1);
    container.appendChild(renderer.domElement);

    // 3. 3D Spline Path for the Space Tunnel
    const points = [
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(0, 0, 50),
      new THREE.Vector3(25, -15, -120),
      new THREE.Vector3(-30, 20, -280),
      new THREE.Vector3(20, 25, -450),
      new THREE.Vector3(-15, -20, -620),
      new THREE.Vector3(0, 0, -800),
      new THREE.Vector3(0, 0, -1050),
    ];
    const curve = new THREE.CatmullRomCurve3(points);

    // 4. Multi-Layer Wireframe Space Tunnel Geometry
    // Outer structural tube
    const outerTubeGeometry = new THREE.TubeGeometry(curve, 220, 26, 12, false);
    const outerWireframe = new THREE.WireframeGeometry(outerTubeGeometry);
    const tubeMaterial = new THREE.LineBasicMaterial({
      color: isInitialDark ? 0x0284c7 : 0x0284c7,
      transparent: true,
      opacity: isInitialDark ? 0.35 : 0.25,
    });
    const outerTunnel = new THREE.LineSegments(outerWireframe, tubeMaterial);
    scene.add(outerTunnel);

    // Inner conduit rails (4 laser guideline rails running through tunnel)
    const innerRailCount = 4;
    for (let r = 0; r < innerRailCount; r++) {
      const angle = (r / innerRailCount) * Math.PI * 2;
      const railPoints: THREE.Vector3[] = [];
      for (let s = 0; s <= 200; s++) {
        const u = s / 200;
        const pt = curve.getPointAt(u);
        const normal = curve.getTangentAt(u);
        const perp = new THREE.Vector3(-normal.y, normal.x, 0).normalize();
        const binormal = normal.clone().cross(perp).normalize();

        const offset = perp.clone().multiplyScalar(Math.cos(angle) * 18).add(binormal.clone().multiplyScalar(Math.sin(angle) * 18));
        railPoints.push(pt.clone().add(offset));
      }
      const railCurve = new THREE.CatmullRomCurve3(railPoints);
      const railGeom = new THREE.TubeGeometry(railCurve, 120, 0.4, 6, false);
      const railMat = new THREE.MeshBasicMaterial({
        color: isInitialDark ? 0x38bdf8 : 0x0284c7,
        transparent: true,
        opacity: isInitialDark ? 0.7 : 0.4,
      });
      const railMesh = new THREE.Mesh(railGeom, railMat);
      scene.add(railMesh);
    }

    // 5. Laser Depth Rings along the tunnel
    const ringGroup = new THREE.Group();
    const ringMaterials: THREE.MeshBasicMaterial[] = [];
    const ringCount = 42;
    for (let i = 0; i < ringCount; i++) {
      const u = i / ringCount;
      const pos = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u);

      const ringGeom = new THREE.TorusGeometry(26, 0.3, 8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isInitialDark ? (i % 3 === 0 ? 0x38bdf8 : 0x1e293b) : (i % 3 === 0 ? 0x0284c7 : 0xcbd5e1),
        transparent: true,
        opacity: isInitialDark ? (i % 3 === 0 ? 0.85 : 0.3) : (i % 3 === 0 ? 0.7 : 0.25),
      });
      ringMaterials.push(ringMat);
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      ringGroup.add(ringMesh);
    }
    scene.add(ringGroup);

    // 6. LAYER 1: Deep Cosmic Starfield (4,000+ distant stars across the cosmos)
    const deepStarCount = 3500;
    const deepStarGeometry = new THREE.BufferGeometry();
    const deepStarPositions = new Float32Array(deepStarCount * 3);
    const deepStarColors = new Float32Array(deepStarCount * 3);

    for (let i = 0; i < deepStarCount; i++) {
      // Distribute stars on a wide celestial sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 500 + Math.random() * 700;

      deepStarPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      deepStarPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      deepStarPositions[i * 3 + 2] = -400 + radius * Math.cos(phi);

      // Star color temperatures (white, cyan, warm gold)
      const colorType = Math.random();
      if (colorType > 0.8) {
        deepStarColors[i * 3] = 0.22; // Cyan star
        deepStarColors[i * 3 + 1] = 0.74;
        deepStarColors[i * 3 + 2] = 0.97;
      } else if (colorType > 0.6) {
        deepStarColors[i * 3] = 0.96; // Warm golden star
        deepStarColors[i * 3 + 1] = 0.62;
        deepStarColors[i * 3 + 2] = 0.04;
      } else {
        deepStarColors[i * 3] = 0.95; // Crisp crystal white
        deepStarColors[i * 3 + 1] = 0.98;
        deepStarColors[i * 3 + 2] = 1.0;
      }
    }

    deepStarGeometry.setAttribute('position', new THREE.BufferAttribute(deepStarPositions, 3));
    deepStarGeometry.setAttribute('color', new THREE.BufferAttribute(deepStarColors, 3));

    const deepStarsMaterial = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: isInitialDark ? 0.9 : 0.6,
      sizeAttenuation: true,
    });
    const deepStars = new THREE.Points(deepStarGeometry, deepStarsMaterial);
    scene.add(deepStars);

    // 7. LAYER 2: Tunnel Warp Dust (1,800+ streamline particles inside tube)
    const warpParticleCount = 1800;
    const warpParticleGeometry = new THREE.BufferGeometry();
    const warpPositions = new Float32Array(warpParticleCount * 3);

    for (let i = 0; i < warpParticleCount; i++) {
      const u = Math.random();
      const pt = curve.getPointAt(u);
      const radius = 2 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;

      warpPositions[i * 3] = pt.x + Math.cos(angle) * radius;
      warpPositions[i * 3 + 1] = pt.y + Math.sin(angle) * radius;
      warpPositions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 50;
    }

    warpParticleGeometry.setAttribute('position', new THREE.BufferAttribute(warpPositions, 3));

    const warpStarsMaterial = new THREE.PointsMaterial({
      color: isInitialDark ? 0x38bdf8 : 0x2563eb,
      size: 2.5,
      transparent: true,
      opacity: isInitialDark ? 0.85 : 0.75,
      blending: THREE.AdditiveBlending,
    });
    const warpStars = new THREE.Points(warpParticleGeometry, warpStarsMaterial);
    scene.add(warpStars);

    // 8. LAYER 3: Volumetric Cosmic Nebula Clusters
    const nebulaCount = 600;
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaPositions = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      const clusterIdx = Math.floor(Math.random() * 4);
      const clusterCenter = curve.getPointAt(0.2 + clusterIdx * 0.2);
      nebulaPositions[i * 3] = clusterCenter.x + (Math.random() - 0.5) * 120;
      nebulaPositions[i * 3 + 1] = clusterCenter.y + (Math.random() - 0.5) * 120;
      nebulaPositions[i * 3 + 2] = clusterCenter.z + (Math.random() - 0.5) * 120;
    }
    nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));

    const nebulaMaterial = new THREE.PointsMaterial({
      color: isInitialDark ? 0x0284c7 : 0x38bdf8,
      size: 5.5,
      transparent: true,
      opacity: isInitialDark ? 0.4 : 0.3,
      blending: THREE.AdditiveBlending,
    });
    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);

    // 9. Floating 3D Geometric Hologram Artifacts
    const artifactGroup = new THREE.Group();

    // Artifact 1: Caro 3D Spatial Matrix
    const caroGeom = new THREE.BoxGeometry(12, 12, 12);
    const caroEdges = new THREE.EdgesGeometry(caroGeom);
    const caroMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, opacity: 0.9, transparent: true });
    const caroMesh = new THREE.LineSegments(caroEdges, caroMat);
    const caroPos = curve.getPointAt(0.2);
    caroMesh.position.set(caroPos.x + 18, caroPos.y + 6, caroPos.z);
    artifactGroup.add(caroMesh);

    // Artifact 2: Chess Octahedron Core
    const chessGeom = new THREE.OctahedronGeometry(11, 0);
    const chessEdges = new THREE.EdgesGeometry(chessGeom);
    const chessMat = new THREE.LineBasicMaterial({ color: 0xf8fafc, opacity: 0.95, transparent: true });
    const chessMesh = new THREE.LineSegments(chessEdges, chessMat);
    const chessPos = curve.getPointAt(0.45);
    chessMesh.position.set(chessPos.x - 20, chessPos.y - 8, chessPos.z);
    artifactGroup.add(chessMesh);

    // Artifact 3: Sudoku / 2048 Icosahedron
    const cubeGeom = new THREE.IcosahedronGeometry(13, 0);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeom);
    const cubeMat = new THREE.LineBasicMaterial({ color: 0x0284c7, opacity: 0.9, transparent: true });
    const cubeMesh = new THREE.LineSegments(cubeEdges, cubeMat);
    const cubePos = curve.getPointAt(0.75);
    cubeMesh.position.set(cubePos.x + 20, cubePos.y - 10, cubePos.z);
    artifactGroup.add(cubeMesh);

    scene.add(artifactGroup);

    // Save references for dynamic dark/light adjustments
    materialsRef.current = {
      scene,
      renderer,
      tubeMat: tubeMaterial,
      rings: ringMaterials,
      deepStarsMat: deepStarsMaterial,
      warpStarsMat: warpStarsMaterial,
      nebulaMat: nebulaMaterial,
    };

    // 10. Animation & Smooth 3D Flight Loop
    let animationFrameId: number;
    let targetCameraT = 0;
    let currentCameraT = 0;

    const animate = () => {
      // Smooth interpolation of scroll progress along the 3D curve
      targetCameraT = THREE.MathUtils.clamp(scrollRef.current * 0.92, 0, 0.96);
      currentCameraT += (targetCameraT - currentCameraT) * 0.07;

      const camPoint = curve.getPointAt(currentCameraT);
      const lookAtPoint = curve.getPointAt(Math.min(currentCameraT + 0.04, 1));

      // Mouse Parallax Offset
      const mouseX = mouseRef.current.x * 14;
      const mouseY = mouseRef.current.y * 10;

      camera.position.x = camPoint.x + mouseX;
      camera.position.y = camPoint.y - mouseY;
      camera.position.z = camPoint.z;

      camera.lookAt(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z);

      // Rotate celestial star sphere gently
      deepStars.rotation.y += 0.0003;
      deepStars.rotation.x += 0.0001;

      // Rotate geometric artifacts
      caroMesh.rotation.x += 0.012;
      caroMesh.rotation.y += 0.018;

      chessMesh.rotation.y += 0.014;
      chessMesh.rotation.z += 0.009;

      cubeMesh.rotation.x -= 0.011;
      cubeMesh.rotation.y += 0.016;

      // Pulse wireframe opacity gently with wave
      tubeMaterial.opacity = (isDarkRef.current ? 0.3 : 0.2) + Math.sin(Date.now() * 0.002) * 0.06;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 11. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
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
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
