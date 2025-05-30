import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { formatCurrency } from './formatters';
import { FinancialProjection } from '../types/financial';
import { getShadingLabel } from './shadingLabels';
import { getOrientationCoefficient } from './orientationCoefficients';
import { getOrientationLabel } from './orientationMapping';

interface ClientInfo {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  codePostal: string;
  ville: string;
  region: string;
  date: string;
  ensoleillement: string;
  conseiller: string;
  telephoneConseiller: string;
  commentaire: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  civilite: string;
  pdl?: string;
}

interface InstallationInfo {
  typeCompteur: string;
  consommationAnnuelle: number;
  orientation: number;
  inclinaison: number;
  masqueSolaire: number;
  puissanceCrete: number;
  degradationPanneau: number;
  nombreModules?: number;
  surfaceTotale?: number;
  pertes?: number;
}

interface PricingItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SubscriptionDetails {
  monthlyPayment: number;
  duration: number;
}