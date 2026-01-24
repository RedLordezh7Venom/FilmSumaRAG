"""
FilmSumaRAG - System Verification Script
Run this to verify your installation is working correctly
"""

import os
import sys
import requests
import json

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_info(text):
    print(f"ℹ️  {text}")

def check_backend_health():
    """Check if backend is running"""
    print_header("Checking Backend Health")
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success("Backend is running!")
            print_info(f"Version: {data.get('version', 'Unknown')}")
            print_info(f"Status: {data.get('status', 'Unknown')}")
            return True
        else:
            print_error(f"Backend returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Backend is not running!")
        print_info("Start it with: uvicorn src.main:app --reload")
        return False
    except Exception as e:
        print_error(f"Error connecting to backend: {str(e)}")
        return False

def check_api_docs():
    """Check if API documentation is accessible"""
    print_header("Checking API Documentation")
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print_success("API docs accessible at http://localhost:8000/docs")
            return True
        else:
            print_error("API docs not accessible")
            return False
    except Exception as e:
        print_error(f"Error accessing API docs: {str(e)}")
        return False

def check_directories():
    """Check if required directories exist"""
    print_header("Checking Directory Structure")
    
    required_dirs = [
        "data/embeddings",
        "data/summaries"
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        if os.path.exists(dir_path):
            print_success(f"Directory exists: {dir_path}")
        else:
            print_error(f"Directory missing: {dir_path}")
            print_info(f"Creating: {dir_path}")
            try:
                os.makedirs(dir_path, exist_ok=True)
                print_success(f"Created: {dir_path}")
            except Exception as e:
                print_error(f"Failed to create: {str(e)}")
                all_exist = False
    
    return all_exist

def check_dependencies():
    """Check if required Python packages are installed"""
    print_header("Checking Python Dependencies")
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "websockets",
        "sentence_transformers",
        "sklearn",
        "numpy",
        "langchain",
        "subliminal",
        "pysubs2"
    ]
    
    all_installed = True
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print_success(f"{package} is installed")
        except ImportError:
            print_error(f"{package} is NOT installed")
            all_installed = False
    
    if not all_installed:
        print_info("Install missing packages with: pip install -r requirements.txt")
    
    return all_installed

def check_env_variables():
    """Check if required environment variables are set"""
    print_header("Checking Environment Variables")
    
    # Load .env file if it exists
    env_path = ".env"
    if os.path.exists(env_path):
        print_success(".env file found")
        with open(env_path, 'r') as f:
            env_content = f.read()
            
        required_vars = ["GROQ_KEY", "GOOGLE_API_KEY"]
        all_set = True
        
        for var in required_vars:
            if var in env_content and len(env_content.split(var)[1].split('\n')[0].strip()) > 5:
                print_success(f"{var} is set")
            else:
                print_error(f"{var} is NOT set or empty")
                all_set = False
        
        return all_set
    else:
        print_error(".env file not found")
        print_info("Create .env file with GROQ_KEY and GOOGLE_API_KEY")
        return False

def test_embeddings_endpoint():
    """Test the embeddings check endpoint"""
    print_header("Testing Embeddings Endpoint")
    try:
        test_movie = "Test Movie (2024)"
        response = requests.get(
            f"http://localhost:8000/check_embeddings/{test_movie}",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print_success("Embeddings endpoint working!")
            print_info(f"Response: {json.dumps(data, indent=2)}")
            return True
        else:
            print_error(f"Endpoint returned status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error testing endpoint: {str(e)}")
        return False

def main():
    print("\n" + "🎬" * 30)
    print("  FilmSumaRAG - System Verification")
    print("🎬" * 30)
    
    # Change to backend directory if needed
    if os.path.exists("backend_fastapi"):
        os.chdir("backend_fastapi")
        print_info("Changed to backend_fastapi directory")
    
    # Run all checks
    results = {
        "Dependencies": check_dependencies(),
        "Environment Variables": check_env_variables(),
        "Directories": check_directories(),
        "Backend Health": check_backend_health(),
        "API Documentation": check_api_docs(),
        "Embeddings Endpoint": test_embeddings_endpoint()
    }
    
    # Summary
    print_header("Verification Summary")
    passed = sum(results.values())
    total = len(results)
    
    for check, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {check}")
    
    print("\n" + "-"*60)
    print(f"Results: {passed}/{total} checks passed")
    print("-"*60)
    
    if passed == total:
        print_success("All checks passed! System is ready to use! 🎉")
        print_info("Next steps:")
        print("  1. Start frontend: cd frontend_next && npm run dev")
        print("  2. Open http://localhost:3000")
        print("  3. Search for a movie and click 'Deep Dive'")
    else:
        print_error("Some checks failed. Please fix the issues above.")
        print_info("Check QUICK_START.md for detailed setup instructions")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
