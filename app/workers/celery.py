from celery import Celery
from dotenv import load_dotenv
import os
load_dotenv()
app = Celery('app',    
            broker=os.getenv('BROKER_URL'),
            backend=os.getenv('BACKEND_URL'),
            include=['app.workers.task'])

app.conf.update(
    result_expires=3600,
)


# celery -A app.workers.celery worker --loglevel=info --pool=solo