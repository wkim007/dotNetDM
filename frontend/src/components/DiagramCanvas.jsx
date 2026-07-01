import { useEffect, useRef, useState } from "react";

const CARD_WIDTH = 280;
const CARD_MIN_WIDTH = 220;
const CARD_MIN_HEIGHT = 120;
const CARD_COMPACT_MIN_HEIGHT = 58;
const CARD_COMMENT_MIN_HEIGHT = 92;
const CARD_HEADER = 50;
const ROW_HEIGHT = 38;
const PK_SEPARATOR_EXTRA_HEIGHT = 24;
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

function getEntityDisplayName(entity, viewMode) {
  const normalizedViewMode = String(viewMode ?? "").trim().toLowerCase();

  if (normalizedViewMode === "logical view") {
    return entity?.name ?? entity?.physicalName ?? "Entity";
  }

  return entity?.physicalName ?? entity?.name ?? "Entity";
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

function getPrimaryKeySeparatorExtraHeight(fields) {
  for (let index = 1; index < fields.length; index += 1) {
    if (fields[index].kind !== "PK" && fields[index - 1]?.kind === "PK") {
      return PK_SEPARATOR_EXTRA_HEIGHT;
    }
  }

  return 0;
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

  const headerWidth = estimateTextWidth(getEntityDisplayName(entity, viewMode), 12) + 92;
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
  const separatorExtraHeight = getPrimaryKeySeparatorExtraHeight(visibleFields);

  return {
    width: Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, Math.ceil(Math.max(headerWidth, widestFieldWidth)))),
    height: Math.max(minHeight, CARD_HEADER + rowCount * ROW_HEIGHT + 18 + separatorExtraHeight)
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

function getOutlineCenterAnchor(entity, target, displayLevel, viewMode, expandedFieldIds) {
  const bounds = getCardBounds(entity, displayLevel, viewMode, expandedFieldIds);
  const targetBounds = getCardBounds(target, displayLevel, viewMode, expandedFieldIds);
  const horizontalGap = targetBounds.centerX - bounds.centerX;
  const verticalGap = targetBounds.centerY - bounds.centerY;

  if (Math.abs(horizontalGap) >= Math.abs(verticalGap)) {
    return {
      x: horizontalGap >= 0 ? bounds.right : bounds.left,
      y: bounds.centerY
    };
  }

  return {
    x: bounds.centerX,
    y: verticalGap >= 0 ? bounds.bottom : bounds.top
  };
}

function clampRatio(value) {
  return Math.min(1, Math.max(0, value));
}

function getAttachmentAnchor(entity, attachment, displayLevel, viewMode, expandedFieldIds) {
  const bounds = getCardBounds(entity, displayLevel, viewMode, expandedFieldIds);
  const side = String(attachment?.side ?? "").trim().toLowerCase();
  const t = clampRatio(Number(attachment?.t ?? 0.5));

  if (side === "left") {
    return { x: bounds.left, y: bounds.top + bounds.height * t };
  }

  if (side === "right") {
    return { x: bounds.right, y: bounds.top + bounds.height * t };
  }

  if (side === "top") {
    return { x: bounds.left + bounds.width * t, y: bounds.top };
  }

  if (side === "bottom") {
    return { x: bounds.left + bounds.width * t, y: bounds.bottom };
  }

  return null;
}

function getClosestOutlineAttachment(entity, point, displayLevel, viewMode, expandedFieldIds) {
  const bounds = getCardBounds(entity, displayLevel, viewMode, expandedFieldIds);
  const distances = [
    { side: "left", distance: Math.abs(point.x - bounds.left) },
    { side: "right", distance: Math.abs(point.x - bounds.right) },
    { side: "top", distance: Math.abs(point.y - bounds.top) },
    { side: "bottom", distance: Math.abs(point.y - bounds.bottom) }
  ];
  const closest = distances.sort((left, right) => left.distance - right.distance)[0];

  if (closest.side === "left" || closest.side === "right") {
    return {
      side: closest.side,
      t: clampRatio((point.y - bounds.top) / Math.max(bounds.height, 1))
    };
  }

  return {
    side: closest.side,
    t: clampRatio((point.x - bounds.left) / Math.max(bounds.width, 1))
  };
}

function resolveRelationshipAnchor(entity, target, attachment, displayLevel, viewMode, expandedFieldIds) {
  return (
    getAttachmentAnchor(entity, attachment, displayLevel, viewMode, expandedFieldIds) ??
    getAnchor(entity, target, displayLevel, viewMode, expandedFieldIds)
  );
}

function resolveDrawingLineAnchor(entity, target, attachment, displayLevel, viewMode, expandedFieldIds) {
  return (
    getAttachmentAnchor(entity, attachment, displayLevel, viewMode, expandedFieldIds) ??
    getOutlineCenterAnchor(entity, target, displayLevel, viewMode, expandedFieldIds)
  );
}

function trimOrthogonalEndpoint(point, adjacentPoint, distance = 6) {
  if (!adjacentPoint) {
    return point;
  }

  if (Math.abs(point.x - adjacentPoint.x) < 0.001) {
    return {
      x: point.x,
      y: point.y + Math.sign(adjacentPoint.y - point.y) * distance
    };
  }

  if (Math.abs(point.y - adjacentPoint.y) < 0.001) {
    return {
      x: point.x + Math.sign(adjacentPoint.x - point.x) * distance,
      y: point.y
    };
  }

  const deltaX = adjacentPoint.x - point.x;
  const deltaY = adjacentPoint.y - point.y;
  const length = Math.hypot(deltaX, deltaY) || 1;

  return {
    x: point.x + (deltaX / length) * distance,
    y: point.y + (deltaY / length) * distance
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

function getDrawingLineDragOffset(entity) {
  return {
    x: Number(entity?.lineOffsetX ?? 0),
    y: Number(entity?.lineOffsetY ?? 0)
  };
}

function normalizeLineStyle(lineStyle) {
  return String(lineStyle ?? "curve").trim().toLowerCase() === "line" ? "line" : "curve";
}

function dedupePolylinePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return point.x !== previous.x || point.y !== previous.y;
  });
}

