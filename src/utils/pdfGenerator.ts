import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './formatters';
import { getOrientationLabel } from './orientationMapping';
import { getSunshineHours } from './sunshineData';

// Fonction pour formater les nombres avec séparateur de milliers
function formatNumber(num: number): string {
  return num.toLocaleString('fr-FR');
}

// Fonction pour obtenir le label d'un masque solaire
function getShadingLabel(value: number): string {
  if (value === 0) return 'Aucun';
  if (value <= 5) return 'Léger';
  if (value <= 10) return 'Modéré';
  if (value <= 15) return 'Important';
  return 'Très important';
}

export async function generatePDF(
  params: any,
  projection: any,
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
  // Création du document PDF
  const doc = new jsPDF();
  
  // Récupérer les codes promo appliqués depuis le localStorage
  const appliedPromoCodes = localStorage.getItem('applied_promo_codes');
  const promoDiscount = parseFloat(localStorage.getItem('promo_discount') || '0');
  const freeMonths = parseInt(localStorage.getItem('promo_free_months') || '0', 10);
  const freeDeposit = localStorage.getItem('promo_free_deposit') === 'true';
  const freeBatterySetup = localStorage.getItem('promo_free_battery_setup') === 'true';
  const freeSmartBatterySetup = localStorage.getItem('promo_free_smart_battery_setup') === 'true';
  
  // Récupérer les informations sur les batteries
  const batterySelection = localStorage.getItem('batterySelection');
  let batteryInfo = null;
  if (batterySelection) {
    try {
      batteryInfo = JSON.parse(batterySelection);
    } catch (e) {
      console.error('Erreur lors du parsing des informations de batterie:', e);
    }
  }
  
  // Récupérer les informations sur les technologies installées
  const inverterType = localStorage.getItem('inverterType') || 'central';
  const mountingSystem = localStorage.getItem('mountingSystem') || 'surimposition';
  const bifacial = localStorage.getItem('bifacial') === 'true';
  
  // Récupérer l'image satellite si disponible
  const satelliteImageUrl = localStorage.getItem('satellite_image_url');
  
  // Ajouter un logo
  const logoImg = new Image();
  logoImg.src = 'https://i.postimg.cc/7Z49VZpw/ABI-e-nergie-Blanc.png';
  
  await new Promise((resolve) => {
    logoImg.onload = resolve;
    logoImg.onerror = resolve; // Continue même si le logo ne charge pas
  });
  
  try {
    doc.addImage(logoImg, 'PNG', 10, 10, 50, 25);
  } catch (e) {
    console.warn('Impossible de charger le logo:', e);
  }
  
  // Ajouter un titre
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('Rapport de simulation solaire', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });
  
  // Informations client
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Informations client', 14, 50);
  
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  
  const clientData = [
    ['Nom', `${clientInfo.civilite} ${clientInfo.nom} ${clientInfo.prenom}`],
    ['Adresse', `${clientInfo.adresse}, ${clientInfo.codePostal} ${clientInfo.ville}`],
    ['Téléphone', clientInfo.telephone],
    ['Email', clientInfo.email]
  ];
  
  if (clientInfo.pdl) {
    clientData.push(['Point de livraison (PDL)', clientInfo.pdl]);
  }
  
  autoTable(doc, {
    startY: 55,
    head: [],
    body: clientData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    }
  });
  
  // Caractéristiques de l'installation
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Caractéristiques de l\'installation', 14, finalY + 15);
  
  const departement = clientInfo.codePostal.substring(0, 2);
  const ensoleillement = getSunshineHours(departement);
  
  const installationData = [
    ['Puissance crête', `${installationParams.puissanceCrete.toFixed(1)} kWc`],
    ['Nombre de modules', `${installationParams.nombreModules} modules`],
    ['Surface totale', `${installationParams.surfaceTotale.toFixed(1)} m²`],
    ['Type de compteur', installationParams.typeCompteur === 'monophase' ? 'Monophasé' : 'Triphasé'],
    ['Consommation annuelle', `${formatNumber(installationParams.consommationAnnuelle)} kWh/an`],
    ['Orientation', `${getOrientationLabel(installationParams.orientation)}`],
    ['Inclinaison', `${installationParams.inclinaison}°`],
    ['Masque solaire', getShadingLabel(installationParams.masqueSolaire)],
    ['Ensoleillement local', `${formatNumber(ensoleillement)} kWh/m²/an`]
  ];
  
  // Ajouter les technologies spécifiques
  if (inverterType !== 'central') {
    installationData.push([
      'Type d\'onduleur', 
      inverterType === 'solenso' ? 'Micro-onduleurs Solenso' : 'Micro-ondul