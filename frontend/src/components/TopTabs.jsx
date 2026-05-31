export default function TopTabs({
  tabs,
  onSelectTab,
  onCloseTab,
  onAddDiagram,
  onAddEntity,
  onReload,
  onSave
}) {
  return (
    <div className="top-tabs">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill ${tab.active ? "active" : ""}`}
            type="button"
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
            <span
              className="pill-close"
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>

      <div className="toolbar-actions">
        <button type="button" className="secondary-button diagram-button" onClick={onAddDiagram}>
          + Diagram
        </button>
        <button type="button" className="secondary-button diagram-button" onClick={onAddEntity}>
          + Entity
        </button>
        <button type="button" className="secondary-button diagram-button" onClick={onReload}>
          Reload
        </button>
        <button type="button" className="secondary-button diagram-button" onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}
