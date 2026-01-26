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
  "https://expocaccer.com.br/",
  "https://expocaccer.com.br/cooperativa-de-cafe-disponibiliza-cartilha-de-safra-para-os-produtores-do-cerrado-mineiro/",
  "https://expocaccer.com.br/expocaccer-disponibiliza-cartilha-de-safra-para-os-cafeicultores/",
  "https://expocaccer.com.br/expocaccer-lanca-tutorial-para-acesso-ao-portal-do-cooperado/",
  "https://expocaccer.com.br/expocaccer-revela-avancos-em-sustentabilidade-em-relatorio-de-2022/",
  "https://dulcerrado.com.br/"
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
    const { question, includeWebUrls = true, customUrls = [] } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Pergunta é obrigatória." }, { status: 400 });
    }

    let allChunks: { source: string, chunk: string }[] = [];

    // 1. Processar URLs customizadas (se fornecidas)
    if (Array.isArray(customUrls) && customUrls.length > 0) {
      for (const url of customUrls) {
        try {
          let text = "";
          if (url.toLowerCase().endsWith(".pdf")) {
            text = await extractPdfFromUrl(url);
          } else {
            text = await extractHtmlText(url);
          }
          const chunks = chunkText(text);
          allChunks.push(...chunks.map(chunk => ({ source: url, chunk })));
          console.log(`Processado URL: ${url} - ${chunks.length} chunks`);
        } catch (e) {
          console.error(`Erro ao processar URL ${url}:`, e);
        }
      }
    }

    // 2. Processar PDFs locais (DESATIVADO)
    /*
    try {
      const files = await readdir(DOCUMENTS_DIR);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

      console.log(`Encontrados ${pdfFiles.length} PDFs locais`);

      for (const pdfFile of pdfFiles) {
        try {
          const filePath = path.join(DOCUMENTS_DIR, pdfFile);
          const text = await extractPdfText(filePath);
          const chunks = chunkText(text);
          allChunks.push(...chunks.map(chunk => ({ source: pdfFile, chunk })));
          console.log(`Processado: ${pdfFile} - ${chunks.length} chunks`);
        } catch (e) {
          console.error(`Erro ao processar PDF ${pdfFile}:`, e);
        }
      }
    } catch (e) {
      console.error("Erro ao ler diretório de documentos:", e);
    }
    */

    // 3. Opcionalmente processar URLs web padrão
    if (includeWebUrls) {
      for (const url of WEB_URLS) {
        try {
          const text = await extractHtmlText(url);
          const chunks = chunkText(text);
          allChunks.push(...chunks.map(chunk => ({ source: url, chunk })));
        } catch (e) {
          console.error(`Erro ao processar URL ${url}:`, e);
        }
      }
    }

    if (allChunks.length === 0) {
      return NextResponse.json({
        error: "Nenhum conteúdo encontrado. Verifique se as URLs estão corretas."
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
    const prompt = `Você é um assistente RAG para documentos da Expocaccer. Responda à pergunta do usuário com base nos trechos abaixo de forma clara e objetiva.\n\nPergunta: ${question}\n\nTrechos dos documentos:\n${context}\n\nResposta:`;

    // Valida chave Gemini
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Chave Gemini não configurada corretamente." }, { status: 500 });
    }

    let answer = "";
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt} de usar Gemini...`);
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        });

        if (!geminiRes.ok) {
          const geminiError = await geminiRes.json() as any;
          const errorMessage = geminiError.error?.message || geminiRes.statusText;

          // Se for erro de quota/limite (429), espera e tenta de novo
          if (geminiRes.status === 429 || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("rate limit")) {
            console.warn(`Limite de taxa atingido na tentativa ${attempt}. Esperando...`);
            if (attempt === maxRetries) throw new Error(`Gemini Error (Quota Exceeded): ${errorMessage}`);

            // Espera exponencial: 5s, 10s, 20s...
            const waitTime = 5000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(`Gemini Error: ${errorMessage}`);
        }

        const geminiData = await geminiRes.json() as any;
        answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!answer) {
          throw new Error("Gemini retornou resposta vazia.");
        }

        // Se deu certo, sai do loop
        break;

      } catch (geminiError) {
        console.error(`Erro no Gemini (Tentativa ${attempt}):`, geminiError);
        if (attempt === maxRetries) {
          return NextResponse.json({
            error: "Erro ao consultar Gemini após várias tentativas.",
            details: geminiError instanceof Error ? geminiError.message : String(geminiError)
          }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Erro no endpoint RAG:", error);
    return NextResponse.json({
      error: "Erro interno ao processar a requisição.",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 });
  }
}
