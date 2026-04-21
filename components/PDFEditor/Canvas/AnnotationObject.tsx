'use client';

import { Annotation, TextAnnotation, HighlightAnnotation, RectangleAnnotation, CircleAnnotation, LineAnnotation, WatermarkAnnotation } from '@/lib/annotationTypes';
import { pdfRectToScreen, pdfToScreen } from '@/lib/coordinateUtils';
import { PageViewport } from './PageCanvas';
import ResizeHandle from './ResizeHandle';
import styles from './AnnotationObject.module.css';

interface AnnotationObjectProps {
  annotation: Annotation;
  viewport: PageViewport;
  isSelected: boolean;
  isEditing: boolean;
}

export default function AnnotationObject({
  annotation,
  viewport,
  isSelected,
  isEditing,
}: AnnotationObjectProps) {
  const screenRect = (() => {
    if (annotation.type === 'line') {
      const lineAnn = annotation as LineAnnotation;
      const p1 = pdfToScreen(lineAnn.x, lineAnn.y, viewport);
      const p2 = pdfToScreen(lineAnn.x2, lineAnn.y2, viewport);
      return {
        x: Math.min(p1.x, p2.x),
        y: Math.min(p1.y, p2.y),
        width: Math.abs(p2.x - p1.x),
        height: Math.abs(p2.y - p1.y),
      };
    }
    return pdfRectToScreen(annotation.x, annotation.y, annotation.width, annotation.height, viewport);
  })();

  const render = () => {
    switch (annotation.type) {
      case 'text': {
        const textAnn = annotation as TextAnnotation;
        const fontSizeScreen = textAnn.fontSize * viewport.scale;

        return (
          <g data-annotation-id={annotation.id}>
            {/* Hide text content while editing — textarea overlay handles input */}
            {!isEditing && (
              <foreignObject
                x={screenRect.x}
                y={screenRect.y}
                width={screenRect.width}
                height={screenRect.height}
                style={{ overflow: 'visible' }}
              >
                {/* @ts-ignore */}
                <div
                  className={styles.textContent}
                  style={{
                    fontSize: `${fontSizeScreen}px`,
                    fontFamily: textAnn.fontFamily.replace('-', ' '),
                    color: textAnn.fontColor,
                    fontWeight: textAnn.bold ? 'bold' : 'normal',
                    fontStyle: textAnn.italic ? 'italic' : 'normal',
                    opacity: textAnn.opacity,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {textAnn.content}
                </div>
              </foreignObject>
            )}
            {/* Transparent hit-area so SVG mouse events register on text annotations */}
            <rect
              data-annotation-id={annotation.id}
              x={screenRect.x}
              y={screenRect.y}
              width={screenRect.width}
              height={screenRect.height}
              fill="transparent"
              pointerEvents={isEditing ? 'none' : 'all'}
              cursor="move"
            />
          </g>
        );
      }

      case 'highlight': {
        const highlightAnn = annotation as HighlightAnnotation;
        return (
          <rect
            data-annotation-id={annotation.id}
            x={screenRect.x}
            y={screenRect.y}
            width={screenRect.width}
            height={screenRect.height}
            fill={highlightAnn.color}
            opacity={highlightAnn.opacity}
            pointerEvents="all"
            cursor="move"
          />
        );
      }

      case 'rectangle': {
        const rectAnn = annotation as RectangleAnnotation;
        return (
          <rect
            data-annotation-id={annotation.id}
            x={screenRect.x}
            y={screenRect.y}
            width={screenRect.width}
            height={screenRect.height}
            fill={rectAnn.fillColor || 'none'}
            stroke={rectAnn.strokeColor}
            strokeWidth={rectAnn.strokeWidth}
            opacity={rectAnn.opacity}
            pointerEvents="all"
            cursor="move"
          />
        );
      }

      case 'circle': {
        const circleAnn = annotation as CircleAnnotation;
        const cx = screenRect.x + screenRect.width / 2;
        const cy = screenRect.y + screenRect.height / 2;
        const rx = screenRect.width / 2;
        const ry = screenRect.height / 2;

        return (
          <ellipse
            data-annotation-id={annotation.id}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={circleAnn.fillColor || 'none'}
            stroke={circleAnn.strokeColor}
            strokeWidth={circleAnn.strokeWidth}
            opacity={circleAnn.opacity}
            pointerEvents="all"
            cursor="move"
          />
        );
      }

      case 'line': {
        const lineAnn = annotation as LineAnnotation;
        const [x1, y1] = viewport.convertToViewportPoint(lineAnn.x, lineAnn.y);
        const [x2, y2] = viewport.convertToViewportPoint(lineAnn.x2, lineAnn.y2);

        return (
          <line
            data-annotation-id={annotation.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={lineAnn.strokeColor}
            strokeWidth={lineAnn.strokeWidth}
            opacity={lineAnn.opacity}
            pointerEvents="all"
            cursor="move"
          />
        );
      }

      case 'watermark': {
        const watermarkAnn = annotation as WatermarkAnnotation;
        const centerX = screenRect.x + screenRect.width / 2;
        const centerY = screenRect.y + screenRect.height / 2;
        const fontSizeScreen = watermarkAnn.fontSize * viewport.scale;

        return (
          <g data-annotation-id={annotation.id}>
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSizeScreen}
              fill={watermarkAnn.color}
              opacity={watermarkAnn.opacity}
              transform={`rotate(${watermarkAnn.angle} ${centerX} ${centerY})`}
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              pointerEvents="all"
              cursor="move"
            >
              {watermarkAnn.text}
            </text>
          </g>
        );
      }

      default:
        return null;
    }
  };

  return (
    <g>
      {render()}

      {/* Selection border */}
      {isSelected && (
        <>
          <rect
            x={screenRect.x - 4}
            y={screenRect.y - 4}
            width={screenRect.width + 8}
            height={screenRect.height + 8}
            fill="none"
            stroke="#667eea"
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />

          {/* Resize handles - only for non-line annotations */}
          {annotation.type !== 'line' && (
            <>
              <ResizeHandle x={screenRect.x} y={screenRect.y} handle="nw" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x + screenRect.width / 2} y={screenRect.y} handle="n" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x + screenRect.width} y={screenRect.y} handle="ne" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x + screenRect.width} y={screenRect.y + screenRect.height / 2} handle="e" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x + screenRect.width} y={screenRect.y + screenRect.height} handle="se" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x + screenRect.width / 2} y={screenRect.y + screenRect.height} handle="s" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x} y={screenRect.y + screenRect.height} handle="sw" annotationId={annotation.id} />
              <ResizeHandle x={screenRect.x} y={screenRect.y + screenRect.height / 2} handle="w" annotationId={annotation.id} />
            </>
          )}
        </>
      )}
    </g>
  );
}
