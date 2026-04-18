import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.db.database import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class EngagementType(str, enum.Enum):
    SEEN = "seen"
    SUMMARY = "summary"
    DEEP_DIVE = "deep_dive"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True) # ID from Clerk/Auth provider
    email = Column(String, unique=True, index=True)
    username = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    chats = relationship("ChatHistory", back_populates="user")
    posts = relationship("ForumPost", back_populates="user")
    replies = relationship("ForumReply", back_populates="user")
    hidden_movies = relationship("UserHiddenMovie", back_populates="user")

class UserHiddenMovie(Base):
    __tablename__ = "user_hidden_movies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer, ForeignKey("movies.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="hidden_movies")
    movie = relationship("Movie")

class UserMovieEngagement(Base):
    __tablename__ = "user_movie_engagements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer, ForeignKey("movies.id"))
    engagement_type = Column(Enum(EngagementType), default=EngagementType.SEEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    movie = relationship("Movie")

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True, nullable=True) # Unique ID from TMDB
    title = Column(String, unique=True, index=True) # "Matrix (1999)"
    thumbnail_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    release_year = Column(Integer, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    error_message = Column(String, nullable=True)

    # Relationships
    summaries = relationship("SummaryCache", back_populates="movie")
    chats = relationship("ChatHistory", back_populates="movie")
    posts = relationship("ForumPost", back_populates="movie")

    def __repr__(self):
        return f"<Movie(title='{self.title}', status='{self.status}')>"

class SummaryType(str, enum.Enum):
    GENERAL = "general"
    PHILOSOPHER = "philosopher"
    SCENE_CREATOR = "scene_creator"
    VIDEO_ESSAY = "video_essay"

class SummaryCache(Base):
    __tablename__ = "summary_cache"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id"))
    summary_type = Column(Enum(SummaryType), default=SummaryType.GENERAL)
    content = Column(Text) # The actual summary text
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movie = relationship("Movie", back_populates="summaries")

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, index=True) # LangGraph/LangChain thread UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    movie_id = Column(Integer, ForeignKey("movies.id"))
    role = Column(String) # "user" or "assistant"
    message = Column(Text)
    citations = Column(Text, nullable=True) # JSON list of chunk IDs used
    persona = Column(String, default="critic") # "critic", "philosopher", etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chats")
    movie = relationship("Movie", back_populates="chats")

    @property
    def tmdb_id(self):
        return self.movie.tmdb_id if self.movie else None

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    movie_id = Column(Integer, ForeignKey("movies.id"))
    chat_id = Column(Integer, ForeignKey("chat_history.id"), nullable=True) # Point to a specific chat message if available
    rating = Column(Integer) # e.g., 1 to 5, or 1 for positive, 0 for negative
    downvote = Column(Boolean, default=False) # New field for explicit context disqualification
    comment = Column(Text, nullable=True) # User's detailed feedback
    persona = Column(String, nullable=True) # Which persona was this feedback for?
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    movie = relationship("Movie")
    chat = relationship("ChatHistory")

class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    post_number = Column(String, unique=True, index=True) # e.g. "No.12345678"
    movie_id = Column(Integer, ForeignKey("movies.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null if anonymous
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movie = relationship("Movie", back_populates="posts")
    user = relationship("User", back_populates="posts")
    replies = relationship("ForumReply", back_populates="post")

class ForumReply(Base):
    __tablename__ = "forum_replies"

    id = Column(Integer, primary_key=True, index=True)
    reply_number = Column(String, unique=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null if anonymous
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("ForumPost", back_populates="replies")
    user = relationship("User", back_populates="replies")
