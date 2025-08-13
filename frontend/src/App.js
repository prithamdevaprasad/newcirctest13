import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  FileText, 
  Save, 
  Play, 
  Upload, 
  Monitor, 
  BarChart3, 
  Settings,
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Terminal,
  Zap,
  Code,
  Wrench,
  File,
  X,
  LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './components/Auth/Auth.css';
import StorageService from './services/StorageService';
import CircuitCanvas from './circuit/CircuitCanvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Input Dialog Component
const InputDialog = ({ isOpen, onClose, onSubmit, title, defaultValue, label }) => {
  const [value, setValue] = useState(defaultValue || '');
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">{label}</label>
          <input 
            type="text" 
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button 
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (value.trim()) {
                onSubmit(value);
                onClose();
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// User profile component
const UserProfile = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      // Redirect to login page after successful sign out
      window.location.href = '/login';
    }
  };

  return (
    <div className="user-profile">
      <div className="user-email">{user?.email}</div>
      <button onClick={handleSignOut} className="sign-out-button">
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>
    </div>
  );
};

const ArduinoCodeEditor = () => {
  const { user } = useAuth();
  
  // Header buttons handlers
  const handleNewFile = () => {
    // Implementation
  };
  
  const handleOpenFile = () => {
    // Implementation
  };
  
  const handleSaveFile = () => {
    // Implementation
  };
  
  const handleCompileAndUpload = () => {
    // Implementation
  };
  
  const handleToggleSerialMonitor = () => {
    // Implementation
  };
  
  const handleToggleSettings = () => {
    // Implementation
  };
  // State management
  const defaultCode = `void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
  Serial.println("Hello Arduino!");
}`;
  
  // Default template for new files
  const defaultTemplate = `void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
  
}`;

  const [activeTab, setActiveTab] = useState('main.ino');
  const [tabs, setTabs] = useState([{ name: 'main.ino', content: defaultCode, path: 'main.ino' }]);
  const [code, setCode] = useState(defaultCode);
  const [isCircuitMode, setIsCircuitMode] = useState(false);
  const [currentFzpFile, setCurrentFzpFile] = useState(null);
  const [rightPanelView, setRightPanelView] = useState('');
  const [serialData, setSerialData] = useState([]);
  const [serialOutput, setSerialOutput] = useState('');
  const [boards, setBoards] = useState([]);
  const [ports, setPorts] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedPort, setSelectedPort] = useState('');
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [inoFiles, setInoFiles] = useState([]);
  const [fzpFiles, setFzpFiles] = useState([]);
  const [compileOutput, setCompileOutput] = useState('');
  const [uploadOutput, setUploadOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [showBoardManager, setShowBoardManager] = useState(false);
  const [serialInput, setSerialInput] = useState('');
  const [plotData, setPlotData] = useState([]);
  const [availableBoards, setAvailableBoards] = useState([]);
  const [availableLibraries, setAvailableLibraries] = useState([]);
  const [cores, setCores] = useState([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [isSearchingLibraries, setIsSearchingLibraries] = useState(false);
  const [isInstallingLibrary, setIsInstallingLibrary] = useState(false);
  const [isInstallingCore, setIsInstallingCore] = useState(false);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewCircuitDialog, setShowNewCircuitDialog] = useState(false);
  const [showRenameFileDialog, setShowRenameFileDialog] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);
  const [outputText, setOutputText] = useState('');
  const [serialConnected, setSerialConnected] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  
  const wsRef = useRef(null);
  const editorRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadBoards();
    loadPorts();
    loadLibraries();
    loadWorkspace();
    loadAvailableBoards();
    loadCores();
    loadAvailablePlatforms();
    searchLibraries(); // Load initial library list
    
    // Initialize Supabase storage bucket
    StorageService.initBucket().catch(error => {
      console.error('Failed to initialize storage bucket:', error);
    });
  }, []);

  // API calls
  const loadBoards = async () => {
    try {
      const response = await axios.get(`${API}/boards`);
      if (response.data.success) {
        const boardsArray = response.data.boards || [];
        setBoards(boardsArray);
        if (boardsArray.length > 0) {
          setSelectedBoard(boardsArray[0].fqbn);
        }
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  };

  const loadPorts = async () => {
    try {
      const response = await axios.get(`${API}/ports`);
      if (response.data.success) {
        const portsArray = response.data.ports.detected_ports || [];
        setPorts(portsArray);
        if (portsArray.length > 0) {
          setSelectedPort(portsArray[0].port.address);
        }
      }
    } catch (error) {
      console.error('Error loading ports:', error);
    }
  };

  const loadLibraries = async () => {
    try {
      const response = await axios.get(`${API}/libraries`);
      if (response.data.success) {
        const librariesArray = response.data.libraries || [];
        // Transform the library data to match the expected format
        const formattedLibraries = librariesArray.map(lib => ({
          name: lib.library?.name || 'Unknown Library',
          version: lib.library?.version || lib.library?.latest?.version || '0.0.0',
          author: lib.library?.author || 'Unknown',
          maintainer: lib.library?.maintainer || 'Unknown',
          website: lib.library?.website || '',
          category: lib.library?.category || 'Uncategorized'
        }));
        setLibraries(formattedLibraries);
      }
    } catch (error) {
      console.error('Error loading libraries:', error);
    }
  };
  
  const openLibraryManager = async () => {
    setShowLibraryManager(true);
    
    // Refresh the libraries list
    await loadLibraries();
    
    // If there are already search results, refresh them to update installation status
    if (availableLibraries.length > 0) {
      await searchLibraries(librarySearchQuery);
    }
  };

  const loadWorkspace = async () => {
    try {
      if (user) {
        // Load files from Supabase storage for the current user
        const files = await StorageService.getUserFiles(user.id);
        
        // Transform files into the expected tree structure
        const tree = files.map(file => ({
          name: file.name,
          path: file.name, // Store just the filename as path
          type: 'file',
          size: file.metadata?.size || 0,
          lastModified: file.metadata?.lastModified || new Date().toISOString()
        }));
        
        // Separate .ino and .fzz files from user's storage
        const inoFiles = tree.filter(file => file.name.endsWith('.ino'));
        const fzzFiles = tree.filter(file => file.name.endsWith('.fzz'));
        
        // Add sample .fzz files if no .fzz files exist yet
        let finalFzzFiles = fzzFiles;
        if (fzzFiles.length === 0) {
          const sampleFzzFiles = [
            { name: 'led.fzz', path: 'led.fzz', type: 'file', size: 1024 },
            { name: 'resistor.fzz', path: 'resistor.fzz', type: 'file', size: 1024 },
            { name: 'arduino_uno.fzz', path: 'arduino_uno.fzz', type: 'file', size: 2048 },
            { name: 'breadboard.fzz', path: 'breadboard.fzz', type: 'file', size: 1536 }
          ];
          finalFzzFiles = sampleFzzFiles;
        }
        
        // Store both file types separately
        setInoFiles(inoFiles);
        setFzpFiles(finalFzzFiles);
        
        // Keep the original workspace tree for backward compatibility
        setWorkspaceTree([...tree]);
      } else {
        // Fallback to backend API if user is not authenticated
        const response = await axios.get(`${API}/workspace`);
        if (response.data.success) {
          // Separate .ino and .fzp files from backend response
          const inoFiles = response.data.tree.filter(file => file.name.endsWith('.ino'));
          const fzpFiles = response.data.tree.filter(file => file.name.endsWith('.fzp'));
          
          // Add sample .fzp files if no .fzp files exist yet
          let finalFzpFiles = fzpFiles;
          if (fzpFiles.length === 0) {
            const sampleFzpFiles = [
              { name: 'led.fzp', path: 'led.fzp', type: 'file', size: 1024 },
              { name: 'resistor.fzp', path: 'resistor.fzp', type: 'file', size: 1024 },
              { name: 'arduino_uno.fzp', path: 'arduino_uno.fzp', type: 'file', size: 2048 },
              { name: 'breadboard.fzp', path: 'breadboard.fzp', type: 'file', size: 1536 }
            ];
            finalFzpFiles = sampleFzpFiles;
          }
          
          // Store both file types separately
          setInoFiles(inoFiles);
          setFzpFiles(finalFzpFiles);
          
          // Keep the original workspace tree for backward compatibility
          setWorkspaceTree([...response.data.tree]);
        } else {
          // If no backend data, just show sample files
          const sampleFzzFiles = [
            { name: 'led.fzz', path: 'led.fzz', type: 'file', size: 1024 },
            { name: 'resistor.fzz', path: 'resistor.fzz', type: 'file', size: 1024 },
            { name: 'arduino_uno.fzz', path: 'arduino_uno.fzz', type: 'file', size: 2048 },
            { name: 'breadboard.fzz', path: 'breadboard.fzz', type: 'file', size: 1536 }
          ];
          
          // No .ino files in this case
          setInoFiles([]);
          setFzpFiles(sampleFzzFiles);
          
          // Keep the original workspace tree for backward compatibility
          setWorkspaceTree(sampleFzzFiles);
        }
      }
    } catch (error) {
      console.error('Error loading workspace:', error);
      setOutputText(prev => prev + '\nError loading workspace: ' + error.message);
      
      // Fallback to sample files on error
      const sampleFzzFiles = [
        { name: 'led.fzz', path: 'led.fzz', type: 'file', size: 1024 },
        { name: 'resistor.fzz', path: 'resistor.fzz', type: 'file', size: 1024 },
        { name: 'arduino_uno.fzz', path: 'arduino_uno.fzz', type: 'file', size: 2048 },
        { name: 'breadboard.fzz', path: 'breadboard.fzz', type: 'file', size: 1536 }
      ];
      
      // No files in this error case, but provide sample .fzz files
      setInoFiles([]);
      setFzpFiles(sampleFzzFiles);
      
      // Keep the original workspace tree for backward compatibility
      setWorkspaceTree([...sampleFzzFiles]);
    }
  };
  
  const loadFileContent = async (filePath) => {
    try {
      if (user && !filePath.startsWith('/tmp/')) {
        // Load file from Supabase storage
        // For Supabase storage, filePath is just the filename
        console.log('Loading file from Supabase:', filePath);
        
        // When loading from workspace tree, filePath is just the filename
        // We need to pass just the filename to StorageService.getFileContent
        // as it will construct the full path with userId/fileName
        const fileName = filePath.includes('/') ? filePath.split('/').pop() : filePath;
        console.log('Extracted fileName for Supabase:', fileName);
        
        try {
          // Try to load from Supabase with cache busting
          console.log('Attempting to load file with cache busting');
          const content = await StorageService.getFileContent(user.id, fileName);
          console.log('Content loaded from Supabase, length:', content?.length || 0);
          
          // If content is empty or very short, it might indicate an issue
          if (!content || content.trim() === '') {
            console.warn('Empty content loaded from Supabase, this might indicate an issue');
            
            // Try fallback to backend API
            console.log('Trying fallback to backend API');
            const backupPath = `/tmp/arduino_workspace/${fileName}`;
            const response = await axios.get(`${API}/files?path=${encodeURIComponent(backupPath)}`);
            if (response.data.success && response.data.content) {
              console.log('Successfully loaded content from backend API');
              
              // If we got content from the backend, try to save it back to Supabase
              // to ensure Supabase has the latest version
              try {
                console.log('Syncing backend content to Supabase');
                await StorageService.saveFile(user.id, fileName, response.data.content);
                console.log('Successfully synced content to Supabase');
              } catch (syncError) {
                console.error('Failed to sync content to Supabase:', syncError);
              }
              
              return response.data.content;
            }
          }
          
          return content;
        } catch (supabaseError) {
          console.error('Error loading from Supabase:', supabaseError);
          
          // Try fallback to backend API
          console.log('Supabase load failed, trying backend API as fallback');
          const backupPath = `/tmp/arduino_workspace/${fileName}`;
          const response = await axios.get(`${API}/files?path=${encodeURIComponent(backupPath)}`);
          if (response.data.success) {
            console.log('Successfully loaded content from backend API');
            
            // If we got content from the backend, try to save it back to Supabase
            // to ensure Supabase has the latest version
            try {
              console.log('Syncing backend content to Supabase');
              await StorageService.saveFile(user.id, fileName, response.data.content);
              console.log('Successfully synced content to Supabase');
            } catch (syncError) {
              console.error('Failed to sync content to Supabase:', syncError);
            }
            
            return response.data.content;
          }
          
          // If both methods fail, throw the original error
          throw supabaseError;
        }
      } else {
        // Fallback to backend API for system files or when user is not authenticated
        const response = await axios.get(`${API}/files?path=${encodeURIComponent(filePath)}`);
        if (response.data.success) {
          return response.data.content;
        } else {
          console.error('Error loading file content:', response.data.error);
          setOutputText(prev => prev + '\nError loading file: ' + response.data.error);
          return '';
        }
      }
    } catch (error) {
      console.error('Error loading file content:', error);
      setOutputText(prev => prev + '\nError loading file: ' + error.message);
      return '';
    }
  };

  const loadAvailableBoards = async () => {
    try {
      const response = await axios.get(`${API}/boards/available`);
      if (response.data.success) {
        setAvailableBoards(response.data.boards || []);
      }
    } catch (error) {
      console.error('Error loading available boards:', error);
    }
  };

  const loadCores = async () => {
    try {
      const response = await axios.get(`${API}/cores`);
      if (response.data.success) {
        setCores(response.data.cores || []);
      }
    } catch (error) {
      console.error('Error loading cores:', error);
    }
  };

  const loadAvailablePlatforms = async () => {
    try {
      const response = await axios.get(`${API}/cores/search`);
      if (response.data.success) {
        // Preserve isInstalling state for platforms that are currently being installed
        const currentPlatforms = availablePlatforms || [];
        const newPlatforms = response.data.platforms || [];
        
        // Map through new platforms and add isInstalling flag from current platforms if they exist
        const updatedPlatforms = newPlatforms.map(newPlatform => {
          const existingPlatform = currentPlatforms.find(platform => platform.id === newPlatform.id);
          return {
            ...newPlatform,
            isInstalling: existingPlatform?.isInstalling || false
          };
        });
        
        setAvailablePlatforms(updatedPlatforms);
      }
    } catch (error) {
      console.error('Error loading available platforms:', error);
    }
  };

  const searchLibraries = async (query = '') => {
    setIsSearchingLibraries(true);
    try {
      // Ensure query is properly formatted for arduino-cli
      // The CLI performs case-insensitive search, but needs proper query format
      // For exact name matches, use name="Library Name"
      // For partial name matches, use name:Library
      const formattedQuery = query.trim();
      
      const response = await axios.post(`${API}/libraries/search`, { query: formattedQuery });
      if (response.data.success) {
        // Preserve isInstalling state for libraries that are currently being installed
        const currentLibraries = availableLibraries || [];
        const newLibraries = response.data.libraries || [];
        
        // Get the list of installed libraries to mark which ones are already installed
        const installedLibraryNames = libraries.map(lib => lib.name);
        
        // Map through new libraries and add isInstalling flag from current libraries if they exist
        // Also add isInstalled flag based on whether the library is in the installed libraries list
        const updatedLibraries = newLibraries.map(newLib => {
          const existingLib = currentLibraries.find(lib => lib.name === newLib.name);
          const isInstalled = installedLibraryNames.includes(newLib.name);
          return {
            ...newLib,
            isInstalling: existingLib?.isInstalling || false,
            isInstalled: isInstalled
          };
        });
        
        setAvailableLibraries(updatedLibraries);
      }
    } catch (error) {
      console.error('Error searching libraries:', error);
    }
    setIsSearchingLibraries(false);
  };

  const installLibrary = async (libraryName) => {
    // Set the specific library as installing instead of all libraries
    setAvailableLibraries(prevLibraries => 
      prevLibraries.map(lib => 
        lib.name === libraryName ? { ...lib, isInstalling: true } : lib
      )
    );
    
    try {
      const response = await axios.post(`${API}/libraries/install`, { library_name: libraryName });
      if (response.data.success) {
        await loadLibraries(); // Refresh installed libraries
        
        // Update the available libraries list to mark this library as installed
        setAvailableLibraries(prevLibraries => 
          prevLibraries.map(lib => 
            lib.name === libraryName ? { ...lib, isInstalling: false, isInstalled: true } : lib
          )
        );
        
        alert(`Library "${libraryName}" installed successfully!`);
      } else {
        // Reset the installing state for this specific library
        setAvailableLibraries(prevLibraries => 
          prevLibraries.map(lib => 
            lib.name === libraryName ? { ...lib, isInstalling: false } : lib
          )
        );
        alert('Failed to install library: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error installing library:', error);
      
      // Reset the installing state for this specific library
      setAvailableLibraries(prevLibraries => 
        prevLibraries.map(lib => 
          lib.name === libraryName ? { ...lib, isInstalling: false } : lib
        )
      );
      
      alert('Error installing library: ' + error.message);
    }
  };

  const installCore = async (coreName) => {
    // Set the specific core as installing instead of all cores
    setAvailablePlatforms(prevPlatforms => 
      prevPlatforms.map(platform => 
        platform.id === coreName ? { ...platform, isInstalling: true } : platform
      )
    );
    
    try {
      const response = await axios.post(`${API}/cores/install`, { core_name: coreName });
      if (response.data.success) {
        await loadCores(); // Refresh cores
        await loadBoards(); // Refresh available boards
        await loadAvailablePlatforms(); // Refresh available platforms
        alert('Core installed successfully!');
      } else {
        alert('Failed to install core: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error installing core:', error);
      alert('Error installing core: ' + error.message);
    }
    
    // Reset the installing state for this specific core
    setAvailablePlatforms(prevPlatforms => 
      prevPlatforms.map(platform => 
        platform.id === coreName ? { ...platform, isInstalling: false } : platform
      )
    );
  };

  const saveFile = async () => {
    try {
      console.log('saveFile function called');
      console.log('Current activeTab:', activeTab);
      console.log('Current tabs:', tabs);
      console.log('Current code length:', code?.length || 0);
      
      const activeTabObj = tabs.find(tab => tab.name === activeTab);
      console.log('Active tab object:', activeTabObj);
      
      if (activeTabObj) {
        // Update the tabs array with the current code
        const updatedTabs = tabs.map(tab => 
          tab.name === activeTab ? { ...tab, content: code } : tab
        );
        setTabs(updatedTabs);
        
        console.log('Saving file:', activeTabObj.path, 'Content length:', code.length);
        setOutputText(prev => prev + '\nAttempting to save file: ' + activeTabObj.path);
        
        if (user && !activeTabObj.path.startsWith('/tmp/')) {
          // Save to Supabase storage
          console.log('Saving to Supabase storage with user ID:', user.id);
          console.log('File path for Supabase:', activeTabObj.path);
          
          // When saving to Supabase, we need to extract just the filename
          // as StorageService.saveFile will construct the full path with userId/fileName
          const fileName = activeTabObj.path.includes('/') ? activeTabObj.path.split('/').pop() : activeTabObj.path;
          console.log('Extracted fileName for Supabase:', fileName);
          
          // First try to save with Supabase
          let result = await StorageService.saveFile(user.id, fileName, code);
          console.log('Supabase save result:', result);
          
          // If Supabase save fails, try fallback to backend API
          if (!result.success) {
            console.log('Supabase save failed, trying backend API as fallback');
            try {
              // Create a temporary path for the file
              const tempPath = `/tmp/arduino_workspace/${fileName}`;
              const response = await axios.post(`${API}/files`, {
                path: tempPath,
                content: code
              });
              
              if (response.data.success) {
                result = { success: true };
                console.log('Fallback save successful');
              }
            } catch (fallbackError) {
              console.error('Fallback save also failed:', fallbackError);
            }
          }
          
          if (result.success) {
            setOutputText(prev => prev + '\nFile saved successfully: ' + activeTabObj.path);
            
            // Verify the saved content by loading it again
            try {
              console.log('Verifying saved content by reloading it');
              const savedContent = await StorageService.getFileContent(user.id, fileName);
              
              if (savedContent && savedContent.length > 0) {
                console.log('Verification successful - content loaded, length:', savedContent.length);
                
                // Update the tab with the verified content
                const verifiedUpdatedTabs = tabs.map(tab => 
                  tab.name === activeTab ? { ...tab, content: savedContent } : tab
                );
                setTabs(verifiedUpdatedTabs);
                setCode(savedContent);
              } else {
                console.warn('Verification warning - empty content loaded after save');
              }
            } catch (verifyError) {
              console.error('Error verifying saved content:', verifyError);
            }
            
            // Refresh workspace to ensure we see the latest files
            loadWorkspace();
            
            alert('File saved successfully!');
          } else {
            setOutputText(prev => prev + '\nError saving file: ' + result.error);
            alert('Error saving file: ' + result.error);
          }
        } else {
          // Fallback to backend API for system files or when user is not authenticated
          console.log('Saving to backend API');
          const response = await axios.post(`${API}/files`, {
            path: activeTabObj.path,
            content: code
          });
          
          console.log('Save response:', response.data);
          if (response.data.success) {
            setOutputText(prev => prev + '\nFile saved successfully: ' + activeTabObj.path);
            alert('File saved successfully!');
          } else {
            setOutputText(prev => prev + '\nError saving file: ' + response.data.error);
            alert('Error saving file: ' + response.data.error);
          }
        }
      } else {
        console.error('No active tab found');
        setOutputText(prev => prev + '\nError: No active tab found');
        alert('Error: No active tab found');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setOutputText(prev => prev + '\nError saving file: ' + error.message);
      alert('Error saving file: ' + error.message);
    }
  };

  const compileCode = async () => {
    setIsCompiling(true);
    setCompileOutput('Compiling...');
    try {
      const response = await axios.post(`${API}/compile`, {
        code: code,
        board: selectedBoard,
        sketch_path: '/tmp/arduino_workspace'
      });
      setCompileOutput(response.data.message);
    } catch (error) {
      setCompileOutput(`Error: ${error.message}`);
    }
    setIsCompiling(false);
  };

  const uploadCode = async () => {
    if (!selectedPort) {
      setUploadOutput('Please select a port first');
      return;
    }
    
    setIsUploading(true);
    setUploadOutput('Uploading...');
    try {
      const response = await axios.post(`${API}/upload`, {
        code: code,
        board: selectedBoard,
        port: selectedPort,
        sketch_path: '/tmp/arduino_workspace'
      });
      setUploadOutput(response.data.message);
    } catch (error) {
      setUploadOutput(`Error: ${error.message}`);
    }
    setIsUploading(false);
  };

  // Serial monitor WebSocket
  const connectSerial = () => {
    // If already connected, disconnect
    if (serialConnected && wsRef.current) {
      wsRef.current.close();
      return;
    }
    
    if (!selectedPort) {
      alert('Please select a port first');
      return;
    }
    
    try {
      // Get the selected baudrate
      let baudrate = '9600'; // Default
      
      // Try to get from serial monitor or plotter, depending on which is active
      const serialBaudrateSelect = document.getElementById('baudrate-select');
      const plotterBaudrateSelect = document.getElementById('plotter-baudrate-select');
      
      if (rightPanelView === 'serial' && serialBaudrateSelect) {
        baudrate = serialBaudrateSelect.value;
      } else if (rightPanelView === 'plotter' && plotterBaudrateSelect) {
        baudrate = plotterBaudrateSelect.value;
      } else if (serialBaudrateSelect) {
        baudrate = serialBaudrateSelect.value;
      } else if (plotterBaudrateSelect) {
        baudrate = plotterBaudrateSelect.value;
      }
      
      const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/api/serial/${selectedPort}?baudrate=${baudrate}`;
      
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setSerialOutput(`Connected to ${selectedPort} at ${baudrate} baud\n`);
        setSerialConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        const data = event.data;
        setSerialOutput(prev => prev + data + '\n');
        
        // Try to parse as numeric data for plotting
        const numericValue = parseFloat(data);
        if (!isNaN(numericValue)) {
          const timestamp = new Date().toLocaleTimeString();
          setPlotData(prev => [...prev.slice(-49), { 
            time: timestamp, 
            value: numericValue 
          }]);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setSerialOutput(prev => prev + 'Error: Connection failed\n');
        setSerialConnected(false);
      };
      
      wsRef.current.onclose = () => {
        setSerialOutput(prev => prev + 'Disconnected from ' + selectedPort + '\n');
        setSerialConnected(false);
      };
    } catch (error) {
      console.error('Serial connection error:', error);
      setSerialOutput(prev => prev + `Error: ${error.message}\n`);
      setSerialConnected(false);
    }
  };

  const sendSerialData = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && serialInput) {
      try {
        wsRef.current.send(serialInput);
        setSerialOutput(prev => prev + `> ${serialInput}\n`);
        setSerialInput('');
      } catch (error) {
        console.error('Error sending data:', error);
        setSerialOutput(prev => prev + `Error sending: ${error.message}\n`);
      }
    } else if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setSerialOutput(prev => prev + 'Error: Not connected to serial port\n');
    }
  };
  
  const clearSerialOutput = () => {
    setSerialOutput('');
  };
  
  const clearPlotData = () => {
    setPlotData([]);
  };

  const toggleRightPanel = (view) => {
    if (rightPanelView === view) {
      // If clicking the same view button, close the panel
      setRightPanelView('');
      setRightPanelVisible(false);
    } else {
      // If clicking a different view button or opening the panel
      setRightPanelView(view);
      setRightPanelVisible(true);
      
      // Force redraw of the panel after a short delay
      setTimeout(() => {
        // Add the 'visible' class to the right panel
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
          rightPanel.classList.add('visible');
          rightPanel.classList.remove('hidden');
          
          // Ensure the panel is fully visible
          rightPanel.style.position = 'absolute';
          rightPanel.style.right = '40px';
          rightPanel.style.top = '0';
          rightPanel.style.height = '100vh';
          rightPanel.style.zIndex = '100';
          rightPanel.style.display = 'flex';
        }
      }, 100);
    }
  };

  const FileTreeItem = ({ item, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    
    // This is a local loadFileContent function within FileTreeItem
    // We should use the main loadFileContent function from the parent component
    // to ensure consistent behavior with Supabase storage
    const loadFileContentLocal = async (path) => {
      try {
        // For user files in Supabase, we should use the main loadFileContent function
        if (user && !path.startsWith('/tmp/')) {
          return await loadFileContent(path);
        } else {
          // For system files or when user is not authenticated, use the backend API
          const response = await axios.get(`${API}/files?path=${encodeURIComponent(path)}`);
          if (response.data.success) {
            return response.data.content;
          }
          return '';
        }
      } catch (error) {
        console.error('Error loading file:', error);
        return '';
      }
    };
    
    const handleContextMenu = (e) => {
      e.preventDefault();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
      
      // Add event listener to close context menu when clicking elsewhere
      document.addEventListener('click', () => {
        setShowContextMenu(false);
      }, { once: true });
    };
    
    const Path = {
      dirname: (path) => {
        return path.substring(0, path.lastIndexOf('/'));
      },
      join: (dir, file) => {
        return dir + '/' + file;
      }
    };
    
    const deleteFile = async () => {
      if (item.type === 'file') {
        try {
          // Close the tab if it's open
          const tabIndex = tabs.findIndex(t => t.path === item.path);
          if (tabIndex !== -1) {
            const newTabs = [...tabs];
            newTabs.splice(tabIndex, 1);
            setTabs(newTabs);
            
            // If the deleted file was the active tab, switch to another tab
            if (activeTab === item.name && newTabs.length > 0) {
              setActiveTab(newTabs[0].name);
              setCode(newTabs[0].content);
            }
          }
          
          if (user && !item.path.startsWith('/tmp/')) {
            // Delete file from Supabase storage
            const result = await StorageService.deleteFile(user.id, item.path);
            
            if (result.success) {
              setOutputText(prev => prev + '\nFile deleted: ' + item.path);
            } else {
              setOutputText(prev => prev + '\nError deleting file: ' + result.error);
              throw new Error(result.error);
            }
          } else {
            // Delete the file from the server
            await axios.delete(`${API}/files?path=${encodeURIComponent(item.path)}`);
            setOutputText(prev => prev + '\nFile deleted: ' + item.path);
          }
          
          // Refresh workspace tree
          loadWorkspace();
        } catch (error) {
          console.error('Error deleting file:', error);
          setOutputText(prev => prev + '\nError deleting file: ' + error.message);
        }
      }
    };
    
    return (
      <div className={`ml-${level * 4}`}>
        <div 
          className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer"
          onClick={async () => {
            if (item.type === 'file') {
              // Check if it's a .fzp or .fzz file (circuit design)
              if (item.name.endsWith('.fzp') || item.name.endsWith('.fzz')) {
                // Switch to circuit mode
                setIsCircuitMode(true);
                setCurrentFzpFile(item);
                setOutputText(prev => prev + '\nSwitched to circuit design mode for: ' + item.name);
              } else {
                // Regular file - open in code editor
                setIsCircuitMode(false);
                const existingTab = tabs.find(t => t.path === item.path);
                
                if (existingTab) {
                  // If tab already exists, just switch to it
                  setActiveTab(item.name);
                  setCode(existingTab.content);
                } else {
                  // Load file content and create new tab
                  const fileContent = await loadFileContent(item.path);
                  setTabs([...tabs, { name: item.name, content: fileContent, path: item.path }]);
                  setActiveTab(item.name);
                  setCode(fileContent);
                }
              }
            } else {
              setIsOpen(!isOpen);
            }
          }}
          onContextMenu={handleContextMenu}
        >
          {item.type === 'directory' ? (
            isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <FileText size={16} />
          )}
          <span className="ml-2 text-sm">{item.name}</span>
        </div>
        
        {/* Context Menu */}
        {showContextMenu && (
          <div 
            className="absolute bg-gray-800 border border-gray-600 rounded shadow-lg z-50"
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          >
            {item.type === 'file' && (
              <>
                <button 
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                  onClick={() => {
                    setFileToRename(item);
                    setShowRenameFileDialog(true);
                  }}
                >
                  <FileText size={14} className="inline mr-2" />
                  Rename
                </button>
                <button 
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                  onClick={deleteFile}
                >
                  <Trash2 size={14} className="inline mr-2" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
        
        {item.type === 'directory' && isOpen && item.children && (
          <div>
            {item.children.map((child, index) => (
              <FileTreeItem key={index} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      {/* Top Menu Bar */}
      <AppHeader 
        title="Arduino Code Editor"
        onNewFile={() => setShowNewFileDialog(true)}
        onNewCircuit={() => setShowNewCircuitDialog(true)}
        onOpenFile={loadWorkspace}
        onSaveFile={saveFile}
        onCompileAndUpload={uploadCode}
        onToggleSerialMonitor={() => toggleRightPanel('serial')}
        onToggleSettings={() => toggleRightPanel('settings')}
      />
      <div className="bg-gray-800 border-b border-gray-600 px-4 py-2">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <span className="font-semibold">Arduino IDE</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1 rounded hover:bg-gray-700"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="dropdown">
              <button className="px-3 py-1 hover:bg-gray-700 rounded">File</button>
              <div className="dropdown-content">
                <button onClick={() => setShowNewFileDialog(true)}>
                  New Arduino Sketch
                </button>
                <button onClick={() => setShowNewCircuitDialog(true)}>
                  New Circuit Design
                </button>
                <button onClick={saveFile}>
                  Save
                </button>
              </div>
            </div>
            
            {/* New File Dialog */}
             <InputDialog
               isOpen={showNewFileDialog}
               onClose={() => setShowNewFileDialog(false)}
               title="Create New File"
               label="Enter file name (with .ino extension):"
               defaultValue="new.ino"
               onSubmit={async (fileName) => {
                 // Ensure file has .ino extension
                 const validFileName = fileName.endsWith('.ino') ? fileName : `${fileName}.ino`;
                 
                 if (user) {
                   // Create file in Supabase storage
                   const result = await StorageService.createFile(user.id, validFileName);
                   
                   if (result.success) {
                     // Create a new tab with the default template
                     const newTab = { 
                       name: result.name, 
                       content: result.content, 
                       path: result.name // Store just the filename as path
                     };
                     
                     // Save current tab content before switching
                     const updatedTabs = tabs.map(tab => 
                       tab.name === activeTab ? { ...tab, content: code } : tab
                     );
                     
                     // Add the new tab and set it as active
                     setTabs([...updatedTabs, newTab]);
                     setActiveTab(result.name);
                     setCode(result.content);
                     
                     setOutputText(prev => prev + '\nNew file created: ' + result.name);
                     // Refresh workspace tree
                     loadWorkspace();
                   } else {
                     console.error('Error creating file:', result.error);
                     setOutputText(prev => prev + '\nError creating file: ' + result.error);
                   }
                 } else {
                   // Fallback to backend API when user is not authenticated
                   // Create a path for the new file in the workspace
                   const filePath = `/tmp/arduino_workspace/${validFileName}`;
                   // Create a new tab with default template
                   const newTab = { name: validFileName, content: defaultTemplate, path: filePath };
                   
                   // Save current tab content before switching
                   const updatedTabs = tabs.map(tab => 
                     tab.name === activeTab ? { ...tab, content: code } : tab
                   );
                   
                   // Add the new tab and set it as active
                   setTabs([...updatedTabs, newTab]);
                   setActiveTab(validFileName);
                   setCode(defaultTemplate);
                   
                   // Save the new file to the workspace
                   axios.post(`${API}/files`, {
                     path: filePath,
                     content: defaultTemplate
                   }).then(() => {
                     setOutputText(prev => prev + '\nNew file created: ' + filePath);
                     // Refresh workspace tree
                     loadWorkspace();
                   }).catch(error => {
                     console.error('Error creating file:', error);
                     setOutputText(prev => prev + '\nError creating file: ' + error.message);
                   });
                 }
               }}
             />
             
             {/* New Circuit Design Dialog */}
             <InputDialog
               isOpen={showNewCircuitDialog}
               onClose={() => setShowNewCircuitDialog(false)}
               title="Create New Circuit Design"
               label="Enter circuit design name (with .fzz extension):"
               defaultValue="new_circuit.fzz"
               onSubmit={async (fileName) => {
                 // Ensure file has .fzz extension
                 const validFileName = fileName.endsWith('.fzz') ? fileName : `${fileName}.fzz`;
                 
                 // Create a new empty circuit design file
                 const emptyCircuitTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<module fritzingVersion="0.9.3">
  <title>${validFileName}</title>
  <instances>
    <!-- Circuit components will be added here -->
  </instances>
  <connections>
    <!-- Connections between components will be added here -->
  </connections>
</module>`;
                 
                 if (user) {
                   // Create file in Supabase storage using the updated createFile method
                   const result = await StorageService.createFile(user.id, validFileName, emptyCircuitTemplate);
                   
                   if (result.success) {
                     // Switch to circuit mode with the new file
                     setIsCircuitMode(true);
                     setCurrentFzpFile({
                       name: validFileName,
                       path: validFileName,
                       type: 'file'
                     });
                     
                     setOutputText(prev => prev + '\nNew circuit design created: ' + validFileName);
                     // Refresh workspace tree
                     loadWorkspace();
                   } else {
                     console.error('Error creating circuit design:', result.error);
                     setOutputText(prev => prev + '\nError creating circuit design: ' + result.error);
                   }
                 } else {
                   // Fallback to backend API when user is not authenticated
                   const filePath = `/tmp/arduino_workspace/${validFileName}`;
                   
                   // Save the new circuit design to the workspace
                   axios.post(`${API}/files`, {
                     path: filePath,
                     content: emptyCircuitTemplate
                   }).then(() => {
                     // Switch to circuit mode with the new file
                     setIsCircuitMode(true);
                     setCurrentFzpFile({
                       name: validFileName,
                       path: filePath,
                       type: 'file'
                     });
                     
                     setOutputText(prev => prev + '\nNew circuit design created: ' + filePath);
                     // Refresh workspace tree
                     loadWorkspace();
                   }).catch(error => {
                     console.error('Error creating circuit design:', error);
                     setOutputText(prev => prev + '\nError creating circuit design: ' + error.message);
                   });
                 }
               }}
             />
             
             {/* Rename File Dialog */}
             <InputDialog
               isOpen={showRenameFileDialog}
               onClose={() => {
                 setShowRenameFileDialog(false);
                 setFileToRename(null);
               }}
               title="Rename File"
               label="Enter new file name:"
               defaultValue={fileToRename ? fileToRename.name : ''}
               onSubmit={async (newName) => {
                 if (fileToRename && newName && newName !== fileToRename.name) {
                   // Ensure new file has .ino extension
                   const validNewName = newName.endsWith('.ino') ? newName : `${newName}.ino`;
                   
                   if (user && !fileToRename.path.startsWith('/tmp/')) {
                     // Rename file in Supabase storage
                     const result = await StorageService.renameFile(user.id, fileToRename.name, validNewName);
                     
                     if (result.success) {
                       // Update tabs if the file is open
                       const tabIndex = tabs.findIndex(t => t.path === fileToRename.path);
                       if (tabIndex !== -1) {
                         const newTabs = [...tabs];
                         newTabs[tabIndex] = { ...newTabs[tabIndex], name: validNewName, path: validNewName };
                         setTabs(newTabs);
                         
                         // Update active tab if needed
                         if (activeTab === fileToRename.name) {
                           setActiveTab(validNewName);
                         }
                       }
                       
                       // Refresh workspace tree
                       loadWorkspace();
                       setOutputText(prev => prev + '\nFile renamed: ' + fileToRename.name + ' -> ' + validNewName);
                     } else {
                       console.error('Error renaming file:', result.error);
                       setOutputText(prev => prev + '\nError renaming file: ' + result.error);
                     }
                   } else {
                     // Fallback to backend API when user is not authenticated
                     // Create the new file path
                     const dirPath = fileToRename.path.substring(0, fileToRename.path.lastIndexOf('/'));
                     const newPath = `${dirPath}/${validNewName}`;
                     
                     // Get the current file content
                   loadFileContent(fileToRename.path).then(content => {
                       // Save content to new file
                       axios.post(`${API}/files`, {
                         path: newPath,
                         content: content
                       }).then(() => {
                         // Delete the old file
                         axios.delete(`${API}/files?path=${encodeURIComponent(fileToRename.path)}`).then(() => {
                           // Update tabs if the file is open
                           const tabIndex = tabs.findIndex(t => t.path === fileToRename.path);
                           if (tabIndex !== -1) {
                             const newTabs = [...tabs];
                             newTabs[tabIndex] = { ...newTabs[tabIndex], name: validNewName, path: newPath };
                             setTabs(newTabs);
                             
                             // Update active tab if needed
                             if (activeTab === fileToRename.name) {
                               setActiveTab(validNewName);
                             }
                           }
                           
                           // Refresh workspace tree
                           loadWorkspace();
                           setOutputText(prev => prev + '\nFile renamed: ' + fileToRename.path + ' -> ' + newPath);
                         }).catch(error => {
                           console.error('Error deleting old file:', error);
                           setOutputText(prev => prev + '\nError renaming file: ' + error.message);
                         });
                       }).catch(error => {
                         console.error('Error creating new file:', error);
                         setOutputText(prev => prev + '\nError renaming file: ' + error.message);
                       });
                     });
                    }
                 }
               }}
             />
            
            <div className="dropdown">
              <button className="px-3 py-1 hover:bg-gray-700 rounded">Edit</button>
            </div>
            
            <div className="dropdown">
              <button className="px-3 py-1 hover:bg-gray-700 rounded">Tools</button>
              <div className="dropdown-content">
                <button onClick={compileCode}>Compile</button>
                <button onClick={uploadCode}>Upload</button>
                <button onClick={() => setShowBoardManager(true)}>Board Manager</button>
                <button onClick={openLibraryManager}>Library Manager</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-600 flex flex-col">
          {/* File Manager */}
          <div className="flex-1 p-4">
            {/* Arduino Sketch Files (.ino) */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold flex items-center">
                <FolderOpen size={16} className="mr-2" />
                Arduino Sketches
              </h3>
              <button 
                onClick={() => setShowNewFileDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 p-1 rounded flex items-center justify-center"
                title="New Arduino Sketch"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="bg-gray-700 rounded p-2 max-h-40 overflow-y-auto mb-4">
              {inoFiles.length > 0 ? (
                inoFiles.map((item, index) => (
                  <FileTreeItem key={`ino-${index}`} item={item} />
                ))
              ) : (
                <div className="text-gray-400 text-sm italic p-1">No .ino files available</div>
              )}
            </div>
            
            {/* Circuit Design Files (.fzp) */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold flex items-center">
                <FolderOpen size={16} className="mr-2" />
                Circuit Designs
              </h3>
              <button 
                onClick={() => setShowNewCircuitDialog(true)}
                className="bg-purple-600 hover:bg-purple-700 p-1 rounded flex items-center justify-center"
                title="New Circuit Design"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="bg-gray-700 rounded p-2 max-h-40 overflow-y-auto">
              {fzpFiles.map((item, index) => (
                <FileTreeItem key={`fzp-${index}`} item={item} />
              ))}
            </div>
          </div>

          {/* Tools Section */}
          <div className="p-4 border-t border-gray-600">
            <h3 className="font-semibold mb-2">Tools</h3>
            
            {/* COM Port Selection */}
            <div className="mb-4">
              <label className="block text-sm mb-1">COM Port</label>
              <div className="flex">
                <select 
                  value={selectedPort} 
                  onChange={(e) => setSelectedPort(e.target.value)}
                  className="flex-1 bg-gray-700 text-white px-2 py-1 rounded-l text-sm"
                >
                  <option value="">Select Port</option>
                  {ports.map((port, index) => (
                    <option key={index} value={port.port.address}>{port.port.label}</option>
                  ))}
                </select>
                <button 
                  onClick={loadPorts}
                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-r"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Board Selection */}
            <div className="mb-4">
              <label className="block text-sm mb-1">Board</label>
              <select 
                value={selectedBoard} 
                onChange={(e) => setSelectedBoard(e.target.value)}
                className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
              >
                <option value="">Select Board</option>
                {boards.map((board, index) => (
                  <option key={index} value={board.fqbn}>{board.name}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={compileCode}
                disabled={isCompiling}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-2 rounded flex items-center justify-center"
              >
                {isCompiling ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
                {isCompiling ? 'Compiling...' : 'Compile'}
              </button>
              
              <button
                onClick={uploadCode}
                disabled={isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-2 rounded flex items-center justify-center"
              >
                {isUploading ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
              
              <button
                onClick={openLibraryManager}
                className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded flex items-center justify-center"
              >
                <Wrench size={16} className="mr-2" />
                Libraries
              </button>
              
              <button
                onClick={() => setShowBoardManager(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded flex items-center justify-center"
              >
                <Settings size={16} className="mr-2" />
                Boards
              </button>
            </div>
          </div>
        </div>

        {/* Center Panel - Code Editor or Circuit Canvas */}
        <div className="flex-1 flex flex-col">
          {!isCircuitMode ? (
            <>
              {/* Editor Tabs */}
              <div className="bg-gray-800 border-b border-gray-600 px-4 py-2">
                <div className="flex space-x-2">
                  {tabs.map((tab) => (
                    <div
                        key={tab.name}
                        onClick={() => {
                          // Save current tab content before switching
                          const updatedTabs = tabs.map(t => 
                            t.name === activeTab ? { ...t, content: code } : t
                          );
                          setTabs(updatedTabs);
                          
                          // Set active tab and load its content
                          setActiveTab(tab.name);
                          const selectedTab = updatedTabs.find(t => t.name === tab.name);
                          if (selectedTab) {
                            setCode(selectedTab.content);
                          }
                        }}
                        className={`px-3 py-1 rounded flex items-center cursor-pointer ${activeTab === tab.name ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <span>{tab.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const filteredTabs = tabs.filter(t => t.name !== tab.name);
                            setTabs(filteredTabs);
                            if (activeTab === tab.name && filteredTabs.length > 0) {
                              const newActiveTab = filteredTabs[0];
                              setActiveTab(newActiveTab.name);
                              setCode(newActiveTab.content);
                            }
                          }}
                          className="ml-2 hover:bg-red-600 rounded px-1"
                        >
                          ×
                        </button>
                      </div>
                  ))}
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1">
                <Editor
                  onMount={(editor) => {
                    console.log('Editor mounted');
                    editorRef.current = editor;
                  }}
                  height="100%"
                  defaultLanguage="cpp"
                  theme={darkMode ? "vs-dark" : "vs-light"}
                  value={code}
                  onChange={(newValue) => {
                    console.log('Editor content changed, new length:', newValue?.length || 0);
                    setCode(newValue || '');
                  }}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Output Panel */}
              <div className="h-40 bg-gray-800 border-t border-gray-600 p-4">
                <h3 className="font-semibold mb-2">Output</h3>
                <div className="bg-gray-900 p-2 rounded h-32 overflow-y-auto text-sm font-mono">
                  {compileOutput && <div className="text-green-400">{compileOutput}</div>}
                  {uploadOutput && <div className="text-blue-400">{uploadOutput}</div>}
                </div>
              </div>
            </>
          ) : (
            /* Circuit Canvas */
            <CircuitCanvas 
              onBack={() => {
                setIsCircuitMode(false);
                setCurrentFzpFile(null);
                setOutputText(prev => prev + '\nSwitched back to code editor mode');
              }}
            />
          )}
        </div>

        {/* Right Panel - Serial Monitor/Plotter */}
        <div className="flex h-full" style={{ position: 'absolute', right: '0', top: '0', bottom: '0', zIndex: 100 }}>
          {/* Toggle Buttons - Always visible */}
          <div className="bg-gray-800 border-l border-gray-600 p-2 flex flex-col space-y-2" style={{ position: 'relative', zIndex: '2000' }}>
            <button
              onClick={() => toggleRightPanel('serial')}
              className={`p-2 rounded ${rightPanelView === 'serial' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Serial Monitor"
            >
              <Monitor size={20} />
            </button>
            <button
              onClick={() => toggleRightPanel('plotter')}
              className={`p-2 rounded ${rightPanelView === 'plotter' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Serial Plotter"
            >
              <BarChart3 size={20} />
            </button>
          </div>

          {/* Right Panel Content */}
          <div className={`bg-gray-800 border-l border-gray-600 flex flex-col overflow-x-hidden right-panel ${rightPanelView ? 'visible' : 'hidden'}`} style={{ width: '500px', maxWidth: '50vw', minWidth: '450px', position: 'absolute', right: '40px', zIndex: '100', height: '100vh', top: '0', display: rightPanelView ? 'flex' : 'none' }}>
              {rightPanelView === 'serial' && (
                <div className="flex-1 p-3 w-full">
                  <div className="flex items-center justify-between mb-2 flex-wrap">
                    <h3 className="font-semibold">Serial Monitor</h3>
                    <div className="flex space-x-1">
                      <select 
                        id="baudrate-select"
                        className="bg-gray-700 text-white px-1 py-1 rounded text-xs"
                        defaultValue="9600"
                      >
                        <option value="1200">1200</option>
                        <option value="2400">2400</option>
                        <option value="4800">4800</option>
                        <option value="9600">9600</option>
                        <option value="19200">19200</option>
                        <option value="38400">38400</option>
                        <option value="57600">57600</option>
                        <option value="115200">115200</option>
                      </select>
                      <button
                        onClick={connectSerial}
                        className={`${serialConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} px-2 py-1 rounded text-xs`}
                      >
                        {serialConnected ? 'Disconnect' : 'Connect'}
                      </button>
                      <button
                        onClick={clearSerialOutput}
                        className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded h-[calc(100vh-250px)] overflow-y-auto text-sm font-mono mb-2 serial-output w-full" style={{ maxWidth: '100%', minHeight: '300px' }}>
                    {serialOutput}
                  </div>
                  <div className="flex w-full">
                    <input
                      type="text"
                      value={serialInput}
                      onChange={(e) => setSerialInput(e.target.value)}
                      className="flex-1 bg-gray-700 text-white px-2 py-1 rounded-l text-sm"
                      placeholder="Send data..."
                      onKeyPress={(e) => e.key === 'Enter' && sendSerialData()}
                      disabled={!serialConnected}
                    />
                    <button
                      onClick={sendSerialData}
                      className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-r text-sm"
                      disabled={!serialConnected}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {rightPanelView === 'plotter' && (
                <div className="flex-1 p-3 w-full">
                  <div className="flex items-center justify-between mb-2 flex-wrap">
                    <h3 className="font-semibold">Serial Plotter</h3>
                    <div className="flex space-x-1">
                      <select 
                        id="plotter-baudrate-select"
                        className="bg-gray-700 text-white px-1 py-1 rounded text-xs"
                        defaultValue="9600"
                        onChange={(e) => {
                          // Keep baudrate selections in sync
                          const serialBaudrateSelect = document.getElementById('baudrate-select');
                          if (serialBaudrateSelect) {
                            serialBaudrateSelect.value = e.target.value;
                          }
                        }}
                      >
                        <option value="1200">1200</option>
                        <option value="2400">2400</option>
                        <option value="4800">4800</option>
                        <option value="9600">9600</option>
                        <option value="19200">19200</option>
                        <option value="38400">38400</option>
                        <option value="57600">57600</option>
                        <option value="115200">115200</option>
                      </select>
                      <button
                        onClick={connectSerial}
                        className={`${serialConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} px-2 py-1 rounded text-xs`}
                      >
                        {serialConnected ? 'Disconnect' : 'Connect'}
                      </button>
                      <button
                        onClick={clearPlotData}
                        className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded h-[calc(100vh-250px)] w-full overflow-hidden" style={{ maxWidth: '100%', minHeight: '300px' }}>
                    {plotData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={plotData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fill: '#ccc', fontSize: 9 }}
                            tickFormatter={(value) => value.toString().split(':')[2]}
                            height={20}
                          />
                          <YAxis 
                            tick={{ fill: '#ccc', fontSize: 9 }}
                            domain={['auto', 'auto']}
                            width={40}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }}
                            labelStyle={{ color: '#ccc' }}
                          />
                          <Legend wrapperStyle={{ color: '#ccc' }} height={20} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                            isAnimationActive={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No data available. Connect to a serial port to start plotting.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Library Manager Modal */}
      {showLibraryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Library Manager</h3>
            
            {/* Search Box */}
            <div className="mb-4">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Search libraries..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l text-sm"
                />
                <button
                  onClick={() => searchLibraries(librarySearchQuery)}
                  disabled={isSearchingLibraries}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-r"
                >
                  {isSearchingLibraries ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Installed Libraries */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Installed Libraries</h4>
              <div className="max-h-32 overflow-y-auto bg-gray-700 rounded p-2">
                {libraries.length === 0 ? (
                  <p className="text-gray-400 text-sm">No libraries installed</p>
                ) : (
                  libraries.map((lib, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b border-gray-600">
                      <div>
                        <span className="text-sm font-medium">{lib.name}</span>
                        <span className="text-xs text-gray-400 ml-2">v{lib.version}</span>
                        {lib.author && <div className="text-xs text-gray-500">by {lib.author}</div>}
                      </div>
                      <button 
                        onClick={() => {
                          // TODO: Implement uninstall
                          console.log('Uninstall', lib.name);
                        }}
                        className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Available Libraries */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Available Libraries</h4>
              <div className="max-h-60 overflow-y-auto bg-gray-700 rounded p-2">
                {availableLibraries.length === 0 ? (
                  <p className="text-gray-400 text-sm">Search for libraries to install</p>
                ) : (
                  availableLibraries.map((lib, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-600">
                      <div>
                        <span className="text-sm font-medium">{lib.name}</span>
                        <span className="text-xs text-gray-400 ml-2">v{lib.latest?.version}</span>
                        <p className="text-xs text-gray-500 mt-1">{lib.latest?.sentence}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {lib.isInstalled ? (
                          <div className="text-xs text-green-400 mb-1">Installed</div>
                        ) : (
                          <button 
                            onClick={() => installLibrary(lib.name)}
                            disabled={lib.isInstalling}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
                          >
                            {lib.isInstalling ? 'Installing...' : 'Install'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowLibraryManager(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board Manager Modal */}
      {showBoardManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-[700px] max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Board Manager</h3>
            
            {/* Installed Cores */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Installed Cores</h4>
              <div className="max-h-40 overflow-y-auto bg-gray-700 rounded p-2">
                {cores.length === 0 ? (
                  <p className="text-gray-400 text-sm">No cores installed</p>
                ) : (
                  cores.map((core, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-600">
                      <div>
                        <span className="text-sm font-medium">{core.id}</span>
                        <span className="text-xs text-gray-400 ml-2">v{core.installed_version}</span>
                        <div className="text-xs text-gray-500">by {core.maintainer}</div>
                      </div>
                      <button 
                        onClick={() => {
                          // TODO: Implement uninstall
                          console.log('Uninstall core', core.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Available Platforms */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Available Platforms</h4>
              <div className="max-h-80 overflow-y-auto bg-gray-700 rounded p-2">
                {availablePlatforms.length === 0 ? (
                  <p className="text-gray-400 text-sm">Loading available platforms...</p>
                ) : (
                  availablePlatforms.map((platform, index) => {
                    const isInstalled = cores.some(core => core.id === platform.id);
                    const latestVersion = platform.latest_version || 'N/A';
                    
                    return (
                      <div key={index} className="py-3 border-b border-gray-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{platform.id}</div>
                            <div className="text-xs text-gray-400">by {platform.maintainer}</div>
                            <div className="text-xs text-gray-500">Latest: v{latestVersion}</div>
                            {platform.releases && platform.releases[latestVersion] && (
                              <div className="text-xs text-gray-500 mt-1">
                                {platform.releases[latestVersion].name}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-xs text-gray-400 mb-1">
                              {isInstalled ? 'Installed' : 'Not Installed'}
                            </div>
                            {!isInstalled && (
                              <button 
                                onClick={() => installCore(platform.id)}
                                disabled={platform.isInstalling}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded text-xs"
                              >
                                {platform.isInstalling ? 'Installing...' : 'Install'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowBoardManager(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add UserProfile to the header
const AppHeader = ({ title, onNewFile, onNewCircuit, onOpenFile, onSaveFile, onCompileAndUpload, onToggleSerialMonitor, onToggleSettings }) => {
  const handleSaveClick = () => {
    console.log('Save button clicked');
    onSaveFile();
  };

  return (
    <header className="app-header">
      <div className="app-title">{title}</div>
      <div className="header-buttons">
        <button onClick={onNewFile} title="New Arduino Sketch">
          <Plus size={18} />
        </button>
        <button onClick={onNewCircuit} title="New Circuit Design">
          <Code size={18} />
        </button>
        <button onClick={onOpenFile} title="Open File">
          <FolderOpen size={18} />
        </button>
        <button 
          onClick={handleSaveClick} 
          title="Save File"
          style={{ backgroundColor: '#4CAF50' }} // Make the save button more visible
        >
          <Save size={18} />
        </button>
        <button onClick={onCompileAndUpload} title="Compile and Upload">
          <Play size={18} />
        </button>
        <button onClick={onToggleSerialMonitor} title="Serial Monitor">
          <Monitor size={18} />
        </button>
        <button onClick={onToggleSettings} title="Settings">
          <Settings size={18} />
        </button>
      </div>
      <UserProfile />
    </header>
  );
};

// Main App with routing
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={<ArduinoCodeEditor />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;