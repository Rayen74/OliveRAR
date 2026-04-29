// Catégories et sous-catégories
export type RessourceCategorie = 'MATERIEL_ROULANT' | 'EQUIPEMENT' | 'AUTRE';

export type UniteStatut =
  | 'DISPONIBLE'
  | 'AFFECTE'
  | 'EN_MAINTENANCE'
  | 'EN_PANNE'
  | 'HORS_SERVICE';

// ── TypeRessource ──────────────────────────────────────────────────────────

export interface Capacite {
  valeur?: number;
  unite?: string; // "tonnes", "m³", "unité"…
}

export interface TypeRessource {
  id?: string;
  nom: string;
  categorie: RessourceCategorie;
  sousCategorie?: string;
  description?: string;
  capacite?: Capacite;
  actif: boolean;
}

export interface PaginatedTypeRessourcesResponse {
  success: boolean;
  items: TypeRessource[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TypeRessourceMutationResponse {
  success: boolean;
  message: string;
  data?: TypeRessource;
}

export interface CategorieOption {
  value: RessourceCategorie;
  libelle: string;
}

// ── Unite ──────────────────────────────────────────────────────────────────

export interface HistoriqueEntree {
  date: string;
  action: string;
  statut: string;
  note?: string;
  auteurId?: string;
}

export interface UniteType {
  id: string;
  nom: string;
  categorie?: string;
  categorieLibelle?: string;
  sousCategorie?: string;
  capacite?: Capacite;
}

export interface Unite {
  id?: string;
  codeUnique: string;
  typeId: string;
  statut?: UniteStatut;
  statutLibelle?: string;
  disponibilite?: boolean;
  localisation?: string;
  derniereMaintenanceDate?: string;
  alerteMaintenanceActive?: boolean;
  seuilMaintenanceJours?: number;
  conducteurHabituelId?: string;
  notes?: string;
  historique?: HistoriqueEntree[];
  type?: UniteType;
  label?: string;
}

export interface PaginatedUnitesResponse {
  success: boolean;
  items: Unite[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UniteMutationResponse {
  success: boolean;
  message: string;
  data?: Unite;
}

export interface StatutOption {
  value: UniteStatut;
  libelle: string;
}

// ── Helpers UI ─────────────────────────────────────────────────────────────

export const SOUS_CATEGORIES = [
  'VEHICULE',
  'TRACTEUR',
  'OUTIL_MECANIQUE',
  'OUTIL_MANUEL',
  'ACCESSOIRE',
  'AUTRE'
] as const;

export const UNITE_STATUT_COLORS: Record<UniteStatut, string> = {
  DISPONIBLE:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  AFFECTE:        'bg-blue-50 text-blue-700 border-blue-200',
  EN_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  EN_PANNE:       'bg-red-50 text-red-700 border-red-200',
  HORS_SERVICE:   'bg-gray-100 text-gray-500 border-gray-200'
};
