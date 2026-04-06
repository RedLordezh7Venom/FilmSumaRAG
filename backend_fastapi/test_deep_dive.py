import requests
import json

def test_deep_dive():
    base_url = "http://localhost:8002"
    
    # 1. Comparative Deep Dive request
    # This uses streaming SSE, so we should use requests.post(..., stream=True)
    payload = {
        "movie": ["Inception", "Interstellar"],
        "question": "How do both movies handle the concept of time dilation and human emotion?",
        "thread_id": "thread_comparative_1",
        "persona": "philosopher"
    }
    
    with requests.post(f"{base_url}/deep_dive", json=payload, stream=True) as r:
        for line in r.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    data_str = decoded_line[6:]
                    if data_str == "[DONE]":
                        print("\n[DONE]")
                        break
                    try:
                        data = json.loads(data_str)
                        if "token" in data:
                            print(data["token"], end="", flush=True)
                        elif "type" in data and data["type"] == "citations":
                            print(f"\n[CITATIONS: {data['ids']}]\n")
                    except json.JSONDecodeError:
                        print(f"\n[ERROR] Malformed JSON: {data_str}")

if __name__ == "__main__":
    test_deep_dive()
