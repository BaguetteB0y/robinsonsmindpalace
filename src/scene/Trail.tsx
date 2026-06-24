import { Pass } from "postprocessing";
import {
  NearestFilter,
  ShaderMaterial,
  SRGBColorSpace,
  TextureDataType,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  SMOKE_FADE_MS,
  SMOKE_TOTAL_MS,
  useCigarette,
} from "../state/cigarette";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const blendShader = /* glsl */ `
  #include <common>
  uniform sampler2D tInput;
  uniform sampler2D tHistory;
  uniform float uPersistence;
  varying vec2 vUv;
  void main() {
    vec4 cur = texture2D(tInput, vUv);
    vec4 his = texture2D(tHistory, vUv);
    vec3 trailed = max(cur.rgb, his.rgb * uPersistence);
    gl_FragColor = vec4(trailed, cur.a);
    #include <colorspace_fragment>
  }
`;

const copyShader = /* glsl */ `
  #include <common>
  uniform sampler2D tInput;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(tInput, vUv);
    #include <colorspace_fragment>
  }
`;

export class TrailPass extends Pass {
  private blendMaterial: ShaderMaterial;
  private copyMaterial: ShaderMaterial;
  private bufferA: WebGLRenderTarget;
  private bufferB: WebGLRenderTarget;
  private readFromA = true;

  constructor() {
    super("TrailPass");
    this.needsSwap = true;

    this.blendMaterial = new ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        tHistory: { value: null },
        uPersistence: { value: 0 },
      },
      vertexShader,
      fragmentShader: blendShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.copyMaterial = new ShaderMaterial({
      uniforms: { tInput: { value: null } },
      vertexShader,
      fragmentShader: copyShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const opts = {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    } as const;
    this.bufferA = new WebGLRenderTarget(1, 1, opts);
    this.bufferB = new WebGLRenderTarget(1, 1, opts);

    this.fullscreenMaterial = this.blendMaterial;
  }

  setPersistence(v: number) {
    this.blendMaterial.uniforms.uPersistence.value = v;
  }

  setSize(width: number, height: number) {
    this.bufferA.setSize(width, height);
    this.bufferB.setSize(width, height);
  }

  initialize(renderer: WebGLRenderer, _alpha: boolean, frameBufferType: number) {
    if (frameBufferType !== undefined) {
      this.bufferA.texture.type = frameBufferType as TextureDataType;
      this.bufferB.texture.type = frameBufferType as TextureDataType;
      if (renderer.outputColorSpace === SRGBColorSpace) {
        this.bufferA.texture.colorSpace = SRGBColorSpace;
        this.bufferB.texture.colorSpace = SRGBColorSpace;
      }
    }
  }

  render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    outputBuffer: WebGLRenderTarget,
  ) {
    const persistence = this.blendMaterial.uniforms.uPersistence.value;

    if (persistence <= 0) {
      this.copyMaterial.uniforms.tInput.value = inputBuffer.texture;
      this.fullscreenMaterial = this.copyMaterial;
      renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
      renderer.render(this.scene, this.camera);
      return;
    }

    const read = this.readFromA ? this.bufferA : this.bufferB;
    const write = this.readFromA ? this.bufferB : this.bufferA;

    this.blendMaterial.uniforms.tInput.value = inputBuffer.texture;
    this.blendMaterial.uniforms.tHistory.value = read.texture;
    this.fullscreenMaterial = this.blendMaterial;
    renderer.setRenderTarget(write);
    renderer.render(this.scene, this.camera);

    this.copyMaterial.uniforms.tInput.value = write.texture;
    this.fullscreenMaterial = this.copyMaterial;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);

    this.readFromA = !this.readFromA;
  }

  dispose() {
    super.dispose();
    this.blendMaterial.dispose();
    this.copyMaterial.dispose();
    this.bufferA.dispose();
    this.bufferB.dispose();
  }
}

type Props = { persistence?: number };

export function Trail({ persistence = 0 }: Props) {
  const pass = useMemo(() => new TrailPass(), []);

  useEffect(() => {
    pass.setPersistence(persistence);
  }, [pass, persistence]);

  useFrame(() => {
    const smokingUntil = useCigarette.getState().smokingUntil;
    const elapsed = performance.now() - (smokingUntil - SMOKE_TOTAL_MS);
    if (elapsed <= 0 || elapsed >= SMOKE_TOTAL_MS) {
      pass.setPersistence(persistence);
      return;
    }
    let boost = 0.95;
    const fadeStart = SMOKE_TOTAL_MS - SMOKE_FADE_MS;
    if (elapsed > fadeStart) {
      const t = (elapsed - fadeStart) / SMOKE_FADE_MS;
      boost = 0.95 * (1 - t) + persistence * t;
    }
    pass.setPersistence(Math.max(persistence, boost));
  });

  return <primitive object={pass} dispose={null} />;
}
