# Import / export CSV — collection de cartes

HobbyHoops permet d’exporter la collection au format CSV et d’importer des cartes depuis Excel, Google Sheets, LibreOffice Calc ou tout éditeur texte.

L’interface se trouve dans **Admin → Import / export CSV**.

## Export

Deux actions sont disponibles :

| Bouton | Contenu exporté |
| ------ | ---------------- |
| **Exporter (filtres ci-dessous)** | Cartes correspondant aux filtres définis dans l’onglet CSV |
| **Exporter toute la collection** | Toutes les cartes, sans filtre |

Le fichier téléchargé :

- est encodé en **UTF-8** (avec BOM pour Excel) ;
- utilise la **virgule** comme séparateur ;
- contient une **ligne d’en-tête** en anglais (noms canoniques) ;
- se nomme `hobbyhoops-cards-filtered-YYYY-MM-DD.csv` ou `hobbyhoops-cards-all-YYYY-MM-DD.csv`.

### Utilisation typique

1. Connectez-vous à HobbyHoops.
2. Ouvrez **Admin → Import / export CSV**.
3. (Optionnel) Définissez les filtres pour limiter l’export partiel.
4. Cliquez sur **Exporter (filtres ci-dessous)** ou **Exporter toute la collection**.
5. Ouvrez le fichier dans Excel/Sheets ou conservez-le comme archive.

## Import

### Modes

| Mode | Comportement |
| ---- | ------------ |
| **Créer ou mettre à jour (upsert)** | Si `id` existe en base → mise à jour. Si `id` est absent → nouvelle carte (id auto). Si `id` est inconnu → création avec cet `id`. |
| **Créer uniquement** | La colonne `id` est ignorée ; chaque ligne crée une **nouvelle** carte. |

### Étapes

1. Préparez un fichier CSV conforme au format ci-dessous.
2. **Admin → Import / export CSV**.
3. Choisissez le mode d’import.
4. **Choisir un fichier .csv** ou collez le contenu dans la zone de texte puis **Importer le texte collé**.
5. L’interface affiche le nombre de cartes créées/mises à jour et les erreurs par ligne le cas échéant.

Les listes de référence (joueurs, marques, sets, etc.) sont **enrichies automatiquement** à partir des cartes importées.

### Limites

- **5 000 lignes** de cartes maximum par import.
- **5 Mo** maximum pour le corps de la requête.
- Rate limiting côté serveur (comme les autres écritures API).

## Format CSV attendu

### En-tête canonique (ligne 1)

```csv
id,player,team,year,brand,set,variation,autograph,memorabilia,rookie,tradable,serial_number,serial_current,serial_total,card_number,grading,opening_date,protection,storage,photo
```

### Colonnes

| Colonne | Obligatoire | Description | Exemple |
| ------- | ----------- | ----------- | ------- |
| `id` | Non | Identifiant interne HobbyHoops | `card-0042` |
| `player` | **Oui** | Nom du joueur | `Victor Wembanyama` |
| `team` | Non | Équipe / club | `Spurs` |
| `year` | Non | Année ou saison | `2023` ou `2023-24` |
| `brand` | Non | Marque | `Panini` |
| `set` | Non | Nom du set | `Prizm` |
| `variation` | Non | Variation | `Silver` |
| `autograph` | Non | Autographe | `true` |
| `memorabilia` | Non | Memorabilia / patch | `false` |
| `rookie` | Non | Rookie card (RC) | `true` |
| `tradable` | Non | Carte échangeable | `false` |
| `serial_number` | Non | Numéro de série affiché | `10/99` |
| `serial_current` | Non | Numéro courant (entier) | `10` |
| `serial_total` | Non | Tirage total (entier) | `99` |
| `card_number` | Non | Numéro de carte dans le set | `1` |
| `grading` | Non | Société et note | `PSA, 10` ou `Ungraded` |
| `opening_date` | Non | Date d’ajout à la collection | `15/03/2024` |
| `protection` | Non | Protection (toploader, etc.) | `Penny sleeve` |
| `storage` | Non | Lieu de rangement | `Boîte A` |
| `photo` | Non | URL HTTPS ou data URI image | `https://…` |

