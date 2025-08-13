import { Button } from "@/components/ui/button";
import { Save, FolderOpen, FileText, Undo, Redo } from "lucide-react";

interface HeaderBarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function HeaderBar({ onNew, onOpen, onSave, onUndo, onRedo, canUndo, canRedo }: HeaderBarProps) {
  return (
    <header className="bg-black text-white px-4 py-2 border-b border-gray-300 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">Fritzing Circuit Builder</h1>
        <div className="flex items-center space-x-2 text-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-gray-800"
            onClick={onNew}
          >
            <FileText className="w-4 h-4 mr-1" />
            New
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-gray-800"
            onClick={onOpen}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Open
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-gray-800"
            onClick={onSave}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-gray-800"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo className="w-4 h-4 mr-1" />
          Undo
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-gray-800"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo className="w-4 h-4 mr-1" />
          Redo
        </Button>
      </div>
    </header>
  );
}
