# Floor Plan Editor

Editor de plantas baixas 2D/3D com estimativas de materiais e custos.

![Floor Plan Editor](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.182-green)

## Demo

**[Acesse o editor online](https://educosta85.github.io/floorplan/)**

## Funcionalidades

### Editor 2D
- Criar e editar cômodos
- Adicionar portas e janelas
- Zoom e pan
- Validação de sobreposições

### Visualização 3D
- Renderização em tempo real com Three.js
- Tour 360° (first-person)
- Controle de qualidade (baixa/média/alta)
- Mostrar/ocultar teto

### Sistema de Materiais
- 12 tipos de piso (madeira, cerâmica, mármore, etc.)
- 11 tipos de parede (pintura, tijolinho, azulejo, etc.)
- 5 tipos de teto
- Upload de texturas personalizadas
- Presets de estilo (Moderno, Clássico, Rústico, etc.)

### Orçamento
- Cálculo automático de materiais
- Estimativa de custos editável
- Perdas e rendimento configuráveis

## Tecnologias

- **React 19** + TypeScript
- **Three.js** + React Three Fiber
- **Vite** para build

## Instalação

```bash
# Clone o repositório
git clone https://github.com/EduCosta85/floorplan.git
cd floorplan

# Instale as dependências
npm install

# Rode em modo desenvolvimento
npm run dev
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Verificação de código |

## Estrutura do Projeto

```
src/
├── components/
│   ├── Editor/           # Painel lateral de edição
│   ├── 3d/               # Materiais Three.js
│   ├── ui/               # Componentes UI reutilizáveis
│   ├── FloorPlanViewer.tsx   # Visualização 2D
│   └── FloorPlan3D.tsx       # Visualização 3D
├── context/              # Estado global (React Context)
├── data/                 # Biblioteca de materiais
├── types/                # TypeScript types
└── utils/                # Validação, estatísticas
```

## Modelo de Dados

O projeto usa um modelo JSON flexível para representar plantas baixas:

```json
{
  "name": "Minha Casa",
  "unit": "cm",
  "floor": {
    "rooms": [
      {
        "id": "sala",
        "name": "Sala de Estar",
        "position": { "x": 0, "y": 0 },
        "walls": {
          "north": { "length": 400 },
          "east": { "length": 300 },
          "south": { "length": 400, "openings": [...] },
          "west": { "length": 300 }
        },
        "materials": {
          "floor": { "type": "wood-light" },
          "walls": { "type": "paint-white" }
        }
      }
    ]
  }
}
```

## Licença

MIT
