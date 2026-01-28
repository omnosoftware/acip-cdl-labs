import { NextRequest, NextResponse } from "next/server";
const PDFParser = require("pdf2json");
import { readdir, readFile } from "fs/promises";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Diret√≥rio onde os PDFs est√£o armazenados
const DOCUMENTS_DIR = path.join(process.cwd(), "public", "documents");

// URLs de p√°ginas web para complementar o RAG (opcional)
const WEB_URLS = [
  "https://expocaccer.com.br/",
  "https://expocaccer.com.br/cooperativa-de-cafe-disponibiliza-cartilha-de-safra-para-os-produtores-do-cerrado-mineiro/",
  "https://expocaccer.com.br/expocaccer-disponibiliza-cartilha-de-safra-para-os-cafeicultores/",
  "https://expocaccer.com.br/expocaccer-lanca-tutorial-para-acesso-ao-portal-do-cooperado/",
  "https://expocaccer.com.br/expocaccer-revela-avancos-em-sustentabilidade-em-relatorio-de-2022/",
  "https://dulcerrado.com.br/"
];

// Fun√ß√£o para extrair texto de PDF local
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

// Fun√ß√£o para extrair texto de PDF remoto (URL)
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

// Fun√ß√£o para extrair texto de p√°gina web
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

// Divide texto em chunks de at√© 1500 caracteres
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
  // Filtra apenas os que t√™m alguma relev√¢ncia (score > 0)
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
      return NextResponse.json({ error: "Pergunta √© obrigat√≥ria." }, { status: 400 });
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
      console.error("Erro ao ler diret√≥rio de documentos:", e);
    }
    */

    // 3. Opcionalmente processar URLs web padr√£o (DESATIVADO - Apenas URLs enviadas)
    /*
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
    */

    if (allChunks.length === 0) {
      return NextResponse.json({
        error: "Nenhum conte√∫do encontrado. Verifique se as URLs est√£o corretas."
      }, { status: 400 });
    }

    console.log(`Total de chunks processados: ${allChunks.length}`);

    // Busca chunks relevantes
    const relevant = findRelevantChunks(allChunks.map(c => c.chunk), question);

    if (relevant.length === 0) {
      return NextResponse.json({
        answer: "N√£o encontrei informa√ß√µes relevantes nos documentos para responder sua pergunta. Tente reformular a pergunta."
      });
    }

    const context = relevant.map((chunk, i) => `Trecho ${i + 1}: ${chunk}`).join("\n\n");

    // Monta prompt
    const prompt = `Voc√™ √© um assistente RAG para documentos da Expocaccer. Responda √† pergunta do usu√°rio com base nos trechos abaixo de forma clara e objetiva.\n\nPergunta: ${question}\n\nTrechos dos documentos:\n${context}\n\nResposta:`;

    // Valida chave Gemini
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: \"Chave Gemini n„o configurada.\",
        suggestion: \"Configure GEMINI_API_KEY no arquivo .env.local\"
      }, { status: 500 });
    }

    try {
      console.log(\"Consultando Gemini...\");
      const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=, {
        method: \"POST\",
        headers: {
          \"Content-Type\": \"application/json\"
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

      // LÍ o corpo da resposta apenas uma vez
      const data = await response.json() as any;

      if (!response.ok) {
        const errorMessage = data.error?.message || data.error?.status || response.statusText || 'Erro desconhecido';
        
        // Detecta tipo de erro e fornece mensagem amig·vel
        let friendlyMessage = \"O Gemini est· temporariamente indisponÌvel.\";
        
        if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
          friendlyMessage = \"Limite de uso do Gemini atingido. Tente novamente mais tarde.\";
        } else if (errorMessage.toLowerCase().includes('not found') || response.status === 404) {
          friendlyMessage = \"Modelo Gemini n„o encontrado ou indisponÌvel na sua regi„o.\";
        } else if (response.status === 401 || response.status === 403) {
          friendlyMessage = \"Chave de API do Gemini inv·lida ou sem permiss„o.\";
        } else if (response.status >= 500) {
          friendlyMessage = \"Servidores do Gemini est„o com problemas.\";
        }
        
        return NextResponse.json({
          error: friendlyMessage,
          details: errorMessage
        }, { status: response.status });
      }

      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!answer) {
        return NextResponse.json({
          error: \"Gemini retornou resposta vazia.\",
          details: \"Nenhum conte˙do foi gerado pela API.\"
        }, { status: 500 });
      }

      return NextResponse.json({ answer });

    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : \"Erro desconhecido\";
      console.error(\"Erro ao consultar Gemini:\", errorMsg);
      
      return NextResponse.json({
        error: \"Erro ao processar requisiÁ„o com Gemini.\",
        details: errorMsg
      }, { status: 500 });
    }
  } catch (error) {
    console.error(\"Erro no endpoint RAG:\", error);
    return NextResponse.json({
      error: \"Erro interno ao processar a requisiÁ„o.\",
      details: error instanceof Error ? error.message : \"Erro desconhecido\"
    }, { status: 500 });
  }
}
