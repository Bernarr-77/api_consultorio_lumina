import os
import smtplib
from email.message import EmailMessage
from app.workers.celery import app
from dotenv import load_dotenv

load_dotenv()

@app.task(name="enviar_email_confirmacao",
        autoretry_for=(Exception,),
        max_retries=5,
        default_retry_delay=15)
def confirmacao_email(email_destino: str, inicio_formatado: str, fim_formatado: str):
    # 1. Pegamos as credenciais do cofre (.env)
    remetente = os.getenv("EMAIL_SENDER")
    senha = os.getenv("EMAIL_PASSWORD")
    servidor_smtp = os.getenv("SMTP_SERVER")
    porta_smtp = int(os.getenv("SMTP_PORT", 587))

    # 2. Criamos o envelope
    msg = EmailMessage()
    msg['Subject'] = "✂️ Seu horário está confirmado!"
    msg['From'] = remetente
    msg['To'] = email_destino

    # 3. Camada de Segurança (Texto simples com f-string)
    msg.set_content(f"Olá! Seu agendamento para o dia {inicio_formatado} foi confirmado com sucesso.")

    # 4. Camada Visual (O e-mail em HTML injetando as variáveis com f-string)
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; border-top: 5px solid #2c3e50; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Agendamento Confirmado</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">Olá!</p>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">Passando para avisar que seu horário na nossa barbearia está garantido.</p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 15px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; color: #333333; font-size: 16px;"><strong>Detalhes do Agendamento:</strong></p>
                <p style="margin: 0; color: #555555; font-size: 15px;">📅 Início: <strong>{inicio_formatado}</strong></p>
                <p style="margin: 5px 0 0 0; color: #555555; font-size: 15px;">⏰ Fim: <strong>{fim_formatado}</strong></p>
            </div>
            
            <p style="color: #888888; font-size: 12px; text-align: center; margin-top: 30px;">
                Este é um e-mail automático, por favor não responda.
            </p>
        </div>
    </body>
    </html>
    """
    
    msg.add_alternative(html_template, subtype='html')

    # 5. Entregamos a carta
    with smtplib.SMTP(servidor_smtp, porta_smtp) as server:
        server.starttls()
        server.login(remetente, senha)
        server.send_message(msg)

