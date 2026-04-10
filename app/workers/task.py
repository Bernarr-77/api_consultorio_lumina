from app.workers.celery import app
import time

@app.task
def simular_email(nome:str):
    time.sleep(3)
    return f"enviado com sucesso para {nome}"


if __name__ == "__main__":
    simular_email.delay("Bernardo")
    print("Executado")
