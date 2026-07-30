# My-Dev-Journey

Portfólio com tracking de metas, incluindo um **agente conversacional** que responde
com base no conteúdo do site usando um **LLM local via [Ollama](https://ollama.com)**.

## Pré-requisitos

- Node.js 18+
- [Ollama](https://ollama.com) instalado e em execução
- O modelo baixado (modelo pequeno, rápido em CPU):

  ```bash
  ollama pull llama3.2:1b
  ```

  > O `llama2` (7B) é lento demais em CPU (dezenas de segundos até o 1º token), por
  > isso o padrão é o `llama3.2:1b`. Qualquer modelo pode ser trocado via `.env`.

## Como rodar

```bash
npm install
npm run dev
```

O app sobe em `http://localhost:4173`. Abra o balão de chat (💬) no canto da página.
O indicador de status mostra se o Ollama está **conectado** (ponto verde) ou **offline**.

## Como funciona o agente

- As perguntas são enviadas ao Ollama (endpoint compatível com a API OpenAI,
  `POST /v1/chat/completions`) em **modo streaming**: a resposta aparece token a token.
- Se o Ollama estiver indisponível, a resposta cair em timeout ou vier vazia, o agente
  usa um **fallback local** baseado nos dados do site, e o motivo é exibido abaixo da resposta.

## Configuração (opcional)

Copie `.env.example` para `.env` para ajustar a integração:

| Variável                   | Padrão                  | Descrição                                            |
| -------------------------- | ----------------------- | ---------------------------------------------------- |
| `VITE_OLLAMA_URL`          | `http://127.0.0.1:11434`| URL do servidor Ollama                               |
| `VITE_OLLAMA_MODEL`        | `llama3.2:1b`           | Modelo usado (pequeno e rápido em CPU)               |
| `VITE_OLLAMA_MAX_TOKENS`   | `500`                   | Máximo de tokens por resposta                        |
| `VITE_OLLAMA_TIMEOUT_MS`   | `60000`                 | Timeout ocioso (ms) entre tokens antes de abortar    |

> **Nota:** a inferência local pode ser lenta em CPU (alguns segundos por resposta).
> O streaming foi adotado justamente para exibir o texto conforme é gerado.
