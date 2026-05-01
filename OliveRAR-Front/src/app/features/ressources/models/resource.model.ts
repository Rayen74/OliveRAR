export type ResourceCategory = 'VEHICULE' | 'OUTILLAGE' | 'CONSOMMABLE' | 'MATERIEL';
export type ResourceStatus = 'DISPONIBLE' | 'EN_MAINTENANCE' | 'RESERVE';

export interface Resource {
  id: string; // ✅ IMPORTANT: STRING (pas number)
  name: string;
  code?: string;
  categorie: ResourceCategory;
  status: ResourceStatus;
}