function buildOrthogonalRoute(start, end, offset = { x: 0, y: 0 }, preferHorizontal = false) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const horizontalSign = Math.sign(deltaX || 1);
  const verticalSign = Math.sign(deltaY || 1);
  const horizontalStub = Math.min(30, Math.max(12, Math.abs(deltaX) * 0.22));
  const verticalStub = Math.min(30, Math.max(12, Math.abs(deltaY) * 0.22));

  if (preferHorizontal) {
    const startStubX = start.x + horizontalSign * horizontalStub;
    const endStubX = end.x - horizontalSign * horizontalStub;
    const baseMidY = (start.y + end.y) / 2;
    const bendY = baseMidY + offset.y;
    const points = dedupePolylinePoints([
      { x: start.x, y: start.y },
      { x: startStubX, y: start.y },
      { x: startStubX, y: bendY },
      { x: endStubX, y: bendY },
      { x: endStubX, y: end.y },
      { x: end.x, y: end.y }
    ]);

    return {
      points,
      bendHandle: {
        x: (startStubX + endStubX) / 2,
        y: bendY
      },
      bendAxis: "horizontal",
      baseOffsetX: 0,
      baseOffsetY: baseMidY
    };
  }

  const startStubY = start.y + verticalSign * verticalStub;
  const endStubY = end.y - verticalSign * verticalStub;
  const baseMidX = (start.x + end.x) / 2;
  const bendX = baseMidX + offset.x;
  const points = dedupePolylinePoints([
    { x: start.x, y: start.y },
    { x: start.x, y: startStubY },
    { x: bendX, y: startStubY },
    { x: bendX, y: endStubY },
    { x: end.x, y: endStubY },
    { x: end.x, y: end.y }
  ]);

  return {
    points,
    bendHandle: {
      x: bendX,
      y: (startStubY + endStubY) / 2
    },
    bendAxis: "vertical",
    baseOffsetX: baseMidX,
    baseOffsetY: 0
  };
}

function getSegmentDirection(from, to) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY) || 1;

  return {
    x: deltaX / length,
    y: deltaY / length,
    length
  };
}

function getPolylineStartDirection(points) {
  for (let index = 1; index < points.length; index += 1) {
    const direction = getSegmentDirection(points[index - 1], points[index]);
    if (direction.length > 0) {
      return direction;
    }
  }

  return { x: 1, y: 0, length: 1 };
}

function getPolylineEndDirection(points) {
  for (let index = points.length - 1; index > 0; index -= 1) {
    const direction = getSegmentDirection(points[index - 1], points[index]);
    if (direction.length > 0) {
      return direction;
    }
  }

  return { x: 1, y: 0, length: 1 };
}

function getPolylineMidpoint(points) {
  if (points.length < 2) {
    return points[0] ?? { x: 0, y: 0 };
  }

  const middleIndex = Math.max(1, Math.floor((points.length - 1) / 2));
  const from = points[middleIndex - 1];
  const to = points[middleIndex];

  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2
  };
}

