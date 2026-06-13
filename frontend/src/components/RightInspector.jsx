import { useEffect, useMemo, useState } from "react";

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

function getObjectTypeLabel(entity) {
  if (entity?.objectType === "view") {
    return "View";
  }

  if (entity?.objectType === "materializedView") {
    return "Materialized View";
  }

  return "Entity";
}

function ObjectBrowserSection({ title, items, onEditEntity, onGoToEntity }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <span className="panel-label">{title}</span>
      </div>
      <div className="mini-list">
        {items.map((entity) => (
          <div key={entity.id} className="mini-list-item entity-browser-card">
            <strong>{entity.physicalName ?? entity.name}</strong>
            <span>{getObjectTypeLabel(entity).toUpperCase()}</span>
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => onEditEntity(entity.id)}>
                Edit
              </button>
              <button className="secondary-button" type="button" onClick={() => onGoToEntity(entity.id)}>
                Go To
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function RightInspector({
  selectedEntity,
  selectedAttribute,
  selectedRelationship,
  allEntities,
  allRelationships,
  schemas,
  datatypeOptions,
  importForm,
  providers,
  status,
  zoom,
  onAddSchema,
  onSchemaChange,
  onDeleteSchema,
  onEntityChange,
  onEditEntity,
  onGoToEntity,
  onEditRelationship,
  onGoToRelationship,
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
  const derivedRelationshipOnly =
    selectedRelationshipSource?.objectType === "view" ||
    selectedRelationshipSource?.objectType === "materializedView" ||
    selectedRelationshipTarget?.objectType === "view" ||
    selectedRelationshipTarget?.objectType === "materializedView";
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
  const [editingSchemaId, setEditingSchemaId] = useState(null);
  const sortedEntities = [...(allEntities ?? [])].sort((left, right) =>
    String(left.physicalName ?? left.name ?? "").localeCompare(String(right.physicalName ?? right.name ?? ""))
  );
  const sortedEntityObjects = sortedEntities.filter((entity) => entity.objectType !== "view" && entity.objectType !== "materializedView");
  const sortedViewObjects = sortedEntities.filter((entity) => entity.objectType === "view");
  const sortedMaterializedViewObjects = sortedEntities.filter((entity) => entity.objectType === "materializedView");
  const sortedRelationships = [...(allRelationships ?? [])].sort((left, right) =>
    String(left.name ?? left.physicalName ?? "").localeCompare(String(right.name ?? right.physicalName ?? ""))
  );
  const selectedEntitySectionLabel = getObjectTypeLabel(selectedEntity);
  const sortedSchemas = useMemo(
    () =>
      [...(schemas ?? [])].sort((left, right) =>
        String(left.name ?? "").localeCompare(String(right.name ?? ""))
      ),
    [schemas]
  );
  const editingSchema =
    sortedSchemas.find((schema) => String(schema.id) === String(editingSchemaId)) ?? null;

  useEffect(() => {
    if (!editingSchemaId) {
      return;
    }

    const stillExists = sortedSchemas.some((schema) => String(schema.id) === String(editingSchemaId));
    if (!stillExists) {
      setEditingSchemaId(null);
    }
  }, [editingSchemaId, sortedSchemas]);

  return (
    <aside className="right-inspector">
      <section className="panel helper-panel">
        <p>Use drag and drop to reposition entities, then save the document or import a live schema.</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <span className="panel-label">Schema</span>
        </div>
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              const createdSchemaId = onAddSchema?.();
              if (createdSchemaId) {
                setEditingSchemaId(createdSchemaId);
              }
            }}
          >
            Add Schema
          </button>
        </div>
        {sortedSchemas.length > 0 ? (
          <div className="mini-list">
            {sortedSchemas.map((schema) => (
              <div key={schema.id} className="mini-list-item schema-browser-card">
                <strong>{schema.name}</strong>
                <span>{schema.comment?.trim() ? schema.comment : "No comment"}</span>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setEditingSchemaId(schema.id)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No schemas in the current model.</p>
        )}
        {editingSchema ? (
          <div className="mini-list-item schema-editor-card">
            <TextField
              label="Name"
              value={editingSchema.name ?? ""}
              onChange={(value) => onSchemaChange(editingSchema.id, "name", value)}
            />
            <TextField
              label="Comment"
              value={editingSchema.comment ?? ""}
              onChange={(value) => onSchemaChange(editingSchema.id, "comment", value)}
              tall
            />
            <div className="button-row">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setEditingSchemaId(null)}
              >
                Close
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  onDeleteSchema(editingSchema.id);
                  setEditingSchemaId(null);
                }}
              >
                Delete Schema
              </button>
            </div>
          </div>
        ) : null}
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
              options={
                selectedRelationship.relationshipType === "Subtype"
                  ? ["Subtype"]
                  : derivedRelationshipOnly
                    ? ["Derived"]
                    : ["Non-Identifying", "Identifying", "ManyToMany", "Derived", "Subtype"]
              }
              onChange={(value) => onRelationshipChange("relationshipType", value)}
            />
            <div className="button-row">
              <button className="danger-button" type="button" onClick={onDeleteRelationship}>
                Delete Relationship
              </button>
            </div>
          </>
        ) : (
          sortedRelationships.length > 0 ? (
            <div className="mini-list">
              {sortedRelationships.map((relationship) => {
                const sourceEntity = allEntities.find((entity) => entity.id === relationship.sourceEntityId);
                const targetEntity = allEntities.find((entity) => entity.id === relationship.targetEntityId);

                return (
                  <div key={relationship.id} className="mini-list-item relationship-browser-card">
                    <strong>{relationship.name ?? relationship.physicalName}</strong>
                    <span>
                      {(sourceEntity?.physicalName ?? sourceEntity?.name ?? "Entity")} → {(targetEntity?.physicalName ?? targetEntity?.name ?? "Entity")}
                    </span>
                    <div className="button-row">
                      <button className="secondary-button" type="button" onClick={() => onEditRelationship(relationship.id)}>
                        Edit
                      </button>
                      <button className="secondary-button" type="button" onClick={() => onGoToRelationship(relationship.id)}>
                        Go To
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No relationships in the current diagram.</p>
          )
        )}
      </section>

      {selectedEntity ? (
        <section className="panel">
          <div className="panel-heading">
            <span className="panel-label">{selectedEntitySectionLabel}</span>
          </div>

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
        </section>
      ) : null}

      {!selectedEntity ? (
        <>
          <ObjectBrowserSection
            title="View"
            items={sortedViewObjects}
            onEditEntity={onEditEntity}
            onGoToEntity={onGoToEntity}
          />
          <ObjectBrowserSection
            title="Materialized View"
            items={sortedMaterializedViewObjects}
            onEditEntity={onEditEntity}
            onGoToEntity={onGoToEntity}
          />
          <ObjectBrowserSection
            title="Entity"
            items={sortedEntityObjects}
            onEditEntity={onEditEntity}
            onGoToEntity={onGoToEntity}
          />
          {sortedEntities.length === 0 ? (
            <section className="panel">
              <div className="panel-heading">
                <span className="panel-label">Entity</span>
              </div>
              <p className="empty-state">No objects in the current diagram.</p>
            </section>
          ) : null}
        </>
      ) : null}

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
