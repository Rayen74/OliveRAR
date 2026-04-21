import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ResourceApiService } from '../../services/resource-api.service';
import { Resource } from '../../models/resource.model';

interface Approvisionnement {
  id: string;
  nom: string;
  categorie: string;
  quantiteStock: number;
  quantiteMin: number;
  unite: string;
  etat: 'DISPONIBLE' | 'FAIBLE' | 'CRITIQUE' | 'RUPTURE';
  derniereMiseAJour: string;
}

@Component({
  selector: 'app-equipements',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './equipements.html',
})
export class EquipementsComponent implements OnInit {
  approvisionnements: Approvisionnement[] = [];
  loading = true;

  constructor(private readonly resourceApi: ResourceApiService) {}

  ngOnInit(): void {
    this.loadApprovisionnements();
  }

  loadApprovisionnements(): void {
    this.resourceApi.getAll('MATERIEL').subscribe({
      next: (resources) => {
        this.approvisionnements = resources.map((resource: Resource) => this.toApprovisionnement(resource));
        this.loading = false;
      },
      error: () => {
        this.approvisionnements = [];
        this.loading = false;
      }
    });
  }

  getEtatClass(etat: string): string {
    switch (etat) {
      case 'DISPONIBLE': return 'bg-green-100 text-green-700 border-green-200';
      case 'FAIBLE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CRITIQUE': return 'bg-red-100 text-red-700 border-red-200';
      case 'RUPTURE': return 'bg-red-200 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  private toApprovisionnement(resource: Resource): Approvisionnement {
    const label = resource.status === 'INDISPONIBLE' ? 'RUPTURE' : 'DISPONIBLE';
    return {
      id: resource.id ?? resource.name,
      nom: resource.name,
      categorie: resource.type,
      quantiteStock: resource.available ? 1 : 0,
      quantiteMin: 1,
      unite: 'unite(s)',
      etat: label,
      derniereMiseAJour: new Date().toISOString().slice(0, 10)
    };
  }
}
