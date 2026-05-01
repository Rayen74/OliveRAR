export interface MenuItem {
  link: string;
  label: string;
  icon: string;
  roles?: string[];
  permissions?: string[];
}

export interface SidebarConfig {
  items: MenuItem[];
}
