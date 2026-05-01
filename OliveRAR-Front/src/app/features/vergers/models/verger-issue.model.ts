export interface HistoriqueIssue {
  date: string;
  action: string;
  ancienStatut?: string;
  nouveauStatut: string;
  userId: string;
}

export interface VergerIssue {
  id?: string;
  vergerId: string;
  type: 'MALADIE' | 'IRRIGATION' | 'RAVAGEUR' | 'METEO' | 'AUTRE';
  description: string;
  gravite: 'FAIBLE' | 'MOYENNE' | 'CRITIQUE';
  statut: 'SIGNALE' | 'EN_COURS' | 'RESOLU';
  dateSignalement?: string;
  signalePar?: string;
  photos?: string[];
  notes?: string;
  historique?: HistoriqueIssue[];
}
