"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

interface PanoramicViewerProps {
  imagePath: string;
}

const PanoramicViewer: React.FC<PanoramicViewerProps> = ({ imagePath }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !minimapRef.current) return;

    // Main viewer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Minimap setup
    const minimapScene = new THREE.Scene();
    const minimapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    minimapCamera.position.set(0, 0, 1);

    const minimapRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    minimapRenderer.setSize(150, 150);
    minimapRenderer.setClearColor(0x000000, 0.3);
    minimapRef.current.appendChild(minimapRenderer.domElement);

    // Create main sphere
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    // Load texture
    const loader = new THREE.TextureLoader();
    const texture = loader.load(imagePath);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Create minimap elements
    const minimapCircle = new THREE.CircleGeometry(0.9, 32);
    const minimapMaterial = new THREE.MeshBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.6,
    });
    const minimapBase = new THREE.Mesh(minimapCircle, minimapMaterial);
    minimapScene.add(minimapBase);

    // Create view direction indicator
    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 0.3);
    triangleShape.lineTo(-0.2, -0.2);
    triangleShape.lineTo(0.2, -0.2);
    triangleShape.lineTo(0, 0.3);

    const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
    const triangleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    const viewIndicator = new THREE.Mesh(triangleGeometry, triangleMaterial);
    minimapScene.add(viewIndicator);

    // Add OrbitControls with touch support
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.minDistance = 100;
    controls.maxDistance = 500;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;

    // Fix touch controls
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Reverse rotation direction for more natural feel
    controls.rotateSpeed = -0.5; // Negative value to reverse direction

    // Handle window resize
    const onWindowResize = (): void => {
      if (!containerRef.current) return;

      camera.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };

    window.addEventListener("resize", onWindowResize);

    // Create control buttons
    const createControlButton = (
      text: string,
      onClick: () => void
    ): HTMLButtonElement => {
      const button = document.createElement("button");
      button.textContent = text;
      button.style.cssText = `
        padding: 8px 16px;
        margin: 4px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      button.addEventListener("click", onClick);
      return button;
    };

    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 1000;
    `;

    const zoomInBtn = createControlButton("+", () => {
      const zoomSpeed = 2;
      const newDistance = controls.getDistance() * (1 - zoomSpeed / 10);
      controls.minDistance = Math.max(1, newDistance);
      camera.position.setLength(newDistance);
    });

    const zoomOutBtn = createControlButton("-", () => {
      const zoomSpeed = 2;
      const newDistance = controls.getDistance() * (1 + zoomSpeed / 10);
      controls.maxDistance = Math.min(1000, newDistance);
      camera.position.setLength(newDistance);
    });

    const resetBtn = createControlButton("Reset", () => {
      controls.reset();
    });

    const autoRotateBtn = createControlButton("Auto Rotate", () => {
      controls.autoRotate = !controls.autoRotate;
      autoRotateBtn.style.background = controls.autoRotate
        ? "rgba(0, 128, 0, 0.5)"
        : "rgba(0, 0, 0, 0.5)";
    });

    controlsContainer.appendChild(zoomInBtn);
    controlsContainer.appendChild(zoomOutBtn);
    controlsContainer.appendChild(resetBtn);
    controlsContainer.appendChild(autoRotateBtn);
    containerRef.current.appendChild(controlsContainer);

    // Animation loop
    const animate = (): void => {
      requestAnimationFrame(animate);
      controls.update();

      // Update view direction indicator in minimap
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const angle = Math.atan2(direction.x, direction.z);
      viewIndicator.rotation.z = -angle;

      renderer.render(scene, camera);
      minimapRenderer.render(minimapScene, minimapCamera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", onWindowResize);

      if (controlsContainer.parentNode) {
        controlsContainer.remove();
      }

      // Dispose of Three.js objects
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      minimapRenderer.dispose();
      triangleGeometry.dispose();
      triangleMaterial.dispose();
      minimapCircle.dispose();
      minimapMaterial.dispose();
    };
  }, [imagePath]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        className="cursor-move"
      />
      <div
        ref={minimapRef}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "150px",
          height: "150px",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      />
    </>
  );
};

export default PanoramicViewer;
