interface WindPoint {
  lat: number;
  lng: number;
  windSpeed: number; // km/h
  windDirection: number; // canvas degrees (0=Oost, 90=Zuid)
}

interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

interface WindOverlayOptions {
  particleCount?: number;
  trailLength?: number;
  particleSpeed?: number;
  updateInterval?: number;
  opacity?: number;
  color?: string;
}

export class WindOverlay {
  private map: any;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particles: WindParticle[] = [];
  private windData: WindPoint[] = [];
  private animationId: number | null = null;
  private isVisible: boolean = false;
  private options: Required<WindOverlayOptions>;
  private lastUpdate: number = 0;
  private avgWindSpeed: number = 15;

  constructor(map: any, options: WindOverlayOptions = {}) {
    this.map = map;
    this.options = {
      particleCount: options.particleCount || 500,
      trailLength: options.trailLength || 120,
      particleSpeed: options.particleSpeed || 0.2,
      updateInterval: options.updateInterval || 1000,
      opacity: options.opacity || 0.8,
      color: options.color || 'rgba(255, 100, 100, 0.8)'
    };

    this.initCanvas();
    this.bindEvents();
  }

  private initCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1000';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'none';
    
    this.ctx = this.canvas.getContext('2d')!;
    
    // Toevoegen aan de map container (werkt altijd, ook bij zoom)
    const container = this.map.getContainer();
    container.appendChild(this.canvas);
    
