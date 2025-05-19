import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ClientInfo {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  codePostal: string;
  ville: string;
  date: string;
  ensoleillement: string;
  conseiller: string;
  telephoneConseiller: string;
  commentaire: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

interface InstallationInfo {
  typeCompteur: string;
  consommationAnnuelle: number;
  orientation: number;
  inclinaison: number;
  masqueSolaire: number;
  puissanceCrete: number;
}

/**
 * Loads a PDF template and fills its form fields with client and installation data
 * @param templateUrl URL to the PDF template with form fields
 * @param clientInfo Client information object
 * @param installation Installation parameters object
 * @param mapImageData Optional base64 image data for the satellite map
 * @returns Uint8Array containing the filled PDF
 */
export async function fillPdfForm(
  templateUrl: string,
  clientInfo: ClientInfo,
  installation: InstallationInfo,
  mapImageData?: string | null
): Promise<Uint8Array> {
  try {
    // Validate template URL
    if (!templateUrl) {
      throw new Error('Template URL is required');
    }

    console.log('Fetching PDF template from:', templateUrl);

    // Fetch the PDF template with detailed error handling
    const response = await fetch(templateUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(
        `Failed to fetch PDF template: ${response.status} ${response.statusText}. ` +
        `Make sure the template URL is accessible and CORS is properly configured.`
      );
    }

    const templateBytes = await response.arrayBuffer();
    if (!templateBytes || templateBytes.byteLength === 0) {
      throw new Error('PDF template is empty');
    }

    console.log('PDF template fetched successfully, size:', templateBytes.byteLength);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the pages
    const pages = pdfDoc.getPages();
    const page2 = pages[1];
    const { width, height } = page2.getSize();
    
    // Embed the font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;
    
    // conversion mm → points (1 mm ≃ 2.835 pt)
    const mmToPt = (mm: number) => mm * 2.835;

    // X fixe pour aligner en face des intitulés (138 mm depuis la gauche)
    const xPt = mmToPt(138);

    // Positions Y en mm pour Nom, Prénom, Téléphone, Email, Adresse, CP+Ville
    const yMm = [65, 85, 105, 125, 145, 165];
    // Conversion en points et inversion d'axe pour pdf-lib
    const yPts = yMm.map(m => height - mmToPt(m));

    // 6 valeurs brutes à tamponner
    const vals = [
      clientInfo.nom,
      clientInfo.prenom,
      clientInfo.telephone,
      clientInfo.email,
      clientInfo.adresse,
      `${clientInfo.codePostal} ${clientInfo.ville}`
    ];

    vals.forEach((txt, i) => {
      page2.drawText(txt, {
        x: xPt,
        y: yPts[i],
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    });

    // Save the PDF
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error filling PDF form:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to generate PDF report: ${errorMessage}`);
  }
}

/**
 * Creates a download link for the generated PDF
 * @param pdfBytes Uint8Array containing the PDF data
 * @param filename Name for the downloaded file
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string = 'rapport-installation-solaire.pdf'): void {
  // Create a blob from the PDF bytes
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Opens the PDF in a new tab for preview
 * @param pdfBytes Uint8Array containing the PDF data
 */
export function previewPdf(pdfBytes: Uint8Array): void {
  // Create a blob from the PDF bytes
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Open in a new tab
  window.open(url, '_blank');
  
  // Clean up the URL object after a delay
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}