from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
import zipfile

class SubtitleDownloader:
    def __init__(self):
        try:
            # Set up Chrome options
            self.options = Options()
            self.options.add_argument("--no-sandbox")
            self.options.add_argument("--disable-dev-shm-usage")
            
            # Set download directory to project folder
            current_dir = os.getcwd()
            prefs = {
                "download.default_directory": current_dir,
                "download.prompt_for_download": False,
                "download.directory_upgrade": True
            }
            self.options.add_experimental_option("prefs", prefs)
            
            # Initialize the driver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=self.options)
            self.wait = WebDriverWait(self.driver, 10)
            
        except Exception as e:
            print(f"Error initializing WebDriver: {str(e)}")
            raise

    def download_subtitles(self, movie_name: str, year: str = None):
        try:
            # Navigate to OpenSubtitles
            print("Navigating to OpenSubtitles...")
            self.driver.get("https://www.opensubtitles.org/en/search/sublanguageid-eng")
            
            # Wait for and find the search box using the correct ID
            print("Looking for search box...")
            search_box = self.wait.until(
                EC.presence_of_element_located((By.ID, "search_text"))
            )
            
            # Enter movie name and year if provided
            search_term = f"{movie_name} {year}" if year else movie_name
            print(f"Searching for: {search_term}")
            search_box.clear()
            search_box.send_keys(search_term)
            search_box.send_keys(Keys.RETURN)
            
            # Wait for search results
            print("Waiting for search results...")
            time.sleep(3)
            
            try:
                # Find subtitle links with explicit wait
                print("Looking for subtitle links...")
                subtitle_table = self.wait.until(
                    EC.presence_of_element_located((By.ID, "search_results"))
                )
                
                subtitle_links = subtitle_table.find_elements(By.CSS_SELECTOR, "a[href*='/en/subtitles/']")
                
                if not subtitle_links:
                    print("No subtitles found!")
                    return False
                
                # Click the first valid subtitle link
                print("Clicking first available subtitle link...")
                for link in subtitle_links:
                    if "subtitles" in link.get_attribute("href"):
                        self.driver.execute_script("arguments[0].click();", link)
                        break
                
                # Wait for and click the download button
                print("Looking for download button...")
                download_button = self.wait.until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "a.download"))
                )
                
                if download_button:
                    print("Clicking download button...")
                    self.driver.execute_script("arguments[0].click();", download_button)
                    time.sleep(5)  # Wait for download to start
                    print(f"Subtitles for {movie_name} downloaded successfully!")
                    return True
                else:
                    print("Download button not found!")
                    return False
                
            except Exception as e:
                print(f"Error during download process: {str(e)}")
                return False
                
        except Exception as e:
            print(f"An error occurred: {str(e)}")
            return False

    def cleanup(self):
        try:
            print("Cleaning up...")
            if hasattr(self, 'driver'):
                self.driver.quit()
            
            # Find and extract any downloaded zip files
            for file in os.listdir():
                if file.endswith('.zip'):
                    print(f"Found zip file: {file}")
                    # Create subtitles directory if it doesn't exist
                    if not os.path.exists('subtitles'):
                        os.makedirs('subtitles')
                    
                    # Extract the zip file
                    with zipfile.ZipFile(file, 'r') as zip_ref:
                        zip_ref.extractall('subtitles')
                    
                    # Remove the zip file
                    os.remove(file)
                    print(f"Extracted subtitles to 'subtitles' folder and removed {file}")
                    
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")

def main():
    downloader = None
    try:
        print("Initializing subtitle downloader...")
        downloader = SubtitleDownloader()
        
        movie_name = input("Enter movie name: ")
        year = input("Enter year (optional, press Enter to skip): ")
        
        # Download subtitles
        success = downloader.download_subtitles(movie_name, year if year.strip() else None)
        
        if success:
            print("Waiting for download to complete...")
            time.sleep(5)  # Give time for download to finish
    
    except Exception as e:
        print(f"Main process error: {str(e)}")
    
    finally:
        # Clean up and close browser
        if downloader:
            downloader.cleanup()

if __name__ == "__main__":
    main()