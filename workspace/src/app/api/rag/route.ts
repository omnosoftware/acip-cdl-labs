import { NextRequest, NextResponse } from "next/server";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type SourceChunk = { source: string; chunk: string };

const FALLBACK_TRATOPEL_URLS = [
  "https://www.patrociniofacil.com.br/index.php?/informacao/empresa/tratopel-7022.html",
  "https://cnpj.biz/09073443000195",
  "https://casadosdados.com.br/solucao/cnpj/tratopel-ltda-09073443000195",
  "https://www.qualcnpj.com/tratopel-ltda-09073443000195",
];

async function extractHtmlText(url: string): Promise<string> {
  const res = await fetch(url);
  const html = await res.text();
  const main = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");
  const text = main.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return text;
}

function chunkText(text: string, size = 1500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function findRelevantChunks(chunks: SourceChunk[], question: string): SourceChunk[] {
  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const keywords = normalize(question)
    .split(/[\s,?.!]+/)
    .filter((w) => w.length > 3);

  if (keywords.length === 0) return chunks.slice(0, 4);

  const scored = chunks.map((entry) => {
    const normChunk = normalize(entry.chunk);
    const sourceBonus = normalize(entry.source).includes("tratopel") ? 2 : 0;
    let score = sourceBonus;
    for (const kw of keywords) {
      if (normChunk.includes(kw)) score++;
    }
    return { ...entry, score };
  });

  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return top.map(({ source, chunk }) => ({ source, chunk }));
}

function decodeSearchRedirect(rawHref: string): string | null {
  if (!rawHref) return null;
  if (rawHref.startsWith("http://") || rawHref.startsWith("https://")) return rawHref;
  if (!rawHref.startsWith("/")) return null;

  const query = rawHref.split("?")[1];
  if (!query) return null;

  const params = new URLSearchParams(query);
  const decoded = params.get("uddg");
  if (!decoded) return null;

  try {
    return decodeURIComponent(decoded);
  } catch {
    return decoded;
  }
}

async function discoverTratopelLinks(question: string): Promise<string[]> {
  const query = encodeURIComponent(`${question} TRATOPEL patrocinio minas gerais`);
  const searchUrl = `https://duckduckgo.com/html/?q=${query}`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    return [];
  }

  const html = await res.text();
  const links = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi)]
    .map((m) => decodeSearchRedirect(m[1]))
    .filter((url): url is string => Boolean(url));

  const blockedHosts = ["duckduckgo.com", "google.com", "webcache.googleusercontent.com"];

  return [...new Set(links)]
    .filter((url) => /^https?:\/\//i.test(url))
    .filter((url) => {
      const normalized = url.toLowerCase();
      if (blockedHosts.some((host) => normalized.includes(host))) return false;
      return normalized.includes("tratopel") || normalized.includes("patrocinio");
    })
    .slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Pergunta é obrigatória." }, { status: 400 });
    }

    const discoveredUrls = await discoverTratopelLinks(question);
    const targetUrls = [...new Set([...discoveredUrls, ...FALLBACK_TRATOPEL_URLS])].slice(0, 8);

    const extracted = await Promise.allSettled(
      targetUrls.map(async (url) => {
        const text = await extractHtmlText(url);
        const chunks = chunkText(text);
        return chunks.map((chunk) => ({ source: url, chunk }));
      }),
    );

    const allChunks: SourceChunk[] = [];
    for (const result of extracted) {
      if (result.status === "fulfilled") {
        allChunks.push(...result.value);
      }
    }

    if (allChunks.length === 0) {
      return NextResponse.json({
        error: "Nao foi possivel acessar conteudos sobre a TRATOPEL no momento. Tente novamente.",
      }, { status: 400 });
    }

    console.log(`Total de chunks processados: ${allChunks.length}`);

    const relevant = findRelevantChunks(allChunks, question);

    if (relevant.length === 0) {
      return NextResponse.json({
        answer: "Nao encontrei informacoes relevantes sobre a TRATOPEL para responder sua pergunta. Tente reformular.",
      });
    }

    const context = relevant.map((item, i) => `Trecho ${i + 1} | Fonte: ${item.source}\n${item.chunk}`).join("\n\n");

    const prompt = `Voce e um assistente da empresa TRATOPEL, de Patrocinio-MG. Responda com base nos trechos abaixo de forma clara, objetiva e profissional. Se faltar informacao, diga isso explicitamente e nao invente.\n\nPergunta: ${question}\n\nTrechos:\n${context}\n\nResposta:`;

    if (GEMINI_API_KEY) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }],
            }],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        });

        const data = await response.json() as any;

        if (!response.ok) {
          const errorMessage = data.error?.message || data.error?.status || response.statusText || "Erro desconhecido";
          let friendlyMessage = "O Gemini esta temporariamente indisponivel.";

          if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("limit")) {
            friendlyMessage = "Limite de uso do Gemini atingido.";
          } else if (errorMessage.toLowerCase().includes("not found") || response.status === 404) {
            friendlyMessage = "Modelo Gemini nao encontrado ou indisponivel na sua regiao.";
          } else if (response.status === 401 || response.status === 403) {
            friendlyMessage = "Chave de API do Gemini invalida ou sem permissao.";
          } else if (response.status >= 500) {
            friendlyMessage = "Servidores do Gemini estao com problemas.";
          }

          console.warn(friendlyMessage, errorMessage);
          throw new Error(friendlyMessage);
        }

        const geminiAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (geminiAnswer) {
          const sources = [...new Set(relevant.map((item) => item.source))];
          return NextResponse.json({ answer: geminiAnswer, sources });
        } else {
          throw new Error("Gemini retornou resposta vazia.");
        }
      } catch (geminiError) {
        const errorMsg = geminiError instanceof Error ? geminiError.message : "Erro desconhecido no Gemini";
        console.error("Erro ao consultar Gemini:", errorMsg);

        return NextResponse.json({
          error: errorMsg,
          details: "Falha ao processar requisicao com Gemini.",
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: "Chave Gemini nao configurada.",
      suggestion: "Configure GEMINI_API_KEY no arquivo .env.local",
    }, { status: 500 });
  } catch (error) {
    console.error("Erro no endpoint RAG:", error);
    return NextResponse.json({
      error: "Erro interno ao processar a requisicao.",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    }, { status: 500 });
  }
}

