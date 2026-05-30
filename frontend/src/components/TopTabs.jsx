export default function TopTabs({ tabs, onAddEntity, onReload, onSave }) {
  return (
    <div className="top-tabs">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill ${tab.active ? "active" : ""}`}
            type="button"
          >
            {tab.label}
            <span className="pill-close">×</span>
          </button>
        ))}
      </div>

      <div className="toolbar-actions">
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
