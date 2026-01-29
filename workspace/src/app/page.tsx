"use client";
import React, { useState, useRef, useEffect } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [urls, setUrls] = useState("");
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
        body: JSON.stringify({
          question,
          customUrls: urls.split("\n").map(u => u.trim()).filter(Boolean)
        })
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
        borderBottom: "1px solid #e5e7eb",
        padding: "16px 20px",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img
              src="/assets/logo.png"
              alt="ACIP/CDL Logo"
              style={{ height: "50px", width: "auto", objectFit: "contain" }}
            />
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#000000", margin: 0 }}>
                RAG - ACIP/CDL Patrocínio
              </h1>
              <p style={{ fontSize: "14px", color: "#666666", margin: "4px 0 0 0" }}>
                Consulte serviços e informações da ACIP/CDL
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
                backgroundColor: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#666666",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
              }}
            >
              <span>←</span> Voltar
            </button>
          )}
        </div>
      </div>

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
            padding: "20px"
          }}>
            <h2 style={{ fontSize: "28px", fontWeight: "600", color: "#000000", marginBottom: "8px" }}>
              Bem-vindo ao Assistente ACIP
            </h2>
            <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px" }}>
              Tire suas dúvidas sobre serviços, convênios e associativismo
            </p>

            {/* Perguntas Sugeridas */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
              maxWidth: "500px",
              marginBottom: "32px"
            }}>
              {[
                "Como me tornar um associado da ACIP/CDL?",
                "Quais são os benefícios de ser associado?",
                "Como funciona o Serviço de Proteção ao Crédito (SPC)?",
                "Quais são os horários de funcionamento do comércio?",
                "Como emitir um certificado digital?",
                "Onde fica localizada a ACIP/CDL?"
              ].map((pergunta, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(pergunta);
                    setTimeout(() => {
                      const form = document.querySelector("form");
                      if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
                    }, 100);
                  }}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#374151",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                    fontFamily: "inherit"
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#0054a6";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
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
              maxWidth: "600px"
            }}>
              <div style={{
                padding: "12px 16px",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#374151",
                fontWeight: "500"
              }}>
                📚 Busca em documentos
              </div>
              <div style={{
                padding: "12px 16px",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#374151",
                fontWeight: "500"
              }}>
                ⚡ Respostas rápidas
              </div>
              <div style={{
                padding: "12px 16px",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#374151",
                fontWeight: "500"
              }}>
                📍 Cita fontes
              </div>
              <div style={{
                padding: "12px 16px",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#374151",
                fontWeight: "500"
              }}>
                🤖 IA avançada
              </div>
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
                  borderRadius: "12px",
                  backgroundColor: msg.type === "user" ? "#0054a6" : "#f7f7f7",
                  color: msg.type === "user" ? "#ffffff" : "#000000",
                  fontSize: "15px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word"
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
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#f7f7f7",
                  color: "#000000"
                }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#999999",
                      animation: "bounce 1.4s infinite"
                    }}></div>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#999999",
                      animation: "bounce 1.4s infinite",
                      animationDelay: "0.2s"
                    }}></div>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#999999",
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
        borderTop: "1px solid #e5e7eb",
        padding: "16px 20px",
        backgroundColor: "#ffffff"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Faça sua pergunta..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "15px",
                outline: "none",
                backgroundColor: loading ? "#f3f4f6" : "#ffffff",
                color: "#000000"
              }}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: loading || !question.trim() ? "#cccccc" : "#0054a6",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={e => {
                if (!loading && question.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#004385";
                }
              }}
              onMouseLeave={e => {
                if (!loading && question.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0054a6";
                }
              }}
            >
              Enviar
            </button>
          </form>

          {/* Settings Textarea */}
          <div style={{ marginTop: "12px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#666666",
              marginBottom: "6px",
              textTransform: "uppercase"
            }}>
              URLs dos documentos (opcional - deixe vazio para usar padrão)
            </label>
            <textarea
              value={urls}
              onChange={e => setUrls(e.target.value)}
              placeholder="Cole URLs aqui, uma por linha"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "13px",
                fontFamily: "monospace",
                minHeight: "60px",
                resize: "vertical",
                outline: "none",
                color: "#000000",
                backgroundColor: "#ffffff"
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        input:focus, textarea:focus {
          border-color: #0054a6 !important;
          box-shadow: 0 0 0 3px rgba(0, 84, 166, 0.1);
        }
      `}</style>
    </div>
  );
}
