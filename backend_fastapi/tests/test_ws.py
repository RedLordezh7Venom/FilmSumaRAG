import asyncio
import websockets
import json

async def test_chat():
    uri = "ws://localhost:8000/ws/chat/27206/test-thread"
    async with websockets.connect(uri) as websocket:
        # Send a question
        question_data = {
            "question": "What is the main plot of this movie according to the dialogue?",
            "persona": "critic",
            "movies": [27206]
        }
        await websocket.send(json.dumps(question_data))
        
        print("Sent question, waiting for response...")
        
        full_answer = ""
        while True:
            try:
                msg = await websocket.recv()
                data = json.loads(msg)
                
                if data["type"] == "token":
                    print(data["token"], end="", flush=True)
                    full_answer += data["token"]
                elif data["type"] == "citations":
                    print(f"\n[Citations: {len(data['ids'])} chunks]")
                elif data["type"] == "done":
                    print("\n[Done]")
                    break
                elif data["type"] == "error":
                    print(f"\n[Error]: {data['message']}")
                    break
            except Exception as e:
                print(f"Error: {e}")
                break

if __name__ == "__main__":
    asyncio.run(test_chat())
