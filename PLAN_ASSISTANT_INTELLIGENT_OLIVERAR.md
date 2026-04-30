# Plan d'Implementation : Assistant Intelligent OliveRAR

Ce document met a jour la strategie technique pour l'integration d'un assistant conversationnel dans OliveRAR a partir du code actuellement present dans :

- `OliveRAR-Backend` : Spring Boot + MongoDB + JWT
- `OliveRAR-Front` : Angular standalone + routing par role + interceptor JWT

L'objectif est d'ajouter un assistant capable d'automatiser des actions de terrain depuis l'interface web, via **n8n** et un modele LLM, sans casser l'architecture existante.

## Architecture reelle du projet

1. `OliveRAR-Front`
   Interface Angular standalone.
   Les appels API partent de `API_PREFIX = http://localhost:8080/api`.
   Le JWT est deja injecte automatiquement via `auth-token.interceptor.ts`.

2. `OliveRAR-Backend`
   API Spring Boot securisee par JWT.
   Toutes les routes `/api/**` hors `/api/auth/**` sont authentifiees.

3. `n8n`
   Orchestrateur IA appele par le backend via un webhook prive.

4. `API REST OliveRAR`
   L'assistant doit reutiliser les routes existantes plutot que creer de nouveaux flux paralleles.

## Phase 1 : Pont Spring Boot

Le backend doit exposer un endpoint de chat interne au produit, par exemple :

- `POST /api/chat`

Cette route devra :

1. Recuperer l'utilisateur courant via la securite existante.
   Le projet dispose deja de `CurrentUserService` qui permet d'acceder a `User` depuis le contexte JWT.

2. Construire un payload enrichi pour n8n.

3. Appeler le webhook n8n cote serveur.

4. Retourner une reponse simple au front.

### DTOs recommandes

Fichier a creer cote backend :

- `ChatRequest.java`
- `ChatResponse.java`
- eventuellement `ChatMessage.java`

Structure recommandee :

```json
{
  "message": "J'ai termine le verger Ain Tmar",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Reponse :

```json
{
  "reply": "C'est note, la collecte a ete enregistree."
}
```

### Service backend recommande

Le service `ChatService` devra envoyer a n8n un payload enrichi comme :

```json
{
  "message": "J'ai termine le verger Ain Tmar",
  "history": [],
  "user": {
    "id": "662f...",
    "nom": "Mohamed",
    "prenom": "Ben Salah",
    "email": "mohamed@example.com",
    "role": "RESPONSABLE_CHEF_RECOLTE"
  }
}
```

### Sources du contexte utilisateur deja disponibles

- `CurrentUserService#getRequiredCurrentUser()`
- `User` contient deja : `id`, `nom`, `prenom`, `email`, `phoneNumber`, `role`

### Securite

Le projet protege deja toutes les routes applicatives avec `SecurityConfig`.
Il suffira donc d'ajouter `/api/chat` comme route authentifiee standard, sans l'ajouter aux exceptions de `/api/auth/**`.

### Configuration

Le backend tourne deja sur :

- `http://localhost:8080`

Ajouter une propriete applicative pour n8n, par exemple :

```properties
app.n8n.webhook-url=${N8N_WEBHOOK_URL:http://localhost:5678/webhook/olive-assistant}
```

## Phase 2 : Workflow n8n

Le workflow n8n doit etre aligne sur les **routes reelles** du backend.

### Entree

- Webhook `POST /webhook/olive-assistant`

Le backend Spring Boot appelle ce webhook. Le front ne doit pas appeler n8n directement.

### Prompt systeme recommande

```text
Tu es l'assistant operationnel de OliveRAR.
Tu aides les responsables et operateurs a consulter leur planning, creer des collectes et declarer des signalements.
Tu reponds toujours en francais.
Tu n'inventes jamais d'identifiants.
Quand une action necessite une creation backend, utilise exclusivement les outils disponibles.
Si une information obligatoire manque, pose une question courte pour la recuperer.
```

## Outils n8n a brancher sur les routes existantes

### 1. Consulter le planning

