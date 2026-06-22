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

function flattenFieldTree(fields, expandedFieldIds, depth = 0) {
  return sortFieldsForDisplay(fields).flatMap((field) => {
    const children = Array.isArray(field.children) ? field.children : [];
    const isExpanded = expandedFieldIds?.[field.id] ?? true;
    return [
      {
        ...field,
        depth,
        hasChildren: children.length > 0,
        isExpanded
      },
      ...(children.length > 0 && isExpanded ? flattenFieldTree(children, expandedFieldIds, depth + 1) : [])
    ];
  });
}

function getVisibleFields(entity, displayLevel, expandedFieldIds) {
  const normalizedDisplayLevel = normalizeDisplayLevel(displayLevel);
  const fields = flattenFieldTree(entity.fields ?? [], expandedFieldIds);

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

function getPreferredEntitySize(entity, displayLevel, viewMode, expandedFieldIds) {
  if (entity?.objectType === "drawing") {
    const drawingText = String(entity.drawingText ?? "").trim() || "Drawing";
    const lines = drawingText.split(/\r?\n/);
    const longestLineWidth = Math.max(...lines.map((line) => estimateTextWidth(line, 8.2)), 90);

    return {
      width: Math.min(440, Math.max(120, Math.ceil(longestLineWidth + 44))),
      height: Math.max(90, Math.min(320, 28 + lines.length * 24))
    };
  }

  if (entity?.objectType === "annotation") {
    const annotationText = String(entity.annotationText ?? "").trim() || "Type annotation";
    const lines = annotationText.split(/\r?\n/);
    const longestLineWidth = Math.max(...lines.map((line) => estimateTextWidth(line, 8.2)), 120);

    return {
      width: Math.min(440, Math.max(180, Math.ceil(longestLineWidth + 34))),
      height: Math.max(92, Math.min(280, 28 + lines.length * 24))
    };
  }

  const headerWidth = estimateTextWidth(entity.physicalName ?? entity.name ?? "Entity", 12) + 92;
  const commentMode = isCommentDisplayLevel(displayLevel);

  if (commentMode) {
    const commentText = getCommentText(entity, viewMode);
    const commentWidth = commentText ? estimateTextWidth(commentText, 8.6) + 34 : 0;

    return {
      width: Math.min(
        CARD_COMMENT_MAX_WIDTH,
        Math.max(CARD_MIN_WIDTH, Math.ceil(Math.max(headerWidth, commentWidth)))
      ),
      height: CARD_COMMENT_MIN_HEIGHT
    };
  }

  const visibleFields = getVisibleFields(entity, displayLevel, expandedFieldIds);
  const widestFieldWidth = Math.max(
    ...visibleFields.map((field) => {
      const indentWidth = field.depth * 18 + (field.hasChildren ? 16 : 0);
      const nameWidth = estimateTextWidth(field.name, 10);
      const typeWidth = estimateTextWidth(field.dataType, 9.1);
      return 48 + indentWidth + 10 + nameWidth + 18 + typeWidth + 28;
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

function getRenderedEntitySize(entity, displayLevel, viewMode, expandedFieldIds) {
  const preferredSize = getPreferredEntitySize(entity, displayLevel, viewMode, expandedFieldIds);

  if (entity?.objectType === "drawing") {
    return {
      width: Math.max(entity.width ?? 0, preferredSize.width),
      height: Math.max(entity.height ?? 0, preferredSize.height)
    };
  }

  if (entity?.objectType === "annotation") {
    return {
      width: Math.max(entity.width ?? 0, preferredSize.width),
      height: Math.max(entity.height ?? 0, preferredSize.height)
    };
  }

  const normalizedDisplayLevel = normalizeDisplayLevel(displayLevel);
  const shouldPreserveManualHeight =
    normalizedDisplayLevel !== "table" &&
    normalizedDisplayLevel !== "entity" &&
    normalizedDisplayLevel !== "comment";

  return {
    width: Math.max(entity.width ?? 0, preferredSize.width),
    height: shouldPreserveManualHeight
      ? Math.max(entity.height ?? 0, preferredSize.height)
      : preferredSize.height
  };
}

function getCardBounds(entity, displayLevel, viewMode, expandedFieldIds) {
  const { width, height } = getRenderedEntitySize(entity, displayLevel, viewMode, expandedFieldIds);

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

function getWorldSize(entities, displayLevel, viewMode, expandedFieldIds) {
  if (entities.length === 0) {
    return {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT
    };
  }

  const furthestRight = Math.max(
    ...entities.map((entity) => getCardBounds(entity, displayLevel, viewMode, expandedFieldIds).right)
  );
  const furthestBottom = Math.max(
    ...entities.map((entity) => getCardBounds(entity, displayLevel, viewMode, expandedFieldIds).bottom)
  );

  return {
    width: Math.max(WORLD_WIDTH, Math.ceil(furthestRight + WORLD_PADDING)),
    height: Math.max(WORLD_HEIGHT, Math.ceil(furthestBottom + WORLD_PADDING))
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAnchor(entity, target, displayLevel, viewMode, expandedFieldIds) {
  const bounds = getCardBounds(entity, displayLevel, viewMode, expandedFieldIds);
  const targetBounds = getCardBounds(target, displayLevel, viewMode, expandedFieldIds);
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

function normalizeNotationStyle(notationStyle) {
  const normalized = String(notationStyle ?? "IDEF1x").trim().toLowerCase();

  if (normalized === "information engineering") {
    return "information-engineering";
  }

  if (normalized === "data warehousing") {
    return "data-warehousing";
  }

  if (normalized === "graph") {
    return "graph";
  }

  return "idef1x";
}

function buildLogicalRelationshipPhrase(relationship) {
  const parentToChild = String(relationship?.parentToChildVerbPhrase ?? "").trim();
  const childToParent = String(relationship?.childToParentVerbPhrase ?? "").trim();

  if (parentToChild && childToParent) {
    return `${parentToChild} / ${childToParent}`;
  }

  return parentToChild || childToParent || "";
}

function getRelationshipDragOffset(relationship) {
  return {
    x: Number(relationship?.props?.lineOffsetX ?? 0),
    y: Number(relationship?.props?.lineOffsetY ?? 0)
  };
}

function DiagramLink({
  relationship,
  source,
  target,
  displayLevel,
  viewMode,
  notationStyle,
  expandedFieldIds,
  lineVariant,
  isSelected,
  onRelationshipPointerDown,
  onSelectRelationship,
  onDeleteRelationship
}) {
  const start = getAnchor(source, target, displayLevel, viewMode, expandedFieldIds);
  const end = getAnchor(target, source, displayLevel, viewMode, expandedFieldIds);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const curveStrength = Math.max(36, Math.min(140, Math.abs(deltaX) * 0.35 + Math.abs(deltaY) * 0.1));
  const horizontalFirst = Math.abs(deltaX) >= Math.abs(deltaY);
  const relationshipOffset = getRelationshipDragOffset(relationship);
  const controlOneX = (horizontalFirst ? start.x + Math.sign(deltaX || 1) * curveStrength : start.x) + relationshipOffset.x;
  const controlOneY = (horizontalFirst ? start.y : start.y + Math.sign(deltaY || 1) * curveStrength) + relationshipOffset.y;
  const controlTwoX = (horizontalFirst ? end.x - Math.sign(deltaX || 1) * curveStrength : end.x) + relationshipOffset.x;
  const controlTwoY = (horizontalFirst ? end.y : end.y - Math.sign(deltaY || 1) * curveStrength) + relationshipOffset.y;
  const path = `M ${start.x} ${start.y} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${end.x} ${end.y}`;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - 10;
  const markerX = ((start.x + controlOneX) / 2 + (controlTwoX + end.x) / 2) / 2;
  const markerY = ((start.y + controlOneY) / 2 + (controlTwoY + end.y) / 2) / 2;
  const normalizedNotationStyle = normalizeNotationStyle(notationStyle);
  const endVectorX = start.x - end.x;
  const endVectorY = start.y - end.y;
  const endVectorLength = Math.hypot(endVectorX, endVectorY) || 1;
  const childMarkerOffset = normalizedNotationStyle === "information-engineering" ? 22 : 10;
  const childMarkerX = end.x + (endVectorX / endVectorLength) * childMarkerOffset;
  const childMarkerY = end.y + (endVectorY / endVectorLength) * childMarkerOffset;
  const adjustedEndX = childMarkerX;
  const adjustedEndY = childMarkerY;
  const adjustedControlTwoX = (horizontalFirst ? adjustedEndX - Math.sign(deltaX || 1) * curveStrength : adjustedEndX) + relationshipOffset.x;
  const adjustedControlTwoY = (horizontalFirst ? adjustedEndY : adjustedEndY - Math.sign(deltaY || 1) * curveStrength) + relationshipOffset.y;
  const adjustedPath = `M ${start.x} ${start.y} C ${controlOneX} ${controlOneY}, ${adjustedControlTwoX} ${adjustedControlTwoY}, ${adjustedEndX} ${adjustedEndY}`;
  const adjustedMidX = (start.x + adjustedEndX) / 2 + relationshipOffset.x * 0.5;
  const adjustedMidY = (start.y + adjustedEndY) / 2 + relationshipOffset.y * 0.5 - 10;
  const adjustedMarkerX = ((start.x + controlOneX) / 2 + (adjustedControlTwoX + adjustedEndX) / 2) / 2;
  const adjustedMarkerY = ((start.y + controlOneY) / 2 + (adjustedControlTwoY + adjustedEndY) / 2) / 2;
  const logicalRelationshipPhrase = buildLogicalRelationshipPhrase(relationship);
  const dirX = (end.x - start.x) / endVectorLength;
  const dirY = (end.y - start.y) / endVectorLength;
  const perpX = -dirY;
  const perpY = dirX;
  const isMostlyVertical = Math.abs(dirY) >= Math.abs(dirX);
  const parentMarkerInset = 12;
  const parentMarkerCenterX = start.x + dirX * parentMarkerInset;
  const parentMarkerCenterY = start.y + dirY * parentMarkerInset;
  const ieBarHalfLength = isMostlyVertical ? 8 : 7;
  const ieBarStartX = parentMarkerCenterX - perpX * ieBarHalfLength;
  const ieBarStartY = parentMarkerCenterY - perpY * ieBarHalfLength;
  const ieBarEndX = parentMarkerCenterX + perpX * ieBarHalfLength;
  const ieBarEndY = parentMarkerCenterY + perpY * ieBarHalfLength;
  const ieProngSpread = isMostlyVertical ? 7 : 5.5;
  const ieCircleRadius = isMostlyVertical ? 5.5 : 5;
  const ieStemLength = isMostlyVertical ? 10 : 8;
  const ieStemEndX = childMarkerX + dirX * ieStemLength;
  const ieStemEndY = childMarkerY + dirY * ieStemLength;
  const ieCrowFootLeftX = ieStemEndX + perpX * ieProngSpread;
  const ieCrowFootLeftY = ieStemEndY + perpY * ieProngSpread;
  const ieCrowFootRightX = ieStemEndX - perpX * ieProngSpread;
  const ieCrowFootRightY = ieStemEndY - perpY * ieProngSpread;
  const arrowLength = 16;
  const arrowSpread = 7;
  const arrowBaseX = childMarkerX - dirX * arrowLength;
  const arrowBaseY = childMarkerY - dirY * arrowLength;
  const arrowLeftX = arrowBaseX + perpX * arrowSpread;
  const arrowLeftY = arrowBaseY + perpY * arrowSpread;
  const arrowRightX = arrowBaseX - perpX * arrowSpread;
  const arrowRightY = arrowBaseY - perpY * arrowSpread;
  const phraseAnchorX = start.x + (adjustedEndX - start.x) * 0.56 + relationshipOffset.x * 0.6 + perpX * 18;
  const phraseAnchorY = start.y + (adjustedEndY - start.y) * 0.56 + relationshipOffset.y * 0.6 + perpY * 18;

  function handleMarkerSelect(event) {
    event.stopPropagation();
    onSelectRelationship(relationship.id);
  }

  function renderNotationMarkers() {
    if (lineVariant === "connector") {
      return null;
    }

    if (normalizedNotationStyle === "data-warehousing") {
      return null;
    }

    if (normalizedNotationStyle === "graph") {
      return (
        <g className={`diagram-link-notation ${isSelected ? "selected" : ""}`} onClick={handleMarkerSelect}>
          <polygon
            points={`${childMarkerX},${childMarkerY} ${arrowLeftX},${arrowLeftY} ${arrowRightX},${arrowRightY}`}
            className="diagram-link-graph-arrow"
          />
        </g>
      );
    }

    if (normalizedNotationStyle === "information-engineering") {
      return (
        <g className={`diagram-link-notation ${isSelected ? "selected" : ""}`} onClick={handleMarkerSelect}>
          <line
            x1={ieBarStartX}
            y1={ieBarStartY}
            x2={ieBarEndX}
            y2={ieBarEndY}
            className="diagram-link-parent-bar"
          />
          <circle
            cx={childMarkerX}
            cy={childMarkerY}
            r={ieCircleRadius}
            className="diagram-link-ie-circle"
          />
          <line
            x1={childMarkerX}
            y1={childMarkerY}
            x2={ieStemEndX}
            y2={ieStemEndY}
            className="diagram-link-ie-prong"
          />
          <line
            x1={childMarkerX}
            y1={childMarkerY}
            x2={ieCrowFootLeftX}
            y2={ieCrowFootLeftY}
            className="diagram-link-ie-prong"
          />
          <line
            x1={childMarkerX}
            y1={childMarkerY}
            x2={ieCrowFootRightX}
            y2={ieCrowFootRightY}
            className="diagram-link-ie-prong"
          />
        </g>
      );
    }

    return (
      <circle
        cx={childMarkerX}
        cy={childMarkerY}
        r="5.5"
        className={`diagram-link-child-marker ${isSelected ? "selected" : ""}`}
        onClick={handleMarkerSelect}
      />
    );
  }

  return (
    <>
      <path
        d={adjustedPath}
        className="diagram-link-hit-area"
        onPointerDown={(event) => onRelationshipPointerDown(event, relationship.id)}
        onClick={(event) => {
          event.stopPropagation();
          onSelectRelationship(relationship.id);
        }}
      />
      <path
        d={adjustedPath}
        className={`diagram-link ${lineVariant} ${isSelected ? "selected" : ""}`}
        onPointerDown={(event) => onRelationshipPointerDown(event, relationship.id)}
        onClick={handleMarkerSelect}
      />
      {renderNotationMarkers()}
      {lineVariant === "sub-category" ? (
        <circle
          cx={adjustedMarkerX}
          cy={adjustedMarkerY}
          r="9"
          className={`diagram-link-subcategory-marker ${isSelected ? "selected" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelectRelationship(relationship.id);
          }}
        />
      ) : null}
      {relationship.cardinality ? (
        <text x={adjustedMidX} y={adjustedMidY} className="diagram-link-label">
          {relationship.cardinality}
        </text>
      ) : null}
      {String(viewMode ?? "").trim().toLowerCase() === "logical view" && logicalRelationshipPhrase ? (
        <text x={phraseAnchorX} y={phraseAnchorY} className="diagram-link-phrase">
          {logicalRelationshipPhrase}
        </text>
      ) : null}
      {isSelected ? (
        <g
          className="relationship-delete-badge"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteRelationship(relationship.id);
          }}
        >
          <rect x={adjustedMidX - 14} y={adjustedMidY - 28} rx="8" ry="8" width="28" height="28" />
          <text x={adjustedMidX} y={adjustedMidY - 14}>
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

function FieldTreeMarker({ expanded }) {
  return (
    <span className={`field-tree-marker ${expanded ? "expanded" : ""}`} aria-hidden="true">
      {expanded ? "▾" : "▸"}
    </span>
  );
}

function getEntityCardVariant(entity) {
  if (entity?.objectType === "drawing") {
    return "drawing";
  }

  if (entity?.objectType === "annotation") {
    return "annotation";
  }

  if (entity?.objectType === "materializedView") {
    return "materialized-view";
  }

  if (entity?.objectType === "view") {
    return "view";
  }

  return "entity";
}

function DrawingShapeSvg({ shape }) {
  if (shape === "ellipse") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="50" rx="46" ry="42" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "diamond") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="50,4 96,50 50,96 4,50" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "hexagon") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="24,6 76,6 96,50 76,94 24,94 4,50" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "star") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="50,4 61,35 96,35 68,56 79,92 50,70 21,92 32,56 4,35 39,35"
          className="drawing-shape-fill"
        />
      </svg>
    );
  }

  if (shape === "arrow") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="6,20 60,20 60,6 94,50 60,94 60,80 6,80" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "rounded") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="4" y="6" width="92" height="88" rx="16" ry="16" className="drawing-shape-fill" />
      </svg>
    );
  }

  return (
    <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect x="4" y="6" width="92" height="88" className="drawing-shape-fill" />
    </svg>
  );
}

function getDrawingTextareaClass(shape) {
  if (shape === "diamond") {
    return "drawing-textarea inset-diamond";
  }

  if (shape === "ellipse") {
    return "drawing-textarea inset-ellipse";
  }

  if (shape === "hexagon") {
    return "drawing-textarea inset-hexagon";
  }

  if (shape === "star") {
    return "drawing-textarea inset-star";
  }

  if (shape === "arrow") {
    return "drawing-textarea inset-arrow";
  }

  return "drawing-textarea";
}

function DrawingCard({
  entity,
  isSelected,
  onPointerDown,
  onResizeStart,
  onSelect,
  onChangeText,
  onDelete
}) {
  const { width, height } = getRenderedEntitySize(entity, "comment", "Physical View", {});
  const shape = entity.drawingShape ?? "rectangle";

  return (
    <article
      className={`drawing-card shape-${shape} ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width, height }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(entity.id, {
          additive: false,
          toggle: false
        });
      }}
    >
      <div className="drawing-grab-strip" onPointerDown={(event) => onPointerDown(event, entity.id)} />
      <DrawingShapeSvg shape={shape} />
      <button
        type="button"
        className="drawing-close"
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
      <textarea
        className={getDrawingTextareaClass(shape)}
        value={entity.drawingText ?? ""}
        placeholder="Drawing"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(entity.id, {
            additive: false,
            toggle: false
          });
        }}
        onFocus={() =>
          onSelect(entity.id, {
            additive: false,
            toggle: false
          })
        }
        onChange={(event) => onChangeText(entity.id, event.target.value)}
      />
      <button
        type="button"
        className="entity-resize-handle"
        aria-label={`Resize drawing ${entity.name ?? "Drawing"}`}
        onPointerDown={(event) => onResizeStart(event, entity.id)}
        onClick={(event) => event.stopPropagation()}
      />
    </article>
  );
}

function AnnotationCard({
  entity,
  isSelected,
  onPointerDown,
  onResizeStart,
  onSelect,
  onChangeText,
  onDelete
}) {
  const { width, height } = getRenderedEntitySize(entity, "comment", "Physical View", {});

  return (
    <article
      className={`annotation-card ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width, height }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(entity.id, {
          additive: false,
          toggle: false
        });
      }}
    >
      <div
        className="annotation-grab-strip"
        onPointerDown={(event) => onPointerDown(event, entity.id)}
      />
      <button
        type="button"
        className="annotation-close"
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
      <textarea
        className="annotation-textarea"
        value={entity.annotationText ?? ""}
        placeholder="Type annotation"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(entity.id, {
            additive: false,
            toggle: false
          });
        }}
        onFocus={() =>
          onSelect(entity.id, {
            additive: false,
            toggle: false
          })
        }
        onChange={(event) => onChangeText(entity.id, event.target.value)}
      />
      <button
        type="button"
        className="entity-resize-handle"
        aria-label={`Resize annotation ${entity.name ?? "Annotation"}`}
        onPointerDown={(event) => onResizeStart(event, entity.id)}
        onClick={(event) => event.stopPropagation()}
      />
    </article>
  );
}

function EntityCard({
  entity,
  displayLevel,
  viewMode,
  expandedFieldIds,
  isSelected,
  selectedAttributeId,
  isLinkingRelationship,
  onPointerDown,
  onResizeStart,
  onSelect,
  onSelectAttribute,
  onToggleFieldExpansion,
  onDelete
}) {
  const commentMode = isCommentDisplayLevel(displayLevel);
  const commentText = getCommentText(entity, viewMode);
  const visibleFields = getVisibleFields(entity, displayLevel, expandedFieldIds);
  const preferredSize = getPreferredEntitySize(entity, displayLevel, viewMode, expandedFieldIds);
  const { width, height } = getRenderedEntitySize(entity, displayLevel, viewMode, expandedFieldIds);
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
              style={{ "--field-depth": field.depth }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectAttribute(field.id, entity.id);
              }}
              onDoubleClick={(event) => {
                if (!field.hasChildren) {
                  return;
                }

                event.stopPropagation();
                onToggleFieldExpansion(entity.id, field.id);
              }}
            >
              <span className="entity-field-indent" aria-hidden="true" />
              {field.hasChildren ? (
                <button
                  type="button"
                  className={`field-tree-toggle ${String(field.dataType ?? "").toLowerCase().startsWith("array") ? "array" : "object"}`}
                  aria-label={`${field.isExpanded ? "Collapse" : "Expand"} ${field.name}`}
                  title={`${field.isExpanded ? "Collapse" : "Expand"} ${field.name}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectAttribute(field.id, entity.id);
                    onToggleFieldExpansion(entity.id, field.id);
                  }}
                >
                  <FieldTreeMarker expanded={field.isExpanded} />
                </button>
              ) : (
                <span className="field-tree-placeholder" aria-hidden="true" />
              )}
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
  notationStyle,
  isLinkingRelationship,
  zoom,
  expandedFieldIds,
  focusEntityRequest,
  focusRelationshipRequest,
  onSelectEntity,
  onSelectEntities,
  onSelectRelationship,
  onMoveEntity,
  onMoveEntities,
  onMoveRelationship,
  onResizeEntity,
  onChangeAnnotationText,
  onChangeDrawingText,
  onSelectAttribute,
  onDeleteEntity,
  onDeleteRelationship,
  onToggleFieldExpansion,
  onViewportChange,
  viewResetToken
}) {
  const entityMap = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  const worldSize = getWorldSize(entities, displayLevel, viewMode, expandedFieldIds);
  const interactionState = useRef(null);
  const canvasRef = useRef(null);
  const suppressBackgroundClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const [marqueeRect, setMarqueeRect] = useState(null);

  useEffect(() => {
    const visibleFieldIds = new Set(
      entities.flatMap((entity) => flattenFieldTree(entity.fields ?? [], expandedFieldIds).map((field) => field.id))
    );

    if (selectedAttributeId && !visibleFieldIds.has(selectedAttributeId)) {
      onSelectAttribute(null, selectedEntityIds.at(-1) ?? null);
    }
  }, [entities, expandedFieldIds, onSelectAttribute, selectedAttributeId, selectedEntityIds]);

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

  useEffect(() => {
    if (!canvasRef.current || !focusEntityRequest?.entityId) {
      return;
    }

    const entity = entityMap[focusEntityRequest.entityId];
    if (!entity) {
      return;
    }

    const element = canvasRef.current;
    const bounds = getCardBounds(entity, displayLevel, viewMode, expandedFieldIds);
    const targetLeft = Math.max(0, bounds.left * zoom - Math.max(0, element.clientWidth / 2 - (bounds.width * zoom) / 2));
    const targetTop = Math.max(0, bounds.top * zoom - Math.max(0, element.clientHeight / 2 - (bounds.height * zoom) / 2));

    element.scrollTo({
      left: targetLeft,
      top: targetTop,
      behavior: "smooth"
    });
  }, [displayLevel, entityMap, focusEntityRequest, zoom]);

  useEffect(() => {
    if (!canvasRef.current || !focusRelationshipRequest?.relationshipId) {
      return;
    }

    const relationship = relationships.find(
      (item) => item.id === focusRelationshipRequest.relationshipId
    );
    if (!relationship) {
      return;
    }

    const source = entityMap[relationship.sourceEntityId];
    const target = entityMap[relationship.targetEntityId];
    if (!source || !target) {
      return;
    }

    const start = getAnchor(source, target, displayLevel, viewMode, expandedFieldIds);
    const end = getAnchor(target, source, displayLevel, viewMode, expandedFieldIds);
    const relationshipOffset = getRelationshipDragOffset(relationship);
    const focusX = (start.x + end.x) / 2 + relationshipOffset.x * 0.5;
    const focusY = (start.y + end.y) / 2 + relationshipOffset.y * 0.5;
    const element = canvasRef.current;
    const targetLeft = Math.max(0, focusX * zoom - element.clientWidth / 2);
    const targetTop = Math.max(0, focusY * zoom - element.clientHeight / 2);

    element.scrollTo({
      left: targetLeft,
      top: targetTop,
      behavior: "smooth"
    });
  }, [displayLevel, entityMap, focusRelationshipRequest, relationships, zoom]);

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
    const preferredSize = getPreferredEntitySize(entity, displayLevel, viewMode, expandedFieldIds);
    const { width, height } = getRenderedEntitySize(entity, displayLevel, viewMode, expandedFieldIds);

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

  function handleRelationshipPointerDown(event, relationshipId) {
    if (isLinkingRelationship) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const relationship = relationships.find((item) => item.id === relationshipId);
    if (!relationship) {
      return;
    }

    const offset = getRelationshipDragOffset(relationship);
    interactionState.current = {
      mode: "relationship-drag",
      relationshipId,
      pointerStart: getCanvasPoint(event),
      initialOffsetX: offset.x,
      initialOffsetY: offset.y
    };

    setDraggingId(`relationship-${relationshipId}`);
    onSelectRelationship(relationshipId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
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
          const bounds = getCardBounds(entity, displayLevel, viewMode, expandedFieldIds);

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

    if (interactionState.current.mode === "relationship-drag") {
      const point = getCanvasPoint(event);
      const deltaX = point.x - interactionState.current.pointerStart.x;
      const deltaY = point.y - interactionState.current.pointerStart.y;
      onMoveRelationship(
        interactionState.current.relationshipId,
        interactionState.current.initialOffsetX + deltaX,
        interactionState.current.initialOffsetY + deltaY
      );
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
        target.closest(".drawing-card") ||
        target.closest(".annotation-card") ||
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
        target.closest(".drawing-card") ||
        target.closest(".annotation-card") ||
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
                  viewMode={viewMode}
                  notationStyle={notationStyle}
                  expandedFieldIds={expandedFieldIds}
                  lineVariant={
                    String(relationship.relationshipType ?? "").trim().toLowerCase() === "connector"
                      ? "connector"
                    : String(relationship.relationshipType ?? "").trim().toLowerCase() === "subtype" &&
                    String(viewMode ?? "").trim().toLowerCase() === "logical view"
                      ? "sub-category"
                      : String(relationship.relationshipType ?? "").trim().toLowerCase() === "derived"
                      ? "derived"
                      : String(relationship.relationshipType ?? "").trim().toLowerCase() === "manytomany" ||
                          String(relationship.relationshipType ?? "").trim().toLowerCase() === "many-to-many" ||
                          String(relationship.relationshipType ?? "").trim() === "4"
                        ? "many-to-many"
                      : String(relationship.relationshipType ?? "").trim().toLowerCase() === "non-identifying" ||
                          String(relationship.relationshipType ?? "").trim() === "7"
                        ? "non-identifying"
                        : "identifying"
                  }
                  isSelected={relationship.id === selectedRelationshipId}
                  onRelationshipPointerDown={handleRelationshipPointerDown}
                  onSelectRelationship={onSelectRelationship}
                  onDeleteRelationship={onDeleteRelationship}
                />
              );
            })}
          </svg>

          {entities.map((entity) =>
            entity?.objectType === "drawing" ? (
              <DrawingCard
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityIds.includes(entity.id)}
                onPointerDown={handlePointerDown}
                onResizeStart={handleResizeStart}
                onSelect={onSelectEntity}
                onChangeText={onChangeDrawingText}
                onDelete={onDeleteEntity}
              />
            ) : entity?.objectType === "annotation" ? (
              <AnnotationCard
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityIds.includes(entity.id)}
                onPointerDown={handlePointerDown}
                onResizeStart={handleResizeStart}
                onSelect={onSelectEntity}
                onChangeText={onChangeAnnotationText}
                onDelete={onDeleteEntity}
              />
            ) : (
              <EntityCard
                key={entity.id}
                entity={entity}
                displayLevel={displayLevel}
                viewMode={viewMode}
                expandedFieldIds={expandedFieldIds}
                isSelected={selectedEntityIds.includes(entity.id)}
                selectedAttributeId={selectedEntityIds.includes(entity.id) ? selectedAttributeId : null}
                isLinkingRelationship={isLinkingRelationship}
                onPointerDown={handlePointerDown}
                onResizeStart={handleResizeStart}
                onSelect={onSelectEntity}
                onSelectAttribute={onSelectAttribute}
                onToggleFieldExpansion={onToggleFieldExpansion}
                onDelete={onDeleteEntity}
              />
            )
          )}

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
