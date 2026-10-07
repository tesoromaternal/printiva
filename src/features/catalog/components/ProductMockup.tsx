import { useId, type ReactNode } from "react";

import type { MockupKind, PrintArt } from "../types";

/**
 * Mockup SVG de producto: silueta teñida con el color elegido + zona de
 * impresión donde va la imagen/texto del cliente (o un diseño de ejemplo).
 * Es React puro sin estado: Astro lo renderiza estático en las tarjetas y el
 * personalizador lo reutiliza hidratado como vista previa en vivo.
 */

export type PrintFont = "sans" | "script" | "display";

export interface ProductMockupProps {
  kind: MockupKind;
  color: string;
  art?: PrintArt;
  image?: string | null;
  text?: string;
  textFont?: PrintFont;
  textColor?: string | null;
  /** 0.4 – 1.6, escala de la imagen subida dentro de la zona de impresión. */
  imageScale?: number;
  /** -1 – 1, desplazamiento vertical de la imagen dentro de la zona. */
  imageOffset?: number;
  className?: string;
  title?: string;
  /** Sombra de apoyo bajo el producto (se apaga en composiciones como el hero). */
  shadow?: boolean;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FONT_FAMILY: Record<PrintFont, string> = {
  sans: "Nunito, sans-serif",
  script: "'Kaushan Script', cursive",
  display: "'Bebas Neue', Impact, sans-serif",
};

const SHADE = "rgba(0,0,0,0.10)";
const EDGE = "rgba(20,22,31,0.18)";

export function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export const contrastInk = (hex: string): string =>
  luminance(hex) > 0.55 ? "#14161F" : "#FFFFFF";

interface Silhouette {
  print: Box;
  back?: (color: string) => ReactNode;
  body: (color: string) => ReactNode;
  front?: (color: string) => ReactNode;
}

const shirtBody =
  "M150 62 C165 82 235 82 250 62 L305 80 L355 128 L322 172 L292 152 L292 345 Q200 355 108 345 L108 152 L78 172 L45 128 L95 80 Z";

const SILHOUETTES: Record<MockupKind, Silhouette> = {
  tshirt: {
    print: { x: 145, y: 118, w: 110, h: 140 },
    body: (color) => (
      <>
        <path d={shirtBody} fill={color} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M150 62 C165 82 235 82 250 62 C238 98 162 98 150 62 Z" fill={SHADE} />
        <path d="M108 152 L95 80 M292 152 L305 80" stroke={SHADE} strokeWidth={2} fill="none" />
      </>
    ),
  },
  polo: {
    print: { x: 218, y: 122, w: 52, h: 44 },
    body: (color) => (
      <>
        <path d={shirtBody} fill={color} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M108 152 L95 80 M292 152 L305 80" stroke={SHADE} strokeWidth={2} fill="none" />
        <rect x={193} y={92} width={14} height={58} rx={3} fill={SHADE} />
        <circle cx={200} cy={112} r={3} fill={EDGE} />
        <circle cx={200} cy={132} r={3} fill={EDGE} />
      </>
    ),
    front: (color) => (
      <>
        <path d="M150 62 L200 96 L172 116 L140 72 Z" fill={color} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M250 62 L200 96 L228 116 L260 72 Z" fill={color} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
      </>
    ),
  },
  hoodie: {
    print: { x: 150, y: 128, w: 100, h: 112 },
    back: (color) => (
      <>
        <path d="M132 100 C112 18 288 18 268 100 Z" fill={color} stroke={EDGE} strokeWidth={2} />
        <path d="M132 100 C112 18 288 18 268 100 Z" fill={SHADE} />
      </>
    ),
    body: (color) => (
      <>
        <path
          d="M140 80 L95 98 L55 240 L50 300 L88 308 L118 190 L118 345 Q200 355 282 345 L282 190 L312 308 L350 300 L345 240 L305 98 L260 80 Z"
          fill={color}
          stroke={EDGE}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path d="M150 84 C160 116 240 116 250 84 C238 58 162 58 150 84 Z" fill={SHADE} stroke={EDGE} strokeWidth={1.5} />
        <path d="M185 108 L181 156 M215 108 L219 156" stroke={EDGE} strokeWidth={3} strokeLinecap="round" />
        <path d="M148 262 L252 262 L272 328 L128 328 Z" fill="none" stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M50 300 L88 308 M350 300 L312 308" stroke={SHADE} strokeWidth={8} />
      </>
    ),
  },
  bodysuit: {
    print: { x: 155, y: 122, w: 90, h: 108 },
    body: (color) => (
      <>
        <path
          d="M160 70 C172 88 228 88 240 70 L285 85 L322 122 L296 152 L272 136 L272 262 Q272 302 236 320 L226 360 L174 360 L164 320 Q128 302 128 262 L128 136 L104 152 L78 122 L115 85 Z"
          fill={color}
          stroke={EDGE}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path d="M160 70 C172 88 228 88 240 70 C230 100 170 100 160 70 Z" fill={SHADE} />
        <circle cx={186} cy={350} r={3.5} fill={EDGE} />
        <circle cx={200} cy={350} r={3.5} fill={EDGE} />
        <circle cx={214} cy={350} r={3.5} fill={EDGE} />
      </>
    ),
  },
  mug: {
    print: { x: 128, y: 138, w: 134, h: 160 },
    body: (color) => (
      <>
        <path d="M280 152 C346 152 346 272 280 272" fill="none" stroke={EDGE} strokeWidth={26} />
        <path d="M280 152 C346 152 346 272 280 272" fill="none" stroke={color} strokeWidth={22} />
        <path d="M110 110 L110 302 Q110 332 140 332 L250 332 Q280 332 280 302 L280 110 Z" fill={color} stroke={EDGE} strokeWidth={2} />
        <ellipse cx={195} cy={110} rx={85} ry={15} fill={color} stroke={EDGE} strokeWidth={2} />
        <ellipse cx={195} cy={112} rx={74} ry={10} fill="rgba(0,0,0,0.18)" />
      </>
    ),
    front: () => <rect x={120} y={130} width={9} height={180} rx={4} fill="rgba(255,255,255,0.28)" />,
  },
  cap: {
    print: { x: 148, y: 168, w: 104, h: 62 },
    body: (color) => (
      <>
        <path d="M95 252 C95 132 305 132 305 252 Z" fill={color} stroke={EDGE} strokeWidth={2} />
        <path d="M200 140 L150 252 M200 140 L250 252" stroke={SHADE} strokeWidth={2} fill="none" />
        <circle cx={200} cy={140} r={8} fill={color} stroke={EDGE} strokeWidth={2} />
      </>
    ),
    front: (color) => (
      <>
        <path
          d="M70 252 C110 236 290 236 330 252 C342 276 300 296 200 296 C100 296 58 276 70 252 Z"
          fill={color}
          stroke={EDGE}
          strokeWidth={2}
        />
        <path
          d="M70 252 C110 236 290 236 330 252 C342 276 300 296 200 296 C100 296 58 276 70 252 Z"
          fill={SHADE}
        />
      </>
    ),
  },
  tote: {
    print: { x: 128, y: 172, w: 144, h: 164 },
    back: (color) => (
      <>
        <path d="M152 140 C152 50 248 50 248 140" fill="none" stroke={EDGE} strokeWidth={15} />
        <path d="M152 140 C152 50 248 50 248 140" fill="none" stroke={color} strokeWidth={11} />
      </>
    ),
    body: (color) => (
      <>
        <path d="M105 136 L295 136 L300 360 L100 360 Z" fill={color} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M105 136 L295 136 L295.6 152 L104.4 152 Z" fill={SHADE} />
      </>
    ),
  },
  bottle: {
    print: { x: 150, y: 172, w: 100, h: 150 },
    body: (color) => (
      <>
        <rect x={170} y={46} width={60} height={46} rx={9} fill="#C9CDD3" stroke={EDGE} strokeWidth={2} />
        <rect x={170} y={58} width={60} height={4} fill="rgba(0,0,0,0.12)" />
        <path
          d="M178 92 L222 92 L222 104 Q262 122 262 162 L262 346 Q262 366 242 366 L158 366 Q138 366 138 346 L138 162 Q138 122 178 104 Z"
          fill={color}
          stroke={EDGE}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </>
    ),
    front: () => <rect x={146} y={150} width={8} height={196} rx={4} fill="rgba(255,255,255,0.3)" />,
  },
  gift: {
    print: { x: 122, y: 200, w: 156, h: 132 },
    body: (color) => (
      <>
        <rect x={95} y={176} width={210} height={178} rx={6} fill={color} stroke={EDGE} strokeWidth={2} />
        <rect x={85} y={144} width={230} height={44} rx={6} fill={color} stroke={EDGE} strokeWidth={2} />
        <rect x={85} y={176} width={230} height={12} fill={SHADE} />
      </>
    ),
    front: (color) => {
      const ribbon = luminance(color) > 0.75 || color.toUpperCase() === "#F7A8C8" ? "#EC1E79" : "#FFFFFF";
      return (
        <>
          <rect x={188} y={144} width={24} height={44} fill={ribbon} />
          <path d="M200 144 C170 100 128 116 150 140 C160 150 190 148 200 144 Z" fill={ribbon} stroke={EDGE} strokeWidth={1.5} />
          <path d="M200 144 C230 100 272 116 250 140 C240 150 210 148 200 144 Z" fill={ribbon} stroke={EDGE} strokeWidth={1.5} />
          <circle cx={200} cy={144} r={9} fill={ribbon} stroke={EDGE} strokeWidth={1.5} />
        </>
      );
    },
  },
  cushion: {
    print: { x: 122, y: 118, w: 156, h: 164 },
    body: (color) => (
      <>
        <path d="M88 92 Q200 72 312 92 Q334 200 312 308 Q200 328 88 308 Q66 200 88 92 Z" fill={color} stroke={EDGE} strokeWidth={2} />
        <path d="M88 92 Q200 112 312 92 M88 308 Q200 288 312 308" stroke={SHADE} strokeWidth={2} fill="none" />
      </>
    ),
  },
};

/** Diseños de ejemplo dibujados en una caja de 100×100. */
function DemoArt({ art, ink, gid }: { art: PrintArt; ink: string; gid: string }) {
  const gradient = (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFC93C" />
        <stop offset="0.45" stopColor="#EC1E79" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  );

  switch (art) {
    case "heart":
      return (
        <g>
          {gradient}
          <circle cx={20} cy={22} r={5} fill="#22B8E6" />
          <circle cx={84} cy={18} r={4} fill="#FFC93C" />
          <circle cx={88} cy={70} r={3} fill="#8B5CF6" />
          <circle cx={12} cy={64} r={3.5} fill="#FF8A3D" />
          <path d="M50 88 C18 64 6 46 13 30 C20 14 41 11 50 28 C59 11 80 14 87 30 C94 46 82 64 50 88 Z" fill={`url(#${gid})`} />
          <path d="M30 34 C34 26 42 26 45 32" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.7} />
        </g>
      );
    case "goodvibes":
      return (
        <g fontFamily={FONT_FAMILY.display} textAnchor="middle">
          {gradient}
          <text x={50} y={46} fontSize={40} fill={`url(#${gid})`}>GOOD</text>
          <text x={50} y={82} fontSize={40} fill={`url(#${gid})`}>VIBES</text>
          <circle cx={50} cy={94} r={5} fill="#FFC93C" />
        </g>
      );
    case "sonrie":
      return (
        <g textAnchor="middle">
          <circle cx={22} cy={30} r={7} fill="#FF8A3D" />
          <circle cx={22} cy={30} r={3} fill="#FFC93C" />
          <circle cx={50} cy={22} r={8} fill="#EC1E79" />
          <circle cx={50} cy={22} r={3} fill="#FFC93C" />
          <circle cx={78} cy={30} r={7} fill="#22B8E6" />
          <circle cx={78} cy={30} r={3} fill="#FFFFFF" />
          <path d="M34 34 L38 40 M66 34 L62 40" stroke="#3FA36B" strokeWidth={3} strokeLinecap="round" />
          <text x={50} y={70} fontSize={26} fontFamily={FONT_FAMILY.script} fill={ink}>Sonríe</text>
          <text x={50} y={84} fontSize={8} fontFamily={FONT_FAMILY.sans} fill={ink} opacity={0.75}>la vida es bonita</text>
        </g>
      );
    case "aventura":
      return (
        <g textAnchor="middle">
          <path d="M14 66 L38 32 L50 48 L62 30 L86 66" fill="none" stroke={ink} strokeWidth={4} strokeLinejoin="round" />
          <path d="M33 39 L38 32 L43 39 M57 37 L62 30 L67 37" fill="none" stroke={ink} strokeWidth={3} />
          <text x={50} y={88} fontSize={20} fontFamily={FONT_FAMILY.display} letterSpacing={1.5} fill={ink}>AVENTURA</text>
        </g>
      );
    case "familia":
      return (
        <g textAnchor="middle">
          <text x={50} y={58} fontSize={28} fontFamily={FONT_FAMILY.script} fill={ink}>Familia</text>
          <path d="M50 84 C38 75 33 69 36 63 C39 57 47 57 50 63 C53 57 61 57 64 63 C67 69 62 75 50 84 Z" fill="#EC1E79" />
        </g>
      );
    case "disfruta":
      return (
        <g textAnchor="middle" fontFamily={FONT_FAMILY.script} fill={ink}>
          <text x={50} y={34} fontSize={22}>Disfruta</text>
          <text x={50} y={60} fontSize={22}>cada</text>
          <text x={50} y={86} fontSize={22}>día</text>
        </g>
      );
    case "sun":
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={48} y={6} width={4} height={14} rx={2} fill="#FF8A3D" transform={`rotate(${i * 30} 50 50)`} />
          ))}
          <circle cx={50} cy={50} r={26} fill="#FFC93C" />
          <circle cx={41} cy={46} r={3} fill="#14161F" />
          <circle cx={59} cy={46} r={3} fill="#14161F" />
          <path d="M40 57 Q50 66 60 57" stroke="#14161F" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    case "paw":
      return (
        <g fill="#EC1E79">
          <ellipse cx={50} cy={64} rx={20} ry={17} />
          <ellipse cx={26} cy={42} rx={8} ry={10} />
          <ellipse cx={40} cy={26} rx={8} ry={10} />
          <ellipse cx={60} cy={26} rx={8} ry={10} />
          <ellipse cx={74} cy={42} rx={8} ry={10} />
        </g>
      );
    case "logo":
      return (
        <g textAnchor="middle">
          <rect x={8} y={26} width={84} height={48} rx={10} fill="none" stroke={ink} strokeWidth={3} strokeDasharray="6 5" />
          <text x={50} y={58} fontSize={22} fontFamily={FONT_FAMILY.display} fill={ink}>TU LOGO</text>
        </g>
      );
    case "none":
      return null;
  }
}