    this.resizeCanvas();
  }

  private bindEvents(): void {
    // Gebruik een debounced resize
    let resizeTimeout: number | null = null;
    const doResize = () => {
      if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
      resizeTimeout = requestAnimationFrame(() => {
        this.resizeCanvas();
      });
    };
    
    this.map.on('moveend', doResize);
    this.map.on('zoomend', doResize);
    window.addEventListener('resize', doResize);
  }

  private resizeCanvas(): void {
    const container = this.map.getContainer();
    if (!container) return;
    
    const size = this.map.getSize();
    if (size && size.x > 0 && size.y > 0) {
      this.canvas.width = size.x;
      this.canvas.height = size.y;
      this.canvas.style.width = size.x + 'px';
      this.canvas.style.height = size.y + 'px';
    } else {
      // Fallback: container afmetingen
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
      }
    }
  }

  private latLngToXY(lat: number, lng: number): { x: number; y: number } {
    const point = this.map.latLngToContainerPoint([lat, lng]);
    return { x: point.x, y: point.y };
  }

  private getNearestWind(x: number, y: number): { speed: number; direction: number } {
    if (this.windData.length === 0) {
      return { speed: 10, direction: 270 };
    }

    let nearest = this.windData[0];
    let minDist = Infinity;

    for (const point of this.windData) {
      const xy = this.latLngToXY(point.lat, point.lng);
      const d = Math.sqrt(Math.pow(xy.x - x, 2) + Math.pow(xy.y - y, 2));
      if (d < minDist) {
        minDist = d;
        nearest = point;
      }
    }

    return { speed: nearest.windSpeed, direction: nearest.windDirection };
  }

  private getWindFactor(speed: number): number {
    return Math.max(0.3, Math.min(1.0, speed / 40));
  }

  /** Genereer startpositie buiten de kaart */
  private getSpawnPosition(): { x: number; y: number } {
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 600;
    
    // Gemiddelde windrichting voor spawn richting
    let avgDir = 270;
    if (this.windData.length > 0) {
      let sx = 0, sy = 0;
      for (const p of this.windData) {
        const rad = (p.windDirection * Math.PI) / 180;
        sx += Math.cos(rad);
        sy += Math.sin(rad);
      }
      avgDir = (Math.atan2(sy, sx) * 180) / Math.PI;
    }
    
    // Tegengestelde richting: waar deeltjes vandaan moeten komen
    const fromDir = (avgDir + 180) % 360;
    const fromRad = (fromDir * Math.PI) / 180;
    
    // Willekeurige positie op een cirkel rond de kaart
    const margin = Math.max(w, h) * 0.6;
    const cx = w / 2, cy = h / 2;
    const baseX = cx + Math.cos(fromRad) * margin;
    const baseY = cy + Math.sin(fromRad) * margin;
    
    // Spreiding loodrecht op wind
    const perpRad = fromRad + Math.PI / 2;
    const spread = Math.max(w, h) * 0.4;
    const offset = (Math.random() - 0.5) * spread;
    
    return {
      x: baseX + Math.cos(perpRad) * offset,
      y: baseY + Math.sin(perpRad) * offset
    };
  }

  private createParticle(): WindParticle {
    const spawn = this.getSpawnPosition();
    const wind = this.getNearestWind(spawn.x, spawn.y);
    const factor = this.getWindFactor(wind.speed);
    
    const directionRad = (wind.direction * Math.PI) / 180;
    const speed = Math.max(wind.speed, 3) * this.options.particleSpeed * factor;
    
    return {
      x: spawn.x,
      y: spawn.y,
      vx: Math.cos(directionRad) * speed,
      vy: Math.sin(directionRad) * speed,
      life: Math.random() * 300, // willekeurige start leeftijd voor spreiding
      maxLife: 400 + Math.random() * 400,
      trail: []
    };
  }

  private updateParticles(): void {
    while (this.particles.length < this.options.particleCount) {
      this.particles.push(this.createParticle());
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx;
      p.y += p.vy;
      
      p.trail.push({ x: p.x, y: p.y });
      while (p.trail.length > 120) {
        p.trail.shift();
      }
      
      const wind = this.getNearestWind(p.x, p.y);
      const factor = this.getWindFactor(wind.speed);
      const dirRad = (wind.direction * Math.PI) / 180;
      const speed = Math.max(wind.speed, 3) * this.options.particleSpeed * factor;
      
      p.vx = p.vx * 0.98 + Math.cos(dirRad) * speed * 0.02;
      p.vy = p.vy * 0.98 + Math.sin(dirRad) * speed * 0.02;
      
      p.life++;
      
      // Vervang als te ver buiten beeld
      const maxDist = Math.max(this.canvas.width, this.canvas.height) * 2;
      const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
      const dist = Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
      
      if (p.life > p.maxLife || dist > maxDist || this.isOffscreen(p.x, p.y)) {
        this.particles[i] = this.createParticle();
      }
    }
  }

  private isOffscreen(x: number, y: number): boolean {
    const m = Math.max(this.canvas.width, this.canvas.height);
    return x < -m || x > this.canvas.width + m || y < -m || y > this.canvas.height + m;
  }

  private drawParticles(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h) return;
    
    this.ctx.clearRect(0, 0, w, h);
    
    for (const p of this.particles) {
      const wind = this.getNearestWind(p.x, p.y);
      const factor = this.getWindFactor(wind.speed);
      
      // Leeftijdsfade - pas vervagen in laatste 15%
      const lifeRatio = p.life / p.maxLife;
      const fade = lifeRatio > 0.85 ? (1 - (lifeRatio - 0.85) / 0.15) : 1.0;
      
      const opacity = fade * this.options.opacity * (0.7 + factor * 0.3);
      const trail = p.trail;
      
      if (trail.length >= 2) {
        // Staart: max 80 punten, schaal met windfactor
        const trailLen = Math.max(4, Math.floor(80 * factor));
        const start = Math.max(0, trail.length - trailLen);
        
        for (let i = start; i < trail.length - 1; i++) {
          const pos = (i - start) / (trail.length - 1 - start);
          const tOp = pos * opacity * 0.9;
          const tW = 3 + pos * (2 + factor * 3);
          
          this.ctx.beginPath();
          this.ctx.strokeStyle = this.options.color.replace(/[\d.]+\)$/, tOp + ')');
          this.ctx.lineWidth = tW;
          this.ctx.lineCap = 'round';
          this.ctx.moveTo(trail[i].x, trail[i].y);
          this.ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
          this.ctx.stroke();
        }
        
        // Kop - stip
        const headOp = Math.min(1, opacity * 1.5);
        const headR = 3 + factor * 4;
        
        this.ctx.beginPath();
        this.ctx.fillStyle = this.options.color.replace(/[\d.]+\)$/, headOp + ')');
        this.ctx.arc(p.x, p.y, headR, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Glow
        this.ctx.beginPath();
        this.ctx.fillStyle = this.options.color.replace(/[\d.]+\)$/, (headOp * 0.3) + ')');
        this.ctx.arc(p.x, p.y, headR * 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private animate = (): void => {
    if (!this.isVisible) return;
    
    this.updateParticles();
    this.drawParticles();
    
    this.animationId = requestAnimationFrame(this.animate);
  };

  async fetchWindData(): Promise<void> {
    try {
      const center = this.map.getCenter();
      const bounds = this.map.getBounds();
      
      const gridPoints: { lat: number; lng: number }[] = [];
      const latStep = 0.3;
      const lngStep = 0.3;
      
      const latStart = Math.floor((bounds.getSouth() - 0.5) / latStep) * latStep;
      const latEnd = Math.ceil((bounds.getNorth() + 0.5) / latStep) * latStep;
      const lngStart = Math.floor((bounds.getWest() - 0.5) / lngStep) * lngStep;
      const lngEnd = Math.ceil((bounds.getEast() + 0.5) / lngStep) * lngStep;
      
      for (let lat = latStart; lat <= latEnd; lat += latStep) {
        for (let lng = lngStart; lng <= lngEnd; lng += lngStep) {
          gridPoints.push({ lat, lng });
        }
      }
      
      const points = gridPoints.slice(0, 15);
      
      if (points.length === 0) {
        // Fallback
        points.push({ lat: center.lat, lng: center.lng });
      }
      
      const promises = points.map(async (pt) => {
        try {
          const resp = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${pt.lat}&longitude=${pt.lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`
          );
          const data = await resp.json();
          const meteoDir = data.current.wind_direction_10m || 270;
          const canvasDir = (meteoDir + 90) % 360;
          return {
            lat: pt.lat,
            lng: pt.lng,
            windSpeed: data.current.wind_speed_10m || 15,
            windDirection: canvasDir
          };
        } catch {
          return null;
        }
      });
      
      const results = (await Promise.all(promises)).filter(Boolean) as WindPoint[];
      
      if (results.length > 0) {
        this.windData = results;
        this.avgWindSpeed = results.reduce((s, p) => s + p.windSpeed, 0) / results.length;
      } else {
        throw new Error('Geen geldige data');
      }
      
      this.lastUpdate = Date.now();
    } catch (error) {
      // Fallback data - canvas richting (westenwind = oostwaards, 0°)
      this.windData = [
        { lat: 51.0, lng: 3.0, windSpeed: 12, windDirection: 0 },
        { lat: 51.1, lng: 3.0, windSpeed: 14, windDirection: 5 },
        { lat: 51.0, lng: 3.1, windSpeed: 10, windDirection: 355 },
        { lat: 50.9, lng: 3.0, windSpeed: 13, windDirection: 0 }
      ];
      this.avgWindSpeed = 12;
      this.lastUpdate = Date.now();
    }
  }

  setWindData(data: WindPoint[]): void {
    this.windData = data;
    if (data.length > 0) {
      this.avgWindSpeed = data.reduce((s, p) => s + p.windSpeed, 0) / data.length;
    }
    this.lastUpdate = Date.now();
    this.particles = [];
  }

  setParticleCount(count: number): void {
    this.options.particleCount = count;
    this.particles = [];
  }

  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.canvas.style.display = 'block';
    
    // Start animatie direct met fallback data
    // (wordt overschreven als fetchWindData slaagt)
    this.animate();
    
    // Haal echte data op
    this.fetchWindData().then(() => {
      // Reset particles met echte data
      this.particles = [];
    });
  }

  hide(): void {
    this.isVisible = false;
    this.canvas.style.display = 'none';
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  toggle(): void {
    if (this.isVisible) this.hide();
    else this.show();
  }

  destroy(): void {
    this.hide();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.map.off('moveend');
    this.map.off('zoomend');
  }

  setOptions(options: Partial<WindOverlayOptions>): void {
    this.options = { ...this.options, ...options };
  }
}