import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  title: string;
  company: string;
  period: string;
  revenues: number;
  expenses: number;
  balance: number;
  data: string; // HTML content
}

export function useReportExport() {
  const generatePDF = async (reportData: ReportData) => {
    try {
      // Import dinâmico de jsPDF e html2canvas
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas').then(m => m.default);

      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #1a5f3f;">${reportData.title}</h1>
          <p style="text-align: center; color: #666;">
            <strong>Empresa:</strong> ${reportData.company}<br>
            <strong>Período:</strong> ${reportData.period}
          </p>
          
          <hr style="margin: 20px 0; border: none; border-top: 2px solid #1a5f3f;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="padding: 15px; background: #f0f8f5; border-left: 4px solid #22c55e;">
              <p style="margin: 0; color: #666; font-size: 12px;">Total de Receitas</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #22c55e;">
                R$ ${reportData.revenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div style="padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #666; font-size: 12px;">Total de Despesas</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #ef4444;">
                R$ ${reportData.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div style="padding: 15px; background: #f0fdf4; border-left: 4px solid #16a34a;">
              <p style="margin: 0; color: #666; font-size: 12px;">Resultado</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${reportData.balance >= 0 ? '#16a34a' : '#dc2626'};">
                R$ ${reportData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 2px solid #1a5f3f;">
          
          <p style="text-align: right; color: #999; font-size: 12px;">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      `;

      document.body.appendChild(element);
      const canvas = await html2canvas(element);
      document.body.removeChild(element);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

      pdf.save(`relatorio_${reportData.company.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const generateTXT = (reportData: ReportData) => {
    const content = `
═══════════════════════════════════════════════════════════════════
  ${reportData.title.toUpperCase()}
═══════════════════════════════════════════════════════════════════

INFORMAÇÕES DO RELATÓRIO
Empresa: ${reportData.company}
Período: ${reportData.period}
Data de Geração: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}

───────────────────────────────────────────────────────────────────
RESUMO FINANCEIRO
───────────────────────────────────────────────────────────────────

Total de Receitas: R$ ${reportData.revenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Total de Despesas: R$ ${reportData.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Resultado:         R$ ${reportData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════════════
    `;

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
    );
    element.setAttribute(
      'download',
      `relatorio_${reportData.company.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`
    );
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return { generatePDF, generateTXT };
}
