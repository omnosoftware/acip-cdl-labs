import React, { useState, useRef, useEffect } from "react";
import { generatePixPayload } from "@/lib/pix";
import { generatePDF, generateExcel } from "@/lib/export";

// Simple UI Component for PIX/Docs
const ActionCard = ({ type, data, brand }: any) => {
  const [copied, setCopied] = useState(false);

  if (type === "payment") {
    const pixCode = generatePixPayload(
      data.pix_key,
      data.amount,
      data.merchant_name,
      data.merchant_city,
      data.description
    );
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`;

    const copyToClipboard = () => {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "12px", border: `1px solid ${brand.green}`, marginTop: "10px" }}>
        <p style={{ fontWeight: "700", marginBottom: "8px", fontSize: "14px" }}>💳 Pagamento Instantâneo (PIX)</p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <img src={qrCodeUrl} alt="QR Code PIX" style={{ borderRadius: "8px", width: "160px" }} />
        </div>
        <p style={{ fontSize: "12px", color: brand.ink, marginBottom: "12px", textAlign: "center" }}>
          Escaneie o código acima ou copie a chave abaixo.
        </p>
        <button
          onClick={copyToClipboard}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: brand.forest,
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          {copied ? "✅ Copiado!" : "📋 Copiar Código PIX"}
        </button>
      </div>
    );
  }

  return null;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  // Messages can now contain structured metadata
  const [messages, setMessages] = useState<{ type: "user" | "assistant"; content: string; metadata?: any }[]>([]);
  const [lastQuote, setLastQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const brand = {
    forest: "#0F5132",
    green: "#1C7C54",
    soft: "#EEF5F0",
    gold: "#D9A441",
    ink: "#10221A",
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const askQuestion = async (text: string) => {
    if (!text.trim()) return;

    setLoading(true);
    const newMessages = [...messages, { type: "user", content: text }];
    setMessages(newMessages as any);
    setQuestion("");

    const history = messages.map(msg => ({
      role: msg.type === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { type: "assistant", content: `Erro: ${data.error}` }]);
      } else {
        // Update last quote if the tool return a quote
        if (data.metadata?.items && data.metadata?.total) {
          setLastQuote(data.metadata);
        }
        setMessages((prev) => [...prev, { type: "assistant", content: data.answer, metadata: data.metadata }]);
      }
    } catch {
      setMessages((prev) => [...prev, { type: "assistant", content: "Erro ao conectar ao servidor. Tente novamente." }]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await askQuestion(question);
  };

  // Product Card Component
  const ProductCard = ({ product, brand }: any) => {
    return (
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        border: "1px solid #DCE6DE",
        overflow: "hidden",
        width: "180px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
      }}>
        {product.image && (
          <div style={{ height: "100px", overflow: "hidden", backgroundColor: "#f9f9f9" }}>
            <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ padding: "10px", display: "flex", flexDirection: "column", flex: 1 }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: brand.ink, margin: "0 0 4px 0", lineHeight: "1.2", height: "30px", overflow: "hidden" }}>
            {product.name}
          </p>
          <p style={{ fontSize: "14px", fontWeight: "800", color: brand.green, margin: "auto 0 0 0" }}>
            R$ {product.price.toFixed(2)}
          </p>
        </div>
      </div>
    );
  };

  // Helper to extract quote info and offer downloads
  const renderMessageContent = (msg: any) => {
    const isAssistant = msg.type === "assistant";

    // Check if metadata contains a list of products
    const productList = Array.isArray(msg.metadata) ? msg.metadata : (msg.metadata?.products || null);

    // Check if message mentions quote/total or has metadata items
    const hasQuote = msg.metadata?.items || msg.content.toLowerCase().includes("total");

    // Check if it's a payment tool response in metadata
    const isPayment = msg.metadata?.type === "payment_pix";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>{msg.content}</div>

        {isAssistant && productList && (
          <div style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            padding: "10px 0",
            msOverflowStyle: "none",
            scrollbarWidth: "none"
          }}>
            {productList.map((p: any, idx: number) => (
              <ProductCard key={idx} product={p} brand={brand} />
            ))}
          </div>
        )}

        {isAssistant && hasQuote && lastQuote && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={() => generatePDF({ ...lastQuote, customerName: "Igor" })}
              style={{ padding: "6px 10px", fontSize: "11px", backgroundColor: "#fff", border: `1px solid ${brand.green}`, borderRadius: "4px", cursor: "pointer", color: brand.forest }}
            >
              📄 Baixar PDF
            </button>
            <button
              onClick={() => generateExcel(lastQuote)}
              style={{ padding: "6px 10px", fontSize: "11px", backgroundColor: "#fff", border: `1px solid ${brand.green}`, borderRadius: "4px", cursor: "pointer", color: brand.forest }}
            >
              📊 Baixar Excel
            </button>
          </div>
        )}

        {isAssistant && isPayment && (
          <ActionCard
            type="payment"
            brand={brand}
            data={msg.metadata}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", backgroundColor: "#ffffff" }}>
      <div
        style={{
          padding: "0",
          background: `linear-gradient(95deg, ${brand.forest} 0%, ${brand.green} 75%)`,
          boxShadow: "0 2px 14px rgba(15, 81, 50, 0.28)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            width: "100%",
            justifyContent: "space-between",
            padding: "0 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            <svg width="220" height="55" viewBox="0 0 220 55" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <rect width="220" height="55" rx="4" fill={brand.forest} />
              <circle cx="26" cy="27" r="14" fill={brand.gold} />
              <path d="M21 29 C23 22, 28 20, 32 18" stroke={brand.forest} strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M20 33 C24 37, 31 37, 34 32" stroke={brand.forest} strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <text x="50" y="20" fill="rgba(255,255,255,0.72)" fontSize="9" fontFamily="Manrope, Arial, sans-serif" fontWeight="700" letterSpacing="2">
                E-COMMERCE
              </text>
              <text x="50" y="40" fill="#ffffff" fontSize="20" fontFamily="Manrope, Arial, sans-serif" fontWeight="800">
                TRATOPEL
              </text>
            </svg>
            <div style={{ marginLeft: "16px" }}>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#ffffff",
                  margin: 0,
                  fontFamily: "'Manrope', sans-serif",
                  letterSpacing: "0.4px",
                }}
              >
                Assistente de Vendas
              </h1>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.82)",
                  margin: "2px 0 0 0",
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                Cotações e Pedidos - Patrocínio-MG
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setQuestion("");
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "'Manrope', sans-serif",
                transition: "all 0.2s",
              }}
            >
              <span>←</span> Nova conversa
            </button>
          )}
        </div>
      </div>

      <div style={{ height: "3px", background: "linear-gradient(90deg, #D9A441 0%, #F0C46A 50%, #D9A441 100%)" }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0", backgroundColor: "#ffffff" }}>
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              textAlign: "center",
              padding: "20px",
              animation: "slideUp 0.5s ease-out",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚜</div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "800",
                color: brand.ink,
                marginBottom: "8px",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              Vendas TRATOPEL
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "#4B5563",
                marginBottom: "32px",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              Consulte preços, faça cotações e realize pedidos de forma rápida e inteligente.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                maxWidth: "700px",
                marginBottom: "32px",
              }}
            >
              {[
                "Quais os produtos disponíveis hoje?",
                "Quero fazer uma cotação de peças para trator",
                "Quais serviços de oficina vocês oferecem?",
                "Quanto custa o filtro de óleo e a bateria?",
                "Vocês entregam peças em fazendas da região?",
                "Como faço para pagar via PIX?",
                "Tem bomba injetora para caminhão?",
                "Gostaria de orçar uma revisão completa no meu trator",
              ].map((pergunta, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(pergunta);
                    askQuestion(pergunta);
                  }}
                  style={{
                    padding: "14px 16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #DCE6DE",
                    borderRadius: "10px",
                    fontSize: "14px",
                    color: "#26352C",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                    fontFamily: "'Manrope', sans-serif",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  {pergunta}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "900px", margin: "0 auto", paddingLeft: "20px", paddingRight: "20px" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                }}
              >
                <div
                  style={{
                    maxWidth: "600px",
                    padding: "12px 16px",
                    borderRadius: msg.type === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    backgroundColor: msg.type === "user" ? brand.forest : "#EEF2EF",
                    color: msg.type === "user" ? "#ffffff" : brand.ink,
                    fontSize: "15px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    fontFamily: "'Manrope', sans-serif",
                    boxShadow:
                      msg.type === "user" ? "0 2px 6px rgba(15, 81, 50, 0.28)" : "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ paddingLeft: "40px", marginTop: "12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: brand.green, animation: "bounce 1.4s infinite" }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #DCE6DE", padding: "16px 20px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Digite seu pedido ou cotação..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #DCE6DE",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
                fontFamily: "'Manrope', sans-serif",
              }}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: brand.forest,
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: "Manrope", sans-serif; }
      `}</style>
    </div>
  );
}
