from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from src.core.rag_chat import answer_question_stream
from src.db.database import get_db
from src.models import sql_models
from sqlalchemy.orm import Session
import json

router = APIRouter()

@router.websocket("/ws/chat/{movie}/{thread_id}")
async def websocket_chat(websocket: WebSocket, movie: str, thread_id: str, clerk_id: str = None):
    # websocket endpoint for streaming rag chat
    await websocket.accept()
    
    # Get DB session (hand-managed for websocket)
    db = next(get_db())
    
    try:
        # Link user if clerk_id provided
        db_user = None
        if clerk_id:
            db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == clerk_id).first()
        
        # Ensure movie exists
        db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == movie).first()
        if not db_movie:
            db_movie = sql_models.Movie(title=movie, status=sql_models.JobStatus.PENDING)
            db.add(db_movie)
            db.commit()
            db.refresh(db_movie)

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
            
            persona = message_data.get("persona", "critic")
            
            # Save user message to history
            user_msg = sql_models.ChatHistory(
                thread_id=thread_id,
                user_id=db_user.id if db_user else None,
                movie_id=db_movie.id,
                role="user",
                message=question,
                persona=persona
            )
            db.add(user_msg)
            db.commit()
            
            try:
                # Get persona from message or default to critic
                persona = message_data.get("persona", "critic")
                
                # stream answer tokens via websocket
                full_answer = []
                citations = []
                async for item in answer_question_stream(movie, question, persona=persona, thread_id=thread_id):
                    if item["type"] == "citations":
                        citations.extend(item["ids"])
                        await websocket.send_json(item)
                        continue
                    
                    token = item["token"]
                    full_answer.append(token)
                    await websocket.send_json({
                        "type": "token",
                        "token": token
                    })
                
                # signal completion
                await websocket.send_json({"type": "done"})
                
                # Save assistant message to history
                assistant_msg = sql_models.ChatHistory(
                    thread_id=thread_id,
                    user_id=db_user.id if db_user else None,
                    movie_id=db_movie.id,
                    role="assistant",
                    message="".join(full_answer),
                    citations=json.dumps(citations),
                    persona=persona
                )
                db.add(assistant_msg)
                db.commit()
                
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
        print(f"Client disconnected from chat for movie: {movie}, thread: {thread_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        await websocket.close()
    finally:
        db.close()