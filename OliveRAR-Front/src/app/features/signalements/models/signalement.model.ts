export type SignalementStatus = 'NOUVEAU' | 'EN_ANALYSE' | 'TRAITE' | 'REJETE';

export interface Signalement {
  id?: string;
  vergerId: string;
  issueType: string;
  description: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  status: SignalementStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
