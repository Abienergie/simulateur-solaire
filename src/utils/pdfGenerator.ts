import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FinancialParameters, FinancialProjection } from '../types/financial';
import { formatCurrency } from './formatters';
import { getOrientationLabel } from './orientationMapping';

export async function generatePDF(
  params: FinancialParameters,
  projection: FinancialProjection,
  productionAnnuelle: number,
  clientInfo: {
    civilite: string;
    nom: string;
    prenom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    telephone: string;
    email: string;
    pdl?: string;
  },
  installationParams: {
    typeCompteur: string;
    pdl?: string;
    consommationAnnuelle: number;
    puissanceCrete: number;
    nombreModules: number;
    inclinaison: number;
    orientation: number;
    pertes: number;
    masqueSolaire: number;
    microOnduleurs: boolean;
    bifacial: boolean;
    surfaceTotale: number;
  }
): Promise<void> {
  try {
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.text('Rapport Installation Solaire', 105, 20, { align: 'center' });
    
    // Note sur la simulation
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Note : Cette simulation de productible est réalisée avec soin à partir des données disponibles, mais reste indicative et non contractuelle.', 20, 30, { maxWidth: 170 });
    doc.setTextColor(0, 0, 0);
    
    // Informations client
    doc.setFontSize(14);
    doc.text('Informations client', 20, 45);

    const clientData = [
      ['Nom complet', `${clientInfo.civilite} ${clientInfo.nom} ${clientInfo.prenom}`],
      ['Email', clientInfo.email],
      ['Téléphone', clientInfo.telephone],
      ['PDL', clientInfo.pdl || 'Non renseigné'],
      ['Adresse', clientInfo.adresse],
      ['Code postal', clientInfo.codePostal],
      ['Ville', clientInfo.ville]
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Information', 'Valeur']],
      body: clientData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { top: 50 }
    });

    // Caractéristiques techniques
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Caractéristiques techniques', 20, 20);

    const technicalData = [
      ['Type de compteur', installationParams.typeCompteur === 'monophase' ? 'Monophasé' : 'Triphasé'],
      ['Consommation annuelle', `${installationParams.consommationAnnuelle.toString()} kWh/an`],
      ['Puissance crête', `${installationParams.puissanceCrete.toFixed(1)} kWc`],
      ['Nombre de modules', installationParams.nombreModules.toString()],
      ['Surface totale', `${installationParams.surfaceTotale.toFixed(1)} m²`],
      ['Orientation', getOrientationLabel(installationParams.orientation)],
      ['Inclinaison', `${installationParams.inclinaison}°`],
      ['Pertes système', `${installationParams.pertes}%`],
      ['Masque solaire', `${installationParams.masqueSolaire}%`],
      ['Micro-onduleurs', installationParams.microOnduleurs ? 'Oui' : 'Non'],
      ['Technologie bifaciale', installationParams.bifacial ? 'Oui' : 'Non'],
      ['Production annuelle estimée en 1ère année', `${Math.round(productionAnnuelle).toString()} kWh/an`]
    ];

    autoTable(doc, {
      startY: 25,
      head: [['Caractéristique', 'Valeur']],
      body: technicalData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Informations financières de base
    doc.text('Informations financières', 20, doc.lastAutoTable.finalY + 20);

    const financialData = params.financingMode === 'cash' ? [
      ['Type de financement', 'Paiement comptant'],
      ['Prix de base TTC', formatCurrency(projection.prixInstallation)],
      ['Prime à l\'autoconsommation', formatCurrency(params.primeAutoconsommation)],
      ['Remise commerciale', formatCurrency(params.remiseCommerciale)],
      ['Prix final TTC', formatCurrency(projection.prixFinal)]
    ] : [
      ['Type de financement', 'Abonnement mensuel'],
      ['Durée d\'engagement', `${params.dureeAbonnement} ans`],
      ['Mensualité TTC', formatCurrency(projection.projectionAnnuelle[0].coutAbonnement / 12)],
      ['Services inclus', 'Maintenance, garantie, monitoring et assurance']
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Information financière', 'Valeur']],
      body: financialData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Impact environnemental
    doc.text('Impact environnemental', 20, doc.lastAutoTable.finalY + 20);
    
    // Calcul des économies de CO2 (60g CO2/kWh)
    const co2Savings = Math.round(productionAnnuelle * 0.06);
    const environmentalData = [
      ['Économie de CO₂', `${co2Savings} kg/an`],
      ['Équivalent', `${Math.round(co2Savings / 0.2)} km en voiture`]
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Indicateur', 'Valeur']],
      body: environmentalData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Ajout des numéros de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} sur ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
      
      // Mention non contractuelle en bas de page
      doc.setFontSize(8);
      doc.text('Document non contractuel - Les données présentées sont fournies à titre indicatif', 
        doc.internal.pageSize.width / 2, 
        doc.internal.pageSize.height - 5, 
        { align: 'center' }
      );
    }

    doc.save('rapport-installation-solaire.pdf');
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
}