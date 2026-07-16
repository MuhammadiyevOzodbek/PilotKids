"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";

type RobotKind = "hero" | "robo";

/** Dizayndagi 3D robot (Robo) — three.js bilan qurilgan interaktiv model. */
export function Robot3D({
  kind = "hero",
  className,
  style,
}: {
  kind?: RobotKind;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    let w = container.clientWidth || 400;
    let h = container.clientHeight || 400;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    cam.position.set(0, 0.1, 7.4);
    const rnd = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rnd.setSize(w, h);
    rnd.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(rnd.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 6, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4c82f7, 0.9);
    rim.position.set(-5, 1, -4);
    scene.add(rim);
    const fill = new THREE.PointLight(0x38d39a, 0.5, 30);
    fill.position.set(3, -3, 4);
    scene.add(fill);

    const white = new THREE.MeshStandardMaterial({
      color: 0xf1f5fc,
      roughness: 0.5,
      metalness: 0.06,
    });
    const blue = new THREE.MeshStandardMaterial({
      color: 0x2f6bf3,
      roughness: 0.42,
      metalness: 0.12,
    });
    const navy = new THREE.MeshStandardMaterial({
      color: 0x101a30,
      roughness: 0.35,
      metalness: 0.2,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: 0x8fe0ff,
      emissive: 0x39a6ff,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });

    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 48), white);
    head.scale.set(1.18, 1, 1.06);
    head.position.y = 0.85;
    g.add(head);
    const visor = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.95, 18, 32), navy);
    visor.rotation.z = Math.PI / 2;
    visor.position.set(0, 0.92, 0.82);
    visor.scale.set(0.62, 1, 0.42);
    g.add(visor);
    const eyeGeo = new THREE.SphereGeometry(0.13, 24, 24);
    const e1 = new THREE.Mesh(eyeGeo, glow);
    e1.position.set(-0.3, 0.95, 1.12);
    g.add(e1);
    const e2 = e1.clone();
    e2.position.x = 0.3;
    g.add(e2);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 16), blue);
    ant.position.set(0, 2.05, 0);
    g.add(ant);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), glow);
    bulb.position.set(0, 2.38, 0);
    g.add(bulb);
    const earGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const l = new THREE.Mesh(earGeo, blue);
    l.position.set(-1.32, 0.85, 0);
    g.add(l);
    const r = l.clone();
    r.position.x = 1.32;
    g.add(r);

    if (kind === "hero") {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.88, 0.75, 20, 32), blue);
      body.position.y = -0.9;
      body.scale.set(1, 1, 0.85);
      g.add(body);
      const chest = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), navy);
      chest.position.set(0, -0.75, 0.78);
      g.add(chest);
      const armGeo = new THREE.CapsuleGeometry(0.17, 0.5, 12, 20);
      const la = new THREE.Mesh(armGeo, white);
      la.position.set(-1.05, -0.85, 0.1);
      la.rotation.z = 0.4;
      g.add(la);
      const ra = new THREE.Mesh(armGeo, white);
      ra.position.set(1.05, -0.85, 0.1);
      ra.rotation.z = -0.4;
      g.add(ra);
    }

    scene.add(g);
    g.scale.setScalar(kind === "robo" ? 1.35 : 1.02);
    g.position.y = kind === "robo" ? -0.55 : 0.15;

    const resize = () => {
      w = container.clientWidth;
      h = container.clientHeight;
      if (!w || !h) return;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      rnd.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let mx = 0;
    let my = 0;
    const onMove = (ev: PointerEvent) => {
      const b = container.getBoundingClientRect();
      mx = (ev.clientX - b.left) / b.width - 0.5;
      my = (ev.clientY - b.top) / b.height - 0.5;
    };
    container.addEventListener("pointermove", onMove);

    let raf = 0;
    if (reduce) {
      g.rotation.y = -0.25;
      rnd.render(scene, cam);
    } else {
      const t0 = Date.now();
      const loop = () => {
        if (!container.isConnected) {
          rnd.dispose();
          return;
        }
        const t = (Date.now() - t0) / 1000;
        g.rotation.y += (mx * 0.6 - 0.15 - g.rotation.y) * 0.05 + 0.0016;
        g.rotation.x += (my * 0.35 - g.rotation.x) * 0.05;
        (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.6 + Math.abs(Math.sin(t * 2)) * 0.7;
        raf = requestAnimationFrame(loop);
        rnd.render(scene, cam);
      };
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener("pointermove", onMove);
      rnd.dispose();
      if (rnd.domElement.parentNode === container) container.removeChild(rnd.domElement);
    };
  }, [kind]);

  return <div ref={ref} className={className} style={style} />;
}
