import { useEffect } from "react";
import { Target, Timer as TimerIcon } from "lucide-react";
import AppShell from "./shell/AppShell.jsx";
import TimerTool from "./tools/Timer.jsx";
import GoalsTool from "./tools/Goals.jsx";
import { creditFocusSession } from "./lib/goals.js";
import { countToday, recordSession, useSessions } from "./lib/sessions.js";
import { navigate, useRoute } from "./lib/router.js";
import { formatDuration, onFocusComplete, useTimerSession } from "./lib/timer.js";

const TOOLS = [
  { id: "timer", label: "Timer", icon: TimerIcon, Component: TimerTool },
  { id: "goals", label: "Goals", icon: Target, Component: GoalsTool },
];

export default function App() {
  const route = useRoute();
  const session = useTimerSession();
  const sessions = useSessions();

  const tool = TOOLS.find((entry) => entry.id === route);

  // A finished focus block is the event everything else hangs off. Crediting
  // reports which goal it landed on, so the log can name it even though the
  // goal may retire itself in the same breath.
  useEffect(
    () =>
      onFocusComplete(({ at, minutes }) => {
        const goalId = creditFocusSession();
        recordSession({ at, minutes, goalId });
      }),
    [],
  );

  // An unknown hash shows the first tool; correct the address to match.
  useEffect(() => {
    if (!tool) navigate(TOOLS[0].id);
  }, [tool]);

  const phaseLabel = session.phase === "focus" ? "Focus" : "Break";
  const remaining = formatDuration(session.remaining);

  // The tab is a browser surface too, and this app is built to live in a
  // background one.
  useEffect(() => {
    if (session.running) document.title = `${remaining} · ${phaseLabel} — Orbit`;
    else if (session.finished) document.title = "All done — Orbit";
    else document.title = "Orbit";
  }, [remaining, phaseLabel, session.running, session.finished]);

  const live = session.running
    ? {
        toolId: "timer",
        label: `${phaseLabel} · ${remaining}`,
        color: session.phase === "break" ? "var(--meridian)" : "var(--aurora)",
      }
    : null;

  const Current = (tool ?? TOOLS[0]).Component;

  return (
    <AppShell
      tools={TOOLS}
      activeId={(tool ?? TOOLS[0]).id}
      live={live}
      sessionsToday={countToday(sessions)}
    >
      <Current />
    </AppShell>
  );
}
