from sentence_transformers import SentenceTransformer
import warnings

# Suppress warnings from transformers if any
warnings.filterwarnings("ignore")

# Load model globally to avoid reloading on every request (singleton pattern)
# 'all-mpnet-base-v2' is a good balance of speed and quality (768 dimensions)
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer('all-mpnet-base-v2')
    return _model

def get_embedding(text: str):
    """Generates a 768-dimensional embedding for the input text."""
    model = get_model()
    # encode returns a numpy array, convert to list for DB storage
    return model.encode(text).tolist()
