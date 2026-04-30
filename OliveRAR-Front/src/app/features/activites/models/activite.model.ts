export type ActiviteType =
  | 'VERGER_CREE' | 'VERGER_MODIFIE' | 'VERGER_SUPPRIME' | 'VERGER_STATUT_CHANGE'
  | 'ALERTE_CREEE' | 'ALERTE_MODIFIEE' | 'ALERTE_SUPPRIMEE' | 'ALERTE_RESOLUE' | 'ALERTE_STATUT_CHANGE'
  | 'COLLECTE_CREE' | 'COLLECTE_MODIFIEE' | 'COLLECTE_SUPPRIMEE' | 'COLLECTE_STATUT_CHANGE'
  | 'EQUIPEMENT_CREE' | 'EQUIPEMENT_MODIFIE' | 'EQUIPEMENT_SUPPRIME' | 'EQUIPEMENT_STATUT_CHANGE' | 'EQUIPEMENT_ASSIGNE'
  | 'TOURNEE_CREEE' | 'TOURNEE_MODIFIEE' | 'TOURNEE_SUPPRIMEE' | 'TOURNEE_STATUT_CHANGE'
  | 'USER_CONNECTE' | 'USER_DECONNECTE' | 'USER_CREE' | 'USER_MODIFIE' | 'USER_SUPPRIME' | 'USER_MOT_DE_PASSE_REINITIALISE';

export interface Activite {
  id: string;
  userId: string;
  userNom: string;
  userRole: string;
  type: ActiviteType;
  module: string;
  description: string;
  entiteId?: string;
  entiteNom?: string;
  dateAction: string; // ISO string
  details?: Record<string, unknown>;
}

export interface ActiviteFilters {
  module?: string;
  type?: string;
  debut?: string;   // yyyy-MM-dd
  fin?: string;     // yyyy-MM-dd
  page: number;
  size: number;
}

export interface ActivitePaginatedResponse {
  items: Activite[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Label court du module pour affichage badge */
export const MODULE_LABELS: Record<string, string> = {
  VERGER: 'Verger',
  ALERTE: 'Alerte',
  COLLECTE: 'Collecte',
  EQUIPEMENT: 'Équipement',
  TOURNEE: 'Tournée',
  USER: 'Utilisateur',
};

/** Couleur CSS variable du badge selon module */
export const MODULE_COLORS: Record<string, string> = {
  VERGER:      'var(--color-olive-500)',
  ALERTE: 'var(--color-alert-500)',
  COLLECTE:    'var(--color-harvest-400)',
  EQUIPEMENT:  'var(--color-harvest-600)',
  TOURNEE:     'var(--color-olive-700)',
  USER:        'var(--color-earth-muted)',
};

export const MODULES_LIST = ['VERGER', 'ALERTE', 'COLLECTE', 'EQUIPEMENT', 'TOURNEE', 'USER'];
