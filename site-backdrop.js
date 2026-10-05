(() => {
  'use strict';
  // DOM adapter for Niku's unchanged WebGL2 shaders in assets/vendor/niku-home.js.
  const surfaces = new WeakMap();

  function createSurface(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false,
      preserveDrawingBuffer: true, stencil: false
    });
    if (!gl) return null;
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
        throw new Error(`Niku backdrop shader failed: ${message}`);
      }
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, window.NikuHome.vertexShader);
    const fragment = compile(gl.FRAGMENT_SHADER, window.NikuHome.fragmentShader);
    const program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Niku backdrop program failed: ${gl.getProgramInfoLog(program)}`);
    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['resolution', 'bufferResolution', 'camera', 'center', 'gridSize', 'whiteRadius', 'fadeRadius', 'maxDotScale', 'ditherStrength'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
    canvas.dataset.backdropRenderer = 'niku-webgl2';
    return { gl, program, uniforms, last: null };
  }

  function draw(canvas, options) {
    const { width, height, center, camera = { x: 0, y: 0 } } = options;
    if (!canvas || !width || !height) return;
    let state = surfaces.get(canvas);
    if (!state) {
      const surface = createSurface(canvas);
      if (!surface) return;
      state = { surface, options };
      surfaces.set(canvas, state);
      canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); state.surface.last = null; });
      canvas.addEventListener('webglcontextrestored', () => {
        state.surface = createSurface(canvas);
        if (state.surface) draw(canvas, state.options);
      });
    }
    state.options = options;
    const surface = state.surface;
    if (!surface || surface.gl.isContextLost()) return;
    const density = devicePixelRatio || 1;
    const signature = [width, height, center.x, center.y, Math.round(camera.x), Math.round(camera.y), density];
    if (surface.last && signature.every((value, i) => value === surface.last[i])) return;
    const pixelWidth = Math.max(1, Math.round(width * density)), pixelHeight = Math.max(1, Math.round(height * density));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    const { gl, program, uniforms } = surface;
    gl.viewport(0, 0, pixelWidth, pixelHeight); gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.bufferResolution, pixelWidth, pixelHeight);
    gl.uniform2f(uniforms.camera, Math.round(camera.x), Math.round(camera.y));
    gl.uniform2f(uniforms.center, center.x - width / 2, center.y - height / 2);
    gl.uniform1f(uniforms.gridSize, 12); gl.uniform1f(uniforms.whiteRadius, 120);
    gl.uniform1f(uniforms.fadeRadius, 700); gl.uniform1f(uniforms.maxDotScale, 1.3);
    gl.uniform1f(uniforms.ditherStrength, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    surface.last = signature;
  }
  window.AleksiBackdrop = { draw };
  const sectionCanvas = document.querySelector('[data-site-backdrop]');
  if (sectionCanvas) {
    const paint = () => draw(sectionCanvas, { width: innerWidth, height: innerHeight, center: { x: innerWidth / 2, y: innerHeight / 2 } });
    window.addEventListener('resize', paint);
    window.addEventListener('pageshow', paint);
    paint();
  }
})();
