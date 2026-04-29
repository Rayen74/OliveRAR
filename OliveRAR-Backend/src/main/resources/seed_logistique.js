/**
 * Seed – Module Gestion des Ressources (Responsable Logistique)
 * =============================================================
 * Exécuter depuis mongosh :
 *   use olive_db   (adapter si besoin)
 *   load("seed_logistique.js")
 *
 * Ou via mongosh CLI :
 *   mongosh <connection-string>/olive_db seed_logistique.js
 */

// ── Types de ressources ───────────────────────────────────────────────────

const typeIds = {};

const types = [
  {
    nom: "Camion SCANIA 25T",
    categorie: "MATERIEL_ROULANT",
    sousCategorie: "VEHICULE",
    description: "Camion de transport gros porteur pour les olives récoltées.",
    capacite: { valeur: 25, unite: "tonnes" },
    actif: true
  },
  {
    nom: "Tracteur JOHN DEERE 6M",
    categorie: "MATERIEL_ROULANT",
    sousCategorie: "TRACTEUR",
    description: "Tracteur agricole polyvalent pour le transport intra-verger.",
    capacite: { valeur: 5, unite: "tonnes" },
    actif: true
  },
  {
    nom: "Benne basculante 10T",
    categorie: "MATERIEL_ROULANT",
    sousCategorie: "VEHICULE",
    description: "Benne pour collecte en vrac des olives.",
    capacite: { valeur: 10, unite: "tonnes" },
    actif: true
  },
  {
    nom: "Vibrateur électrique VB-200",
    categorie: "EQUIPEMENT",
    sousCategorie: "OUTIL_MECANIQUE",
    description: "Vibrateur pour la cueillette mécanique des olives.",
    capacite: { valeur: 1, unite: "unité" },
    actif: true
  },
  {
    nom: "Filet de récolte 6x8m",
    categorie: "EQUIPEMENT",
    sousCategorie: "ACCESSOIRE",
    description: "Filet pour la collecte au sol des olives.",
    capacite: { valeur: 48, unite: "m²" },
    actif: true
  },
  {
    nom: "Caisse palette 300kg",
    categorie: "EQUIPEMENT",
    sousCategorie: "ACCESSOIRE",
    description: "Conteneur pour le conditionnement et transport des olives.",
    capacite: { valeur: 300, unite: "kg" },
    actif: true
  },
  {
    nom: "Tronçonneuse élagueuse",
    categorie: "EQUIPEMENT",
    sousCategorie: "OUTIL_MECANIQUE",
    description: "Outil pour la taille et l'entretien des oliviers.",
    capacite: { valeur: 1, unite: "unité" },
    actif: true
  },
  {
    nom: "Échelle en bois 4m",
    categorie: "EQUIPEMENT",
    sousCategorie: "OUTIL_MANUEL",
    description: "Échelle pour la cueillette manuelle en hauteur.",
    capacite: { valeur: 1, unite: "unité" },
    actif: true
  }
];

// Insérer les types et mémoriser les IDs
types.forEach(type => {
  const result = db.typesRessources.insertOne(type);
  typeIds[type.nom] = result.insertedId;
  print("Type inséré : " + type.nom + " → " + result.insertedId);
});

// ── Unités réelles ────────────────────────────────────────────────────────

const now = new Date();
const sixMonthsAgo = new Date(now.getTime() - 190 * 24 * 60 * 60 * 1000); // alerte active
const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);  // OK

function makeHistorique(statut, auteurLabel) {
  return [{
    date: now,
    action: "CREATION",
    statut: statut,
    note: "Unité créée via seed.",
    auteurId: "seed"
  }];
}

