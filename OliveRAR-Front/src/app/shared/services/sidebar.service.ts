import { Injectable } from '@angular/core';
import { MenuItem } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly menuConfigs: Record<string, MenuItem[]> = {
    'RESPONSABLE_COOPERATIVE': [
      { link: '/responsable/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
      { link: '/responsable/notifications', label: 'Notifications', icon: 'notifications' },
      { link: '/responsable/users', label: 'Utilisateurs', icon: 'group' },
      { link: '/responsable/collectes', label: 'Mes collectes', icon: 'event' },
      { link: '/responsable/collectes/calendrier', label: 'Calendrier', icon: 'calendar_month' },
      { link: '/responsable/profile', label: 'Mon profil', icon: 'person' },
    ],
    'AGRICULTEUR': [
      { link: '/agriculteur/vergers', label: 'Mes Vergers', icon: 'forest' },
      { link: '/agriculteur/notifications', label: 'Notifications', icon: 'notifications' },
      { link: '/agriculteur/communaute', label: 'Communauté', icon: 'groups' },
      { link: '/agriculteur/profile', label: 'Mon Profil', icon: 'person' },
    ],
    'RESPONSABLE_LOGISTIQUE': [
      { link: '/responsable-logistique/equipements', label: 'Équipements', icon: 'inventory_2' },
      { link: '/responsable-logistique/profile', label: 'Mon Profil', icon: 'person' },
    ],
    'RESPONSABLE_CHEF_RECOLTE': [
      { link: '/responsable-chef-recolte/profile', label: 'Mon Profil', icon: 'person' },
    ]
  };

  /**
   * Returns menu items based on user role.
   * @param role The user role from AuthService
   */
  getMenuItems(role: string): MenuItem[] {
    return this.menuConfigs[role] || [];
  }
}
