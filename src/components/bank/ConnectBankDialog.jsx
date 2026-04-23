import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Key, Fingerprint, CheckCircle2, Loader2 } from 'lucide-react';

const BANKS = [
  { id: 'dnb', name: 'DNB', logo: '🏦' },
  { id: 'norwegian', name: 'Norwegian Bank', logo: '🏧' },
  { id: 'sparebank1', name: 'SpareBank 1', logo: '💳' },
  { id: 'nordea', name: 'Nordea', logo: '🔵' },
  { id: 'other', name: 'Annen bank (API)', logo: '🔗' },
];

export default function ConnectBankDialog({ open, onClose, onConnected }) {
  const [step, setStep] = useState(1);
  const [selectedBank, setSelectedBank] = useState(null);
  const [method, setMethod] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [done, setDone] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1800)); // simulate
    setConnecting(false);
    setDone(true);
    setTimeout(() => {
      onConnected({
        bank_name: selectedBank.name,
        account_number: accountNumber || '1234.56.78900',
        account_name: `${selectedBank.name} driftskonto`,
        connection_method: method,
      });
      handleClose();
    }, 1200);
  };

  const handleClose = () => {
    setStep(1); setSelectedBank(null); setMethod(null);
    setApiKey(''); setAccountNumber(''); setConnecting(false); setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Koble til bank</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="font-semibold text-lg">Tilkoblet!</p>
            <p className="text-sm text-muted-foreground text-center">Bankkontoen er koblet til KlubbFinans.</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Velg din bank:</p>
            {BANKS.map(bank => (
              <button
                key={bank.id}
                onClick={() => { setSelectedBank(bank); setStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <span className="text-2xl">{bank.logo}</span>
                <span className="font-medium">{bank.name}</span>
              </button>
            ))}
          </div>
        ) : step === 2 ? (
          <div className="space-y-3">
            <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground">← Tilbake</button>
            <p className="text-sm text-muted-foreground">Velg tilkoblingsmetode for <strong>{selectedBank.name}</strong>:</p>
            <button
              onClick={() => { setMethod('bankid'); setStep(3); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <Fingerprint className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">BankID</p>
                <p className="text-xs text-muted-foreground">Sikreste metode, anbefalt</p>
              </div>
            </button>
            <button
              onClick={() => { setMethod('api_key'); setStep(3); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <Key className="w-6 h-6 text-accent" />
              <div>
                <p className="font-medium">API-nøkkel</p>
                <p className="text-xs text-muted-foreground">For bedriftskontoer med API-tilgang</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground">← Tilbake</button>
            <div>
              <Label>Kontonummer</Label>
              <Input placeholder="1234.56.78900" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
            </div>
            {method === 'api_key' && (
              <div>
                <Label>API-nøkkel</Label>
                <Input type="password" placeholder="sk_live_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
            )}
            {method === 'bankid' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                Du vil bli sendt til BankID for sikker autentisering.
              </div>
            )}
            <Button className="w-full" onClick={handleConnect} disabled={connecting}>
              {connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kobler til...</> : <><Building2 className="w-4 h-4 mr-2" /> Koble til bank</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}