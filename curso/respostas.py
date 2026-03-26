from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random

URL = "https://docs.google.com/forms/d/e/1FAIpQLSceZU2_TFKtBkqwU0goTf_neMXDL2rSc5ji_gOtYd-PtT4SUg/viewform"

# ── BANCO DE RESPOSTAS ──────────────────────────────────────────────
OPCOES = {
    "faixa_etaria": [
        "Menos de 18 anos", "18 - 24 anos", "25 - 34 anos",
        "35 - 44 anos", "45 - 54 anos", "55 anos ou mais."
    ],
    "genero": ["Masculino", "Feminino", "Prefiro não dizer"],
    "renda": [
        "Até 1 Salário mínimo.", "Até 2 Salários mínimos",
        "De 2 a 4 Salários mínimos", "Acima de 5 Salários mínimos",
        "Prefiro não responder."
    ],
    "frequencia_compra": ["Mensalmente", "Ocasionalmente", "Semanalmente", "Raramente"],
    "tipos_produtos": [
        "Sabonete comum", "Sabonete facial específico",
        "Espuma ou Gel de limpeza"
    ],
    "resultados": [
        "Limpeza profunda", "Controle de oleosidade", "Hidratação",
        "Suavidade para pele sensível", "Clareamento de manchas", "Renovação da pele"
    ],
    "escala": ["1", "2", "3", "4", "5"],
    "preco": [
        "De R$10 a R$25.", "De R$25 a R$40.",
        "De R$40 a R$70.", "De R$70 a R$100.", "Acima de R$100."
    ],
    "fator_compra": [
        "Preço", "Qualidade", "Marca/Reputação", "Sustentabilidade/Ingredientes Naturais"
    ],
    "usaria_produto_novo": ["Sim", "Não"],
    "fatores_comprar": [
        "Cheiro agradável", "Ingredientes reconhecíveis",
        "Recomendação de influenciadores", "Resultados comprovados"
    ],
    "fragrancia": ["Com fragrância", "Sem fragrância"],
    "embalagem": [
        "Sustentabilidade (reciclável, biodegradável)", "Facilidade de uso",
        "Design atrativo", "Tamanho compacto para transporte",
        "Informação clara sobre os ingredientes"
    ],
}

TEXTOS_DESAFIO = [
    "Dificuldade em encontrar produtos que não irritem a pele sensível.",
    "Preço elevado dos produtos de qualidade no mercado.",
    "Muitas opções disponíveis, difícil saber qual é realmente eficaz.",
    "Produtos com muitos químicos que causam alergia.",
    "Falta de informação clara sobre os ingredientes na embalagem.",
    "Não saber se o produto vai funcionar para o meu tipo de pele.",
    "A maioria dos sabonetes resseca muito a pele do rosto.",
    "Difícil encontrar algo natural que tenha bom custo-benefício.",
    "Desconfiança em relação às promessas feitas pelos fabricantes.",
    "Encontrar produtos sustentáveis com preço acessível.",
]

TEXTOS_SUGESTAO = [
    "Seria interessante ter amostras grátis para testar antes de comprar.",
    "Embalagem menor para quem quer experimentar sem gastar muito.",
    "Mais transparência sobre a origem dos ingredientes naturais.",
    "Gostaria de ver mais opções para pele oleosa com ingredientes naturais.",
    "Poderia ter uma versão para pele sensível sem fragrância.",
    "Nenhuma sugestão no momento, boa sorte com o produto.",
    "Importante ter certificação de produto vegano e cruelty-free.",
    "Investir em embalagem reciclável seria um diferencial grande.",
    "Um app ou site com guia de uso e rotina de skincare ajudaria.",
    "Preço competitivo é essencial para conquistar novos clientes.",
]

# ── HELPERS ─────────────────────────────────────────────────────────
def aleatorio_multiplo(lista, min_qtd=1, max_qtd=2):
    qtd = random.randint(min_qtd, min(max_qtd, len(lista)))
    return random.sample(lista, qtd)

def clicar_por_texto(driver, texto):
    xpath = f'//span[normalize-space(text())="{texto}"]'
    el = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, xpath))
    )
    driver.execute_script("arguments[0].scrollIntoView(true);", el)
    time.sleep(random.uniform(0.2, 0.5))
    el.click()

def preencher_texto(driver, index_campo, texto):
    textareas = WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located((By.XPATH, '//textarea'))
    )
    campo = textareas[index_campo]
    driver.execute_script("arguments[0].scrollIntoView(true);", campo)
    time.sleep(random.uniform(0.3, 0.5))
    campo.click()
    campo.send_keys(texto)

# ── EXECUÇÃO PRINCIPAL ───────────────────────────────────────────────
def responder_formulario():
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")  # descomenta pra rodar sem janela
    driver = webdriver.Chrome(options=options)
    driver.get(URL)

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, '//div[@role="radio"]'))
    )
    time.sleep(random.uniform(1.5, 3))

    clicar_por_texto(driver, random.choice(OPCOES["faixa_etaria"]))
    clicar_por_texto(driver, random.choice(OPCOES["genero"]))
    clicar_por_texto(driver, random.choice(OPCOES["renda"]))
    clicar_por_texto(driver, random.choice(OPCOES["frequencia_compra"]))

    for item in aleatorio_multiplo(OPCOES["tipos_produtos"]):
        clicar_por_texto(driver, item)

    for item in aleatorio_multiplo(OPCOES["resultados"], 1, 3):
        clicar_por_texto(driver, item)

    escala = random.choice(OPCOES["escala"])
    escala_el = driver.find_element(By.XPATH, f'//div[@data-value="{escala}"]')
    driver.execute_script("arguments[0].scrollIntoView(true);", escala_el)
    time.sleep(0.3)
    escala_el.click()

    preencher_texto(driver, 0, random.choice(TEXTOS_DESAFIO))

    clicar_por_texto(driver, random.choice(OPCOES["preco"]))

    for item in aleatorio_multiplo(OPCOES["fator_compra"]):
        clicar_por_texto(driver, item)

    clicar_por_texto(driver, random.choice(OPCOES["usaria_produto_novo"]))

    for item in aleatorio_multiplo(OPCOES["fatores_comprar"]):
        clicar_por_texto(driver, item)

    clicar_por_texto(driver, random.choice(OPCOES["fragrancia"]))

    for item in aleatorio_multiplo(OPCOES["embalagem"], 1, 3):
        clicar_por_texto(driver, item)

    preencher_texto(driver, 1, random.choice(TEXTOS_SUGESTAO))

    time.sleep(random.uniform(0.8, 1.5))

    submit_btn = driver.find_element(
        By.XPATH, '//span[text()="Enviar"]/ancestor::div[@role="button"]'
    )
    driver.execute_script("arguments[0].scrollIntoView(true);", submit_btn)
    time.sleep(0.5)
    submit_btn.click()

    time.sleep(2)
    print("✓ Resposta enviada.")
    driver.quit()

# ── LOOP ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    TOTAL_RESPOSTAS = 80 # ajusta aqui: quantas respostas faltam

    for i in range(1, TOTAL_RESPOSTAS + 1):
        print(f"[{i}/{TOTAL_RESPOSTAS}] Enviando...")
        try:
            responder_formulario()
            espera = random.uniform(8, 20)  # pausa entre envios
            print(f"  Aguardando {espera:.1f}s...\n")
            time.sleep(espera)
        except Exception as e:
            print(f"  Erro na resposta {i}: {e}\n")
            time.sleep(2)
