from pydantic import BaseModel

class MovieName(BaseModel):
    moviename: str
