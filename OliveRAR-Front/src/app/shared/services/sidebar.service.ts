import { Injectable } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly menuConfigs: Record<string, MenuItem[]> = {
    RESPONSABLE_COOPERATIVE: [
      { link: '/responsable/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
      { link: '/responsable/notifications', label: 'Notifications', icon: 'notifications' },
      { link: '/responsable/users', label: 'Utilisateurs', icon: 'group' },
      { link: '/responsable/collectes', label: 'Mes collectes', icon: 'event' },
      { link: '/responsable/tournees', label: 'Tournées', icon: 'route' },
      { link: '/responsable/tournees/calendrier', label: 'Calendrier Tournées', icon: 'calendar_month' },
      { link: '/responsable/types-ressources', label: 'Types de ressources', icon: 'category' },
      { link: '/responsable/unites', label: 'Unités logistiques', icon: 'precision_manufacturing' },
      { link: '/responsable/activites', label: 'Journal d\'activité', icon: 'history_edu' },
      { link: '/responsable/profile', label: 'Mon profil', icon: 'person' }
    ],
    AGRICULTEUR: [
      { link: '/agriculteur/vergers', label: 'Mes Vergers', icon: 'forest' },
      { link: '/agriculteur/signalements', label: 'Signalements', icon: 'warning' },
      { link: '/agriculteur/notifications', label: 'Notifications', icon: 'notifications' },
      { link: '/agriculteur/communaute', label: 'Communaute', icon: 'groups' },
      { link: '/agriculteur/profile', label: 'Mon Profil', icon: 'person' }
    ],
    RESPONSABLE_LOGISTIQUE: [
      { link: '/responsable-logistique/types-ressources', label: 'Types de ressources', icon: 'category' },
      { link: '/responsable-logistique/unites', label: 'Unités', icon: 'precision_manufacturing' },
      { link: '/responsable-logistique/collectes', label: 'Collectes', icon: 'event' },
      { link: '/responsable-logistique/tournees', label: 'Tournées', icon: 'route' },
      { link: '/responsable/tournees/calendrier', label: 'Calendrier logistique', icon: 'calendar_month' },
      { link: '/responsable-logistique/activites', label: 'Mes activités', icon: 'history_edu' },
      { link: '/responsable-logistique/profile', label: 'Mon Profil', icon: 'person' }
    ],
    RESPONSABLE_CHEF_RECOLTE: [
      { link: '/chef-recolte/tours', label: 'Mes Tournées', icon: 'route' },
      { link: '/chef-recolte/profile', label: 'Mon Profil', icon: 'person' }
    ]
  };

  getMenuItems(role: string): MenuItem[] {
    return this.menuConfigs[role] || [];
  }
}
