import React, { useState } from 'react';
import { FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNOK, CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// ── CSV helper ──────────────────────────────────────────────────────────────
function downloadCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(';'),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF helper ───────────────────────────────────────────────────────────────
function buildPdf(title, headers, rows, filename) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  doc.text('KlubbFinans', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(title, 14, 27);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generert: ${new Date().toLocaleDateString('nb-NO')}`, pageW - 14, 27, { align: 'right' });

  // Table
  const colW = (pageW - 28) / headers.length;
  let y = 38;

  // Table header
  doc.setFillColor(30, 58, 138);
  doc.rect(14, y, pageW - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  headers.forEach((h, i) => doc.text(h, 16 + i * colW, y + 5.5));

  y += 8;
  doc.setTextColor(40, 40, 40);

  rows.forEach((row, ri) => {
    if (y > 185) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(14, y, pageW - 28, 7, 'F');
    }
    doc.setFontSize(8);
    row.forEach((cell, i) => {
      const text = String(cell ?? '');
      doc.text(text, 16 + i * colW, y + 5);
    });
    y += 7;
  });

  doc.save(filename);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExportButtons({ transactions = [], payments = [], members = [] }) {
  const [open, setOpen] = useState(false);

  const exportMembersCSV = () => {
    downloadCSV(members.map(m => ({
      Navn: m.full_name,
      Lag: m.team || '',
      Type: m.membership_type || '',
      Epost: m.email || '',
      Telefon: m.phone || '',
      Foresatt: m.parent_name || '',
      'Foresatt e-post': m.parent_email || '',
      Status: m.status || '',
    })), 'medlemsliste.csv');
    toast.success('Medlemsliste eksportert til Excel/CSV');
    setOpen(false);
  };

  const exportMembersPDF = () => {
    const headers = ['Navn', 'Lag', 'Type', 'E-post', 'Foresatt', 'Status'];
    const rows = members.map(m => [
      m.full_name, m.team || '', m.membership_type || '',
      m.email || '', m.parent_name || '', m.status || '',
    ]);
    buildPdf('Medlemsliste', headers, rows, 'medlemsliste.pdf');
    toast.success('Medlemsliste eksportert til PDF');
    setOpen(false);
  };

  const exportTransactionsCSV = () => {
    downloadCSV(transactions.map(t => ({
      Dato: t.date,
      Type: t.type === 'income' ? 'Inntekt' : 'Utgift',
      Beløp: t.amount,
      Kategori: CATEGORIES[t.category]?.label || t.category || '',
      Beskrivelse: t.description || '',
    })), 'transaksjoner.csv');
    toast.success('Transaksjoner eksportert til Excel/CSV');
    setOpen(false);
  };

  const exportTransactionsPDF = () => {
    const headers = ['Dato', 'Type', 'Beløp (kr)', 'Kategori', 'Beskrivelse'];
    const rows = transactions.map(t => [
      t.date,
      t.type === 'income' ? 'Inntekt' : 'Utgift',
      formatNOK(t.amount),
      CATEGORIES[t.category]?.label || t.category || '',
      (t.description || '').slice(0, 40),
    ]);
    buildPdf('Transaksjonsrapport', headers, rows, 'transaksjoner.pdf');
    toast.success('Transaksjoner eksportert til PDF');
    setOpen(false);
  };

  const exportPaymentsCSV = () => {
    downloadCSV(payments.map(p => ({
      Tittel: p.title,
      'Totalt (kr)': p.total_amount,
      'Betalt (kr)': p.amount_paid || 0,
      'Gjenstående (kr)': p.total_amount - (p.amount_paid || 0),
      Forfallsdato: p.due_date,
      Status: p.status,
      Epost: p.parent_email || '',
    })), 'betalingsrapport.csv');
    toast.success('Betalingsrapport eksportert til Excel/CSV');
    setOpen(false);
  };

  const exportPaymentsPDF = () => {
    const headers = ['Tittel', 'Totalt', 'Betalt', 'Gjenstående', 'Forfall', 'Status'];
    const rows = payments.map(p => [
      (p.title || '').slice(0, 30),
      formatNOK(p.total_amount),
      formatNOK(p.amount_paid || 0),
      formatNOK(p.total_amount - (p.amount_paid || 0)),
      p.due_date || '',
      p.status || '',
    ]);
    buildPdf('Betalingsrapport', headers, rows, 'betalingsrapport.pdf');
    toast.success('Betalingsrapport eksportert til PDF');
    setOpen(false);
  };

  const sections = [
    {
      label: 'Medlemsliste',
      csvFn: exportMembersCSV,
      pdfFn: exportMembersPDF,
    },
    {
      label: 'Transaksjoner',
      csvFn: exportTransactionsCSV,
      pdfFn: exportTransactionsPDF,
    },
    {
      label: 'Betalingsrapport',
      csvFn: exportPaymentsCSV,
      pdfFn: exportPaymentsPDF,
    },
  ];

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen(o => !o)}>
        <FileSpreadsheet className="w-4 h-4 mr-2" /> Eksporter <ChevronDown className="w-3 h-3 ml-1" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 bg-card border border-border rounded-xl shadow-lg p-3 w-64 space-y-3">
            {sections.map(s => (
              <div key={s.label}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">{s.label}</p>
                <div className="flex gap-2">
                  <button
                    onClick={s.csvFn}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> Excel/CSV
                  </button>
                  <button
                    onClick={s.pdfFn}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}