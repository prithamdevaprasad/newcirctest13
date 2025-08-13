import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Trash2, RotateCw, Download, Square } from "lucide-react";
import type { Component, CanvasState } from "@shared/schema";
import { WireRouter } from "@/lib/wire-routing";

interface CanvasAreaProps {
  canvasState: CanvasState;
  onStateChange: (state: CanvasState) => void;
  onSelectElement: (element: any) => void;
  selectedElement: any;
}

interface PlacedComponentInstance {
  id: string;
  componentId: number;
  x: number;
  y: number;
  rotation: number;
  properties?: Record<string, any>;
}

export function CanvasArea({ canvasState, onStateChange, onSelectElement, selectedElement }: CanvasAreaProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);
  const [isDrawingWire, setIsDrawingWire] = useState(false);
  const [wireStart, setWireStart] = useState<{ componentId: string; pinId: string; x: number; y: number } | null>(null);
  const [currentWirePath, setCurrentWirePath] = useState<Array<{ x: number; y: number }>>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [wireColor, setWireColor] = useState("#ff0000");
  const [isSelectingFrame, setIsSelectingFrame] = useState(false);
  const [frameStart, setFrameStart] = useState<{ x: number; y: number } | null>(null);
  const [frameEnd, setFrameEnd] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wireRouter = useRef(new WireRouter());

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const componentData = JSON.parse(e.dataTransfer.getData("application/json"));
      const rect = canvasRef.current?.getBoundingClientRect();
      
      if (rect) {
        const x = (e.clientX - rect.left) / (zoomLevel / 100);
        const y = (e.clientY - rect.top) / (zoomLevel / 100);
        
        const newComponent = {
          id: `component-${Date.now()}`,
          componentId: componentData.id,
          x: Math.round(x),
          y: Math.round(y),
          rotation: 0,
          properties: {}
        };
        
        const newState = {
          ...canvasState,
          components: [...canvasState.components, newComponent]
        };
        
        onStateChange(newState);
      }
    } catch (error) {
      console.error("Error dropping component:", error);
    }
  }, [canvasState, onStateChange, zoomLevel]);

  const handleComponentMove = useCallback((componentId: string, deltaX: number, deltaY: number) => {
    const newState = {
      ...canvasState,
      components: canvasState.components.map(comp => 
        comp.id === componentId 
          ? { ...comp, x: comp.x + deltaX, y: comp.y + deltaY }
          : comp
      ),
      // Update wire positions when component moves
      wires: canvasState.wires.map(wire => {
        const needsUpdate = wire.startComponent === componentId || wire.endComponent === componentId;
        if (needsUpdate) {
          return {
            ...wire,
            path: wire.path.map((point, index) => {
              // Update start or end points when component moves
              if ((index === 0 && wire.startComponent === componentId) ||
                  (index === wire.path.length - 1 && wire.endComponent === componentId)) {
                return { x: point.x + deltaX, y: point.y + deltaY };
              }
              return point;
            })
          };
        }
        return wire;
      })
    };
    onStateChange(newState);
  }, [canvasState, onStateChange]);

  const handleDeleteComponent = useCallback(() => {
    if (selectedElement && selectedElement.componentId) {
      const newState = {
        ...canvasState,
        components: canvasState.components.filter(comp => comp.id !== selectedElement.id),
        wires: canvasState.wires.filter(wire => 
          wire.startComponent !== selectedElement.id && wire.endComponent !== selectedElement.id
        )
      };
      onStateChange(newState);
      onSelectElement(null);
    }
  }, [selectedElement, canvasState, onStateChange, onSelectElement]);

  const handleRotateComponent = useCallback(() => {
    if (selectedElement && selectedElement.componentId) {
      const newState = {
        ...canvasState,
        components: canvasState.components.map(comp => 
          comp.id === selectedElement.id 
            ? { ...comp, rotation: (comp.rotation + 90) % 360 }
            : comp
        )
      };
      onStateChange(newState);
    }
  }, [selectedElement, canvasState, onStateChange]);

  const handleChangeWireColor = useCallback((color: string) => {
    if (selectedElement && selectedElement.path) {
      // This is a wire
      const newState = {
        ...canvasState,
        wires: canvasState.wires.map(wire => 
          wire.id === selectedElement.id 
            ? { ...wire, color }
            : wire
        )
      };
      onStateChange(newState);
    }
  }, [selectedElement, canvasState, onStateChange]);

  const handleFrameSelection = useCallback((e: React.MouseEvent) => {
    if (!isSelectingFrame) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / (zoomLevel / 100);
      const y = (e.clientY - rect.top) / (zoomLevel / 100);
      
      if (!frameStart) {
        setFrameStart({ x, y });
      } else {
        setFrameEnd({ x, y });
      }
    }
  }, [isSelectingFrame, frameStart, zoomLevel]);

  const handleExportFrame = useCallback(async () => {
    if (!frameStart || !frameEnd) return;
    
    // Create a temporary canvas for export
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const frameWidth = Math.abs(frameEnd.x - frameStart.x);
    const frameHeight = Math.abs(frameEnd.y - frameStart.y);
    const frameLeft = Math.min(frameStart.x, frameEnd.x);
    const frameTop = Math.min(frameStart.y, frameEnd.y);
    
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, frameWidth, frameHeight);
    
    // Draw components within frame
    for (const component of canvasState.components) {
      if (component.x >= frameLeft && component.x <= frameLeft + frameWidth &&
          component.y >= frameTop && component.y <= frameTop + frameHeight) {
        
        // Load and draw component image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = `/api/components/${component.componentId}/svg/breadboard`;
        });
        
        ctx.save();
        ctx.translate(component.x - frameLeft + 32, component.y - frameTop + 32);
        ctx.rotate((component.rotation * Math.PI) / 180);
        ctx.drawImage(img, -32, -32, 64, 64);
        ctx.restore();
      }
    }
    
    // Draw wires within frame
    ctx.lineWidth = 2;
    for (const wire of canvasState.wires) {
      ctx.beginPath();
      ctx.strokeStyle = wire.color;
      
      let isFirst = true;
      for (const point of wire.path) {
        if (point.x >= frameLeft && point.x <= frameLeft + frameWidth &&
            point.y >= frameTop && point.y <= frameTop + frameHeight) {
          if (isFirst) {
            ctx.moveTo(point.x - frameLeft, point.y - frameTop);
            isFirst = false;
          } else {
            ctx.lineTo(point.x - frameLeft, point.y - frameTop);
          }
        }
      }
      ctx.stroke();
    }
    
    // Download the image
    const link = document.createElement('a');
    link.download = 'circuit-export.png';
    link.href = canvas.toDataURL();
    link.click();
    
    // Reset frame selection
    setIsSelectingFrame(false);
    setFrameStart(null);
    setFrameEnd(null);
  }, [frameStart, frameEnd, canvasState]);

  const handlePinClick = useCallback((componentId: string, pinId: string, x: number, y: number) => {
    // Ensure coordinates are properly scaled according to zoom level
    const adjustedX = x;
    const adjustedY = y;
    
    if (!isDrawingWire) {
      // Start new wire
      setIsDrawingWire(true);
      setWireStart({ componentId, pinId, x: adjustedX, y: adjustedY });
      setCurrentWirePath([{ x: adjustedX, y: adjustedY }]);
    } else if (wireStart) {
      // Complete wire connection
      const newWire = {
        id: `wire-${Date.now()}`,
        startComponent: wireStart.componentId,
        startPin: wireStart.pinId,
        endComponent: componentId,
        endPin: pinId,
        path: [...currentWirePath, { x: adjustedX, y: adjustedY }],
        color: wireColor
      };
      
      // Use wire router to create a proper path with right angles
      const routedPath = wireRouter.current.routePath(
        currentWirePath[0], 
        { x: adjustedX, y: adjustedY },
        currentWirePath.slice(1, -1)
      );
      
      const finalWire = {
        ...newWire,
        path: routedPath || newWire.path
      };
      
      const newState = {
        ...canvasState,
        wires: [...canvasState.wires, finalWire]
      };
      
      onStateChange(newState);
      
      // Reset wire drawing state
      setIsDrawingWire(false);
      setWireStart(null);
      setCurrentWirePath([]);
    }
  }, [isDrawingWire, wireStart, currentWirePath, canvasState, onStateChange, wireColor]);

  const handleCanvasRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isDrawingWire && wireStart) {
      // Cancel wire drawing on right-click
      setIsDrawingWire(false);
      setWireStart(null);
      setCurrentWirePath([]);
    }
  }, [isDrawingWire, wireStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / (zoomLevel / 100);
      const y = (e.clientY - rect.top) / (zoomLevel / 100);
      setMousePosition({ x, y });
    }
  }, [zoomLevel]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only handle canvas clicks when drawing wire for bend points
    if (isDrawingWire && wireStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / (zoomLevel / 100);
        const y = (e.clientY - rect.top) / (zoomLevel / 100);
        
        // Add bend point at 90 degrees from last point
        const lastPoint = currentWirePath[currentWirePath.length - 1];
        const bendPoint = wireRouter.current.addBendPoint(lastPoint, { x, y });
        
        setCurrentWirePath(prev => [...prev, bendPoint]);
      }
    }
  }, [isDrawingWire, wireStart, currentWirePath, zoomLevel]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Escape') {
        if (isDrawingWire) {
          setIsDrawingWire(false);
          setWireStart(null);
          setCurrentWirePath([]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingWire]);

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 25));
  
  const clearCanvas = () => {
    onStateChange({ components: [], wires: [] });
    setIsDrawingWire(false);
    setWireStart(null);
    setCurrentWirePath([]);
  };

  const generateWirePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return "";
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const generateActiveWirePath = () => {
    if (!isDrawingWire || currentWirePath.length === 0) return "";
    
    const points = [...currentWirePath, mousePosition];
    return generateWirePath(points);
  };

  return (
    <div className="flex-1 flex flex-col bg-white relative">
      {/* Canvas Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Breadboard View</span>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-600 min-w-[40px] text-center">
              {zoomLevel}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Wire Color Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Wire Color:</span>
            <Input
              type="color"
              value={wireColor}
              onChange={(e) => setWireColor(e.target.value)}
              className="w-8 h-6 p-0 border rounded"
            />
          </div>
          
          {/* Component Controls */}
          {selectedElement && selectedElement.componentId && (
            <>
              <Button variant="outline" size="sm" onClick={handleRotateComponent} title="Rotate Component">
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteComponent} title="Delete Component">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {/* Wire Controls */}
          {selectedElement && selectedElement.path && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">Change Color:</span>
              <Input
                type="color"
                defaultValue={selectedElement.color}
                onChange={(e) => handleChangeWireColor(e.target.value)}
                className="w-8 h-6 p-0 border rounded"
              />
            </div>
          )}
          
          {/* Frame Selection Controls */}
          <Button
            variant={isSelectingFrame ? "default" : "outline"}
            size="sm"
            onClick={() => setIsSelectingFrame(!isSelectingFrame)}
            title="Select Frame for Export"
          >
            <Square className="w-4 h-4" />
          </Button>
          
          {frameStart && frameEnd && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFrame}
              title="Export Selected Area as PNG"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={clearCanvas}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-auto bg-gray-50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContextMenu={handleCanvasRightClick}
        onMouseMove={handleMouseMove}
        onClick={isSelectingFrame ? handleFrameSelection : handleCanvasClick}
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: `${20 * (zoomLevel / 100)}px ${20 * (zoomLevel / 100)}px`
        }}
      >
        <div 
          className="relative w-full h-full min-h-screen"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: '0 0' }}
        >
          {/* Placed Components */}
          {canvasState.components.map((placedComponent) => (
            <ComponentInstance
              key={placedComponent.id}
              placedComponent={placedComponent}
              onMove={handleComponentMove}
              onPinClick={handlePinClick}
              onSelect={() => onSelectElement(placedComponent)}
              isSelected={selectedElement?.id === placedComponent.id}
              canvasRef={canvasRef}
              zoomLevel={zoomLevel}
            />
          ))}

          {/* SVG Layer for Wires */}
          <svg 
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          >
            {/* Existing Wires */}
            {canvasState.wires.map((wire) => (
              <g key={wire.id}>
                <path
                  d={generateWirePath(wire.path)}
                  stroke={wire.color}
                  strokeWidth="2"
                  fill="none"
                  className="wire-path cursor-pointer"
                  style={{ pointerEvents: 'stroke' }}
                  onClick={() => onSelectElement(wire)}
                />
                {/* Wire endpoints */}
                <circle
                  cx={wire.path[0]?.x}
                  cy={wire.path[0]?.y}
                  r="3"
                  fill={wire.color}
                />
                <circle
                  cx={wire.path[wire.path.length - 1]?.x}
                  cy={wire.path[wire.path.length - 1]?.y}
                  r="3"
                  fill={wire.color}
                />
                {/* Bend points */}
                {wire.path.slice(1, -1).map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="2"
                    fill={wire.color}
                  />
                ))}
              </g>
            ))}

            {/* Active Wire Being Drawn */}
            {isDrawingWire && (
              <path
                d={generateActiveWirePath()}
                stroke="gray"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
            )}
            
            {/* Frame Selection Rectangle */}
            {isSelectingFrame && frameStart && frameEnd && (
              <rect
                x={Math.min(frameStart.x, frameEnd.x)}
                y={Math.min(frameStart.y, frameEnd.y)}
                width={Math.abs(frameEnd.x - frameStart.x)}
                height={Math.abs(frameEnd.y - frameStart.y)}
                stroke="blue"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="rgba(0,0,255,0.1)"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

interface ComponentInstanceProps {
  placedComponent: any;
  onMove: (id: string, deltaX: number, deltaY: number) => void;
  onPinClick: (componentId: string, pinId: string, x: number, y: number) => void;
  onSelect: () => void;
  isSelected: boolean;
  canvasRef: React.RefObject<HTMLDivElement>;
  zoomLevel: number;
}

function ComponentInstance({ placedComponent, onMove, onPinClick, onSelect, isSelected, canvasRef, zoomLevel }: ComponentInstanceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [componentData, setComponentData] = useState<Component | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 72, height: 93.6 });
  const imgRef = useRef<HTMLImageElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  // Fetch component data
  const { data: components = [] } = useQuery<Component[]>({
    queryKey: ["/api/components"],
  });

  useEffect(() => {
    const component = components.find(c => c.id === placedComponent.componentId);
    setComponentData(component || null);
  }, [components, placedComponent.componentId]);

  // Get actual SVG dimensions when image loads
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const img = imgRef.current;
      // Use natural dimensions if available, otherwise use rendered dimensions
      const width = img.naturalWidth || img.width || 72;
      const height = img.naturalHeight || img.height || 93.6;
      setSvgDimensions({ width, height });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      onSelect();
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      onMove(placedComponent.id, deltaX, deltaY);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, onMove, placedComponent.id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // We're using direct DOM position for pin coordinates instead of calculating with rotation


  const connectors = Array.isArray(componentData?.connectors) ? componentData.connectors : [];

  return (
    <div
      ref={componentRef}
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: placedComponent.x,
        top: placedComponent.y,
        transform: `rotate(${placedComponent.rotation}deg)`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative">
        {/* Component Breadboard Image */}
        <img
          ref={imgRef}
          src={`/api/components/${placedComponent.componentId}/svg/breadboard`}
          alt={componentData?.title || "Component"}
          className="max-w-none"
          style={{ width: '64px', height: 'auto' }}
          onLoad={handleImageLoad}
          onError={(e) => {
            // Fallback to simple shape if SVG fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-16 h-8 bg-gray-600 border border-gray-400 rounded flex items-center justify-center">
                  <span class="text-xs text-white">${componentData?.title || 'Component'}</span>
                </div>
              `;
            }
            // Set default dimensions for fallback
            setSvgDimensions({ width: 64, height: 64 });
          }}
        />

        {/* Dynamic Connection Pins based on Fritzing data */}
        {connectors.map((connector: any, index: number) => {
          if (typeof connector.x !== 'number' || typeof connector.y !== 'number') {
            return null; // Skip pins without valid coordinates
          }
          
          // Use actual SVG dimensions from the component data if available
          const svgNaturalWidth = connector.svgWidth || svgDimensions.width || 72;
          const svgNaturalHeight = connector.svgHeight || svgDimensions.height || 93.6;
          
          // Scale connector positions to match the component rendered size (64px width)
          const scaleX = 64 / svgNaturalWidth;
          const scaleY = 64 / svgNaturalWidth; // Maintain aspect ratio for now
          
          const pinX = (connector.x || 0) * scaleX;
          const pinY = (connector.y || 0) * scaleY;

          return (
            <div
              key={connector.id || index}
              className="absolute w-3 h-3 bg-gray-700 rounded-full connection-pin hover:bg-yellow-400 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 border border-gray-500"
              style={{
                left: `${pinX}px`,
                top: `${pinY}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                
                // Get accurate pin position relative to canvas
                const canvasRect = canvasRef.current?.getBoundingClientRect();
                const pinRect = e.currentTarget.getBoundingClientRect();
                
                if (canvasRect && pinRect) {
                  const canvasX = (pinRect.left + pinRect.width / 2 - canvasRect.left) / (zoomLevel / 100);
                  const canvasY = (pinRect.top + pinRect.height / 2 - canvasRect.top) / (zoomLevel / 100);
                  
                  onPinClick(
                    placedComponent.id,
                    connector.id || `connector${index}`,
                    canvasX,
                    canvasY
                  );
                }
              }}
              title={`${connector.name || `Pin ${index + 1}`} - ${connector.description || connector.type || 'Connection point'}`}
            />
          );
        })}

        {/* Fallback pins if no connector data is available */}
        {connectors.length === 0 && (
          <>
            <div
              className="absolute top-1/2 left-0 w-3 h-3 bg-gray-700 rounded-full transform -translate-y-1/2 -translate-x-1/2 connection-pin hover:bg-yellow-400 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                
                // Get accurate pin position relative to canvas
                const canvasRect = canvasRef.current?.getBoundingClientRect();
                const pinRect = e.currentTarget.getBoundingClientRect();
                
                if (canvasRect && pinRect) {
                  const canvasX = (pinRect.left + pinRect.width / 2 - canvasRect.left) / (zoomLevel / 100);
                  const canvasY = (pinRect.top + pinRect.height / 2 - canvasRect.top) / (zoomLevel / 100);
                  
                  onPinClick(
                    placedComponent.id,
                    'connector0',
                    canvasX,
                    canvasY
                  );
                }
              }}
              title="Pin 1 - Connection point"
            />
            <div
              className="absolute top-1/2 right-0 w-3 h-3 bg-gray-700 rounded-full transform -translate-y-1/2 translate-x-1/2 connection-pin hover:bg-yellow-400 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                
                // Get accurate pin position relative to canvas
                const canvasRect = canvasRef.current?.getBoundingClientRect();
                const pinRect = e.currentTarget.getBoundingClientRect();
                
                if (canvasRect && pinRect) {
                  const canvasX = (pinRect.left + pinRect.width / 2 - canvasRect.left) / (zoomLevel / 100);
                  const canvasY = (pinRect.top + pinRect.height / 2 - canvasRect.top) / (zoomLevel / 100);
                  
                  onPinClick(
                    placedComponent.id,
                    'connector1',
                    canvasX,
                    canvasY
                  );
                }
              }}
              title="Pin 2 - Connection point"
            />
          </>
        )}
      </div>
    </div>
  );
}
