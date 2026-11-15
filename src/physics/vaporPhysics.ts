/**
 * Atmospheric Thermodynamics & Vapor Equilibrium Physics Engine
 * Uses the Arden Buck equation for saturation vapor pressure of water (0°C - 100°C).
 */

export const MMHG_PER_KPA = 7.50061683;
export const KPA_PER_MMHG = 0.133322368;

/**
 * Computes Saturated Vapor Pressure F(T) in kPa using Arden Buck (1996) equation.
 */
export function saturationVaporPressureKPa(tempC: number): number {
  const t = Math.max(-30, Math.min(105, tempC));
  return 0.61121 * Math.exp((18.678 - t / 234.5) * (t / (257.14 + t)));
}

/**
 * Computes Saturated Vapor Pressure F(T) in mmHg.
 * F(0°C) ≈ 4.58 mmHg, F(25°C) ≈ 23.77 mmHg, F(100°C) ≈ 759.9 mmHg.
 */
export function saturationVaporPressureMmHg(tempC: number): number {
  return saturationVaporPressureKPa(tempC) * MMHG_PER_KPA;
}

export function mmHgToKPa(mmHg: number): number {
  return mmHg * KPA_PER_MMHG;
}

/**
 * Exact numerical inverse of F(T) via bisection to find Dew Point θ_dew (°C)
 * such that F(θ_dew) = f_mmHg.
 */
export function dewPointFromVaporPressureMmHg(fMmHg: number): number {
  if (fMmHg <= 0.3) return -30;
  let low = -30;
  let high = 100;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) * 0.5;
    if (saturationVaporPressureMmHg(mid) < fMmHg) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) * 0.5;
}

/**
 * Computes Relative Humidity R (%) = (f / F_air) * 100.
 */
export function relativeHumidityPercent(fMmHg: number, svpAirMmHg: number): number {
  if (svpAirMmHg <= 0) return 0;
  return Math.min(100, Math.max(0, (fMmHg / svpAirMmHg) * 100));
}

export type ComfortCategory = 'dry' | 'comfortable' | 'humid';

export function classifyHumidityComfort(rhPercent: number): ComfortCategory {
  if (rhPercent < 35) return 'dry';
  if (rhPercent <= 65) return 'comfortable';
  return 'humid';
}

/**
 * Module 2 Isothermal Compression State:
 * Given constant temperature T and volume V (1.0 L - 10.0 L),
 * water vapor starts at 42% of saturation at V_max = 10.0 L (so V_sat = 4.20 L).
 * For V >= V_sat: Unsaturated vapor obeys Boyle's Law (P * V = const).
 * For V < V_sat: Saturated vapor violates Boyle's Law (P = F(T) = const),
 * and excess vapor condenses into liquid water droplets.
 */
export interface IsothermState {
  tempC: number;
  volumeL: number;
  vSatL: number;
  svpMmHg: number;
  actualPressureMmHg: number;
  boylePredictedPressureMmHg: number;
  pvProduct: number;
  isSaturated: boolean;
  condensedFraction: number;
  rhPercent: number;
}

export const MODULE2_V_MIN = 1.0;
export const MODULE2_V_MAX = 10.0;
export const MODULE2_V_SAT = 4.2;

export function computeIsothermState(tempC: number, volumeL: number): IsothermState {
  const svpMmHg = saturationVaporPressureMmHg(tempC);
  const boyleConst = svpMmHg * MODULE2_V_SAT;
  const boylePredictedPressureMmHg = boyleConst / volumeL;
  const isSaturated = volumeL <= MODULE2_V_SAT + 1e-6;
  const actualPressureMmHg = isSaturated ? svpMmHg : boylePredictedPressureMmHg;
  const condensedFraction = isSaturated
    ? Math.max(0, Math.min(1, 1 - volumeL / MODULE2_V_SAT))
    : 0;
  const pvProduct = actualPressureMmHg * volumeL;
  const rhPercent = relativeHumidityPercent(actualPressureMmHg, svpMmHg);

  return {
    tempC,
    volumeL,
    vSatL: MODULE2_V_SAT,
    svpMmHg,
    actualPressureMmHg,
    boylePredictedPressureMmHg,
    pvProduct,
    isSaturated,
    condensedFraction,
    rhPercent,
  };
}
