import { useEffect, useRef, useState } from "react";

const CARD_WIDTH = 280;
const CARD_MIN_WIDTH = 220;
const CARD_MIN_HEIGHT = 120;
const CARD_HEADER = 50;
const ROW_HEIGHT = 33;

function getCardBounds(entity) {
  const width = entity.width ?? CARD_WIDTH;
  const height = Math.max(entity.height ?? 0, CARD_HEADER + entity.fields.length * ROW_HEIGHT);

  return {
    left: entity.x,
    top: entity.y,
    right: entity.x + width,
    bottom: entity.y + height,
    width,
    height,
    centerX: entity.x + width / 2,
    centerY: entity.y + height / 2
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAnchor(entity, target) {
  const bounds = getCardBounds(entity);
  const targetBounds = getCardBounds(target);
  const horizontalGap = targetBounds.centerX - bounds.centerX;
  const verticalGap = targetBounds.centerY - bounds.centerY;
  const horizontalBias = Math.abs(horizontalGap) / bounds.width;
  const verticalBias = Math.abs(verticalGap) / bounds.height;
  const edgePadding = 18;

  if (horizontalBias >= verticalBias) {
    return {
      x: horizontalGap >= 0 ? bounds.right : bounds.left,
      y: clamp(targetBounds.centerY, bounds.top + edgePadding, bounds.bottom - edgePadding)
    };
  }

  return {
    x: clamp(targetBounds.centerX, bounds.left + edgePadding, bounds.right - edgePadding),
    y: verticalGap >= 0 ? bounds.bottom : bounds.top
  };
}

function DiagramLink({
  relationship,
  source,
  target,
  dashed,
  isSelected,
  onSelectRelationship,
  onDeleteRelationship
}) {
  const start = getAnchor(source, target);
  const end = getAnchor(target, source);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const curveStrength = Math.max(36, Math.min(140, Math.abs(deltaX) * 0.35 + Math.abs(deltaY) * 0.1));
  const horizontalFirst = Math.abs(deltaX) >= Math.abs(deltaY);
  const controlOneX = horizontalFirst ? start.x + Math.sign(deltaX || 1) * curveStrength : start.x;
  const controlOneY = horizontalFirst ? start.y : start.y + Math.sign(deltaY || 1) * curveStrength;
  const controlTwoX = horizontalFirst ? end.x - Math.sign(deltaX || 1) * curveStrength : end.x;
  const controlTwoY = horizontalFirst ? end.y : end.y - Math.sign(deltaY || 1) * curveStrength;
  const path = `M ${start.x} ${start.y} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${end.x} ${end.y}`;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - 10;

  return (
    <>
      <path
        d={path}
        className="diagram-link-hit-area"
        onClick={(event) => {
          event.stopPropagation();
          onSelectRelationship(relationship.id);
        }}
      />
      <path
        d={path}
        className={`diagram-link ${dashed ? "dashed" : ""} ${isSelected ? "selected" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelectRelationship(relationship.id);
        }}
      />
      <text x={midX} y={midY} className="diagram-link-label">
        {relationship.cardinality}
      </text>
      {isSelected ? (
        <g
          className="relationship-delete-badge"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteRelationship(relationship.id);
          }}
        >
          <rect x={midX - 14} y={midY - 28} rx="8" ry="8" width="28" height="28" />
          <text x={midX} y={midY - 14}>
            ×
          </text>
        </g>
      ) : null}
    </>
  );
}

function FieldBadge({ kind }) {
  return <span className={`field-badge ${kind.toLowerCase()}`}>{kind}</span>;
}

function EntityCard({
  entity,
  isSelected,
  onPointerDown,
  onResizeStart,
  onSelect,
  onDelete
}) {
  const width = entity.width ?? CARD_WIDTH;
  const minHeight = CARD_HEADER + entity.fields.length * ROW_HEIGHT;
  const height = Math.max(entity.height ?? 0, minHeight);

  return (
    <article
      className={`entity-card ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width, height }}
      onPointerDown={(event) => onPointerDown(event, entity.id)}
      onClick={() => onSelect(entity.id)}
    >
      <header className="entity-card-header">
        <h3>{entity.physicalName}</h3>
        <button
          type="button"
          className="entity-close"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(entity.id);
          }}
        >
          ×
        </button>
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

      <button
        type="button"
        className="entity-resize-handle"
        aria-label={`Resize ${entity.physicalName}`}
        onPointerDown={(event) => onResizeStart(event, entity.id)}
        onClick={(event) => event.stopPropagation()}
      />
    </article>
  );
}

