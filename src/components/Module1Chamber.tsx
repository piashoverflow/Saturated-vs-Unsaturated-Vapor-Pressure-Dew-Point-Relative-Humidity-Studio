import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Wind, Droplets, Sparkles } from 'lucide-react';
import { Translations } from '../i18n/translations';
import { mmHgToKPa, saturationVaporPressureMmHg } from '../physics/vaporPhysics';
import { ProgressiveSlider } from './ProgressiveSlider';

interface Module1ChamberProps {
  t: Translations;
  resetSignal: number;
}

type LiquidSupply = 'abundant' | 'tiny';

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'vapor' | 'air';
  angle: number;
  spin: number;
}

interface PhaseArrow {
  x: number;
  y: number;
  type: 'evap' | 'cond';
  life: number; // 0..1
}

interface TelemetryM1 {
  svpMmHg: number;
  actualVaporMmHg: number;
  dryAirMmHg: number;
  totalPressureMmHg: number;
  evapRateNorm: number; // 0..100
  condRateNorm: number; // 0..100
  liquidPercent: number;
  status: 'equilibrium' | 'evaporating' | 'condensing' | 'exhausted';
}

const TINY_TOTAL_UNITS = 42.0; // equivalent mmHg at 25°C

export const Module1Chamber: React.FC<Module1ChamberProps> = ({ t, resetSignal }) => {
  const [tempC, setTempC] = useState<number>(25);
  const [liquidSupply, setLiquidSupply] = useState<LiquidSupply>('abundant');
  const [dryAirEnabled, setDryAirEnabled] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const [telemetry, setTelemetry] = useState<TelemetryM1>(() => {
    const svp = saturationVaporPressureMmHg(25);
    return {
      svpMmHg: svp,
      actualVaporMmHg: svp,
      dryAirMmHg: 0,
      totalPressureMmHg: svp,
      evapRateNorm: (svp / 760) * 100,
      condRateNorm: (svp / 760) * 100,
      liquidPercent: 100,
      status: 'equilibrium',
    };
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable simulation physics state for 60 FPS loop
  const simRef = useRef({
    tempC: 25,
    liquidSupply: 'abundant' as LiquidSupply,
    dryAirEnabled: false,
    isPlaying: true,
    vaporMmHg: saturationVaporPressureMmHg(25),
    tinyLiquidUnits: 34.0,
    evapRate: saturationVaporPressureMmHg(25),
    condRate: saturationVaporPressureMmHg(25),
    molecules: [] as Molecule[],
    arrows: [] as PhaseArrow[],
    arrowCooldownEvap: 0,
    arrowCooldownCond: 0,
    phaseTime: 0,
    lastUiSync: 0,
  });

  // Sync React controls to simRef
  useEffect(() => {
    simRef.current.tempC = tempC;
  }, [tempC]);

  useEffect(() => {
    simRef.current.liquidSupply = liquidSupply;
    if (liquidSupply === 'tiny') {
      const currentUnits = (simRef.current.vaporMmHg * 298.15) / (simRef.current.tempC + 273.15);
      simRef.current.tinyLiquidUnits = Math.max(8, TINY_TOTAL_UNITS - Math.min(currentUnits, TINY_TOTAL_UNITS - 6));
      if (currentUnits > TINY_TOTAL_UNITS) {
        simRef.current.vaporMmHg = (TINY_TOTAL_UNITS - 8) * ((simRef.current.tempC + 273.15) / 298.15);
      }
    }
  }, [liquidSupply]);

  useEffect(() => {
    simRef.current.dryAirEnabled = dryAirEnabled;
  }, [dryAirEnabled]);

  useEffect(() => {
    simRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  // Global reset signal
  useEffect(() => {
    if (resetSignal === 0) return;
    const svp25 = saturationVaporPressureMmHg(25);
    setTempC(25);
    setLiquidSupply('abundant');
    setDryAirEnabled(false);
    setIsPlaying(true);
    simRef.current.tempC = 25;
    simRef.current.liquidSupply = 'abundant';
    simRef.current.dryAirEnabled = false;
    simRef.current.isPlaying = true;
    simRef.current.vaporMmHg = svp25;
    simRef.current.tinyLiquidUnits = 34.0;
    simRef.current.arrows = [];
  }, [resetSignal]);

  const handleEvacuateVapor = () => {
    simRef.current.vaporMmHg = 0;
    simRef.current.arrows = [];
    if (simRef.current.liquidSupply === 'tiny' && simRef.current.tinyLiquidUnits < 10) {
      simRef.current.tinyLiquidUnits = TINY_TOTAL_UNITS;
    }
  };

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

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const s = simRef.current;
      const parent = canvas.parentElement;
      const W = parent ? parent.clientWidth : 640;
      const H = parent ? parent.clientHeight : 480;

      // Chamber bounds inside canvas
      const chamberW = Math.min(440, W * 0.62);
      const chamberH = Math.min(390, H * 0.76);
      const cx = W * 0.5 + 16;
      const cy = H * 0.54;
      const left = cx - chamberW / 2;
      const right = cx + chamberW / 2;
      const top = cy - chamberH / 2;
      const bottom = cy + chamberH / 2;

      const svp = saturationVaporPressureMmHg(s.tempC);
      const thermalFactor = (s.tempC + 273.15) / 298.15;

      if (s.isPlaying) {
        s.phaseTime += dt;

        // Physics update for vapor pressure & liquid mass
        const kRate = 1.65;
        if (s.liquidSupply === 'abundant') {
          s.evapRate = svp;
          s.condRate = s.vaporMmHg;
          s.vaporMmHg += (s.evapRate - s.condRate) * kRate * dt;
          s.vaporMmHg = Math.max(0, s.vaporMmHg);
        } else {
          // Tiny exhaustible droplet
          const hasLiquid = s.tinyLiquidUnits > 0.05;
          s.evapRate = hasLiquid ? svp : 0;
          s.condRate = s.vaporMmHg;

          // Net vapor flux in mmHg/s -> convert to units/s
          const dVaporMmHg = (s.evapRate - s.condRate) * kRate * dt;
          const dUnits = dVaporMmHg / thermalFactor;

          if (dUnits > 0) {
            const actualEvapUnits = Math.min(dUnits, s.tinyLiquidUnits);
            s.tinyLiquidUnits -= actualEvapUnits;
            s.vaporMmHg += actualEvapUnits * thermalFactor;
          } else {
            // Condensation replenishes liquid
            const actualCondUnits = -dUnits;
            s.tinyLiquidUnits = Math.min(TINY_TOTAL_UNITS, s.tinyLiquidUnits + actualCondUnits);
            s.vaporMmHg = Math.max(0, s.vaporMmHg + dVaporMmHg);
          }

          if (s.tinyLiquidUnits <= 0.05) {
            s.tinyLiquidUnits = 0;
            s.evapRate = 0;
            // Once liquid is exhausted, condensation also stops (no liquid pool, dry wall equilibrium)
            if (s.vaporMmHg < svp) {
              s.condRate = 0;
            }
          }
        }
      }

      // Compute liquid surface Y
      const liquidHeight =
        s.liquidSupply === 'abundant'
          ? chamberH * 0.23
          : chamberH * 0.12 * (s.tinyLiquidUnits / TINY_TOTAL_UNITS);
      const surfaceY = bottom - liquidHeight;

      // Target molecule counts
      const targetVaporCount = Math.round(
        s.vaporMmHg < 0.3 ? 0 : Math.min(95, 5 + Math.pow(s.vaporMmHg / 760, 0.52) * 90)
      );
      const targetAirCount = s.dryAirEnabled ? 42 : 0;

      const currentVapor = s.molecules.filter((m) => m.kind === 'vapor');
      const currentAir = s.molecules.filter((m) => m.kind === 'air');

      const speedScale = 95 * Math.sqrt((s.tempC + 273.15) / 298.15);

      if (currentVapor.length < targetVaporCount) {
        const toAdd = Math.min(4, targetVaporCount - currentVapor.length);
        for (let i = 0; i < toAdd; i++) {
          const ang = -Math.PI * (0.15 + Math.random() * 0.7);
          s.molecules.push({
            x: left + 18 + Math.random() * (chamberW - 36),
            y: surfaceY - 8 - Math.random() * Math.max(20, (surfaceY - top) * 0.4),
            vx: Math.cos(ang) * speedScale * (0.8 + Math.random() * 0.5),
            vy: Math.sin(ang) * speedScale * (0.8 + Math.random() * 0.5),
            kind: 'vapor',
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 3,
          });
        }
      } else if (currentVapor.length > targetVaporCount) {
        let removeCount = currentVapor.length - targetVaporCount;
        s.molecules = s.molecules.filter((m) => {
          if (m.kind === 'vapor' && removeCount > 0) {
            removeCount--;
            return false;
          }
          return true;
        });
      }

      if (currentAir.length < targetAirCount) {
        for (let i = currentAir.length; i < targetAirCount; i++) {
          const ang = Math.random() * Math.PI * 2;
          s.molecules.push({
            x: left + 18 + Math.random() * (chamberW - 36),
            y: top + 18 + Math.random() * Math.max(30, surfaceY - top - 36),
            vx: Math.cos(ang) * speedScale * 1.15,
            vy: Math.sin(ang) * speedScale * 1.15,
            kind: 'air',
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 4,
          });
        }
      } else if (currentAir.length > targetAirCount) {
        s.molecules = s.molecules.filter((m) => m.kind !== 'air');
      }

      // Move molecules
      if (s.isPlaying) {
        for (const m of s.molecules) {
          const targetSpd = speedScale * (m.kind === 'air' ? 1.15 : 1.0);
          const curSpd = Math.hypot(m.vx, m.vy) || 1;
          const blend = 0.04;
          const nextSpd = curSpd + (targetSpd - curSpd) * blend;
          m.vx = (m.vx / curSpd) * nextSpd;
          m.vy = (m.vy / curSpd) * nextSpd;

          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.angle += m.spin * dt;

          if (m.x < left + 12) {
            m.x = left + 12;
            m.vx = Math.abs(m.vx);
          } else if (m.x > right - 12) {
            m.x = right - 12;
            m.vx = -Math.abs(m.vx);
          }

          if (m.y < top + 12) {
            m.y = top + 12;
            m.vy = Math.abs(m.vy);
          } else if (m.y > surfaceY - 10) {
            m.y = surfaceY - 10;
            m.vy = -Math.abs(m.vy);
          }
        }

        // Spawn phase arrows proportional to rates
        const evapFreq = s.evapRate > 0.1 ? 0.8 + Math.pow(s.evapRate / 760, 0.45) * 5.5 : 0;
        const condFreq = s.condRate > 0.1 ? 0.8 + Math.pow(s.condRate / 760, 0.45) * 5.5 : 0;

        s.arrowCooldownEvap -= dt * evapFreq;
        if (s.arrowCooldownEvap <= 0 && evapFreq > 0 && liquidHeight > 2) {
          s.arrowCooldownEvap = 0.65 + Math.random() * 0.5;
          const xRange = s.liquidSupply === 'abundant' ? chamberW - 60 : Math.min(130, chamberW * 0.4);
          s.arrows.push({
            x: cx + (Math.random() - 0.5) * xRange,
            y: surfaceY,
            type: 'evap',
            life: 1.0,
          });
        }

        s.arrowCooldownCond -= dt * condFreq;
        if (s.arrowCooldownCond <= 0 && condFreq > 0 && liquidHeight > 2) {
          s.arrowCooldownCond = 0.65 + Math.random() * 0.5;
          const xRange = s.liquidSupply === 'abundant' ? chamberW - 60 : Math.min(130, chamberW * 0.4);
          s.arrows.push({
            x: cx + (Math.random() - 0.5) * xRange,
            y: surfaceY,
            type: 'cond',
            life: 1.0,
          });
        }

        for (const arr of s.arrows) {
          arr.life -= dt * 1.15;
        }
        s.arrows = s.arrows.filter((a) => a.life > 0);
      }

      // === DRAW CANVAS ===
      ctx.clearRect(0, 0, W, H);

      // Subtle laboratory backdrop grid
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 24; gx < W; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 24; gy < H; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Thermometer on left side of chamber
      const thermX = left - 44;
      const thermTop = top + 20;
      const thermH = chamberH - 46;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(thermX - 7, thermTop, 14, thermH, 7);
      ctx.fill();
      ctx.stroke();

      // Bulb
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(thermX, thermTop + thermH + 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mercury column
      const mercPct = s.tempC / 100;
      const mercH = Math.max(8, mercPct * (thermH - 12));
      const mercGrad = ctx.createLinearGradient(0, thermTop + thermH - mercH, 0, thermTop + thermH);
      mercGrad.addColorStop(0, '#f43f5e');
      mercGrad.addColorStop(1, '#e11d48');
      ctx.fillStyle = mercGrad;
      ctx.beginPath();
      ctx.roundRect(thermX - 3.5, thermTop + thermH - mercH, 7, mercH + 6, 3.5);
      ctx.fill();

      // Thermometer label
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.tempC.toFixed(1)}°C`, thermX, thermTop - 10);

      // Chamber interior background
      const chamberGrad = ctx.createLinearGradient(0, top, 0, bottom);
      chamberGrad.addColorStop(0, 'rgba(240, 249, 255, 0.92)');
      chamberGrad.addColorStop(1, 'rgba(224, 242, 254, 0.65)');
      ctx.fillStyle = chamberGrad;
      ctx.beginPath();
      ctx.roundRect(left, top, chamberW, chamberH, 16);
      ctx.fill();

      // Liquid Water Layer
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(left + 2, top + 2, chamberW - 4, chamberH - 4, 14);
      ctx.clip();

      if (liquidHeight > 1.5) {
        if (s.liquidSupply === 'abundant') {
          const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, bottom);
          waterGrad.addColorStop(0, 'rgba(14, 165, 233, 0.42)');
          waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.72)');
          ctx.fillStyle = waterGrad;
          ctx.beginPath();
          ctx.moveTo(left, bottom);
          ctx.lineTo(left, surfaceY);
          const waveAmp = 2 + (s.tempC / 100) * 2.5;
          for (let wx = left; wx <= right; wx += 10) {
            const wy = surfaceY + Math.sin(wx * 0.05 + s.phaseTime * (2.5 + s.tempC * 0.04)) * waveAmp;
            ctx.lineTo(wx, wy);
          }
          ctx.lineTo(right, bottom);
          ctx.closePath();
          ctx.fill();

          // Meniscus highlight
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let wx = left; wx <= right; wx += 10) {
            const wy = surfaceY + Math.sin(wx * 0.05 + s.phaseTime * (2.5 + s.tempC * 0.04)) * waveAmp;
            if (wx === left) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.stroke();
        } else {
          // Tiny puddle droplet in center
          const dropFrac = s.tinyLiquidUnits / TINY_TOTAL_UNITS;
          const puddleW = 48 + dropFrac * 120;
          const puddleH = Math.max(4, liquidHeight);
          const waterGrad = ctx.createRadialGradient(
            cx,
            bottom - puddleH * 0.4,
            4,
            cx,
            bottom,
            puddleW * 0.65
          );
          waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
          waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.85)');
          ctx.fillStyle = waterGrad;
          ctx.beginPath();
          ctx.moveTo(cx - puddleW / 2, bottom);
          ctx.quadraticCurveTo(cx, bottom - puddleH * 1.9, cx + puddleW / 2, bottom);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw molecules inside clipped chamber
      for (const m of s.molecules) {
        if (m.kind === 'air') {
          // Dry air diatomic N2/O2 in slate-indigo
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.angle);
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(-3.5, 0, 3.6, 0, Math.PI * 2);
          ctx.arc(3.5, 0, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Water vapor H2O triatomic molecule (Sky blue core + white hydrogens)
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.angle);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e0f2fe';
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(-5, -3.8, 2.7, 0, Math.PI * 2);
          ctx.arc(5, -3.8, 2.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw dynamic evaporation & condensation phase arrows
      for (const arr of s.arrows) {
        const alpha = Math.sin(arr.life * Math.PI);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        const offset = (1 - arr.life) * 44;

        if (arr.type === 'evap') {
          // Upward Sky Blue arrow
          const yStart = arr.y - offset;
          const yEnd = yStart - 34;
          ctx.strokeStyle = '#0284c7';
          ctx.fillStyle = '#0284c7';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(arr.x, yStart);
          ctx.lineTo(arr.x, yEnd);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arr.x, yEnd - 6);
          ctx.lineTo(arr.x - 5.5, yEnd + 4);
          ctx.lineTo(arr.x + 5.5, yEnd + 4);
          ctx.closePath();
          ctx.fill();
        } else {
          // Downward Emerald Green arrow
          const yStart = arr.y - 46 + offset;
          const yEnd = yStart + 34;
          ctx.strokeStyle = '#059669';
          ctx.fillStyle = '#059669';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(arr.x, yStart);
          ctx.lineTo(arr.x, yEnd);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arr.x, yEnd + 6);
          ctx.lineTo(arr.x - 5.5, yEnd - 4);
          ctx.lineTo(arr.x + 5.5, yEnd - 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore(); // end chamber clip

      // Glass chamber outer border
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(left, top, chamberW, chamberH, 16);
      ctx.stroke();

      // Metallic top lid & pressure stem
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(left + 28, top - 12, chamberW - 56, 12, 4);
      ctx.fill();

      // Top Pressure Dial Gauge connected via neck
      const gaugeX = cx;
      const gaugeY = top - 50;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(gaugeX, top - 12);
      ctx.lineTo(gaugeX, gaugeY + 28);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dial arc and needle
      const dryAirMmHg = s.dryAirEnabled ? 250 * thermalFactor : 0;
      const totalP = s.vaporMmHg + dryAirMmHg;
      const maxDial = 1100;
      const normAngle = Math.min(1, totalP / maxDial);
      const needleAng = Math.PI * 0.75 + normAngle * Math.PI * 1.5;

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 24, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();

      ctx.strokeStyle = s.dryAirEnabled ? '#475569' : '#0284c7';
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 24, Math.PI * 0.75, needleAng);
      ctx.stroke();

      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY);
      ctx.lineTo(gaugeX + Math.cos(needleAng) * 21, gaugeY + Math.sin(needleAng) * 21);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${totalP.toFixed(0)}`, gaugeX, gaugeY + 18);

      // Sync React telemetry ~15 times per second
      if (now - s.lastUiSync > 65) {
        s.lastUiSync = now;
        const diff = Math.abs(s.evapRate - s.condRate);
        const relDiff = svp > 0 ? diff / svp : 0;
        let status: TelemetryM1['status'] = 'equilibrium';

        if (s.liquidSupply === 'tiny' && s.tinyLiquidUnits <= 0.05 && s.vaporMmHg < svp - 0.3) {
          status = 'exhausted';
        } else if (relDiff < 0.025 && Math.abs(s.vaporMmHg - svp) < Math.max(0.6, svp * 0.025)) {
          status = 'equilibrium';
        } else if (s.evapRate > s.condRate) {
          status = 'evaporating';
        } else {
          status = 'condensing';
        }

        const scaleMax = Math.max(svp * 1.15, s.vaporMmHg * 1.15, 25);

        setTelemetry({
          svpMmHg: svp,
          actualVaporMmHg: s.vaporMmHg,
          dryAirMmHg,
          totalPressureMmHg: totalP,
          evapRateNorm: Math.min(100, (s.evapRate / scaleMax) * 100),
          condRateNorm: Math.min(100, (s.condRate / scaleMax) * 100),
          liquidPercent:
            s.liquidSupply === 'abundant' ? 100 : (s.tinyLiquidUnits / TINY_TOTAL_UNITS) * 100,
          status,
        });
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  const statusConfig = {
    equilibrium: {
      text: t.m1.equilibriumBadge,
      cls: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      dot: '●',
    },
    evaporating: {
      text: t.m1.evaporatingBadge,
      cls: 'bg-sky-50 border-sky-300 text-sky-800',
      dot: '▲',
    },
    condensing: {
      text: t.m1.condensingBadge,
      cls: 'bg-amber-50 border-amber-300 text-amber-800',
      dot: '▼',
    },
    exhausted: {
      text: t.m1.unsaturatedExhaustedBadge,
      cls: 'bg-rose-50 border-rose-300 text-rose-800',
      dot: '○',
    },
  }[telemetry.status];

  const insightMessage = dryAirEnabled
    ? t.m1.insightDalton
    : telemetry.status === 'exhausted'
    ? t.m1.insightExhausted
    : t.m1.insightEquilibrium;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:p-6">
      {/* Left Vertical Control Sidebar (340px) */}
      <aside className="w-full shrink-0 rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-sm lg:w-[340px]">
        <div className="mb-5 flex items-center justify-between border-b border-sky-100 pb-3">
          <h2 className="text-sm font-bold text-slate-950">{t.common.controlsHeader}</h2>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900 transition-colors hover:bg-sky-100"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? t.common.pause : t.common.play}</span>
          </button>
        </div>

        <div className="space-y-6">
          <ProgressiveSlider
            id="m1-temp"
            label={t.m1.tempLabel}
            value={tempC}
            min={0}
            max={100}
            step={0.5}
            unit={t.common.celsius}
            precision={1}
            onChange={setTempC}
            subLabel={`F = ${saturationVaporPressureMmHg(tempC).toFixed(1)} ${t.common.mmHg}`}
          />

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">{t.m1.liquidSupplyLabel}</div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setLiquidSupply('abundant')}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                  liquidSupply === 'abundant'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                    : 'border-sky-200 bg-white text-slate-700 hover:bg-sky-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>{t.m1.abundantLiquid}</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-emerald-700">∞</span>
              </button>

              <button
                type="button"
                onClick={() => setLiquidSupply('tiny')}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                  liquidSupply === 'tiny'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                    : 'border-sky-200 bg-white text-slate-700 hover:bg-sky-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{t.m1.tinyDroplet}</span>
                </span>
                <span className="font-mono-tabular text-[11px] text-slate-500">
                  {telemetry.liquidPercent.toFixed(0)}%
                </span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEvacuateVapor}
            className="w-full rounded-xl border border-sky-700 bg-sky-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {t.m1.evacuateBtn}
          </button>

          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
            <label className="flex cursor-pointer items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-950">
                  <Wind className="h-3.5 w-3.5 text-slate-700" />
                  <span>{t.m1.dryAirToggle}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">{t.m1.dryAirDesc}</p>
              </div>
              <input
                type="checkbox"
                checked={dryAirEnabled}
                onChange={(e) => setDryAirEnabled(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600 cursor-pointer rounded"
              />
            </label>
          </div>
        </div>
      </aside>

      {/* Center Canvas Stage */}
      <section className="flex min-h-[480px] flex-1 min-w-0 flex-col rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-sm lg:min-h-[600px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">{t.m1.stageTitle}</h2>
            <p className="text-xs text-slate-600">{t.m1.stageSubtitle}</p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap ${statusConfig.cls}`}
          >
            <span>{statusConfig.dot}</span>
            <span>{statusConfig.text}</span>
          </div>
        </div>

        <div className="relative flex-1 min-h-[380px] w-full overflow-hidden rounded-xl border border-sky-100 bg-sky-50/40">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>

        {/* Clean Canvas Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-sky-600">↑</span>
            <span>{t.m1.legendEvap}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-emerald-600">↓</span>
            <span>{t.m1.legendCond}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
            <span>{t.m1.legendVapor}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-600" />
            <span>{t.m1.legendDryAir}</span>
          </span>
        </div>
      </section>

      {/* Right Telemetry Panel (330px) */}
      <aside className="w-full shrink-0 rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-sm lg:w-[330px]">
        <div className="mb-4 border-b border-sky-100 pb-3">
          <h2 className="text-sm font-bold text-slate-950">{t.common.telemetryHeader}</h2>
        </div>

        <div className="space-y-4">
          {/* Dual Rate Meter */}
          <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>{t.m1.evapRateLabel}</span>
                <span className="font-mono-tabular text-sky-700">
                  {telemetry.status === 'exhausted'
                    ? '0.0'
                    : telemetry.svpMmHg.toFixed(1)}{' '}
                  u/s
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-sky-100">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all duration-100"
                  style={{
                    width: `${telemetry.status === 'exhausted' ? 0 : telemetry.evapRateNorm}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>{t.m1.condRateLabel}</span>
                <span className="font-mono-tabular text-emerald-700">
                  {telemetry.status === 'exhausted'
                    ? '0.0'
                    : telemetry.actualVaporMmHg.toFixed(1)}{' '}
                  u/s
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-100"
                  style={{
                    width: `${telemetry.status === 'exhausted' ? 0 : telemetry.condRateNorm}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Primary Pressure Readouts */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="rounded-xl border border-sky-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-slate-600">{t.m1.svpLabel}</div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono-tabular text-2xl font-bold text-sky-800">
                  {telemetry.svpMmHg.toFixed(2)}
                  <span className="ml-1 text-xs font-medium text-slate-500">{t.common.mmHg}</span>
                </span>
                <span className="font-mono-tabular text-xs font-semibold text-slate-600">
                  {mmHgToKPa(telemetry.svpMmHg).toFixed(2)} {t.common.kPa}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
              <div className="text-[11px] font-semibold text-slate-700">{t.m1.actualVaporLabel}</div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono-tabular text-2xl font-bold text-emerald-800">
                  {telemetry.actualVaporMmHg.toFixed(2)}
                  <span className="ml-1 text-xs font-medium text-slate-500">{t.common.mmHg}</span>
                </span>
                <span className="font-mono-tabular text-xs font-semibold text-slate-600">
                  {mmHgToKPa(telemetry.actualVaporMmHg).toFixed(2)} {t.common.kPa}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>{t.m1.dryAirPressureLabel}</span>
                <span className="font-mono-tabular font-bold">
                  {telemetry.dryAirMmHg.toFixed(1)} {t.common.mmHg}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-bold text-slate-950">
                <span>{t.m1.totalPressureLabel}</span>
                <span className="font-mono-tabular text-sm text-slate-950">
                  {telemetry.totalPressureMmHg.toFixed(1)} {t.common.mmHg}
                </span>
              </div>
            </div>
          </div>

          {/* Insight Box */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
            <div className="mb-1 text-xs font-bold text-sky-900">{t.common.keyInsight}</div>
            <p className="text-xs leading-relaxed text-slate-700">{insightMessage}</p>
            <div className="mt-2.5 border-t border-sky-200/80 pt-2 font-mono-tabular text-[11px] font-semibold text-slate-800">
              P_total = P_air + f_vapor
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
