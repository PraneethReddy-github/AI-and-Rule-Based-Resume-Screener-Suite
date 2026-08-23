import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { X, Send, Bot, Sparkles } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  jdId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, jdId }) => {
  const [input, setInput] = useState('');
  const { chatHistory, sendMessage, loading } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    await sendMessage(jdId, msg);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 1000 }} />
      <div className="panel" style={{ width: 420, zIndex: 1001, background: 'var(--bg-2)' }}>
        <div className="panel-header" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px var(--accent-glow)' }}>
              <Bot size={18} color="white" />
            </div>
            <div>
              <div className="panel-title" style={{ fontSize: 14 }}>AI Screening Agent</div>
              <div style={{ fontSize: 10, color: 'var(--green-text)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, background: 'var(--green)', borderRadius: '50%', display: 'inline-block' }} />
                ONLINE & ANALYZING
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="panel-body" ref={scrollRef} style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 20px' }}>
          {chatHistory.length <= 2 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 48, height: 48, background: 'var(--bg-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={24} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>How can I help you?</div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Ask me about specific candidates, compare their skills, or find the best cultural fit for this role.
              </p>
            </div>
          )}

          {chatHistory.filter(m => m.parts[0].text.indexOf('System Context') !== 0).map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                maxWidth: '90%', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius)',
                fontSize: 13,
                lineHeight: 1.5,
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-3)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                boxShadow: msg.role === 'user' ? '0 4px 12px var(--accent-glow)' : 'none'
              }}>
                {msg.parts[0].text}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '0 4px' }}>
                {msg.role === 'user' ? 'You' : 'Agent'}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--bg-3)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div className="score-bar-container" style={{ width: 40, gap: 4 }}>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel-footer" style={{ background: 'var(--bg-card)', padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about the batch..."
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                opacity: (loading || !input.trim()) ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
