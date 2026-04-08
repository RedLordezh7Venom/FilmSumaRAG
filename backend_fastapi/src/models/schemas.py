from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    clerk_id: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class SummaryBase(BaseModel):
    movie_id: int
    summary_type: str
    content: str

class SummaryResponse(SummaryBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ChatHistoryBase(BaseModel):
    thread_id: str
    role: str
    message: str
    movie_id: int
    persona: Optional[str] = "critic"

class ChatHistoryCreate(ChatHistoryBase):
    user_id: int

class ChatHistoryResponse(ChatHistoryBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class FeedbackBase(BaseModel):
    clerk_id: str
    movie_title: str
    chat_id: Optional[int] = None
    rating: int # 1 for good, 0 for bad, or 1-5
    downvote: bool = False # Explicit context disqualification
    comment: Optional[str] = None
    persona: Optional[str] = "critic"

class FeedbackResponse(BaseModel):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class MovieBase(BaseModel):
    title: str
    tmdb_id: Optional[int] = None
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    release_year: Optional[int] = None
    status: str

class MovieResponse(MovieBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ForumPostCreate(BaseModel):
    clerk_id: Optional[str] = None
    title: str
    content: str

class ForumReplyCreate(BaseModel):
    clerk_id: Optional[str] = None
    content: str

class ForumReplyResponse(BaseModel):
    id: int
    reply_number: str
    post_id: int
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class ForumPostResponse(BaseModel):
    id: int
    post_number: str
    movie_id: int
    title: str
    content: str
    created_at: datetime
    replies: List[ForumReplyResponse] = []
    class Config:
        from_attributes = True
