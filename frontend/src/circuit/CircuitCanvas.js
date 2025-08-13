import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CircuitCanvas = ({ onBack }) => {
  const [components, setComponents] = useState([]);
  const [placedComponents, setPlacedComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showComponentLibrary, setShowComponentLibrary] = useState(true);

  // Load components from backend
  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      const response = await axios.get(`${API}/components`);
      if (response.data.success) {
        setComponents(response.data.components || []);
      }
    } catch (error) {
      console.error('Error loading components:', error);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    
    try {
      const componentData = JSON.parse(e.dataTransfer.getData("application/json"));
      const rect = e.currentTarget.getBoundingClientRect();
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newComponent = {
        id: `component-${Date.now()}`,
        componentId: componentData.id,
        title: componentData.title,
        x: Math.round(x - 32), // Center the component
        y: Math.round(y - 32),
        rotation: 0
      };
      
      setPlacedComponents([...placedComponents, newComponent]);
    } catch (error) {
      console.error("Error dropping component:", error);
    }
  }, [placedComponents]);

  const handleComponentDragStart = (component) => {
    return (e) => {
      e.dataTransfer.setData("application/json", JSON.stringify(component));
    };
  };

  const handleComponentClick = (placedComponent) => {
    setSelectedComponent(placedComponent);
  };

  const deleteSelectedComponent = () => {
    if (selectedComponent) {
      setPlacedComponents(placedComponents.filter(comp => comp.id !== selectedComponent.id));
      setSelectedComponent(null);
    }
  };

  // Function to save the circuit as SVG
  const saveAsSVG = async () => {
    // Create a new SVG element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    // Get the canvas dimensions
    const canvasElement = document.getElementById('circuit-canvas');
    const width = canvasElement.scrollWidth;
    const height = canvasElement.scrollHeight;
    
    // Set SVG attributes
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    
    // Add a background
    const background = document.createElementNS(svgNS, "rect");
    background.setAttribute("width", width);
    background.setAttribute("height", height);
    background.setAttribute("fill", "#f9fafb");
    svg.appendChild(background);
    
    // Add grid pattern
    const defs = document.createElementNS(svgNS, "defs");
    const pattern = document.createElementNS(svgNS, "pattern");
    pattern.setAttribute("id", "grid");
    pattern.setAttribute("width", "20");
    pattern.setAttribute("height", "20");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "10");
    circle.setAttribute("cy", "10");
    circle.setAttribute("r", "1");
    circle.setAttribute("fill", "#d1d5db");
    
    pattern.appendChild(circle);
    defs.appendChild(pattern);
    svg.appendChild(defs);
    
    const gridRect = document.createElementNS(svgNS, "rect");
    gridRect.setAttribute("width", width);
    gridRect.setAttribute("height", height);
    gridRect.setAttribute("fill", "url(#grid)");
    svg.appendChild(gridRect);
    
    // Add each component to the SVG
    for (const component of placedComponents) {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("transform", `translate(${component.x}, ${component.y}) rotate(${component.rotation})`);  
      
      // Create a rectangle for the component
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("width", "64");
      rect.setAttribute("height", "64");
      rect.setAttribute("fill", "#4b5563");
      rect.setAttribute("stroke", "#374151");
      rect.setAttribute("stroke-width", "2");
      rect.setAttribute("rx", "4");
      g.appendChild(rect);
      
      // Add component title
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", "32");
      text.setAttribute("y", "32");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "white");
      text.setAttribute("font-size", "10");
      text.textContent = component.title;
      g.appendChild(text);
      
      svg.appendChild(g);
    }
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    
    // Save SVG to backend
    try {
      const fileName = prompt("Enter a name for your SVG file:", "circuit.svg");
      if (!fileName) return;
      
      const response = await axios.post(`${API}/save-svg`, {
        svg: svgString,
        fileName: fileName
      });
      
      if (response.data.success) {
        alert(`SVG saved successfully as ${fileName}`);
      } else {
        alert(`Error saving SVG: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error saving SVG:', error);
      alert(`Error saving SVG: ${error.message}`);
    }
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Component Library Sidebar */}
      {showComponentLibrary && (
        <div className="w-80 bg-gray-800 border-r border-gray-600 flex flex-col">
          <div className="p-4 border-b border-gray-600">
            <h3 className="font-semibold mb-2">Component Library</h3>
            <div className="max-h-96 overflow-y-auto">
              {components.map((component) => (
                <div
                  key={component.id}
                  className="p-2 mb-2 bg-gray-700 rounded cursor-grab hover:bg-gray-600"
                  draggable
                  onDragStart={handleComponentDragStart(component)}
                >
                  <div className="flex items-center">
                    <img
                      src={`${API}/components/${component.id}/svg/breadboard`}
                      alt={component.title}
                      className="w-8 h-8 mr-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div
                      className="w-8 h-8 mr-2 bg-gray-600 rounded flex items-center justify-center text-xs"
                      style={{ display: 'none' }}
                    >
                      {component.title.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{component.title}</div>
                      <div className="text-xs text-gray-400">{component.category}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Toolbar */}
        <div className="bg-gray-800 border-b border-gray-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
            >
              ← Back to Code
            </button>
            <span className="text-sm font-medium">Circuit Designer</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComponentLibrary(!showComponentLibrary)}
              className={`px-3 py-1 rounded text-sm ${showComponentLibrary ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
            >
              {showComponentLibrary ? 'Hide Library' : 'Show Library'}
            </button>
            <button
              onClick={saveAsSVG}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
            >
              Save as SVG
            </button>
            {selectedComponent && (
              <button
                onClick={deleteSelectedComponent}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
              >
                Delete Component
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div
          id="circuit-canvas"
          className="flex-1 relative overflow-auto bg-gray-50"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Placed Components */}
          {placedComponents.map((placedComponent) => (
            <div
              key={placedComponent.id}
              className={`absolute cursor-move ${selectedComponent?.id === placedComponent.id ? 'ring-2 ring-blue-500' : ''}`}
              style={{
                left: placedComponent.x,
                top: placedComponent.y,
                transform: `rotate(${placedComponent.rotation}deg)`
              }}
              onClick={() => handleComponentClick(placedComponent)}
            >
              <img
                src={`${API}/components/${placedComponent.componentId}/svg/breadboard`}
                alt={placedComponent.title}
                className="w-16 h-16"
                onError={(e) => {
                  // Fallback to simple rectangle if SVG fails
                  const target = e.target;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-component')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-component w-16 h-16 bg-gray-600 border border-gray-400 rounded flex items-center justify-center';
                    fallback.innerHTML = `<span class="text-xs text-white">${placedComponent.title}</span>`;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          ))}

          {/* Instructions */}
          {placedComponents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">Welcome to Circuit Designer</p>
                <p>Drag components from the library to start building your circuit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircuitCanvas;