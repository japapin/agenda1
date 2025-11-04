# Agendamento CAD Uberlândia-MG - Flask + React

Sistema de consolidação de agendamentos com integração Google Sheets, desenvolvido com **Python/Flask** no backend e **React** no frontend.

## Características

✅ **Consolidação de 3 Bases** - Base1 e Base2 (filtro "Aprovado"), Base3 (sem filtro)
✅ **Acréscimo Automático** - 100 paletes nas quartas e sextas-feiras
✅ **Dashboard Interativa** - Gráfico de linhas, filtro por período, estatísticas
✅ **API REST** - Endpoints para sincronização e consulta de dados
✅ **Banco de Dados** - SQLAlchemy com suporte a SQLite e MySQL
✅ **Pronto para Produção** - Configurado com Gunicorn

## Estrutura do Projeto

```
agenda-consolidada-flask/
├── app.py                 # Aplicação Flask principal
├── requirements.txt       # Dependências Python
├── vite.config.js        # Configuração Vite
├── package.json          # Dependências Node.js
├── frontend-src/         # Código-fonte React
├── static/               # Arquivos compilados (gerado após build)
├── venv/                 # Ambiente virtual Python
└── README.md             # Este arquivo
```

## Instalação

### 1. Clonar o repositório
```bash
git clone <seu-repositorio>
cd agenda-consolidada-flask
```

### 2. Configurar ambiente Python
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente
```bash
cp config.example.txt .env
# Edite .env com suas configurações
```

### 4. Instalar dependências Node.js (para desenvolvimento)
```bash
npm install
# ou
pnpm install
```

## Desenvolvimento

### Executar Frontend (Vite Dev Server)
```bash
npm run dev
```

### Executar Backend (Flask)
```bash
source venv/bin/activate
python app.py
```

Acesse http://localhost:5173 (frontend) e http://localhost:5000 (backend)

## Build para Produção

### Compilar Frontend
```bash
npm run build
```

Isso gera os arquivos estáticos em `static/`

### Executar com Gunicorn
```bash
source venv/bin/activate
gunicorn --timeout 120 app:app
```

Ou com configurações personalizadas:
```bash
gunicorn --workers 4 --worker-class sync --bind 0.0.0.0:5000 --timeout 120 app:app
```

## API Endpoints

### GET `/api/health`
Verifica saúde da aplicação
```bash
curl http://localhost:5000/api/health
```

### POST `/api/agenda/sync`
Sincroniza dados do Google Sheets
```bash
curl -X POST http://localhost:5000/api/agenda/sync
```

### GET `/api/agenda/consolidated`
Retorna dados consolidados
```bash
curl http://localhost:5000/api/agenda/consolidated
```

### GET `/api/agenda/stats`
Retorna estatísticas
```bash
curl http://localhost:5000/api/agenda/stats
```

## Deploy no Render

### 1. Criar novo Web Service
- Acesse https://dashboard.render.com
- Clique em "New +" → "Web Service"
- Conecte seu repositório

### 2. Configurar
- **Build Command**: `pip install -r requirements.txt && npm install && npm run build`
- **Start Command**: `gunicorn --timeout 120 app:app`

### 3. Variáveis de Ambiente
```
DATABASE_URL=seu_banco_de_dados
GOOGLE_SHEETS_API_KEY=sua_chave_api
FLASK_ENV=production
```

### 4. Deploy
Clique em "Create Web Service" e aguarde o deploy

## Configuração de Banco de Dados

### SQLite (Desenvolvimento)
```
DATABASE_URL=sqlite:///agenda.db
```

### MySQL (Produção)
```
DATABASE_URL=mysql+pymysql://user:password@host:port/database
```

Instale o driver MySQL:
```bash
pip install pymysql
```

## Consolidação de Dados

### Base1 e Base2
- **Filtro**: Status = "Aprovado"
- **Coluna Data**: "Data Agenda"
- **Coluna Pallet**: "Pallet"

### Base3
- **Filtro**: Nenhum (todos os registros)
- **Coluna Data**: "Data"
- **Coluna Pallet**: "Pallet"

### Acréscimo Semanal
- **Quartas-feiras**: +100 paletes
- **Sextas-feiras**: +100 paletes

## Troubleshooting

### Erro ao conectar Google Sheets
- Verifique se a chave de API está correta
- Confirme que a planilha é pública

### Erro de banco de dados
- Verifique a URL de conexão
- Certifique-se de que o banco está acessível

### Erro ao fazer build
- Limpe cache: `rm -rf static/ && npm run build`
- Reinstale dependências: `npm install`

## Suporte

Para mais informações ou reportar bugs, entre em contato com o desenvolvedor.

## Licença

MIT
