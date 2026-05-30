import { useEffect, useMemo, useState } from "react";
import LeftSidebar from "./components/LeftSidebar";
import TopTabs from "./components/TopTabs";
import DiagramCanvas from "./components/DiagramCanvas";
import RightInspector from "./components/RightInspector";
import { sampleModel } from "./data/sampleModel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7248";
const LOCAL_STORAGE_KEY = "dotnetdm-model";

function readLocalModel() {
  try {
    const localValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return localValue ? JSON.parse(localValue) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [model, setModel] = useState(() => readLocalModel() ?? sampleModel);
  const [selectedEntityId, setSelectedEntityId] = useState(() => (readLocalModel() ?? sampleModel).entities[0]?.id ?? null);
  const [providers, setProviders] = useState([
    { id: "sqlserver" },
    { id: "postgresql" },
    { id: "mongodb" }
  ]);
  const [status, setStatus] = useState("Using local model state.");
  const [importForm, setImportForm] = useState({
    provider: "postgresql",
    connectionString: "",
    databaseName: ""
  });

  const selectedEntity = useMemo(
    () => model.entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [model.entities, selectedEntityId]
  );

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
  }, [model]);

  useEffect(() => {
    loadProviders();
    loadDiagram();
  }, []);

  async function loadProviders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/providers`);
      if (!response.ok) {
        throw new Error("Provider request failed");
      }

      const data = await response.json();
      setProviders(data);
    } catch {
      setStatus("Backend unavailable, using built-in provider list.");
    }
  }

  async function loadDiagram() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/diagram`);

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      setModel(data);
      setSelectedEntityId(data.entities[0]?.id ?? null);
      setStatus("Loaded model from ASP.NET Core Web API.");
    } catch {
      setStatus("Backend unavailable, showing local sample model.");
    }
  }

  function updateSelectedEntity(update) {
    if (!selectedEntityId) {
      return;
    }

    setModel((current) => ({
      ...current,
      entities: current.entities.map((entity) =>
        entity.id === selectedEntityId ? { ...entity, ...update(entity) } : entity
      )
    }));
  }

  function handleEntityChange(field, value, fieldId) {
    updateSelectedEntity((entity) => {
      if (field === "name" || field === "physicalName" || field === "comment") {
        return { [field]: value };
      }

      if (fieldId) {
        return {
          fields: entity.fields.map((item) =>
            item.id === fieldId
              ? {
                  ...item,
                  ...(field === "fieldName" ? { name: value } : {}),
                  ...(field === "fieldType" ? { dataType: value } : {}),
                  ...(field === "fieldKind" ? { kind: value } : {})
                }
              : item
          )
        };
      }

      return {};
    });
  }

  function handleMoveEntity(entityId, x, y) {
    setModel((current) => ({
      ...current,
      entities: current.entities.map((entity) =>
        entity.id === entityId ? { ...entity, x, y } : entity
      )
    }));
  }

  function handleAddEntity() {
    const entityId = `entity-${Date.now()}`;
    const newEntity = {
      id: entityId,
      name: "New Entity",
      physicalName: "NewEntity",
      comment: "Describe this entity.",
      x: 160,
      y: 140,
      fields: [
        {
          id: `${entityId}-id`,
          kind: "PK",
          name: "Id",
          dataType: "uuid"
        }
      ]
    };

    setModel((current) => ({
      ...current,
      entities: [...current.entities, newEntity]
    }));
    setSelectedEntityId(entityId);
    setStatus("Created a new entity.");
  }

  function handleDeleteEntity() {
    if (!selectedEntityId) {
      return;
    }

    let nextSelectedId = null;

    setModel((current) => {
      const nextEntities = current.entities.filter((entity) => entity.id !== selectedEntityId);
      nextSelectedId = nextEntities[0]?.id ?? null;

      return {
        ...current,
        entities: nextEntities,
        relationships: current.relationships.filter(
          (relationship) =>
            relationship.sourceEntityId !== selectedEntityId &&
            relationship.targetEntityId !== selectedEntityId
        )
      };
    });

    setSelectedEntityId(nextSelectedId);
    setStatus("Deleted selected entity.");
  }

  function handleAddAttribute() {
    if (!selectedEntity) {
      return;
    }

    updateSelectedEntity((entity) => ({
      fields: [
        ...entity.fields,
        {
          id: `${entity.id}-${Date.now()}`,
          kind: "COL",
          name: `Column${entity.fields.length + 1}`,
          dataType: "varchar(50)"
        }
      ]
    }));
    setStatus("Added an attribute.");
  }

  function handleDeleteAttribute(attributeId) {
    updateSelectedEntity((entity) => ({
      fields: entity.fields.filter((field) => field.id !== attributeId)
    }));
    setStatus("Removed an attribute.");
  }

  function handleImportFormChange(field, value) {
    setImportForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSave() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/diagram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diagram: model })
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const saved = await response.json();
      setModel(saved);
      setStatus("Saved model to ASP.NET Core Web API.");
    } catch {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
      setStatus("Backend unavailable, saved model to local browser storage.");
    }
  }

  async function handleImportSchema() {
    if (!importForm.connectionString.trim()) {
      setStatus("Enter a connection string before importing a schema.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/modeler/introspect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(importForm)
      });

      if (!response.ok) {
        throw new Error("Schema import failed");
      }

      const result = await response.json();
      setModel(result.diagram);
      setSelectedEntityId(result.diagram.entities[0]?.id ?? null);
      setStatus(result.summary);
    } catch {
      setStatus("Schema import requires the backend to be running with a reachable database.");
    }
  }

  return (
    <div className="app-shell">
      <LeftSidebar
        project={model.project}
        entityCount={model.entities.length}
        relationshipCount={model.relationships.length}
      />

      <main className="workspace-shell">
        <TopTabs
          tabs={model.tabs}
          onAddEntity={handleAddEntity}
          onReload={loadDiagram}
          onSave={handleSave}
        />
        <div className="workspace-status">{status}</div>
        <DiagramCanvas
          entities={model.entities}
          relationships={model.relationships}
          selectedEntityId={selectedEntityId}
          onSelectEntity={setSelectedEntityId}
          onMoveEntity={handleMoveEntity}
        />
      </main>

      <RightInspector
        selectedEntity={selectedEntity}
        relationships={model.relationships}
        allEntities={model.entities}
        importForm={importForm}
        providers={providers}
        onEntityChange={handleEntityChange}
        onAddAttribute={handleAddAttribute}
        onDeleteEntity={handleDeleteEntity}
        onDeleteAttribute={handleDeleteAttribute}
        onImportFormChange={handleImportFormChange}
        onImportSchema={handleImportSchema}
      />
    </div>
  );
}
