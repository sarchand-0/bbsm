import sys
import os

# Make backend package importable from the repo root
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from app.main import app
from mangum import Mangum

# lifespan="off" because Vercel serverless has no persistent process
handler = Mangum(app, lifespan="off")
