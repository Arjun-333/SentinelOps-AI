import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

interface SreBrain3dProps {
  className?: string;
  isThreat?: boolean;
}

export const SreBrain3d = ({ className, isThreat = false }: SreBrain3dProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use parent container bounding box with clean default fallbacks to prevent 0px layout races
    let width = container.clientWidth || container.offsetWidth;
    let height = container.clientHeight || container.offsetHeight;

    if (width < 40) width = 450;
    if (height < 40) height = 240;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Style the canvas to fit the outer container perfectly
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "0";
    
    container.appendChild(renderer.domElement);

    // Particle Swarm
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const isLeftLobe = Math.random() > 0.5;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      const r = 2.4 + Math.random() * 1.2;
      const lobeOffset = isLeftLobe ? -1.3 : 1.3;

      const x = r * Math.sin(phi) * Math.cos(theta) * 0.9 + lobeOffset;
      const y = r * Math.sin(phi) * Math.sin(theta) * 1.15;
      const z = r * Math.cos(phi) * 0.9;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      speeds[i] = 0.4 + Math.random() * 1.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Dynamic neural lines
    const lineMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];

    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.8 && Math.random() > 0.6) {
          linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          linePositions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
        }
      }
    }

    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    const safeColor = new THREE.Color("#10b981");
    const threatColor = new THREE.Color("#ef4444");
    let activeColor = safeColor.clone();

    // Custom Drag Spin Physics State
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

    // Touch support for mobile interaction
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

    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Lerp active colors
      const targetCol = isThreat ? threatColor : safeColor;
      activeColor.lerp(targetCol, 0.06);
      material.color.copy(activeColor);
      lineMaterial.color.copy(activeColor);

      // Smooth inertia momentum for rotation
      points.rotation.y += (targetRotationY - points.rotation.y) * 0.08;
      points.rotation.x += (targetRotationX - points.rotation.x) * 0.08;

      // Auto rotation drift when not dragging
      if (!isDragging) {
        const autoSpeed = isThreat ? 0.012 : 0.003;
        targetRotationY += autoSpeed;
        targetRotationX += Math.sin(elapsedTime * 0.2) * 0.0005;
      }

      lines.rotation.copy(points.rotation);

      // Pulse scaling
      const pulseRate = isThreat ? 15.0 : 3.5;
      const pulseIntensity = isThreat ? 0.15 : 0.05;
      const currentScale = 1.0 + Math.sin(elapsedTime * pulseRate) * pulseIntensity;
      points.scale.set(currentScale, currentScale, currentScale);
      lines.scale.set(currentScale, currentScale, currentScale);

      // Organic particle movements
      const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
      const pArr = positionAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const xIdx = i * 3;
        const yIdx = i * 3 + 1;
        const zIdx = i * 3 + 2;

        const phase = elapsedTime * speeds[i] * (isThreat ? 2.5 : 0.8);
        pArr[xIdx] = initialPositions[xIdx] + Math.sin(phase) * 0.08;
        pArr[yIdx] = initialPositions[yIdx] + Math.cos(phase * 0.7) * 0.08;
        pArr[zIdx] = initialPositions[zIdx] + Math.sin(phase * 0.4) * 0.08;
      }
      positionAttr.needsUpdate = true;

      // Pulse line visibility
      lineMaterial.opacity = (isThreat ? 0.28 : 0.12) + Math.sin(elapsedTime * 8) * 0.03;

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
      lineGeometry.dispose();
      lineMaterial.dispose();
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
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 px-2 py-0.5 bg-black/75 rounded-lg border border-white/[0.04] text-[9px] text-gray-400 font-mono tracking-widest uppercase pointer-events-none">
        <div className={cn("w-1.5 h-1.5 rounded-full", isThreat ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse")} />
        NEURAL Swarm Brain
      </div>
      <div className="absolute bottom-2 right-2 text-[8px] text-gray-500 font-mono pointer-events-none z-10">
        Drag to rotate 360°
      </div>
    </div>
  );
};
