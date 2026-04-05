from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from src.db.database import get_db
from src.models import sql_models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.MovieResponse])
def list_movies(db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).all()

@router.get("/{movie_id}", response_model=schemas.MovieResponse)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).get(movie_id)