export default function DiagramCanvas({
  entities,
  relationships,
  selectedEntityId,
  selectedRelationshipId,
  onSelectEntity,
  onSelectRelationship,
  onMoveEntity,
  onResizeEntity,
  onDeleteEntity,
  onDeleteRelationship,
  onViewportChange,
  viewResetToken
}) {
  const entityMap = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  const interactionState = useRef(null);
  const canvasRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || !onViewportChange) {
      return undefined;
    }

    const element = canvasRef.current;
    const updateViewport = () => {
      onViewportChange({
        width: element.clientWidth,
        height: element.clientHeight
      });
    };

    updateViewport();

    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);

    return () => observer.disconnect();
  }, [onViewportChange]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    canvasRef.current.scrollTo({
      left: 0,
      top: 0,
      behavior: "smooth"
    });
  }, [viewResetToken]);

  function handlePointerDown(event, entityId) {
    event.preventDefault();
    const entity = entityMap[entityId];

    interactionState.current = {
      mode: "drag",
      entityId,
      offsetX: event.clientX - entity.x,
      offsetY: event.clientY - entity.y
    };

    setDraggingId(entityId);
    onSelectEntity(entityId);
    onSelectRelationship(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeStart(event, entityId) {
    event.preventDefault();
    event.stopPropagation();
    const entity = entityMap[entityId];
    const width = entity.width ?? CARD_WIDTH;
    const minHeight = CARD_HEADER + entity.fields.length * ROW_HEIGHT;
    const height = Math.max(entity.height ?? 0, minHeight);

    interactionState.current = {
      mode: "resize",
      entityId,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: width,
      initialHeight: height,
      minHeight
    };

    setDraggingId(entityId);
    onSelectEntity(entityId);
    onSelectRelationship(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!interactionState.current) {
      return;
    }

    if (interactionState.current.mode === "drag") {
      const { entityId, offsetX, offsetY } = interactionState.current;
      const x = Math.max(24, Math.round(event.clientX - offsetX));
      const y = Math.max(24, Math.round(event.clientY - offsetY));
      onMoveEntity(entityId, x, y);
      return;
    }

    const { entityId, startX, startY, initialWidth, initialHeight, minHeight } = interactionState.current;
    const width = Math.max(CARD_MIN_WIDTH, Math.round(initialWidth + (event.clientX - startX)));
    const height = Math.max(minHeight, CARD_MIN_HEIGHT, Math.round(initialHeight + (event.clientY - startY)));
    onResizeEntity(entityId, width, height);
  }

  function handlePointerUp() {
    interactionState.current = null;
    setDraggingId(null);
  }

  function handleCanvasBackgroundClick(event) {
    const target = event.target;

    if (
      target instanceof Element &&
      (
        target.closest(".entity-card") ||
        target.closest(".relationship-delete-badge") ||
        target.closest(".diagram-link") ||
        target.closest(".diagram-link-hit-area")
      )
    ) {
      return;
    }

    onSelectEntity(null);
    onSelectRelationship(null);
  }

  return (
    <section
      ref={canvasRef}
      className={`diagram-canvas ${draggingId ? "dragging" : ""}`}
      onClick={handleCanvasBackgroundClick}
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
              relationship={relationship}
              source={source}
              target={target}
              dashed={relationship.style === "dashed"}
              isSelected={relationship.id === selectedRelationshipId}
              onSelectRelationship={onSelectRelationship}
              onDeleteRelationship={onDeleteRelationship}
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
          onResizeStart={handleResizeStart}
          onSelect={onSelectEntity}
          onDelete={onDeleteEntity}
        />
      ))}
    </section>
  );
}
