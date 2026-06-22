import { useEffect, useRef, useState } from "react";

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
  viewCount,
  materializedViewCount,
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
  reverseEngineering,
  onJsonDraftChange,
  onOpenModelProperties,
  onAutoLayout,
  onAddEntity,
  onAddAnnotation,
  onAddDrawing,
  onAddView,
  onAddMaterializedView,
  onStartConnectorRelationship,
  onStartIdentifyingRelationship,
  onStartNonIdentifyingRelationship,
  onStartDerivedRelationship,
  onStartSubCategoryRelationship,
  onProjectChange,
  onExportJson,
  onImportJson,
  onClearJson,
  onViewJson,
  onToggleReverseEngineering,
  onReverseEngineeringChange,
  onConnectReverseEngineering
}) {
  const showReverseEngineering = Boolean(reverseEngineering?.isOpen);
  const [isDrawingPaletteOpen, setIsDrawingPaletteOpen] = useState(false);
  const drawingPaletteRef = useRef(null);
  const normalizedDatabase = String(project.database ?? "").toLowerCase();
  const reverseEngineeringProvider = normalizedDatabase.includes("sql server") || normalizedDatabase.includes("mssql")
    ? "sqlserver"
    : normalizedDatabase.includes("mongo")
      ? "mongodb"
      : "other";
  const reverseEngineeringSupportsConnection =
    reverseEngineeringProvider === "mongodb" || reverseEngineeringProvider === "sqlserver";

  useEffect(() => {
    if (!isDrawingPaletteOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!drawingPaletteRef.current?.contains(event.target)) {
        setIsDrawingPaletteOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isDrawingPaletteOpen]);

  function handleChooseDrawingShape(shape) {
    if (shape === "connector") {
      onStartConnectorRelationship();
    } else {
      onAddDrawing(shape);
    }
    setIsDrawingPaletteOpen(false);
  }

  const drawingShapeOptions = [
    { value: "rectangle", label: "Rectangle", icon: "▭" },
    { value: "rounded", label: "Rounded", icon: "▢" },
    { value: "ellipse", label: "Ellipse", icon: "◯" },
    { value: "diamond", label: "Diamond", icon: "◇" },
    { value: "hexagon", label: "Hexagon", icon: "⬡" },
    { value: "star", label: "Star", icon: "★" },
    { value: "arrow", label: "Arrow", icon: "➜" },
    { value: "connector", label: "Connector", icon: "╱" }
  ];

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
          {viewCount > 0 ? (
            <div className="stat-chip">
              <strong>{viewCount}</strong>
              <span>Views</span>
            </div>
          ) : null}
          {materializedViewCount > 0 ? (
            <div className="stat-chip">
              <strong>{materializedViewCount}</strong>
              <span>Materialized Views</span>
            </div>
          ) : null}
          <div className="stat-chip">
            <strong>{relationshipCount}</strong>
            <span>Links</span>
          </div>
        </div>

        <button type="button" className="secondary-button full-width-button" onClick={onOpenModelProperties}>
          Model Properties
        </button>

        <button type="button" className="secondary-button full-width-button" onClick={onAutoLayout}>
          Auto-layout
        </button>

        <button
          type="button"
          className="secondary-button full-width-button"
          onClick={onToggleReverseEngineering}
        >
          {showReverseEngineering ? "Hide Reverse Engineering" : "Reverse Engineering"}
        </button>

        {showReverseEngineering ? (
          <div className="reverse-engineering-panel">
            <div className="field-group">
              <span>Provider</span>
              <input value={project.database} readOnly />
            </div>

            {reverseEngineeringProvider === "sqlserver" ? (
              <>
                <label className="field-group">
                  <span>Server</span>
                  <input
                    value={reverseEngineering?.server ?? ""}
                    onChange={(event) => onReverseEngineeringChange("server", event.target.value)}
                    placeholder="localhost"
                  />
                </label>

                <label className="field-group">
                  <span>Database</span>
                  <input
                    value={reverseEngineering?.databaseNameInput ?? ""}
                    onChange={(event) => onReverseEngineeringChange("databaseNameInput", event.target.value)}
                    placeholder="master"
                  />
                </label>

                <label className="field-group">
                  <span>User Name</span>
                  <input
                    value={reverseEngineering?.userName ?? ""}
                    onChange={(event) => onReverseEngineeringChange("userName", event.target.value)}
                    placeholder="sa"
                  />
                </label>

                <label className="field-group">
                  <span>Password</span>
                  <input
                    type="password"
                    value={reverseEngineering?.password ?? ""}
                    onChange={(event) => onReverseEngineeringChange("password", event.target.value)}
                    placeholder="Enter password"
                  />
                </label>

                <label className="reverse-engineering-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(reverseEngineering?.useEncryptedConnection)}
                    onChange={(event) => onReverseEngineeringChange("useEncryptedConnection", event.target.checked)}
                  />
                  <span>Use Encrypted Connection</span>
                </label>
              </>
            ) : (
              <label className="field-group">
                <span>Connection String</span>
                <textarea
                  value={reverseEngineering?.connectionString ?? ""}
                  onChange={(event) => onReverseEngineeringChange("connectionString", event.target.value)}
                  placeholder="Enter connection string"
                />
              </label>
            )}

            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={onConnectReverseEngineering}
                disabled={!reverseEngineeringSupportsConnection || reverseEngineering?.isConnecting}
              >
                {reverseEngineering?.isConnecting ? "Connecting..." : "Connect"}
              </button>
            </div>

            {!reverseEngineeringSupportsConnection ? (
              <p className="empty-state">Reverse engineering UI is currently implemented for MongoDB and MS SQL Server.</p>
            ) : null}

          </div>
        ) : null}

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
            <button type="button" className="secondary-button diagram-box-item" onClick={onAddEntity} title="Add Entity">
              <span className="diagram-box-icon">▦</span>
              <span>Entity</span>
            </button>

            <button
              type="button"
              className="secondary-button diagram-box-item"
              onClick={onAddAnnotation}
              title="Add Annotation"
            >
              <span className="diagram-box-icon">≡</span>
              <span>Annotation</span>
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

            {project.viewMode === "Logical View" ? (
              <button
                type="button"
                className={`secondary-button diagram-box-item ${activeRelationshipTool === "Subtype" ? "active" : ""}`}
                onClick={onStartSubCategoryRelationship}
                title="Add Sub-Category Relationship"
              >
                <span className="diagram-box-icon">◌</span>
                <span>Sub-Category</span>
              </button>
            ) : null}

            {showViewObjectsUi || showCachedViewObjectsUi ? (
              <button
                type="button"
                className={`secondary-button diagram-box-item ${activeRelationshipTool === "Derived" ? "active" : ""}`}
                onClick={onStartDerivedRelationship}
                title="Add View/Materialized Relationship"
              >
                <span className="diagram-box-icon">⋯</span>
                <span>View/Materized Rel.</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="field-group diagram-box-field">
          <span>Drawing Box</span>
          <div className="diagram-box-grid">
            <div className="diagram-box-popover" ref={drawingPaletteRef}>
              <button
                type="button"
                className={`secondary-button diagram-box-item ${isDrawingPaletteOpen || activeRelationshipTool === "Connector" ? "active" : ""}`}
                onClick={() => setIsDrawingPaletteOpen((current) => !current)}
                title="Add Drawing"
              >
                <span className="diagram-box-icon">◇</span>
                <span>Drawing</span>
              </button>

              {isDrawingPaletteOpen ? (
                <div className="diagram-shape-palette">
                  <div className="diagram-shape-palette-title">Choose Shape</div>
                  <div className="diagram-shape-palette-grid">
                    {drawingShapeOptions.map((shape) => (
                      <button
                        key={shape.value}
                        type="button"
                        className="diagram-shape-option"
                        title={`Add ${shape.label}`}
                        onClick={() => handleChooseDrawingShape(shape.value)}
                      >
                        <span className="diagram-box-icon">{shape.icon}</span>
                        <span>{shape.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
