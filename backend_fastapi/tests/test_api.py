import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.models.movie import MovieName
from unittest.mock import patch

client = TestClient(app)

@pytest.fixture
def mock_get_movie_summary():
    with patch('src.api.endpoints.summary.get_movie_summary') as mock:
        yield mock

def test_summarize_movie_success(mock_get_movie_summary):
    mock_get_movie_summary.return_value = "This is a test summary."
    response = client.post("/summarize", json={"moviename": "test_movie"})
    assert response.status_code == 200
    assert response.json() == "This is a test summary."
    mock_get_movie_summary.assert_called_once_with("test_movie")

def test_summarize_movie_file_not_found(mock_get_movie_summary):
    mock_get_movie_summary.side_effect = FileNotFoundError("test_movie.en_text.txt")
    response = client.post("/summarize", json={"moviename": "non_existent_movie"})
    assert response.status_code == 404
    assert response.json() == {"detail": "File not found: None"}

def test_summarize_movie_internal_error(mock_get_movie_summary):
    mock_get_movie_summary.side_effect = Exception("Something went wrong.")
    response = client.post("/summarize", json={"moviename": "error_movie"})
    assert response.status_code == 500
    assert response.json() == {"detail": "Something went wrong."}
