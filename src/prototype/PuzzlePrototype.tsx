// Puzzle mode prototype: a 3x3 vignette puzzle where each brush earns one piece.
// During the 2-minute brush the piece is revealed in four 30-second stages that
// follow the four mouth quadrants. Standalone route (/puzzle-prototype), no
// profile or backend needed; progress lives in localStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, X, RotateCcw, FastForward, Minus, Plus } from 'lucide-react';
import { PUZZLES, type Puzzle } from './puzzles';

const BRUSH_SECONDS = 120;
const STAGES = [
  { label: 'top left', short: 'Top left' },
  { label: 'top right', short: 'Top right' },
  { label: 'bottom left', short: 'Bottom left' },
  { label: 'bottom right', short: 'Bottom right' },
];
const STORAGE_KEY = 'puzzle-prototype-v1';
const ROW_BG = [
  'linear-gradient(#7dd3fc,#bae6fd)',
  'linear-gradient(#38bdf8,#0ea5e9)',
  'linear-gradient(#0369a1,#075985)',
];

type Mode = 'board' | 'brushing' | 'reveal';

// ---------- helpers ----------

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 1.2;
  window.speechSynthesis.speak(u);
}

let audioCtx: AudioContext | null = null;
function chime(freqs = [660, 880]) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch {
    /* audio is optional */
  }
}

// Deterministic pseudo-random so the bubbles don't reshuffle on re-render.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function useImageOk(src: string) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  return ok;
}

// ---------- piece art (crop of the master image, or placeholder) ----------

