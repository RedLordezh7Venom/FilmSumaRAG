import requests
import json
import uuid

def test_deep_dive(movie: str, question: str, persona: str = "critic"):
    url = "http://localhost:8000/api/deep_dive"
    thread_id = str(uuid.uuid4())
    
    payload = {
        "movie": movie,
        "question": question,
        "thread_id": thread_id,
        "persona": persona
    }
    
    print(f"🚀 Testing '{movie}' - Question: '{question}' - Persona: '{persona}'")
    
    try:
        with requests.post(url, json=payload, stream=True, timeout=30) as r:
            if r.status_code != 200:
                print(f"❌ Failed: {r.status_code} - {r.text}")
                return
            
            full_answer = ""
            citations = []
            for line in r.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data: "):
                        data_content = decoded_line[6:].strip()
                        if data_content == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_content)
                            if data.get("type") == "citations":
                                citations = data["ids"]
                                print(f"🔗 Received {len(citations)} citations")
                            elif data.get("token"):
                                full_answer += data["token"]
                        except Exception as e:
                            print(f"⚠️ Error parsing data: {e} | Content: {data_content}")
            
            print(f"\n✅ FULL ANSWER RECEIVED ({len(full_answer)} chars)")
            print(f"Sample: {full_answer[:150]}...")
            if "🎞️ SCENE EVIDENCE" in full_answer:
                print("✨ SUCCESS: Citations found in the response body!")
            else:
                print("⚠️ WARNING: No 'SCENE EVIDENCE' section found in the AI response.")
                
            return thread_id
            
    except Exception as e:
        print(f"❌ Request Error: {e}")

if __name__ == "__main__":
    # Test 1: Single Movie Analysis
    thread = test_deep_dive("2001: A space odyssey", "What is the significance of the monolith?", persona="philosopher")
    
    # Test 2: Multi-Movie Comparison (if we have another movie)
    # test_deep_dive(["2001: A space odyssey", "FAST AND THE FURIOUS"], "Compare the themes of journey.")
