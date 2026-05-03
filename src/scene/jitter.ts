type ShaderInjection = {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
};

export const jitterUniform = { value: 320 };

export function jitterOnBeforeCompile(shader: ShaderInjection) {
  shader.uniforms.uJitterGrid = jitterUniform;
  shader.vertexShader =
    "uniform float uJitterGrid;\n" +
    shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
  vec4 _jp = gl_Position;
  _jp.xy = floor((_jp.xy / _jp.w) * uJitterGrid) / uJitterGrid * _jp.w;
  gl_Position = _jp;`,
    );
}