function PieceArt({ puzzle, index, imgOk, mystery = false }: { puzzle: Puzzle; index: number; imgOk: boolean | null; mystery?: boolean }) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const piece = puzzle.pieces[index];
  const filter = mystery ? 'blur(18px) brightness(0.5) saturate(0.5)' : undefined;
  return (
    <div className="absolute inset-0 overflow-hidden">
      {imgOk ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${puzzle.image})`,
            backgroundSize: '300% 300%',
            backgroundPosition: `${col * 50}% ${row * 50}%`,
            filter,
            transform: mystery ? 'scale(1.15)' : undefined,
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: ROW_BG[row], filter }}>
          <span style={{ fontSize: 'min(18vw, 7rem)' }}>{piece.emoji}</span>
        </div>
      )}
      {mystery && (
        // Mostly opaque so only a hint of colour shows through: kids can't peek.
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700/80 text-white/80 font-black text-3xl">?</div>
      )}
    </div>
  );
}

// ---------- foam overlay: four quadrants scrubbed clean in turn ----------

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

function FoamQuadrant({ q, progress, active }: { q: number; progress: number; active: boolean }) {
  const bubbles = useMemo(() => makeBubbles(q * 97 + 13), [q]);
  const left = (q % 2) * 50;
  const top = Math.floor(q / 2) * 50;
  const base = Math.max(0, 1 - progress * 1.15);
  return (
    <div className="absolute overflow-hidden pointer-events-none" style={{ left: `${left}%`, top: `${top}%`, width: '50%', height: '50%' }}>
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: base,
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
      {active && progress < 1 && (
        <div className="absolute inset-0 ring-4 ring-inset ring-amber-300/90 animate-pulse" />
      )}
    </div>
  );
}

// ---------- mouth map: which teeth to brush now ----------

function MouthMap({ stage }: { stage: number }) {
  return (
    <div className="grid grid-cols-2 gap-1 w-14 h-10 p-1 rounded-full bg-rose-200">
      {STAGES.map((_, i) => (
        <div
          key={i}
          className={`rounded-md transition-colors ${i === stage ? 'bg-amber-300' : i < stage ? 'bg-white' : 'bg-white/40'}`}
        />
      ))}
    </div>
  );
}

// ---------- screens ----------

export function PuzzlePrototype() {
  const [variant, setVariant] = useState(0);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const base = PUZZLES[puzzleIdx];
  const variants = useMemo(() => base.variants ?? [base.image], [base]);
  const puzzle = useMemo(() => ({ ...base, image: variants[variant % variants.length] }), [base, variants, variant]);
  const imgOk = useImageOk(puzzle.image);
  const [collected, setCollected] = useState<number>(() => {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) ? Math.min(9, Math.max(0, n)) : 0;
  });
  const [mode, setMode] = useState<Mode>('board');
  const [speed, setSpeed] = useState(1);
  const [justAdded, setJustAdded] = useState<number | null>(null);

  useEffect(() => localStorage.setItem(STORAGE_KEY, String(collected)), [collected]);

  const complete = collected >= 9;
  const target = Math.min(collected, 8);

  const finishBrush = useCallback(() => {
    setMode('reveal');
    chime([523, 659, 784, 1047]);
    speak(`You found ${puzzle.pieces[target].name}!`);
  }, [puzzle, target]);

  const addPiece = () => {
    setMode('board');
    setJustAdded(target);
    setTimeout(() => {
      setCollected((c) => Math.min(9, c + 1));
      chime([784, 1047]);
      if (target === 8) setTimeout(() => speak(`You finished ${puzzle.title}! Amazing brushing!`), 900);
    }, 450);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-100 to-amber-50 text-slate-800 flex flex-col">
      <AnimatePresence mode="wait">
        {mode === 'board' && (
          <BoardScreen
            key="board"
            puzzle={puzzle}
            imgOk={imgOk}
            collected={collected}
            justAdded={justAdded}
            complete={complete}
            onBrush={() => {
              setJustAdded(null);
              setMode('brushing');
            }}
          />
        )}
        {mode === 'brushing' && (
          <BrushScreen key="brush" puzzle={puzzle} imgOk={imgOk} index={target} speed={speed} onDone={finishBrush} onExit={() => setMode('board')} />
        )}
        {mode === 'reveal' && (
          <RevealScreen key="reveal" puzzle={puzzle} imgOk={imgOk} index={target} onAdd={addPiece} />
        )}
      </AnimatePresence>

      {/* Prototype controls */}
      <div className="mt-auto px-4 py-3 bg-slate-900/90 text-white text-sm flex flex-wrap items-center gap-3 justify-center">
        <span className="opacity-60">Prototype</span>
        <button onClick={() => setSpeed((s) => (s === 1 ? 10 : 1))} className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10">
          <FastForward className="w-4 h-4" /> {speed}x timer
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollected((c) => Math.max(0, c - 1))} className="p-1 rounded-full bg-white/10" aria-label="Remove piece"><Minus className="w-4 h-4" /></button>
          <span className="w-16 text-center">{collected}/9 pieces</span>
          <button onClick={() => setCollected((c) => Math.min(9, c + 1))} className="p-1 rounded-full bg-white/10" aria-label="Add piece"><Plus className="w-4 h-4" /></button>
        </div>
        <button onClick={() => { setCollected(0); setMode('board'); setJustAdded(null); }} className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button onClick={() => { setPuzzleIdx((i) => (i + 1) % PUZZLES.length); setVariant(0); setMode('board'); }} className="px-3 py-1 rounded-full bg-white/10">
          Puzzle: {base.title}
        </button>
        {variants.length > 1 && (
          <button onClick={() => setVariant((v) => (v + 1) % variants.length)} className="px-3 py-1 rounded-full bg-white/10">
            Image {variant + 1}/{variants.length}
          </button>
        )}
        {imgOk === false && <span className="text-amber-300">Placeholder art (no generated image yet)</span>}
      </div>
    </div>
  );
}

function BoardScreen({ puzzle, imgOk, collected, justAdded, complete, onBrush }: {
  puzzle: Puzzle; imgOk: boolean | null; collected: number; justAdded: number | null; complete: boolean; onBrush: () => void;
}) {
  return (
    <motion.div className="flex-1 flex flex-col items-center px-4 pt-6 pb-4 gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center">
        <h1 className="text-3xl font-black text-sky-700">{puzzle.title}</h1>
        <p className="text-slate-500 font-semibold">
          {complete ? 'Puzzle complete!' : `${collected} of 9 pieces found`}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-3 rounded-3xl overflow-hidden shadow-xl bg-slate-300"
        style={{ width: 'min(92vw, 62vh, 520px)', aspectRatio: '1' }}
        animate={{ gap: complete ? 0 : 6, padding: complete ? 0 : 6 }}
        transition={{ duration: 0.8, delay: complete ? 0.4 : 0 }}
      >
        {puzzle.pieces.map((p, i) => {
          const have = i < collected;
          const isNext = i === collected && !complete;
          return (
            <div key={i} className={`relative overflow-hidden ${complete ? '' : 'rounded-xl'} ${isNext ? 'ring-4 ring-amber-300 animate-pulse' : ''}`}>
              {have ? (
                <motion.div
                  className="absolute inset-0"
                  initial={i === justAdded ? { scale: 1.6, opacity: 0, rotate: -8 } : false}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <PieceArt puzzle={puzzle} index={i} imgOk={imgOk} />
                </motion.div>
              ) : (
                <PieceArt puzzle={puzzle} index={i} imgOk={imgOk} mystery />
              )}
              <span className="sr-only">{have ? p.name : 'Mystery piece'}</span>
            </div>
          );
        })}
      </motion.div>

      {!complete ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBrush}
          className="px-8 py-4 rounded-full bg-amber-400 text-slate-900 text-xl font-black shadow-lg"
        >
          🪥 Brush to find piece {collected + 1}
        </motion.button>
      ) : (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }} className="text-2xl font-black text-amber-500">
          🎉 You did it! 🎉
        </motion.p>
      )}

      {collected > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {puzzle.pieces.slice(0, collected).map((p) => (
            <span key={p.name} className="px-3 py-1 rounded-full bg-white shadow text-sm font-bold">{p.emoji} {p.name}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BrushScreen({ puzzle, imgOk, index, speed, onDone, onExit }: {
  puzzle: Puzzle; imgOk: boolean | null; index: number; speed: number; onDone: () => void; onExit: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const last = useRef<number | null>(null);
  const doneRef = useRef(false);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // 3-2-1 countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [countdown]);

  // Timer loop
  useEffect(() => {
    if (countdown > 0 || paused) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current != null) {
        const dt = ((now - last.current) / 1000) * speedRef.current;
        setElapsed((e) => Math.min(BRUSH_SECONDS, e + dt));
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [countdown, paused]);

  const stageLen = BRUSH_SECONDS / 4;
  const stage = Math.min(3, Math.floor(elapsed / stageLen));
  const stageProgress = (q: number) => Math.max(0, Math.min(1, (elapsed - q * stageLen) / stageLen));

  // Voice prompt at each stage change
  const lastStage = useRef(-1);
  useEffect(() => {
    if (countdown > 0) return;
    if (stage !== lastStage.current) {
      lastStage.current = stage;
      chime();
      speak(stage === 0 ? `Start with your ${STAGES[0].label} teeth!` : `Now your ${STAGES[stage].label} teeth!`);
    }
  }, [stage, countdown]);

  useEffect(() => {
    if (elapsed >= BRUSH_SECONDS && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [elapsed, onDone]);

  const remaining = Math.ceil(BRUSH_SECONDS - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');
  const ringPct = (elapsed / BRUSH_SECONDS) * 100;

  return (
    <motion.div className="flex-1 flex flex-col items-center px-4 pt-4 pb-4 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="w-full max-w-md flex items-center justify-between">
        <button onClick={onExit} className="p-2 rounded-full bg-white shadow" aria-label="Exit"><X className="w-5 h-5" /></button>
        <div
          className="w-20 h-20 rounded-full grid place-items-center"
          style={{ background: `conic-gradient(#fbbf24 ${ringPct}%, #e2e8f0 ${ringPct}%)` }}
        >
          <div className="w-16 h-16 rounded-full bg-white grid place-items-center font-black text-xl">{mm}:{ss}</div>
        </div>
        <button onClick={() => setPaused((p) => !p)} className="p-2 rounded-full bg-white shadow" aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-full pl-2 pr-5 py-2 shadow">
        <MouthMap stage={stage} />
        <p className="font-black text-lg">
          Brush your <span className="text-amber-500">{STAGES[stage].label}</span> teeth
        </p>
      </div>

      <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ width: 'min(88vw, 58vh, 480px)', aspectRatio: '1' }}>
        <PieceArt puzzle={puzzle} index={index} imgOk={imgOk} />
        {[0, 1, 2, 3].map((q) => (
          <FoamQuadrant key={q} q={q} progress={stageProgress(q)} active={q === stage && countdown <= 0} />
        ))}
        <AnimatePresence>
          {countdown > 0 && (
            <motion.div
              key={countdown}
              className="absolute inset-0 grid place-items-center text-8xl font-black text-sky-600"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
            >
              {countdown}
            </motion.div>
          )}
        </AnimatePresence>
        {paused && <div className="absolute inset-0 bg-black/40 grid place-items-center text-white text-3xl font-black">Paused</div>}
      </div>

      <p className="text-slate-500 font-semibold text-center">Scrub away the bubbles to find piece {index + 1} of 9!</p>
    </motion.div>
  );
}

function RevealScreen({ puzzle, imgOk, index, onAdd }: { puzzle: Puzzle; imgOk: boolean | null; index: number; onAdd: () => void }) {
  const piece = puzzle.pieces[index];
  return (
    <motion.div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
      <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-xl font-black text-sky-700">You found...</motion.p>
      <motion.div
        className="relative rounded-3xl overflow-hidden shadow-2xl ring-8 ring-amber-300"
        style={{ width: 'min(80vw, 50vh, 420px)', aspectRatio: '1' }}
        initial={{ rotate: -6, scale: 0.8 }}
        animate={{ rotate: [-6, 4, 0], scale: [0.8, 1.08, 1] }}
        transition={{ duration: 0.7 }}
      >
        <PieceArt puzzle={puzzle} index={index} imgOk={imgOk} />
      </motion.div>
      <motion.h2 initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }} className="text-3xl font-black text-amber-500 text-center">
        {piece.emoji} {piece.name}!
      </motion.h2>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="px-8 py-4 rounded-full bg-sky-500 text-white text-xl font-black shadow-lg"
      >
        Add it to my puzzle
      </motion.button>
    </motion.div>
  );
}
