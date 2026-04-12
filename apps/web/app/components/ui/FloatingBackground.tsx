"use client";

import { motion } from "framer-motion";

interface Shape {
  id: number;
  type: "cube" | "pyramid" | "diamond";
  x: string;
  y: string;
  size: number;
  blur: number;
  opacity: number;
  rotation: number;
  delay: number;
}

const shapes: Shape[] = [
  // Large blurred shapes (background layer — far depth)
  {
    id: 1,
    type: "cube",
    x: "12%",
    y: "25%",
    size: 90,
    blur: 12,
    opacity: 0.15,
    rotation: 35,
    delay: 0,
  },
  {
    id: 2,
    type: "diamond",
    x: "82%",
    y: "65%",
    size: 80,
    blur: 10,
    opacity: 0.12,
    rotation: -20,
    delay: 1.5,
  },
  {
    id: 3,
    type: "cube",
    x: "75%",
    y: "18%",
    size: 70,
    blur: 14,
    opacity: 0.1,
    rotation: 50,
    delay: 0.8,
  },

  // Medium shapes (mid layer)
  {
    id: 4,
    type: "pyramid",
    x: "20%",
    y: "55%",
    size: 50,
    blur: 6,
    opacity: 0.2,
    rotation: -15,
    delay: 2,
  },
  {
    id: 5,
    type: "cube",
    x: "85%",
    y: "35%",
    size: 55,
    blur: 8,
    opacity: 0.18,
    rotation: 25,
    delay: 0.5,
  },
  {
    id: 6,
    type: "diamond",
    x: "35%",
    y: "80%",
    size: 45,
    blur: 5,
    opacity: 0.15,
    rotation: 40,
    delay: 1.2,
  },

  // Small crisp shapes (foreground layer — close depth)
  {
    id: 7,
    type: "pyramid",
    x: "15%",
    y: "15%",
    size: 30,
    blur: 2,
    opacity: 0.35,
    rotation: -45,
    delay: 0.3,
  },
  {
    id: 8,
    type: "cube",
    x: "70%",
    y: "75%",
    size: 25,
    blur: 1,
    opacity: 0.3,
    rotation: 30,
    delay: 1.8,
  },
  {
    id: 9,
    type: "diamond",
    x: "90%",
    y: "12%",
    size: 20,
    blur: 1,
    opacity: 0.25,
    rotation: 15,
    delay: 2.5,
  },
  {
    id: 10,
    type: "pyramid",
    x: "55%",
    y: "88%",
    size: 22,
    blur: 2,
    opacity: 0.2,
    rotation: -30,
    delay: 0.7,
  },
];

function renderShape(type: Shape["type"], size: number) {
  const half = size / 2;

  switch (type) {
    case "cube":
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          {/* Front face */}
          <rect
            x={size * 0.15}
            y={size * 0.25}
            width={size * 0.55}
            height={size * 0.55}
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
          {/* Top face */}
          <polygon
            points={`${size * 0.15},${size * 0.25} ${size * 0.4},${size * 0.1} ${size * 0.95},${size * 0.1} ${size * 0.7},${size * 0.25}`}
            fill="rgba(255,255,255,0.12)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
          {/* Right face */}
          <polygon
            points={`${size * 0.7},${size * 0.25} ${size * 0.95},${size * 0.1} ${size * 0.95},${size * 0.65} ${size * 0.7},${size * 0.8}`}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
        </svg>
      );
    case "pyramid":
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          {/* Left face */}
          <polygon
            points={`${half},${size * 0.1} ${size * 0.1},${size * 0.85} ${half},${size * 0.7}`}
            fill="rgba(255,255,255,0.1)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.5"
          />
          {/* Right face */}
          <polygon
            points={`${half},${size * 0.1} ${size * 0.9},${size * 0.85} ${half},${size * 0.7}`}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.5"
          />
        </svg>
      );
    case "diamond":
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          <polygon
            points={`${half},${size * 0.05} ${size * 0.9},${half} ${half},${size * 0.95} ${size * 0.1},${half}`}
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.5"
          />
          {/* Center highlight line */}
          <line
            x1={half}
            y1={size * 0.05}
            x2={half}
            y2={size * 0.95}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
        </svg>
      );
  }
}

export default function FloatingBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Subtle center glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute"
          style={{
            left: shape.x,
            top: shape.y,
            filter: `blur(${shape.blur}px)`,
            opacity: shape.opacity,
          }}
          initial={{ rotate: shape.rotation, y: 0 }}
          animate={{
            y: [0, -15, 0, 10, 0],
            rotate: [
              shape.rotation,
              shape.rotation + 5,
              shape.rotation - 3,
              shape.rotation,
            ],
          }}
          transition={{
            duration: 8 + shape.delay * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        >
          {renderShape(shape.type, shape.size)}
        </motion.div>
      ))}
    </div>
  );
}
