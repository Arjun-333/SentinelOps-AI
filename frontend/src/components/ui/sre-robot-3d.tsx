import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

interface SreRobot3dProps {
  className?: string;
  isThreat?: boolean;
  isListening?: boolean;
}

export const SreRobot3d = ({ className, isThreat = false, isListening = false }: SreRobot3dProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || container.offsetWidth;
    let height = container.clientHeight || container.offsetHeight;

    if (width < 30) width = 120;
    if (height < 30) height = 120;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    
    container.appendChild(renderer.domElement);

    // Dynamic SRE Robot mesh assembly
    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // 1. Sleek robotic core skull (sphere)
    const coreGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x0a0f1d,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    robotGroup.add(coreMesh);

    // Inner glowing brain core
    const innerGeo = new THREE.IcosahedronGeometry(0.5, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: isThreat ? 0xef4444 : 0x10b981,
      wireframe: true,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    robotGroup.add(innerMesh);

    // 2. Holographic surrounding orbital rings
    const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isThreat ? 0xef4444 : 0x10b981,
      transparent: true,
      opacity: 0.5,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI / 2;
    robotGroup.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh2.rotation.y = Math.PI / 4;
    robotGroup.add(ringMesh2);

    // 3. Glowing Cyber Visor/Eyes (Left & Right capsule)
    const eyeGeo = new THREE.CapsuleGeometry(0.1, 0.22, 4, 16);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: isThreat ? 0xef4444 : isListening ? 0xa855f7 : 0x10b981,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.3, 0.15, 0.65);
    leftEye.rotation.z = -Math.PI / 10;
    robotGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.3, 0.15, 0.65);
    rightEye.rotation.z = Math.PI / 10;
    robotGroup.add(rightEye);

    // 4. Propulsion jet stream bottom indicator (cone)
    const jetGeo = new THREE.ConeGeometry(0.25, 0.6, 3, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: isThreat ? 0xef4444 : 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const jetMesh = new THREE.Mesh(jetGeo, jetMat);
    jetMesh.position.y = -1.1;
    jetMesh.rotation.x = Math.PI;
    robotGroup.add(jetMesh);

    // Lighting/Color States
    const safeColor = new THREE.Color("#10b981");
    const threatColor = new THREE.Color("#ef4444");
    const listeningColor = new THREE.Color("#a855f7");

    // Interactive Drag Physics
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

        targetRotationY += deltaX * 0.012;
        targetRotationX += deltaY * 0.012;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || container.clientWidth;
        const h = entry.contentRect.height || container.clientHeight;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Dynamic color interpolation
      const targetCol = isThreat ? threatColor : isListening ? listeningColor : safeColor;
      innerMat.color.lerp(targetCol, 0.08);
      ringMat.color.lerp(targetCol, 0.08);
      eyeMat.color.lerp(targetCol, 0.08);
      jetMat.color.lerp(targetCol, 0.08);

      // Levitate float animation (sine wave bounce)
      const floatOffset = Math.sin(elapsedTime * 2.2) * 0.12;
      robotGroup.position.y = floatOffset;

      // Outer rings opposite spins
      ringMesh1.rotation.z = elapsedTime * 1.5;
      ringMesh2.rotation.x = -elapsedTime * 1.2;

      // Inertia drag rotation
      robotGroup.rotation.y += (targetRotationY - robotGroup.rotation.y) * 0.1;
      robotGroup.rotation.x += (targetRotationX - robotGroup.rotation.x) * 0.1;

      // Subtle look drift when idle
      if (!isDragging) {
        targetRotationY = Math.sin(elapsedTime * 0.8) * 0.28;
        targetRotationX = Math.cos(elapsedTime * 0.5) * 0.12;
      }

      // Visor eye blinking
      const blinkCycle = Math.floor(elapsedTime * 0.2) % 4 === 0;
      const blinkScale = blinkCycle && Math.sin(elapsedTime * 45) > 0.7 ? 0.05 : 1.0;
      leftEye.scale.y = blinkScale;
      rightEye.scale.y = blinkScale;

      // Propulsion jet spin & size flicker
      jetMesh.rotation.y = elapsedTime * 10;
      jetMesh.scale.setScalar(0.9 + Math.sin(elapsedTime * 35) * 0.1);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("mouseup", handleMouseUp);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener("mousedown", handleMouseDown);
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      jetGeo.dispose();
      jetMat.dispose();
    };
  }, [isThreat, isListening]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full min-h-[140px] flex items-center justify-center overflow-hidden rounded-xl bg-black/45 border border-white/[0.02] shadow-inner cursor-grab active:cursor-grabbing", 
        className
      )}
    />
  );
};
