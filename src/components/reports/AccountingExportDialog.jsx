import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileSpreadsheet, Download, Eye, EyeOff } from 'lucide-react';
import { CATEGORIES, formatNOK } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// Standard Norwegian account plan (NS 4102) mappings
const VISMA_ACCOUNT_MAP = {
  membership_fees: { account: '3900', name: 'Medlemsinntekter' },
  training_fees:   { account: '3910', name: 'Treningsavgifter' },
  sponsors:        { account: '3800', name: 'Sponsorinntekter' },
  grants:          { account: '3400', name: 'Offentlige tilskudd' },
  other_income:    { account: '3990', name: 'Andre inntekter' },
  equipment:       { account: '6500', name: 'Rekvisita/utstyr' },
  tournaments:     { account: '7770', name: 'Turneringskostnader' },
  travel:          { account: '7140', name: 'Reisekostnader' },
  referees:        { account: '7700', name: 'Dommerkostnader' },
  rent:            { account: '6300', name: 'Leiekostnader' },
  insurance:       { account: '7000', name: 'Forsikring' },
  other_expense:   { account: '7990', name: 'Andre kostnader' },
};

const TRIPLETEX_ACCOUNT_MAP = {
  membership_fees: { account: '3600', name: 'Kontingenter' },
  training_fees:   { account: '3900', name: 'Treningsavgifter' },
  sponsors:        { account: '3800', name: 'Sponsorinntekter' },
  grants:          { account: '3400', name: 'Tilskudd' },
  other_income:    { account: '3990', name: 'Andre driftsinntekter' },
  equipment:       { account: '6900', name: 'Rekvisita' },
  tournaments:     { account: '7790', name: 'Andre driftskostnader' },
  travel:          { account: '7160', name: 'Reise og diett' },
  referees:        { account: '7700', name: 'Ekstern tjeneste' },
  rent:            { account: '6300', name: 'Leie lokale' },
  insurance:       { account: '7000', name: 'Forsikringspremie' },
  other_expense:   { account: '7990', name: 'Diverse kostnader' },
};

