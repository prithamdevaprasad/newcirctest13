export class WireRouter {
  private gridSize: number;

  constructor(gridSize = 10) {
    this.gridSize = gridSize;
  }

  // Generate a path with right-angle routing
  routePath(start: { x: number; y: number }, end: { x: number; y: number }, bendPoints: Array<{ x: number; y: number }> = []) {
    // If there are user-defined bend points, use those
    if (bendPoints.length > 0) {
      return [start, ...bendPoints, end];
    }

    // Snap points to grid for cleaner routing
    const snappedStart = this.snapToGrid(start);
    const snappedEnd = this.snapToGrid(end);

    // Simple right-angle routing with improved algorithm
    const path = [];
    path.push(start); // Always start from exact pin position

    // Determine if we should go horizontal or vertical first based on the longer distance
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    if (dx > dy) {
      // Go horizontal first, then vertical
      const midX = start.x + (end.x - start.x) / 2;
      path.push({ x: midX, y: start.y });
      path.push({ x: midX, y: end.y });
    } else {
      // Go vertical first, then horizontal
      const midY = start.y + (end.y - start.y) / 2;
      path.push({ x: start.x, y: midY });
      path.push({ x: end.x, y: midY });
    }

    path.push(end); // Always end at exact pin position
    return path;
  }

  // Add a bend point that maintains right angles
  addBendPoint(prev: { x: number; y: number }, current: { x: number; y: number }) {
    // Determine if we should create a horizontal or vertical bend
    const dx = Math.abs(current.x - prev.x);
    const dy = Math.abs(current.y - prev.y);

    if (dx > dy) {
      // Create a horizontal bend
      return { x: current.x, y: prev.y };
    } else {
      // Create a vertical bend
      return { x: prev.x, y: current.y };
    }
  }

  // Convert a path to an SVG path string
  pathToSvgString(path: Array<{ x: number; y: number }>) {
    if (path.length < 2) return "";
    
    let svgPath = `M ${path[0].x} ${path[0].y}`;
    for (let i = 1; i < path.length; i++) {
      svgPath += ` L ${path[i].x} ${path[i].y}`;
    }
    return svgPath;
  }

  // Snap a point to the nearest grid intersection
  private snapToGrid(point: { x: number; y: number }) {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize
    };
  }
}