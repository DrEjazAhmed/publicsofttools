'use client';

interface ResizeHandleProps {
  x: number;
  y: number;
  handle: string; // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
}

export default function ResizeHandle({ x, y, handle }: ResizeHandleProps) {
  const SIZE = 8;
  const HALF_SIZE = SIZE / 2;

  const getCursor = (h: string) => {
    const cursorMap: Record<string, string> = {
      nw: 'nw-resize',
      n: 'n-resize',
      ne: 'ne-resize',
      e: 'e-resize',
      se: 'se-resize',
      s: 's-resize',
      sw: 'sw-resize',
      w: 'w-resize',
    };
    return cursorMap[h] || 'default';
  };

  return (
    <rect
      data-annotation-id=""
      data-handle={handle}
      x={x - HALF_SIZE}
      y={y - HALF_SIZE}
      width={SIZE}
      height={SIZE}
      fill="white"
      stroke="#667eea"
      strokeWidth={2}
      cursor={getCursor(handle)}
      pointerEvents="all"
    />
  );
}