const ALL_CATEGORIES = Object.keys(CATEGORIES);
const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2];
const MONTHS = [
  { value: 'all', label: 'Hele året' },
  { value: '1', label: 'Januar' }, { value: '2', label: 'Februar' },
  { value: '3', label: 'Mars' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mai' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

function downloadCSV(data, filename) {
  const headers = Object.keys(data[0]);
  const csv = [headers.join(';'), ...data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AccountingExportDialog({ open, onClose, transactions = [] }) {
  const [system, setSystem] = useState('visma');
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('all');
  const [selectedCats, setSelectedCats] = useState(new Set(ALL_CATEGORIES));
  const [showPreview, setShowPreview] = useState(false);
  const [aiMapping, setAiMapping] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const accountMap = system === 'visma' ? VISMA_ACCOUNT_MAP : TRIPLETEX_ACCOUNT_MAP;

  const filteredTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    if (d.getFullYear() !== parseInt(year)) return false;
    if (month !== 'all' && (d.getMonth() + 1) !== parseInt(month)) return false;
    if (!selectedCats.has(t.category)) return false;
    return true;
  });

  const previewRows = filteredTx.map(t => {
    const map = accountMap[t.category] || { account: '9999', name: 'Ukategorisert' };
    return {
      Dato: t.date,
      Konto: map.account,
      Kontonavn: map.name,
      Type: t.type === 'income' ? 'Inntekt' : 'Utgift',
      Beløp: t.amount,
      Beskrivelse: t.description || '',
      Kategori: CATEGORIES[t.category]?.label || t.category || '',
    };
  });

  const toggleCat = (cat) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleAiMap = async () => {
    setAiLoading(true);
    const cats = ALL_CATEGORIES.map(c => `${c}: ${CATEGORIES[c].label}`).join(', ');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en norsk regnskapsekspert. Match disse idrettsklubb-kategoriene mot ${system === 'visma' ? 'Visma' : 'Tripletex'} standard kontoplan (NS 4102).
Kategorier: ${cats}.
Returner en kort bekreftelse på norsk om at alle kategorier er matchet, og nevn 2-3 spesifikke kontonumre som eksempel.`,
    });
    setAiMapping(result);
    setAiLoading(false);
  };

  const handleExport = () => {
    if (previewRows.length === 0) { toast.error('Ingen transaksjoner i valgt periode'); return; }

    if (system === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pw = doc.internal.pageSize.getWidth();
      doc.setFontSize(16); doc.setTextColor(30, 58, 138);
      doc.text('KlubbFinans – Regnskapseksport', 14, 18);
      doc.setFontSize(10); doc.setTextColor(80, 80, 80);
      doc.text(`Periode: ${month === 'all' ? year : `${MONTHS.find(m=>m.value===month)?.label} ${year}`}`, 14, 27);
      doc.text(`Generert: ${new Date().toLocaleDateString('nb-NO')}`, pw - 14, 27, { align: 'right' });
      const headers = ['Dato', 'Konto', 'Kontonavn', 'Type', 'Beløp', 'Beskrivelse'];
      const colW = (pw - 28) / headers.length;
      let y = 38;
      doc.setFillColor(30, 58, 138); doc.rect(14, y, pw - 28, 8, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(9);
      headers.forEach((h, i) => doc.text(h, 16 + i * colW, y + 5.5));
      y += 8; doc.setTextColor(40, 40, 40);
      previewRows.forEach((row, ri) => {
        if (y > 185) { doc.addPage(); y = 20; }
        if (ri % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(14, y, pw - 28, 7, 'F'); }
        doc.setFontSize(8);
        [row.Dato, row.Konto, row.Kontonavn, row.Type, formatNOK(row.Beløp), (row.Beskrivelse || '').slice(0, 30)]
          .forEach((c, i) => doc.text(String(c), 16 + i * colW, y + 5));
        y += 7;
      });
      doc.save(`regnskapseksport_${year}.pdf`);
    } else {
      downloadCSV(previewRows, `regnskapseksport_${system}_${year}${month !== 'all' ? '_' + month : ''}.csv`);
    }

    toast.success(`${previewRows.length} bilag eksportert til ${system === 'visma' ? 'Visma' : system === 'tripletex' ? 'Tripletex' : 'PDF'}`);
    onClose();
  };

  const periodLabel = month === 'all' ? year : `${MONTHS.find(m => m.value === month)?.label} ${year}`;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eksporter til regnskapssystem</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* System selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'visma', label: 'Visma', color: 'bg-blue-50 border-blue-400 text-blue-800' },
              { id: 'tripletex', label: 'Tripletex', color: 'bg-orange-50 border-orange-400 text-orange-800' },
              { id: 'pdf', label: 'PDF', color: 'bg-red-50 border-red-400 text-red-800' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSystem(s.id)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${system === s.id ? s.color : 'border-border bg-background text-muted-foreground hover:bg-muted'}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>År</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Måned</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AI mapping */}
          {(system === 'visma' || system === 'tripletex') && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">AI-kontomapping</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleAiMap} disabled={aiLoading}>
                  {aiLoading ? 'Analyserer...' : 'Kjør AI-matching'}
                </Button>
              </div>
              {aiMapping ? (
                <p className="text-xs text-foreground">{aiMapping}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  La AI automatisk matche dine kategorier mot {system === 'visma' ? 'Visma' : 'Tripletex'} sin kontoplan (NS 4102).
                </p>
              )}
            </div>
          )}

          {/* Category selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Kategorier som skal eksporteres</Label>
              <div className="flex gap-2">
                <button className="text-xs text-primary underline" onClick={() => setSelectedCats(new Set(ALL_CATEGORIES))}>Alle</button>
                <button className="text-xs text-muted-foreground underline" onClick={() => setSelectedCats(new Set())}>Ingen</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map(cat => {
                const info = CATEGORIES[cat];
                const map = accountMap[cat];
                return (
                  <label key={cat} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selectedCats.has(cat)} onCheckedChange={() => toggleCat(cat)} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{info.label}</span>
                      {map && system !== 'pdf' && (
                        <span className="text-[10px] text-muted-foreground ml-1">→ {map.account}</span>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${info.type === 'income' ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}>
                      {info.type === 'income' ? 'Inn' : 'Ut'}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Preview toggle */}
          <div className="border-t border-border pt-4">
            <button
              className="flex items-center gap-2 text-sm text-primary font-medium mb-3"
              onClick={() => setShowPreview(p => !p)}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Skjul forhåndsvisning' : `Forhåndsvis data (${previewRows.length} bilag)`}
            </button>

            {showPreview && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground grid grid-cols-5 gap-2">
                  <span>Dato</span><span>Konto</span><span>Kontonavn</span><span>Type</span><span>Beløp</span>
                </div>
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {previewRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">Ingen transaksjoner i valgt periode</p>
                  ) : previewRows.slice(0, 50).map((r, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 px-3 py-1.5 text-xs hover:bg-muted/20">
                      <span>{r.Dato}</span>
                      <span className="font-mono text-primary">{r.Konto}</span>
                      <span className="truncate">{r.Kontonavn}</span>
                      <span className={r.Type === 'Inntekt' ? 'text-green-700' : 'text-red-700'}>{r.Type}</span>
                      <span>{formatNOK(r.Beløp)}</span>
                    </div>
                  ))}
                </div>
                {previewRows.length > 50 && (
                  <p className="text-xs text-muted-foreground px-3 py-2 bg-muted/20">… og {previewRows.length - 50} til</p>
                )}
              </div>
            )}
          </div>

          {/* Summary + export button */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-sm font-semibold">{previewRows.length} bilag</p>
              <p className="text-xs text-muted-foreground">Periode: {periodLabel} · {selectedCats.size} kategorier</p>
            </div>
            <Button onClick={handleExport} disabled={previewRows.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Eksporter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}