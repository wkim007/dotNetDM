function SelectField({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LeftSidebar({
  project,
  entityCount,
  relationshipCount,
  databaseOptions,
  databaseVersionOptions,
  viewModeOptions,
  jsonDraft,
  onJsonDraftChange,
  onAutoLayout,
  onProjectChange,
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
        <SelectField
          label="View Mode"
          value={project.viewMode}
          options={viewModeOptions}
          onChange={(value) => onProjectChange("viewMode", value)}
        />
        <SelectField
          label="Database"
          value={project.database}
          options={databaseOptions}
          onChange={(value) => onProjectChange("database", value)}
        />
        <SelectField
          label="Database Version"
          value={project.databaseVersion}
          options={databaseVersionOptions}
          onChange={(value) => onProjectChange("databaseVersion", value)}
        />
        <SelectField
          label="Subject Area"
          value={project.subjectArea}
          options={[project.subjectArea]}
          onChange={() => {}}
          disabled
        />

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

        <SelectField
          label="Diagram Display Level"
          value={project.displayLevel}
          options={[project.displayLevel]}
          onChange={() => {}}
          disabled
        />
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
