import { Effect, EffectAttribute } from "postprocessing";
import { Uniform, WebGLRenderer, WebGLRenderTarget } from "three";
import { forwardRef, useEffect, useMemo } from "react";

const fragmentShader = /* glsl */ `
  uniform float rowY;
  uniform float rowHeight;
  uniform float shift;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float dist = abs((1.0 - uv.y) - rowY);
    if (dist < rowHeight) {
      vec2 shifted = vec2(fract(uv.x - shift), uv.y);
      outputColor = texture2D(inputBuffer, shifted);
    } else {
      outputColor = inputColor;
    }
  }
`;

export class RollEffect extends Effect {
  private active = false;
  private timer: number;
  minDelay = 4;
  maxDelay = 10;

  constructor() {
    super("RollEffect", fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["rowY", new Uniform(-10)],
        ["rowHeight", new Uniform(0.004)],
        ["shift", new Uniform(0.005)],
        ["speed", new Uniform(0.5)],
      ]),
    });
    this.timer = this.randomDelay();
  }

  private randomDelay() {
    const span = Math.max(0, this.maxDelay - this.minDelay);
    return this.minDelay + Math.random() * span;
  }

  update(
    _renderer: WebGLRenderer,
    _inputBuffer: WebGLRenderTarget,
    deltaTime: number,
  ) {
    const u = this.uniforms.get("rowY") as Uniform<number>;
    const speed = (this.uniforms.get("speed") as Uniform<number>).value;
    if (this.active) {
      u.value += deltaTime * speed;
      if (u.value > 1.0) {
        this.active = false;
        u.value = -10;
        this.timer = this.randomDelay();
      }
    } else {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.active = true;
        u.value = 0;
      }
    }
  }
}

type RollProps = {
  speed?: number;
  rowHeight?: number;
  shift?: number;
  minDelay?: number;
  maxDelay?: number;
};

export const Roll = forwardRef<RollEffect, RollProps>(function Roll(
  {
    speed = 0.5,
    rowHeight = 0.004,
    shift = 0.005,
    minDelay = 4,
    maxDelay = 10,
  },
  ref,
) {
  const effect = useMemo(() => new RollEffect(), []);
  useEffect(() => {
    (effect.uniforms.get("speed") as Uniform<number>).value = speed;
    (effect.uniforms.get("rowHeight") as Uniform<number>).value = rowHeight;
    (effect.uniforms.get("shift") as Uniform<number>).value = shift;
    effect.minDelay = minDelay;
    effect.maxDelay = maxDelay;
  }, [effect, speed, rowHeight, shift, minDelay, maxDelay]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
