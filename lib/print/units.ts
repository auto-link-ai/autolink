/** PDF user space is in points (1/72 inch). */
export const PT_PER_MM = 72 / 25.4;

export function mm(value: number): number {
  return value * PT_PER_MM;
}

export const A4_MM = { width: 210, height: 297 } as const;
