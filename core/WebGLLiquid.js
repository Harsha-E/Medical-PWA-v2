const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_colorDeep;
uniform vec3 u_colorMid;
uniform vec3 u_colorHighlight;
uniform float u_speed;
uniform float u_flowStrength;
uniform float u_grain;
uniform float u_contrast;
uniform float u_opacity;
uniform float u_reveal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.86, 0.51, -0.51, 0.86);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 applyContrast(vec3 c, float contrast) {
  return clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * (0.14 * u_speed);
  vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;

  // Flow at a 45-degree angle (both X and Y shift equally over time)
  vec2 flowP = vec2(p.x * 1.1 - t * 0.25, p.y - t * 0.25);
  float n1 = fbm(flowP * 2.8 + vec2(t * 0.15, t * 0.15));
  float n2 = fbm((flowP + n1 * 0.45) * 4.0 - vec2(t * 0.25, t * 0.25));
  float n3 = fbm((flowP + n2 * 0.4) * 6.5 + vec2(t * 0.1, t * 0.1));

  float structure = n3 * 1.15 + (n2 - 0.5) * 0.5;
  structure += (n1 - 0.5) * 0.3 * u_flowStrength;

  float lowBand = smoothstep(0.18, 0.6, structure);
  float highBand = smoothstep(0.62, 1.08, structure);
  vec3 col = mix(u_colorDeep, u_colorMid, lowBand);
  col = mix(col, u_colorHighlight, highBand);

  float glow = smoothstep(0.52, 0.95, structure) * (0.35 + 0.5 * u_flowStrength);
  col += glow * u_colorHighlight * 0.35;

  float verticalMask = smoothstep(1.05, 0.05, uv.y);
  verticalMask = pow(verticalMask, 1.1);

  float vignette = smoothstep(1.28, 0.36, length(uv - 0.5));
  col *= mix(0.9, 1.05, vignette);

  col = applyContrast(col, u_contrast);

  float dither = (hash(gl_FragCoord.xy + t * 10.0) - 0.5) * u_grain;
  col += dither;

  float alpha = verticalMask * smoothstep(0.08, 0.95, structure);
  alpha *= smoothstep(0.0, 0.28, u_reveal - uv.x);
  alpha *= u_opacity;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

function hexToRgb01(hex) {
  const normalized = hex.trim().replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export default class WebGLLiquid {
  constructor(canvas, host) {
    this.canvas = canvas;
    this.host = host;
    
    // Adapted settings to incorporate Gold/Peach shades and a slower, calmer flow
    this.settings = {
      colorDeep: "#1a0a12", // Deep background
      colorMid: "#7f2f5d",  // Burgundy/pink transitions
      colorHighlight: "#ffd9b5", // Brilliant gold/peach highlight
      speed: 0.3, // Slower, calmer animated flow
      flowStrength: 1,
      grain: 0.03,
      contrast: 1.1,
      opacity: 0.95,
      reveal: true,
      delayMs: 0,
      revealDuration: 1.2
    };

    this.init();
  }

  init() {
    const gl = this.canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "position");
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColorDeep = gl.getUniformLocation(program, "u_colorDeep");
    const uColorMid = gl.getUniformLocation(program, "u_colorMid");
    const uColorHighlight = gl.getUniformLocation(program, "u_colorHighlight");
    const uSpeed = gl.getUniformLocation(program, "u_speed");
    const uFlowStrength = gl.getUniformLocation(program, "u_flowStrength");
    const uGrain = gl.getUniformLocation(program, "u_grain");
    const uContrast = gl.getUniformLocation(program, "u_contrast");
    const uOpacity = gl.getUniformLocation(program, "u_opacity");
    const uReveal = gl.getUniformLocation(program, "u_reveal");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = this.host.getBoundingClientRect();
      this.canvas.width = Math.max(1, Math.floor(width * dpr));
      this.canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.uniform2f(uRes, this.canvas.width, this.canvas.height);
    };

    resize();
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(this.host);

    this.start = performance.now();
    
    this.render = (now) => {
      const elapsedSec = Math.max(0, (now - this.start - this.settings.delayMs) / 1000);
      const revealProgress = this.settings.reveal
        ? Math.min(1, elapsedSec / Math.max(this.settings.revealDuration, 0.05))
        : 1;

      const isLight = false;
      const activeColorDeep = this.settings.colorDeep;
      const activeColorMid = this.settings.colorMid;
      const activeColorHighlight = this.settings.colorHighlight;

      const deep = hexToRgb01(activeColorDeep);
      const mid = hexToRgb01(activeColorMid);
      const highlight = hexToRgb01(activeColorHighlight);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(uTime, elapsedSec);
      gl.uniform3f(uColorDeep, deep[0], deep[1], deep[2]);
      gl.uniform3f(uColorMid, mid[0], mid[1], mid[2]);
      gl.uniform3f(uColorHighlight, highlight[0], highlight[1], highlight[2]);
      gl.uniform1f(uSpeed, this.settings.speed);
      gl.uniform1f(uFlowStrength, this.settings.flowStrength);
      gl.uniform1f(uGrain, this.settings.grain);
      gl.uniform1f(uContrast, this.settings.contrast);
      gl.uniform1f(uOpacity, this.settings.opacity);
      gl.uniform1f(uReveal, revealProgress);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      this.rafId = requestAnimationFrame(this.render);
    };

    this.rafId = requestAnimationFrame(this.render);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }
}
