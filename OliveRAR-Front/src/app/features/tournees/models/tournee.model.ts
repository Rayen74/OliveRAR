export interface Tournee {
  id?: string;
  datePrevue: string;
  collecteIds: string[];
  vehicleId?: string;
  driverId?: string;
  agentIds?: string[];
  materialIds?: string[];
  status: string;
}
