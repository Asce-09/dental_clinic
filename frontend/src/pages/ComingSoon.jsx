export default function ComingSoon({ title, phase }) {
  return (
    <div className="placeholder-page">
      <div className="topbar">
        <h1>{title}</h1>
      </div>
      <div className="panel">
        <h3>Coming in {phase}</h3>
        <p>
          This module isn't wired up yet — it'll follow the same pattern as the Dashboard
          once we build it out.
        </p>
      </div>
    </div>
  );
}
