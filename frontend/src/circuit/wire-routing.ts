import type { Point } from './canvas';

export interface WireSegment {
  start: Point;
  end: Point;
  direction: 'horizontal' | 'vertical';
}

export class WireRouter {
  private gridSize: number = 20;

  constructor(gridSize: number = 20) {
    this.gridSize = gridSize;
  }

  // Add a 90-degree bend point based on the current direction
  addBendPoint(lastPoint: Point, targetPoint: Point): Point {
    const dx = targetPoint.x - lastPoint.x;
    const dy = targetPoint.y - lastPoint.y;

    // Determine the primary direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal movement first, then vertical
      return {
        x: targetPoint.x,
        y: lastPoint.y
      };
    } else {
      // Vertical movement first, then horizontal
      return {
        x: lastPoint.x,
        y: targetPoint.y
      };
    }
  }

  // Generate optimized wire path with right-angle routing
  generatePath(start: Point, end: Point, existingBends: Point[] = []): Point[] {
    const path = [start];

    if (existingBends.length > 0) {
      // Use existing bend points
      path.push(...existingBends);
    } else {
      // Auto-generate bend points for right-angle routing
      const midPoint = this.calculateOptimalBendPoint(start, end);
      if (midPoint) {
        path.push(midPoint);
      }
    }

    path.push(end);
    return path;
  }

  private calculateOptimalBendPoint(start: Point, end: Point): Point | null {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // If points are already aligned, no bend needed
    if (dx === 0 || dy === 0) {
      return null;
    }

    // Choose bend strategy based on distance and layout
    const preferHorizontalFirst = Math.abs(dx) > Math.abs(dy);

    if (preferHorizontalFirst) {
      return { x: end.x, y: start.y };
    } else {
      return { x: start.x, y: end.y };
    }
  }

  // Convert path points to SVG path string
  pathToSvg(points: Point[]): string {
    if (points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    return path;
  }

  // Snap points to grid for cleaner routing
  snapToGrid(point: Point): Point {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize
    };
  }

  // Calculate wire segments for collision detection
  getSegments(points: Point[]): WireSegment[] {
    const segments: WireSegment[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      const direction = start.x === end.x ? 'vertical' : 'horizontal';
      
      segments.push({
        start,
        end,
        direction
      });
    }

    return segments;
  }

  // Check if two wire segments intersect
  segmentsIntersect(seg1: WireSegment, seg2: WireSegment): boolean {
    // Only perpendicular segments can intersect
    if (seg1.direction === seg2.direction) return false;

    const horizontal = seg1.direction === 'horizontal' ? seg1 : seg2;
    const vertical = seg1.direction === 'vertical' ? seg1 : seg2;

    // Check if intersection point is within both segments
    const intersectionX = vertical.start.x;
    const intersectionY = horizontal.start.y;

    const horizontalMinX = Math.min(horizontal.start.x, horizontal.end.x);
    const horizontalMaxX = Math.max(horizontal.start.x, horizontal.end.x);
    const verticalMinY = Math.min(vertical.start.y, vertical.end.y);
    const verticalMaxY = Math.max(vertical.start.y, vertical.end.y);

    return (
      intersectionX >= horizontalMinX &&
      intersectionX <= horizontalMaxX &&
      intersectionY >= verticalMinY &&
      intersectionY <= verticalMaxY
    );
  }

  // Optimize wire path to avoid overlaps and minimize length
  optimizePath(points: Point[]): Point[] {
    if (points.length <= 2) return points;

    const optimized = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = optimized[optimized.length - 1];
      const current = points[i];
      const next = points[i + 1];

      // Skip redundant points that don't change direction
      const prevDirection = this.getDirection(prev, current);
      const nextDirection = this.getDirection(current, next);

      if (prevDirection !== nextDirection) {
        optimized.push(current);
      }
    }

    optimized.push(points[points.length - 1]);
    return optimized;
  }

  private getDirection(p1: Point, p2: Point): 'horizontal' | 'vertical' | 'diagonal' {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);

    if (dx === 0) return 'vertical';
    if (dy === 0) return 'horizontal';
    return 'diagonal';
  }
}
