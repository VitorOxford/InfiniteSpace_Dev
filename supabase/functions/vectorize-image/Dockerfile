FROM python:3.9-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o arquivo de dependências e as instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código da sua função para o container
COPY index.py .

# Expõe a porta que a função usará
EXPOSE 8000

# Comando para iniciar o servidor da função
CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "8000"]