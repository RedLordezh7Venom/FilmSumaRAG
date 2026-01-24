from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.core.rag_chat import answer_question_stream
import json

router = APIRouter()

@router.websocket("/ws/chat/{movie}")
async def websocket_chat(websocket: WebSocket, movie: str):
    # websocket endpoint for streaming rag chat
    await websocket.accept()
    
    try:
        while True:
            # receive question from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            question = message_data.get("question", "")
            
            if not question:
                await websocket.send_json({
                    "type": "error",
                    "message": "Question cannot be empty"
                })
                continue
            
            try:
                # stream answer tokens via websocket
                async for token in answer_question_stream(movie, question):
                    await websocket.send_json({
                        "type": "token",
                        "token": token
                    })
                
                # signal completion
                await websocket.send_json({"type": "done"})
                
            except FileNotFoundError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Embeddings not ready yet. Please wait or try again."
                })
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error processing question: {str(e)}"
                })
                
    except WebSocketDisconnect:
        print(f"Client disconnected from chat for movie: {movie}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        await websocket.close()