import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  users = [
    { nom: 'Amina Ben Ali', email: 'amina@olive.tn', role: 'AGRICULTEUR', statut: 'Actif' },
    { nom: 'Karim Trabelsi', email: 'karim@olive.tn', role: 'RESPONSABLE_LOGISTIQUE', statut: 'Actif' },
    { nom: 'Sarra Gharbi', email: 'sarra@olive.tn', role: 'RESPONSABLE_CHEF_RECOLTE', statut: 'En attente' }
  ];
}
