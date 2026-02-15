import { Particle, ParticleContainer, type Texture } from "pixi.js";

export interface FireEmitterConfig {
  /** Max number of particles on screen at once. */
  maxParticles: number;
  /** Seconds between spawning a new particle when under the limit. */
  spawnInterval: number;
  /** Particle lifetime in seconds. */
  lifetime: number;
  /** Emit origin X (e.g. center of screen). */
  emitX: number;
  /** Emit origin Y (e.g. base of flame). */
  emitY: number;
  /** Horizontal spread of spawn position (half-width). Ignored if baseWidth is set. */
  spreadX?: number;
  /** Width of the fire base (campfire shape). Particles spawn along [emitX - baseWidth/2, emitX + baseWidth/2]. */
  baseWidth?: number;
  /** Outward drift so flame forms a cone: vx += (spawnX - emitX) / (baseWidth/2) * coneSpread. */
  coneSpread?: number;
  /** Cone shape (campfire): wide at base, narrow at top. halfWidth = baseWidth/2 - heightAboveBase * coneSlope, min coneMinHalfWidth. */
  coneSlope?: number;
  /** Minimum half-width at tip of cone (px). */
  coneMinHalfWidth?: number;
  /** Height of flame cone for color gradient (base = red, top = yellow-white). */
  flameHeight?: number;
  /** If true, a static flame cone is shown and flying particles emit from above it. */
  staticCone?: boolean;
  /** When staticCone is true, number of particles that form the static flame cone (rest are flying). */
  staticConeCount?: number;
  /** Vertical velocity range: [min, max] (negative = upward). */
  velocityY?: [number, number];
  /** Horizontal velocity range: [min, max]. */
  velocityX?: [number, number];
  /** Horizontal wobble: amplitude (px/s) added as sin(life*flickerFreq + phase). 0 = no wobble. */
  flickerAmplitude?: number;
  /** Horizontal wobble frequency (rad/s). */
  flickerFreq?: number;
  /** Particle width. */
  particleWidth?: number;
  /** Particle height. */
  particleHeight?: number;
  /** Base tint (hex). */
  tintBase?: number;
  /** Tint variation (added random to base). */
  tintVariation?: number;
}

/** Alpha over lifetime */
function getAlphaByLifecycle(t: number): number {
  if (t <= 0.2) return 0.5 + 0.5 * (t / 0.2);
  if (t <= 0.55) return 1;
  if (t <= 0.8) return 1 - 0.5 * ((t - 0.55) / 0.25);
  return Math.max(0, 0.5 - 0.5 * ((t - 0.8) / 0.2));
}

/** Half-width for flame cone: rounded base (sin), smooth taper to point at top. */
function getFlameHalfWidth(
  baseW: number,
  heightAboveBase: number,
  flameH: number,
  coneMin: number
): number {
  const t = Math.min(1, heightAboveBase / Math.max(1, flameH));
  if (t >= 0.998) return 0;
  const halfWidth = (baseW / 2) * Math.sin((1 - t) * Math.PI * 0.5);
  return Math.max(coneMin, halfWidth);
}

const DEFAULT_CONFIG: Partial<FireEmitterConfig> = {
  spreadX: 20,
  baseWidth: 0,
  coneSpread: 28,
  coneSlope: 0.32,
  coneMinHalfWidth: 10,
  flameHeight: 110,
  velocityY: [-100, -60],
  velocityX: [-20, 20],
  particleWidth: 24,
  particleHeight: 36,
  tintBase: 0xff6600,
  tintVariation: 0x2200,
};

interface FireParticleState {
  particle: Particle;
  life: number;
  lifeMax: number;
  vx: number;
  vy: number;
  flickerPhase: number;
}

export class FireEmitter {
  private readonly container: ParticleContainer;
  private readonly texture: Texture;
  private readonly config: Required<FireEmitterConfig>;
  private readonly state: FireParticleState[] = [];
  private spawnTimer = 0;
  /** When staticCone is true, number of particles that form the static flame cone (not updated). */
  private staticConeCount = 0;
  private emitX: number;
  private emitY: number;

