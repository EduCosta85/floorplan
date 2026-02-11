import { useState, useRef, useEffect, useCallback } from 'react';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { 
  aiChatService, 
  AVAILABLE_MODELS, 
  DEFAULT_MODEL,
  type ChatMessage,
  type FloorPlanAction,
} from '../../services/ai-chat';
import { FURNITURE_TEMPLATES, FURNITURE_CATEGORIES } from '../../data/furniture-library';
import type { Room, WallSide } from '../../types/floor-plan';
import { Button } from '../ui';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: FloorPlanAction;
  actionResult?: string;
  isStreaming?: boolean;
}

export function ChatPanel() {
  const { 
    state, 
    addRoom, 
    deleteRoom, 
    updateRoom,
    addOpening,
    addFurniture,
    generateRoomId,
    generateFurnitureId,
  } = useFloorPlan();
  
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<'not-loaded' | 'loading' | 'ready' | 'error'>('not-loaded');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check WebGPU support on mount
  useEffect(() => {
    aiChatService.isWebGPUSupported().then(setWebgpuSupported);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Try to parse user intent directly (fallback when AI doesn't generate proper JSON)
  const parseUserIntent = useCallback((text: string): FloorPlanAction | null => {
    const lowerText = text.toLowerCase();
    
    // Pattern: "crie/criar/cria um/uma [tipo] de [X]x[Y] metros"
    const createRoomMatch = lowerText.match(/cri[ae]\w*\s+(?:um|uma)?\s*(\w+)(?:\s+de)?\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m(?:etros?)?)?/i);
    if (createRoomMatch) {
      const name = createRoomMatch[1].charAt(0).toUpperCase() + createRoomMatch[1].slice(1);
      const width = Math.round(parseFloat(createRoomMatch[2].replace(',', '.')) * 100);
      const height = Math.round(parseFloat(createRoomMatch[3].replace(',', '.')) * 100);
      return {
        type: 'ADD_ROOM',
        params: { name, x: 0, y: 0, width, height }
      };
    }
    
    // Pattern: "lista/listar cômodos" or "quais cômodos"
    if (lowerText.match(/list\w*\s+c[oô]modos?|quais\s+c[oô]modos?|mostrar?\s+c[oô]modos?/i)) {
      return { type: 'LIST_ROOMS', params: {} };
    }
    
    // Pattern: "crie/criar quarto/sala/cozinha/banheiro" (without dimensions - use defaults)
    const simpleRoomMatch = lowerText.match(/cri[ae]\w*\s+(?:um|uma)?\s*(quarto|sala|cozinha|banheiro|lavabo|escritório|garagem)/i);
    if (simpleRoomMatch) {
      const roomType = simpleRoomMatch[1].toLowerCase();
      const defaults: Record<string, { width: number; height: number }> = {
        'quarto': { width: 300, height: 300 },
        'sala': { width: 400, height: 350 },
        'cozinha': { width: 300, height: 250 },
        'banheiro': { width: 200, height: 200 },
        'lavabo': { width: 150, height: 150 },
        'escritório': { width: 250, height: 250 },
        'garagem': { width: 300, height: 500 },
      };
      const dim = defaults[roomType] || { width: 300, height: 300 };
      const name = roomType.charAt(0).toUpperCase() + roomType.slice(1);
      return {
        type: 'ADD_ROOM',
        params: { name, x: 0, y: 0, ...dim }
      };
    }
    
    return null;
  }, []);

  // Execute floor plan action
  const executeAction = useCallback((action: FloorPlanAction): string => {
    try {
      switch (action.type) {
        case 'ADD_ROOM': {
          const { name, x, y, width, height } = action.params;
          const roomId = generateRoomId();
          const newRoom: Room = {
            id: roomId,
            name: name || roomId,
            position: { x, y },
            walls: {
              north: { length: width },
              east: { length: height },
              south: { length: width },
              west: { length: height },
            },
          };
          addRoom(newRoom);
          return `✅ Cômodo "${name}" criado com sucesso! (${width/100}m x ${height/100}m)`;
        }

        case 'DELETE_ROOM': {
          const { roomId } = action.params;
          const room = state.floorPlan.floor.rooms.find(r => r.id === roomId);
          if (!room) {
            return `❌ Cômodo "${roomId}" não encontrado.`;
          }
          deleteRoom(roomId);
          return `✅ Cômodo "${room.name || roomId}" deletado!`;
        }

        case 'UPDATE_ROOM': {
          const { roomId, name, x, y, width, height } = action.params;
          const room = state.floorPlan.floor.rooms.find(r => r.id === roomId);
          if (!room) {
            return `❌ Cômodo "${roomId}" não encontrado.`;
          }
          
          const updates: Partial<Room> = {};
          if (name) updates.name = name;
          if (x !== undefined || y !== undefined) {
            updates.position = { 
              x: x ?? room.position.x, 
              y: y ?? room.position.y 
            };
          }
          if (width || height) {
            updates.walls = {
              north: { ...room.walls.north, length: width ?? room.walls.north.length },
              east: { ...room.walls.east, length: height ?? room.walls.east.length },
              south: { ...room.walls.south, length: width ?? room.walls.south.length },
              west: { ...room.walls.west, length: height ?? room.walls.west.length },
            };
          }
          
          updateRoom(roomId, updates);
          return `✅ Cômodo "${room.name || roomId}" atualizado!`;
        }

        case 'ADD_DOOR': {
          const { roomId, wall, offset, width = 80 } = action.params;
          const room = state.floorPlan.floor.rooms.find(r => r.id === roomId);
          if (!room) {
            return `❌ Cômodo "${roomId}" não encontrado.`;
          }
          addOpening(roomId, wall as WallSide, { type: 'door', offset, width });
          return `✅ Porta adicionada na parede ${wall} do cômodo "${room.name || roomId}"!`;
        }

        case 'ADD_WINDOW': {
          const { roomId, wall, offset, width = 120 } = action.params;
          const room = state.floorPlan.floor.rooms.find(r => r.id === roomId);
          if (!room) {
            return `❌ Cômodo "${roomId}" não encontrado.`;
          }
          addOpening(roomId, wall as WallSide, { type: 'window', offset, width });
          return `✅ Janela adicionada na parede ${wall} do cômodo "${room.name || roomId}"!`;
        }

        case 'ADD_FURNITURE': {
          const { templateId, x, y, rotation = 0 } = action.params;
          const template = FURNITURE_TEMPLATES.find(t => t.id === templateId);
          if (!template) {
            return `❌ Móvel "${templateId}" não encontrado. Use LIST_FURNITURE_TEMPLATES para ver opções.`;
          }
          const furnitureId = generateFurnitureId();
          addFurniture({
            id: furnitureId,
            templateId,
            position: { x, y },
            rotation,
          });
          return `✅ ${template.name} adicionado na posição (${x}, ${y})!`;
        }

        case 'LIST_ROOMS': {
          const rooms = state.floorPlan.floor.rooms;
          if (rooms.length === 0) {
            return '📋 Não há cômodos na planta ainda.';
          }
          const list = rooms.map(r => {
            const w = Math.max(r.walls.north.length ?? 0, r.walls.south.length ?? 0);
            const h = Math.max(r.walls.east.length ?? 0, r.walls.west.length ?? 0);
            return `• ${r.name || r.id} (ID: ${r.id}) - ${w/100}m x ${h/100}m em (${r.position.x}, ${r.position.y})`;
          }).join('\n');
          return `📋 Cômodos na planta:\n${list}`;
        }

        case 'LIST_FURNITURE_TEMPLATES': {
          const { category } = action.params;
          let templates = FURNITURE_TEMPLATES;
          if (category) {
            templates = templates.filter(t => t.category === category);
          }
          if (templates.length === 0) {
            const categories = FURNITURE_CATEGORIES.map(c => `${c.icon} ${c.name} (${c.id})`).join(', ');
            return `📋 Categoria não encontrada. Categorias disponíveis: ${categories}`;
          }
          const list = templates.slice(0, 15).map(t => 
            `• ${t.icon} ${t.name} (ID: ${t.id}) - ${t.width}x${t.depth}cm`
          ).join('\n');
          const more = templates.length > 15 ? `\n... e mais ${templates.length - 15} itens` : '';
          return `📋 Móveis disponíveis${category ? ` (${category})` : ''}:\n${list}${more}`;
        }

        case 'UNKNOWN':
        default:
          return '❓ Ação não reconhecida.';
      }
    } catch (error) {
      console.error('Action execution error:', error);
      return `❌ Erro ao executar ação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }, [state.floorPlan.floor.rooms, addRoom, deleteRoom, updateRoom, addOpening, addFurniture, generateRoomId, generateFurnitureId]);

  // Load model
  const handleLoadModel = async () => {
    setModelStatus('loading');
    setLoadProgress(0);
    setLoadStatus('Iniciando...');

    aiChatService.setProgressCallback((progress, status) => {
      setLoadProgress(progress);
      setLoadStatus(status);
    });

    try {
      await aiChatService.loadModel(selectedModel);
      setModelStatus('ready');
      
      // Add welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '👋 Olá! Sou seu assistente de plantas baixas. Posso ajudar você a:\n\n• Criar cômodos (ex: "Crie um quarto de 4x3 metros")\n• Adicionar portas e janelas\n• Colocar móveis\n• Modificar a planta existente\n\nComo posso ajudar?',
      }]);
    } catch (error) {
      setModelStatus('error');
      setLoadStatus(error instanceof Error ? error.message : 'Erro ao carregar modelo');
    }
  };

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || modelStatus !== 'ready') return;

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
    };

    const assistantMessage: DisplayMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build chat history
      const history: ChatMessage[] = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10) // Keep last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }));
      
      history.push({ role: 'user', content: userMessage.content });

      // Stream response
      let fullContent = '';
      const response = await aiChatService.chatStream(history, (token) => {
        fullContent += token;
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: fullContent }
            : m
        ));
      });

      // Process action if present
      let actionResult: string | undefined;
      let finalAction = response.action;
      
      console.log('[Chat] Response:', response);
      
      // If no action from AI, try to parse user intent directly
      if (!finalAction) {
        console.log('[Chat] No action from AI, trying to parse user intent...');
        finalAction = parseUserIntent(userMessage.content) || undefined;
        if (finalAction) {
          console.log('[Chat] Parsed user intent:', finalAction);
        }
      }
      
      if (finalAction) {
        console.log('[Chat] Executing action:', finalAction);
        actionResult = executeAction(finalAction);
        console.log('[Chat] Action result:', actionResult);
      }

      // Update final message
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { 
              ...m, 
              content: response.text || fullContent,
              action: finalAction,
              actionResult,
              isStreaming: false,
            }
          : m
      ));
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { 
              ...m, 
              content: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render WebGPU not supported
  if (webgpuSupported === false) {
    return (
      <div className="chat-panel">
        <div className="chat-panel__not-supported">
          <span className="chat-panel__icon">⚠️</span>
          <h3>WebGPU não suportado</h3>
          <p>
            Seu navegador não suporta WebGPU, necessário para rodar a IA localmente.
          </p>
          <p>
            Use <strong>Chrome 113+</strong>, <strong>Edge 113+</strong> ou <strong>Safari 18+</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Render model selection / loading
  if (modelStatus !== 'ready') {
    return (
      <div className="chat-panel">
        <div className="chat-panel__setup">
          <span className="chat-panel__icon">🤖</span>
          <h3>Assistente IA</h3>
          <p>
            Converse para criar sua planta! A IA roda 100% no seu navegador.
          </p>

          {modelStatus === 'not-loaded' && (
            <>
              <div className="chat-panel__model-select">
                <label>Modelo:</label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.size})
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="primary" onClick={handleLoadModel}>
                🚀 Carregar Modelo
              </Button>
              <p className="chat-panel__hint">
                O modelo será baixado e armazenado em cache no seu navegador.
              </p>
            </>
          )}

          {modelStatus === 'loading' && (
            <div className="chat-panel__loading">
              <div className="chat-panel__progress">
                <div 
                  className="chat-panel__progress-bar" 
                  style={{ width: `${loadProgress * 100}%` }}
                />
              </div>
              <p className="chat-panel__loading-text">{loadStatus}</p>
              <p className="chat-panel__loading-percent">{Math.round(loadProgress * 100)}%</p>
            </div>
          )}

          {modelStatus === 'error' && (
            <div className="chat-panel__error">
              <p>❌ {loadStatus}</p>
              <Button variant="secondary" onClick={() => setModelStatus('not-loaded')}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render chat
  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <span>🤖 Assistente IA</span>
        <span className="chat-panel__model-badge">
          {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name.split(' ')[0] || 'Modelo'}
        </span>
      </div>

      <div className="chat-panel__messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`chat-message chat-message--${message.role}`}
          >
            <div className="chat-message__avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="chat-message__content">
              <div className="chat-message__text">
                {message.content}
                {message.isStreaming && <span className="chat-message__cursor">▊</span>}
              </div>
              {message.actionResult && (
                <div className="chat-message__action-result">
                  {message.actionResult}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__input-area">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Digite sua mensagem..."
          disabled={isLoading}
          rows={2}
        />
        <Button 
          variant="primary" 
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
        >
          {isLoading ? '...' : '➤'}
        </Button>
      </div>
    </div>
  );
}

export default ChatPanel;
