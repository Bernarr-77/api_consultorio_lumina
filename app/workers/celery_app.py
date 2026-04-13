from celery import Celery
from dotenv import load_dotenv
import os
load_dotenv()
app = Celery('tasks_barbearia',    
            broker=os.getenv('BROKER_URL'),
            backend=os.getenv('BACKEND_URL'),
            include=['app.workers.task'])

app.conf.update(
    result_expires=3600,
)
app.conf.timezone = 'America/Sao_Paulo'
app.conf.enable_utc = False


# celery -A app.workers.celery_app worker --loglevel=info --pool=solo
