from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.core.rag_chat import answer_question
import json

router = APIRouter()

@router.websocket("/ws/chat/{movie}")
async def websocket_chat(websocket: WebSocket, movie: str):
    """
    WebSocket endpoint for real-time RAG Q&A chat
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive question from client
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
                # Get answer from RAG system
                answer = await answer_question(movie, question)
                
                # Send response back to client
                await websocket.send_json({
                    "type": "answer",
                    "question": question,
                    "answer": answer
                })
                
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
