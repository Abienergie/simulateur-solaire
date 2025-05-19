import React, { useState } from 'react';
import { FileDown, Eye, Loader2, AlertCircle } from 'lucide-react';
import { fillPdfForm, downloadPdf, previewPdf } from '../utils/pdfFormFiller';

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

interface PdfReportGeneratorProps {
  clientInfo: ClientInfo;
  installation: InstallationInfo;
  templateUrl?: string;
}

export default function PdfReportGenerator({
  clientInfo,
  installation,
  templateUrl = 'https://xpxbxfuckljqdvkajlmx.supabase.co/storage/v1/object/public/pdf-template/rapport-pdf-template.pdf'
}: PdfReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = async (action: 'download' | 'preview') => {
    setIsGenerating(true);
    setError(null);

    try {
      // Récupérer l'URL de l'image satellite depuis le localStorage
      const mapImageUrl = localStorage.getItem('satellite_image_url');
      
      // Remplir le formulaire PDF avec les données
      const pdfBytes = await fillPdfForm(
        templateUrl,
        clientInfo,
        installation,
        mapImageUrl
      );
      
      // Télécharger ou prévisualiser le PDF selon l'action demandée
      if (action === 'download') {
        const filename = `Rapport_${clientInfo.nom}_${clientInfo.prenom}.pdf`;
        downloadPdf(pdfBytes, filename);
      } else {
        previewPdf(pdfBytes);
      }
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      let errorMessage = 'Une erreur est survenue lors de la génération du PDF';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Impossible d\'accéder au modèle de rapport PDF. Veuillez vérifier votre connexion internet et réessayer.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => generatePdf('download')}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <FileDown className="h-5 w-5" />
              Télécharger le rapport
            </>
          )}
        </button>
        
        <button
          onClick={() => generatePdf('preview')}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Eye className="h-5 w-5" />
              Prévisualiser
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        <p>Le rapport inclut toutes les informations client et les détails de l'installation</p>
      </div>
    </div>
  );
}