### Alias d’en-tête (français)

L’import accepte des en-têtes en français (insensible à la casse) :

| Alias | Colonne |
| ----- | ------- |
| `joueur`, `nom`, `name` | `player` |
| `club`, `équipe`, `equipe` | `team` |
| `année`, `annee` | `year` |
| `marque` | `brand` |
| `auto`, `autographe` | `autograph` |
| `memo`, `patch` | `memorabilia` |
| `rc` | `rookie` |
| `échange`, `echange` | `tradable` |
| `série`, `serie`, `serial` | `serial_number` |
| `numéro`, `numero`, `number` | `card_number` |
| `gradation` | `grading` |
| `date`, `date_ajout` | `opening_date` |
| `rangement` | `storage` |

### Valeurs booléennes

Valeurs acceptées (insensible à la casse) : `true`, `false`, `1`, `0`, `yes`, `no`, `oui`, `non`, `x`.

Cellule vide = `false`.

### Dates

- Format français : `jj/mm/aaaa` (ex. `15/03/2024`)
- Format ISO : `aaaa-mm-jj` (ex. `2024-03-15`)

Si `opening_date` est vide à l’import, la **date du jour** est utilisée (comme pour un ajout manuel).

### Séparateurs

À l’**import**, sont acceptés : virgule `,`, point-virgule `;`, tabulation.

À l’**export**, HobbyHoops produit toujours un CSV **virgule** standard.

### Exemple minimal (création)

```csv
player,team,year,brand,set,variation
Victor Wembanyama,Spurs,2023,Panini,Prizm,Base
LeBron James,Lakers,2023,Panini,Select,Courtside
```

### Exemple complet (upsert)

```csv
id,player,team,year,brand,set,variation,autograph,memorabilia,rookie,tradable,serial_number,card_number,grading,opening_date
card-0001,LeBron James,Lakers,2023,Panini,Prizm,Silver,false,false,false,true,10/99,1,PSA 10,15/03/2024
,Stephen Curry,Warriors,2022,Panini,Donruss,Base,true,false,false,false,,25,Ungraded,01/01/2024
```

- Ligne 1 : met à jour la carte `card-0001` si elle existe.
- Ligne 2 : crée une nouvelle carte (pas d’`id`).

## Excel / Google Sheets

1. Organisez vos colonnes selon le tableau ci-dessus (ou exportez d’abord depuis HobbyHoops pour obtenir un modèle).
2. **Excel** : Fichier → Enregistrer sous → **CSV UTF-8 (délimité par des virgules)**.
3. **Google Sheets** : Fichier → Télécharger → **Values separated by commas (.csv)**.
4. Importez le fichier dans HobbyHoops.

## Sauvegarde et restauration

L’export CSV **complète** la sauvegarde SQLite (`hobbyhoops.db`) documentée dans le [README](../README.md) :

- **SQLite** : sauvegarde complète fidèle (sessions, comptes, wanted, etc.).
- **CSV** : portabilité, édition tableur, partage de la collection seule.

Pour une restauration complète de l’instance, privilégiez le backup `.db`.

## Dépannage

| Problème | Piste |
| -------- | ----- |
| Erreur sur une ligne | Lisez le message (ex. joueur manquant, date invalide) ; les autres lignes valides sont tout de même traitées. |
| Accents illisibles dans Excel | Réexportez en UTF-8 ou ouvrez via Données → Importer (UTF-8). L’export HobbyHoops inclut un BOM. |
| Trop de lignes | Découpez le fichier (max 5000 lignes par import). |
| `id` ignoré | Vérifiez que vous êtes en mode **upsert**, pas **Créer uniquement**. |
