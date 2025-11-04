"""
Aplicação Flask para Agendamento CAD Uberlândia-MG
Consolida dados de 3 bases do Google Sheets
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Configuração Flask
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///agenda.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False

db = SQLAlchemy(app)
CORS(app)

# Configuração Google Sheets
SPREADSHEET_ID = "1P1gNN4KeSa5qNm7IBOipL0flsuljEhpy_bEHZARetYo"
GOOGLE_SHEETS_API_KEY = os.getenv('GOOGLE_SHEETS_API_KEY', 'AIzaSyC2V1h6GwyJkvvovyZBAODcZTWhkWKjsnE')
SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets"

# Modelo de Banco de Dados
class ConsolidatedAgenda(db.Model):
    __tablename__ = 'consolidated_agenda'
    
    id = db.Column(db.Integer, primary_key=True)
    data_agenda = db.Column(db.String(10), unique=True, nullable=False)
    base1_paletes = db.Column(db.Integer, default=0)
    base2_paletes = db.Column(db.Integer, default=0)
    base3_paletes = db.Column(db.Integer, default=0)
    total_paletes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'dataAgenda': self.data_agenda,
            'base1Paletes': self.base1_paletes,
            'base2Paletes': self.base2_paletes,
            'base3Paletes': self.base3_paletes,
            'totalPaletes': self.total_paletes,
        }

# Funções de Consolidação
def parse_date(date_str):
    """Parse data em formato DD/MM/YYYY"""
    try:
        parts = date_str.split('/')
        if len(parts) == 3:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            return datetime(year, month, day)
    except:
        pass
    return None

def apply_weekday_bonus(data):
    """Aplica acréscimo de 100 paletes nas quartas e sextas-feiras"""
    for item in data:
        date = parse_date(item['dataAgenda'])
        if date:
            day_of_week = date.weekday()  # 0=seg, 2=qua, 4=sex
            if day_of_week == 2 or day_of_week == 4:  # Quarta (2) ou Sexta (4)
                item['base3Paletes'] += 100
                item['totalPaletes'] += 100
    return data

def read_sheet(sheet_name):
    """Lê dados de uma aba do Google Sheets"""
    try:
        url = f"{SHEETS_API_URL}/{SPREADSHEET_ID}/values/{sheet_name}?key={GOOGLE_SHEETS_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        
        data = response.json()
        values = data.get('values', [])
        
        if not values:
            return []
        
        headers = values[0]
        rows = []
        
        for row_data in values[1:]:
            row = {}
            for i, header in enumerate(headers):
                if i < len(row_data):
                    row[header] = row_data[i]
                else:
                    row[header] = ''
            rows.append(row)
        
        return rows
    except Exception as e:
        print(f"Erro ao ler {sheet_name}: {str(e)}")
        return []

def consolidate_data():
    """Consolida dados das 3 bases"""
    consolidated = {}
    
    # Ler Base1
    base1_data = read_sheet('Base1')
    for row in base1_data:
        status = row.get('Status', '').lower()
        if status == 'aprovado':
            data_agenda = row.get('Data Agenda', '')
            pallet = int(row.get('Pallet', 0)) if row.get('Pallet', '').isdigit() else 0
            
            if data_agenda:
                if data_agenda not in consolidated:
                    consolidated[data_agenda] = {
                        'dataAgenda': data_agenda,
                        'base1Paletes': 0,
                        'base2Paletes': 0,
                        'base3Paletes': 0,
                        'totalPaletes': 0,
                    }
                consolidated[data_agenda]['base1Paletes'] += pallet
                consolidated[data_agenda]['totalPaletes'] += pallet
    
    # Ler Base2
    base2_data = read_sheet('Base2')
    for row in base2_data:
        status = row.get('Status', '').lower()
        if status == 'aprovado':
            data_agenda = row.get('Data Agenda', '')
            pallet = int(row.get('Pallet', 0)) if row.get('Pallet', '').isdigit() else 0
            
            if data_agenda:
                if data_agenda not in consolidated:
                    consolidated[data_agenda] = {
                        'dataAgenda': data_agenda,
                        'base1Paletes': 0,
                        'base2Paletes': 0,
                        'base3Paletes': 0,
                        'totalPaletes': 0,
                    }
                consolidated[data_agenda]['base2Paletes'] += pallet
                consolidated[data_agenda]['totalPaletes'] += pallet
    
    # Ler Base3 (sem filtro de status)
    base3_data = read_sheet('Base3')
    for row in base3_data:
        data_agenda = row.get('Data', '')  # Base3 usa coluna 'Data'
        pallet = int(row.get('Pallet', 0)) if row.get('Pallet', '').isdigit() else 0
        
        if data_agenda:
            if data_agenda not in consolidated:
                consolidated[data_agenda] = {
                    'dataAgenda': data_agenda,
                    'base1Paletes': 0,
                    'base2Paletes': 0,
                    'base3Paletes': 0,
                    'totalPaletes': 0,
                }
            consolidated[data_agenda]['base3Paletes'] += pallet
            consolidated[data_agenda]['totalPaletes'] += pallet
    
    # Converter para lista e aplicar bonus
    result = list(consolidated.values())
    result = apply_weekday_bonus(result)
    
    # Ordenar por data
    result.sort(key=lambda x: parse_date(x['dataAgenda']) or datetime.min)
    
    return result

# Rotas API
@app.route('/api/health', methods=['GET'])
def health():
    """Verifica saúde da aplicação"""
    return jsonify({'status': 'ok', 'message': 'Servidor rodando'}), 200

@app.route('/api/agenda/sync', methods=['POST'])
def sync_agenda():
    """Sincroniza dados do Google Sheets"""
    try:
        data = consolidate_data()
        
        # Limpar dados antigos
        ConsolidatedAgenda.query.delete()
        
        # Salvar novos dados
        for item in data:
            agenda = ConsolidatedAgenda(
                data_agenda=item['dataAgenda'],
                base1_paletes=item['base1Paletes'],
                base2_paletes=item['base2Paletes'],
                base3_paletes=item['base3Paletes'],
                total_paletes=item['totalPaletes'],
            )
            db.session.add(agenda)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Sincronização concluída: {len(data)} datas processadas',
            'count': len(data),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Falha ao sincronizar agenda: {str(e)}',
        }), 500

@app.route('/api/agenda/consolidated', methods=['GET'])
def get_consolidated():
    """Retorna dados consolidados"""
    try:
        data = ConsolidatedAgenda.query.all()
        return jsonify({
            'success': True,
            'data': [item.to_dict() for item in data],
            'count': len(data),
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Falha ao obter agenda consolidada: {str(e)}',
        }), 500

@app.route('/api/agenda/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas dos agendamentos"""
    try:
        data = ConsolidatedAgenda.query.all()
        
        if not data:
            return jsonify({
                'total': 0,
                'media': 0,
                'maxima': 0,
                'minima': 0,
            }), 200
        
        paletes = [item.total_paletes for item in data]
        
        return jsonify({
            'total': sum(paletes),
            'media': sum(paletes) // len(paletes) if paletes else 0,
            'maxima': max(paletes) if paletes else 0,
            'minima': min(paletes) if paletes else 0,
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Falha ao obter estatísticas: {str(e)}',
        }), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve arquivos estáticos do frontend"""
    if path and os.path.exists(f'static/{path}'):
        return app.send_static_file(path)
    return app.send_static_file('index.html')

# Criar tabelas
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
