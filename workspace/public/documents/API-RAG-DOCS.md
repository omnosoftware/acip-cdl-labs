# API RAG - Documentação

## Endpoint: `/api/rag`

### Descrição
API para consultar documentos usando RAG (Retrieval-Augmented Generation) com OpenAI.

### Método: POST

### Parâmetros do Body (JSON)

```json
{
  "question": "string (obrigatório)",
  "includeWebUrls": "boolean (opcional, default: false)",
  "customUrls": "string[] (opcional, default: [])"
}
```

### Modos de Operação

#### 1. **Modo Local (Padrão)** - Mais rápido e confiável
Processa apenas PDFs locais da pasta `public/documents/`:

```json
{
  "question": "Qual é o procedimento para registrar o café na Expocaccer?"
}
```

#### 2. **Modo com URLs Customizadas**
Processa PDFs locais + URLs específicas que você fornecer:

```json
{
  "question": "Quais são as novidades?",
  "customUrls": [
    "https://exemplo.com/documento.pdf",
    "https://exemplo.com/pagina-web"
  ]
}
```

#### 3. **Modo Completo**
Processa PDFs locais + URLs customizadas + URLs web padrão:

```json
{
  "question": "Informações sobre sustentabilidade",
  "includeWebUrls": true,
  "customUrls": ["https://exemplo.com/relatorio.pdf"]
}
```

### Respostas

**Sucesso (200)**:
```json
{
  "answer": "Resposta gerada pela IA com base nos documentos..."
}
```

**Erro (400/500)**:
```json
{
  "error": "Mensagem de erro"
}
```

### PDFs Locais Disponíveis

Os seguintes PDFs foram baixados e estão prontos para uso:
- `Cartilha-Safra-2023.pdf`
- `Cartilha-Safra-2021.pdf`
- `Relatorio-2020.pdf`
- `Relatorio-2021.pdf`

Para adicionar mais PDFs, basta colocá-los na pasta `public/documents/`.

### Exemplo de Uso (Frontend)

```typescript
const response = await fetch('/api/rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Como funciona o processo de safra?'
  })
});

const data = await response.json();
console.log(data.answer);
```
