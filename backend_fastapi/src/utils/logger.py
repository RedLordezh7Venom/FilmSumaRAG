import logging
import sys
import colorama
from colorama import Fore, Style

# Initialize colorama for Windows terminal support
colorama.init()

class ArchiveLogger:
    def __init__(self):
        self.logger = logging.getLogger("FilmSuma")
        self.logger.setLevel(logging.DEBUG)
        
        # Format: [TAG] Message
        formatter = logging.Formatter('%(message)s')
        
        # Console Handler
        ch = logging.StreamHandler(sys.stdout)
        ch.setFormatter(formatter)
        self.logger.addHandler(ch)

    def log(self, tag, message, color=Fore.WHITE):
        """Standardized tagged logging"""
        formatted_msg = f"{Style.BRIGHT}{color}[{tag}]{Style.RESET_ALL} {message}"
        self.logger.info(formatted_msg)

    # Specific helper tags
    def rag(self, message): self.log("🔍 RAG::RETRIEVE", message, Fore.CYAN)
    def active_learning(self, message): self.log("⚖️ RAG::PENALTY", message, Fore.YELLOW)
    def agent(self, message): self.log("🧠 AGENTS::THINK", message, Fore.MAGENTA)
    def db(self, message): self.log("💾 DB::ARCHIVE", message, Fore.GREEN)
    def error(self, message): self.log("🚨 SYSTEM::ERROR", message, Fore.RED)
    def worker(self, message): self.log("👷 WORKER::TASK", message, Fore.BLUE)
    def fetch(self, message): self.log("📥 FETCH::DATA", message, Fore.WHITE)

logger = ArchiveLogger()
