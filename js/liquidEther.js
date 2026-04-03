(function () {
  if (!window.THREE) {
    throw new Error("LiquidEther richiede Three.js. Carica prima three.min.js");
  }

  const THREE = window.THREE;

  function makePaletteTexture(stops) {
    let arr;
    if (Array.isArray(stops) && stops.length > 0) {
      arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
    } else {
      arr = ["#ffffff", "#ffffff"];
    }

    const w = arr.length;
    const data = new Uint8Array(w * 4);

    for (let i = 0; i < w; i++) {
      const c = new THREE.Color(arr[i]);
      data[i * 4 + 0] = Math.round(c.r * 255);
      data[i * 4 + 1] = Math.round(c.g * 255);
      data[i * 4 + 2] = Math.round(c.b * 255);
      data[i * 4 + 3] = 255;
    }

    const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  const face_vert = `
    attribute vec3 position;
    uniform vec2 px;
    uniform vec2 boundarySpace;
    varying vec2 uv;
    precision highp float;
    void main() {
      vec3 pos = position;
      vec2 scale = 1.0 - boundarySpace * 2.0;
      pos.xy = pos.xy * scale;
      uv = vec2(0.5) + (pos.xy) * 0.5;
      gl_Position = vec4(pos, 1.0);
    }
  `;

  const line_vert = `
    attribute vec3 position;
    uniform vec2 px;
    precision highp float;
    varying vec2 uv;
    void main() {
      vec3 pos = position;
      uv = 0.5 + pos.xy * 0.5;
      vec2 n = sign(pos.xy);
      pos.xy = abs(pos.xy) - px * 1.0;
      pos.xy *= n;
      gl_Position = vec4(pos, 1.0);
    }
  `;

  const mouse_vert = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform vec2 center;
    uniform vec2 scale;
    uniform vec2 px;
    varying vec2 vUv;
    void main() {
      vec2 pos = position.xy * scale * 2.0 * px + center;
      vUv = uv;
      gl_Position = vec4(pos, 0.0, 1.0);
    }
  `;

  const advection_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform float dt;
    uniform bool isBFECC;
    uniform vec2 fboSize;
    uniform vec2 px;
    varying vec2 uv;
    void main() {
      vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
      if (isBFECC == false) {
        vec2 vel = texture2D(velocity, uv).xy;
        vec2 uv2 = uv - vel * dt * ratio;
        vec2 newVel = texture2D(velocity, uv2).xy;
        gl_FragColor = vec4(newVel, 0.0, 0.0);
      } else {
        vec2 spot_new = uv;
        vec2 vel_old = texture2D(velocity, uv).xy;
        vec2 spot_old = spot_new - vel_old * dt * ratio;
        vec2 vel_new1 = texture2D(velocity, spot_old).xy;
        vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
        vec2 error = spot_new2 - spot_new;
        vec2 spot_new3 = spot_new - error / 2.0;
        vec2 vel_2 = texture2D(velocity, spot_new3).xy;
        vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
        vec2 newVel2 = texture2D(velocity, spot_old2).xy;
        gl_FragColor = vec4(newVel2, 0.0, 0.0);
      }
    }
  `;

  const color_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D palette;
    uniform vec4 bgColor;
    varying vec2 uv;
    void main() {
      vec2 vel = texture2D(velocity, uv).xy;
      float lenv = clamp(length(vel), 0.0, 1.0);
      vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
      vec3 outRGB = mix(bgColor.rgb, c, lenv);
      float outA = mix(bgColor.a, 1.0, lenv);
      gl_FragColor = vec4(outRGB, outA);
    }
  `;

  const divergence_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform float dt;
    uniform vec2 px;
    varying vec2 uv;
    void main() {
      float x0 = texture2D(velocity, uv - vec2(px.x, 0.0)).x;
      float x1 = texture2D(velocity, uv + vec2(px.x, 0.0)).x;
      float y0 = texture2D(velocity, uv - vec2(0.0, px.y)).y;
      float y1 = texture2D(velocity, uv + vec2(0.0, px.y)).y;
      float divergence = (x1 - x0 + y1 - y0) / 2.0;
      gl_FragColor = vec4(divergence / dt);
    }
  `;

  const externalForce_frag = `
    precision highp float;
    uniform vec2 force;
    uniform vec2 center;
    uniform vec2 scale;
    uniform vec2 px;
    varying vec2 vUv;
    void main() {
      vec2 circle = (vUv - 0.5) * 2.0;
      float d = 1.0 - min(length(circle), 1.0);
      d *= d;
      gl_FragColor = vec4(force * d, 0.0, 1.0);
    }
  `;

  const poisson_frag = `
    precision highp float;
    uniform sampler2D pressure;
    uniform sampler2D divergence;
    uniform vec2 px;
    varying vec2 uv;
    void main() {
      float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
      float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
      float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
      float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
      float div = texture2D(divergence, uv).r;
      float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
      gl_FragColor = vec4(newP);
    }
  `;

  const pressure_frag = `
    precision highp float;
    uniform sampler2D pressure;
    uniform sampler2D velocity;
    uniform vec2 px;
    uniform float dt;
    varying vec2 uv;
    void main() {
      float step = 1.0;
      float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
      float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
      float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
      float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
      vec2 v = texture2D(velocity, uv).xy;
      vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
      v = v - gradP * dt;
      gl_FragColor = vec4(v, 0.0, 1.0);
    }
  `;

  const viscous_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D velocity_new;
    uniform float v;
    uniform vec2 px;
    uniform float dt;
    varying vec2 uv;
    void main() {
      vec2 old = texture2D(velocity, uv).xy;
      vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
      vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
      vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
      vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
      vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
      newv /= 4.0 * (1.0 + v * dt);
      gl_FragColor = vec4(newv, 0.0, 0.0);
    }
  `;

  class LiquidEther {
    constructor(container, options = {}) {
      if (!container) {
        throw new Error("LiquidEther: container non trovato");
      }

      this.container = container;

      this.options = {
        mouseForce: 20,
        cursorSize: 100,
        isViscous: false,
        viscous: 30,
        iterationsViscous: 32,
        iterationsPoisson: 32,
        dt: 0.014,
        BFECC: true,
        resolution: 0.5,
        isBounce: false,
        colors: ["#5227FF", "#FF9FFC", "#B19EEF"],
        autoDemo: true,
        autoSpeed: 0.5,
        autoIntensity: 2.2,
        takeoverDuration: 0.25,
        autoResumeDelay: 1000,
        autoRampDuration: 0.6,
        ...options
      };

      this.paletteTex = makePaletteTexture(this.options.colors);
      this.bgVec4 = new THREE.Vector4(0, 0, 0, 0);

      this.raf = null;
      this.resizeRaf = null;
      this.isVisible = true;
      this.running = false;
      this.lastUserInteraction = performance.now();

      this._initContainer();
      this._initCommon();
      this._initMouse();
      this._initAutoDriver();
      this._initOutput();
      this._initObservers();
      this.start();
    }

    _initContainer() {
      const style = getComputedStyle(this.container);
      if (style.position === "static") this.container.style.position = "relative";
      if (!this.container.style.overflow) this.container.style.overflow = "hidden";
    }

    _initCommon() {
      this.common = {
        width: 0,
        height: 0,
        aspect: 1,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        time: 0,
        delta: 0,
        container: this.container,
        renderer: null,
        clock: null
      };

      this.common.resize = () => {
        const rect = this.container.getBoundingClientRect();
        this.common.width = Math.max(1, Math.floor(rect.width));
        this.common.height = Math.max(1, Math.floor(rect.height));
        this.common.aspect = this.common.width / this.common.height;
        if (this.common.renderer) {
          this.common.renderer.setSize(this.common.width, this.common.height, false);
        }
      };

      this.common.update = () => {
        this.common.delta = this.common.clock.getDelta();
        this.common.time += this.common.delta;
      };

      this.common.resize();

      this.common.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });

      this.common.renderer.autoClear = false;
      this.common.renderer.setClearColor(new THREE.Color(0x000000), 0);
      this.common.renderer.setPixelRatio(this.common.pixelRatio);
      this.common.renderer.setSize(this.common.width, this.common.height);
      this.common.renderer.domElement.style.width = "100%";
      this.common.renderer.domElement.style.height = "100%";
      this.common.renderer.domElement.style.display = "block";

      this.common.clock = new THREE.Clock();
      this.common.clock.start();

      this.container.prepend(this.common.renderer.domElement);
    }

    _initMouse() {
      const self = this;

      this.mouse = {
        mouseMoved: false,
        coords: new THREE.Vector2(),
        coords_old: new THREE.Vector2(),
        diff: new THREE.Vector2(),
        timer: null,
        isHoverInside: false,
        hasUserControl: false,
        isAutoActive: false,
        autoIntensity: this.options.autoIntensity,
        takeoverActive: false,
        takeoverStartTime: 0,
        takeoverDuration: this.options.takeoverDuration,
        takeoverFrom: new THREE.Vector2(),
        takeoverTo: new THREE.Vector2()
      };

      this.mouse.isPointInside = function (clientX, clientY) {
        const rect = self.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        );
      };

      this.mouse.updateHoverState = function (clientX, clientY) {
        this.isHoverInside = this.isPointInside(clientX, clientY);
        return this.isHoverInside;
      }.bind(this.mouse);

      this.mouse.setCoords = function (x, y) {
        if (this.timer) window.clearTimeout(this.timer);

        const rect = self.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const nx = (x - rect.left) / rect.width;
        const ny = (y - rect.top) / rect.height;

        this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
        this.mouseMoved = true;

        this.timer = window.setTimeout(() => {
          this.mouseMoved = false;
        }, 100);
      };

      this.mouse.setNormalized = function (nx, ny) {
        this.coords.set(nx, ny);
        this.mouseMoved = true;
      };

      this.mouse.update = function () {
        if (this.takeoverActive) {
          const t =
            (performance.now() - this.takeoverStartTime) /
            (this.takeoverDuration * 1000);

          if (t >= 1) {
            this.takeoverActive = false;
            this.coords.copy(this.takeoverTo);
            this.coords_old.copy(this.coords);
            this.diff.set(0, 0);
          } else {
            const k = t * t * (3 - 2 * t);
            this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k);
          }
        }

        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);

        if (this.coords_old.x === 0 && this.coords_old.y === 0) {
          this.diff.set(0, 0);
        }

        if (this.isAutoActive && !this.takeoverActive) {
          this.diff.multiplyScalar(this.autoIntensity);
        }
      };

      this._onMouseMove = (event) => {
        if (!this.mouse.updateHoverState(event.clientX, event.clientY)) return;

        this.lastUserInteraction = performance.now();
        if (this.autoDriver) this.autoDriver.forceStop();

        if (this.mouse.isAutoActive && !this.mouse.hasUserControl && !this.mouse.takeoverActive) {
          const rect = this.container.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          const nx = (event.clientX - rect.left) / rect.width;
          const ny = (event.clientY - rect.top) / rect.height;

          this.mouse.takeoverFrom.copy(this.mouse.coords);
          this.mouse.takeoverTo.set(nx * 2 - 1, -(ny * 2 - 1));
          this.mouse.takeoverStartTime = performance.now();
          this.mouse.takeoverActive = true;
          this.mouse.hasUserControl = true;
          this.mouse.isAutoActive = false;
          return;
        }

        this.mouse.setCoords(event.clientX, event.clientY);
        this.mouse.hasUserControl = true;
      };

      this._onTouchStart = (event) => {
        if (event.touches.length !== 1) return;
        const t = event.touches[0];
        if (!this.mouse.updateHoverState(t.clientX, t.clientY)) return;

        this.lastUserInteraction = performance.now();
        if (this.autoDriver) this.autoDriver.forceStop();

        this.mouse.setCoords(t.clientX, t.clientY);
        this.mouse.hasUserControl = true;
      };

      this._onTouchMove = (event) => {
        if (event.touches.length !== 1) return;
        const t = event.touches[0];
        if (!this.mouse.updateHoverState(t.clientX, t.clientY)) return;

        this.lastUserInteraction = performance.now();
        if (this.autoDriver) this.autoDriver.forceStop();

        this.mouse.setCoords(t.clientX, t.clientY);
      };

      this._onTouchEnd = () => {
        this.mouse.isHoverInside = false;
      };

      this._onDocumentLeave = () => {
        this.mouse.isHoverInside = false;
      };

      window.addEventListener("mousemove", this._onMouseMove);
      window.addEventListener("touchstart", this._onTouchStart, { passive: true });
      window.addEventListener("touchmove", this._onTouchMove, { passive: true });
      window.addEventListener("touchend", this._onTouchEnd);
      document.addEventListener("mouseleave", this._onDocumentLeave);
    }

    _initAutoDriver() {
      const self = this;

      this.autoDriver = {
        enabled: this.options.autoDemo,
        speed: this.options.autoSpeed,
        resumeDelay: this.options.autoResumeDelay,
        rampDurationMs: this.options.autoRampDuration * 1000,
        active: false,
        current: new THREE.Vector2(0, 0),
        target: new THREE.Vector2(),
        lastTime: performance.now(),
        activationTime: 0,
        margin: 0.2,
        _tmpDir: new THREE.Vector2(),

        pickNewTarget() {
          const r = Math.random;
          this.target.set(
            (r() * 2 - 1) * (1 - this.margin),
            (r() * 2 - 1) * (1 - this.margin)
          );
        },

        forceStop() {
          this.active = false;
          self.mouse.isAutoActive = false;
        },

        update() {
          if (!this.enabled) return;

          const now = performance.now();
          const idle = now - self.lastUserInteraction;

          if (idle < this.resumeDelay) {
            if (this.active) this.forceStop();
            return;
          }

          if (self.mouse.isHoverInside) {
            if (this.active) this.forceStop();
            return;
          }

          if (!this.active) {
            this.active = true;
            this.current.copy(self.mouse.coords);
            this.lastTime = now;
            this.activationTime = now;
          }

          self.mouse.isAutoActive = true;

          let dtSec = (now - this.lastTime) / 1000;
          this.lastTime = now;

          if (dtSec > 0.2) dtSec = 0.016;

          const dir = this._tmpDir.subVectors(this.target, this.current);
          const dist = dir.length();

          if (dist < 0.01) {
            this.pickNewTarget();
            return;
          }

          dir.normalize();

          let ramp = 1;
          if (this.rampDurationMs > 0) {
            const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs);
            ramp = t * t * (3 - 2 * t);
          }

          const step = this.speed * dtSec * ramp;
          const move = Math.min(step, dist);

          this.current.addScaledVector(dir, move);
          self.mouse.setNormalized(this.current.x, this.current.y);
        }
      };

      this.autoDriver.pickNewTarget();
    }

    _createShaderPass(props) {
      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      const material = new THREE.RawShaderMaterial(props.material);
      const geometry = new THREE.PlaneGeometry(2.0, 2.0);
      const plane = new THREE.Mesh(geometry, material);
      scene.add(plane);

      return {
        props,
        scene,
        camera,
        material,
        geometry,
        plane,
        uniforms: props.material.uniforms,
        update: (outputOverride) => {
          this.common.renderer.setRenderTarget(outputOverride || props.output || null);
          this.common.renderer.render(scene, camera);
          this.common.renderer.setRenderTarget(null);
        },
        dispose: () => {
          geometry.dispose();
          material.dispose();
        }
      };
    }

    _initOutput() {
      const getFloatType = () => {
        const isIOS = /(iPad|iPhone|iPod)/i.test(navigator.userAgent);
        return isIOS ? THREE.HalfFloatType : THREE.FloatType;
      };

      this.simulation = {
        options: {
          iterations_poisson: this.options.iterationsPoisson,
          iterations_viscous: this.options.iterationsViscous,
          mouse_force: this.options.mouseForce,
          resolution: this.options.resolution,
          cursor_size: this.options.cursorSize,
          viscous: this.options.viscous,
          isBounce: this.options.isBounce,
          dt: this.options.dt,
          isViscous: this.options.isViscous,
          BFECC: this.options.BFECC
        },
        fbos: {},
        fboSize: new THREE.Vector2(),
        cellScale: new THREE.Vector2(),
        boundarySpace: new THREE.Vector2()
      };

      const calcSize = () => {
        const width = Math.max(1, Math.round(this.simulation.options.resolution * this.common.width));
        const height = Math.max(1, Math.round(this.simulation.options.resolution * this.common.height));
        this.simulation.cellScale.set(1 / width, 1 / height);
        this.simulation.fboSize.set(width, height);
      };

      calcSize();

      const opts = {
        type: getFloatType(),
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
      };

      const createFBO = () =>
        new THREE.WebGLRenderTarget(
          this.simulation.fboSize.x,
          this.simulation.fboSize.y,
          opts
        );

      this.simulation.fbos.vel_0 = createFBO();
      this.simulation.fbos.vel_1 = createFBO();
      this.simulation.fbos.vel_viscous0 = createFBO();
      this.simulation.fbos.vel_viscous1 = createFBO();
      this.simulation.fbos.div = createFBO();
      this.simulation.fbos.pressure_0 = createFBO();
      this.simulation.fbos.pressure_1 = createFBO();

      this.simulation.resize = () => {
        calcSize();
        Object.values(this.simulation.fbos).forEach((fbo) => {
          fbo.setSize(this.simulation.fboSize.x, this.simulation.fboSize.y);
        });
      };

      this.advection = this._createShaderPass({
        material: {
          vertexShader: face_vert,
          fragmentShader: advection_frag,
          uniforms: {
            boundarySpace: { value: this.simulation.cellScale },
            px: { value: this.simulation.cellScale },
            fboSize: { value: this.simulation.fboSize },
            velocity: { value: this.simulation.fbos.vel_0.texture },
            dt: { value: this.simulation.options.dt },
            isBFECC: { value: true }
          }
        },
        output: this.simulation.fbos.vel_1
      });

      const boundaryG = new THREE.BufferGeometry();
      boundaryG.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array([
            -1, -1, 0, -1, 1, 0,
            -1, 1, 0, 1, 1, 0,
            1, 1, 0, 1, -1, 0,
            1, -1, 0, -1, -1, 0
          ]),
          3
        )
      );

      const boundaryM = new THREE.RawShaderMaterial({
        vertexShader: line_vert,
        fragmentShader: advection_frag,
        uniforms: this.advection.uniforms
      });

      this.advection.line = new THREE.LineSegments(boundaryG, boundaryM);
      this.advection.scene.add(this.advection.line);

      this.externalForceScene = new THREE.Scene();
      this.externalForceCamera = new THREE.Camera();

      const mouseG = new THREE.PlaneGeometry(1, 1);
      const mouseM = new THREE.RawShaderMaterial({
        vertexShader: mouse_vert,
        fragmentShader: externalForce_frag,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
          px: { value: this.simulation.cellScale },
          force: { value: new THREE.Vector2(0, 0) },
          center: { value: new THREE.Vector2(0, 0) },
          scale: { value: new THREE.Vector2(this.simulation.options.cursor_size, this.simulation.options.cursor_size) }
        }
      });

      this.externalForce = new THREE.Mesh(mouseG, mouseM);
      this.externalForceScene.add(this.externalForce);

      this.viscousPass = this._createShaderPass({
        material: {
          vertexShader: face_vert,
          fragmentShader: viscous_frag,
          uniforms: {
            boundarySpace: { value: this.simulation.boundarySpace },
            velocity: { value: this.simulation.fbos.vel_1.texture },
            velocity_new: { value: this.simulation.fbos.vel_viscous0.texture },
            v: { value: this.simulation.options.viscous },
            px: { value: this.simulation.cellScale },
            dt: { value: this.simulation.options.dt }
          }
        },
        output: this.simulation.fbos.vel_viscous1
      });

      this.divergence = this._createShaderPass({
        material: {
          vertexShader: face_vert,
          fragmentShader: divergence_frag,
          uniforms: {
            boundarySpace: { value: this.simulation.boundarySpace },
            velocity: { value: this.simulation.fbos.vel_viscous0.texture },
            px: { value: this.simulation.cellScale },
            dt: { value: this.simulation.options.dt }
          }
        },
        output: this.simulation.fbos.div
      });

      this.poisson = this._createShaderPass({
        material: {
          vertexShader: face_vert,
          fragmentShader: poisson_frag,
          uniforms: {
            boundarySpace: { value: this.simulation.boundarySpace },
            pressure: { value: this.simulation.fbos.pressure_0.texture },
            divergence: { value: this.simulation.fbos.div.texture },
            px: { value: this.simulation.cellScale }
          }
        },
        output: this.simulation.fbos.pressure_1
      });

      this.pressure = this._createShaderPass({
        material: {
          vertexShader: face_vert,
          fragmentShader: pressure_frag,
          uniforms: {
            boundarySpace: { value: this.simulation.boundarySpace },
            pressure: { value: this.simulation.fbos.pressure_0.texture },
            velocity: { value: this.simulation.fbos.vel_viscous0.texture },
            px: { value: this.simulation.cellScale },
            dt: { value: this.simulation.options.dt }
          }
        },
        output: this.simulation.fbos.vel_0
      });

      this.outputScene = new THREE.Scene();
      this.outputCamera = new THREE.Camera();
      this.outputMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.RawShaderMaterial({
          vertexShader: face_vert,
          fragmentShader: color_frag,
          transparent: true,
          depthWrite: false,
          uniforms: {
            velocity: { value: this.simulation.fbos.vel_0.texture },
            boundarySpace: { value: new THREE.Vector2() },
            palette: { value: this.paletteTex },
            bgColor: { value: this.bgVec4 }
          }
        })
      );

      this.outputScene.add(this.outputMesh);
    }

    _renderExternalForce() {
      const forceX = (this.mouse.diff.x / 2) * this.simulation.options.mouse_force;
      const forceY = (this.mouse.diff.y / 2) * this.simulation.options.mouse_force;

      const cursorSizeX = this.simulation.options.cursor_size * this.simulation.cellScale.x;
      const cursorSizeY = this.simulation.options.cursor_size * this.simulation.cellScale.y;

      const centerX = Math.min(
        Math.max(this.mouse.coords.x, -1 + cursorSizeX + this.simulation.cellScale.x * 2),
        1 - cursorSizeX - this.simulation.cellScale.x * 2
      );

      const centerY = Math.min(
        Math.max(this.mouse.coords.y, -1 + cursorSizeY + this.simulation.cellScale.y * 2),
        1 - cursorSizeY - this.simulation.cellScale.y * 2
      );

      const uniforms = this.externalForce.material.uniforms;
      uniforms.force.value.set(forceX, forceY);
      uniforms.center.value.set(centerX, centerY);
      uniforms.scale.value.set(
        this.simulation.options.cursor_size,
        this.simulation.options.cursor_size
      );

      this.common.renderer.setRenderTarget(this.simulation.fbos.vel_1);
      this.common.renderer.render(this.externalForceScene, this.externalForceCamera);
      this.common.renderer.setRenderTarget(null);
    }

    _updateSimulation() {
      if (this.simulation.options.isBounce) {
        this.simulation.boundarySpace.set(0, 0);
      } else {
        this.simulation.boundarySpace.copy(this.simulation.cellScale);
      }

      this.advection.uniforms.dt.value = this.simulation.options.dt;
      this.advection.uniforms.isBFECC.value = this.simulation.options.BFECC;
      this.advection.line.visible = this.simulation.options.isBounce;
      this.advection.update(this.simulation.fbos.vel_1);

      this._renderExternalForce();

      let vel = this.simulation.fbos.vel_1;

      if (this.simulation.options.isViscous) {
        let fbo_in = null;
        let fbo_out = null;

        this.viscousPass.uniforms.v.value = this.simulation.options.viscous;
        this.viscousPass.uniforms.dt.value = this.simulation.options.dt;

        for (let i = 0; i < this.simulation.options.iterations_viscous; i++) {
          if (i % 2 === 0) {
            fbo_in = this.simulation.fbos.vel_viscous0;
            fbo_out = this.simulation.fbos.vel_viscous1;
          } else {
            fbo_in = this.simulation.fbos.vel_viscous1;
            fbo_out = this.simulation.fbos.vel_viscous0;
          }

          this.viscousPass.uniforms.velocity_new.value = fbo_in.texture;
          this.viscousPass.update(fbo_out);
        }

        vel = fbo_out || this.simulation.fbos.vel_1;
      }

      this.divergence.uniforms.velocity.value = vel.texture;
      this.divergence.update(this.simulation.fbos.div);

      let p_in = null;
      let p_out = null;

      for (let i = 0; i < this.simulation.options.iterations_poisson; i++) {
        if (i % 2 === 0) {
          p_in = this.simulation.fbos.pressure_0;
          p_out = this.simulation.fbos.pressure_1;
        } else {
          p_in = this.simulation.fbos.pressure_1;
          p_out = this.simulation.fbos.pressure_0;
        }

        this.poisson.uniforms.pressure.value = p_in.texture;
        this.poisson.update(p_out);
      }

      const pressure = p_out || this.simulation.fbos.pressure_0;

      this.pressure.uniforms.velocity.value = vel.texture;
      this.pressure.uniforms.pressure.value = pressure.texture;
      this.pressure.update(this.simulation.fbos.vel_0);
    }

    _renderOutput() {
      this.common.renderer.setRenderTarget(null);
      this.common.renderer.render(this.outputScene, this.outputCamera);
    }

    _loop = () => {
      if (!this.running) return;

      if (this.autoDriver) this.autoDriver.update();
      this.mouse.update();
      this.common.update();
      this._updateSimulation();
      this._renderOutput();

      this.raf = requestAnimationFrame(this._loop);
    };

    _initObservers() {
      this._onResize = () => {
        this.common.resize();
        this.simulation.resize();
      };

      window.addEventListener("resize", this._onResize);

      this._onVisibility = () => {
        const hidden = document.hidden;
        if (hidden) {
          this.pause();
        } else if (this.isVisible) {
          this.start();
        }
      };

      document.addEventListener("visibilitychange", this._onVisibility);

      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const visible = entry.isIntersecting && entry.intersectionRatio > 0;
          this.isVisible = visible;

          if (visible && !document.hidden) {
            this.start();
          } else {
            this.pause();
          }
        },
        { threshold: [0, 0.01, 0.1] }
      );

      this.intersectionObserver.observe(this.container);

      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
        this.resizeRaf = requestAnimationFrame(() => {
          this.common.resize();
          this.simulation.resize();
        });
      });

      this.resizeObserver.observe(this.container);
    }

    updateOptions(nextOptions = {}) {
      Object.assign(this.options, nextOptions);

      if (nextOptions.colors) {
        if (this.paletteTex) this.paletteTex.dispose();
        this.paletteTex = makePaletteTexture(this.options.colors);
        this.outputMesh.material.uniforms.palette.value = this.paletteTex;
      }

      const prevRes = this.simulation.options.resolution;

      Object.assign(this.simulation.options, {
        mouse_force: this.options.mouseForce,
        cursor_size: this.options.cursorSize,
        isViscous: this.options.isViscous,
        viscous: this.options.viscous,
        iterations_viscous: this.options.iterationsViscous,
        iterations_poisson: this.options.iterationsPoisson,
        dt: this.options.dt,
        BFECC: this.options.BFECC,
        resolution: this.options.resolution,
        isBounce: this.options.isBounce
      });

      if (this.autoDriver) {
        this.autoDriver.enabled = this.options.autoDemo;
        this.autoDriver.speed = this.options.autoSpeed;
        this.autoDriver.resumeDelay = this.options.autoResumeDelay;
        this.autoDriver.rampDurationMs = this.options.autoRampDuration * 1000;
      }

      this.mouse.autoIntensity = this.options.autoIntensity;
      this.mouse.takeoverDuration = this.options.takeoverDuration;

      if (prevRes !== this.simulation.options.resolution) {
        this.simulation.resize();
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._loop();
    }

    pause() {
      this.running = false;
      if (this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = null;
      }
    }

    destroy() {
      this.pause();

      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);

      window.removeEventListener("resize", this._onResize);
      document.removeEventListener("visibilitychange", this._onVisibility);
      window.removeEventListener("mousemove", this._onMouseMove);
      window.removeEventListener("touchstart", this._onTouchStart);
      window.removeEventListener("touchmove", this._onTouchMove);
      window.removeEventListener("touchend", this._onTouchEnd);
      document.removeEventListener("mouseleave", this._onDocumentLeave);

      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.intersectionObserver) this.intersectionObserver.disconnect();

      if (this.advection) {
        if (this.advection.line) {
          this.advection.line.geometry.dispose();
          this.advection.line.material.dispose();
        }
        this.advection.dispose();
      }

      if (this.viscousPass) this.viscousPass.dispose();
      if (this.divergence) this.divergence.dispose();
      if (this.poisson) this.poisson.dispose();
      if (this.pressure) this.pressure.dispose();

      if (this.externalForce) {
        this.externalForce.geometry.dispose();
        this.externalForce.material.dispose();
      }

      if (this.outputMesh) {
        this.outputMesh.geometry.dispose();
        this.outputMesh.material.dispose();
      }

      if (this.paletteTex) this.paletteTex.dispose();

      if (this.simulation && this.simulation.fbos) {
        Object.values(this.simulation.fbos).forEach((fbo) => fbo.dispose());
      }

      if (this.common && this.common.renderer) {
        const canvas = this.common.renderer.domElement;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        this.common.renderer.dispose();
        if (this.common.renderer.forceContextLoss) {
          this.common.renderer.forceContextLoss();
        }
      }
    }
  }

  window.LiquidEther = LiquidEther;
})();