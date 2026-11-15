import React, { useEffect, useRef, useState } from 'react';
import { Snowflake, Flame, Droplets } from 'lucide-react';
import { Translations } from '../i18n/translations';
import {
  classifyHumidityComfort,
  dewPointFromVaporPressureMmHg,
  relativeHumidityPercent,
  saturationVaporPressureMmHg,
} from '../physics/vaporPhysics';
import { ProgressiveSlider } from './ProgressiveSlider';

interface Module3DewPointProps {
  t: Translations;
  resetSignal: number;
}

interface VaporMolecule {
  nx: number;
  ny: number;
  vx: number;
  vy: number;
}

interface FallingDewDrop {
  nx: number;
  y: number;
  vy: number;
  r: number;
  trail: number;
}

interface FloorSplash {
  x: number;
  y: number;
  r: number;
  life: number;
}

const INITIAL_HOT_TEMP_C = 40.0;

export const Module3DewPoint: React.FC<Module3DewPointProps> = ({ t, resetSignal }) => {
  const [boxTempC, setBoxTempC] = useState<number>(INITIAL_HOT_TEMP_C);
  const [initialMoistureMmHg, setInitialMoistureMmHg] = useState<number>(20.0);
  const [autoCooling, setAutoCooling] = useState<boolean>(false);
  const [hoverTempC, setHoverTempC] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const svpAtBox = saturationVaporPressureMmHg(boxTempC);
  const dewPointC = dewPointFromVaporPressureMmHg(initialMoistureMmHg);
  const isCondensing = boxTempC <= dewPointC + 0.05;
  const actualVaporInAir = Math.min(initialMoistureMmHg, svpAtBox);
  const condensedDeltaMmHg = Math.max(0, initialMoistureMmHg - actualVaporInAir);
  const condensedPercent =
    initialMoistureMmHg > 0 ? (condensedDeltaMmHg / initialMoistureMmHg) * 100 : 0;
  const rhPercent = relativeHumidityPercent(actualVaporInAir, svpAtBox);
  const comfort = classifyHumidityComfort(rhPercent);

  // Reset signal
  useEffect(() => {
    if (resetSignal === 0) return;
    setBoxTempC(INITIAL_HOT_TEMP_C);
    setInitialMoistureMmHg(20.0);
    setAutoCooling(false);
    setHoverTempC(null);
  }, [resetSignal]);

  // Auto-cooling animation: 40°C -> 4°C
  useEffect(() => {
    if (!autoCooling) return;
    let animId = 0;
    let lastTs = performance.now();
    const targetTemp = 4.0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      setBoxTempC((prev) => {
        const next = prev - 4.4 * dt;
        if (next <= targetTemp) {
          setAutoCooling(false);
          return targetTemp;
        }
        return next;
      });
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [autoCooling]);

  // Sync React state into mutable ref for 60 FPS canvas loop
  const stateRef = useRef({
    boxTempC,
    initialMoistureMmHg,
    actualVaporInAir,
    svpAtBox,
    dewPointC,
    condensedDeltaMmHg,
    condensedPercent,
    isCondensing,
    autoCooling,
    hoverTempC,
  });

  useEffect(() => {
    stateRef.current = {
      boxTempC,
      initialMoistureMmHg,
      actualVaporInAir,
      svpAtBox,
      dewPointC,
      condensedDeltaMmHg,
      condensedPercent,
      isCondensing,
      autoCooling,
      hoverTempC,
    };
  }, [
    boxTempC,
    initialMoistureMmHg,
    actualVaporInAir,
    svpAtBox,
    dewPointC,
    condensedDeltaMmHg,
    condensedPercent,
    isCondensing,
    autoCooling,
    hoverTempC,
  ]);

  const animStateRef = useRef({
    phaseTime: 0,
    smoothWaterFrac: 0,
    dropCooldown: 0,
    molecules: Array.from({ length: 44 }, () => ({
      nx: 0.08 + Math.random() * 0.84,
      ny: 0.08 + Math.random() * 0.84,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
    })) as VaporMolecule[],
    fallingDrops: [] as FallingDewDrop[],
    splashes: [] as FloorSplash[],
  });

  const graphBoundsRef = useRef({
    graphLeft: 320,
    graphRight: 650,
    graphTop: 58,
    graphBottom: 400,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTs = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const parent = canvas.parentElement;
      const W = parent ? parent.clientWidth : 700;
      const H = parent ? parent.clientHeight : 480;

      const s = stateRef.current;
      const a = animStateRef.current;
      a.phaseTime += dt;

      // Split Canvas Geometry: Left = Hot Air Box (~43%), Right = SVP Curve (~57%)
      const splitX = W < 540 ? W * 0.44 : W * 0.43;

      const boxW = Math.min(230, splitX * 0.72);
      const boxH = Math.min(330, H * 0.68);
      const boxCenterX = splitX * 0.5 + 10;
      const boxLeft = boxCenterX - boxW / 2;
      const boxRight = boxCenterX + boxW / 2;
      const boxTop = H * 0.52 - boxH / 2 + 6;
      const boxBottom = boxTop + boxH;

      const graphLeft = splitX + 54;
      const graphRight = W - 24;
      const graphTop = 58;
      const graphBottom = H - 52;
      const graphW = Math.max(120, graphRight - graphLeft);
      const graphH = Math.max(120, graphBottom - graphTop);

      graphBoundsRef.current = { graphLeft, graphRight, graphTop, graphBottom };

      // Smooth liquid pool height at bottom of box
      const targetWaterFrac = Math.min(1, s.condensedDeltaMmHg / Math.max(10, s.initialMoistureMmHg));
      a.smoothWaterFrac += (targetWaterFrac - a.smoothWaterFrac) * Math.min(1, dt * 7);

      const maxWaterPoolH = boxH * 0.28;
      const waterPoolH = a.smoothWaterFrac * maxWaterPoolH;
      const waterSurfaceY = boxBottom - waterPoolH;
      const airSpaceH = Math.max(30, waterSurfaceY - boxTop);

      // Active vapor molecule count inside the air proportional to actualVaporInAir
      const targetMoleculeCount = Math.max(
        4,
        Math.round(8 + (s.actualVaporInAir / 35) * 42)
      );
      while (a.molecules.length < targetMoleculeCount) {
        a.molecules.push({
          nx: 0.08 + Math.random() * 0.84,
          ny: 0.08 + Math.random() * 0.84,
          vx: (Math.random() - 0.5) * 0.9,
          vy: (Math.random() - 0.5) * 0.9,
        });
      }
      if (a.molecules.length > targetMoleculeCount) {
        a.molecules.length = targetMoleculeCount;
      }

      // Move vapor molecules inside air volume (speed scales with temperature)
      const thermalSpeed = 0.55 * Math.sqrt((s.boxTempC + 273.15) / 298.15);
      for (const m of a.molecules) {
        m.nx += m.vx * thermalSpeed * dt;
        m.ny += m.vy * thermalSpeed * dt;
        if (m.nx < 0.06) {
          m.nx = 0.06;
          m.vx = Math.abs(m.vx);
        } else if (m.nx > 0.94) {
          m.nx = 0.94;
          m.vx = -Math.abs(m.vx);
        }
        if (m.ny < 0.06) {
          m.ny = 0.06;
          m.vy = Math.abs(m.vy);
        } else if (m.ny > 0.94) {
          m.ny = 0.94;
          m.vy = -Math.abs(m.vy);
        }
      }

      // Spawn falling dew droplets whenever temp <= dewPoint
      if (s.isCondensing) {
        const subcooling = Math.max(0.4, s.dewPointC - s.boxTempC + 0.8);
        const spawnRate = Math.min(26, 4 + subcooling * 1.4);
        a.dropCooldown -= dt * spawnRate;
        while (a.dropCooldown <= 0) {
          a.dropCooldown += 0.65 + Math.random() * 0.5;
          a.fallingDrops.push({
            nx: 0.08 + Math.random() * 0.84,
            y: boxTop + 14 + Math.random() * (airSpaceH * 0.55),
            vy: 65 + Math.random() * 55,
            r: 2.4 + Math.random() * 1.9,
            trail: 7 + Math.random() * 8,
          });
        }
      }

      // Update falling dew droplets & floor splash ripples
      for (const d of a.fallingDrops) {
        d.vy += 240 * dt;
        d.y += d.vy * dt;
        if (d.y >= waterSurfaceY - 2) {
          a.splashes.push({
            x: boxLeft + 10 + d.nx * (boxW - 20),
            y: waterSurfaceY,
            r: 2,
            life: 1.0,
          });
        }
      }
      a.fallingDrops = a.fallingDrops.filter((d) => d.y < waterSurfaceY - 2);

      for (const sp of a.splashes) {
        sp.r += 22 * dt;
        sp.life -= dt * 2.4;
      }
      a.splashes = a.splashes.filter((sp) => sp.life > 0);

      // === RENDER CANVAS ===
      ctx.clearRect(0, 0, W, H);

      // Divider line
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(splitX, 16);
      ctx.lineTo(splitX, H - 16);
      ctx.stroke();

      // === LEFT HALF: SEALED HOT AIR COOLING BOX ===
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 13px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.m3.boxTitle, boxCenterX, 24);

      // Thermometer on left wall of box
      const thermX = boxLeft - 24;
      if (thermX > 18) {
        const thermTop = boxTop + 18;
        const thermH = boxH - 42;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(thermX - 5, thermTop, 10, thermH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = s.isCondensing ? '#0284c7' : '#e11d48';
        ctx.beginPath();
        ctx.arc(thermX, thermTop + thermH + 6, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const tPct = Math.max(0, Math.min(1, s.boxTempC / 45));
        const mercH = Math.max(6, tPct * (thermH - 10));
        ctx.fillStyle = s.isCondensing ? '#0284c7' : '#e11d48';
        ctx.beginPath();
        ctx.roundRect(thermX - 2.5, thermTop + thermH - mercH, 5, mercH + 5, 2.5);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = '700 10px "IBM Plex Mono", monospace';
        ctx.fillText(`${s.boxTempC.toFixed(1)}°`, thermX, thermTop - 8);
      }

      // Box Interior Air Color Interpolation (Hot Amber-Orange -> Neutral -> Cold Frost Blue)
      const hotMix = Math.max(0, Math.min(1, (s.boxTempC - 22) / 20));
      const coldMix = Math.max(0, Math.min(1, (22 - s.boxTempC) / 18));

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxLeft, boxTop, boxW, boxH, 14);
      ctx.clip();

      // Base chamber fill
      const airGrad = ctx.createLinearGradient(0, boxTop, 0, boxBottom);
      if (hotMix > 0.05) {
        airGrad.addColorStop(0, `rgba(251, 146, 60, ${0.22 * hotMix})`);
        airGrad.addColorStop(1, `rgba(254, 215, 170, ${0.14 * hotMix})`);
      } else {
        airGrad.addColorStop(0, `rgba(56, 189, 248, ${0.12 + 0.16 * coldMix})`);
        airGrad.addColorStop(1, `rgba(186, 230, 253, ${0.08 + 0.14 * coldMix})`);
      }
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(boxLeft, boxTop, boxW, boxH);
      ctx.fillStyle = airGrad;
      ctx.fillRect(boxLeft, boxTop, boxW, boxH);

      // Subtle cooling mist haze inside air when condensing
      if (s.isCondensing) {
        const mistAlpha = Math.min(0.26, 0.08 + (s.dewPointC - s.boxTempC) * 0.012);
        ctx.fillStyle = `rgba(224, 242, 254, ${mistAlpha})`;
        ctx.fillRect(boxLeft, boxTop, boxW, airSpaceH);
      }

      // Draw water vapor molecules inside air
      for (const m of a.molecules) {
        const mx = boxLeft + 10 + m.nx * (boxW - 20);
        const my = boxTop + 14 + m.ny * Math.max(16, airSpaceH - 22);
        ctx.fillStyle = s.boxTempC > s.dewPointC + 4 ? '#ea580c' : '#0284c7';
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.arc(mx, my, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw falling dew droplets (with teardrop / streak effect)
      for (const d of a.fallingDrops) {
        const dx = boxLeft + 10 + d.nx * (boxW - 20);
        // Vertical streak trail
        const trailGrad = ctx.createLinearGradient(dx, d.y - d.trail, dx, d.y);
        trailGrad.addColorStop(0, 'rgba(2, 132, 199, 0)');
        trailGrad.addColorStop(1, 'rgba(2, 132, 199, 0.55)');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = d.r * 0.9;
        ctx.beginPath();
        ctx.moveTo(dx, d.y - d.trail);
        ctx.lineTo(dx, d.y);
        ctx.stroke();

        // Droplet body
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(dx, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();

        // Crisp white specular highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dx - d.r * 0.28, d.y - d.r * 0.28, d.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw pooled liquid water at bottom of box
      if (waterPoolH > 1.5) {
        const poolGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, boxBottom);
        poolGrad.addColorStop(0, 'rgba(14, 165, 233, 0.58)');
        poolGrad.addColorStop(1, 'rgba(3, 105, 161, 0.88)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.moveTo(boxLeft, boxBottom);
        ctx.lineTo(boxLeft, waterSurfaceY);
        for (let wx = boxLeft; wx <= boxRight; wx += 8) {
          const wave = Math.sin(wx * 0.07 + a.phaseTime * 3.5) * 1.6;
          ctx.lineTo(wx, waterSurfaceY + wave);
        }
        ctx.lineTo(boxRight, boxBottom);
        ctx.closePath();
        ctx.fill();

        // Meniscus edge line
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let wx = boxLeft; wx <= boxRight; wx += 8) {
          const wave = Math.sin(wx * 0.07 + a.phaseTime * 3.5) * 1.6;
          if (wx === boxLeft) ctx.moveTo(wx, waterSurfaceY + wave);
          else ctx.lineTo(wx, waterSurfaceY + wave);
        }
        ctx.stroke();

        // Splash ripples on water surface
        for (const sp of a.splashes) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * sp.life})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(sp.x, waterSurfaceY, sp.r, sp.r * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Pooled water label inside pool if tall enough
        if (waterPoolH > 22) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 10.5px "IBM Plex Mono", "Hind Siliguri", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${t.m3.boxWaterFloorLabel}: ${s.condensedPercent.toFixed(0)}%`,
            boxCenterX,
            boxBottom - Math.min(waterPoolH * 0.42, 16)
          );
        }
      }

      // Cooling Plate / Radiator fins at top of box
      ctx.fillStyle = s.isCondensing || s.autoCooling ? '#0369a1' : '#475569';
      ctx.fillRect(boxLeft, boxTop, boxW, 10);
      for (let fx = boxLeft + 16; fx < boxRight - 10; fx += 18) {
        ctx.fillStyle = s.isCondensing || s.autoCooling ? '#38bdf8' : '#94a3b8';
        ctx.fillRect(fx, boxTop + 10, 4, 7);
      }

      ctx.restore(); // end box interior clip

      // Box glass border
      ctx.strokeStyle = s.isCondensing ? '#0284c7' : '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(boxLeft, boxTop, boxW, boxH, 14);
      ctx.stroke();

      // Temperature & Phase Tag directly above box
      const badgeTxt = s.isCondensing
        ? `${s.boxTempC.toFixed(1)}°C · ${t.m3.boxDewTag}`
        : `${s.boxTempC.toFixed(1)}°C · ${t.m3.boxHotTag}`;
      ctx.font = '700 10.5px "IBM Plex Mono", "Hind Siliguri", sans-serif';
      const bW = ctx.measureText(badgeTxt).width + 18;
      ctx.fillStyle = s.isCondensing ? '#e0f2fe' : '#fff7ed';
      ctx.strokeStyle = s.isCondensing ? '#0284c7' : '#ea580c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxCenterX - bW / 2, boxTop - 28, bW, 21, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.isCondensing ? '#0369a1' : '#9a3412';
      ctx.textAlign = 'center';
      ctx.fillText(badgeTxt, boxCenterX, boxTop - 13.5);

      // Floor Graduation ticks on right edge of box
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      for (let lvl = 1; lvl <= 3; lvl++) {
        const ty = boxBottom - (maxWaterPoolH * lvl) / 3;
        ctx.beginPath();
        ctx.moveTo(boxRight - 7, ty);
        ctx.lineTo(boxRight, ty);
        ctx.stroke();
      }

      // === RIGHT HALF: INTERACTIVE SVP CURVE F(θ) ===
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 13px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.m3.curveTitle, graphLeft + graphW / 2, 24);

      const tMin = 0;
      const tMax = 45;
      const pMax = 75;

      const mapTtoX = (temp: number) => graphLeft + ((temp - tMin) / (tMax - tMin)) * graphW;
      const mapPtoY = (p: number) => graphBottom - (Math.min(pMax, p) / pMax) * graphH;

      // Grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      for (let tt = 10; tt <= 40; tt += 10) {
        const gx = mapTtoX(tt);
        ctx.beginPath();
        ctx.moveTo(gx, graphTop);
        ctx.lineTo(gx, graphBottom);
        ctx.stroke();
      }
      for (let pp = 15; pp <= 75; pp += 15) {
        const gy = mapPtoY(pp);
        ctx.beginPath();
        ctx.moveTo(graphLeft, gy);
        ctx.lineTo(graphRight, gy);
        ctx.stroke();
      }

      // Curve fill area & line
      ctx.save();
      ctx.beginPath();
      ctx.rect(graphLeft, graphTop, graphW, graphH);
      ctx.clip();

      const areaGrad = ctx.createLinearGradient(0, graphTop, 0, graphBottom);
      areaGrad.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
      areaGrad.addColorStop(1, 'rgba(14, 165, 233, 0.02)');
      ctx.fillStyle = areaGrad;
      ctx.beginPath();
      ctx.moveTo(mapTtoX(tMin), graphBottom);
      for (let tt = tMin; tt <= tMax; tt += 0.5) {
        ctx.lineTo(mapTtoX(tt), mapPtoY(saturationVaporPressureMmHg(tt)));
      }
      ctx.lineTo(mapTtoX(tMax), graphBottom);
      ctx.closePath();
      ctx.fill();

      // Primary SVP Curve F(θ)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (let tt = tMin; tt <= tMax; tt += 0.5) {
        const px = mapTtoX(tt);
        const py = mapPtoY(saturationVaporPressureMmHg(tt));
        if (tt === tMin) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Active Cooling Path Trace:
      // Segment 1: Horizontal dashed line from (40°C, f0) left to (θ_dew, f0)
      const xHotRef = mapTtoX(INITIAL_HOT_TEMP_C);
      const yF0 = mapPtoY(s.initialMoistureMmHg);
      const xDew = mapTtoX(s.dewPointC);
      const xBox = mapTtoX(s.boxTempC);
      const yActual = mapPtoY(s.actualVaporInAir);

      ctx.strokeStyle = 'rgba(5, 150, 105, 0.45)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xHotRef, yF0);
      ctx.lineTo(xDew, yF0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlighted traversed path from (40°C, f0) to current (θ_box, actualVapor)
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      if (!s.isCondensing) {
        ctx.moveTo(xHotRef, yF0);
        ctx.lineTo(xBox, yF0);
      } else {
        ctx.moveTo(xHotRef, yF0);
        ctx.lineTo(xDew, yF0);
        for (let tt = s.dewPointC; tt >= s.boxTempC; tt -= 0.4) {
          ctx.lineTo(mapTtoX(tt), mapPtoY(saturationVaporPressureMmHg(tt)));
        }
        ctx.lineTo(xBox, yActual);
      }
      ctx.stroke();

      // If condensing (θ_box < θ_dew), show vertical Δf = condensed water gap!
      if (s.isCondensing && s.condensedDeltaMmHg > 0.2) {
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(xBox, yF0);
        ctx.lineTo(xBox, yActual);
        ctx.stroke();

        // Small horizontal reference cap at (xBox, yF0)
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.5)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(xDew, yF0);
        ctx.lineTo(xBox, yF0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Vertical drop from Dew Point (θ_dew, f0) to X-axis
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.55)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xDew, yF0);
      ctx.lineTo(xDew, graphBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axes
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(graphLeft, graphTop);
      ctx.lineTo(graphLeft, graphBottom);
      ctx.lineTo(graphRight, graphBottom);
      ctx.stroke();

      // Ticks & Labels
      ctx.fillStyle = '#334155';
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      for (let tt = 0; tt <= 40; tt += 10) {
        ctx.fillText(`${tt}°`, mapTtoX(tt), graphBottom + 15);
      }
      ctx.textAlign = 'right';
      for (let pp = 15; pp <= 75; pp += 15) {
        ctx.fillText(`${pp}`, graphLeft - 6, mapPtoY(pp) + 3.5);
      }

      ctx.font = '700 11px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`θ (${t.common.celsius})`, graphLeft + graphW / 2, graphBottom + 36);

      ctx.save();
      ctx.translate(graphLeft - 34, graphTop + graphH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`P (${t.common.mmHg})`, 0, 0);
      ctx.restore();

      // Initial Hot Air reference marker (40°C, f0)
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(xHotRef, yF0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dew Point Intersection Dot (θ_dew, f0)
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(xDew, yF0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#047857';
      ctx.textAlign = 'center';
      ctx.fillText(`θ_dew=${s.dewPointC.toFixed(1)}°`, xDew, yF0 - 11);

      // Live Box Air State Marker (θ_box, actualVaporInAir)
      if (s.isCondensing) {
        const pulse = 9 + Math.sin(a.phaseTime * 5) * 2.5;
        ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.beginPath();
        ctx.arc(xBox, yActual, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = s.isCondensing ? '#0284c7' : '#0f172a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(xBox, yActual, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Δf Condensed label next to red bracket
      if (s.isCondensing && s.condensedDeltaMmHg > 1.5) {
        ctx.fillStyle = '#be123c';
        ctx.font = '700 10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `Δf=${s.condensedDeltaMmHg.toFixed(1)}`,
          Math.min(graphRight - 56, xBox + 7),
          (yF0 + yActual) * 0.5 + 3.5
        );
      }

      // Curve hover inspector
      if (s.hoverTempC !== null && s.hoverTempC >= tMin && s.hoverTempC <= tMax) {
        const hx = mapTtoX(s.hoverTempC);
        const hp = saturationVaporPressureMmHg(s.hoverTempC);
        const hy = mapPtoY(hp);
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        const tip = `${s.hoverTempC.toFixed(1)}°C → F=${hp.toFixed(1)} mmHg`;
        const tw = ctx.measureText(tip).width + 12;
        const bx = Math.min(graphRight - tw - 4, Math.max(graphLeft + 4, hx - tw / 2));
        const by = Math.max(graphTop + 6, hy - 28);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(bx, by, tw, 19, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(tip, bx + tw / 2, by + 13);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [t]);

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = graphBoundsRef.current;

    if (x >= g.graphLeft && x <= g.graphRight && y >= g.graphTop && y <= g.graphBottom) {
      const frac = (x - g.graphLeft) / (g.graphRight - g.graphLeft);
      setHoverTempC(Math.max(0, Math.min(45, frac * 45)));
    } else {
      setHoverTempC(null);
    }
  };

  const comfortBadge = {
    dry: {
      label: t.m3.comfortDry,
      cls: 'bg-amber-50 border-amber-300 text-amber-800',
    },
    comfortable: {
      label: t.m3.comfortComfortable,
      cls: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    },
    humid: {
      label: t.m3.comfortHumid,
      cls: 'bg-sky-50 border-sky-300 text-sky-900',
    },
  }[comfort];

  const statusText = isCondensing
    ? t.m3.statusDewFalling
    : boxTempC >= 32
    ? t.m3.statusHotAir
    : t.m3.statusCoolingUnsat;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:p-6">
      {/* Left Vertical Control Sidebar (340px) */}
      <aside className="w-full shrink-0 rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-sm lg:w-[340px]">
        <div className="mb-5 border-b border-sky-100 pb-3">
          <h2 className="text-sm font-bold text-slate-950">{t.common.controlsHeader}</h2>
        </div>

        <div className="space-y-6">
          <ProgressiveSlider
            id="m3-box-temp"
            label={t.m3.boxTempLabel}
            value={boxTempC}
            min={0}
            max={45}
            step={0.2}
            unit={t.common.celsius}
            precision={1}
            onChange={(val) => {
              setAutoCooling(false);
              setBoxTempC(val);
            }}
            subLabel={isCondensing ? '● Dew Falling' : `F = ${svpAtBox.toFixed(1)} mmHg`}
          />

          <ProgressiveSlider
            id="m3-initial-moisture"
            label={t.m3.initialMoistureLabel}
            value={initialMoistureMmHg}
            min={8}
            max={35}
            step={0.5}
            unit={t.common.mmHg}
            precision={1}
            onChange={setInitialMoistureMmHg}
            subLabel={`θ_dew = ${dewPointC.toFixed(1)}°C`}
          />

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                if (!autoCooling && boxTempC <= 6) {
                  setBoxTempC(INITIAL_HOT_TEMP_C);
                }
                setAutoCooling((c) => !c);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-700 bg-sky-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Snowflake className="h-4 w-4 shrink-0" />
              <span>{autoCooling ? t.m3.autoCoolingActive : t.m3.autoCoolBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoCooling(false);
                setBoxTempC(INITIAL_HOT_TEMP_C);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100"
            >
              <Flame className="h-4 w-4 text-orange-600 shrink-0" />
              <span>{t.m3.reheatBtn}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Center Split Canvas Stage */}
      <section className="flex min-h-[480px] flex-1 min-w-0 flex-col rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-sm lg:min-h-[600px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">{t.m3.stageTitle}</h2>
            <p className="text-xs text-slate-600">{t.m3.stageSubtitle}</p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap ${
              isCondensing
                ? 'border-sky-300 bg-sky-50 text-sky-900'
                : 'border-orange-300 bg-orange-50 text-orange-900'
            }`}
          >
            <Droplets className="h-3.5 w-3.5 shrink-0" />
            <span>{statusText}</span>
          </div>
        </div>

        <div className="relative flex-1 min-h-[380px] w-full overflow-hidden rounded-xl border border-sky-100 bg-sky-50/40">
          <canvas
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerLeave={() => setHoverTempC(null)}
            className="block h-full w-full cursor-crosshair"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1 w-5 rounded bg-sky-600" />
            <span>{t.m3.legendCurve}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1 w-5 rounded bg-emerald-600" />
            <span>{t.m3.legendTrace}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-1 rounded bg-rose-600" />
            <span>{t.m3.legendCondensed}</span>
          </span>
        </div>
      </section>

      {/* Right Telemetry Panel (330px) */}
      <aside className="w-full shrink-0 rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-sm lg:w-[330px]">
        <div className="mb-4 border-b border-sky-100 pb-3">
          <h2 className="text-sm font-bold text-slate-950">{t.common.telemetryHeader}</h2>
        </div>

        <div className="space-y-3.5">
          {/* Dew Point Highlight Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="text-[11px] font-semibold text-emerald-900">{t.m3.dewPointLabel}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono-tabular text-3xl font-bold text-emerald-800">
                {dewPointC.toFixed(1)}
                <span className="ml-1 text-sm font-semibold text-emerald-700">{t.common.celsius}</span>
              </span>
              <span className="font-mono-tabular text-xs font-semibold text-slate-700">
                {t.m3.boxTempShort}: {boxTempC.toFixed(1)}°C
              </span>
            </div>
          </div>

          {/* Relative Humidity Card + Comfort Status */}
          <div className="rounded-xl border border-sky-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">{t.m3.relHumidityLabel}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${comfortBadge.cls}`}>
                {comfortBadge.label}
              </span>
            </div>
            <div className="mt-1.5 font-mono-tabular text-3xl font-bold text-sky-800">
              {rhPercent.toFixed(1)}
              <span className="ml-1 text-base font-semibold text-sky-600">{t.common.percent}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-all duration-150"
                style={{ width: `${rhPercent}%` }}
              />
            </div>
          </div>

          {/* Condensed Water & Vapor Balance */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span>{t.m3.initialVaporShort}</span>
              <span className="font-mono-tabular font-bold text-orange-700">
                {initialMoistureMmHg.toFixed(1)} {t.common.mmHg}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>{t.m3.actualVaporShort}</span>
              <span className="font-mono-tabular font-bold text-emerald-800">
                {actualVaporInAir.toFixed(2)} {t.common.mmHg}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>{t.m3.svpAtBoxLabel}</span>
              <span className="font-mono-tabular font-bold text-sky-800">
                {svpAtBox.toFixed(2)} {t.common.mmHg}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-slate-900 font-semibold">
              <span>{t.m3.condensedWaterLabel}</span>
              <span className="font-mono-tabular font-bold text-rose-700">
                {condensedDeltaMmHg.toFixed(2)} {t.common.mmHg} ({condensedPercent.toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* Insight Box */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
            <div className="mb-1 text-xs font-bold text-sky-900">{t.common.keyInsight}</div>
            <p className="text-xs leading-relaxed text-slate-700">
              {isCondensing ? t.m3.insightCondensing : t.m3.insightUnsaturated}
            </p>
            <div className="mt-2.5 border-t border-sky-200/80 pt-2 font-mono-tabular text-[11px] font-semibold text-slate-800">
              f = min(f₀, F(θ)) · Δf = max(0, f₀ − F(θ))
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
