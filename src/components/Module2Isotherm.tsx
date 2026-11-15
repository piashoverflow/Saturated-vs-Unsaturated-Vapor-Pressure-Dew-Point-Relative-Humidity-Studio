import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, ArrowDownToLine } from 'lucide-react';
import { Translations } from '../i18n/translations';
import {
  computeIsothermState,
  MODULE2_V_MAX,
  MODULE2_V_MIN,
  MODULE2_V_SAT,
  saturationVaporPressureMmHg,
} from '../physics/vaporPhysics';
import { ProgressiveSlider } from './ProgressiveSlider';

interface Module2IsothermProps {
  t: Translations;
  resetSignal: number;
}

interface VaporParticle {
  nx: number; // normalized 0..1 inside cylinder width
  ny: number; // normalized 0..1 inside gas space
  vx: number;
  vy: number;
}

interface FallingDrop {
  nx: number;
  y: number;
  vy: number;
  r: number;
}

export const Module2Isotherm: React.FC<Module2IsothermProps> = ({ t, resetSignal }) => {
  const [volumeL, setVolumeL] = useState<number>(8.5);
  const [tempC, setTempC] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const volumeRef = useRef<number>(volumeL);
  const tempRef = useRef<number>(tempC);
  const playingRef = useRef<boolean>(isPlaying);
  const dragModeRef = useRef<'none' | 'piston' | 'graph'>('none');

  // Track geometry for hit-testing pointer drag
  const layoutRef = useRef({
    cylLeft: 40,
    cylRight: 200,
    cylTop: 60,
    cylBottom: 400,
    graphLeft: 280,
    graphRight: 600,
    graphTop: 60,
    graphBottom: 400,
  });

  const particlesRef = useRef<{
    particles: VaporParticle[];
    drops: FallingDrop[];
    prevVolume: number;
    phaseTime: number;
  }>({
    particles: Array.from({ length: 48 }, () => ({
      nx: 0.08 + Math.random() * 0.84,
      ny: 0.08 + Math.random() * 0.84,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
    })),
    drops: [],
    prevVolume: 8.5,
    phaseTime: 0,
  });

  useEffect(() => {
    volumeRef.current = volumeL;
  }, [volumeL]);

  useEffect(() => {
    tempRef.current = tempC;
  }, [tempC]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (resetSignal === 0) return;
    setVolumeL(8.5);
    setTempC(30);
    setIsPlaying(true);
    particlesRef.current.drops = [];
  }, [resetSignal]);

  const iso = computeIsothermState(tempC, volumeL);

  // Canvas 60 FPS loop
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

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const parent = canvas.parentElement;
      const W = parent ? parent.clientWidth : 700;
      const H = parent ? parent.clientHeight : 480;

      const V = volumeRef.current;
      const T = tempRef.current;
      const state = computeIsothermState(T, V);
      const pRef = particlesRef.current;

      // Layout Split: Left Piston (~42%), Right Graph (~58%)
      const isCompact = W < 540;
      const splitX = isCompact ? W * 0.44 : W * 0.41;

      const cylW = Math.min(156, splitX * 0.56);
      const cylCenterX = splitX * 0.5 - 12;
      const cylLeft = cylCenterX - cylW / 2;
      const cylRight = cylCenterX + cylW / 2;
      const cylTop = 74;
      const cylBottom = H - 46;
      const cylH = cylBottom - cylTop;

      const graphLeft = splitX + 54;
      const graphRight = W - 24;
      const graphTop = 58;
      const graphBottom = H - 52;
      const graphW = Math.max(120, graphRight - graphLeft);
      const graphH = Math.max(120, graphBottom - graphTop);

      layoutRef.current = {
        cylLeft,
        cylRight,
        cylTop,
        cylBottom,
        graphLeft,
        graphRight,
        graphTop,
        graphBottom,
      };

      // Liquid pool height when V < V_sat
      const maxLiquidH = cylH * 0.14;
      const liquidH = state.isSaturated ? state.condensedFraction * maxLiquidH : 0;
      const liquidSurfaceY = cylBottom - liquidH;

      // Piston bottom position mapped linearly from V_min..V_max
      // At V = V_max (10 L), pistonBottom is near cylTop + 18.
      // At V = V_min (1 L), gas height is ~10% of cylH above liquidSurfaceY.
      const vFrac = (V - MODULE2_V_MIN) / (MODULE2_V_MAX - MODULE2_V_MIN);
      const minGasH = cylH * 0.095;
      const maxGasH = cylH - 22;
      const gasH = minGasH + vFrac * (maxGasH - minGasH);
      const pistonBottomY = Math.max(cylTop + 14, cylBottom - liquidH - gasH);

      // Update particle motion
      if (playingRef.current) {
        pRef.phaseTime += dt;
        const speedMult = 0.65 * Math.sqrt((T + 273.15) / 298.15);

        // Number of vapor molecules inside the gas headspace:
        // In unsaturated regime, total molecules stay constant (say 46).
        // In saturated regime, vapor density stays constant, so molecule count scales linearly with V/V_sat!
        const targetParticles = state.isSaturated
          ? Math.max(10, Math.round(46 * (V / MODULE2_V_SAT)))
          : 46;

        while (pRef.particles.length < targetParticles) {
          pRef.particles.push({
            nx: 0.08 + Math.random() * 0.84,
            ny: 0.08 + Math.random() * 0.84,
            vx: (Math.random() - 0.5) * 1.1,
            vy: (Math.random() - 0.5) * 1.1,
          });
        }
        if (pRef.particles.length > targetParticles) {
          // Spawn condensing drops when shrinking below V_sat
          if (state.isSaturated && V < pRef.prevVolume) {
            const spawnCount = Math.min(4, pRef.particles.length - targetParticles);
            for (let i = 0; i < spawnCount; i++) {
              pRef.drops.push({
                nx: 0.12 + Math.random() * 0.76,
                y: pistonBottomY + Math.random() * Math.max(12, gasH * 0.7),
                vy: 55 + Math.random() * 40,
                r: 2.5 + Math.random() * 1.8,
              });
            }
          }
          pRef.particles.length = targetParticles;
        }

        // Ambient micro-condensation / evaporation shimmer when saturated
        if (state.isSaturated && Math.random() < 0.14) {
          pRef.drops.push({
            nx: 0.1 + Math.random() * 0.8,
            y: pistonBottomY + 8 + Math.random() * Math.max(8, gasH * 0.55),
            vy: 45 + Math.random() * 35,
            r: 2.2 + Math.random() * 1.4,
          });
        }

        for (const p of pRef.particles) {
          p.nx += p.vx * speedMult * dt;
          p.ny += p.vy * speedMult * dt;
          if (p.nx < 0.06) {
            p.nx = 0.06;
            p.vx = Math.abs(p.vx);
          } else if (p.nx > 0.94) {
            p.nx = 0.94;
            p.vx = -Math.abs(p.vx);
          }
          if (p.ny < 0.06) {
            p.ny = 0.06;
            p.vy = Math.abs(p.vy);
          } else if (p.ny > 0.94) {
            p.ny = 0.94;
            p.vy = -Math.abs(p.vy);
          }
        }

        for (const d of pRef.drops) {
          d.vy += 180 * dt;
          d.y += d.vy * dt;
        }
        pRef.drops = pRef.drops.filter((d) => d.y < liquidSurfaceY);
      }
      pRef.prevVolume = V;

      // === RENDER ===
      ctx.clearRect(0, 0, W, H);

      // Divider between cylinder & graph
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(splitX, 16);
      ctx.lineTo(splitX, H - 16);
      ctx.stroke();

      // --- LEFT HALF: GRADUATED PISTON CYLINDER ---
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 13px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.m2.cylinderTitle, cylCenterX, 24);

      // Cylinder background
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(cylLeft, cylTop, cylW, cylH, [6, 6, 12, 12]);
      ctx.fill();

      // Gas space tint (Sky blue when unsaturated, deeper emerald-sky when saturated)
      const gasSpaceH = Math.max(8, liquidSurfaceY - pistonBottomY);
      ctx.fillStyle = state.isSaturated
        ? 'rgba(16, 185, 129, 0.12)'
        : 'rgba(14, 165, 233, 0.12)';
      ctx.fillRect(cylLeft + 2, pistonBottomY, cylW - 4, gasSpaceH);

      // Condensed liquid pool at floor
      if (liquidH > 1) {
        const liqGrad = ctx.createLinearGradient(0, liquidSurfaceY, 0, cylBottom);
        liqGrad.addColorStop(0, 'rgba(14, 165, 233, 0.65)');
        liqGrad.addColorStop(1, 'rgba(2, 132, 199, 0.9)');
        ctx.fillStyle = liqGrad;
        ctx.beginPath();
        ctx.roundRect(cylLeft + 2, liquidSurfaceY, cylW - 4, liquidH, [0, 0, 10, 10]);
        ctx.fill();

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cylLeft + 2, liquidSurfaceY);
        ctx.lineTo(cylRight - 2, liquidSurfaceY);
        ctx.stroke();
      }

      // Falling condensed droplets
      ctx.fillStyle = '#0284c7';
      for (const d of pRef.drops) {
        const dx = cylLeft + 8 + d.nx * (cylW - 16);
        ctx.beginPath();
        ctx.arc(dx, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gas particles inside gas space
      for (const p of pRef.particles) {
        const px = cylLeft + 8 + p.nx * (cylW - 16);
        const py = pistonBottomY + 6 + p.ny * Math.max(4, gasSpaceH - 12);
        ctx.fillStyle = state.isSaturated ? '#059669' : '#0284c7';
        ctx.beginPath();
        ctx.arc(px, py, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Volume Graduation Scale along right wall
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      for (let vTick = 2; vTick <= 10; vTick += 2) {
        const tf = (vTick - MODULE2_V_MIN) / (MODULE2_V_MAX - MODULE2_V_MIN);
        const tickY = cylBottom - (minGasH + tf * (maxGasH - minGasH));
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cylRight - 10, tickY);
        ctx.lineTo(cylRight, tickY);
        ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.fillText(`${vTick}L`, cylRight + 5, tickY + 3.5);
      }

      // Saturation Threshold Mark (V_sat = 4.2 L)
      {
        const satFrac = (MODULE2_V_SAT - MODULE2_V_MIN) / (MODULE2_V_MAX - MODULE2_V_MIN);
        const satY = cylBottom - (minGasH + satFrac * (maxGasH - minGasH));
        ctx.strokeStyle = '#059669';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cylLeft, satY);
        ctx.lineTo(cylRight + 32, satY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#047857';
        ctx.font = '700 10px "IBM Plex Mono", monospace';
        ctx.fillText(`V_sat`, cylRight + 5, satY - 4);
      }

      // Piston Head & Rod
      const pistonHeadH = 18;
      const pistonHeadTop = pistonBottomY - pistonHeadH;

      // Piston rod extending upward
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cylCenterX - 6, Math.max(32, pistonHeadTop - 44), 12, pistonHeadTop - Math.max(32, pistonHeadTop - 44));

      // Top grip handle
      const handleY = Math.max(32, pistonHeadTop - 44);
      ctx.fillStyle = '#047857';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cylCenterX - 28, handleY - 9, 56, 18, 9);
      ctx.fill();
      ctx.stroke();

      // Grip lines on handle
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cylCenterX - 10, handleY - 2.5);
      ctx.lineTo(cylCenterX + 10, handleY - 2.5);
      ctx.moveTo(cylCenterX - 10, handleY + 2.5);
      ctx.lineTo(cylCenterX + 10, handleY + 2.5);
      ctx.stroke();

      // Piston seal block
      const pistGrad = ctx.createLinearGradient(cylLeft, pistonHeadTop, cylRight, pistonBottomY);
      pistGrad.addColorStop(0, '#334155');
      pistGrad.addColorStop(0.5, '#64748b');
      pistGrad.addColorStop(1, '#334155');
      ctx.fillStyle = pistGrad;
      ctx.beginPath();
      ctx.roundRect(cylLeft + 3, pistonHeadTop, cylW - 6, pistonHeadH, 4);
      ctx.fill();

      // Rubber O-ring accents
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cylLeft + 3, pistonBottomY - 5, cylW - 6, 4);

      // Cylinder glass walls
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cylLeft, cylTop);
      ctx.lineTo(cylLeft, cylBottom - 10);
      ctx.quadraticCurveTo(cylLeft, cylBottom, cylLeft + 10, cylBottom);
      ctx.lineTo(cylRight - 10, cylBottom);
      ctx.quadraticCurveTo(cylRight, cylBottom, cylRight, cylBottom - 10);
      ctx.lineTo(cylRight, cylTop);
      ctx.stroke();

      // Mini Pressure Gauge on Cylinder Left
      const gX = cylLeft - 36;
      const gY = cylBottom - 56;
      if (gX > 32) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cylLeft, gY);
        ctx.lineTo(gX + 20, gY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = state.isSaturated ? '#059669' : '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(gX, gY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const maxGaugeP = state.svpMmHg * 1.35;
        const pNorm = Math.min(1, state.actualPressureMmHg / maxGaugeP);
        const ang = Math.PI * 0.75 + pNorm * Math.PI * 1.5;

        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gX, gY);
        ctx.lineTo(gX + Math.cos(ang) * 16, gY + Math.sin(ang) * 16);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(gX, gY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '700 9px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${state.actualPressureMmHg.toFixed(0)}`, gX, gY + 15);
      }

      // --- RIGHT HALF: SYNCHRONIZED LIVE P-V ISOTHERM PLOT ---
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 13px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.m2.graphTitle, graphLeft + graphW / 2, 24);

      const pMaxPlot = state.svpMmHg * 2.5;
      const vMinPlot = 0.5;
      const vMaxPlot = 10.5;

      const mapVtoX = (vol: number) =>
        graphLeft + ((vol - vMinPlot) / (vMaxPlot - vMinPlot)) * graphW;
      const mapPtoY = (press: number) =>
        graphBottom - (Math.min(pMaxPlot, press) / pMaxPlot) * graphH;

      const xSat = mapVtoX(MODULE2_V_SAT);
      const ySvp = mapPtoY(state.svpMmHg);

      // Shaded Regions (Saturated Left vs Unsaturated Right)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(graphLeft, graphTop, xSat - graphLeft, graphH);

      ctx.fillStyle = 'rgba(14, 165, 233, 0.06)';
      ctx.fillRect(xSat, graphTop, graphRight - xSat, graphH);

      // Grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      for (let v = 2; v <= 10; v += 2) {
        const gx = mapVtoX(v);
        ctx.beginPath();
        ctx.moveTo(gx, graphTop);
        ctx.lineTo(gx, graphBottom);
        ctx.stroke();
      }
      for (let i = 1; i <= 4; i++) {
        const gy = graphTop + (graphH * i) / 5;
        ctx.beginPath();
        ctx.moveTo(graphLeft, gy);
        ctx.lineTo(graphRight, gy);
        ctx.stroke();
      }

      // Saturation horizontal & vertical reference lines
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.45)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xSat, graphTop);
      ctx.lineTo(xSat, graphBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(graphLeft, ySvp);
      ctx.lineTo(graphRight, ySvp);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label F(T) on Y-axis
      ctx.fillStyle = '#047857';
      ctx.font = '700 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`F=${state.svpMmHg.toFixed(0)}`, graphLeft - 6, ySvp + 3.5);

      // Label V_sat on X-axis
      ctx.textAlign = 'center';
      ctx.fillText(`4.2L`, xSat, graphBottom + 24);

      // Hypothetical Boyle's Law Violation Curve (dashed rose curve for V < V_sat)
      ctx.save();
      ctx.beginPath();
      ctx.rect(graphLeft, graphTop, graphW, graphH);
      ctx.clip();

      ctx.strokeStyle = '#e11d48';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let startedBoyle = false;
      for (let v = 1.0; v <= MODULE2_V_SAT; v += 0.08) {
        const pIdeal = (state.svpMmHg * MODULE2_V_SAT) / v;
        const px = mapVtoX(v);
        const py = mapPtoY(pIdeal);
        if (!startedBoyle) {
          ctx.moveTo(px, py);
          startedBoyle = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Solid Flat Saturated Plateau (1.0 L to 4.2 L)
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mapVtoX(MODULE2_V_MIN), ySvp);
      ctx.lineTo(xSat, ySvp);
      ctx.stroke();

      // Solid Hyperbolic Unsaturated Curve (4.2 L to 10.0 L)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      let startedUnsat = false;
      for (let v = MODULE2_V_SAT; v <= MODULE2_V_MAX + 0.01; v += 0.1) {
        const pAct = (state.svpMmHg * MODULE2_V_SAT) / v;
        const px = mapVtoX(v);
        const py = mapPtoY(pAct);
        if (!startedUnsat) {
          ctx.moveTo(px, py);
          startedUnsat = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Axes
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(graphLeft, graphTop);
      ctx.lineTo(graphLeft, graphBottom);
      ctx.lineTo(graphRight, graphBottom);
      ctx.stroke();

      // Axis ticks & labels
      ctx.fillStyle = '#334155';
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      for (let v = 2; v <= 10; v += 2) {
        ctx.fillText(`${v}`, mapVtoX(v), graphBottom + 14);
      }
      ctx.font = '700 11px "Plus Jakarta Sans", "Hind Siliguri", sans-serif';
      ctx.fillText(t.m2.graphAxisV, graphLeft + graphW / 2, graphBottom + 38);

      ctx.save();
      ctx.translate(graphLeft - 34, graphTop + graphH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(t.m2.graphAxisP, 0, 0);
      ctx.restore();

      // Live Operating Point Marker on Graph
      const curX = mapVtoX(V);
      const curY = mapPtoY(state.actualPressureMmHg);

      // Drop lines from operating point
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(curX, graphBottom);
      ctx.moveTo(curX, curY);
      ctx.lineTo(graphLeft, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point halo & core
      ctx.fillStyle = state.isSaturated ? 'rgba(5, 150, 105, 0.25)' : 'rgba(2, 132, 199, 0.25)';
      ctx.beginPath();
      ctx.arc(curX, curY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = state.isSaturated ? '#059669' : '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(curX, curY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Coordinate callout next to point
      const labelTxt = `(${V.toFixed(1)}L, ${state.actualPressureMmHg.toFixed(1)})`;
      ctx.font = '700 11px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(labelTxt).width + 12;
      const boxX = Math.min(graphRight - tw - 4, Math.max(graphLeft + 6, curX - tw / 2));
      const boxY = Math.max(graphTop + 6, curY - 30);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = state.isSaturated ? '#059669' : '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, tw, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(labelTxt, boxX + tw / 2, boxY + 13.5);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [t]);

  // Interactive Pointer Dragging on Piston Cylinder OR P-V Graph
  const updateVolumeFromPointer = (clientX: number, clientY: number, mode: 'piston' | 'graph') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const L = layoutRef.current;

    if (mode === 'piston') {
      const cylH = L.cylBottom - L.cylTop;
      const minGasH = cylH * 0.095;
      const maxGasH = cylH - 22;
      const clampedY = Math.max(L.cylTop + 14, Math.min(L.cylBottom - minGasH, y));
      const gasH = L.cylBottom - clampedY;
      const frac = Math.max(0, Math.min(1, (gasH - minGasH) / (maxGasH - minGasH)));
      const newV = MODULE2_V_MIN + frac * (MODULE2_V_MAX - MODULE2_V_MIN);
      setVolumeL(Math.round(newV * 10) / 10);
    } else if (mode === 'graph') {
      const graphW = L.graphRight - L.graphLeft;
      const frac = (x - L.graphLeft) / graphW;
      const rawV = 0.5 + frac * 10.0;
      const newV = Math.max(MODULE2_V_MIN, Math.min(MODULE2_V_MAX, rawV));
      setVolumeL(Math.round(newV * 10) / 10);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const L = layoutRef.current;

    if (x >= L.cylLeft - 24 && x <= L.cylRight + 24 && y >= 16 && y <= L.cylBottom) {
      dragModeRef.current = 'piston';
      setIsDragging(true);
      canvas.setPointerCapture(e.pointerId);
      updateVolumeFromPointer(e.clientX, e.clientY, 'piston');
    } else if (x >= L.graphLeft && x <= L.graphRight && y >= L.graphTop && y <= L.graphBottom) {
      dragModeRef.current = 'graph';
      setIsDragging(true);
      canvas.setPointerCapture(e.pointerId);
      updateVolumeFromPointer(e.clientX, e.clientY, 'graph');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current === 'none') return;
    updateVolumeFromPointer(e.clientX, e.clientY, dragModeRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current !== 'none') {
      dragModeRef.current = 'none';
      setIsDragging(false);
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }
  };

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
            id="m2-volume"
            label={t.m2.volumeLabel}
            value={volumeL}
            min={MODULE2_V_MIN}
            max={MODULE2_V_MAX}
            step={0.1}
            unit={t.common.liter}
            precision={1}
            onChange={setVolumeL}
            subLabel={`V_sat = ${MODULE2_V_SAT.toFixed(1)} L`}
          />

          <ProgressiveSlider
            id="m2-temp"
            label={t.m2.tempLabel}
            value={tempC}
            min={15}
            max={60}
            step={0.5}
            unit={t.common.celsius}
            precision={1}
            onChange={setTempC}
            subLabel={`F = ${saturationVaporPressureMmHg(tempC).toFixed(1)} ${t.common.mmHg}`}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-700" />
              <span>{t.m2.dragHint}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVolumeL(8.5)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  volumeL > 6.5
                    ? 'border-sky-600 bg-sky-50 text-sky-950'
                    : 'border-sky-200 bg-white text-slate-700 hover:bg-sky-50'
                }`}
              >
                {t.m2.jumpUnsaturated}
              </button>
              <button
                type="button"
                onClick={() => setVolumeL(4.2)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  Math.abs(volumeL - 4.2) < 0.25
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                    : 'border-sky-200 bg-white text-slate-700 hover:bg-emerald-50'
                }`}
              >
                {t.m2.jumpSaturation}
              </button>
              <button
                type="button"
                onClick={() => setVolumeL(2.0)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  volumeL < 3.0
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                    : 'border-sky-200 bg-white text-slate-700 hover:bg-emerald-50'
                }`}
              >
                {t.m2.jumpCompressed}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Center Split Canvas Stage */}
      <section className="flex min-h-[480px] flex-1 min-w-0 flex-col rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-sm lg:min-h-[600px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">{t.m2.stageTitle}</h2>
            <p className="text-xs text-slate-600">{t.m2.stageSubtitle}</p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap ${
              iso.isSaturated
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-sky-300 bg-sky-50 text-sky-800'
            }`}
          >
            <span>{iso.isSaturated ? '●' : '○'}</span>
            <span>{iso.isSaturated ? t.m2.stateSaturated : t.m2.stateUnsaturated}</span>
          </div>
        </div>

        <div className="relative flex-1 min-h-[380px] w-full overflow-hidden rounded-xl border border-sky-100 bg-sky-50/40">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`block h-full w-full touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1 w-5 rounded bg-sky-600" />
            <span>{t.m2.stateUnsaturated}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1 w-5 rounded bg-emerald-600" />
            <span>{t.m2.stateSaturated}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-rose-600" />
            <span>{t.m2.legendBoyleDash}</span>
          </span>
        </div>
      </section>

      {/* Right Telemetry Panel (330px) */}
      <aside className="w-full shrink-0 rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-sm lg:w-[330px]">
        <div className="mb-4 border-b border-sky-100 pb-3">
          <h2 className="text-sm font-bold text-slate-950">{t.common.telemetryHeader}</h2>
        </div>

        <div className="space-y-3.5">
          {/* Boyle's Law Verdict Banner */}
          <div
            className={`rounded-xl border p-3 text-xs font-bold ${
              iso.isSaturated
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
            }`}
          >
            {iso.isSaturated ? t.m2.boyleViolated : t.m2.boyleObeyed}
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-3">
            <div className="text-[11px] font-semibold text-slate-600">{t.m2.actualPressureLabel}</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-sky-800">
              {iso.actualPressureMmHg.toFixed(2)}
              <span className="ml-1 text-xs font-medium text-slate-500">{t.common.mmHg}</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <div className="text-[11px] font-semibold text-slate-700">{t.m2.svpLimitLabel}</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-emerald-800">
              {iso.svpMmHg.toFixed(2)}
              <span className="ml-1 text-xs font-medium text-slate-500">{t.common.mmHg}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span>{t.m2.boylePredictedLabel}</span>
              <span className="font-mono-tabular font-bold text-rose-700">
                {iso.boylePredictedPressureMmHg.toFixed(1)} {t.common.mmHg}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>{t.m2.pvProductLabel}</span>
              <span className="font-mono-tabular font-bold text-slate-950">
                {iso.pvProduct.toFixed(1)} mmHg·L
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-slate-800">
              <span>{t.m2.condensedWaterLabel}</span>
              <span className="font-mono-tabular font-bold text-sky-700">
                {(iso.condensedFraction * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
            <div className="mb-1 text-xs font-bold text-sky-900">{t.common.keyInsight}</div>
            <p className="text-xs leading-relaxed text-slate-700">
              {iso.isSaturated ? t.m2.insightSaturated : t.m2.insightUnsaturated}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};
