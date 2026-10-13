## Présentation
Plateforme web gamifiée (puis app Play Store / App Store) connectée à Strava. Visualisation des traces GPX sur une carte avec complétion de tuiles, de communes et de points d'intérêt. Badges, aspect communautaire, balises à récupérer sur la carte, accomplissements métaphoriques.

## Stack
- Back: NestJS + TypeORM. 
- BDD: PostgreSQL + PostGIS (pour les requêtes spatiales). 
- Front: NextJS. 

## Règles
- Utilisation de Docker. 
- Utilisation stricte de Gitflow et conventional commits (et milestones, labels, issues, etc). 
- N'ajoute pas de mention Claude (que ce soit dans les commits, les PR). 
- TS strict. 
- Pour la V0, utilisation de https://ui.shadcn.com/. 
- Frontend codé en respectant les principes de design SOLID + squelettes de chargement + responsive. 
- Mobile first. 
- Tout ce qui n'est pas de l'interface utilisateur doit être évidement écrit en professionnel. 
- Je m'occupe de valider les PR. 