Le code existant expose surtout les donnees calendrier sur :

- `GET /api/collectes/calendar`
- `GET /api/tournees/calendar-data`

Usage recommande :

- pour un chef de recolte : priorite a `GET /api/collectes?chefRecolteId={userId}`
- pour un responsable logistique : `GET /api/tournees/calendar-data`
- pour une vue generique calendrier : `GET /api/collectes/calendar`

Remarque importante :
le `userId` n'est pas present dans le JWT Angular cote front, mais il sera disponible dans le payload enrichi envoye par le backend a n8n.

### 2. Enregistrer une collecte

La route reelle existante est :

- `POST /api/collectes`

Le payload doit respecter l'entite `Collecte` actuelle :

```json
{
  "name": "Collecte Assistant - Ain Tmar",
  "vergerId": "{{ vergerId }}",
  "datePrevue": "{{ datePrevue }}",
  "chefRecolteId": "{{ chefRecolteId }}",
  "responsableAffectationId": "{{ responsableAffectationId }}",
  "statut": "PLANIFIEE",
  "affectations": []
}
```

Champs obligatoires reels :

- `name`
- `vergerId`
- `datePrevue`
- `chefRecolteId`
- `statut`

Important :

- le plan initial mentionnait `TERMINEE` et un poids collecte, mais l'entite actuelle `Collecte` ne contient pas de champ `poids`
- si l'assistant doit enregistrer "j'ai termine", il peut soit :
  - creer une collecte avec `statut = TERMINEE` si la logique metier l'autorise
  - soit mettre a jour une collecte existante via `PUT /api/collectes/{id}`

En l'etat du code, parler de "450 kg" doit rester dans la reponse conversationnelle ou etre historise ailleurs, car ce champ n'existe pas encore dans `Collecte`.

### 3. Creer un signalement

La route reelle existante est :

- `POST /api/signalements`

Le payload doit respecter `Signalement` :

```json
{
  "vergerId": "{{ vergerId }}",
  "issueType": "{{ issueType }}",
  "description": "{{ description }}",
  "latitude": {{ latitude }},
  "longitude": {{ longitude }},
  "status": "NOUVEAU"
}
```

Champs obligatoires reels :

- `vergerId`
- `issueType`
- `description`
- `latitude`
- `longitude`
- `status`

Important :

- le plan initial mentionnait `titre`, `type` et un endpoint "base sur SignalementController"
- dans le code reel, ces champs n'existent pas
- `issueType` remplace le `type`
- il faut des coordonnees GPS obligatoires

### 4. Aides a la saisie pour l'agent

Pour eviter les hallucinations d'IDs, l'agent devrait pouvoir consulter :

- `GET /api/verger/ready`
  pour recuperer les vergers disponibles a la recolte

- `GET /api/users/by-role?role=RESPONSABLE_CHEF_RECOLTE`
  pour recuperer les chefs de recolte

- `GET /api/users/by-role?role=RESPONSABLE_LOGISTIQUE`
  pour recuperer les responsables logistiques

Ces routes existent deja et sont utilisees par le front.

## Phase 3 : Integration Angular reelle

Le front actuel n'a pas encore de module chat. Il est base sur :

- `src/app/app.ts`
- `src/app/app.html`
- `src/app/app.routes.ts`

### Point d'integration conseille

Le point d'entree global actuel est :

```html
<app-toast-outlet></app-toast-outlet>
<router-outlet></router-outlet>
```

Le meilleur point pour un widget global est donc `src/app/app.html`, afin que le chat soit disponible sur toutes les pages authentifiees.

### Service front a creer

Fichier recommande :

- `src/app/features/chat/services/chat.service.ts`

Ce service devra appeler :

- `POST ${API_PREFIX}/chat`

Comme `API_PREFIX` vaut deja `http://localhost:8080/api`, le front restera coherent avec le reste du projet.

### Composant widget a creer

Fichiers recommandes :

- `src/app/features/chat/components/chat-widget/chat-widget.ts`
- `src/app/features/chat/components/chat-widget/chat-widget.html`
- `src/app/features/chat/components/chat-widget/chat-widget.css`

