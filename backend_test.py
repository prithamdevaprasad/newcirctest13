#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Arduino Editor + CircuitDesigner Integration
Tests both Arduino Editor and Circuit Designer functionality
"""

import requests
import json
import time
import sys
from pathlib import Path

# Backend URL from frontend/.env
BACKEND_URL = "https://5ab4535e-6a2b-4d01-a635-d570a7105a46.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.results = {
            "arduino_editor": {},
            "circuit_designer": {},
            "integration": {}
        }
        self.session = requests.Session()
        self.session.timeout = 30
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def test_endpoint(self, method, endpoint, data=None, expected_status=200):
        """Test a single endpoint"""
        url = f"{BACKEND_URL}{endpoint}"
        try:
            self.log(f"Testing {method} {endpoint}")
            
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            result = {
                "success": response.status_code == expected_status,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds()
            }
            
            try:
                result["data"] = response.json()
            except:
                result["data"] = response.text[:500]  # First 500 chars if not JSON
                
            if not result["success"]:
                self.log(f"FAILED: {method} {endpoint} - Status: {response.status_code}", "ERROR")
                if hasattr(response, 'text'):
                    self.log(f"Response: {response.text[:200]}", "ERROR")
            else:
                self.log(f"SUCCESS: {method} {endpoint}")
                
            return result
            
        except Exception as e:
            self.log(f"ERROR: {method} {endpoint} - {str(e)}", "ERROR")
            return {"success": False, "error": str(e)}
    
    def test_arduino_editor_apis(self):
        """Test all Arduino Editor APIs"""
        self.log("=== Testing Arduino Editor APIs ===")
        
        # Test basic API root
        self.results["arduino_editor"]["root"] = self.test_endpoint("GET", "/")
        
        # Test boards endpoints
        self.results["arduino_editor"]["boards"] = self.test_endpoint("GET", "/boards")
        self.results["arduino_editor"]["boards_available"] = self.test_endpoint("GET", "/boards/available")
        
        # Test cores endpoints
        self.results["arduino_editor"]["cores"] = self.test_endpoint("GET", "/cores")
        self.results["arduino_editor"]["cores_search"] = self.test_endpoint("GET", "/cores/search")
        
        # Test ports endpoint
        self.results["arduino_editor"]["ports"] = self.test_endpoint("GET", "/ports")
        
        # Test libraries endpoints
        self.results["arduino_editor"]["libraries"] = self.test_endpoint("GET", "/libraries")
        self.results["arduino_editor"]["libraries_search"] = self.test_endpoint("POST", "/libraries/search", {"query": "Servo"})
        
        # Test workspace endpoint
        self.results["arduino_editor"]["workspace"] = self.test_endpoint("GET", "/workspace")
        
        # Test file operations with sample Arduino code
        sample_code = """
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
"""
        
        # Test file save
        file_data = {
            "path": "/tmp/arduino_workspace/test_sketch.ino",
            "content": sample_code
        }
        self.results["arduino_editor"]["file_save"] = self.test_endpoint("POST", "/files", file_data)
        
        # Test file load
        self.results["arduino_editor"]["file_load"] = self.test_endpoint("GET", "/files?path=/tmp/arduino_workspace/test_sketch.ino")
        
        # Test compile (this might fail without proper Arduino CLI setup, but we test the endpoint)
        compile_data = {
            "code": sample_code,
            "board": "arduino:avr:uno",
            "sketch_path": "/tmp/arduino_workspace/test_sketch"
        }
        self.results["arduino_editor"]["compile"] = self.test_endpoint("POST", "/compile", compile_data)
        
    def test_circuit_designer_apis(self):
        """Test Circuit Designer APIs"""
        self.log("=== Testing Circuit Designer APIs ===")
        
        # Test components endpoint
        self.results["circuit_designer"]["components"] = self.test_endpoint("GET", "/components")
        
        # Test component SVG endpoints (test with component ID 1)
        self.results["circuit_designer"]["component_svg_icon"] = self.test_endpoint("GET", "/components/1/svg/icon")
        self.results["circuit_designer"]["component_svg_breadboard"] = self.test_endpoint("GET", "/components/1/svg/breadboard")
        
        # Validate components structure if successful
        components_result = self.results["circuit_designer"]["components"]
        if components_result.get("success") and isinstance(components_result.get("data"), dict):
            data = components_result["data"]
            if data.get("success") and "components" in data:
                components = data["components"]
                self.log(f"Found {len(components)} components")
                
                # Validate component structure
                if components:
                    sample_component = components[0]
                    required_fields = ["id", "fritzingId", "title", "connectors"]
                    missing_fields = [field for field in required_fields if field not in sample_component]
                    
                    if missing_fields:
                        self.log(f"WARNING: Component missing fields: {missing_fields}", "WARN")
                    else:
                        self.log("Component structure validation: PASSED")
                        
                    # Log sample component info
                    self.log(f"Sample component: {sample_component.get('title', 'Unknown')} (ID: {sample_component.get('id')})")
            else:
                self.log("WARNING: Components API returned success=false or no components", "WARN")
        
    def test_integration(self):
        """Test integration between Arduino Editor and Circuit Designer"""
        self.log("=== Testing Integration ===")
        
        # Test that both APIs work simultaneously
        start_time = time.time()
        
        # Make concurrent-like requests to both systems
        arduino_result = self.test_endpoint("GET", "/boards")
        circuit_result = self.test_endpoint("GET", "/components")
        
        end_time = time.time()
        
        self.results["integration"]["concurrent_access"] = {
            "success": arduino_result.get("success", False) and circuit_result.get("success", False),
            "arduino_working": arduino_result.get("success", False),
            "circuit_working": circuit_result.get("success", False),
            "total_time": end_time - start_time
        }
        
        # Test that adding circuit endpoints didn't break Arduino functionality
        # Compare with previous Arduino results
        arduino_boards_working = self.results["arduino_editor"]["boards"].get("success", False)
        self.results["integration"]["arduino_not_broken"] = {
            "success": arduino_boards_working,
            "message": "Arduino APIs still functional after circuit integration"
        }
        
    def run_all_tests(self):
        """Run all tests"""
        self.log("Starting comprehensive backend testing...")
        
        try:
            self.test_arduino_editor_apis()
            self.test_circuit_designer_apis()
            self.test_integration()
            
            self.log("=== TEST SUMMARY ===")
            self.print_summary()
            
        except Exception as e:
            self.log(f"CRITICAL ERROR during testing: {str(e)}", "ERROR")
            return False
            
        return True
    
    def print_summary(self):
        """Print test summary"""
        
        # Arduino Editor Summary
        arduino_tests = self.results["arduino_editor"]
        arduino_passed = sum(1 for test in arduino_tests.values() if test.get("success", False))
        arduino_total = len(arduino_tests)
        
        self.log(f"Arduino Editor APIs: {arduino_passed}/{arduino_total} passed")
        for test_name, result in arduino_tests.items():
            status = "✅" if result.get("success", False) else "❌"
            self.log(f"  {status} {test_name}")
            if not result.get("success", False) and "error" in result:
                self.log(f"    Error: {result['error']}")
        
        # Circuit Designer Summary  
        circuit_tests = self.results["circuit_designer"]
        circuit_passed = sum(1 for test in circuit_tests.values() if test.get("success", False))
        circuit_total = len(circuit_tests)
        
        self.log(f"Circuit Designer APIs: {circuit_passed}/{circuit_total} passed")
        for test_name, result in circuit_tests.items():
            status = "✅" if result.get("success", False) else "❌"
            self.log(f"  {status} {test_name}")
            if not result.get("success", False) and "error" in result:
                self.log(f"    Error: {result['error']}")
        
        # Integration Summary
        integration_tests = self.results["integration"]
        integration_passed = sum(1 for test in integration_tests.values() if test.get("success", False))
        integration_total = len(integration_tests)
        
        self.log(f"Integration Tests: {integration_passed}/{integration_total} passed")
        for test_name, result in integration_tests.items():
            status = "✅" if result.get("success", False) else "❌"
            self.log(f"  {status} {test_name}")
        
        # Overall Summary
        total_passed = arduino_passed + circuit_passed + integration_passed
        total_tests = arduino_total + circuit_total + integration_total
        
        self.log(f"OVERALL: {total_passed}/{total_tests} tests passed ({total_passed/total_tests*100:.1f}%)")
        
        return {
            "arduino_editor": {"passed": arduino_passed, "total": arduino_total},
            "circuit_designer": {"passed": circuit_passed, "total": circuit_total},
            "integration": {"passed": integration_passed, "total": integration_total},
            "overall": {"passed": total_passed, "total": total_tests}
        }

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if not success:
        sys.exit(1)