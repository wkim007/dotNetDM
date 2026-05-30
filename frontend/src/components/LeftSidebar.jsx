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

export default function LeftSidebar({ project, entityCount, relationshipCount }) {
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
    </aside>
  );
}
