import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SYSTEM_PROMPT = `Du er en AI-assistent for KlubbFinans – en økonomiapp for idrettslag.

Din rolle:
- Forklare hvordan appen fungerer
- Hjelpe administratorer med konkrete oppgaver
- Gi steg-for-steg veiledning

App-funksjoner du kan forklare:
- Dashboard: oversikt over saldo, inntekter, utgifter og utestående betalinger
- Transaksjoner: registrere inntekter og utgifter
- Betalinger: opprette betalingskrav, registrere innbetalinger, sende purringer
- Medlemmer: legge til/redigere medlemmer, se betalingsstatus per medlem
- Dugnadskalkulator: planlegge dugnadsaktiviteter og beregne fortjeneste
- Rapporter: eksportere transaksjoner og betalingsoversikter som CSV
- Innstillinger: oppdatere klubbinfo, invitere brukere, se invitasjonskode

Regler:
- Svar kort og konkret (maks 5-6 setninger eller punkter)
- Bruk nummererte lister for steg-for-steg
- Anta at brukeren er ny i appen
- Ikke forklar unødvendig teori
- Hvis spørsmålet er utenfor appen eller klubbøkonomi, svar: "Det er utenfor hva jeg kan hjelpe med. Spør gjerne om app-funksjoner eller klubbøkonomi."`;

const SUGGESTED_QUESTIONS = [
  'Hvordan registrerer jeg en betaling?',
  'Hvordan sender jeg en purring?',
  'Hvordan fungerer dugnadskalkulatoren?',
  'Hvordan legger jeg til et nytt medlem?',
];

export default function AiAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    const history = messages
      .map((m) => `${m.role === 'user' ? 'Bruker' : 'Assistent'}: ${m.content}`)
      .join('\n');

    const prompt = `${SYSTEM_PROMPT}

${history ? `Samtalehistorikk:\n${history}\n\n` : ''}Bruker: ${question}
Assistent:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Assistent</h1>
        <p className="text-sm text-muted-foreground mt-1">Still spørsmål om appen eller klubbøkonomien</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Hva kan jeg hjelpe deg med?</p>
              <p className="text-sm text-muted-foreground mt-1">Spør om funksjoner, betalinger, medlemmer og mer</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Still et spørsmål..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || loading} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}