### Placement UI

Le widget peut etre rendu globalement dans `app.html`.

Affichage conseille :

- visible uniquement si l'utilisateur est connecte
- masque sur `login`, `forgot-password`, `reset-password`

Cela peut etre gere avec :

- `AuthService.currentUser$`
- le `Router` Angular pour exclure les routes publiques

### Raccordement avec les ecrans existants

Le chat doit etre pense comme un complement aux parcours deja presents.

Routes front reelles a prendre en compte :

- `responsable/dashboard`
- `responsable/collectes`
- `responsable/collectes/calendrier`
- `responsable/tournees`
- `agriculteur/vergers`
- `agriculteur/signalements`
- `responsable-logistique/collectes`
- `responsable-logistique/tournees`
- `responsable-chef-recolte/profile`

Conseil produit :

- ouvrir le widget partout sur les routes authentifiees
- mais personnaliser les suggestions selon le role

Exemples :

- `RESPONSABLE_CHEF_RECOLTE`
  "Voir mes collectes du jour"
  "Cloturer une collecte"

- `RESPONSABLE_LOGISTIQUE`
  "Voir les tournees"
  "Affecter les ressources"

- `AGRICULTEUR`
  "Signaler un probleme dans un verger"

## Phase 4 : Alignement metier avec le code actuel

### Ce qui fonctionne deja tres bien pour l'assistant

1. Gestion JWT deja en place
2. Separation claire front/backend
3. Services Angular deja structurels par domaine
4. Routes backend metier deja disponibles
5. Roles utilisateurs deja explicites

### Ce qui manque pour une vraie experience conversationnelle

1. `POST /api/chat` n'existe pas encore
2. aucun composant `ChatWidget` n'existe encore
3. `SignalementApiService` expose seulement `getMine()` cote front
4. le module `signalements` front est encore une structure vide
5. la donnee "poids recolte" n'existe pas dans l'entite `Collecte`

## Demo mise a jour selon le code reel

### Cas 1 : Planning

Utilisateur :
"Qu'est-ce que j'ai aujourd'hui ?"

Assistant :
"Je consulte vos collectes planifiees."

Appels possibles :

- `GET /api/collectes?chefRecolteId={userId}`
- ou `GET /api/tournees/calendar-data`

### Cas 2 : Creation de collecte

Utilisateur :
"Planifie une collecte demain au verger Ain Tmar avec Mohamed."

Assistant :
"Je prepare la collecte. Je verifie d'abord le verger et le chef de recolte."

Appels possibles :

- `GET /api/verger/ready`
- `GET /api/users/by-role?role=RESPONSABLE_CHEF_RECOLTE`
- `POST /api/collectes`

### Cas 3 : Signalement terrain

Utilisateur :
"Il y a un probleme d'irrigation dans le verger."

Assistant :
"Je peux creer le signalement. Il me faut le verger et votre position si elle n'est pas deja connue."

Appel possible :

- `POST /api/signalements`

## Prochaines etapes immediates

1. Cote backend
   creer `ChatController`, `ChatService`, `ChatRequest`, `ChatResponse`

2. Cote backend
   ajouter la configuration `app.n8n.webhook-url`

3. Cote front
   creer `features/chat/services/chat.service.ts`

4. Cote front
   creer `features/chat/components/chat-widget/*`

5. Cote front
   monter le widget dans `src/app/app.html`

6. Cote metier
   decider si le poids recolte doit devenir un vrai champ backend dans `Collecte`

## Resume d'alignement

Le plan initial etait bon sur l'idee generale, mais pour coller au code actuel il faut corriger les points suivants :

- utiliser `/api/collectes`, `/api/signalements`, `/api/tournees`
- utiliser les vrais champs de `Collecte` et `Signalement`
- brancher le widget global dans `app.html`
- reutiliser `API_PREFIX` et l'interceptor JWT existants
- recuperer l'utilisateur via `CurrentUserService` cote backend
- ne pas promettre l'enregistrement du poids tant que ce champ n'existe pas en base
