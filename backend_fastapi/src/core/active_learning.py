from sqlalchemy.orm import Session
from src.models.sql_models import Feedback, ChatHistory
import json
from typing import Dict, List

def get_discredited_chunks(db: Session, movie_id: int) -> Dict[str, float]:
    """
    Returns a dictionary of chunk_id -> penalty_score.
    A penalty_score is incremented for every downvote or low rating.
    """
    penalties = {}
    
    # 1. Fetch all low ratings or explicit downvotes for this movie
    # We prioritize downvote=True or rating <= 2
    bad_feedback = db.query(Feedback).filter(
        Feedback.movie_id == movie_id,
        (Feedback.downvote == True) | (Feedback.rating <= 2)
    ).all()
    
    for fb in bad_feedback:
        if fb.chat_id:
            # Find the message associated with this feedback to get the citations
            chat = db.query(ChatHistory).filter(ChatHistory.id == fb.chat_id).first()
            if chat and chat.citations:
                try:
                    citation_ids = json.loads(chat.citations)
                    for cid in citation_ids:
                        # Aggressive penalty: -0.2 per downvote
                        penalties[cid] = penalties.get(cid, 0) + 0.2
                except json.JSONDecodeError:
                    continue
                    
    return penalties

def apply_penalties(ranks: Dict[str, float], penalties: Dict[str, float]) -> Dict[str, float]:
    """
    Applies the accumulated penalties to the RRF (Reciprocal Rank Fusion) scores.
    Chunks with extreme penalties are explicitly excluded.
    """
    final_scores = {}
    for cid, score in ranks.items():
        penalty = penalties.get(cid, 0)
        
        # Hard threshold for exclusion: if penalty > 0.5 (e.g. 3+ downvotes)
        # the chunk is completely removed from the result set.
        if penalty > 0.5:
            continue
            
        final_scores[cid] = score - penalty
        
    return final_scores
