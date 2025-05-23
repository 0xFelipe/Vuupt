from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
import httpx
import os
import json
from datetime import datetime
import pytz
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()
API_TOKEN = os.getenv("API_TOKEN")
BASE_URL = os.getenv("BASE_URL", "https://api.vuupt.com/api/v1")

# Configurações do FastAPI
app = FastAPI(title="Sistema Integrado de Serviços e Rotas")

# Configuração de templates e arquivos estáticos
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Cabeçalhos HTTP para a API externa
headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

##############################
#  ROTAS PARA CADASTRO DE SERVIÇOS (já existente)
##############################

class Address(BaseModel):
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Customer(BaseModel):
    name: str
    email: str
    upsert: bool = True
    address: Optional[str] = None
    phone_number: Optional[str] = None
    address_complement: Optional[str] = None

class Service(BaseModel):
    code: str
    note: str
    type: str  # "delivery" ou "pickup"
    title: str
    upsert: bool = True
    address: str
    latitude: float
    longitude: float
    customer_id: Optional[str] = None
    customer: Optional[Customer] = None
    driver_id: Optional[str] = None

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Página principal para criação de serviços."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/contatos")
async def get_contatos():
    """Retorna a lista de clientes da API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{BASE_URL}/customers", headers=headers)
            response.raise_for_status()
            data = response.json()
            # Extrair array 'data' se existir
            if isinstance(data, dict) and 'data' in data:
                return data['data']
            return data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, 
                           detail=f"Erro na API externa: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Erro ao buscar clientes: {str(e)}")

@app.get("/api/drivers")
async def get_drivers():
    """Retorna a lista de motoristas da API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{BASE_URL}/agents", headers=headers)
            response.raise_for_status()
            data = response.json()
            # Extrair array 'data' se existir
            if isinstance(data, dict) and 'data' in data:
                return data['data']
            return data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, 
                           detail=f"Erro na API externa: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Erro ao buscar motoristas: {str(e)}")

@app.get("/api/geocode/{address}")
async def geocode_address(address: str):
    """Geocodifica um endereço usando a API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{BASE_URL}/utilities/map/geocode",
                headers=headers,
                params={"address": address}
            )
            response.raise_for_status()
            data = response.json()
            return data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, 
                           detail=f"Erro na API externa: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Erro ao geocodificar endereço: {str(e)}")

@app.post("/api/services")
async def create_service(service: Union[Service, Dict[str, Any]]):
    """Cria um novo serviço."""
    try:
        service_data = service if isinstance(service, dict) else service.dict(exclude_none=True)
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{BASE_URL}/services",
                headers=headers,
                json=service_data
            )
            response.raise_for_status()
            data = response.json()
            return data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, 
                           detail=f"Erro na API externa: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, 
                           detail=f"Erro ao criar serviço: {str(e)}")

##############################
#  ROTAS PARA CRIAÇÃO DE ROTAS
##############################

# Modelo para criação de rota
class RouteCreate(BaseModel):
    name: str
    start_at: str
    start_location_base_id: int
    end_location_type: str
    end_location_base_id: Optional[int] = None
    agent_id: int
    vehicle_id: Optional[int] = None
    transport_mode: str = "driving"
    activities: List[dict]

def convert_to_utc(datetime_str: str) -> str:
    """Converte horário de Brasília para UTC."""
    brasilia_tz = pytz.timezone('America/Sao_Paulo')
    utc_tz = pytz.UTC
    local_dt = datetime.fromisoformat(datetime_str.replace('Z', ''))
    local_dt = brasilia_tz.localize(local_dt)
    utc_dt = local_dt.astimezone(utc_tz)
    return utc_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

@app.get("/rotas", response_class=HTMLResponse)
async def rota_form(request: Request):
    """Renderiza a página para criação de rotas."""
    return templates.TemplateResponse("create_route.html", {"request": request})

@app.get("/api/operational-bases")
async def get_operational_bases():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/operational-bases?fields=id,name",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            # Extrair array 'data' se existir
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
            
            if not isinstance(data, list):
                return []
            
            normalized = []
            for item in data:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('title') or item.get('description') or f"Base {item.get('id', 'N/A')}"
                    normalized.append({
                        'id': item.get('id'),
                        'name': name
                    })
            return normalized
        except Exception as e:
            print(f"Erro ao buscar bases: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def get_agents_for_routes():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/agents", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Extrair array 'data' se existir
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
            
            if not isinstance(data, list):
                return []
            
            normalized = []
            for item in data:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('title') or item.get('description') or f"Agente {item.get('id', 'N/A')}"
                    normalized.append({
                        'id': item.get('id'),
                        'name': name
                    })
            return normalized
        except Exception as e:
            print(f"Erro ao buscar agentes: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vehicles")
async def get_vehicles_for_routes():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/vehicles", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Extrair array 'data' se existir
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
            
            if not isinstance(data, list):
                return []
            
            normalized = []
            for item in data:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('title') or item.get('plate') or item.get('description') or f"Veículo {item.get('id', 'N/A')}"
                    normalized.append({
                        'id': item.get('id'),
                        'name': name
                    })
            return normalized
        except Exception as e:
            print(f"Erro ao buscar veículos: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/services")
async def get_services_for_routes():
    async with httpx.AsyncClient() as client:
        try:
            # Usar filtro específico para trazer apenas serviços com status 'not_assigned'
            response = await client.get(
                f"{BASE_URL}/services",
                headers=headers,
                params={
                    "fields": "id,code,zone_id,status,status_done,type,title,route_id",
                    "filter[0][field]": "status",
                    "filter[0][operator]": "eq",
                    "filter[0][value]": "not_assigned"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Extrair array 'data' se existir
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
            
            if not isinstance(data, list):
                return []
            
            # Processar os serviços retornados
            services = []
            for service in data:
                if isinstance(service, dict):
                    services.append({
                        'id': service.get('id'),
                        'code': service.get('code', 'N/A'),
                        'title': service.get('title', 'Sem título'),
                        'status': service.get('status'),
                        'type': service.get('type'),
                        'route_id': service.get('route_id')
                    })
            
            print(f"Total de serviços com status 'not_assigned': {len(services)}")
            return services
            
        except Exception as e:
            print(f"Erro ao buscar serviços: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/routes")
async def create_route(route: RouteCreate):
    async with httpx.AsyncClient() as client:
        try:
            route_data = route.dict()
            route_data['start_at'] = convert_to_utc(route.start_at)
            route_data['source'] = 'manual'
            response = await client.post(
                f"{BASE_URL}/routes",
                headers=headers,
                json=route_data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao criar rota: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Para rodar com "uvicorn main:app --reload"
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="192.168.0.253", port=24642, reload=True)