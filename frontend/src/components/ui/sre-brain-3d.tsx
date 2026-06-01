import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

interface SreBrain3dProps {
  className?: string;
  isThreat?: boolean;
}

// Generate circular glow texture to prevent ugly square particles
const createGlowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    gradient.addColorStop(0.15, "rgba(255, 255, 255, 0.95)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new THREE.CanvasTexture(canvas);
};

export const SreBrain3d = ({ className, isThreat = false }: SreBrain3dProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || container.offsetWidth;
    let height = container.clientHeight || container.offsetHeight;

    if (width < 40) width = 450;
    if (height < 40) height = 240;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 13.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "0";
    
    container.appendChild(renderer.domElement);

    // Particle Swarm
    const particleCount = 280;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const noiseOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const isLeftLobe = Math.random() > 0.5;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      const r = 2.0 + Math.random() * 1.3;
      const lobeOffset = isLeftLobe ? -1.15 : 1.15;

      // Organic dual-lobe cerebrum math formulation
      const x = r * Math.sin(phi) * Math.cos(theta) * 0.85 + lobeOffset;
      const y = r * Math.sin(phi) * Math.sin(theta) * 1.1;
      const z = r * Math.cos(phi) * 0.8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      speeds[i] = 0.5 + Math.random() * 1.2;
      noiseOffsets[i] = Math.random() * 100;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const glowMap = createGlowTexture();
    const material = new THREE.PointsMaterial({
      size: 0.45,
      map: glowMap,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Inner wireframe sphere core (cybernetic AI engine)
    const coreGeometry = new THREE.SphereGeometry(1.5, 14, 14);
    const coreMaterial = new THREE.MeshBasicMaterial({
      wireframe: true,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // Connection lines (Dynamic plexus constellation effect)
    const maxConnections = 600;
    const linePositions = new Float32Array(maxConnections * 2 * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      linewidth: 1, // Only behaves on some systems, fallback is handled
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Orbiting data nodes representing active agent execution
    const orbCount = 3;
    const orbs: THREE.Mesh[] = [];
    const orbAngles = new Float32Array(orbCount);
    const orbSpeeds = new Float32Array(orbCount);
    const orbRadii = new Float32Array(orbCount);

    const orbGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    for (let i = 0; i < orbCount; i++) {
      const orbMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#10b981"),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const orb = new THREE.Mesh(orbGeometry, orbMat);
      scene.add(orb);
      orbs.push(orb);
      orbAngles[i] = (i / orbCount) * Math.PI * 2;
      orbSpeeds[i] = 0.8 + Math.random() * 0.6;
      orbRadii[i] = 3.2 + Math.random() * 0.6;
    }

    const safeColorLeft = new THREE.Color("#10b981"); // cyber-green
    const safeColorRight = new THREE.Color("#06b6d4"); // cyan
    const threatColorLeft = new THREE.Color("#ef4444"); // crimson
    const threatColorRight = new THREE.Color("#d946ef"); // hot pink / magenta
    
    let activeLeft = safeColorLeft.clone();
    let activeRight = safeColorRight.clone();

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotationY += deltaX * 0.007;
        targetRotationX += deltaY * 0.007;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        targetRotationY += deltaX * 0.008;
        targetRotationX += deltaY * 0.008;

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    renderer.domElement.addEventListener("touchstart", handleTouchStart);
    renderer.domElement.addEventListener("touchmove", handleTouchMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || container.offsetWidth;
      const h = container.clientHeight || container.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth color transitions depending on threat profile
      const targetL = isThreat ? threatColorLeft : safeColorLeft;
      const targetR = isThreat ? threatColorRight : safeColorRight;
      activeLeft.lerp(targetL, 0.05);
      activeRight.lerp(targetR, 0.05);

      lineMaterial.color.copy(activeLeft);
      coreMaterial.color.copy(activeLeft);

      // Spin rotation physics
      points.rotation.y += (targetRotationY - points.rotation.y) * 0.08;
      points.rotation.x += (targetRotationX - points.rotation.x) * 0.08;

      if (!isDragging) {
        const driftSpeed = isThreat ? 0.015 : 0.0035;
        targetRotationY += driftSpeed;
        targetRotationX += Math.sin(elapsedTime * 0.25) * 0.0006;
      }

      coreMesh.rotation.y -= 0.002;
      coreMesh.rotation.x += 0.0015;

      const baseScale = 1.0 + Math.sin(elapsedTime * (isThreat ? 14 : 3)) * (isThreat ? 0.12 : 0.035);
      points.scale.set(baseScale, baseScale, baseScale);
      coreMesh.scale.set(baseScale * 1.1, baseScale * 1.1, baseScale * 1.1);

      // Dynamic vertex position noise and dual lobe color gradients
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const pArr = posAttr.array as Float32Array;

      const colAttr = geometry.attributes.color as THREE.BufferAttribute;
      const cArr = colAttr.array as Float32Array;

      const speedMultiplier = isThreat ? 3.0 : 0.95;

      for (let i = 0; i < particleCount; i++) {
        const xIdx = i * 3;
        const yIdx = i * 3 + 1;
        const zIdx = i * 3 + 2;

        const pSpeed = speeds[i] * speedMultiplier;
        const phase = elapsedTime * pSpeed + noiseOffsets[i];
        
        // Dynamic drift offset simulation
        pArr[xIdx] = initialPositions[xIdx] + Math.sin(phase) * 0.07;
        pArr[yIdx] = initialPositions[yIdx] + Math.cos(phase * 0.8) * 0.07;
        pArr[zIdx] = initialPositions[zIdx] + Math.sin(phase * 0.55) * 0.07;

        // Gradient coloring
        const isLeft = initialPositions[xIdx] < 0;
        const baseCol = isLeft ? activeLeft : activeRight;
        
        // Add individual micro-intensity variations
        const noiseCol = Math.sin(elapsedTime * 1.5 + i) * 0.08;
        cArr[xIdx] = Math.max(0, Math.min(1, baseCol.r + noiseCol));
        cArr[xIdx + 1] = Math.max(0, Math.min(1, baseCol.g + noiseCol));
        cArr[xIdx + 2] = Math.max(0, Math.min(1, baseCol.b + noiseCol));
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // Plexus dynamic connections recalculation
      const linePosAttr = lineGeometry.attributes.position as THREE.BufferAttribute;
      const linePosArr = linePosAttr.array as Float32Array;
      let lineIdx = 0;

      const maxDistSq = 1.95 * 1.95;

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = pArr[i * 3] - pArr[j * 3];
          const dy = pArr[i * 3 + 1] - pArr[j * 3 + 1];
          const dz = pArr[i * 3 + 2] - pArr[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < maxDistSq && lineIdx < maxConnections * 2 * 3 - 6) {
            linePosArr[lineIdx++] = pArr[i * 3];
            linePosArr[lineIdx++] = pArr[i * 3 + 1];
            linePosArr[lineIdx++] = pArr[i * 3 + 2];

            linePosArr[lineIdx++] = pArr[j * 3];
            linePosArr[lineIdx++] = pArr[j * 3 + 1];
            linePosArr[lineIdx++] = pArr[j * 3 + 2];
          }
        }
      }
      lineGeometry.setDrawRange(0, lineIdx / 3);
      linePosAttr.needsUpdate = true;

      // Connecting line opacity pulse
      lineMaterial.opacity = (isThreat ? 0.32 : 0.14) + Math.sin(elapsedTime * 9) * 0.04;
      coreMaterial.opacity = (isThreat ? 0.16 : 0.05) + Math.cos(elapsedTime * 3) * 0.015;

      // Animate Orbiting Agent Orbs
      for (let i = 0; i < orbCount; i++) {
        const orb = orbs[i];
        const angle = orbAngles[i] + elapsedTime * orbSpeeds[i] * (isThreat ? 2.0 : 0.7);
        const radius = orbRadii[i] * baseScale;

        // Three-dimensional helical projection around the lobes
        const ox = Math.cos(angle) * radius;
        const oy = Math.sin(angle * 0.5) * (radius * 0.4);
        const oz = Math.sin(angle) * radius;

        orb.position.set(ox, oy, oz);
        
        // Color transition
        const orbMat = orb.material as THREE.MeshBasicMaterial;
        orbMat.color.copy(i % 2 === 0 ? activeLeft : activeRight);
        orbMat.opacity = 0.75 + Math.sin(elapsedTime * 12 + i) * 0.2;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mouseup", handleMouseUp);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener("mousedown", handleMouseDown);
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("touchstart", handleTouchStart);
        renderer.domElement.removeEventListener("touchmove", handleTouchMove);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      geometry.dispose();
      material.dispose();
      glowMap.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      orbGeometry.dispose();
      orbs.forEach(orb => (orb.material as THREE.MeshBasicMaterial).dispose());
    };
  }, [isThreat]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-black/60 border border-white/[0.03] shadow-inner cursor-grab active:cursor-grabbing", 
        className
      )}
    >
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 px-2 py-0.5 bg-black/75 rounded-lg border border-white/[0.04] text-[9px] text-gray-400 font-mono tracking-widest uppercase pointer-events-none">
        <div className={cn("w-1.5 h-1.5 rounded-full", isThreat ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse")} />
        NEURAL Swarm Brain
      </div>
      <div className="absolute bottom-2.5 right-2.5 text-[8px] text-gray-500 font-mono pointer-events-none z-10">
        Drag to rotate 360°
      </div>
    </div>
  );
};
