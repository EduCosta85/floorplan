import * as webllm from '@mlc-ai/web-llm';

// Available models - smaller ones for faster loading
export const AVAILABLE_MODELS = [
  { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', name: 'SmolLM2 360M (Mais rápido)', size: '~250MB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', name: 'SmolLM2 1.7B (Recomendado)', size: '~1GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 1.5B (Boa qualidade)', size: '~1GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi-3.5 Mini (Melhor qualidade)', size: '~2GB' },
];

export const DEFAULT_MODEL = 'SmolLM2-1.7B-Instruct-q4f16_1-MLC';

// Floor plan action types
export type FloorPlanAction =
  | { type: 'ADD_ROOM'; params: { name: string; x: number; y: number; width: number; height: number } }
  | { type: 'DELETE_ROOM'; params: { roomId: string } }
  | { type: 'UPDATE_ROOM'; params: { roomId: string; name?: string; x?: number; y?: number; width?: number; height?: number } }
  | { type: 'ADD_DOOR'; params: { roomId: string; wall: 'north' | 'south' | 'east' | 'west'; offset: number; width?: number } }
  | { type: 'ADD_WINDOW'; params: { roomId: string; wall: 'north' | 'south' | 'east' | 'west'; offset: number; width?: number } }
  | { type: 'ADD_FURNITURE'; params: { templateId: string; x: number; y: number; rotation?: number } }
  | { type: 'LIST_ROOMS'; params: Record<string, never> }
  | { type: 'LIST_FURNITURE_TEMPLATES'; params: { category?: string } }
  | { type: 'UNKNOWN'; params: { message: string } };

// System prompt for the AI - simplified for smaller models
const SYSTEM_PROMPT = `Você é um assistente de plantas baixas. Responda em português.

REGRA IMPORTANTE: Para criar/modificar a planta, você DEVE incluir um comando JSON.

COMANDOS (copie exatamente, só mude os valores):

Criar cômodo:
{"action":"ADD_ROOM","params":{"name":"Sala","x":0,"y":0,"width":400,"height":300}}

Listar cômodos:
{"action":"LIST_ROOMS","params":{}}

Adicionar porta:
{"action":"ADD_DOOR","params":{"roomId":"room-1","wall":"south","offset":100}}

Adicionar janela:
{"action":"ADD_WINDOW","params":{"roomId":"room-1","wall":"north","offset":50}}

MEDIDAS: Use centímetros. 1 metro = 100cm.
- Quarto: 300x300 (3x3m)
- Sala: 400x350 (4x3.5m)  
- Cozinha: 300x250 (3x2.5m)
- Banheiro: 200x200 (2x2m)

EXEMPLO:
Usuário: "crie uma sala de 4x3 metros"
Resposta: Vou criar a sala! {"action":"ADD_ROOM","params":{"name":"Sala","x":0,"y":0,"width":400,"height":300}}`;



export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ParsedResponse {
  text: string;
  action?: FloorPlanAction;
}

class AIChatService {
  private engine: webllm.MLCEngine | null = null;
  private isLoading = false;
  private loadProgress = 0;
  private currentModel: string | null = null;
  private onProgressCallback: ((progress: number, status: string) => void) | null = null;

  async isWebGPUSupported(): Promise<boolean> {
    if (!navigator.gpu) {
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  setProgressCallback(callback: (progress: number, status: string) => void) {
    this.onProgressCallback = callback;
  }

  async loadModel(modelId: string = DEFAULT_MODEL): Promise<void> {
    if (this.isLoading) {
      throw new Error('Modelo já está sendo carregado');
    }

    if (this.engine && this.currentModel === modelId) {
      return; // Already loaded
    }

    this.isLoading = true;
    this.loadProgress = 0;

    try {
      // Check WebGPU support
      const supported = await this.isWebGPUSupported();
      if (!supported) {
        throw new Error('WebGPU não é suportado neste navegador. Use Chrome ou Edge atualizado.');
      }

      this.onProgressCallback?.(0, 'Inicializando...');

      // Create engine with progress callback
      this.engine = new webllm.MLCEngine();
      
      this.engine.setInitProgressCallback((report) => {
        this.loadProgress = report.progress;
        this.onProgressCallback?.(report.progress, report.text);
      });

      await this.engine.reload(modelId);
      this.currentModel = modelId;
      this.onProgressCallback?.(1, 'Modelo carregado!');
    } catch (error) {
      this.engine = null;
      this.currentModel = null;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<ParsedResponse> {
    if (!this.engine) {
      throw new Error('Modelo não carregado. Carregue o modelo primeiro.');
    }

    // Add system prompt if not present
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    try {
      const response = await this.engine.chat.completions.create({
        messages: fullMessages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseResponse(content);
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onToken: (token: string) => void
  ): Promise<ParsedResponse> {
    if (!this.engine) {
      throw new Error('Modelo não carregado. Carregue o modelo primeiro.');
    }

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    let fullContent = '';

    try {
      const asyncGenerator = await this.engine.chat.completions.create({
        messages: fullMessages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 512,
        stream: true,
      });

      for await (const chunk of asyncGenerator) {
        const token = chunk.choices[0]?.delta?.content || '';
        fullContent += token;
        onToken(token);
      }

      return this.parseResponse(fullContent);
    } catch (error) {
      console.error('Chat stream error:', error);
      throw error;
    }
  }

  private parseResponse(content: string): ParsedResponse {
    console.log('[AI] Raw response:', content);
    
    // Try multiple patterns to extract JSON
    const patterns = [
      /\{"action"\s*:\s*"([^"]+)"\s*,\s*"params"\s*:\s*(\{[^}]*\})\}/,
      /\{[^{}]*"action"[^{}]*"params"[^{}]*\{[^{}]*\}[^{}]*\}/,
      /\{"action":"([^"]+)","params":(\{[^}]+\})\}/,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          // Try to extract the full JSON object
          const startIdx = content.indexOf('{"action"');
          if (startIdx !== -1) {
            // Find matching closing brace
            let braceCount = 0;
            let endIdx = startIdx;
            for (let i = startIdx; i < content.length; i++) {
              if (content[i] === '{') braceCount++;
              if (content[i] === '}') braceCount--;
              if (braceCount === 0) {
                endIdx = i + 1;
                break;
              }
            }
            
            const jsonStr = content.substring(startIdx, endIdx);
            console.log('[AI] Extracted JSON:', jsonStr);
            
            const parsed = JSON.parse(jsonStr);
            if (parsed.action && parsed.params !== undefined) {
              const text = content.replace(jsonStr, '').trim();
              console.log('[AI] Parsed action:', parsed.action, parsed.params);
              return {
                text: text || 'Executando ação...',
                action: {
                  type: parsed.action,
                  params: parsed.params,
                } as FloorPlanAction,
              };
            }
          }
        } catch (e) {
          console.log('[AI] JSON parse error:', e);
        }
      }
    }
    
    // Fallback: try to find any JSON-like structure
    const simpleMatch = content.match(/\{[^{}]+\}/g);
    if (simpleMatch) {
      for (const potential of simpleMatch) {
        try {
          const parsed = JSON.parse(potential);
          if (parsed.action) {
            console.log('[AI] Fallback parsed:', parsed);
            return {
              text: content.replace(potential, '').trim() || 'Executando ação...',
              action: {
                type: parsed.action,
                params: parsed.params || {},
              } as FloorPlanAction,
            };
          }
        } catch {
          // Continue to next match
        }
      }
    }

    console.log('[AI] No action found in response');
    return { text: content };
  }

  isModelLoaded(): boolean {
    return this.engine !== null;
  }

  getLoadProgress(): number {
    return this.loadProgress;
  }

  isLoadingModel(): boolean {
    return this.isLoading;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.currentModel = null;
    }
  }
}

// Singleton instance
export const aiChatService = new AIChatService();
