import { useEffect, useRef, useState } from "react";

const CARD_WIDTH = 280;
const CARD_MIN_WIDTH = 220;
const CARD_MIN_HEIGHT = 120;
const CARD_COMPACT_MIN_HEIGHT = 58;
const CARD_COMMENT_MIN_HEIGHT = 92;
const CARD_HEADER = 50;
const ROW_HEIGHT = 33;
const CARD_MAX_WIDTH = 560;
const CARD_COMMENT_MAX_WIDTH = 980;
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const WORLD_PADDING = 220;

function estimateTextWidth(text, factor = 9.2) {
  return String(text ?? "").length * factor;
}

function normalizeDisplayLevel(displayLevel) {
  const normalized = String(displayLevel ?? "Column").trim().toLowerCase();

  if (normalized === "0") {
    return "table";
  }

  if (normalized === "1") {
    return "column";
  }

  if (normalized === "12") {
    return "key";
  }

  if (normalized === "13") {
    return "graph";
  }

  if (normalized === "3") {
    return "comment";
  }

  if (normalized === "5") {
    return "primarykey";
  }

  if (normalized === "6") {
    return "order";
  }

  if (normalized === "7") {
    return "icon";
  }

  return normalized;
}

function isCommentDisplayLevel(displayLevel) {
  return normalizeDisplayLevel(displayLevel) === "comment";
}

function getCommentText(entity, viewMode) {
  const useDefinition = String(viewMode ?? "").trim().toLowerCase() === "logical view";
  return String(useDefinition ? entity.definition ?? "" : entity.comment ?? "").trim();
}

function sortFieldsForDisplay(fields) {
  return [...fields].sort((left, right) => {
    const leftRank = left.kind === "PK" ? 0 : 1;
    const rightRank = right.kind === "PK" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return 0;
  });
}

function getVisibleFields(entity, displayLevel) {
  const normalizedDisplayLevel = normalizeDisplayLevel(displayLevel);
  const fields = sortFieldsForDisplay(entity.fields ?? []);

  if (
    normalizedDisplayLevel === "table" ||
    normalizedDisplayLevel === "entity" ||
    normalizedDisplayLevel === "comment"
  ) {
    return [];
  }

  if (normalizedDisplayLevel === "key" || normalizedDisplayLevel === "primarykey") {
    return fields.filter((field) => field.kind === "PK" || field.kind === "FK");
  }

  return fields;
}

function getPreferredEntitySize(entity, displayLevel) {
  const headerWidth = estimateTextWidth(entity.physicalName ?? entity.name ?? "Entity", 12) + 92;
  const commentMode = isCommentDisplayLevel(displayLevel);

  if (commentMode) {
    const commentText = getCommentText(entity);
    const commentWidth = commentText ? estimateTextWidth(commentText, 8.6) + 34 : 0;

    return {
      width: Math.min(
        CARD_COMMENT_MAX_WIDTH,
        Math.max(CARD_MIN_WIDTH, Math.ceil(Math.max(headerWidth, commentWidth)))
      ),
      height: CARD_COMMENT_MIN_HEIGHT
    };
  }

  const visibleFields = getVisibleFields(entity, displayLevel);
  const widestFieldWidth = Math.max(
    ...visibleFields.map((field) => {
      const nameWidth = estimateTextWidth(field.name, 10);
      const typeWidth = estimateTextWidth(field.dataType, 9.1);
      return 48 + 10 + nameWidth + 18 + typeWidth + 28;
    }),
    CARD_WIDTH
  );
  const rowCount = visibleFields.length;
  const minHeight = rowCount > 0 ? CARD_MIN_HEIGHT : CARD_COMPACT_MIN_HEIGHT;

  return {
    width: Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, Math.ceil(Math.max(headerWidth, widestFieldWidth)))),
    height: Math.max(minHeight, CARD_HEADER + rowCount * ROW_HEIGHT + 18)
  };
}

function getRenderedEntitySize(entity, displayLevel) {
  const preferredSize = getPreferredEntitySize(entity, displayLevel);
  const visibleFields = getVisibleFields(entity, displayLevel);
  const totalFields = entity.fields?.length ?? 0;
  const shouldPreserveManualHeight =
    !isCommentDisplayLevel(displayLevel) &&
    visibleFields.length > 0 &&
    visibleFields.length === totalFields;

  return {
    width: Math.max(entity.width ?? 0, preferredSize.width),
    height: shouldPreserveManualHeight
      ? Math.max(entity.height ?? 0, preferredSize.height)
      : preferredSize.height
  };
}

