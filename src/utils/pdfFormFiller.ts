import { jsPDF } from 'jspdf';

interface PdfFormData {
  // Add your form data interface here
  dureeAbonnement?: number;
  projectionAnnuelle?: Array<{
    coutAbonnement: number;
  }>;
}

export const fillPdfForm = async (formData: PdfFormData) => {
  const doc = new jsPDF();
  
  // Add form filling logic here
  const monthlyPayment = formData.dureeAbonnement && formData.projectionAnnuelle?.[0]?.coutAbonnement 
    ? formData.projectionAnnuelle[0].coutAbonnement / 12 
    : 0;
    
  // Add content to PDF
  doc.setFontSize(12);
  doc.text('Form Data:', 20, 20);
  doc.text(`Monthly Payment: ${monthlyPayment}€`, 20, 30);
  
  return doc;
};

export const downloadPdf = async (formData: PdfFormData) => {
  const doc = await fillPdfForm(formData);
  doc.save('form.pdf');
};

export const previewPdf = async (formData: PdfFormData) => {
  const doc = await fillPdfForm(formData);
  const pdfDataUri = doc.output('datauristring');
  
  // Open PDF in new window
  window.open(pdfDataUri);
};