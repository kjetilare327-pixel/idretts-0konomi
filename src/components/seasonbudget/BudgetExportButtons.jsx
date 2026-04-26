import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNOK, CATEGORIES } from '@/lib/utils';
import { jsPDF } from 'jspdf';

export default function BudgetExportButtons({ budgetLines, transactions, season }) {
  const handlePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Budsjett – ${season?.name || 'Sesong'}`, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generert: ${new Date().toLocaleDateString('nb-NO')}`, 20, 30);

    let y = 45;
    doc.setFontSize(12);
    doc.text('Kategori', 20, y);
    doc.text('Type', 90, y);
    doc.text('Budsjett', 120, y);
    doc.text('Faktisk', 160, y);
    y += 8;

    budgetLines.forEach((b) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const actual = transactions.filter(t => t.category === b.category && t.type === b.type).reduce((s, t) => s + (t.amount || 0), 0);
      doc.setFontSize(10);
      doc.text(CATEGORIES[b.category]?.label || b.category, 20, y);
      doc.text(b.type === 'income' ? 'Inntekt' : 'Utgift', 90, y);
      doc.text(formatNOK(b.budgeted_amount), 120, y);
      doc.text(formatNOK(actual), 160, y);
      y += 8;
    });

    const totalBudget = budgetLines.reduce((s, b) => s + (b.type === 'expense' ? -(b.budgeted_amount || 0) : (b.budgeted_amount || 0)), 0);
    const totalActual = [...new Set(budgetLines.map(b => b.category))].reduce((s, cat) => {
      const line = budgetLines.find(b => b.category === cat);
      const act = transactions.filter(t => t.category === cat).reduce((ss, t) => ss + (t.type === 'income' ? t.amount : -t.amount), 0);
      return s + act;
    }, 0);

    y += 5;
    doc.setFontSize(12);
    doc.text(`Budsjettert resultat: ${formatNOK(totalBudget)}`, 20, y);

    doc.save(`budsjett-${season?.name || 'sesong'}.pdf`);
  };

  const handleExcel = () => {
    const rows = [
      ['Kategori', 'Type', 'Lag', 'Budsjett (NOK)', 'Faktisk (NOK)', 'Avvik (NOK)', 'Prosent'],
      ...budgetLines.map((b) => {
        const actual = transactions.filter(t => t.category === b.category && t.type === b.type).reduce((s, t) => s + (t.amount || 0), 0);
        const variance = b.type === 'expense' ? actual - b.budgeted_amount : b.budgeted_amount - actual;
        const pct = b.budgeted_amount > 0 ? Math.round((actual / b.budgeted_amount) * 100) : 0;
        return [
          CATEGORIES[b.category]?.label || b.category,
          b.type === 'income' ? 'Inntekt' : 'Utgift',
          b.team_filter || 'Alle',
          b.budgeted_amount,
          actual,
          variance,
          `${pct}%`,
        ];
      }),
    ];

    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budsjett-${season?.name || 'sesong'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handlePDF} disabled={budgetLines.length === 0}>
        <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleExcel} disabled={budgetLines.length === 0}>
        <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
      </Button>
    </div>
  );
}