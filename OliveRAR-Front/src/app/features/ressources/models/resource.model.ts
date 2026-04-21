export type ResourceCategory = 'VEHICULE' | 'CHAUFFEUR' | 'AGENT' | 'MATERIEL';
export type ResourceStatus = 'DISPONIBLE' | 'INDISPONIBLE' | 'MAINTENANCE' | 'AFFECTE';

export interface Resource {
  id?: string;
  name: string;
  type: ResourceCategory;
  available: boolean;
  status?: ResourceStatus;
  code?: string;
  description?: string;
}

export interface ResourceMutationResponse {
  success: boolean;
  message: string;
  data?: Resource;
}
