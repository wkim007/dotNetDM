function SelectField({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => {
          const resolvedOption = typeof option === "string"
            ? { value: option, label: option }
            : option;

          return (
            <option key={resolvedOption.value} value={resolvedOption.value}>
              {resolvedOption.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function LeftSidebar({
  project,
  entityCount,
  relationshipCount,
  activeRelationshipTool,
  showViewObjectsUi,
  showCachedViewObjectsUi,
  cachedViewUiName,
  databaseOptions,
  databaseVersionOptions,
  displayLevelOptions,
  viewModeOptions,
  jsonDraft,
  onJsonDraftChange,
  onAutoLayout,
  onAddEntity,
  onAddView,
  onAddMaterializedView,
  onStartIdentifyingRelationship,
  onStartNonIdentifyingRelationship,
  onStartDerivedRelationship,
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
          options={displayLevelOptions}
          onChange={(value) => onProjectChange("displayLevel", value)}
        />

        <div className="field-group diagram-box-field">
          <span>Diagram Box</span>
          <div className="diagram-box-grid">
            <button type="button" className="secondary-button diagram-box-item active" onClick={onAddEntity} title="Add Entity">
              <span className="diagram-box-icon">▦</span>
              <span>Entity</span>
            </button>

            {showViewObjectsUi ? (
              <button type="button" className="secondary-button diagram-box-item" onClick={onAddView} title="Add View">
                <span className="diagram-box-icon diagram-box-icon-svg">
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="14" y="6" width="36" height="10" rx="1.5" />
                      <path d="M32 16v8M10 24h44M14 24v7M32 24v7M50 24v7" />
                      <rect x="6" y="31" width="12" height="14" rx="1.5" />
                      <rect x="26" y="31" width="12" height="10" rx="1.5" />
                      <rect x="46" y="31" width="12" height="10" rx="1.5" />
                      <path d="M26 48c3.5-6.5 9-10 16-10s12.5 3.5 16 10c-3.5 6.5-9 10-16 10s-12.5-3.5-16-10z" />
                      <circle cx="42" cy="48" r="4.2" />
                    </g>
                  </svg>
                </span>
                <span>View</span>
              </button>
            ) : null}

            {showCachedViewObjectsUi ? (
              <button
                type="button"
                className="secondary-button diagram-box-item"
                onClick={onAddMaterializedView}
                title={`Add ${cachedViewUiName}`}
              >
                <span className="diagram-box-icon diagram-box-icon-svg">
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="20" cy="14" rx="10" ry="5" />
                      <path d="M10 14v12c0 2.8 4.5 5 10 5s10-2.2 10-5V14" />
                      <ellipse cx="44" cy="44" rx="10" ry="5" />
                      <path d="M34 44v10c0 2.8 4.5 5 10 5s10-2.2 10-5V44" />
                      <path d="M28 24h14M34 20l-6 4 6 4" />
                      <path d="M36 40H22M30 36l6 4-6 4" />
                    </g>
                  </svg>
                </span>
                <span>{cachedViewUiName}</span>
              </button>
            ) : null}

            <button
              type="button"
              className={`secondary-button diagram-box-item ${activeRelationshipTool === "Identifying" ? "active" : ""}`}
              onClick={onStartIdentifyingRelationship}
              title="Add Identifying Relationship"
            >
              <span className="diagram-box-icon">↘</span>
              <span>Identifying</span>
            </button>

            <button
              type="button"
              className={`secondary-button diagram-box-item ${activeRelationshipTool === "Non-Identifying" ? "active" : ""}`}
              onClick={onStartNonIdentifyingRelationship}
              title="Add Non-Identifying Relationship"
            >
              <span className="diagram-box-icon">⇢</span>
              <span>Non-Identifying</span>
            </button>

            <button
              type="button"
              className={`secondary-button diagram-box-item ${activeRelationshipTool === "Derived" ? "active" : ""}`}
              onClick={onStartDerivedRelationship}
              title="Add View/Materialized Relationship"
            >
              <span className="diagram-box-icon">⋯</span>
              <span>View/Materized Rel.</span>
            </button>
          </div>
        </div>
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
