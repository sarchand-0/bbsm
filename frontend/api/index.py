import sys
import os

# backend-vendor/ is copied here by the Vercel build command
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend-vendor"))

from app.main import app  # noqa: E402
from mangum import Mangum  # noqa: E402

handler = Mangum(app, lifespan="off")