function pointsToPolyline(points) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function normalizeBendPoints(points) {
  return Array.isArray(points)
    ? points
        .map((point) => ({
          x: Number(point?.x),
          y: Number(point?.y)
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];
}

function buildPolylineRoute(start, end, bendPoints, offset, preferHorizontal = false) {
  const normalizedBendPoints = normalizeBendPoints(bendPoints);

  if (normalizedBendPoints.length > 0) {
    return {
      points: dedupePolylinePoints([start, ...normalizedBendPoints, end]),
      bendPoints: normalizedBendPoints
    };
  }

  const orthogonal = buildOrthogonalRoute(start, end, offset, preferHorizontal);
  return {
    points: orthogonal.points,
    bendPoints: orthogonal.points.slice(1, -1)
  };
}

function getSegmentMidpoints(points) {
  const midpoints = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (start.x === end.x && start.y === end.y) {
      continue;
    }

    midpoints.push({
      index,
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    });
  }

  return midpoints;
}

function DiagramLink({
  relationship,
  source,
  target,
  displayLevel,
  viewMode,
  notationStyle,
  lineStyle,
  expandedFieldIds,
  lineVariant,
  isSelected,
  onRelationshipPointerDown,
  onRelationshipEndpointPointerDown,
  onSelectRelationship,
  onDeleteRelationship
}) {
  const start = resolveRelationshipAnchor(
    source,
    target,
    relationship?.props?.sourceAttachment,
    displayLevel,
    viewMode,
    expandedFieldIds
  );
  const end = resolveRelationshipAnchor(
    target,
    source,
    relationship?.props?.targetAttachment,
    displayLevel,
    viewMode,
    expandedFieldIds
  );
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const normalizedLineStyle = normalizeLineStyle(lineStyle);
  const relationshipOffset = getRelationshipDragOffset(relationship);
  const curveStrength = Math.max(36, Math.min(140, Math.abs(deltaX) * 0.35 + Math.abs(deltaY) * 0.1));
  const horizontalFirst = Math.abs(deltaX) >= Math.abs(deltaY);
  const controlOneX = (horizontalFirst ? start.x + Math.sign(deltaX || 1) * curveStrength : start.x) + relationshipOffset.x;
  const controlOneY = (horizontalFirst ? start.y : start.y + Math.sign(deltaY || 1) * curveStrength) + relationshipOffset.y;
  const controlTwoX = (horizontalFirst ? end.x - Math.sign(deltaX || 1) * curveStrength : end.x) + relationshipOffset.x;
  const controlTwoY = (horizontalFirst ? end.y : end.y - Math.sign(deltaY || 1) * curveStrength) + relationshipOffset.y;
  const normalizedNotationStyle = normalizeNotationStyle(notationStyle);
  const curveEndVectorX = start.x - end.x;
  const curveEndVectorY = start.y - end.y;
  const curveEndVectorLength = Math.hypot(curveEndVectorX, curveEndVectorY) || 1;
  const childMarkerOffset = normalizedNotationStyle === "information-engineering" ? 22 : 10;
  const curveChildMarkerX = end.x + (curveEndVectorX / curveEndVectorLength) * childMarkerOffset;
  const curveChildMarkerY = end.y + (curveEndVectorY / curveEndVectorLength) * childMarkerOffset;
  const adjustedControlTwoX =
    (horizontalFirst ? curveChildMarkerX - Math.sign(deltaX || 1) * curveStrength : curveChildMarkerX) +
    relationshipOffset.x;
  const adjustedControlTwoY =
    (horizontalFirst ? curveChildMarkerY : curveChildMarkerY - Math.sign(deltaY || 1) * curveStrength) +
    relationshipOffset.y;
  const adjustedPath = `M ${start.x} ${start.y} C ${controlOneX} ${controlOneY}, ${adjustedControlTwoX} ${adjustedControlTwoY}, ${curveChildMarkerX} ${curveChildMarkerY}`;
  const lineRoute = buildPolylineRoute(
    start,
    end,
    relationship?.props?.bendPoints,
    relationshipOffset,
    Math.abs(deltaX) >= Math.abs(deltaY)
  );
  const lineEndDirection = getPolylineEndDirection(lineRoute.points);
  const lineChildMarker = {
    x: end.x - lineEndDirection.x * childMarkerOffset,
    y: end.y - lineEndDirection.y * childMarkerOffset
  };
  const visiblePolylinePoints = [...lineRoute.points];
  visiblePolylinePoints[visiblePolylinePoints.length - 1] = lineChildMarker;
  const logicalRelationshipPhrase = buildLogicalRelationshipPhrase(relationship);
  const routeStartDirection =
    normalizedLineStyle === "line"
      ? getPolylineStartDirection(visiblePolylinePoints)
      : getSegmentDirection(start, { x: controlOneX, y: controlOneY });
  const routeEndDirection =
    normalizedLineStyle === "line"
      ? lineEndDirection
      : getSegmentDirection({ x: adjustedControlTwoX, y: adjustedControlTwoY }, end);
  const markerCenterX = normalizedLineStyle === "line" ? lineChildMarker.x : curveChildMarkerX;
  const markerCenterY = normalizedLineStyle === "line" ? lineChildMarker.y : curveChildMarkerY;
  const routeMidpoint =
    normalizedLineStyle === "line"
      ? getPolylineMidpoint(visiblePolylinePoints)
      : {
          x: (start.x + curveChildMarkerX) / 2 + relationshipOffset.x * 0.5,
          y: (start.y + curveChildMarkerY) / 2 + relationshipOffset.y * 0.5
        };
  const routeMarkerPoint =
    normalizedLineStyle === "line"
      ? getPolylineMidpoint(visiblePolylinePoints)
      : {
          x: ((start.x + controlOneX) / 2 + (adjustedControlTwoX + curveChildMarkerX) / 2) / 2,
          y: ((start.y + controlOneY) / 2 + (adjustedControlTwoY + curveChildMarkerY) / 2) / 2
        };
  const dirX = routeEndDirection.x;
  const dirY = routeEndDirection.y;
  const perpX = -dirY;
  const perpY = dirX;
  const isMostlyVertical = Math.abs(dirY) >= Math.abs(dirX);
  const parentMarkerInset = 12;
  const parentMarkerCenterX = start.x + routeStartDirection.x * parentMarkerInset;
  const parentMarkerCenterY = start.y + routeStartDirection.y * parentMarkerInset;
  const ieBarHalfLength = isMostlyVertical ? 8 : 7;
  const ieBarStartX = parentMarkerCenterX - perpX * ieBarHalfLength;
  const ieBarStartY = parentMarkerCenterY - perpY * ieBarHalfLength;
  const ieBarEndX = parentMarkerCenterX + perpX * ieBarHalfLength;
  const ieBarEndY = parentMarkerCenterY + perpY * ieBarHalfLength;
  const ieProngSpread = isMostlyVertical ? 7 : 5.5;
  const ieCircleRadius = isMostlyVertical ? 5.5 : 5;
  const ieStemLength = isMostlyVertical ? 10 : 8;
  const ieStemEndX = markerCenterX + dirX * ieStemLength;
  const ieStemEndY = markerCenterY + dirY * ieStemLength;
  const ieCrowFootLeftX = ieStemEndX + perpX * ieProngSpread;
  const ieCrowFootLeftY = ieStemEndY + perpY * ieProngSpread;
  const ieCrowFootRightX = ieStemEndX - perpX * ieProngSpread;
  const ieCrowFootRightY = ieStemEndY - perpY * ieProngSpread;
  const arrowLength = 16;
  const arrowSpread = 7;
  const arrowBaseX = markerCenterX - dirX * arrowLength;
  const arrowBaseY = markerCenterY - dirY * arrowLength;
  const arrowLeftX = arrowBaseX + perpX * arrowSpread;
  const arrowLeftY = arrowBaseY + perpY * arrowSpread;
  const arrowRightX = arrowBaseX - perpX * arrowSpread;
  const arrowRightY = arrowBaseY - perpY * arrowSpread;
  const phraseAnchorX = routeMarkerPoint.x + perpX * 18;
  const phraseAnchorY = routeMarkerPoint.y + perpY * 18;

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
            points={`${markerCenterX},${markerCenterY} ${arrowLeftX},${arrowLeftY} ${arrowRightX},${arrowRightY}`}
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
            cx={markerCenterX}
            cy={markerCenterY}
            r={ieCircleRadius}
            className="diagram-link-ie-circle"
          />
          <line
            x1={markerCenterX}
            y1={markerCenterY}
            x2={ieStemEndX}
            y2={ieStemEndY}
            className="diagram-link-ie-prong"
          />
          <line
            x1={markerCenterX}
            y1={markerCenterY}
            x2={ieCrowFootLeftX}
            y2={ieCrowFootLeftY}
            className="diagram-link-ie-prong"
          />
          <line
            x1={markerCenterX}
            y1={markerCenterY}
            x2={ieCrowFootRightX}
            y2={ieCrowFootRightY}
            className="diagram-link-ie-prong"
          />
        </g>
      );
    }

    return (
      <circle
        cx={markerCenterX}
        cy={markerCenterY}
        r="5.5"
        className={`diagram-link-child-marker ${isSelected ? "selected" : ""}`}
        onClick={handleMarkerSelect}
      />
    );
  }

  return (
    <>
      {normalizedLineStyle === "line" ? (
        <>
          <polyline
            points={pointsToPolyline(lineRoute.points)}
            className="diagram-link-hit-area"
            onPointerDown={(event) => onRelationshipPointerDown(event, relationship.id)}
            onClick={(event) => {
              event.stopPropagation();
              onSelectRelationship(relationship.id);
            }}
          />
          <polyline
            points={pointsToPolyline(visiblePolylinePoints)}
            className={`diagram-link ${lineVariant} ${isSelected ? "selected" : ""}`}
            onPointerDown={(event) => onRelationshipPointerDown(event, relationship.id)}
            onClick={handleMarkerSelect}
          />
        </>
      ) : (
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
        </>
      )}
      {renderNotationMarkers()}
      {lineVariant === "sub-category" ? (
        <circle
          cx={routeMarkerPoint.x}
          cy={routeMarkerPoint.y}
          r="9"
          className={`diagram-link-subcategory-marker ${isSelected ? "selected" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelectRelationship(relationship.id);
          }}
        />
      ) : null}
      {relationship.cardinality ? (
        <text x={routeMidpoint.x} y={routeMidpoint.y - 10} className="diagram-link-label">
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
          <rect x={routeMidpoint.x - 14} y={routeMidpoint.y - 38} rx="8" ry="8" width="28" height="28" />
          <text x={routeMidpoint.x} y={routeMidpoint.y - 24}>
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

function DrawingLine({
  entity,
  source,
  target,
  displayLevel,
  viewMode,
  lineStyle,
  expandedFieldIds,
  isSelected,
  onSelect,
  onPointerDown,
  onEndpointPointerDown
}) {
  const start = resolveDrawingLineAnchor(
    source,
    target,
    entity?.lineSourceAttachment,
    displayLevel,
    viewMode,
    expandedFieldIds
  );
  const end = resolveDrawingLineAnchor(
    target,
    source,
    entity?.lineTargetAttachment,
    displayLevel,
    viewMode,
    expandedFieldIds
  );
  const drawingOffset = getDrawingLineDragOffset(entity);
  const normalizedLineStyle = normalizeLineStyle(lineStyle);
  const rawRoute = buildPolylineRoute(
    start,
    end,
    entity?.lineBendPoints,
    drawingOffset,
    Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
  );
  const rawPoints = rawRoute.points;
  const visiblePoints = [...rawPoints];
  visiblePoints[0] = trimOrthogonalEndpoint(rawPoints[0], rawPoints[1], 7);
  visiblePoints[visiblePoints.length - 1] = trimOrthogonalEndpoint(
    rawPoints[rawPoints.length - 1],
    rawPoints[rawPoints.length - 2],
    7
  );
  const hitAreaPoints = pointsToPolyline(rawPoints);
  const visiblePolylinePoints = pointsToPolyline(visiblePoints);
  const curveStrength = Math.max(
    30,
    Math.min(120, Math.abs(end.x - start.x) * 0.35 + Math.abs(end.y - start.y) * 0.12)
  );
  const curveHorizontalFirst = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const controlOneX =
    (curveHorizontalFirst ? start.x + Math.sign(end.x - start.x || 1) * curveStrength : start.x) +
    drawingOffset.x;
  const controlOneY =
    (curveHorizontalFirst ? start.y : start.y + Math.sign(end.y - start.y || 1) * curveStrength) +
    drawingOffset.y;
  const controlTwoX =
    (curveHorizontalFirst ? end.x - Math.sign(end.x - start.x || 1) * curveStrength : end.x) +
    drawingOffset.x;
  const controlTwoY =
    (curveHorizontalFirst ? end.y : end.y - Math.sign(end.y - start.y || 1) * curveStrength) +
    drawingOffset.y;
  const curvePath = `M ${start.x} ${start.y} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${end.x} ${end.y}`;

  return (
    <>
      {normalizedLineStyle === "line" ? (
        <>
          <polyline
            points={hitAreaPoints}
            className="drawing-line-hit-area"
            onPointerDown={(event) => onPointerDown(event, entity.id)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(entity.id, {
                additive: false,
                toggle: false
              });
            }}
          />
          <polyline
            points={visiblePolylinePoints}
            className={`drawing-line ${isSelected ? "selected" : ""}`}
            onPointerDown={(event) => onPointerDown(event, entity.id)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(entity.id, {
                additive: false,
                toggle: false
              });
            }}
          />
        </>
      ) : (
        <>
          <path
            d={curvePath}
            className="drawing-line-hit-area"
            onPointerDown={(event) => onPointerDown(event, entity.id)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(entity.id, {
                additive: false,
                toggle: false
              });
            }}
          />
          <path
            d={curvePath}
            className={`drawing-line ${isSelected ? "selected" : ""}`}
            onPointerDown={(event) => onPointerDown(event, entity.id)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(entity.id, {
                additive: false,
                toggle: false
              });
            }}
          />
        </>
      )}
    </>
  );
}

function DrawingShapeSvg({ shape }) {
  if (shape === "line") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="8" y1="50" x2="92" y2="50" className="drawing-shape-line" />
      </svg>
    );
  }

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

  if (shape === "octagon") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "pentagon") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="50,4 94,36 78,92 22,92 6,36" className="drawing-shape-fill" />
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

  if (shape === "parallelogram") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="24,6 96,6 76,94 4,94" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "triangle-up") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="50,6 96,94 4,94" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "triangle-down") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="4,6 96,6 50,94" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "triangle-left") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="6,50 94,6 94,94" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "triangle-right") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="6,6 94,50 6,94" className="drawing-shape-fill" />
      </svg>
    );
  }

  if (shape === "cross") {
    return (
      <svg className="drawing-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="38,6 62,6 62,38 94,38 94,62 62,62 62,94 38,94 38,62 6,62 6,38 38,38"
          className="drawing-shape-fill"
        />
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

  if (shape === "octagon") {
    return "drawing-textarea inset-octagon";
  }

  if (shape === "pentagon") {
    return "drawing-textarea inset-pentagon";
  }

  if (shape === "star") {
    return "drawing-textarea inset-star";
  }

  if (shape === "arrow") {
    return "drawing-textarea inset-arrow";
  }

  if (shape === "parallelogram") {
    return "drawing-textarea inset-parallelogram";
  }

  if (
    shape === "triangle-up" ||
    shape === "triangle-down" ||
    shape === "triangle-left" ||
    shape === "triangle-right"
  ) {
    return `drawing-textarea inset-${shape}`;
  }

  if (shape === "cross") {
    return "drawing-textarea inset-cross";
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
      onPointerDown={(event) => onPointerDown(event, entity.id)}
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
  const shape = entity.annotationShape ?? "rectangle";

  return (
    <article
      className={`annotation-card shape-${shape} ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width, height }}
      onPointerDown={(event) => onPointerDown(event, entity.id)}
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
      <DrawingShapeSvg shape={shape} />
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
      {shape !== "line" ? (
        <textarea
          className={getDrawingTextareaClass(shape).replace("drawing-textarea", "annotation-textarea")}
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
      ) : null}
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
  onDelete,
  isInlineAttributeEditing,
  inlineAttributeValue,
  onInlineAttributeDraftChange,
  onInlineAttributeSubmit,
  onInlineAttributeCancel,
  onInlineAttributeHoldStart,
  onInlineAttributeHoldEnd
}) {
  const inlineInputRef = useRef(null);
  const commentMode = isCommentDisplayLevel(displayLevel);
  const commentText = getCommentText(entity, viewMode);
  const visibleFields = getVisibleFields(entity, displayLevel, expandedFieldIds);
  const preferredSize = getPreferredEntitySize(entity, displayLevel, viewMode, expandedFieldIds);
  const { width, height } = getRenderedEntitySize(entity, displayLevel, viewMode, expandedFieldIds);
  const variantClass = getEntityCardVariant(entity);
  const displayName = getEntityDisplayName(entity, viewMode);
  const cardHeight = isInlineAttributeEditing ? height + 56 : height;

  useEffect(() => {
    if (!isInlineAttributeEditing || !inlineInputRef.current) {
      return;
    }

    inlineInputRef.current.focus();
    inlineInputRef.current.select();
  }, [isInlineAttributeEditing]);

  return (
    <article
      className={`entity-card ${variantClass} ${isSelected ? "selected" : ""}`}
      style={{ left: entity.x, top: entity.y, width, height: cardHeight }}
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
        <h3>{displayName}</h3>
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
          {visibleFields.map((field, index) => {
            const previousField = index > 0 ? visibleFields[index - 1] : null;
            const showPrimaryKeySeparator =
              field.kind !== "PK" && previousField?.kind === "PK";

            return (
            <div
              key={field.id}
              className={`entity-field-row ${selectedAttributeId === field.id ? "active" : ""} ${showPrimaryKeySeparator ? "pk-separator" : ""}`}
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
            );
          })}
          {isInlineAttributeEditing ? (
            <div
              className="entity-inline-add-row"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <span className="entity-field-indent" aria-hidden="true" />
              <span className="field-tree-placeholder" aria-hidden="true" />
              <FieldBadge kind="COL" />
              <input
                ref={inlineInputRef}
                className="entity-inline-add-input"
                value={inlineAttributeValue}
                placeholder="New attribute"
                onChange={(event) => onInlineAttributeDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    onInlineAttributeSubmit(entity.id);
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    onInlineAttributeCancel();
                  }
                }}
                onBlur={() => {
                  if (String(inlineAttributeValue ?? "").trim()) {
                    onInlineAttributeSubmit(entity.id);
                    return;
                  }

                  onInlineAttributeCancel();
                }}
              />
              <span className="entity-inline-add-type">varchar(50)</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="entity-fields">
          {isInlineAttributeEditing ? (
            <div
              className="entity-inline-add-row"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <span className="entity-field-indent" aria-hidden="true" />
              <span className="field-tree-placeholder" aria-hidden="true" />
              <FieldBadge kind="COL" />
              <input
                ref={inlineInputRef}
                className="entity-inline-add-input"
                value={inlineAttributeValue}
                placeholder="New attribute"
                onChange={(event) => onInlineAttributeDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    onInlineAttributeSubmit(entity.id);
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    onInlineAttributeCancel();
                  }
                }}
                onBlur={() => {
                  if (String(inlineAttributeValue ?? "").trim()) {
                    onInlineAttributeSubmit(entity.id);
                    return;
                  }

                  onInlineAttributeCancel();
                }}
              />
              <span className="entity-inline-add-type">varchar(50)</span>
            </div>
          ) : null}
        </div>
      )}

      {!commentMode ? (
        <div
          className={`entity-inline-add-zone ${isInlineAttributeEditing ? "editing" : ""}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelect(entity.id, {
              additive: false,
              toggle: false
            });
            onInlineAttributeHoldStart(entity.id);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            onInlineAttributeHoldEnd();
          }}
          onPointerLeave={() => {
            onInlineAttributeHoldEnd();
          }}
          onPointerCancel={() => {
            onInlineAttributeHoldEnd();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {isInlineAttributeEditing ? "Type attribute name and press Enter" : "Hold 2s to add attribute"}
        </div>
      ) : null}

      <button
        type="button"
        className="entity-resize-handle"
        aria-label={`Resize ${displayName}`}
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
  lineStyle,
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
  onMoveRelationshipEndpoint,
  onInsertRelationshipBendPoint,
  onMoveRelationshipBendPoint,
  onRemoveRelationshipBendPoint,
  onMoveDrawingLine,
  onMoveDrawingLineEndpoint,
  onInsertDrawingLineBendPoint,
  onMoveDrawingLineBendPoint,
  onRemoveDrawingLineBendPoint,
  onResizeEntity,
  onChangeAnnotationText,
  onChangeDrawingText,
  onSelectAttribute,
  onDeleteEntity,
  onDeleteRelationship,
  onToggleFieldExpansion,
  onInlineAddAttribute,
  onViewportChange,
  viewResetToken
}) {
  const entityMap = Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  const worldSize = getWorldSize(entities, displayLevel, viewMode, expandedFieldIds);
  const interactionState = useRef(null);
  const canvasRef = useRef(null);
  const suppressBackgroundClickRef = useRef(false);
  const inlineAttributeHoldTimerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [marqueeRect, setMarqueeRect] = useState(null);
  const [inlineAttributeEditor, setInlineAttributeEditor] = useState(null);

  function clearInlineAttributeHoldTimer() {
    if (inlineAttributeHoldTimerRef.current) {
      window.clearTimeout(inlineAttributeHoldTimerRef.current);
      inlineAttributeHoldTimerRef.current = null;
    }
  }

  function handleInlineAttributeHoldStart(entityId) {
    clearInlineAttributeHoldTimer();
    inlineAttributeHoldTimerRef.current = window.setTimeout(() => {
      setInlineAttributeEditor({
        entityId,
        value: ""
      });
      setDraggingId(null);
      interactionState.current = null;
      clearInlineAttributeHoldTimer();
    }, 2000);
  }

  function handleInlineAttributeHoldEnd() {
    clearInlineAttributeHoldTimer();
  }

  function handleInlineAttributeDraftChange(value) {
    setInlineAttributeEditor((current) => (current ? { ...current, value } : current));
  }

  function handleInlineAttributeCancel() {
    clearInlineAttributeHoldTimer();
    setInlineAttributeEditor(null);
  }

  function commitInlineAttributeIfNeeded() {
    const entityId = inlineAttributeEditor?.entityId;
    const value = String(inlineAttributeEditor?.value ?? "").trim();

    if (!entityId) {
      return false;
    }

    clearInlineAttributeHoldTimer();

    if (!value) {
      setInlineAttributeEditor(null);
      return false;
    }

    onInlineAddAttribute(value, entityId);
    setInlineAttributeEditor(null);
    return true;
  }

  function handleInlineAttributeSubmit(entityId) {
    const value = String(inlineAttributeEditor?.value ?? "").trim();
    if (!value) {
      setInlineAttributeEditor(null);
      return;
    }

    onInlineAddAttribute(value, entityId);
    setInlineAttributeEditor(null);
  }

  useEffect(() => {
    const visibleFieldIds = new Set(
      entities.flatMap((entity) => flattenFieldTree(entity.fields ?? [], expandedFieldIds).map((field) => field.id))
    );

    if (selectedAttributeId && !visibleFieldIds.has(selectedAttributeId)) {
      onSelectAttribute(null, selectedEntityIds.at(-1) ?? null);
    }
  }, [entities, expandedFieldIds, onSelectAttribute, selectedAttributeId, selectedEntityIds]);

  useEffect(() => () => clearInlineAttributeHoldTimer(), []);

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
    commitInlineAttributeIfNeeded();

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

  function handleRelationshipEndpointPointerDown(event, relationshipId, endpoint) {
    if (isLinkingRelationship) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const relationship = relationships.find((item) => item.id === relationshipId);
    if (!relationship) {
      return;
    }

    interactionState.current = {
      mode: "relationship-endpoint-drag",
      relationshipId,
      endpoint,
      sourceId: relationship.sourceEntityId,
      targetId: relationship.targetEntityId
    };

    setDraggingId(`relationship-endpoint-${relationshipId}-${endpoint}`);
    onSelectRelationship(relationshipId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleDrawingLinePointerDown(event, entityId) {
    if (isLinkingRelationship) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const entity = entityMap[entityId];
    if (!entity) {
      return;
    }

    const offset = getDrawingLineDragOffset(entity);
    interactionState.current = {
      mode: "drawing-line-drag",
      entityId,
      pointerStart: getCanvasPoint(event),
      initialOffsetX: offset.x,
      initialOffsetY: offset.y
    };

    setDraggingId(`drawing-line-${entityId}`);
    onSelectEntity(entityId, {
      additive: false,
      toggle: false
    });
    onSelectRelationship(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleDrawingLineEndpointPointerDown(event, entityId, endpoint) {
    if (isLinkingRelationship) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const entity = entityMap[entityId];
    if (!entity) {
      return;
    }

    interactionState.current = {
      mode: "drawing-line-endpoint-drag",
      entityId,
      endpoint,
      sourceId: entity.lineSourceId,
      targetId: entity.lineTargetId
    };

    setDraggingId(`drawing-line-endpoint-${entityId}-${endpoint}`);
    onSelectEntity(entityId, {
      additive: false,
      toggle: false
    });
    onSelectRelationship(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleRelationshipPointPointerDown(event, relationshipId, pointIndex) {
    if (isLinkingRelationship) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    interactionState.current = {
      mode: "relationship-point-drag",
      relationshipId,
      pointIndex
    };

    setDraggingId(`relationship-point-${relationshipId}-${pointIndex}`);
    onSelectRelationship(relationshipId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleDrawingLinePointPointerDown(event, entityId, pointIndex) {
    if (isLinkingRelationship) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    interactionState.current = {
      mode: "drawing-line-point-drag",
      entityId,
      pointIndex
    };

    setDraggingId(`drawing-line-point-${entityId}-${pointIndex}`);
    onSelectEntity(entityId, {
      additive: false,
      toggle: false
    });
    onSelectRelationship(null);
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

    if (interactionState.current.mode === "relationship-endpoint-drag") {
      const point = getCanvasPoint(event);
      const { relationshipId, endpoint, sourceId, targetId } = interactionState.current;
      const endpointEntity = endpoint === "source" ? entityMap[sourceId] : entityMap[targetId];

      if (!endpointEntity) {
        return;
      }

      onMoveRelationshipEndpoint(
        relationshipId,
        endpoint,
        getClosestOutlineAttachment(endpointEntity, point, displayLevel, viewMode, expandedFieldIds)
      );
      return;
    }

    if (interactionState.current.mode === "relationship-point-drag") {
      const point = getCanvasPoint(event);
      onMoveRelationshipBendPoint(
        interactionState.current.relationshipId,
        interactionState.current.pointIndex,
        point
      );
      return;
    }

    if (interactionState.current.mode === "drawing-line-drag") {
      const point = getCanvasPoint(event);
      const deltaX = point.x - interactionState.current.pointerStart.x;
      const deltaY = point.y - interactionState.current.pointerStart.y;
      onMoveDrawingLine(
        interactionState.current.entityId,
        interactionState.current.initialOffsetX + deltaX,
        interactionState.current.initialOffsetY + deltaY
      );
      return;
    }

    if (interactionState.current.mode === "drawing-line-endpoint-drag") {
      const point = getCanvasPoint(event);
      const { entityId, endpoint, sourceId, targetId } = interactionState.current;
      const endpointEntity = endpoint === "source" ? entityMap[sourceId] : entityMap[targetId];

      if (!endpointEntity) {
        return;
      }

      onMoveDrawingLineEndpoint(
        entityId,
        endpoint,
        getClosestOutlineAttachment(endpointEntity, point, displayLevel, viewMode, expandedFieldIds)
      );
      return;
    }

    if (interactionState.current.mode === "drawing-line-point-drag") {
      const point = getCanvasPoint(event);
      onMoveDrawingLineBendPoint(
        interactionState.current.entityId,
        interactionState.current.pointIndex,
        point
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
    commitInlineAttributeIfNeeded();

    if (suppressBackgroundClickRef.current) {
      suppressBackgroundClickRef.current = false;
      return;
    }

    const target = event.target;

    if (
      target instanceof Element &&
      (
        target.closest(".entity-card") ||
        target.closest(".drawing-line") ||
        target.closest(".drawing-line-hit-area") ||
        target.closest(".drawing-card") ||
        target.closest(".annotation-card") ||
        target.closest(".diagram-endpoint-handle") ||
        target.closest(".diagram-bend-handle") ||
        target.closest(".diagram-bend-insert-handle") ||
        target.closest(".drawing-line-endpoint") ||
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
    commitInlineAttributeIfNeeded();

    const target = event.target;

    if (
      target instanceof Element &&
      (
        target.closest(".entity-card") ||
        target.closest(".drawing-line") ||
        target.closest(".drawing-line-hit-area") ||
        target.closest(".drawing-card") ||
        target.closest(".annotation-card") ||
        target.closest(".diagram-endpoint-handle") ||
        target.closest(".diagram-bend-handle") ||
        target.closest(".diagram-bend-insert-handle") ||
        target.closest(".drawing-line-endpoint") ||
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
            {entities
              .filter((entity) => entity?.objectType === "drawing" && entity?.drawingShape === "line")
              .map((entity) => {
                const source = entityMap[entity.lineSourceId];
                const target = entityMap[entity.lineTargetId];

                if (!source || !target) {
                  return null;
                }

                return (
                  <DrawingLine
                    key={entity.id}
                    entity={entity}
                    source={source}
                    target={target}
                    displayLevel={displayLevel}
                    viewMode={viewMode}
                  lineStyle={lineStyle}
                  expandedFieldIds={expandedFieldIds}
                  isSelected={selectedEntityIds.includes(entity.id)}
                  onSelect={onSelectEntity}
                  onPointerDown={handleDrawingLinePointerDown}
                  onEndpointPointerDown={handleDrawingLineEndpointPointerDown}
                />
              );
            })}

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
                  lineStyle={lineStyle}
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
                  onRelationshipEndpointPointerDown={handleRelationshipEndpointPointerDown}
                  onSelectRelationship={onSelectRelationship}
                  onDeleteRelationship={onDeleteRelationship}
                />
              );
            })}
          </svg>

          {entities.map((entity) =>
            entity?.objectType === "drawing" && entity?.drawingShape === "line" ? null : entity?.objectType === "drawing" ? (
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
                isInlineAttributeEditing={inlineAttributeEditor?.entityId === entity.id}
                inlineAttributeValue={
                  inlineAttributeEditor?.entityId === entity.id ? inlineAttributeEditor.value : ""
                }
                onInlineAttributeDraftChange={handleInlineAttributeDraftChange}
                onInlineAttributeSubmit={handleInlineAttributeSubmit}
                onInlineAttributeCancel={handleInlineAttributeCancel}
                onInlineAttributeHoldStart={handleInlineAttributeHoldStart}
                onInlineAttributeHoldEnd={handleInlineAttributeHoldEnd}
              />
            )
          )}

          {relationships.map((relationship) => {
            if (relationship.id !== selectedRelationshipId) {
              return null;
            }

            const source = entityMap[relationship.sourceEntityId];
            const target = entityMap[relationship.targetEntityId];

            if (!source || !target) {
              return null;
            }

            const start = resolveRelationshipAnchor(
              source,
              target,
              relationship?.props?.sourceAttachment,
              displayLevel,
              viewMode,
              expandedFieldIds
            );
            const end = resolveRelationshipAnchor(
              target,
              source,
              relationship?.props?.targetAttachment,
              displayLevel,
              viewMode,
              expandedFieldIds
            );
            const route = buildPolylineRoute(
              start,
              end,
              relationship?.props?.bendPoints,
              getRelationshipDragOffset(relationship),
              Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
            );
            const segmentMidpoints = getSegmentMidpoints(route.points);

            return (
              <div key={`relationship-endpoints-${relationship.id}`}>
                <button
                  type="button"
                  className="diagram-endpoint-handle overlay"
                  style={{ left: start.x - 6, top: start.y - 6 }}
                  onPointerDown={(event) => handleRelationshipEndpointPointerDown(event, relationship.id, "source")}
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Move relationship source endpoint"
                />
                <button
                  type="button"
                  className="diagram-endpoint-handle overlay"
                  style={{ left: end.x - 6, top: end.y - 6 }}
                  onPointerDown={(event) => handleRelationshipEndpointPointerDown(event, relationship.id, "target")}
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Move relationship target endpoint"
                />
                {normalizeLineStyle(lineStyle) === "line" ? (
                  <>
                    {route.bendPoints.map((point, pointIndex) => (
                      <button
                        key={`relationship-bend-${relationship.id}-${pointIndex}`}
                        type="button"
                        className="diagram-bend-handle overlay"
                        style={{ left: point.x - 7, top: point.y - 7 }}
                        onPointerDown={(event) =>
                          handleRelationshipPointPointerDown(event, relationship.id, pointIndex)
                        }
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          onRemoveRelationshipBendPoint(relationship.id, pointIndex);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Move relationship bend point"
                      />
                    ))}
                    {segmentMidpoints.map((point) => (
                      <button
                        key={`relationship-bend-insert-${relationship.id}-${point.index}`}
                        type="button"
                        className="diagram-bend-insert-handle overlay"
                        style={{ left: point.x - 6, top: point.y - 6 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onInsertRelationshipBendPoint(relationship.id, point.index, point);
                        }}
                        aria-label="Add relationship bend point"
                      >
                        +
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
            );
          })}

          {entities
            .filter(
              (entity) =>
                entity?.objectType === "drawing" &&
                entity?.drawingShape === "line" &&
                selectedEntityIds.includes(entity.id)
            )
            .map((entity) => {
              const source = entityMap[entity.lineSourceId];
              const target = entityMap[entity.lineTargetId];

              if (!source || !target) {
                return null;
              }

              const start = resolveDrawingLineAnchor(
                source,
                target,
                entity?.lineSourceAttachment,
                displayLevel,
                viewMode,
                expandedFieldIds
              );
              const end = resolveDrawingLineAnchor(
                target,
                source,
                entity?.lineTargetAttachment,
                displayLevel,
                viewMode,
                expandedFieldIds
              );
              const route = buildPolylineRoute(
                start,
                end,
                entity?.lineBendPoints,
                getDrawingLineDragOffset(entity),
                Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
              );
              const segmentMidpoints = getSegmentMidpoints(route.points);

              return (
                <div key={`drawing-line-endpoints-${entity.id}`}>
                  <button
                    type="button"
                    className="drawing-line-endpoint selected overlay"
                    style={{ left: start.x - 5, top: start.y - 5 }}
                    onPointerDown={(event) => handleDrawingLineEndpointPointerDown(event, entity.id, "source")}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Move drawing connector source endpoint"
                  />
                  <button
                    type="button"
                    className="drawing-line-endpoint selected overlay"
                    style={{ left: end.x - 5, top: end.y - 5 }}
                    onPointerDown={(event) => handleDrawingLineEndpointPointerDown(event, entity.id, "target")}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Move drawing connector target endpoint"
                  />
                  {normalizeLineStyle(lineStyle) === "line" ? (
                    <>
                      {route.bendPoints.map((point, pointIndex) => (
                        <button
                          key={`drawing-bend-${entity.id}-${pointIndex}`}
                          type="button"
                          className="diagram-bend-handle overlay"
                          style={{ left: point.x - 7, top: point.y - 7 }}
                          onPointerDown={(event) =>
                            handleDrawingLinePointPointerDown(event, entity.id, pointIndex)
                          }
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            onRemoveDrawingLineBendPoint(entity.id, pointIndex);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          aria-label="Move drawing connector bend point"
                        />
                      ))}
                      {segmentMidpoints.map((point) => (
                        <button
                          key={`drawing-bend-insert-${entity.id}-${point.index}`}
                          type="button"
                          className="diagram-bend-insert-handle overlay"
                          style={{ left: point.x - 6, top: point.y - 6 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onInsertDrawingLineBendPoint(entity.id, point.index, point);
                          }}
                          aria-label="Add drawing connector bend point"
                        >
                          +
                        </button>
                      ))}
                    </>
                  ) : null}
                </div>
              );
            })}

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
