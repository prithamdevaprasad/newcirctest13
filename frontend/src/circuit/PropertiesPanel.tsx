import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PropertiesPanelProps {
  selectedElement: any;
  onUpdateElement: (element: any) => void;
}

export function PropertiesPanel({ selectedElement, onUpdateElement }: PropertiesPanelProps) {
  const isComponent = selectedElement && selectedElement.componentId;
  const isWire = selectedElement && selectedElement.startComponent;

  const handleWireColorChange = (color: string) => {
    if (isWire) {
      onUpdateElement({ ...selectedElement, color });
    }
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (selectedElement) {
      const updatedProperties = { ...selectedElement.properties, [property]: value };
      onUpdateElement({ ...selectedElement, properties: updatedProperties });
    }
  };

  const wireColors = [
    { name: 'Black', value: 'black' },
    { name: 'Red', value: 'red' },
    { name: 'Blue', value: 'blue' },
    { name: 'Green', value: 'green' },
    { name: 'Yellow', value: 'yellow' },
    { name: 'Orange', value: 'orange' },
    { name: 'Purple', value: 'purple' },
    { name: 'Gray', value: 'gray' }
  ];

  return (
    <div className="w-64 bg-gray-50 border-l border-gray-300 flex flex-col">
      <div className="p-4 border-b border-gray-300">
        <h2 className="font-semibold">Properties</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedElement ? (
          <div className="text-center text-gray-500 text-sm">
            Select a component or wire to view properties
          </div>
        ) : isComponent ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Component Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-700">Type</Label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedElement.title || 'Unknown Component'}
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700">Description</Label>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedElement.description || 'No description available'}
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700">Position</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label className="text-xs text-gray-500">X</Label>
                    <p className="text-sm">{selectedElement.x}px</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Y</Label>
                    <p className="text-sm">{selectedElement.y}px</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700">Rotation</Label>
                <Select
                  value={selectedElement.rotation?.toString() || "0"}
                  onValueChange={(value) => handlePropertyChange('rotation', parseInt(value))}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0°</SelectItem>
                    <SelectItem value="90">90°</SelectItem>
                    <SelectItem value="180">180°</SelectItem>
                    <SelectItem value="270">270°</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Component-specific properties */}
              {selectedElement.properties && Object.entries(selectedElement.properties).map(([key, value]) => (
                <div key={key}>
                  <Label className="text-xs font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-sm text-gray-900 mt-1">{String(value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : isWire ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Wire Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">Color</Label>
                <div className="grid grid-cols-4 gap-1">
                  {wireColors.map((color) => (
                    <Button
                      key={color.value}
                      variant="outline"
                      size="sm"
                      className={`w-6 h-6 p-0 border-2 ${
                        selectedElement.color === color.value ? 'border-blue-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleWireColorChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700">Connection</Label>
                <div className="text-xs text-gray-600 mt-1">
                  <div>From: {selectedElement.startComponent} ({selectedElement.startPin})</div>
                  <div>To: {selectedElement.endComponent} ({selectedElement.endPin})</div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700">Path Points</Label>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedElement.path?.length || 0} points
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
