function SelectField({ label, value, options, onChange }) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange, tall = false }) {
  return (
    <label className="field-group">
      <span>{label}</span>
      {tall ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function parseDatatypeParts(dataType) {
  const text = String(dataType ?? "").trim();
  const match = text.match(/^([^()]+?)(?:\(([^)]+)\))?$/);

  return {
    baseType: match?.[1]?.trim() ?? text,
    sizeValue: match?.[2]?.trim() ?? ""
  };
}

export default function RightInspector({
  selectedEntity,
  selectedAttribute,
  selectedRelationship,
  allEntities,
  datatypeOptions,
  importForm,
  providers,
  status,
  zoom,
  onEntityChange,
  onAddAttribute,
  onStartRelationshipLink,
  onDeleteEntity,
  onDeleteAttribute,
  onMoveAttribute,
  onRelationshipChange,
  onDeleteRelationship,
  onSelectRelationship,
  onImportFormChange,
  onImportSchema,
  onZoomIn,
  onZoomOut,
  isLinkingRelationship
}) {
  const selectedRelationshipSource = allEntities.find(
    (entity) => entity.id === selectedRelationship?.sourceEntityId
  );
  const selectedRelationshipTarget = allEntities.find(
    (entity) => entity.id === selectedRelationship?.targetEntityId
  );
  const selectedAttributeDatatypeParts = selectedAttribute
    ? parseDatatypeParts(selectedAttribute.dataType)
    : { baseType: "", sizeValue: "" };
  const datatypeSelectOptions = selectedAttribute
    ? Array.from(
        new Set([
          selectedAttributeDatatypeParts.baseType,
          ...(datatypeOptions ?? [])
        ].filter(Boolean))
      )
    : datatypeOptions ?? [];

  return (
    <aside className="right-inspector">
      <section className="panel helper-panel">
        <p>Use drag and drop to reposition entities, then save the document or import a live schema.</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <span className="panel-label">Schema Import</span>
        </div>
        <SelectField
          label="Provider"
          value={importForm.provider}
          options={providers.map((provider) => provider.id)}
          onChange={(value) => onImportFormChange("provider", value)}
        />
        <TextField
          label="Connection String"
          value={importForm.connectionString}
          onChange={(value) => onImportFormChange("connectionString", value)}
          tall
        />
        <TextField
          label="Database Name"
          value={importForm.databaseName}
          onChange={(value) => onImportFormChange("databaseName", value)}
        />
        <button className="secondary-button" type="button" onClick={onImportSchema}>
          Import Schema
        </button>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <span className="panel-label">Relationships</span>
        </div>
        {selectedRelationship ? (
          <>
            <div className="panel-heading">
              <span className="panel-label">
                {selectedRelationshipSource?.physicalName} → {selectedRelationshipTarget?.physicalName}
              </span>
            </div>
            <TextField
              label="Name"
              value={selectedRelationship.name ?? ""}
              onChange={(value) => onRelationshipChange("name", value)}
            />
            <TextField
              label="Physical Name"
              value={selectedRelationship.physicalName ?? ""}
              onChange={(value) => onRelationshipChange("physicalName", value)}
            />
            <TextField
              label="Description"
              value={selectedRelationship.description ?? ""}
              onChange={(value) => onRelationshipChange("description", value)}
            />
            <SelectField
              label="Parent Attribute"
              value={selectedRelationship.parentAttribute ?? "Entity header"}
              options={["Entity header"]}
              onChange={(value) => onRelationshipChange("parentAttribute", value)}
            />
            <SelectField
              label="Child Attribute"
              value={selectedRelationship.childAttribute ?? "Entity header"}
              options={["Entity header"]}
              onChange={(value) => onRelationshipChange("childAttribute", value)}
            />
            <SelectField
              label="Migrated Key/Index"
              value={selectedRelationship.migratedKeyIndex ?? "Select parent index"}
              options={["Select parent index"]}
              onChange={(value) => onRelationshipChange("migratedKeyIndex", value)}
            />
            <SelectField
              label="Cardinality"
              value={selectedRelationship.cardinality}
              options={["1:1", "1:N", "N:1", "N:N"]}
              onChange={(value) => onRelationshipChange("cardinality", value)}
            />
            <SelectField
              label="Relationship Type"
              value={selectedRelationship.relationshipType ?? "Non-Identifying"}
              options={["Non-Identifying", "Identifying"]}
              onChange={(value) => onRelationshipChange("relationshipType", value)}
            />
            <div className="button-row">
              <button className="danger-button" type="button" onClick={onDeleteRelationship}>
                Delete Relationship
              </button>
            </div>
          </>
        ) : (
          <p className="empty-state">Select a relationship in the diagram to edit its details.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <span className="panel-label">Entity</span>
        </div>

        {selectedEntity ? (
          <>
            <TextField
              label="Name"
              value={selectedEntity.name}
              onChange={(value) => onEntityChange("name", value)}
            />
            <TextField
              label="Physical Name"
              value={selectedEntity.physicalName}
              onChange={(value) => onEntityChange("physicalName", value)}
            />
            <TextField
              label="Comment"
              value={selectedEntity.comment}
              onChange={(value) => onEntityChange("comment", value)}
              tall
            />

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={onAddAttribute}>
                Add Attribute
              </button>
              <button className="secondary-button" type="button" onClick={onStartRelationshipLink}>
                {isLinkingRelationship ? "Pick Entities..." : "Link"}
              </button>
              <button className="danger-button" type="button" onClick={onDeleteEntity}>
                Delete Entity
              </button>
            </div>

            <div className="divider" />

            <div className="panel-heading">
              <span className="panel-label">Attributes</span>
            </div>
            {selectedAttribute ? (
              <>
                <TextField
                  label="Attribute"
                  value={selectedAttribute.name ?? ""}
                  onChange={(value) => onEntityChange("fieldName", value, selectedAttribute.id)}
                />
                <TextField
                  label="Physical Name"
                  value={selectedAttribute.physicalName ?? ""}
                  onChange={(value) => onEntityChange("fieldPhysicalName", value, selectedAttribute.id)}
                />
                <TextField
                  label="Comment"
                  value={selectedAttribute.comment ?? ""}
                  onChange={(value) => onEntityChange("fieldComment", value, selectedAttribute.id)}
                  tall
                />
                <SelectField
                  label="Datatype"
                  value={selectedAttributeDatatypeParts.baseType}
                  options={datatypeSelectOptions}
                  onChange={(value) => {
                    const nextType = selectedAttributeDatatypeParts.sizeValue
                      ? `${value}(${selectedAttributeDatatypeParts.sizeValue})`
                      : value;
                    onEntityChange("fieldType", nextType, selectedAttribute.id);
                  }}
                />
                <TextField
                  label="Size / Precision"
                  value={selectedAttributeDatatypeParts.sizeValue}
                  onChange={(value) => {
                    const nextType = value
                      ? `${selectedAttributeDatatypeParts.baseType}(${value})`
                      : selectedAttributeDatatypeParts.baseType;
                    onEntityChange("fieldType", nextType, selectedAttribute.id);
                  }}
                />
                <SelectField
                  label="Kind"
                  value={selectedAttribute.kind ?? "COL"}
                  options={["PK", "COL", "FK"]}
                  onChange={(value) => onEntityChange("fieldKind", value, selectedAttribute.id)}
                />
                <SelectField
                  label="Primary Key"
                  value={selectedAttribute.isPrimary ? "Yes" : "No"}
                  options={["Yes", "No"]}
                  onChange={(value) => onEntityChange("fieldPrimary", value, selectedAttribute.id)}
                />
                <SelectField
                  label="Nullable"
                  value={selectedAttribute.isNullable === false ? "No" : "Yes"}
                  options={["Yes", "No"]}
                  onChange={(value) => onEntityChange("fieldNullable", value, selectedAttribute.id)}
                />
                <SelectField
                  label="Foreign Key"
                  value={selectedAttribute.isFK ? "Yes" : "No"}
                  options={["Yes", "No"]}
                  onChange={(value) => onEntityChange("fieldForeignKey", value, selectedAttribute.id)}
                />
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={!!selectedAttribute.physicalOnly}
                    onChange={(event) => onEntityChange("fieldPhysicalOnly", event.target.checked, selectedAttribute.id)}
                  />
                  <span>physicalOnly</span>
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={!!selectedAttribute.logicalOnly}
                    onChange={(event) => onEntityChange("fieldLogicalOnly", event.target.checked, selectedAttribute.id)}
                  />
                  <span>logicalOnly</span>
                </label>
                <div className="button-row">
                  <button className="secondary-button" type="button" onClick={() => onMoveAttribute(selectedAttribute.id, "up")}>
                    Move Up
                  </button>
                  <button className="secondary-button" type="button" onClick={() => onMoveAttribute(selectedAttribute.id, "down")}>
                    Move Down
                  </button>
                </div>
                <div className="button-row">
                  <button className="danger-button" type="button" onClick={() => onDeleteAttribute(selectedAttribute.id)}>
                    Delete Attribute
                  </button>
                </div>
              </>
            ) : (
              <p className="empty-state">
                Select an attribute in the diagram to edit its details.
              </p>
            )}

            <div className="divider" />
          </>
        ) : (
          <p className="empty-state">Select an entity to edit its fields.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <span className="panel-label">Status</span>
        </div>
        <div className="mini-list-item status-panel-card">
          <strong>{status}</strong>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onZoomIn}>
            Zoom In
          </button>
          <button className="secondary-button" type="button" onClick={onZoomOut}>
            Zoom Out
          </button>
        </div>
      </section>
    </aside>
  );
}
