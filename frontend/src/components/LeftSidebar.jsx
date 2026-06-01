function SelectField({ label, value }) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <div className="select-shell">
        <span>{value}</span>
        <span className="caret">▾</span>
      </div>
    </label>
  );
}

export default function LeftSidebar({
  project,
  entityCount,
  relationshipCount,
  jsonDraft,
  onJsonDraftChange,
  onAutoLayout,
  onExportJson,
  onImportJson,
  onClearJson,
  onViewJson
}) {
  return (
    <aside className="left-sidebar">
      <h1>{project.name}</h1>
      <p className="sidebar-copy">{project.definition}</p>

      <section className="panel">
        <div className="panel-label">Project</div>
        <SelectField label="View Mode" value={project.viewMode} />
        <SelectField label="Database" value={project.database} />
        <SelectField label="Database Version" value={project.databaseVersion} />
        <SelectField label="Subject Area" value={project.subjectArea} />

        <div className="stats-grid">
          <div className="stat-chip">
            <strong>{entityCount}</strong>
            <span>Entities</span>
          </div>
          <div className="stat-chip">
            <strong>{relationshipCount}</strong>
            <span>Links</span>
          </div>
        </div>

        <button type="button" className="secondary-button full-width-button" onClick={onAutoLayout}>
          Auto-layout
        </button>

        <label className="field-group">
          <span>Definition</span>
          <textarea readOnly value={project.definition} />
        </label>

        <label className="field-group">
          <span>Diagram Definition</span>
          <textarea readOnly value={project.diagramDefinition} />
        </label>

        <SelectField label="Diagram Display Level" value={project.displayLevel} />
      </section>

      <section className="panel">
        <div className="panel-label">Import / Export JSON</div>

        <div className="button-stack">
          <button type="button" className="secondary-button" onClick={onImportJson}>
            Import JSON
          </button>
          <button type="button" className="secondary-button" onClick={onExportJson}>
            Export JSON
          </button>
          <button type="button" className="secondary-button" onClick={onViewJson}>
            View JSON
          </button>
          <button type="button" className="subtle-button" onClick={onClearJson}>
            Clear JSON
          </button>
        </div>

        <label className="field-group">
          <span>Workspace JSON</span>
          <textarea
            value={jsonDraft}
            onChange={(event) => onJsonDraftChange(event.target.value)}
            placeholder="Paste model JSON here"
          />
        </label>
      </section>
    </aside>
  );
}
