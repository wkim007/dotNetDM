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

export default function RightInspector({
  selectedEntity,
  selectedRelationship,
  relationships,
  allEntities,
  importForm,
  providers,
  onEntityChange,
  onAddAttribute,
  onStartRelationshipLink,
  onDeleteEntity,
  onDeleteAttribute,
  onRelationshipChange,
  onDeleteRelationship,
  onSelectRelationship,
  onImportFormChange,
  onImportSchema,
  isLinkingRelationship
}) {
  const selectedName = selectedEntity?.id ?? "";
  const relationshipList = relationships.filter(
    (relationship) =>
      relationship.sourceEntityId === selectedName || relationship.targetEntityId === selectedName
  );
  const selectedRelationshipSource = allEntities.find(
    (entity) => entity.id === selectedRelationship?.sourceEntityId
  );
  const selectedRelationshipTarget = allEntities.find(
    (entity) => entity.id === selectedRelationship?.targetEntityId
  );

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
        <div className="mini-list">
          {relationships.length > 0 ? (
            relationships.map((relationship) => {
              const source = allEntities.find((entity) => entity.id === relationship.sourceEntityId);
              const target = allEntities.find((entity) => entity.id === relationship.targetEntityId);

              return (
                <button
                  key={relationship.id}
                  type="button"
                  className={`relationship-list-card ${selectedRelationship?.id === relationship.id ? "active" : ""}`}
                  onClick={() => onSelectRelationship(relationship.id)}
                >
                  <strong>{relationship.physicalName ?? relationship.id}</strong>
                  <span>{source?.physicalName} → {target?.physicalName}</span>
                </button>
              );
            })
          ) : (
            <div className="mini-list-item">
              <span>No relationships in this diagram.</span>
            </div>
          )}
        </div>

        {selectedRelationship ? (
          <>
            <div className="divider" />
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
        ) : null}
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
            <div className="mini-list">
              {selectedEntity.fields.map((attribute) => (
                <div key={attribute.id} className="mini-list-item editable-mini-list-item">
                  <input
                    value={attribute.name}
                    onChange={(event) => onEntityChange("fieldName", event.target.value, attribute.id)}
                  />
                  <input
                    value={attribute.dataType}
                    onChange={(event) => onEntityChange("fieldType", event.target.value, attribute.id)}
                  />
                  <select
                    value={attribute.kind}
                    onChange={(event) => onEntityChange("fieldKind", event.target.value, attribute.id)}
                  >
                    <option value="PK">PK</option>
                    <option value="COL">COL</option>
                    <option value="FK">FK</option>
                  </select>
                  <button className="subtle-button" type="button" onClick={() => onDeleteAttribute(attribute.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="panel-heading">
              <span className="panel-label">Relationships</span>
            </div>
            <div className="mini-list">
              {relationshipList.length > 0 ? (
                relationshipList.map((relationship) => {
                  const source = allEntities.find((entity) => entity.id === relationship.sourceEntityId);
                  const target = allEntities.find((entity) => entity.id === relationship.targetEntityId);

                  return (
                    <div key={relationship.id} className="mini-list-item">
                      <strong>{relationship.id}</strong>
                      <span>
                        {source?.physicalName} {relationship.cardinality} {target?.physicalName}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="mini-list-item">
                  <span>No relationships for the selected entity.</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="empty-state">Select an entity to edit its fields.</p>
        )}
      </section>
    </aside>
  );
}
