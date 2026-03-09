import { NextRequest, NextResponse } from "next/server";
import products from "@/data/products.json";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type SourceChunk = { source: string; chunk: string };

const FALLBACK_TRATOPEL_URLS = [
  "https://www.patrociniofacil.com.br/index.php?/informacao/empresa/tratopel-7022.html",
  "https://cnpj.biz/09073443000195",
  "https://casadosdados.com.br/solucao/cnpj/tratopel-ltda-09073443000195",
  "https://www.qualcnpj.com/tratopel-ltda-09073443000195",
];

// Tools definition for Gemini
const tools = [
  {
    function_declarations: [
      {
        name: "get_product_catalog",
        description: "Retorna a lista completa de produtos disponíveis na TRATOPEL com preços e estoque.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "search_products",
        description: "Busca produtos específicos no catálogo por nome ou categoria.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Termo de busca (ex: milho, fertilizante)" }
          },
          required: ["query"]
        }
      },
      {
        name: "generate_quote",
        description: "Calcula o valor total de uma cotação baseada em itens e quantidades.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  quantity: { type: "number" }
                },
                required: ["productId", "quantity"]
              }
            }
          },
          required: ["items"]
        }
      },
      {
        name: "generate_payment_code",
        description: "Gera os dados para pagamento via PIX (Copia e Cola e QR Code) para uma cotação.",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Valor total do pagamento" },
            description: { type: "string", description: "Breve descrição do pedido" }
          },
          required: ["amount"]
        }
      }
    ]
  }
];

// Tool implementation handlers
const toolHandlers: Record<string, (args: any) => any> = {
  get_product_catalog: () => products,
  search_products: ({ query }: { query: string }) => {
    const q = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  },
  generate_quote: ({ items }: { items: { productId: string; quantity: number }[] }) => {
    const quoteItems = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return { error: `Produto ${item.productId} não encontrado` };
      return {
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal: product.price * item.quantity
      };
    });
    const total = quoteItems.reduce((acc, item: any) => acc + (item.subtotal || 0), 0);
    return { items: quoteItems, total };
  },
  generate_payment_code: ({ amount, description }: { amount: number; description?: string }) => {
    const PIX_KEY = process.env.PIX_KEY || "08227294669"; // Igor's key
    const MERCHANT_NAME = "TRATOPEL";
    const MERCHANT_CITY = "PATROCINIO";

    // We return structured data that the frontend will interpret
    return {
      type: "payment_pix",
      amount,
      pix_key: PIX_KEY,
      merchant_name: MERCHANT_NAME,
      merchant_city: MERCHANT_CITY,
      description: description || "Pedido TRATOPEL"
    };
  }
};

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
    const { question, history = [] } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Pergunta é obrigatória." }, { status: 400 });
    }

    // RAG Logic for non-transactional queries
    const discoveredUrls = await discoverTratopelLinks(question);
    const targetUrls = [...new Set([...discoveredUrls, ...FALLBACK_TRATOPEL_URLS])].slice(0, 4);

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

    const relevant = findRelevantChunks(allChunks, question);
    const context = relevant.map((item, i) => `Trecho ${i + 1} | Fonte: ${item.source}\n${item.chunk}`).join("\n\n");

    const systemPrompt = `Você é o assistente inteligente da TRATOPEL, em Patrocínio-MG. 
Sua missão é ajudar clientes com informações sobre a empresa, produtos e realizar cotações/pedidos.
A TRATOPEL atua no agronegócio (peças de tratores, mecânica pesada, lubrificantes).

Instruções:
1. Para informações gerais, use o contexto fornecido.
2. Para preços, estoque ou catálogo, USE OBRIGATORIAMENTE as ferramentas disponíveis.
3. Se o cliente quiser uma cotação, peça os itens e quantidades e use a ferramenta 'generate_quote'.
4. Após gerar uma cotação, informe ao cliente que ele pode baixar o arquivo em **PDF** ou **EXCEL**.
5. Ofereça a opção de gerar o código **PIX** para pagamento imediato usando a ferramenta 'generate_payment_code'.
6. Seja profissional, prestativo e fale como um consultor de vendas agrícola.

Contexto RAG:
${context}`;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Chave Gemini não configurada." }, { status: 500 });
    }

    // Gemini API call with Tool Use
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...history,
          { role: "user", parts: [{ text: question }] }
        ],
        tools,
        generationConfig: { temperature: 0.2 }
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erro na API Gemini");

    let message = data.candidates?.[0]?.content;

    // Handle Tool Calls
    if (message?.parts?.[0]?.functionCall) {
      const call = message.parts[0].functionCall;
      const result = await toolHandlers[call.name](call.args);

      // Send tool response back to Gemini
      const toolResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...history,
            { role: "user", parts: [{ text: question }] },
            message,
            {
              role: "function",
              parts: [{
                functionResponse: {
                  name: call.name,
                  response: { content: result }
                }
              }]
            }
          ],
          tools,
          generationConfig: { temperature: 0.2 }
        }),
      });

      const finalData = await toolResponse.json();
      const finalMsg = finalData.candidates?.[0]?.content?.parts?.[0]?.text;
      return NextResponse.json({ answer: finalMsg, sources: relevant.map(r => r.source) });
    }

    return NextResponse.json({
      answer: message?.parts?.[0]?.text || "Desculpe, não consegui processar sua solicitação.",
      sources: relevant.map(r => r.source)
    });

  } catch (error) {
    console.error("Erro no endpoint:", error);
    return NextResponse.json({ error: "Erro interno ao processar a requisição." }, { status: 500 });
  }
}

