import { useEffect, useMemo, useRef, useState } from "react";
import LeftSidebar from "./components/LeftSidebar";
import TopTabs from "./components/TopTabs";
import DiagramCanvas from "./components/DiagramCanvas";
import RightInspector from "./components/RightInspector";
import { sampleModel } from "./data/sampleModel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7248";
const LOCAL_STORAGE_KEY = "dotnetdm-model";
const PANEL_STORAGE_KEY = "dotnetdm-panel-widths";
const DEFAULT_LEFT_PANEL_WIDTH = 290;
const DEFAULT_RIGHT_PANEL_WIDTH = 330;
const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 520;
const DEFAULT_VIEWPORT = { width: 1200, height: 900 };
const CARD_BASE_WIDTH = 280;
const CARD_MIN_WIDTH = 220;
const CARD_MIN_HEIGHT = 120;
const CARD_HEADER = 50;
const ROW_HEIGHT = 33;
const CARD_MAX_WIDTH = 560;

function readLocalModel() {
  try {
    const localValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return localValue ? JSON.parse(localValue) : null;
  } catch {
    return null;
  }
}

function readPanelWidths() {
  try {
    const localValue = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!localValue) {
      return null;
    }

    const parsed = JSON.parse(localValue);
    return {
      left: parsed.left ?? DEFAULT_LEFT_PANEL_WIDTH,
      right: parsed.right ?? DEFAULT_RIGHT_PANEL_WIDTH
    };
  } catch {
    return null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function estimateTextWidth(text, factor = 9.2) {
  return String(text ?? "").length * factor;
}

function getPreferredEntitySize(entity) {
  const fields = entity.fields ?? [];
  const headerWidth = estimateTextWidth(entity.physicalName ?? entity.name ?? "Entity", 12) + 92;
  const widestFieldWidth = Math.max(
    ...fields.map((field) => {
      const nameWidth = estimateTextWidth(field.name, 10);
      const typeWidth = estimateTextWidth(field.dataType, 9.1);
      return 48 + 10 + nameWidth + 18 + typeWidth + 28;
    }),
    CARD_BASE_WIDTH
  );

  return {
    width: Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, Math.ceil(Math.max(headerWidth, widestFieldWidth)))),
    height: Math.max(CARD_MIN_HEIGHT, CARD_HEADER + fields.length * ROW_HEIGHT + 18)
  };
}

function normalizeRelationship(relationship) {
  return {
    name: relationship.name ?? relationship.id,
    physicalName: relationship.physicalName ?? relationship.id,
    description: relationship.description ?? "relates_to",
    parentAttribute: relationship.parentAttribute ?? "Entity header",
    childAttribute: relationship.childAttribute ?? "Entity header",
    migratedKeyIndex: relationship.migratedKeyIndex ?? "Select parent index",
    relationshipType: relationship.relationshipType ?? "Non-Identifying",
    ...relationship
  };
}

function normalizeModel(rawModel) {
  const baseModel = clone(rawModel ?? sampleModel);

  if (Array.isArray(baseModel.diagrams) && baseModel.diagrams.length > 0) {
    return {
      ...baseModel,
      diagrams: baseModel.diagrams.map((diagram) => ({
        ...diagram,
        relationships: (diagram.relationships ?? []).map(normalizeRelationship)
      })),
      activeDiagramId: baseModel.activeDiagramId ?? baseModel.diagrams[0].id
    };
  }

  const diagramId = "er-diagram-1";

  return {
    project: baseModel.project ?? sampleModel.project,
    activeDiagramId: diagramId,
    diagrams: [
      {
        id: diagramId,
        name: "ER_Diagram_1",
        entities: baseModel.entities ?? [],
        relationships: baseModel.relationships ?? []
      }
    ]
  };
}

export default function App() {
  const savedPanelWidths = readPanelWidths();
  const initialModel = normalizeModel(readLocalModel() ?? sampleModel);
  const [model, setModel] = useState(initialModel);
  const [selectedEntityIds, setSelectedEntityIds] = useState(() =>
    initialModel.diagrams[0]?.entities[0]?.id ? [initialModel.diagrams[0].entities[0].id] : []
  );
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [linkDraft, setLinkDraft] = useState(null);
  const [panelWidths, setPanelWidths] = useState(() => ({
    left: savedPanelWidths?.left ?? DEFAULT_LEFT_PANEL_WIDTH,
    right: savedPanelWidths?.right ?? DEFAULT_RIGHT_PANEL_WIDTH
  }));
  const [diagramViewport, setDiagramViewport] = useState(DEFAULT_VIEWPORT);
  const [viewResetToken, setViewResetToken] = useState(0);
  const [providers, setProviders] = useState([
    { id: "sqlserver" },
    { id: "postgresql" },
    { id: "mongodb" }
  ]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [status, setStatus] = useState("Using local model state.");
  const [importForm, setImportForm] = useState({
    provider: "postgresql",
    connectionString: "",
    databaseName: ""
  });
  const resizeState = useRef(null);
  const activeDiagram = useMemo(
    () => model.diagrams.find((diagram) => diagram.id === model.activeDiagramId) ?? model.diagrams[0],
    [model]
  );
  const tabs = useMemo(
    () =>
      model.diagrams.map((diagram) => ({
        id: diagram.id,
        label: diagram.name,
        active: diagram.id === model.activeDiagramId
      })),
    [model]
  );
  const selectedEntityId = selectedEntityIds.at(-1) ?? null;

  const selectedEntity = useMemo(
    () => activeDiagram?.entities.find((entity) => entity.id === selectedEntityId) ?? null,
    [activeDiagram, selectedEntityId]
  );
  const selectedRelationship = useMemo(
    () => activeDiagram?.relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null,
    [activeDiagram, selectedRelationshipId]
  );

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
  }, [model]);

  useEffect(() => {
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelWidths));
  }, [panelWidths]);

  useEffect(() => {
    loadProviders();
    loadDiagram();
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!resizeState.current) {
        return;
      }

      if (resizeState.current.side === "left") {
        const nextLeft = Math.min(
          MAX_PANEL_WIDTH,
          Math.max(MIN_PANEL_WIDTH, Math.round(event.clientX - 14))
        );

        setPanelWidths((current) => ({
          ...current,
          left: nextLeft
        }));
        return;
      }

      const nextRight = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, Math.round(window.innerWidth - event.clientX - 14))
      );

      setPanelWidths((current) => ({
        ...current,
        right: nextRight
      }));
    }

    function handlePointerUp() {
      resizeState.current = null;
      document.body.classList.remove("panel-resizing");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        )
      ) {
        return;
      }

      if (selectedEntityIds.length === 0) {
        if (!(event.metaKey && event.key.toLowerCase() === "a")) {
          return;
        }
      }

      if (event.metaKey && event.key.toLowerCase() === "a") {
        if (!activeDiagram) {
          return;
        }

        event.preventDefault();
        setSelectedEntityIds(activeDiagram.entities.map((entity) => entity.id));
        setSelectedRelationshipId(null);
        setLinkDraft(null);
        setStatus(
          `Selected ${activeDiagram.entities.length} ${activeDiagram.entities.length === 1 ? "entity" : "entities"}.`
        );
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteEntitiesByIds(selectedEntityIds);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const deltaByKey = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step }
      };

      const delta = deltaByKey[event.key];

      if (!delta || !activeDiagram) {
        return;
      }

      event.preventDefault();
      const updates = activeDiagram.entities
        .filter((entity) => selectedEntityIds.includes(entity.id))
        .map((entity) => ({
          id: entity.id,
          x: Math.max(24, entity.x + delta.x),
          y: Math.max(24, entity.y + delta.y)
        }));

      handleMoveEntities(selectedEntityIds, updates);
      setStatus(
        `Moved ${selectedEntityIds.length} selected ${selectedEntityIds.length === 1 ? "entity" : "entities"}.`
      );
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDiagram, selectedEntityIds]);

  const isDesktopLayout = windowWidth > 1380;

  function createFreshSampleModel() {
    return normalizeModel(sampleModel);
  }

  function getEntitySize(entity) {
    const preferredSize = getPreferredEntitySize(entity);
    const width = Math.max(entity.width ?? 0, preferredSize.width);
    const height = Math.max(entity.height ?? 0, preferredSize.height);
    return { width, height };
  }

  function buildAutoLayout(entities, relationships, viewport) {
    if (entities.length === 0) {
      return entities;
    }

    const padding = 48;
    const gapX = 42;
    const gapY = 42;
    const usableWidth = Math.max(viewport.width - padding * 2, 480);
    const usableHeight = Math.max(viewport.height - padding * 2, 480);
    const orderedEntities = [...entities].sort((left, right) => {
      const leftDegree = relationships.filter(
        (relationship) =>
          relationship.sourceEntityId === left.id || relationship.targetEntityId === left.id
      ).length;
      const rightDegree = relationships.filter(
        (relationship) =>
          relationship.sourceEntityId === right.id || relationship.targetEntityId === right.id
      ).length;

      if (rightDegree !== leftDegree) {
        return rightDegree - leftDegree;
      }

      return left.physicalName.localeCompare(right.physicalName);
    });
    const averageCardWidth =
      orderedEntities.reduce((sum, entity) => sum + getEntitySize(entity).width, 0) / orderedEntities.length;
    const aspectRatio = usableWidth / usableHeight;
    const estimatedColumns = Math.round(Math.sqrt(orderedEntities.length * aspectRatio));
    const maxColumnsByWidth = Math.max(1, Math.floor((usableWidth + gapX) / (averageCardWidth + gapX)));
    const columnCount = Math.max(2, Math.min(orderedEntities.length, maxColumnsByWidth, estimatedColumns || 2));
    const columns = Array.from({ length: columnCount }, () => ({
      items: [],
      height: 0,
      width: 220
    }));

    orderedEntities.forEach((entity, index) => {
      const targetColumn = columns.reduce((bestIndex, column, columnIndex) => {
        if (column.height < columns[bestIndex].height) {
          return columnIndex;
        }

        return bestIndex;
      }, index % columnCount);

      const size = getEntitySize(entity);
      columns[targetColumn].items.push(entity);
      columns[targetColumn].height += (columns[targetColumn].items.length > 1 ? gapY : 0) + size.height;
      columns[targetColumn].width = Math.max(columns[targetColumn].width, size.width);
    });

    const totalWidth =
      columns.reduce((sum, column) => sum + column.width, 0) + gapX * Math.max(0, columns.length - 1);
    const maxColumnHeight = Math.max(...columns.map((column) => column.height));
    const horizontalOffset = padding + Math.max(0, Math.floor((usableWidth - totalWidth) / 2));
    const verticalOffset = padding;
    const positionedEntities = [];
    let currentX = horizontalOffset;

    columns.forEach((column, columnIndex) => {
      const staggerOffset = columnIndex % 2 === 0 ? 0 : Math.min(36, Math.floor(gapY * 0.45));
      let currentY = verticalOffset + staggerOffset;

      column.items.forEach((entity) => {
        const size = getEntitySize(entity);

        positionedEntities.push({
          ...entity,
          x: currentX,
          y: currentY,
          width: size.width,
          height: size.height
        });

        currentY += size.height + gapY;
      });

      currentX += column.width + gapX;
    });

    return orderedEntities.map(
      (entity) => positionedEntities.find((positionedEntity) => positionedEntity.id === entity.id) ?? entity
    );
  }

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
      const normalizedData = normalizeModel(data);
      setModel(normalizedData);
      setSelectedEntityIds(normalizedData.diagrams[0]?.entities[0]?.id ? [normalizedData.diagrams[0].entities[0].id] : []);
      setSelectedRelationshipId(null);
      setStatus("Loaded model from ASP.NET Core Web API.");
    } catch {
      setStatus("Backend unavailable, showing local sample model.");
    }
  }

  function handleReloadSample() {
    const freshSample = createFreshSampleModel();
    setModel(freshSample);
    setSelectedEntityIds(freshSample.diagrams[0]?.entities[0]?.id ? [freshSample.diagrams[0].entities[0].id] : []);
    setSelectedRelationshipId(null);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshSample));
    setViewResetToken((current) => current + 1);
    setStatus("Reloaded the original local sample model.");
  }

  function handleAutoLayout() {
    if (!activeDiagram) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: buildAutoLayout(diagram.entities, diagram.relationships, diagramViewport)
            }
          : diagram
      )
    }));
    setViewResetToken((current) => current + 1);
    setStatus("Re-laid out entities to fit the current diagram view.");
  }

  function handleRelationshipChange(field, value) {
    if (!selectedRelationshipId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.map((relationship) =>
                relationship.id === selectedRelationshipId
                  ? { ...relationship, [field]: value }
                  : relationship
              )
            }
          : diagram
      )
    }));
  }

  function handleSelectRelationship(relationshipId) {
    setSelectedRelationshipId(relationshipId);
    setSelectedEntityIds([]);
    setLinkDraft(null);
  }

  function handleSetSelectedEntities(entityIds) {
    setSelectedEntityIds(entityIds);
  }

  function handleSelectEntity(entityId, options = {}) {
    const { additive = false, toggle = false } = options;

    if (!linkDraft) {
      setSelectedEntityIds((current) => {
        if (!entityId) {
          return [];
        }

        if (toggle) {
          return current.includes(entityId)
            ? current.filter((id) => id !== entityId)
            : [...current, entityId];
        }

        if (additive) {
          return current.includes(entityId) ? current : [...current, entityId];
        }

        return [entityId];
      });
      setSelectedRelationshipId(null);
      return;
    }

    if (!activeDiagram) {
      return;
    }

    if (!linkDraft.sourceEntityId) {
      setLinkDraft({ sourceEntityId: entityId });
      setSelectedEntityIds(entityId ? [entityId] : []);
      setSelectedRelationshipId(null);
      setStatus("Select the second entity to create a relationship.");
      return;
    }

    if (linkDraft.sourceEntityId === entityId) {
      setStatus("Choose a different target entity.");
      return;
    }

    const source = activeDiagram.entities.find((entity) => entity.id === linkDraft.sourceEntityId);
    const target = activeDiagram.entities.find((entity) => entity.id === entityId);
    const relationshipId = `relationship-${Date.now()}`;
    const newRelationship = normalizeRelationship({
      id: relationshipId,
      sourceEntityId: linkDraft.sourceEntityId,
      targetEntityId: entityId,
      name: `${source?.physicalName ?? "Entity"} -> ${target?.physicalName ?? "Entity"}`,
      physicalName: `${linkDraft.sourceEntityId}-${entityId}`,
      description: "relates_to",
      cardinality: "1:N",
      style: "solid"
    });

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: [...diagram.relationships, newRelationship]
            }
          : diagram
      )
    }));

    setLinkDraft(null);
    setSelectedEntityIds([]);
    setSelectedRelationshipId(relationshipId);
    setStatus(`Created relationship ${newRelationship.name}.`);
  }

  function handleStartRelationshipLink() {
    if (!selectedEntityId || selectedEntityIds.length !== 1) {
      setStatus("Select the first entity, then click Link.");
      return;
    }

    setLinkDraft({ sourceEntityId: selectedEntityId });
    setSelectedRelationshipId(null);
    setStatus("Select the second entity to create a relationship.");
  }

  function updateSelectedEntity(update) {
    if (!selectedEntityId) {
      return;
    }

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === selectedEntityId ? { ...entity, ...update(entity) } : entity
              )
            }
          : diagram
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
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId ? { ...entity, x, y } : entity
              )
            }
          : diagram
      )
    }));
  }

  function handleMoveEntities(entityIds, updates) {
    const updatesMap = new Map(updates.map((update) => [update.id, update]));

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) => {
                const update = updatesMap.get(entity.id);
                return update ? { ...entity, x: update.x, y: update.y } : entity;
              })
            }
          : diagram
      )
    }));
  }

  function handleResizeEntity(entityId, width, height) {
    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: diagram.entities.map((entity) =>
                entity.id === entityId ? { ...entity, width, height } : entity
              )
            }
          : diagram
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
      width: 280,
      height: 120,
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
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              entities: [...diagram.entities, newEntity]
            }
          : diagram
      )
    }));
    setSelectedEntityIds([entityId]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Created a new entity.");
  }

  function handleAddDiagram() {
    const nextNumber =
      model.diagrams.reduce((highest, diagram) => {
        const match = diagram.name.match(/ER_Diagram_(\d+)/);
        return Math.max(highest, match ? Number(match[1]) : 0);
      }, 0) + 1;
    const newDiagram = {
      id: `er-diagram-${Date.now()}`,
      name: `ER_Diagram_${nextNumber}`,
      entities: [],
      relationships: []
    };

    setModel((current) => ({
      ...current,
      activeDiagramId: newDiagram.id,
      diagrams: [...current.diagrams, newDiagram]
    }));
    setSelectedEntityIds([]);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setViewResetToken((current) => current + 1);
    setStatus(`Created ${newDiagram.name}.`);
  }

  function handleSelectDiagram(diagramId) {
    const nextDiagram = model.diagrams.find((diagram) => diagram.id === diagramId);
    if (!nextDiagram) {
      return;
    }

    setModel((current) => ({
      ...current,
      activeDiagramId: diagramId
    }));
    setSelectedEntityIds(nextDiagram.entities[0]?.id ? [nextDiagram.entities[0].id] : []);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setViewResetToken((current) => current + 1);
    setStatus(`Opened ${nextDiagram.name}.`);
  }

  function handleCloseDiagram(diagramId) {
    if (model.diagrams.length <= 1) {
      return;
    }

    setModel((current) => {
      const nextDiagrams = current.diagrams.filter((diagram) => diagram.id !== diagramId);
      const nextActiveId =
        current.activeDiagramId === diagramId ? nextDiagrams[0]?.id ?? null : current.activeDiagramId;
      const nextActiveDiagram = nextDiagrams.find((diagram) => diagram.id === nextActiveId);
      setSelectedEntityIds(nextActiveDiagram?.entities[0]?.id ? [nextActiveDiagram.entities[0].id] : []);
      setSelectedRelationshipId(null);
      setLinkDraft(null);
      return {
        ...current,
        activeDiagramId: nextActiveId,
        diagrams: nextDiagrams
      };
    });

    setStatus("Closed diagram.");
  }

  function handleDeleteEntity() {
    if (selectedEntityIds.length > 1) {
      handleDeleteEntitiesByIds(selectedEntityIds);
      return;
    }

    if (!selectedEntityId) {
      return;
    }

    handleDeleteEntityById(selectedEntityId);
  }

  function handleDeleteEntitiesByIds(entityIds) {
    if (!entityIds || entityIds.length === 0) {
      return;
    }

    const idsToDelete = new Set(entityIds);
    let nextSelectedIds = [];

    setModel((current) => {
      const currentDiagram =
        current.diagrams.find((diagram) => diagram.id === current.activeDiagramId) ?? current.diagrams[0];
      const nextEntities = currentDiagram?.entities.filter((entity) => !idsToDelete.has(entity.id)) ?? [];
      nextSelectedIds = nextEntities[0]?.id ? [nextEntities[0].id] : [];

      return {
        ...current,
        diagrams: current.diagrams.map((diagram) =>
          diagram.id === current.activeDiagramId
            ? {
                ...diagram,
                entities: diagram.entities.filter((entity) => !idsToDelete.has(entity.id)),
                relationships: diagram.relationships.filter(
                  (relationship) =>
                    !idsToDelete.has(relationship.sourceEntityId) &&
                    !idsToDelete.has(relationship.targetEntityId)
                )
              }
            : diagram
        )
      };
    });

    setSelectedEntityIds(nextSelectedIds);
    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus(
      `Deleted ${entityIds.length} ${entityIds.length === 1 ? "entity" : "entities"}.`
    );
  }

  function handleDeleteEntityById(entityId) {
    if (!entityId) {
      return;
    }
    handleDeleteEntitiesByIds([entityId]);
  }

  function handleDeleteRelationship() {
    if (!selectedRelationshipId) {
      return;
    }

    const relationshipId = selectedRelationshipId;

    setModel((current) => ({
      ...current,
      diagrams: current.diagrams.map((diagram) =>
        diagram.id === current.activeDiagramId
          ? {
              ...diagram,
              relationships: diagram.relationships.filter(
                (relationship) => relationship.id !== relationshipId
              )
            }
          : diagram
      )
    }));

    setSelectedRelationshipId(null);
    setLinkDraft(null);
    setStatus("Deleted relationship.");
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
      const savePayload = {
        project: model.project,
        tabs,
        entities: activeDiagram?.entities ?? [],
        relationships: activeDiagram?.relationships ?? []
      };

      const response = await fetch(`${API_BASE_URL}/api/modeler/diagram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diagram: savePayload })
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const saved = await response.json();
      setModel((current) => ({
        ...current,
        project: saved.project ?? current.project
      }));
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
      const importedDiagram = {
        id: model.activeDiagramId,
        name: activeDiagram?.name ?? "ER_Diagram_1",
        entities: result.diagram.entities ?? [],
        relationships: (result.diagram.relationships ?? []).map(normalizeRelationship)
      };
      setModel((current) => ({
        ...current,
        project: result.diagram.project ?? current.project,
        diagrams: current.diagrams.map((diagram) =>
          diagram.id === current.activeDiagramId ? importedDiagram : diagram
        )
      }));
      setSelectedEntityIds(importedDiagram.entities[0]?.id ? [importedDiagram.entities[0].id] : []);
      setSelectedRelationshipId(null);
      setLinkDraft(null);
      setStatus(result.summary);
    } catch {
      setStatus("Schema import requires the backend to be running with a reachable database.");
    }
  }

  function handlePanelResizeStart(side) {
    resizeState.current = { side };
    document.body.classList.add("panel-resizing");
  }

  return (
    <div
      className="app-shell"
      style={
        isDesktopLayout
          ? {
              gridTemplateColumns: `${panelWidths.left}px 10px minmax(760px, 1fr) 10px ${panelWidths.right}px`
            }
          : undefined
      }
    >
      <LeftSidebar
        project={model.project}
        entityCount={activeDiagram?.entities.length ?? 0}
        relationshipCount={activeDiagram?.relationships.length ?? 0}
        onAutoLayout={handleAutoLayout}
      />

      {isDesktopLayout ? (
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize left panel"
          onPointerDown={() => handlePanelResizeStart("left")}
        />
      ) : null}

      <main className="workspace-shell">
        <TopTabs
          tabs={tabs}
          onSelectTab={handleSelectDiagram}
          onCloseTab={handleCloseDiagram}
          onAddDiagram={handleAddDiagram}
          onAddEntity={handleAddEntity}
          onReload={handleReloadSample}
          onSave={handleSave}
        />
        <div className="workspace-status">{status}</div>
        <DiagramCanvas
          entities={activeDiagram?.entities ?? []}
          relationships={activeDiagram?.relationships ?? []}
          selectedEntityIds={selectedEntityIds}
          selectedRelationshipId={selectedRelationshipId}
          onSelectEntity={handleSelectEntity}
          onSelectEntities={handleSetSelectedEntities}
          onSelectRelationship={handleSelectRelationship}
          onMoveEntity={handleMoveEntity}
          onMoveEntities={handleMoveEntities}
          onResizeEntity={handleResizeEntity}
          onDeleteEntity={handleDeleteEntityById}
          onDeleteRelationship={handleDeleteRelationship}
          onViewportChange={setDiagramViewport}
          viewResetToken={viewResetToken}
        />
      </main>

      {isDesktopLayout ? (
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize right panel"
          onPointerDown={() => handlePanelResizeStart("right")}
        />
      ) : null}

      <RightInspector
        selectedEntity={selectedEntity}
        selectedRelationship={selectedRelationship}
        relationships={activeDiagram?.relationships ?? []}
        allEntities={activeDiagram?.entities ?? []}
        importForm={importForm}
        providers={providers}
        onEntityChange={handleEntityChange}
        onAddAttribute={handleAddAttribute}
        onStartRelationshipLink={handleStartRelationshipLink}
        onDeleteEntity={handleDeleteEntity}
        onDeleteAttribute={handleDeleteAttribute}
        onRelationshipChange={handleRelationshipChange}
        onDeleteRelationship={handleDeleteRelationship}
        onSelectRelationship={handleSelectRelationship}
        onImportFormChange={handleImportFormChange}
        onImportSchema={handleImportSchema}
        isLinkingRelationship={Boolean(linkDraft)}
      />
    </div>
  );
}
