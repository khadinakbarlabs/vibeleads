import { Activity, ChartNoAxesColumn, CheckCheck, Layers3 } from "lucide-react";
export function WorkspacePreview() {
  return (
    <figure id="preview" className="rd-preview">
      <figcaption>
        <span>
          <Layers3 size={15} /> Workspace preview
        </span>
        <small>Example data</small>
      </figcaption>
      <div className="rd-preview-grid">
        <div>
          <small>Workflow runs</small>
          <strong>24</strong>
        </div>
        <div>
          <small>Completed</small>
          <strong>22</strong>
        </div>
        <div>
          <small>In progress</small>
          <strong>2</strong>
        </div>
      </div>
      <div className="rd-preview-panel">
        <div>
          <Activity size={16} />
          <b>Weekly activity</b>
        </div>
        <div
          className="rd-preview-bars"
          aria-label="Example run counts from Monday to Sunday: 2, 4, 3, 5, 2, 6, 2"
        >
          {[2, 4, 3, 5, 2, 6, 2].map((n, i) => (
            <div key={i}>
              <strong>{n}</strong>
              <i style={{ height: n * 11 }} />
              <small>{["M", "T", "W", "T", "F", "S", "S"][i]}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="rd-preview-row">
        <ChartNoAxesColumn size={17} />
        <strong>Local business discovery</strong>
        <span>
          <CheckCheck size={13} /> Completed
        </span>
      </div>
    </figure>
  );
}
