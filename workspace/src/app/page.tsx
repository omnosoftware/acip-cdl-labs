"use client";
import React, { useState, useRef, useEffect } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ type: "user" | "assistant"; content: string }[]>([]);
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
    setMessages((prev) => [...prev, { type: "user", content: text }]);
    setQuestion("");

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { type: "assistant", content: `Erro: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { type: "assistant", content: data.answer }]);
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
                EMPRESA
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
                Assistente Inteligente
              </h1>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.82)",
                  margin: "2px 0 0 0",
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                Conteudo sobre a TRATOPEL em Patrocinio-MG
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
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
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
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏭</div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "800",
                color: brand.ink,
                marginBottom: "8px",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              Assistente TRATOPEL
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "#4B5563",
                marginBottom: "32px",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              Pergunte sobre noticias, presencia digital e informacoes publicas da empresa em Patrocinio-MG
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
                "Quais links recentes falam sobre a TRATOPEL em Patrocinio-MG?",
                "O que a TRATOPEL divulga sobre produtos e servicos?",
                "Existe alguma noticia institucional da TRATOPEL nos ultimos anos?",
                "Quais canais online da TRATOPEL aparecem na busca?",
                "Resuma as informacoes encontradas sobre a TRATOPEL",
                "Quais dados publicos existem sobre a TRATOPEL em Minas Gerais?",
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
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = brand.soft;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = brand.green;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(28,124,84,0.15)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ffffff";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#DCE6DE";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {pergunta}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                maxWidth: "700px",
              }}
            >
              {[
                { icon: "🔎", label: "Busca de links" },
                { icon: "📄", label: "Resumo objetivo" },
                { icon: "🏢", label: "Foco na TRATOPEL" },
                { icon: "⚡", label: "Resposta rapida" },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#F6FAF7",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: brand.forest,
                    fontWeight: "700",
                    fontFamily: "'Manrope', sans-serif",
                    border: "1px solid rgba(28, 124, 84, 0.1)",
                  }}
                >
                  {feature.icon} {feature.label}
                </div>
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
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderRadius: "12px 12px 12px 2px",
                    backgroundColor: "#EEF2EF",
                    color: brand.ink,
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: brand.green, animation: "bounce 1.4s infinite" }} />
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: brand.green,
                        animation: "bounce 1.4s infinite",
                        animationDelay: "0.2s",
                      }}
                    />
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: brand.green,
                        animation: "bounce 1.4s infinite",
                        animationDelay: "0.4s",
                      }}
                    />
                  </div>
                </div>
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
              placeholder="Pergunte sobre a TRATOPEL..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #DCE6DE",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
                backgroundColor: loading ? "#F1F5F1" : "#ffffff",
                color: brand.ink,
                fontFamily: "'Manrope', sans-serif",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: loading || !question.trim() ? "#A7C4B2" : brand.forest,
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                fontFamily: "'Manrope', sans-serif",
                boxShadow: loading || !question.trim() ? "none" : "0 2px 6px rgba(15,81,50,0.3)",
              }}
              onMouseEnter={(e) => {
                if (!loading && question.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0B3F27";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(15, 81, 50, 0.38)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && question.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = brand.forest;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 6px rgba(15,81,50,0.3)";
                }
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
