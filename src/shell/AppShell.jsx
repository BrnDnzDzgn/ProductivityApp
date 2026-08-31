import { navigate } from "../lib/router.js";
import "./AppShell.css";

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

/**
 * The frame every tool lives in. It knows the tool list, which one is showing,
 * and whether anything is running — nothing else. Tools stay ignorant of it.
 */
export default function AppShell({ tools, activeId, live, children }) {
  const activeTool = tools.find((tool) => tool.id === activeId) ?? tools[0];

  return (
    <div className="shell" style={live ? { "--live-color": live.color } : undefined}>
      <nav className="rail" aria-label="Tools">
        <p className="brand">Orbit</p>

        {tools.map((tool) => {
          const Icon = tool.icon;
          const isCurrent = tool.id === activeTool.id;
          const showsLive = live?.toolId === tool.id && !isCurrent;

          return (
            <button
              key={tool.id}
              type="button"
              className="rail-item"
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => navigate(tool.id)}
            >
              <span className="rail-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              {tool.label}
              {showsLive && (
                <span className="rail-live" role="img" aria-label={`${tool.label} is running`} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="shell-main">
        <header className="strip">
          <h1 className="strip-title">{activeTool.label}</h1>

          {live && live.toolId !== activeTool.id && (
            <button type="button" className="strip-live" onClick={() => navigate(live.toolId)}>
              <span className="strip-live-dot" aria-hidden="true" />
              {live.label}
            </button>
          )}

          <p className="strip-date">{today()}</p>
        </header>

        <main className="canvas">{children}</main>
      </div>
    </div>
  );
}
