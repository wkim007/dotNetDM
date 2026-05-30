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
  relationships,
  allEntities,
  importForm,
  providers,
  onEntityChange,
  onAddAttribute,
  onDeleteEntity,
  onDeleteAttribute,
  onImportFormChange,
  onImportSchema
}) {
  const selectedName = selectedEntity?.id ?? "";
  const relationshipList = relationships.filter(
    (relationship) =>
      relationship.sourceEntityId === selectedName || relationship.targetEntityId === selectedName
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