const unites = [
  // Camions SCANIA
  {
    codeUnique: "CAM-001",
    typeId: typeIds["Camion SCANIA 25T"],
    statut: "DISPONIBLE",
    disponibilite: true,
    localisation: "Dépôt central Sfax",
    derniereMaintenanceDate: twoMonthsAgo,
    alerteMaintenanceActive: false,
    seuilMaintenanceJours: 180,
    conducteurHabituelId: null,
    notes: "Bon état général.",
    historique: makeHistorique("DISPONIBLE")
  },
  {
    codeUnique: "CAM-002",
    typeId: typeIds["Camion SCANIA 25T"],
    statut: "EN_MAINTENANCE",
    disponibilite: false,
    localisation: "Garage partenaire Sfax",
    derniereMaintenanceDate: now,
    alerteMaintenanceActive: false,
    seuilMaintenanceJours: 180,
    conducteurHabituelId: null,
    notes: "Révision annuelle en cours.",
    historique: makeHistorique("EN_MAINTENANCE")
  },
  // Tracteurs
  {
    codeUnique: "TRC-001",
    typeId: typeIds["Tracteur JOHN DEERE 6M"],
    statut: "DISPONIBLE",
    disponibilite: true,
    localisation: "Site A – Secteur Nord",
    derniereMaintenanceDate: sixMonthsAgo,
    alerteMaintenanceActive: true,   // dépasse 180 jours
    seuilMaintenanceJours: 180,
    conducteurHabituelId: null,
    notes: "Alerte maintenance dépassée.",
    historique: makeHistorique("DISPONIBLE")
  },
  // Bennes
  {
    codeUnique: "BEN-001",
    typeId: typeIds["Benne basculante 10T"],
    statut: "DISPONIBLE",
    disponibilite: true,
    localisation: "Dépôt central Sfax",
    derniereMaintenanceDate: twoMonthsAgo,
    alerteMaintenanceActive: false,
    seuilMaintenanceJours: 180,
    conducteurHabituelId: null,
    notes: "",
    historique: makeHistorique("DISPONIBLE")
  },
  // Vibrateurs
  {
    codeUnique: "VIB-001",
    typeId: typeIds["Vibrateur électrique VB-200"],
    statut: "DISPONIBLE",
    disponibilite: true,
    localisation: "Site B – Secteur Est",
    derniereMaintenanceDate: twoMonthsAgo,
    alerteMaintenanceActive: false,
    seuilMaintenanceJours: 180,
    conducteurHabituelId: null,
    notes: "",
    historique: makeHistorique("DISPONIBLE")
  },
  {
    codeUnique: "VIB-002",
    typeId: typeIds["Vibrateur électrique VB-200"],
    statut: "EN_PANNE",
    disponibilite: false,
    localisation: "Site A – Secteur Nord",
    derniereMaintenanceDate: sixMonthsAgo,
    alerteMaintenanceActive: true,
    seuilMaintenanceJours: 180,
    conducteurHabituelId: null,
    notes: "Moteur défaillant – pièce commandée.",
    historique: makeHistorique("EN_PANNE")
  },
  // Filets
  {
    codeUnique: "FIL-001",
    typeId: typeIds["Filet de récolte 6x8m"],
    statut: "DISPONIBLE",
    disponibilite: true,
    localisation: "Dépôt central Sfax",
    derniereMaintenanceDate: twoMonthsAgo,
    alerteMaintenanceActive: false,
    seuilMaintenanceJours: 365,
    conducteurHabituelId: null,
    notes: "",
    historique: makeHistorique("DISPONIBLE")
  },
  {
    codeUnique: "FIL-002",
    typeId: typeIds["Filet de récolte 6x8m"],
    statut: "DISPONIBLE",
    disponibilite: true,
    localisation: "Dépôt central Sfax",
    derniereMaintenanceDate: twoMonthsAgo,
    alerteMaintenanceActive: false,
    seuilMaintenanceJours: 365,
    conducteurHabituelId: null,
    notes: "",
    historique: makeHistorique("DISPONIBLE")
  }
];

unites.forEach(unite => {
  const result = db.unites.insertOne(unite);
  print("Unité insérée : " + unite.codeUnique + " → " + result.insertedId);
});

print("\n✅ Seed logistique terminé — " + types.length + " types et " + unites.length + " unités insérés.");
