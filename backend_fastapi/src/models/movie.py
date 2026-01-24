from pydantic import BaseModel

class MovieName(BaseModel):
    tmdb_id: str
    movie_title: str
