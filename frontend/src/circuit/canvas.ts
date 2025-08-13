export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: 'component' | 'wire';
  selected: boolean;
}

export class CanvasManager {
  private canvas: HTMLElement;
  private elements: Map<string, CanvasElement> = new Map();
  private scale: number = 1;
  private panOffset: Point = { x: 0, y: 0 };

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
  }

  setScale(scale: number) {
    this.scale = Math.max(0.25, Math.min(2, scale));
    this.updateTransform();
  }

  setPanOffset(offset: Point) {
    this.panOffset = offset;
    this.updateTransform();
  }

  private updateTransform() {
    const transform = `scale(${this.scale}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
    this.canvas.style.transform = transform;
  }

  screenToCanvas(screenPoint: Point): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenPoint.x - rect.left - this.panOffset.x) / this.scale,
      y: (screenPoint.y - rect.top - this.panOffset.y) / this.scale
    };
  }

  canvasToScreen(canvasPoint: Point): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: canvasPoint.x * this.scale + rect.left + this.panOffset.x,
      y: canvasPoint.y * this.scale + rect.top + this.panOffset.y
    };
  }

  addElement(element: CanvasElement) {
    this.elements.set(element.id, element);
  }

  removeElement(id: string) {
    this.elements.delete(id);
  }

  getElement(id: string): CanvasElement | undefined {
    return this.elements.get(id);
  }

  selectElement(id: string) {
    this.elements.forEach(element => {
      element.selected = element.id === id;
    });
  }

  clearSelection() {
    this.elements.forEach(element => {
      element.selected = false;
    });
  }

  getSelectedElement(): CanvasElement | undefined {
    return Array.from(this.elements.values()).find(element => element.selected);
  }
}

export function snapToGrid(point: Point, gridSize: number = 20): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
