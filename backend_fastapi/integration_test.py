import requests

def test_backend():
    base_url = "http://localhost:8000"
    
    # 1. Sync User
    user_data = {"clerk_id": "user_789", "email": "jane@example.com", "username": "JaneCinephile"}
    resp = requests.post(f"{base_url}/auth/sync-user", json=user_data)
    print(f"User Sync: {resp.status_code} - {resp.json()}")

    # 2. Add a movie to DB (needed for FB/History)
    # We'll trigger /summarize that adds it if not exists
    movie_data = {"moviename": "The Matrix (1999)"}
    # Skip actual generation as it might take long, just check insertion
    # Actually, we can check /movies/ to see if it's there
    
    # 3. Test Feedback
    # (Assuming user_id=1 and movie_id=1 for now, or fetch dynamically)
    # Let's get the user ID first
    user_id = resp.json().get('id')
    
    # Trigger a movie discovery
    requests.post(f"{base_url}/summarize", json=movie_data)
    
    # Get movie ID
    movies_resp = requests.get(f"{base_url}/movies/")
    movie_id = movies_resp.json()[0]['id'] if movies_resp.json() else 1
    
    fb_data = {
        "clerk_id": "user_789",
        "movie_title": "The Matrix (1999)",
        "rating": 5,
        "comment": "Mind-blowing philosopher persona!",
        "persona": "philosopher"
    }
    fb_resp = requests.post(f"{base_url}/feedback", json=fb_data)
    print(f"Feedback: {fb_resp.status_code} - {fb_resp.json()}")

if __name__ == "__main__":
    test_backend()
