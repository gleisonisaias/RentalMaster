/**
 * Renderiza um template HTML no PDF com formatação apropriada
 * Suporta o editor WYSIWYG ReactQuill
 */
export function renderHTMLTemplate(doc: any, content: string, pageNumber?: number) {
  if (!content) return;
  
  // Ajustar para o fuso horário do Brasil (GMT-3)
  const now = new Date();
  now.setHours(now.getHours() - 3);
  
  // Substituir tags especiais
  if (pageNumber) {
    content = content.replace(/{{PAGINA}}/g, pageNumber.toString());
  }
  
  // Substituir datas dinâmicas
  const dataAtual = now.toLocaleDateString('pt-BR');
  const dataCurta = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dataLonga = now.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const hora = now.toLocaleTimeString('pt-BR');
  
  content = content
    .replace(/{{DATA_ATUAL}}/g, dataAtual)
    .replace(/{{DATA_CURTA}}/g, dataCurta)
    .replace(/{{DATA_LONGA}}/g, dataLonga)
    .replace(/{{HORA}}/g, hora)
    // Manter compatibilidade com tags antigas
    .replace(/{{DATA_ATUAL_EXTENSO}}/g, dataLonga)
    .replace(/{{HORA_ATUAL}}/g, hora)
    .replace(/{{DATA_HORA_ATUAL}}/g, `${dataAtual} às ${hora}`);
  
  // Função para limpar texto HTML
  const cleanHtml = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  };
  
  // Configuração inicial do documento
  const defaultFontSize = 12;
  doc.fontSize(defaultFontSize).font('Helvetica');
  
  // Abordagem simplificada: transforme parágrafos em texto plano e renderize
  const paragraphs = content.split('</p>');
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    
    const isCenter = paragraph.includes('text-align: center') || 
                     paragraph.includes('class="ql-align-center"');
    
    const isRight = paragraph.includes('text-align: right') || 
                    paragraph.includes('class="ql-align-right"');
    
    const isJustify = paragraph.includes('text-align: justify') || 
                      paragraph.includes('class="ql-align-justify"');
    
    let align = 'left';
    if (isCenter) align = 'center';
    if (isRight) align = 'right';
    if (isJustify) align = 'justify';
    
    // Extrair texto limpo
    const text = cleanHtml(paragraph);
    
    if (text.trim()) {
      // Verificar se tem formatação de cor específica
      const hasYellow = paragraph.includes('color: yellow') || 
                        paragraph.includes('color:#ffff00') || 
                        paragraph.includes('color: #ffff00') || 
                        paragraph.includes('class="ql-color-yellow"');
      
      if (hasYellow) {
        doc.fillColor('#ffff00');
      } else {
        doc.fillColor('#000000'); // Preto padrão
      }
      
      // Verificar se tem formatação de negrito
      const hasBold = paragraph.includes('<strong>') || 
                     paragraph.includes('<b>') || 
                     paragraph.includes('font-weight: bold') || 
                     paragraph.includes('class="ql-bold"');
      
      if (hasBold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      
      // Renderizar texto
      doc.text(text, { align });
      doc.moveDown(0.5);
    }
  }
}