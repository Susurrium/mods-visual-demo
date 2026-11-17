import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { domains, type DomainKey } from "../data/model";

type Props = {
  selected: DomainKey | null;
  onSelect: (key: DomainKey) => void;
  scores: (number | null)[];
  sex: string;
  reset: number;
  panelOpen: boolean;
};

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="model-loading">
        正在加载人体模型 <strong>{Math.round(progress)}%</strong>
      </div>
    </Html>
  );
}

class ModelBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="model-error">
        三维模型加载失败。
        <button
          onClick={() => {
            this.setState({ error: false });
            this.props.onRetry();
          }}
        >
          重试
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function Human({ sex, selected, scores, onSelect }: Omit<Props, "reset" | "panelOpen">) {
  const url = `${import.meta.env.BASE_URL}models/anatomy-${sex === "女" ? "female" : "male"}.glb`;
  const { scene } = useGLTF(url, false, true);
  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      if (
        obj.parent === root &&
        ["muscles", "skeleton", "nerves"].includes(obj.name)
      )
        obj.visible = false;
      if (!(obj instanceof THREE.Mesh)) return;
      let parent: THREE.Object3D | null = obj;
      let domain: DomainKey | undefined;
      let system = "";
      while (parent && parent !== root) {
        domain ||= domains.find((d) =>
          d.structures.includes(parent!.name),
        )?.key;
        if (["skin", "organs", "vessels"].includes(parent.name))
          system = parent.name;
        parent = parent.parent;
      }
      obj.userData.domain = domain;
      obj.userData.system = system;
      if (system === "skin") {
        obj.material = new THREE.MeshPhysicalMaterial({
          color: "#c9dffc",
          transparent: true,
          opacity: 0.18,
          roughness: 0.28,
          metalness: 0.08,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        obj.renderOrder = 5;
        obj.raycast = () => {};
      } else if (system === "vessels") {
        obj.material = new THREE.MeshStandardMaterial({
          color: "#99aad3",
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          roughness: 0.5,
        });
      } else if (system === "organs") {
        obj.material = new THREE.MeshStandardMaterial({
          color: "#c4b7db",
          transparent: true,
          opacity: domain ? 0.94 : 0.24,
          roughness: 0.37,
          metalness: 0.08,
          depthWrite: !!domain,
        });
      }
    });
    return root;
  }, [scene]);
  useEffect(() => {
    cloned.traverse((obj) => {
      if (
        !(obj instanceof THREE.Mesh) ||
        !(obj.material instanceof THREE.MeshStandardMaterial) ||
        obj.userData.system !== "organs"
      )
        return;
      const index = domains.findIndex((d) => d.key === obj.userData.domain);
      const score = scores[index];
      const color =
        selected === obj.userData.domain
          ? "#ed8cae"
          : index >= 0 && score !== null && score >= 2
            ? "#e79aae"
            : "#aca9d6";
      obj.material.color.set(color);
      obj.material.emissive.set(
        selected === obj.userData.domain ? "#ac406d" : "#1c1938",
      );
      obj.material.emissiveIntensity =
        selected === obj.userData.domain ? 0.45 : 0.1;
    });
  }, [cloned, selected, scores]);
  useEffect(
    () => () => {
      cloned.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !Array.isArray(obj.material))
          obj.material.dispose();
      });
    },
    [cloned],
  );
  return (
    <primitive
      object={cloned}
      onClick={(event: {
        stopPropagation: () => void;
        object: THREE.Object3D;
      }) => {
        if (event.object.userData.domain) {
          event.stopPropagation();
          onSelect(event.object.userData.domain);
        }
      }}
    />
  );
}

function CameraRig({ selected, reset, panelOpen }: Pick<Props, "selected" | "reset" | "panelOpen">) {
  const controls = useRef<OrbitControlsType>(null);
  const transitioning = useRef(true);
  const desired = useMemo(
    () => domains.find((d) => d.key === selected)?.position ?? [0, 0.96, 0],
    [selected, reset],
  );
  const target = useMemo(() => new THREE.Vector3(...desired), [desired]);
  const position = useMemo(
    () =>
      selected
        ? new THREE.Vector3(desired[0] + 0.06, desired[1] + 0.05, 2.15)
        : new THREE.Vector3(0, 1.05, 3.2),
    [desired, selected, reset],
  );
  useEffect(() => {
    transitioning.current = true;
  }, [selected, reset, panelOpen]);
  useFrame(({ camera }, delta) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.clearViewOffset();
    }
    if (!controls.current || !transitioning.current) return;
    if (
      camera.position.distanceTo(position) > 0.03 ||
      controls.current.target.distanceTo(target) > 0.01
    ) {
      camera.position.lerp(position, 1 - Math.exp(-delta * 3.5));
      controls.current.target.lerp(target, 1 - Math.exp(-delta * 3.5));
      controls.current.update();
    } else transitioning.current = false;
  });
  return (
    <OrbitControls
      ref={controls}
      onStart={() => {
        transitioning.current = false;
      }}
      enablePan={false}
      minDistance={0.7}
      maxDistance={4.8}
      target={[0, 0.96, 0]}
    />
  );
}

export default function BodyScene(props: Props) {
  const [retry, setRetry] = useState(0);
  return (
    <ModelBoundary key={retry} onRetry={() => setRetry((v) => v + 1)}>
      <Canvas
        camera={{ position: [0, 1.05, 3.2], fov: 37 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={2.1} />
        <directionalLight
          position={[2, 3, 3]}
          intensity={2.2}
          color="#eff8ff"
        />
        <directionalLight
          position={[-3, 1, -2]}
          intensity={2}
          color="#bc9fff"
        />
        <Suspense fallback={<Loader />}>
          <Human {...props} />
          {domains.map((domain, index) => (
            <Html
              key={domain.key}
              position={[domain.position[0], domain.position[1], 0.17]}
              center
              style={{ pointerEvents: "none" }}
            >
              <button
                className={`body-pin ${props.selected === domain.key ? "selected" : ""} ${props.scores[index] !== null && props.scores[index]! >= 2 ? "abnormal" : ""}`}
                style={{ pointerEvents: "auto" }}
                onClick={() => props.onSelect(domain.key)}
                aria-label={`查看${domain.label}`}
              >
                <span />
              </button>
            </Html>
          ))}
        </Suspense>
        <CameraRig selected={props.selected} reset={props.reset} panelOpen={props.panelOpen} />
      </Canvas>
    </ModelBoundary>
  );
}
