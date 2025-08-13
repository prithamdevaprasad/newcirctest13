import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Component } from "@shared/schema";

interface ComponentLibraryProps {
  onComponentDrag: (component: Component) => void;
}

export function ComponentLibrary({ onComponentDrag }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "basic": true
  });
  const queryClient = useQueryClient();

  const { data: components = [], isLoading } = useQuery<Component[]>({
    queryKey: ["/api/components"],
  });

  const loadComponentsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/components/load");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
    }
  });

  // Group components by category
  const groupedComponents = components.reduce((acc, component) => {
    const category = component.category || 'unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {} as Record<string, Component[]>);

  // Filter components based on search
  const filteredGroupedComponents = Object.entries(groupedComponents).reduce((acc, [category, comps]) => {
    const filtered = comps.filter(component =>
      component.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof component.description === 'string' && component.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (component.tags && Array.isArray(component.tags) && component.tags.some(tag => tag && tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, Component[]>);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDragStart = (e: React.DragEvent, component: Component) => {
    e.dataTransfer.setData("application/json", JSON.stringify(component));
    e.dataTransfer.effectAllowed = "copy";
    onComponentDrag(component);
  };

  const categoryDisplayNames: Record<string, string> = {
    'Basic': 'Basic Components',
    'Semiconductors': 'Semiconductors',
    'Microcontrollers': 'Microcontrollers',
    'Sensors': 'Sensors',
    'Actuators': 'Actuators',
    'Input': 'Input Components',
    'Output': 'Output Components',
    'Connectors': 'Connectors',
    'Power': 'Power Components',
    'Miscellaneous': 'Miscellaneous',
    'core': 'Core',
    'contrib': 'Contrib',
    'user': 'User'
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-300 flex flex-col">
      <div className="p-4 border-b border-gray-300">
        <h2 className="font-semibold mb-3">Components</h2>
        
        {/* Search Bar */}
        <div className="relative mb-3">
          <Input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        </div>

        {/* Load Components Button */}
        {components.length === 0 && (
          <Button
            onClick={() => loadComponentsMutation.mutate()}
            disabled={loadComponentsMutation.isPending}
            className="w-full"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {loadComponentsMutation.isPending ? "Loading..." : "Load Fritzing Components"}
          </Button>
        )}
      </div>

      {/* Component Categories */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading components...</div>
        ) : (
          Object.entries(filteredGroupedComponents).map(([category, categoryComponents]) => (
            <Collapsible
              key={category}
              open={openCategories[category]}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center justify-between border-b border-gray-200">
                <span className="font-medium text-sm">
                  {categoryDisplayNames[category] || category}
                  <span className="ml-2 text-xs text-gray-500">({categoryComponents.length})</span>
                </span>
                {openCategories[category] ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="bg-white">
                {categoryComponents.map((component) => (
                  <Card
                    key={component.id}
                    className="m-2 cursor-pointer hover:bg-gray-50 border-gray-100"
                    draggable
                    onDragStart={(e) => handleDragStart(e, component)}
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center space-x-3">
                        {/* Component Icon */}
                        <div className="w-8 h-8 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                          <img
                            src={`/api/components/${component.id}/svg/icon`}
                            alt={component.title}
                            className="w-6 h-6"
                            onError={(e) => {
                              // Fallback to a simple shape if SVG fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-4 h-2 bg-black rounded-sm"></div>';
                              }
                            }}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {component.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {typeof component.description === 'string' ? component.description : 'No description'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
