'use client';
import { useEffect, useRef, useState } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/graph3d';
export function WebGLGraph({
  nodes,
  edges,
  onNode,
  onEdge,
  focus,
  reset,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNode: (n: GraphNode) => void;
  onEdge: (e: GraphEdge) => void;
  focus: string | null;
  reset: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onNode, onEdge });
  useEffect(() => {
    callbacks.current = { onNode, onEdge };
  }, [onNode, onEdge]);
  useEffect(() => {
    let stopped = false;
    let dispose = () => {};
    void Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
    ])
      .then(([T, { OrbitControls }]) => {
        if (stopped || !host.current) return;
        const element = host.current;
        setReady(false);
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        element.appendChild(renderer.domElement);
        renderer.domElement.setAttribute(
          'aria-label',
          'Interactive 3D graph. Drag to orbit, right-drag to pan, scroll to zoom. Use the node list for keyboard access.',
        );
        const scene = new T.Scene();
        scene.background = new T.Color('#101d2b');
        const camera = new T.PerspectiveCamera(50, 1, 0.1, 10000);
        camera.position.set(450, 350, 750);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 20;
        controls.maxDistance = 3000;
        scene.add(new T.AmbientLight(0xffffff, 2));
        const light = new T.DirectionalLight(0xffffff, 3);
        light.position.set(100, 200, 300);
        scene.add(light);
        const resources: { dispose: () => void }[] = [];
        const targets: import('three').Object3D[] = [];
        const map = new Map(nodes.map((n) => [n.id, n]));
        for (const node of nodes) {
          const geometry =
            node.kind === 'technique'
              ? new T.BoxGeometry(12, 12, 12)
              : node.kind === 'survey'
                ? new T.ConeGeometry(9, 18, 4)
                : node.kind === 'systematic-review'
                  ? new T.OctahedronGeometry(10)
                  : node.kind === 'taxonomy'
                    ? new T.TorusGeometry(8, 3, 8, 20)
                    : new T.SphereGeometry(6, 12, 8);
          const material = new T.MeshStandardMaterial({
            color:
              node.kind === 'technique'
                ? '#48bdb0'
                : node.kind === 'paper'
                  ? '#9ab8e4'
                  : '#f0b868',
          });
          resources.push(geometry, material);
          const mesh = new T.Mesh(geometry, material);
          mesh.position.set(node.x, node.y, node.z);
          mesh.userData = { node };
          targets.push(mesh);
          scene.add(mesh);
          if (nodes.length <= 100 || node.id === focus) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#eaf2ff';
            ctx.font = '24px sans-serif';
            ctx.fillText(node.label.slice(0, 38), 4, 36);
            const texture = new T.CanvasTexture(canvas);
            const sm = new T.SpriteMaterial({
              map: texture,
              transparent: true,
              depthTest: false,
            });
            const sprite = new T.Sprite(sm);
            sprite.position.set(node.x + 42, node.y + 13, node.z);
            sprite.scale.set(90, 12, 1);
            scene.add(sprite);
            resources.push(texture, sm);
          }
        }
        for (const edge of edges) {
          const a = map.get(edge.source),
            b = map.get(edge.target);
          if (!a || !b) continue;
          const start = new T.Vector3(a.x, a.y, a.z),
            end = new T.Vector3(b.x, b.y, b.z);
          const geometry = new T.BufferGeometry().setFromPoints([start, end]);
          const color =
            edge.kind === 'similarity'
              ? '#be9ddb'
              : edge.kind === 'citation'
                ? '#627e9c'
                : edge.kind === 'association'
                  ? '#4bad9f'
                  : '#ebb167';
          const material =
            edge.kind === 'similarity'
              ? new T.LineDashedMaterial({ color, dashSize: 5, gapSize: 4 })
              : new T.LineBasicMaterial({
                  color,
                  transparent: true,
                  opacity: edge.kind === 'citation' ? 0.5 : 0.9,
                });
          resources.push(geometry, material);
          const line = new T.Line(geometry, material);
          line.computeLineDistances();
          line.userData = { edge };
          targets.push(line);
          scene.add(line);
          if (edge.directed) {
            const direction = end.clone().sub(start);
            const arrow = new T.ArrowHelper(
              direction.clone().normalize(),
              start,
              direction.length() - 10,
              color,
              7,
              4,
            );
            scene.add(arrow);
            resources.push(
              arrow.line.geometry,
              arrow.line.material as import('three').Material,
              arrow.cone.geometry,
              arrow.cone.material as import('three').Material,
            );
          }
        }
        const selected = map.get(focus || '');
        if (selected) {
          controls.target.set(selected.x, selected.y, selected.z);
          camera.position.set(
            selected.x + 100,
            selected.y + 80,
            selected.z + 150,
          );
        }
        const ray = new T.Raycaster();
        ray.params.Line = { threshold: 2 };
        const pointer = new T.Vector2();
        const pick = (event: PointerEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            (-(event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(pointer, camera);
          return ray.intersectObjects(targets, false)[0]?.object.userData;
        };
        let down = [0, 0];
        const downHandler = (e: PointerEvent) => {
          down = [e.clientX, e.clientY];
        };
        const move = (e: PointerEvent) => {
          const hit = pick(e);
          setHover(hit?.node?.label || hit?.edge?.type || '');
        };
        const click = (e: PointerEvent) => {
          if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
          const hit = pick(e);
          if (hit?.node) callbacks.current.onNode(hit.node);
          if (hit?.edge) callbacks.current.onEdge(hit.edge);
        };
        renderer.domElement.addEventListener('pointerdown', downHandler);
        renderer.domElement.addEventListener('pointermove', move);
        renderer.domElement.addEventListener('pointerup', click);
        const resize = () => {
          const w = element.clientWidth,
            h = element.clientHeight;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        resize();
        setReady(true);
        renderer.setAnimationLoop(() => {
          controls.update();
          renderer.render(scene, camera);
        });
        dispose = () => {
          observer.disconnect();
          controls.dispose();
          renderer.setAnimationLoop(null);
          renderer.domElement.removeEventListener('pointerdown', downHandler);
          renderer.domElement.removeEventListener('pointermove', move);
          renderer.domElement.removeEventListener('pointerup', click);
          for (const r of new Set(resources)) r.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch((e) =>
        setError(
          `WebGL unavailable: ${String(e)}. Use the accessible node and edge lists below.`,
        ),
      );
    return () => {
      stopped = true;
      dispose();
    };
  }, [nodes, edges, focus, reset]);
  return (
    <>
      {!ready && !error && (
        <output aria-live="polite">
          Building 3D graph… The node and relationship lists remain available
          below.
        </output>
      )}
      <div
        ref={host}
        style={{
          height: 'clamp(320px, 65vh, 560px)',
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      />
      <p aria-live="polite">
        {error ||
          hover ||
          'Drag to orbit · right-drag to pan · scroll to zoom · click a node or edge to inspect'}
      </p>
    </>
  );
}