/** Reparte el texto en hasta 3 líneas equilibradas para que crezca la letra. */
function wrapText(text: string, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || text.length <= 10 || maxLines === 1) return [text];
  const lineCount = Math.min(maxLines, words.length, Math.ceil(text.length / 10));
  const target = text.length / lineCount;
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > target && lines.length < lineCount - 1) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

export default function ProductMockup({
  kind,
  color,
  art = "none",
  image,
  text,
  textFont = "sans",
  textColor,
  imageScale = 1,
  imageOffset = 0,
  className,
  title,
  shadow = true,
}: ProductMockupProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const shape = SILHOUETTES[kind];
  const { x, y, w, h } = shape.print;
  const ink = contrastInk(color);
  const trimmed = text?.trim() ?? "";
  const hasCustom = Boolean(image) || trimmed.length > 0;

  // Con imagen el texto va abajo como pie; solo, ocupa el centro.
  const textBand = image ? h * 0.24 : h;
  const imageBand = trimmed ? h - textBand : h;
  const lines = wrapText(trimmed, image ? 1 : 3);
  const longest = Math.max(...lines.map((line) => line.length), 4);
  const charWidth = textFont === "display" ? 0.45 : 0.55;
  const fontSize = Math.min((textBand * (image ? 0.7 : 0.75)) / lines.length / 1.15, w / (longest * charWidth));
  const lineHeight = fontSize * 1.15;
  const textCenterY = image ? y + h - textBand / 2 : y + h / 2;

  const side = Math.min(w, imageBand) * imageScale;
  const imageX = x + (w - side) / 2;
  const imageY = y + (imageBand - side) / 2 + imageOffset * (imageBand / 2);

  const artSide = Math.min(w, h);

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label={title ?? "Producto personalizado"}>
      {shadow && <ellipse cx={200} cy={372} rx={130} ry={12} fill="rgba(20,22,31,0.08)" />}
      {shape.back?.(color)}
      {shape.body(color)}
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x={x} y={y} width={w} height={h} rx={4} />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${uid})`}>
        {hasCustom ? (
          <>
            {image ? (
              <image href={image} x={imageX} y={imageY} width={side} height={side} preserveAspectRatio="xMidYMid meet" />
            ) : null}
            {trimmed ? (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={FONT_FAMILY[textFont]}
                fontWeight={textFont === "sans" ? 800 : 400}
                fontSize={fontSize}
                fill={textColor ?? ink}
              >
                {lines.map((line, index) => (
                  <tspan key={index} x={x + w / 2} y={textCenterY + (index - (lines.length - 1) / 2) * lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            ) : null}
          </>
        ) : (
          <g transform={`translate(${x + (w - artSide) / 2} ${y + (h - artSide) / 2}) scale(${artSide / 100})`}>
            <DemoArt art={art} ink={ink} gid={`grad-${uid}`} />
          </g>
        )}
      </g>
      {shape.front?.(color)}
    </svg>
  );
}
