import { useEffect } from "react";
import {
  Activity as ActivityIcon,
  CalendarDays,
  Footprints,
  Repeat,
  Target,
  Timer as TimerIcon,
} from "lucide-react";
import AppShell from "./shell/AppShell.jsx";
import TimerTool from "./tools/Timer.jsx";
import DailiesTool from "./tools/Dailies.jsx";
import GoalsTool from "./tools/Goals.jsx";
import CalendarTool from "./tools/Calendar.jsx";
import HabitsTool from "./tools/Habits.jsx";
import ActivityTool from "./tools/Activity.jsx";
import { dailyForSession } from "./lib/dailies.js";
import { countToday, recordSession, useSessions } from "./lib/sessions.js";
import { useToday } from "./lib/today.js";
import { navigate, useRoute } from "./lib/router.js";
import { formatDuration, onFocusComplete, useTimerSession } from "./lib/timer.js";

const TOOLS = [
  { id: "timer", label: "Timer", icon: TimerIcon, Component: TimerTool },
  { id: "dailies", label: "Dailies", icon: Repeat, Component: DailiesTool },
  // Goals sits beside Dailies because they are the two tools you write
  // intentions into; Calendar and Activity read them back.
  { id: "goals", label: "Goals", icon: Target, Component: GoalsTool },
  { id: "calendar", label: "Calendar", icon: CalendarDays, Component: CalendarTool },
  { id: "habits", label: "Habits", icon: Footprints, Component: HabitsTool },
  { id: "activity", label: "Activity", icon: ActivityIcon, Component: ActivityTool },
];

export default function App() {
  const route = useRoute();
  const session = useTimerSession();
  const sessions = useSessions();
  const today = useToday();

  const tool = TOOLS.find((entry) => entry.id === route);

  // A finished focus block is the event everything else hangs off. The log
  // entry is the whole record: it names the daily the block counted toward — or
  // nothing, when the active daily doesn't repeat on the day it finished — and
  // every notion of a daily being "done today" is counted back out of it.
  useEffect(
    () =>
      onFocusComplete(({ at, minutes }) => {
        recordSession({ at, minutes, dailyId: dailyForSession(at) });
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
      sessionsToday={countToday(sessions, today)}
    >
      <Current />
    </AppShell>
  );
}