  constructor(texture: Texture, config: FireEmitterConfig) {
    this.texture = texture;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<FireEmitterConfig>;
    this.emitX = this.config.emitX;
    this.emitY = this.config.emitY;

    this.container = new ParticleContainer({
      texture: this.texture,
      dynamicProperties: {
        position: true,
        color: true,
        rotation: false,
        vertex: false,
        uvs: false,
      },
    });

    if (this.config.staticCone) {
      this.fillStaticCone();
    } else {
      for (let i = 0; i < this.config.maxParticles; i++) {
        this.spawnOne();
      }
    }
  }

  /** Place particles along the flame contour so the silhouette is a cone shape. */
  private fillStaticCone(): void {
    const cfg = this.config;
    const n = cfg.staticConeCount ?? Math.min(32, cfg.maxParticles);
    this.staticConeCount = n;
    const baseW = cfg.baseWidth ?? 80;
    const coneMin = cfg.coneMinHalfWidth ?? 4;
    const flameH = cfg.flameHeight ?? 110;
    const cx = this.emitX;
    const baseY = this.emitY;

    const positions: { x: number; y: number }[] = [];
    const halfW = (y: number) => getFlameHalfWidth(baseW, baseY - y, flameH, coneMin);

    positions.push({ x: cx, y: baseY });
    positions.push({ x: cx - baseW / 2, y: baseY });
    const leftSteps = Math.max(1, Math.floor((n - 4) / 2));
    const rightSteps = Math.max(1, n - 4 - leftSteps);
    for (let i = 1; i <= leftSteps; i++) {
      const y = baseY - (i / (leftSteps + 1)) * flameH;
      positions.push({ x: cx - halfW(y), y });
    }
    positions.push({ x: cx, y: baseY - flameH });
    for (let i = rightSteps; i >= 1; i--) {
      const y = baseY - (i / (rightSteps + 1)) * flameH;
      positions.push({ x: cx + halfW(y), y });
    }
    positions.push({ x: cx + baseW / 2, y: baseY });

    const tw = this.texture.width || 96;
    const th = this.texture.height || 96;
    const w = cfg.particleWidth ?? 48;
    const h = cfg.particleHeight ?? 64;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const heightFactor = Math.min(1, (baseY - pos.y) / flameH);
      const rr = 255;
      const g = Math.round(51 + 204 * heightFactor);
      const b = Math.round(204 * heightFactor);
      const particle = new Particle({
        texture: this.texture,
        x: pos.x,
        y: pos.y,
        anchorX: 0.5,
        anchorY: 1,
        alpha: 1,
        tint: (rr << 16) | (g << 8) | b,
      });
      const scaleByHeight = 0.18 + 0.82 * (1 - heightFactor);
      particle.scaleX = (w / tw) * scaleByHeight;
      particle.scaleY = (h / th) * scaleByHeight;
      this.container.addParticle(particle);
      this.state.push({
        particle,
        life: 1,
        lifeMax: 1,
        vx: 0,
        vy: 0,
        flickerPhase: 0,
      });
    }
    this.container.update();
  }

  /** The container to add to the scene. */
  get view() {
    return this.container;
  }

  /** Update emit origin. */
  setEmitPosition(x: number, y: number): void {
    this.emitX = x;
    this.emitY = y;
  }

  /** Call every frame with delta in seconds. */
  update(delta: number): void {
    const cfg = this.config;
    const flameH = cfg.flameHeight ?? 110;
    const tipY = this.emitY - flameH;
    const onlyFlying = cfg.staticCone;
    const startIndex = onlyFlying ? this.staticConeCount : 0;
    const recycleMode = !cfg.staticCone;

    for (let i = this.state.length - 1; i >= startIndex; i--) {
      const s = this.state[i];

      if (recycleMode && this.isParticleOutOfBounds(s, tipY)) {
        this.recycleParticle(s);
        continue;
      }

      this.updateParticleVelocity(s);
      this.updateParticlePosition(s, delta);
      this.clampParticleToCone(s, flameH, onlyFlying);
      this.updateParticleAppearance(s, flameH);

      if (!recycleMode && s.particle.y <= tipY) {
        this.removeParticleAt(i);
      }
    }

    this.container.update();

    if (recycleMode) return;
    const maxFlying = onlyFlying ? cfg.maxParticles - this.staticConeCount : cfg.maxParticles;
    const flyingCount = this.state.length - startIndex;
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && flyingCount < maxFlying) {
      this.spawnTimer = cfg.spawnInterval;
      if (onlyFlying) {
        this.spawnFlyingFromTip();
      } else {
        this.spawnOne();
      }
    }
  }

  private isParticleOutOfBounds(s: FireParticleState, tipY: number): boolean {
    const cfg = this.config;
    const baseW = cfg.baseWidth ?? 200;
    return (
      s.particle.y <= tipY ||
      s.particle.y > this.emitY + 50 ||
      Math.abs(s.particle.x - this.emitX) > baseW
    );
  }

  private updateParticleVelocity(s: FireParticleState): void {
    if (s.vy >= 0) {
      const cfg = this.config;
      const [vyMin, vyMax] = cfg.velocityY ?? [-100, -60];
      const vxMin = cfg.velocityX?.[0] ?? -20;
      const vxMax = cfg.velocityX?.[1] ?? 20;
      s.vy = vyMin + Math.random() * (vyMax - vyMin);
      s.vx = vxMin + Math.random() * (vxMax - vxMin);
    }
  }

  private updateParticlePosition(s: FireParticleState, delta: number): void {
    const cfg = this.config;
    const flickerAmp = cfg.flickerAmplitude ?? 55;
    const flickerFreq = cfg.flickerFreq ?? 18;
    const flickerVel = flickerAmp * Math.sin(s.life * flickerFreq + s.flickerPhase);
    s.particle.x += (s.vx + flickerVel) * delta;
    s.particle.y += s.vy * delta;
    s.life += delta;
  }

  private clampParticleToCone(s: FireParticleState, flameH: number, onlyFlying: boolean): void {
    const cfg = this.config;
    const baseW = cfg.baseWidth ?? 0;
    if (baseW <= 0 || onlyFlying) return;
    const heightAboveBase = Math.max(0, this.emitY - s.particle.y);
    const coneMin = cfg.coneMinHalfWidth ?? 10;
    const halfWidth = getFlameHalfWidth(baseW, heightAboveBase, flameH, coneMin);
    s.particle.x = Math.max(this.emitX - halfWidth, Math.min(this.emitX + halfWidth, s.particle.x));
  }

  private updateParticleAppearance(s: FireParticleState, flameH: number): void {
    const cfg = this.config;
    const heightAboveBase = Math.max(0, this.emitY - s.particle.y);
    const heightFactor = Math.min(1, heightAboveBase / flameH);
    const t = Math.min(1, s.life / Math.max(0.001, s.lifeMax));

    s.particle.alpha = getAlphaByLifecycle(t);

    const baseScale = 0.5 + 0.5 * heightFactor;
    const recycleMode = !cfg.staticCone;
    const scaleFlicker = recycleMode ? 0.9 + 0.3 * Math.sin(s.life * 25 + s.flickerPhase) : 1;
    const scale = baseScale * scaleFlicker;
    const tw = this.texture.width || 96;
    const th = this.texture.height || 96;
    s.particle.scaleX = scale * ((cfg.particleWidth ?? 48) / tw);
    s.particle.scaleY = scale * ((cfg.particleHeight ?? 64) / th);

    const r = 255;
    const g = Math.round(51 + 204 * heightFactor);
    const b = Math.round(204 * heightFactor);
    s.particle.tint = (r << 16) | (g << 8) | b;
  }

  private removeParticleAt(i: number): void {
    const s = this.state[i];
    this.container.removeParticle(s.particle);
    if ("destroy" in s.particle && typeof s.particle.destroy === "function") {
      (s.particle as { destroy: () => void }).destroy();
    }
    this.state.splice(i, 1);
  }

  private recycleParticle(s: FireParticleState): void {
    const cfg = this.config;
    const spreadX = (cfg.baseWidth ?? 0) > 0 ? (cfg.baseWidth ?? 0) / 2 : (cfg.spreadX ?? 20);
    const [vyMin, vyMax] = cfg.velocityY ?? [-100, -60];
    const [vxMin, vxMax] = cfg.velocityX ?? [-20, 20];
    s.particle.x = this.emitX + (Math.random() - 0.5) * 2 * spreadX * 0.82;
    s.particle.y = this.emitY - 20 + (Math.random() - 0.5) * 8;
    s.vx = vxMin + Math.random() * (vxMax - vxMin);
    s.vy = vyMin + Math.random() * (vyMax - vyMin);
    s.life = Math.random() * 0.2;
    s.flickerPhase = Math.random() * Math.PI * 2;
    s.particle.tint = 0xff8844;
  }

  private spawnOne(): void {
    const cfg = this.config;
    const baseWidth = cfg.baseWidth ?? 0;
    const coneMin = cfg.coneMinHalfWidth ?? 10;
    const flameH = cfg.flameHeight ?? 110;
    const spreadX = baseWidth > 0 ? baseWidth / 2 : (cfg.spreadX ?? 20);
    const coneSpread = cfg.coneSpread ?? 0;
    const [vyMin, vyMax] = cfg.velocityY ?? [-100, -60];
    const [vxMin, vxMax] = cfg.velocityX ?? [-20, 20];

    const noUpward = vyMin === 0 && vyMax === 0;
    let spawnX: number;
    let spawnY: number;

    if (baseWidth > 0 && noUpward) {
      const heightAboveBase = Math.random() * flameH;
      spawnY = this.emitY - heightAboveBase;
      const halfWidth = getFlameHalfWidth(baseWidth, heightAboveBase, flameH, coneMin);
      spawnX = this.emitX + (Math.random() - 0.5) * 2 * halfWidth * 0.9;
    } else {
      spawnX = this.emitX + (Math.random() - 0.5) * 2 * spreadX * 0.82;
      spawnY = this.emitY - 20 + (Math.random() - 0.5) * 8;
    }

    const particle = new Particle({
      texture: this.texture,
      x: spawnX,
      y: spawnY,
      anchorX: 0.5,
      anchorY: 1,
      alpha: 1,
      tint: 0xff8844,
    });

    const w = cfg.particleWidth ?? 32;
    const h = cfg.particleHeight ?? 48;
    const tw = this.texture.width || 64;
    const th = this.texture.height || 64;
    particle.scaleX = w / tw;
    particle.scaleY = h / th;

    let vx = vxMin + Math.random() * (vxMax - vxMin);
    if (baseWidth > 0 && coneSpread !== 0 && !noUpward) {
      const norm = (spawnX - this.emitX) / (baseWidth / 2);
      vx += norm * coneSpread;
    }

    this.container.addParticle(particle);
    this.state.push({
      particle,
      life: cfg.lifetime,
      lifeMax: cfg.lifetime,
      vx,
      vy: vyMin + Math.random() * (vyMax - vyMin),
      flickerPhase: Math.random() * Math.PI * 2,
    });
  }

  /** Spawn one particle from the tip of the flame cone (flying upward). Used when staticCone is true. */
  private spawnFlyingFromTip(): void {
    const cfg = this.config;
    const flameH = cfg.flameHeight ?? 110;
    const coneMin = cfg.coneMinHalfWidth ?? 10;
    const tipSpread = Math.max(coneMin, 8);
    const spawnX = this.emitX + (Math.random() - 0.5) * 2 * tipSpread;
    const spawnY = this.emitY - flameH + (Math.random() - 0.5) * 12;
    const [vyMin, vyMax] = cfg.velocityY ?? [-100, -60];
    const [vxMin, vxMax] = cfg.velocityX ?? [-20, 20];

    const particle = new Particle({
      texture: this.texture,
      x: spawnX,
      y: spawnY,
      anchorX: 0.5,
      anchorY: 1,
      alpha: 1,
      tint: 0xffcc88,
    });

    const w = cfg.particleWidth ?? 32;
    const h = cfg.particleHeight ?? 48;
    const tw = this.texture.width || 64;
    const th = this.texture.height || 64;
    particle.scaleX = w / tw;
    particle.scaleY = h / th;

    const vx = vxMin + Math.random() * (vxMax - vxMin);
    const vy = vyMin + Math.random() * (vyMax - vyMin);

    this.container.addParticle(particle);
    this.state.push({
      particle,
      life: cfg.lifetime,
      lifeMax: cfg.lifetime,
      vx,
      vy,
      flickerPhase: Math.random() * Math.PI * 2,
    });
  }

  destroy(): void {
    for (const s of this.state) {
      if ("destroy" in s.particle && typeof s.particle.destroy === "function") {
        (s.particle as { destroy: () => void }).destroy();
      }
    }
    this.state.length = 0;
    this.container.destroy({ children: true });
  }
}
