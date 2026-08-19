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
  aiModeler,
  aiLoading,
  aiActiveTask,
  aiElapsedSec,
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
  onOpenAiSettings,
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
  onConnectReverseEngineering,
  onAiSchemaDescriptionChange,
  onAiGenerate,
  onAiGenerateComments,
  onAiSummary,
  onAiTuning
}) {
  const showReverseEngineering = Boolean(reverseEngineering?.isOpen);
  const [isDrawingPaletteOpen, setIsDrawingPaletteOpen] = useState(false);
  const drawingPaletteRef = useRef(null);
  const normalizedDatabase = String(project.database ?? "").toLowerCase();
  const reverseEngineeringProvider = normalizedDatabase.includes("sql server") || normalizedDatabase.includes("mssql")
    ? "sqlserver"
    : normalizedDatabase.includes("postgres")
      ? "postgresql"
    : normalizedDatabase.includes("mongo")
      ? "mongodb"
      : "other";
  const reverseEngineeringSupportsConnection =
    reverseEngineeringProvider === "mongodb" ||
    reverseEngineeringProvider === "sqlserver" ||
    reverseEngineeringProvider === "postgresql";
  const usesStructuredReverseEngineeringForm =
    reverseEngineeringProvider === "sqlserver" || reverseEngineeringProvider === "postgresql";
  const databasePlaceholder = reverseEngineeringProvider === "postgresql" ? "postgres" : "master";
  const userNamePlaceholder = reverseEngineeringProvider === "postgresql" ? "postgres" : "sa";
  const serverPlaceholder = reverseEngineeringProvider === "postgresql" ? "localhost" : "localhost";
  const portPlaceholder = reverseEngineeringProvider === "postgresql" ? "5432" : "";

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
    { value: "rounded", label: "Round Rectangle", icon: "▢" },
    { value: "ellipse", label: "Ellipse", icon: "◯" },
    { value: "diamond", label: "Diamond", icon: "◇" },
    { value: "hexagon", label: "Hexagon", icon: "⬡" },
    { value: "octagon", label: "Octagon", icon: "⯃" },
    { value: "parallelogram", label: "Parallelogram", icon: "▱" },
    { value: "pentagon", label: "Pentagon", icon: "⬠" },
    { value: "star", label: "Star", icon: "★" },
    { value: "cross", label: "Cross", icon: "✚" },
    { value: "triangle-up", label: "Triangle Up", icon: "▲" },
    { value: "triangle-down", label: "Triangle Down", icon: "▼" },
    { value: "triangle-left", label: "Triangle Left", icon: "◀" },
    { value: "triangle-right", label: "Triangle Right", icon: "▶" },
    { value: "connector", label: "Connector", icon: "╱" }
  ];
  const aiConfigValidated = aiModeler?.validationStatus === "success";

  function SettingsIcon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 8.75a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5zm8 3.25l-1.84-.64a6.5 6.5 0 00-.53-1.27l.84-1.76-1.8-1.8-1.76.84c-.4-.22-.82-.4-1.27-.53L12 3.99l-2.64 1.05c-.45.13-.87.31-1.27.53l-1.76-.84-1.8 1.8.84 1.76c-.22.4-.4.82-.53 1.27L4 12l1.05 2.64c.13.45.31.87.53 1.27l-.84 1.76 1.8 1.8 1.76-.84c.4.22.82.4 1.27.53L12 20l2.64-1.05c.45-.13.87-.31 1.27-.53l1.76.84 1.8-1.8-.84-1.76c.22-.4.4-.82.53-1.27L20 12z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function GenerateIcon() {
    return (
      <svg className="ai-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function CommentsIcon() {
    return (
      <svg className="ai-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 5h12M6 9h12M6 13h8M6 19l3-3h9a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h0v2z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function SummaryIcon() {
    return (
      <svg className="ai-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 18V6m5 12v-8m5 8V4m6 14v-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function TuningIcon() {
    return (
      <svg className="ai-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 3l.6 2.1a2 2 0 001.3 1.3L18 7l-2.1.6a2 2 0 00-1.3 1.3L14 11l-.6-2.1A2 2 0 0012.1 7L10 6.4l2.1-.6a2 2 0 001.3-1.3L14 3zM6 14l.5 1.6a1.6 1.6 0 001 1L9 17l-1.5.4a1.6 1.6 0 00-1 1L6 20l-.5-1.6a1.6 1.6 0 00-1-1L3 17l1.5-.4a1.6 1.6 0 001-1L6 14z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="17.5" cy="16.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  function Spinner() {
    return <span className="spinner" aria-hidden="true"></span>;
  }

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

        <section className="panel ai-modeler-panel">
          <div className="panel-heading ai-modeler-heading">
            <div className={`panel-label ai-modeler-label ${aiConfigValidated ? "validated" : ""}`}>
              AI Modeler
            </div>
            <button
              type="button"
              className="icon-button ai-settings-button"
              onClick={onOpenAiSettings}
              title="Open AI Settings"
              aria-label="Open AI Settings"
            >
              <SettingsIcon />
            </button>
          </div>

          <label className="field-group">
            <span>Current AI Engine</span>
            <input value={aiModeler?.engine ?? "Azure OpenAI"} readOnly />
          </label>

          <label className="field-group">
            <span>Schema Description</span>
            <textarea
              value={aiModeler?.schemaDescription ?? ""}
              onChange={(event) => onAiSchemaDescriptionChange(event.target.value)}
              placeholder="e.g. HR Schema with 5 tables"
            />
          </label>

          <div className="ai-modeler-actions">
            <button
              type="button"
              className="secondary-button full-width-button ai-action-button"
              onClick={onAiGenerate}
              disabled={aiLoading || !aiConfigValidated}
            >
              {aiLoading && aiActiveTask === "generate" ? (
                <>
                  <Spinner />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <GenerateIcon />
                  <span>Generate</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="secondary-button full-width-button ai-action-button"
              onClick={onAiGenerateComments}
              disabled={aiLoading || !aiConfigValidated}
            >
              {aiLoading && aiActiveTask === "comments" ? (
                <>
                  <Spinner />
                  <span>Commenting...</span>
                </>
              ) : (
                <>
                  <CommentsIcon />
                  <span>Generate Comments</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="secondary-button full-width-button ai-action-button"
              onClick={onAiSummary}
              disabled={aiLoading || !aiConfigValidated}
            >
              <SummaryIcon />
              <span>Summary</span>
            </button>
            <button
              type="button"
              className="secondary-button full-width-button ai-action-button"
              onClick={onAiTuning}
              disabled={aiLoading || !aiConfigValidated}
            >
              {aiLoading && aiActiveTask === "tuning" ? (
                <>
                  <Spinner />
                  <span>Tuning...</span>
                </>
              ) : (
                <>
                  <TuningIcon />
                  <span>AI Tuning</span>
                </>
              )}
            </button>
          </div>

          {aiLoading ? (
            <div className="ai-progress-wrap" aria-live="polite">
              <div className="ai-progress-label">{`AI is processing... (${aiElapsedSec}s)`}</div>
              <div className="ai-progress-track">
                <div className="ai-progress-bar"></div>
              </div>
            </div>
          ) : null}
        </section>

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

            {usesStructuredReverseEngineeringForm ? (
              <>
                <label className="field-group">
                  <span>Server</span>
                  <input
                    value={reverseEngineering?.server ?? ""}
                    onChange={(event) => onReverseEngineeringChange("server", event.target.value)}
                    placeholder={serverPlaceholder}
                  />
                </label>

                <label className="field-group">
                  <span>Database</span>
                  <input
                    value={reverseEngineering?.databaseNameInput ?? ""}
                    onChange={(event) => onReverseEngineeringChange("databaseNameInput", event.target.value)}
                    placeholder={databasePlaceholder}
                  />
                </label>

                {reverseEngineeringProvider === "postgresql" ? (
                  <label className="field-group">
                    <span>Port</span>
                    <input
                      value={reverseEngineering?.port ?? ""}
                      onChange={(event) => onReverseEngineeringChange("port", event.target.value)}
                      placeholder={portPlaceholder}
                    />
                  </label>
                ) : null}

                <label className="field-group">
                  <span>User Name</span>
                  <input
                    value={reverseEngineering?.userName ?? ""}
                    onChange={(event) => onReverseEngineeringChange("userName", event.target.value)}
                    placeholder={userNamePlaceholder}
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
              <p className="empty-state">Reverse engineering UI is currently implemented for MongoDB, PostgreSQL, and MS SQL Server.</p>
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
