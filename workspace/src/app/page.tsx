"use client";
import React, { useState, useRef, useEffect } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ type: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setMessages(prev => [...prev, { type: "user", content: question }]);
    setQuestion("");

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { type: "assistant", content: `Erro: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { type: "assistant", content: data.answer }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { type: "assistant", content: "Erro ao conectar ao servidor. Tente novamente." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", backgroundColor: "#ffffff" }}>
      {/* Header */}
      <div style={{
        padding: "0",
        backgroundColor: "#3D3B8E",
        boxShadow: "0 2px 12px rgba(61, 59, 142, 0.3)"
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          width: "100%",
          justifyContent: "space-between",
          padding: "0 20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
            {/* Logo SVG à esquerda — reproduz a imagem fornecida */}
            <svg width="220" height="55" viewBox="0 0 220 55" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <rect width="220" height="55" rx="4" fill="#3D3B8E" />
              {/* Smiley amarelo */}
              <circle cx="30" cy="28" r="16" fill="#F5C518" />
              <path d="M22 32 C24 38, 36 38, 38 32" stroke="#3D3B8E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Texto PORTAL */}
              <text x="54" y="20" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="Poppins, Arial, sans-serif" fontWeight="500" letterSpacing="2">PORTAL</text>
              {/* Texto Só Notícia Boa */}
              <text x="54" y="40" fill="#ffffff" fontSize="17" fontFamily="Poppins, Arial, sans-serif" fontWeight="700">Só Notícia Boa</text>
            </svg>
            <div style={{ marginLeft: "16px" }}>
              <h1 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#ffffff",
                margin: 0,
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "0.5px"
              }}>
                Assistente Inteligente
              </h1>
              <p style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.75)",
                margin: "2px 0 0 0",
                fontFamily: "'Poppins', sans-serif"
              }}>
                Seu portal de boas notícias
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
                fontFamily: "'Poppins', sans-serif",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
              }}
            >
              <span>←</span> Nova conversa
            </button>
          )}
        </div>
      </div>

      {/* Accent bar amarela */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #F5C518 0%, #FFD54F 50%, #F5C518 100%)" }} />

      {/* Messages Container */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0", backgroundColor: "#ffffff" }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
            textAlign: "center",
            padding: "20px",
            animation: "slideUp 0.5s ease-out"
          }}>
            {/* Emoji de boas vindas */}
            <div style={{
              fontSize: "48px",
              marginBottom: "16px"
            }}>
              😊
            </div>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1A1A2E",
              marginBottom: "8px",
              fontFamily: "'Poppins', sans-serif"
            }}>
              Bem-vindo ao Assistente Só Notícia Boa
            </h2>
            <p style={{
              fontSize: "16px",
              color: "#6B7280",
              marginBottom: "32px",
              fontFamily: "'Poppins', sans-serif"
            }}>
              Pergunte sobre boas notícias, iniciativas e histórias inspiradoras
            </p>

            {/* Perguntas Sugeridas */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              maxWidth: "600px",
              marginBottom: "32px"
            }}>
              {[
                "🇧🇷 Quais são as últimas boas notícias do Brasil?",
                "🌱 Conte sobre iniciativas sustentáveis recentes",
                "💙 Quais projetos sociais foram destaque recentemente?",
                "📚 Há notícias sobre avanços na educação no Brasil?",
                "✨ Quais são as histórias mais inspiradoras da semana?",
                "🌍 O que há de bom acontecendo no meio ambiente?"
              ].map((pergunta, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(pergunta.replace(/^[^\s]+ /, ""));
                    setTimeout(() => {
                      const form = document.querySelector("form");
                      if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
                    }, 100);
                  }}
                  style={{
                    padding: "14px 16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    fontSize: "14px",
                    color: "#374151",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                    fontFamily: "'Poppins', sans-serif",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F3F0FF";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#3D3B8E";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(61, 59, 142, 0.15)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ffffff";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5E7EB";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {pergunta}
                </button>
              ))}
            </div>

            {/* Features */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              maxWidth: "650px"
            }}>
              {[
                { icon: "📰", label: "Boas notícias" },
                { icon: "⚡", label: "Respostas rápidas" },
                { icon: "🌍", label: "Iniciativas positivas" },
                { icon: "🤖", label: "IA avançada" }
              ].map((feature, i) => (
                <div key={i} style={{
                  padding: "12px 16px",
                  backgroundColor: "#F8F7FF",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "#3D3B8E",
                  fontWeight: "500",
                  fontFamily: "'Poppins', sans-serif",
                  border: "1px solid rgba(61, 59, 142, 0.08)"
                }}>
                  {feature.icon} {feature.label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "900px", margin: "0 auto", paddingLeft: "20px", paddingRight: "20px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                marginBottom: "12px",
                display: "flex",
                justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                paddingLeft: "20px",
                paddingRight: "20px"
              }}>
                <div style={{
                  maxWidth: "600px",
                  padding: "12px 16px",
                  borderRadius: msg.type === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  backgroundColor: msg.type === "user" ? "#3D3B8E" : "#F3F4F6",
                  color: msg.type === "user" ? "#ffffff" : "#1A1A2E",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: msg.type === "user"
                    ? "0 2px 6px rgba(61, 59, 142, 0.25)"
                    : "0 1px 3px rgba(0,0,0,0.06)"
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                display: "flex",
                justifyContent: "flex-start",
                paddingLeft: "20px",
                paddingRight: "20px",
                marginTop: "12px"
              }}>
                <div style={{
                  padding: "14px 20px",
                  borderRadius: "12px 12px 12px 2px",
                  backgroundColor: "#F3F4F6",
                  color: "#1A1A2E"
                }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#3D3B8E",
                      animation: "bounce 1.4s infinite"
                    }}></div>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#3D3B8E",
                      animation: "bounce 1.4s infinite",
                      animationDelay: "0.2s"
                    }}></div>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#3D3B8E",
                      animation: "bounce 1.4s infinite",
                      animationDelay: "0.4s"
                    }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        borderTop: "1px solid #E5E7EB",
        padding: "16px 20px",
        backgroundColor: "#ffffff"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Pergunte sobre boas notícias..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
                backgroundColor: loading ? "#F3F4F6" : "#ffffff",
                color: "#1A1A2E",
                fontFamily: "'Poppins', sans-serif",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: loading || !question.trim() ? "#B0AFD4" : "#3D3B8E",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                fontFamily: "'Poppins', sans-serif",
                boxShadow: loading || !question.trim() ? "none" : "0 2px 6px rgba(61, 59, 142, 0.3)"
              }}
              onMouseEnter={e => {
                if (!loading && question.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2E2C6E";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(61, 59, 142, 0.4)";
                }
              }}
              onMouseLeave={e => {
                if (!loading && question.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#3D3B8E";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 6px rgba(61, 59, 142, 0.3)";
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
          font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
