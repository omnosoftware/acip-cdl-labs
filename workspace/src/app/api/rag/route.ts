import { NextRequest, NextResponse } from "next/server";
const PDFParser = require("pdf2json");
import { readdir, readFile } from "fs/promises";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Diretório onde os PDFs estão armazenados
const DOCUMENTS_DIR = path.join(process.cwd(), "public", "documents");

// URLs de páginas web para complementar o RAG (opcional)
const WEB_URLS = [
  "https://www.sonoticiaboa.com.br/",
  "https://www.sonoticiaboa.com.br/categoria/meio-ambiente/",
  "https://www.sonoticiaboa.com.br/categoria/educacao/",
  "https://www.sonoticiaboa.com.br/categoria/saude/",
  "https://www.sonoticiaboa.com.br/categoria/social/"
];

// Função para extrair texto de PDF local
async function extractPdfText(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      resolve(pdfParser.getRawTextContent());
    });

    try {
      pdfParser.loadPDF(filePath);
    } catch (e) {
      reject(e);
    }
  });
}

// Função para extrair texto de PDF remoto (URL)
async function extractPdfFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      resolve(pdfParser.getRawTextContent());
    });

    try {
      pdfParser.parseBuffer(buffer);
    } catch (e) {
      reject(e);
    }
  });
}

// Função para extrair texto de página web
async function extractHtmlText(url: string): Promise<string> {
  const res = await fetch(url);
  const html = await res.text();
  // Remove scripts, styles, menus, footers, etc.
  const main = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");
  const text = main.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return text;
}

// Divide texto em chunks de até 1500 caracteres
function chunkText(text: string, size = 1500): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Busca trechos relevantes (Score por palavras-chave)
function findRelevantChunks(chunks: string[], question: string): string[] {
  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Extrai palavras-chave (ignorando palavras curtas <= 3 chars)
  const keywords = normalize(question)
    .split(/[\s,?.!]+/)
    .filter(w => w.length > 3);

  if (keywords.length === 0) return chunks.slice(0, 3);

  const scored = chunks.map(chunk => {
    const normChunk = normalize(chunk);
    let score = 0;
    for (const kw of keywords) {
      if (normChunk.includes(kw)) score++;
    }
    return { chunk, score };
  });

  // Ordena por score decrescente e pega os top 3
  // Filtra apenas os que têm alguma relevância (score > 0)
  const top = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return top.map(s => s.chunk);
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Pergunta é obrigatória." }, { status: 400 });
    }

    let allChunks: { source: string, chunk: string }[] = [];

    // 1. Processar URLs do Só Notícia Boa (sempre ativo)
    for (const url of WEB_URLS) {
      try {
        const text = await extractHtmlText(url);
        const chunks = chunkText(text);
        allChunks.push(...chunks.map(chunk => ({ source: url, chunk })));
        console.log(`Processado URL: ${url} - ${chunks.length} chunks`);
      } catch (e) {
        console.error(`Erro ao processar URL ${url}:`, e);
      }
    }

    if (allChunks.length === 0) {
      return NextResponse.json({
        error: "Não foi possível acessar o conteúdo do Só Notícia Boa no momento. Tente novamente."
      }, { status: 400 });
    }

    console.log(`Total de chunks processados: ${allChunks.length}`);

    // Busca chunks relevantes
    const relevant = findRelevantChunks(allChunks.map(c => c.chunk), question);

    if (relevant.length === 0) {
      return NextResponse.json({
        answer: "Não encontrei informações relevantes nos documentos para responder sua pergunta. Tente reformular a pergunta."
      });
    }

    const context = relevant.map((chunk, i) => `Trecho ${i + 1}: ${chunk}`).join("\n\n");

    // Monta prompt
    const prompt = `Você é um assistente do portal Só Notícia Boa (sonoticiaboa.com.br), especializado em boas notícias, histórias inspiradoras, iniciativas sociais, meio ambiente, educação e saúde. Responda à pergunta do usuário com base nos trechos abaixo de forma clara, positiva e objetiva.\n\nPergunta: ${question}\n\nTrechos dos documentos:\n${context}\n\nResposta:`;

    let answer = "";

    // Tenta usar Gemini primeiro
    if (GEMINI_API_KEY) {
      try {
        console.log("Consultando Gemini...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.3
            }
          })
        });

        // Lê o corpo da resposta apenas uma vez
        const data = await response.json() as any;

        if (!response.ok) {
          const errorMessage = data.error?.message || data.error?.status || response.statusText || 'Erro desconhecido';

          // Detecta tipo de erro e fornece mensagem amigável
          let friendlyMessage = "O Gemini está temporariamente indisponível.";

          if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
            friendlyMessage = "Limite de uso do Gemini atingido. Tentando provedor alternativo...";
          } else if (errorMessage.toLowerCase().includes('not found') || response.status === 404) {
            friendlyMessage = "Modelo Gemini não encontrado ou indisponível na sua região.";
          } else if (response.status === 401 || response.status === 403) {
            friendlyMessage = "Chave de API do Gemini inválida ou sem permissão.";
          } else if (response.status >= 500) {
            friendlyMessage = "Servidores do Gemini estão com problemas. Tentando provedor alternativo...";
          }

          console.warn(friendlyMessage, errorMessage);
          throw new Error(friendlyMessage);
        }

        const geminiAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (geminiAnswer) {
          return NextResponse.json({ answer: geminiAnswer });
        } else {
          throw new Error("Gemini retornou resposta vazia. Tentando provedor alternativo...");
        }
      } catch (geminiError) {
        const errorMsg = geminiError instanceof Error ? geminiError.message : "Erro desconhecido no Gemini";
        console.error("Erro ao consultar Gemini:", errorMsg);

        return NextResponse.json({
          error: errorMsg,
          details: "Falha ao processar requisição com Gemini."
        }, { status: 500 });
      }
    }

    // Se não tiver chave Gemini configurada
    return NextResponse.json({
      error: "Chave Gemini não configurada.",
      suggestion: "Configure GEMINI_API_KEY no arquivo .env.local"
    }, { status: 500 });
  } catch (error) {
    console.error("Erro no endpoint RAG:", error);
    return NextResponse.json({
      error: "Erro interno ao processar a requisição.",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 });
  }
}

