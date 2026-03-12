import logging
import os
from logging.handlers import RotatingFileHandler

# Define the log directory
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "parliascope.log")

def setup_logger():
    # Create a custom logger
    logger = logging.getLogger("parliascope")
    logger.setLevel(logging.INFO)

    # Avoid adding duplicate handlers if the logger is requested multiple times
    if not logger.handlers:
        # Create handlers
        c_handler = logging.StreamHandler()
        f_handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=5)
        
        c_handler.setLevel(logging.INFO)
        f_handler.setLevel(logging.INFO)

        # Create formatters and add it to handlers
        c_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        f_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        c_handler.setFormatter(c_format)
        f_handler.setFormatter(f_format)

        # Add handlers to the logger
        logger.addHandler(c_handler)
        logger.addHandler(f_handler)

    return logger

logger = setup_logger()
