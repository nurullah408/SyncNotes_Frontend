import { useEffect, useMemo, useRef } from "react";
import { animate } from "animejs";
import { generatePoints } from "@/lib/utils";
import {
  AMPLITUDE,
  FREQUENCY,
  PHASE_DIFF,
  STRAND_LENGTH,
  HEIGHT,
} from "@/lib/constants";
import type { Point } from "@/types/Point";

export function DoubleHelix() {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftRef = useRef<SVGPathElement>(null);
  const rightRef = useRef<SVGPathElement>(null);
  const rungGroups = useRef<SVGGElement>(null);

  const state = useRef({ offset: 0 });

  const pointsMetaData = useMemo(() => {
    return Array.from({ length: STRAND_LENGTH }, (_, i) => ({
      y: (i / STRAND_LENGTH) * HEIGHT,
      angle: i * FREQUENCY,
    }));
  }, []);

  const initialRungs = useMemo(
    () =>
      Array.from({ length: Math.floor(STRAND_LENGTH / 6) }, (_, i) => i * 6),
    [],
  );

  function generatePath(points: Point[]): string {
    if (points.length < 2) return "";

    let d = `M ${points[0].x} ${points[0].y} `;

    d += `C ${points[0].x},${points[0].y} ${points[1].x},${points[1].y} ${points[1].x},${points[1].y} `;

    for (let i = 2; i < points.length; i++) {
      d += `S ${points[i].x},${points[i].y} ${points[i].x},${points[i].y} `;
    }

    return d;
  }

  useEffect(() => {
    let rafId: number;

    const lines = rungGroups.current?.querySelectorAll("line");

    function update() {
      const offset = state.current.offset;
      const CENTER = 150;

      let leftD = "";
      let rightD = "";

      for (let i = 0; i < STRAND_LENGTH; i++) {
        const { y, angle } = pointsMetaData[i];
        const lx = CENTER + Math.sin(angle + 0 + offset) * AMPLITUDE;
        const rx = CENTER + Math.sin(angle + PHASE_DIFF + offset) * AMPLITUDE;

        const char = i === 0 ? "M" : "L";
        leftD += `${char} ${lx} ${y} `;
        rightD += `${char} ${rx} ${y} `;
      }

      if (leftRef.current) {
        leftRef.current.setAttribute("d", leftD);
      }
      if (rightRef.current) {
        rightRef.current.setAttribute("d", rightD);
      }

      if (lines) {
        for (let i = 0; i < lines.length; i++) {
          const rungIdx = i * 6;
          const x1 =
            CENTER + Math.sin(rungIdx * FREQUENCY + 0 + offset) * AMPLITUDE;
          const x2 =
            CENTER +
            Math.sin(rungIdx * FREQUENCY + PHASE_DIFF + offset) * AMPLITUDE;
          const line = lines[i] as SVGLineElement;
          line.setAttribute("x1", x1.toString());
          line.setAttribute("x2", x2.toString());

          const dist = Math.abs(x1 - x2);
          line.setAttribute(
            "opacity",
            (0.1 + (dist / (AMPLITUDE * 2)) * 0.4).toString(),
          );
        }
      }

      rafId = requestAnimationFrame(update);
    }

    const helixAnim = animate(state.current, {
      offset: Math.PI * 2,
      duration: 4000,
      easing: "linear",
      loop: true,
    });

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      helixAnim.pause();
    };
  }, [pointsMetaData]);

  const leftStrandArray = useMemo(
    () => generatePoints(FREQUENCY, AMPLITUDE, STRAND_LENGTH, 0),
    [],
  );
  const rightStrandArray = useMemo(
    () => generatePoints(FREQUENCY, AMPLITUDE, STRAND_LENGTH, PHASE_DIFF),
    [],
  );

  const initialLeftStrandPath = useMemo(
    () => generatePath(leftStrandArray),
    [leftStrandArray],
  );
  const initialRightStrandPath = useMemo(
    () => generatePath(rightStrandArray),
    [rightStrandArray],
  );

  return (
    <div className="h-full w-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 300 ${HEIGHT}`}
      >
        {/* 1. Render the Rungs FIRST (so they appear behind the strands) */}
        <g ref={rungGroups}>
          {initialRungs.map((yIdx) => (
            <line
              key={`rung-${yIdx}`}
              y1={(yIdx / STRAND_LENGTH) * HEIGHT}
              y2={(yIdx / STRAND_LENGTH) * HEIGHT}
              stroke="blue"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
        </g>
        <path
          className="animated-helix-path"
          ref={leftRef}
          d={initialLeftStrandPath}
          fill="none"
          stroke="blue"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          className="animated-helix-path"
          ref={rightRef}
          d={initialRightStrandPath}
          fill="none"
          stroke="blue"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
