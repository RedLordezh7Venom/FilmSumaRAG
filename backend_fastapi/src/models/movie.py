from pydantic import BaseModel
from typing import Optional

class MovieName(BaseModel):
    moviename: str
    tmdb_id: Optional[int] = None
