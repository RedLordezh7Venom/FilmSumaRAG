import requests
import uuid
import time

BASE_URL = "http://localhost:8000"

def test_discussions():
    print("--- Testing Discussions (Forum) ---")
    
    movies = requests.get(f"{BASE_URL}/movies/").json()
    if not movies:
        print("No movies found, creating Inception (ID: 1)...")
        # Creating a movie manually via the DB is easier through the endpoint but we can just use the summarize endpoint to trigger it.
        # But for the forum we need the movie_id.
        # Let's use a raw POST to /movies/ if we had it, but /movies/ is only GET.
        # Let's use /summarize which auto-creates.
        requests.post(f"{BASE_URL}/summarize", json={"moviename": "Inception (2010)"})
        # Try fetching again
        movies = requests.get(f"{BASE_URL}/movies/").json()
        if not movies:
            print("Failed to create movie automatically.")
            return

    movie_id = movies[0]['id']
    movie_title = movies[0]['title']
    print(f"Testing on movie: {movie_title} (ID: {movie_id})")

    # 2. Test Anonymous Posting
    post_data = {
        "title": "Anonymous Review",
        "content": "This is an anonymous post testing the discussion board."
    }
    resp = requests.post(f"{BASE_URL}/discussions/boards/{movie_id}/posts", json=post_data)
    print(f"POST Anonymous Post Status: {resp.status_code}")
    if resp.status_code == 200:
        post = resp.json()
        print(f"Post Created: {post['post_number']} - {post['title']}")
        post_id = post['id']
        
        # 3. Test Anonymous Reply
        reply_data = {
            "content": "I agree with this anonymous review!"
        }
        resp_reply = requests.post(f"{BASE_URL}/discussions/threads/{post_id}/replies", json=reply_data)
        print(f"POST Anonymous Reply Status: {resp_reply.status_code}")
        if resp_reply.status_code == 200:
            reply = resp_reply.json()
            print(f"Reply Created: {reply['reply_number']}")

        # 4. Get posts for movie
        resp_get = requests.get(f"{BASE_URL}/discussions/boards/{movie_id}/posts")
        print(f"GET Posts Status: {resp_get.status_code}")
        if resp_get.status_code == 200:
            posts = resp_get.json()
            # Verify the last created post has our reply
            found = False
            for p in posts:
                if p['id'] == post_id:
                    print(f"Verified Post {post_id} retrieved with {len(p['replies'])} replies.")
                    found = True
                    break
            if not found:
                print("Failed to find the created post in retrieval.")

def test_chat_persistence():
    print("\n--- Testing Chat Persistence (UUID) ---")
    
    # 1. Sync a mock user
    user_data = {
        "clerk_id": "test_persistence_user",
        "email": "persist@example.com",
        "username": "PersistMaster"
    }
    requests.post(f"{BASE_URL}/auth/sync-user", json=user_data)
    
    movies = requests.get(f"{BASE_URL}/movies/").json()
    if not movies:
        print("No movies found, skipping chat persistence test.")
        return
    movie_id = movies[0]['id']
    movie_title = movies[0]['title']
    
    thread_id = str(uuid.uuid4())
    print(f"Generated Thread ID: {thread_id}")

    # 2. Save a few messages
    messages = [
        {"role": "user", "message": "Hello, tell me about Inception."},
        {"role": "assistant", "message": "Inception is a 2010 film about dreams."}
    ]
    
    for msg in messages:
        payload = {
            "thread_id": thread_id,
            "user_id": 1, # Mock user id (usually we'd get this from sync-user response)
            "movie_id": movie_id,
            "role": msg['role'],
            "message": msg['message'],
            "persona": "critic"
        }
        # Fetching latest user id to be precise
        user_info = requests.get(f"{BASE_URL}/auth/user/test_persistence_user").json()
        payload["user_id"] = user_info["id"]
        
        resp = requests.post(f"{BASE_URL}/history/chat-history", json=payload)
        print(f"Saved {msg['role']} message: {resp.status_code}")

    # 3. Retrieve history by Thread ID
    start_time = time.time()
    resp_history = requests.get(f"{BASE_URL}/history/chat-history/thread/{thread_id}")
    end_time = time.time()
    
    print(f"GET Thread History Status: {resp_history.status_code}")
    if resp_history.status_code == 200:
        history = resp_history.json()
        print(f"Retrieved {len(history)} messages.")
        print(f"Retrieval time: {(end_time - start_time)*1000:.2f}ms")
        for m in history:
            print(f"  [{m['role']}]: {m['message'][:30]}...")

if __name__ == "__main__":
    try:
        test_discussions()
        test_chat_persistence()
    except Exception as e:
        print(f"Test Failed: {e}")
