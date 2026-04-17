import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ResLogSidebar } from '../res-log-sidebar/res-log-sidebar';   // ← Nom exact

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
  imports: [CommonModule, ResLogSidebar],   // ← Important
  templateUrl: './equipements.html'
})
export class EquipementsComponent implements OnInit {

  approvisionnements: Approvisionnement[] = [];
  loading = true;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadApprovisionnements();
  }

  loadApprovisionnements() {
    this.approvisionnements = [
      { id: '1', nom: 'Filets de récolte', categorie: 'Matériel de récolte', quantiteStock: 245, quantiteMin: 100, unite: 'unités', etat: 'DISPONIBLE', derniereMiseAJour: '2026-04-12' },
      { id: '2', nom: 'Caisses plastiques', categorie: 'Conditionnement', quantiteStock: 45, quantiteMin: 80, unite: 'unités', etat: 'FAIBLE', derniereMiseAJour: '2026-04-13' },
      { id: '3', nom: 'Vibrateurs électriques', categorie: 'Matériel de récolte', quantiteStock: 8, quantiteMin: 12, unite: 'unités', etat: 'CRITIQUE', derniereMiseAJour: '2026-04-10' },
      { id: '4', nom: 'Bâches de protection', categorie: 'Protection', quantiteStock: 120, quantiteMin: 50, unite: 'unités', etat: 'DISPONIBLE', derniereMiseAJour: '2026-04-14' },
    ];
    this.loading = false;
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
}
