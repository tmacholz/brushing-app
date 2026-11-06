// Shared visuals for puzzle mode: one cropped piece, the foam that is scrubbed
// off it while brushing, and the mouth map that says which teeth to brush.
import { useMemo } from 'react';
import { BRUSH_STAGES, type Puzzle } from '../../data/puzzles';

const ROW_BG = [
  'linear-gradient(#7dd3fc,#bae6fd)',
  'linear-gradient(#38bdf8,#0ea5e9)',
  'linear-gradient(#0369a1,#075985)',
];

// One piece of a puzzle: a crop of the single puzzle image. A mystery piece is
// heavily blurred under a dark tint so kids only get a hint of colour.
export function PieceArt({ puzzle, index, mystery = false }: { puzzle: Puzzle; index: number; mystery?: boolean }) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: ROW_BG[row],
          backgroundImage: `url(${puzzle.image})`,
          backgroundSize: '300% 300%',
          backgroundPosition: `${col * 50}% ${row * 50}%`,
          filter: mystery ? 'blur(18px) brightness(0.5) saturate(0.5)' : undefined,
          transform: mystery ? 'scale(1.15)' : undefined,
        }}
      />
      {mystery && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700/80 text-white/80 font-black text-2xl">?</div>
      )}
    </div>
  );
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

interface Bubble { x: number; y: number; r: number; pop: number }

function makeBubbles(seed: number): Bubble[] {
  const rand = rng(seed);
  const out: Bubble[] = [];
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      out.push({
        x: (gx + 0.5) * 25 + (rand() - 0.5) * 12,
        y: (gy + 0.5) * 25 + (rand() - 0.5) * 12,
        r: 22 + rand() * 14,
        pop: 0.05 + rand() * 0.85,
      });
    }
  }
  return out;
}

// Foam over one quarter of the piece. progress 0..1 pops its bubbles.
export function FoamQuadrant({ q, progress, active }: { q: number; progress: number; active: boolean }) {
  const bubbles = useMemo(() => makeBubbles(q * 97 + 13), [q]);
  const left = (q % 2) * 50;
  const top = Math.floor(q / 2) * 50;
  const base = Math.max(0, 1 - progress * 1.15);
  return (
    <div className="absolute overflow-hidden pointer-events-none" style={{ left: `${left}%`, top: `${top}%`, width: '50%', height: '50%' }}>
      <div
        className="absolute inset-0"
        style={{
          opacity: base,
          transition: 'opacity 1s linear',
          background: 'radial-gradient(circle at 30% 30%, #ffffff, #e0f2fe 60%, #bae6fd)',
        }}
      />
      {bubbles.map((b, i) => {
        const popped = progress >= b.pop;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${b.x - b.r / 2}%`,
              top: `${b.y - b.r / 2}%`,
              width: `${b.r}%`,
              height: `${b.r}%`,
              background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #f0f9ff 45%, #bae6fd 100%)',
              boxShadow: 'inset -3px -4px 8px rgba(14,165,233,0.25)',
              transform: popped ? 'scale(1.6)' : 'scale(1)',
              opacity: popped ? 0 : 1,
              transition: 'transform 250ms ease-out, opacity 250ms ease-out',
            }}
          />
        );
      })}
      {active && progress < 1 && <div className="absolute inset-0 ring-4 ring-inset ring-amber-300/90 animate-pulse" />}
    </div>
  );
}

export function MouthMap({ stage }: { stage: number }) {
  return (
    <div className="grid grid-cols-2 gap-1 w-14 h-10 p-1 rounded-full bg-rose-200 shrink-0">
      {BRUSH_STAGES.map((_, i) => (
        <div
          key={i}
          className={`rounded-md transition-colors ${i === stage ? 'bg-amber-300' : i < stage ? 'bg-white' : 'bg-white/40'}`}
        />
      ))}
    </div>
  );
}