function getCardBounds(entity, displayLevel) {
  const { width, height } = getRenderedEntitySize(entity, displayLevel);

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

function getWorldSize(entities, displayLevel) {
  if (entities.length === 0) {
    return {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT
    };
  }

  const furthestRight = Math.max(...entities.map((entity) => getCardBounds(entity, displayLevel).right));
  const furthestBottom = Math.max(...entities.map((entity) => getCardBounds(entity, displayLevel).bottom));

  return {
    width: Math.max(WORLD_WIDTH, Math.ceil(furthestRight + WORLD_PADDING)),
    height: Math.max(WORLD_HEIGHT, Math.ceil(furthestBottom + WORLD_PADDING))
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAnchor(entity, target, displayLevel) {
  const bounds = getCardBounds(entity, displayLevel);
  const targetBounds = getCardBounds(target, displayLevel);
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
  displayLevel,
  lineVariant,
  isSelected,
  onSelectRelationship,
  onDeleteRelationship
}) {
  const start = getAnchor(source, target, displayLevel);
  const end = getAnchor(target, source, displayLevel);
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
        className={`diagram-link ${lineVariant} ${isSelected ? "selected" : ""}`}
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

function getEntityCardVariant(entity) {
  if (entity?.objectType === "materializedView") {
    return "materialized-view";
  }

  if (entity?.objectType === "view") {
    return "view";
  }

  return "entity";
}

function EntityCard({
  entity,
  displayLevel,
  viewMode,
  isSelected,
  selectedAttributeId,
  isLinkingRelationship,
  onPointerDown,
  onResizeStart,
  onSelect,
  onSelectAttribute,
  onDelete
}) {
  const commentMode = isCommentDisplayLevel(displayLevel);
  const commentText = getCommentText(entity, viewMode);
  const visibleFields = getVisibleFields(entity, displayLevel);
  const preferredSize = getPreferredEntitySize(entity, displayLevel);
  const { width, height } = getRenderedEntitySize(entity, displayLevel);
  const variantClass = getEntityCardVariant(entity);

  return (
    <article
      className={`entity-card ${variantClass} ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width, height }}
      onPointerDown={(event) => onPointerDown(event, entity.id)}
      onClick={(event) => {
        if (event.metaKey) {
          return;
        }

        if (isLinkingRelationship) {
          event.stopPropagation();
          onSelect(entity.id, {
            additive: false,
            toggle: false
          });
          return;
        }

        onSelect(entity.id, {
          additive: false,
          toggle: false
        });
      }}
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

      {commentMode ? (
        <div className={`entity-comment ${commentText ? "" : "empty"}`}>{commentText || " "}</div>
      ) : visibleFields.length > 0 ? (
        <div className="entity-fields">
          {visibleFields.map((field) => (
            <div
              key={field.id}
              className={`entity-field-row ${selectedAttributeId === field.id ? "active" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectAttribute(field.id, entity.id);
              }}
            >
              <FieldBadge kind={field.kind} />
              <span className="entity-field-name">{field.name}</span>
              <span className="entity-field-type">{field.dataType}</span>
            </div>
          ))}
        </div>
      ) : null}

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
  selectedEntityIds,
  selectedRelationshipId,
  selectedAttributeId,
  displayLevel,
  viewMode,
  isLinkingRelationship,
  zoom,
  onSelectEntity,
  onSelectEntities,
  onSelectRelationship,
  onMoveEntity,
  onMoveEntities,
  onResizeEntity,
  onSelectAttribute,
  onDeleteEntity,
  onDeleteRelationship,
  onViewportChange,
  viewResetToken
}) {
  const entityMap = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  const worldSize = getWorldSize(entities, displayLevel);
  const interactionState = useRef(null);
  const canvasRef = useRef(null);
  const suppressBackgroundClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [marqueeRect, setMarqueeRect] = useState(null);

  function getCanvasPoint(event) {
    const element = canvasRef.current;
    const bounds = element.getBoundingClientRect();

    return {
      x: (event.clientX - bounds.left + element.scrollLeft) / zoom,
      y: (event.clientY - bounds.top + element.scrollTop) / zoom
    };
  }

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
    if (isLinkingRelationship) {
      event.preventDefault();
      event.stopPropagation();
      onSelectEntity(entityId, {
        additive: false,
        toggle: false
      });
      return;
    }

    event.preventDefault();
    const entity = entityMap[entityId];
    const currentSelection = selectedEntityIds.includes(entityId) ? selectedEntityIds : [entityId];

    if (event.metaKey) {
      onSelectEntity(entityId, { toggle: true });
      return;
    }

    interactionState.current = {
      mode: "drag",
      entityIds: currentSelection,
      anchorEntityId: entityId,
      pointerStart: getCanvasPoint(event),
      initialPositions: currentSelection.map((id) => {
        const selectedEntity = entityMap[id];
        return {
          id,
          x: selectedEntity.x,
          y: selectedEntity.y
        };
      })
    };

    setDraggingId(entityId);
    onSelectEntities(currentSelection);
    onSelectRelationship(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizeStart(event, entityId) {
    event.preventDefault();
    event.stopPropagation();
    const entity = entityMap[entityId];
    const preferredSize = getPreferredEntitySize(entity, displayLevel);
    const { width, height } = getRenderedEntitySize(entity, displayLevel);

    interactionState.current = {
      mode: "resize",
      entityId,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: width,
      initialHeight: height,
      minHeight: preferredSize.height,
      minWidth: preferredSize.width
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
      const { entityIds, anchorEntityId, pointerStart, initialPositions } = interactionState.current;
      const point = getCanvasPoint(event);
      const deltaX = point.x - pointerStart.x;
      const deltaY = point.y - pointerStart.y;
      const updates = initialPositions.map((position) => ({
        id: position.id,
        x: Math.max(24, Math.round(position.x + deltaX)),
        y: Math.max(24, Math.round(position.y + deltaY))
      }));

      if (entityIds.length > 1) {
        onMoveEntities(entityIds, updates);
      } else {
        const anchorUpdate = updates.find((update) => update.id === anchorEntityId);
        if (anchorUpdate) {
          onMoveEntity(anchorEntityId, anchorUpdate.x, anchorUpdate.y);
        }
      }
      return;
    }

    if (interactionState.current.mode === "select") {
      const point = getCanvasPoint(event);
      const rect = {
        left: Math.min(interactionState.current.start.x, point.x),
        top: Math.min(interactionState.current.start.y, point.y),
        right: Math.max(interactionState.current.start.x, point.x),
        bottom: Math.max(interactionState.current.start.y, point.y)
      };
      setMarqueeRect(rect);

      const hits = entities
        .filter((entity) => {
          const bounds = getCardBounds(entity, displayLevel);

          return !(
            bounds.right < rect.left ||
            bounds.left > rect.right ||
            bounds.bottom < rect.top ||
            bounds.top > rect.bottom
          );
        })
        .map((entity) => entity.id);

      const nextSelection = interactionState.current.additive
        ? Array.from(new Set([...interactionState.current.baseSelection, ...hits]))
        : hits;
      onSelectEntities(nextSelection);
      return;
    }

    const { entityId, startX, startY, initialWidth, initialHeight, minHeight, minWidth } = interactionState.current;
    const width = Math.max(minWidth, Math.round(initialWidth + (event.clientX - startX)));
    const height = Math.max(minHeight, CARD_MIN_HEIGHT, Math.round(initialHeight + (event.clientY - startY)));
    onResizeEntity(entityId, width, height);
  }

  function handlePointerUp() {
    if (interactionState.current?.mode === "select") {
      suppressBackgroundClickRef.current = true;
    }

    interactionState.current = null;
    setDraggingId(null);
    setMarqueeRect(null);
  }

  function handleCanvasBackgroundClick(event) {
    if (suppressBackgroundClickRef.current) {
      suppressBackgroundClickRef.current = false;
      return;
    }

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

  function handleCanvasPointerDown(event) {
    const target = event.target;

    if (
      target instanceof Element &&
      (
        target.closest(".entity-card") ||
        target.closest(".diagram-link") ||
        target.closest(".diagram-link-hit-area") ||
        target.closest(".relationship-delete-badge")
      )
    ) {
      return;
    }

    const start = getCanvasPoint(event);
    interactionState.current = {
      mode: "select",
      start,
      additive: event.metaKey,
      baseSelection: event.metaKey ? selectedEntityIds : []
    };

    if (!event.metaKey) {
      onSelectRelationship(null);
    }
  }

  return (
    <section
      ref={canvasRef}
      className={`diagram-canvas ${draggingId ? "dragging" : ""}`}
      onClick={handleCanvasBackgroundClick}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="diagram-stage-shell"
        style={{ width: worldSize.width * zoom, height: worldSize.height * zoom }}
      >
        <div
          className="diagram-stage"
          style={{
            width: worldSize.width,
            height: worldSize.height,
            transform: `scale(${zoom})`
          }}
        >
          <div
            className="diagram-grid"
            style={{ width: worldSize.width, height: worldSize.height }}
          />

          <svg
            className="diagram-svg"
            viewBox={`0 0 ${worldSize.width} ${worldSize.height}`}
            preserveAspectRatio="none"
            style={{ width: worldSize.width, height: worldSize.height }}
          >
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
                  displayLevel={displayLevel}
                  lineVariant={
                    String(relationship.relationshipType ?? "").trim().toLowerCase() === "derived"
                      ? "derived"
                      : String(relationship.relationshipType ?? "").trim().toLowerCase() === "non-identifying" ||
                          String(relationship.relationshipType ?? "").trim() === "7"
                        ? "non-identifying"
                        : "identifying"
                  }
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
              displayLevel={displayLevel}
              viewMode={viewMode}
              isSelected={selectedEntityIds.includes(entity.id)}
              selectedAttributeId={selectedEntityIds.includes(entity.id) ? selectedAttributeId : null}
              isLinkingRelationship={isLinkingRelationship}
              onPointerDown={handlePointerDown}
              onResizeStart={handleResizeStart}
              onSelect={onSelectEntity}
              onSelectAttribute={onSelectAttribute}
              onDelete={onDeleteEntity}
            />
          ))}

          {marqueeRect ? (
            <div
              className="marquee-selection"
              style={{
                left: marqueeRect.left,
                top: marqueeRect.top,
                width: marqueeRect.right - marqueeRect.left,
                height: marqueeRect.bottom - marqueeRect.top
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
