import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { HEIGHT } from "./constants";
import type { Point } from "@/types/Point";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePoints(
  freq: number,
  amp: number,
  length: number,
  phase: number,
): Point[] {
  return Array.from({ length }, (_, i) => {
    return {
      x: 150 + Math.sin(i * freq + phase) * amp,
      y: (i / length) * HEIGHT,
    };
  });
}
