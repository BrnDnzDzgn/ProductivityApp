import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";

export default function App() {
  // --- User settings (minutes / counts) ---
  const [studyMin, setStudyMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [rounds, setRounds] = useState(4);
  const [soundOn, setSoundOn] = useState(true);

  // --- Runtime state ---
  const [mode, setMode] = useState("study"); // "study" | "break"
  const [round, setRound] = useState(1);
  const [seconds, setSeconds] = useState(studyMin * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // --- Sound: short tone via Web Audio (no files needed) ---
  const beep = useCallback(
    (freq, duration = 0.18, when = 0) => {
      if (!soundOn) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },
    [soundOn]
  );

  // rising chime = study starts, falling chime = break starts
  const studySound = useCallback(() => {
    beep(660, 0.16, 0);
    beep(880, 0.22, 0.18);
  }, [beep]);
  const breakSound = useCallback(() => {
    beep(660, 0.16, 0);
    beep(440, 0.24, 0.18);
  }, [beep]);
  const finishSound = useCallback(() => {
    beep(523, 0.15, 0);
    beep(659, 0.15, 0.16);
    beep(784, 0.3, 0.32);
  }, [beep]);

  const totalForMode = (m) => (m === "study" ? studyMin : breakMin) * 60;

  // --- Tick ---
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s > 1) return s - 1;

        // phase over -> decide what's next
        if (mode === "study") {
          setMode("break");
          breakSound();
          return breakMin * 60;
        } else {
          // break just ended
          if (round >= rounds) {
            setRunning(false);
            setFinished(true);
            finishSound();
            return 0;
          }
          setRound((r) => r + 1);
          setMode("study");
          studySound();
          return studyMin * 60;
        }
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode, round, rounds, studyMin, breakMin, studySound, breakSound, finishSound]);

  // Keep the displayed time in sync when settings change while idle
  useEffect(() => {
    if (!running && !finished) setSeconds(totalForMode(mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMin, breakMin]);

  const start = () => {
    if (finished) resetAll();
    // resume audio context on user gesture (browser autoplay policy)
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    if (!running && seconds === totalForMode("study") && mode === "study" && round === 1) {
      studySound();
    }
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const resetAll = () => {
    setRunning(false);
    setFinished(false);
    setMode("study");
    setRound(1);
    setSeconds(studyMin * 60);
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const total = totalForMode(mode);
  const progress = total > 0 ? 1 - seconds / total : 0;

  // --- Ring geometry (responsive) ---
  const [size, setSize] = useState(440);
  useEffect(() => {
    const update = () => setSize(Math.min(440, window.innerWidth - 48, window.innerHeight - 260));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const accent = mode === "study" ? "#7c9cff" : "#5fd3a0";
  const label = finished ? "All done" : mode === "study" ? "Focus" : "Break";

  // End time of the current phase, based on the local clock + seconds remaining
  const endTime = new Date(Date.now() + seconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0f16",
        color: "#e6e8ef",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.6s ease",
      }}
    >
      {/* ambient glow — radial gradient fades to transparent so there's no rectangular edge */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          background: `radial-gradient(circle, ${accent} 0%, transparent 60%)`,
          opacity: 0.14,
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "opacity",
        }}
      />

      {/* top bar */}
      <div style={{ position: "absolute", top: 24, right: 24, display: "flex", gap: 8, zIndex: 2 }}>
        <button onClick={() => setSoundOn((v) => !v)} style={iconBtn} title={soundOn ? "Mute" : "Unmute"}>
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button onClick={() => setShowSettings((v) => !v)} style={iconBtn} title="Settings">
          <Settings size={20} />
        </button>
      </div>

      {/* round indicator */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 28, display: "flex", gap: 8 }}>
        {Array.from({ length: rounds }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i < round - (mode === "break" ? 0 : 1) ? accent : "#2a2f3e",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* ring + time */}
      <div style={{ position: "relative", zIndex: 2, width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b1f2b" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.6s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: Math.max(12, size * 0.034), textTransform: "uppercase", letterSpacing: 3, color: accent, marginBottom: 10, transition: "color 0.6s ease" }}>
            {label}
          </div>
          <div style={{ fontSize: size * 0.24, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {fmt(seconds)}
          </div>
          {!finished && (
            <div style={{ fontSize: Math.max(12, size * 0.034), color: "#6b7183", marginTop: 12 }}>
              Round {round} of {rounds}
            </div>
          )}
          {!finished && (
            <div style={{ fontSize: Math.max(11, size * 0.028), color: "#4d5364", marginTop: 4 }}>
              Ends at {endTime}
            </div>
          )}
        </div>
      </div>

      {/* controls */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", gap: 12, marginTop: 40 }}>
        <button onClick={running ? pause : start} style={{ ...btnPrimary, background: accent }}>
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? "Pause" : finished ? "Restart" : "Start"}
        </button>
        <button onClick={resetAll} style={btnGhost}>
          <RotateCcw size={18} /> Reset
        </button>
      </div>

      {/* settings panel */}
      {showSettings && (
        <div style={overlay} onClick={() => setShowSettings(false)}>
          <div style={panel} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Settings</h2>
            <Field label="Study time (minutes)" value={studyMin} min={1} max={120} onChange={setStudyMin} disabled={running} />
            <Field label="Break time (minutes)" value={breakMin} min={1} max={60} onChange={setBreakMin} disabled={running} />
            <Field label="Rounds" value={rounds} min={1} max={12} onChange={setRounds} disabled={running} />
            {running && (
              <p style={{ fontSize: 12, color: "#6b7183", margin: "4px 0 0" }}>
                Pause the timer to change settings.
              </p>
            )}
            <button onClick={() => setShowSettings(false)} style={{ ...btnPrimary, background: "#7c9cff", width: "100%", justifyContent: "center", marginTop: 20 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, min, max, onChange, disabled }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, color: "#8b90a3", marginBottom: 8 }}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "");
          onChange(digits === "" ? "" : parseInt(digits, 10));
        }}
        onBlur={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(isNaN(n) ? min : clamp(n));
        }}
        style={{
          width: "100%",
          textAlign: "center",
          background: "#12151f",
          border: "1px solid #232735",
          borderRadius: 10,
          padding: "12px",
          color: "#e6e8ef",
          fontSize: 16,
          fontWeight: 600,
          outline: "none",
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  );
}

const iconBtn = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid #232735",
  borderRadius: 10,
  color: "#e6e8ef",
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#0d0f16",
  border: "none",
  borderRadius: 12,
  padding: "14px 28px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "transparent",
  color: "#e6e8ef",
  border: "1px solid #232735",
  borderRadius: 12,
  padding: "14px 28px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  padding: 20,
};
const panel = {
  background: "#141824",
  border: "1px solid #232735",
  borderRadius: 18,
  padding: 28,
  width: "100%",
  maxWidth: 360,
};