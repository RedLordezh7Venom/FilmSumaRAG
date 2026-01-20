from celery import Celery
from src.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.task_routes = {
    "src.worker.generate_embeddings": "main-queue",
}

celery_app.conf.update(task_track_started=True)
