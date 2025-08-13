import os
import json
import xml.etree.ElementTree as ET
import asyncio
import aiohttp
import re
from pathlib import Path
from typing import List, Dict, Optional, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class FritzingComponent:
    def __init__(self, component_id: str, title: str, description: str, category: str, 
                 tags: List[str], icon_url: str, breadboard_url: str, 
                 connectors: List[Dict], properties: Dict[str, Any]):
        self.id = component_id
        self.title = title
        self.description = description
        self.category = category
        self.tags = tags
        self.icon_url = icon_url
        self.breadboard_url = breadboard_url
        self.connectors = connectors
        self.properties = properties

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'tags': self.tags,
            'iconUrl': self.icon_url,
            'breadboardUrl': self.breadboard_url,
            'connectors': self.connectors,
            'properties': self.properties
        }

class FritzingService:
    def __init__(self):
        self.repo_path = './backend/fritzing-parts'
        self.base_url = 'https://raw.githubusercontent.com/fritzing/fritzing-parts/develop'
        self.components_cache = []
        self.loaded = False

    async def ensure_repository(self):
        """Ensure the fritzing-parts repository exists"""
        if os.path.exists(self.repo_path):
            logger.info('Fritzing repository already exists')
            return
        
        logger.info('Cloning Fritzing repository...')
        try:
            # Use the existing fritzing-parts directory in the backend
            existing_parts = './backend/fritzing-parts'
            if os.path.exists(existing_parts):
                self.repo_path = existing_parts
                logger.info(f'Using existing fritzing-parts at {existing_parts}')
            else:
                # If not found, create a minimal structure
                os.makedirs(self.repo_path, exist_ok=True)
                logger.info(f'Created fritzing-parts directory at {self.repo_path}')
        except Exception as e:
            logger.error(f'Error setting up fritzing repository: {e}')

    async def load_components(self) -> List[FritzingComponent]:
        """Load all components from the fritzing-parts repository"""
        if self.loaded and self.components_cache:
            return self.components_cache

        await self.ensure_repository()
        
        components = []
        
        # Load from all three repositories: core, contrib, user
        repositories = ['core', 'contrib', 'user']
        
        for repo in repositories:
            repo_path = os.path.join(self.repo_path, repo)
            if os.path.exists(repo_path):
                try:
                    fzp_files = await self.find_fzp_files(repo_path)
                    
                    # Process up to 50 components per repository to avoid overwhelming
                    for fzp_file in fzp_files[:50]:
                        try:
                            component = await self.parse_fzp_file(fzp_file, repo)
                            if component:
                                updated_component = await self.update_component_with_connector_positions(component)
                                components.append(updated_component)
                        except Exception as e:
                            logger.error(f'Error parsing {fzp_file}: {e}')
                except Exception as e:
                    logger.error(f'Error loading from {repo} repository: {e}')

        self.components_cache = components
        self.loaded = True
        logger.info(f'Loaded {len(components)} components from fritzing-parts')
        return components

    async def find_fzp_files(self, directory: str) -> List[str]:
        """Find all .fzp files in a directory recursively"""
        files = []
        
        try:
            for root, dirs, filenames in os.walk(directory):
                for filename in filenames:
                    if filename.endswith('.fzp'):
                        files.append(os.path.join(root, filename))
        except Exception as e:
            logger.error(f'Error reading directory {directory}: {e}')
        
        return files

    async def parse_fzp_file(self, file_path: str, repository: str = 'core') -> Optional[FritzingComponent]:
        """Parse a .fzp file and extract component information"""
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Extract basic information
            title_elem = root.find('title')
            title = title_elem.text if title_elem is not None else os.path.basename(file_path, '.fzp')
            
            description_elem = root.find('description')
            description = description_elem.text if description_elem is not None else ''
            
            category = self.extract_category(file_path)
            
            # Extract tags
            tags = []
            tags_elem = root.find('tags')
            if tags_elem is not None:
                for tag in tags_elem.findall('tag'):
                    if tag.text:
                        tags.append(tag.text)
            
            # Extract component ID from filename
            component_id = os.path.basename(file_path, '.fzp')
            
            # Create SVG URLs
            icon_url = f'{self.base_url}/svg/{repository}/icon/{component_id}.svg'
            breadboard_url = f'{self.base_url}/svg/{repository}/breadboard/{component_id}.svg'
            
            # Parse views for actual image paths
            views_elem = root.find('views')
            if views_elem is not None:
                icon_view = views_elem.find('iconView')
                if icon_view is not None:
                    layers = icon_view.find('layers')
                    if layers is not None:
                        layer = layers.find('layer')
                        if layer is not None and 'image' in layer.attrib:
                            icon_url = f'{self.base_url}/svg/{repository}/{layer.attrib["image"]}'
                
                breadboard_view = views_elem.find('breadboardView')
                if breadboard_view is not None:
                    layers = breadboard_view.find('layers')
                    if layers is not None:
                        layer = layers.find('layer')
                        if layer is not None and 'image' in layer.attrib:
                            breadboard_url = f'{self.base_url}/svg/{repository}/{layer.attrib["image"]}'
            
            # Parse connectors
            connectors = self.parse_connectors(root.find('connectors'))
            
            # Parse properties
            properties = self.parse_properties(root.find('properties'))
            
            return FritzingComponent(
                component_id=component_id,
                title=title,
                description=description,
                category=category,
                tags=tags,
                icon_url=icon_url,
                breadboard_url=breadboard_url,
                connectors=connectors,
                properties=properties
            )
            
        except Exception as e:
            logger.error(f'Error parsing {file_path}: {e}')
            return None

    def extract_category(self, file_path: str) -> str:
        """Extract category from file path or component name"""
        filename = os.path.basename(file_path, '.fzp').lower()
        
        # Match Fritzing-style categories based on component names
        if any(term in filename for term in ['resistor', 'capacitor', 'inductor']):
            return 'Basic'
        elif any(term in filename for term in ['led', 'diode', 'transistor']):
            return 'Semiconductors'
        elif any(term in filename for term in ['arduino', 'raspberry', 'microcontroller']):
            return 'Microcontrollers'
        elif any(term in filename for term in ['sensor', 'accelerometer', 'gyro']):
            return 'Sensors'
        elif any(term in filename for term in ['motor', 'servo', 'actuator']):
            return 'Actuators'
        elif any(term in filename for term in ['switch', 'button', 'potentiometer']):
            return 'Input'
        elif any(term in filename for term in ['speaker', 'display', 'lcd']):
            return 'Output'
        elif any(term in filename for term in ['connector', 'header', 'pin']):
            return 'Connectors'
        elif any(term in filename for term in ['power', 'battery', 'regulator']):
            return 'Power'
        else:
            return 'Miscellaneous'

    def parse_connectors(self, connectors_elem) -> List[Dict]:
        """Parse connector information from the .fzp file"""
        if connectors_elem is None:
            return []
        
        connectors = []
        
        for connector in connectors_elem.findall('connector'):
            connector_id = connector.get('id', '')
            connector_name = connector.get('name', '')
            connector_type = connector.get('type', 'unknown')
            
            description_elem = connector.find('description')
            description = description_elem.text if description_elem is not None else ''
            
            # Extract SVG ID from breadboard view if available
            svg_id = ''
            views = connector.find('views')
            if views is not None:
                breadboard_view = views.find('breadboardView')
                if breadboard_view is not None:
                    p_elem = breadboard_view.find('p')
                    if p_elem is not None:
                        svg_id = p_elem.get('svgId', '')
            
            connectors.append({
                'id': connector_id,
                'name': connector_name,
                'description': description,
                'type': connector_type,
                'svgId': svg_id,
                'x': 0,  # Will be updated from SVG parsing
                'y': 0   # Will be updated from SVG parsing
            })
        
        return connectors

    def parse_properties(self, properties_elem) -> Dict[str, Any]:
        """Parse properties from the .fzp file"""
        if properties_elem is None:
            return {}
        
        properties = {}
        
        for prop in properties_elem.findall('property'):
            name = prop.get('name', '')
            value = prop.get('value', prop.text or '')
            if name:
                properties[name] = value
        
        return properties

    async def get_component_svg(self, component_id: str, svg_type: str = 'breadboard') -> Optional[str]:
        """Get SVG content for a component"""
        try:
            # Try to get from local repository first
            await self.ensure_repository()
            
            possible_filenames = [
                f'{component_id}.svg',
                f'{component_id}_{svg_type}.svg',
                f'{component_id}_breadboard.svg'
            ]
            
            svg_directory = os.path.join(self.repo_path, 'svg', 'core', svg_type)
            
            if os.path.exists(svg_directory):
                for filename in possible_filenames:
                    svg_path = os.path.join(svg_directory, filename)
                    if os.path.exists(svg_path):
                        with open(svg_path, 'r', encoding='utf-8') as f:
                            return f.read()
            
            # Fallback: try to fetch from GitHub
            url = f'{self.base_url}/svg/core/{svg_type}/{component_id}.svg'
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.text()
                        
        except Exception as e:
            logger.error(f'Error getting SVG for {component_id}: {e}')
        
        return None

    async def parse_connector_positions(self, component_id: str, svg_content: str) -> List[Dict]:
        """Parse connector positions from SVG content"""
        try:
            root = ET.fromstring(svg_content)
            connectors = []
            
            # Find elements with IDs that look like connectors
            for elem in root.iter():
                elem_id = elem.get('id', '')
                if 'connector' in elem_id.lower() and ('pin' in elem_id.lower() or 'pad' in elem_id.lower()):
                    x, y = 0, 0
                    
                    # Extract position from various possible attributes
                    if 'cx' in elem.attrib and 'cy' in elem.attrib:
                        x = float(elem.attrib['cx'])
                        y = float(elem.attrib['cy'])
                    elif 'x' in elem.attrib and 'y' in elem.attrib:
                        x = float(elem.attrib['x'])
                        y = float(elem.attrib['y'])
                    elif 'x1' in elem.attrib and 'y1' in elem.attrib:
                        x = float(elem.attrib['x1'])
                        y = float(elem.attrib['y1'])
                    elif 'd' in elem.attrib:
                        # Parse path data for moveTo command
                        path_match = re.search(r'M\s*([\d.-]+)\s*,?\s*([\d.-]+)', elem.attrib['d'])
                        if path_match:
                            x = float(path_match.group(1))
                            y = float(path_match.group(2))
                    
                    # Clean up the connector ID
                    base_id = elem_id.replace('pin', '').replace('pad', '')
                    connectors.append({'id': base_id, 'x': x, 'y': y})
            
            return connectors
            
        except Exception as e:
            logger.error(f'Error parsing SVG connector positions for {component_id}: {e}')
            return []

    async def get_svg_dimensions(self, svg_content: str) -> Tuple[float, float]:
        """Get SVG dimensions"""
        try:
            root = ET.fromstring(svg_content)
            
            # Try viewBox first
            viewbox = root.get('viewBox')
            if viewbox:
                parts = viewbox.split()
                if len(parts) == 4:
                    return float(parts[2]), float(parts[3])
            
            # Try width/height attributes
            width = root.get('width', '72')
            height = root.get('height', '93.6')
            
            # Parse dimensions (remove units like 'in')
            width_match = re.search(r'([\d.]+)', str(width))
            height_match = re.search(r'([\d.]+)', str(height))
            
            if width_match and height_match:
                w = float(width_match.group(1))
                h = float(height_match.group(1))
                
                # Convert inches to pixels if needed (72 DPI)
                if 'in' in str(width):
                    w *= 72
                if 'in' in str(height):
                    h *= 72
                    
                return w, h
                
        except Exception as e:
            logger.error(f'Error parsing SVG dimensions: {e}')
        
        # Default Fritzing dimensions
        return 72.0, 93.6

    async def update_component_with_connector_positions(self, component: FritzingComponent) -> FritzingComponent:
        """Update component with actual connector positions from SVG"""
        try:
            svg_content = await self.get_component_svg(component.id, 'breadboard')
            if svg_content:
                svg_connectors = await self.parse_connector_positions(component.id, svg_content)
                width, height = await self.get_svg_dimensions(svg_content)
                
                # Update component connectors with positions
                updated_connectors = []
                for connector in component.connectors:
                    # Try to match connector with SVG connector
                    svg_connector = None
                    for sc in svg_connectors:
                        if (connector['svgId'] and sc['id'] == connector['svgId']) or \
                           (sc['id'] == connector['id']) or \
                           (sc['id'] in connector['id']) or \
                           (connector['id'] in sc['id']):
                            svg_connector = sc
                            break
                    
                    updated_connector = connector.copy()
                    if svg_connector:
                        updated_connector['x'] = svg_connector['x']
                        updated_connector['y'] = svg_connector['y']
                    
                    updated_connector['svgWidth'] = width
                    updated_connector['svgHeight'] = height
                    updated_connectors.append(updated_connector)
                
                # Create new component with updated connectors
                return FritzingComponent(
                    component_id=component.id,
                    title=component.title,
                    description=component.description,
                    category=component.category,
                    tags=component.tags,
                    icon_url=component.icon_url,
                    breadboard_url=component.breadboard_url,
                    connectors=updated_connectors,
                    properties=component.properties
                )
                
        except Exception as e:
            logger.error(f'Error updating connector positions for {component.id}: {e}')
        
        return component

# Global instance
fritzing_service = FritzingService()