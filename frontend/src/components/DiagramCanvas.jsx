import { useRef, useState } from "react";

const CARD_WIDTH = 280;
const CARD_HEADER = 50;
const ROW_HEIGHT = 33;

function getAnchor(entity, side) {
  const height = CARD_HEADER + entity.fields.length * ROW_HEIGHT;

  if (side === "left") {
    return { x: entity.x, y: entity.y + height / 2 };
  }

  return { x: entity.x + CARD_WIDTH, y: entity.y + height / 2 };
}

function DiagramLink({ source, target, label, dashed }) {
  const start = getAnchor(source, source.x < target.x ? "right" : "left");
  const end = getAnchor(target, source.x < target.x ? "left" : "right");
  const dx = Math.abs(end.x - start.x) * 0.45;
  const path = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - 10;

  return (
    <>
      <path d={path} className={`diagram-link ${dashed ? "dashed" : ""}`} />
      <text x={midX} y={midY} className="diagram-link-label">
        {label}
      </text>
    </>
  );
}

function FieldBadge({ kind }) {
  return <span className={`field-badge ${kind.toLowerCase()}`}>{kind}</span>;
}

function EntityCard({ entity, isSelected, onPointerDown, onSelect }) {
  return (
    <article
      className={`entity-card ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width: CARD_WIDTH }}
      onPointerDown={(event) => onPointerDown(event, entity.id)}
      onClick={() => onSelect(entity.id)}
    >
      <header className="entity-card-header">
        <h3>{entity.physicalName}</h3>
        <span className="entity-close">×</span>
      </header>

      <div className="entity-fields">
        {entity.fields.map((field) => (
          <div key={field.id} className="entity-field-row">
            <FieldBadge kind={field.kind} />
            <span className="entity-field-name">{field.name}</span>
            <span className="entity-field-type">{field.dataType}</span>
          </div>
        ))}
      </div>

      <div className="resize-corner" />
    </article>
  );
}

export default function DiagramCanvas({
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
  onMoveEntity
}) {
  const entityMap = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  const dragState = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  function handlePointerDown(event, entityId) {
    event.preventDefault();
    const entity = entityMap[entityId];

    dragState.current = {
      entityId,
      pointerId: event.pointerId,
      offsetX: event.clientX - entity.x,
      offsetY: event.clientY - entity.y
    };

    setDraggingId(entityId);
    onSelectEntity(entityId);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragState.current) {
      return;
    }

    const { entityId, offsetX, offsetY } = dragState.current;
    const x = Math.max(24, Math.round(event.clientX - offsetX));
    const y = Math.max(24, Math.round(event.clientY - offsetY));
    onMoveEntity(entityId, x, y);
  }

  function handlePointerUp() {
    dragState.current = null;
    setDraggingId(null);
  }

  return (
    <section
      className={`diagram-canvas ${draggingId ? "dragging" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="diagram-grid" />

      <svg className="diagram-svg" viewBox="0 0 1600 1200" preserveAspectRatio="none">
        {relationships.map((relationship) => {
          const source = entityMap[relationship.sourceEntityId];
          const target = entityMap[relationship.targetEntityId];

          if (!source || !target) {
            return null;
          }

          return (
            <DiagramLink
              key={relationship.id}
              source={source}
              target={target}
              label={relationship.cardinality}
              dashed={relationship.style === "dashed"}
            />
          );
        })}
      </svg>

      {entities.map((entity) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          isSelected={entity.id === selectedEntityId}
          onPointerDown={handlePointerDown}
          onSelect={onSelectEntity}
        />
      ))}
    </section>
  );
}
