# Faisabilité du mod Quartiers spécialisés

Ce fichier décrit ce que Civilization VII permet vraiment pour ce mod, et ce que le moteur refuse. Les deux sources sont la synergie des deux bâtiments d'un quartier et les doctrines du premier bâtiment.

La limite commune : un effet du jeu vise un type de bâtiment, une ville ou l'empire. Il ne vise pas une instance déjà posée sur une case.

## Ce que le moteur accepte

- Connaître les deux bâtiments d'une case, leur type et leur archétype.
- Mémoriser un choix par case et par joueur, et l'effacer au changement d'âge ou à la surconstruction.
- Verrouiller une doctrine unique une fois par empire et par âge.
- Ajouter un rendement à la ville ou à l'empire : science, culture, or, production, nourriture, bonheur, influence. Ce rendement va au stock ou à la progression. Il n'est pas gravé sur la case.
- Lire les cases voisines, les ressources assignées, les fermes, les spécialistes déjà placés, les maîtrises, les célébrations et le rendement actuel d'une case.
- Ouvrir un choix avec l'interface du jeu : événement de découverte pour l'archétype hybride, écran de bonus de cité-État pour la doctrine.
- Masquer des lignes dans l'aperçu de placement. Cet affichage ne change pas le calcul du jeu.

## Synergie du second bâtiment

Le premier bâtiment fixe l'archétype du quartier. Le second renforce cet archétype et, dans la spécification, perd sa proximité.

### Faisable

| Effet | Comment |
| :--- | :--- |
| Archétype du bâtiment, y compris les entrepôts | Déduit des tags et des rendements vanilla. |
| Bâtiment hybride | Le joueur choisit l'un des deux archétypes. L'IA prend le primaire. |
| Science, culture, or, nourriture, bonheur en second | +1 du rendement de la fondation par palier (maîtrises, ressources, fermes ou bateaux, célébrations). Versé à la ville. |
| Diplomatie en second | +1 du rendement de la fondation par ville connectée, plus 1 par spécialiste du quartier. Le bonus ne se cumule pas sur une même ville. |
| Fondation militaire | +5 % de production d'unités militaires par palier, si la ville expose une fonction de pourcentage. |
| Spécialistes à 100 % de la proximité réelle | Déjà le cas dans le jeu. Le mod ne doit pas modifier ce multiplicateur. |
| Aperçu de placement | Sur une case où le bâtiment serait le second, les flèches de proximité sont masquées et le gain calculé est affiché. Sur une case vide, la proximité vanilla reste visible. |

### Impossible

| Effet demandé | Pourquoi |
| :--- | :--- |
| Retirer la proximité du second bâtiment | La proximité est une règle du type de bâtiment. `EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_ADJACENCY` l'active pour toute une ville. Aucun effet ne la retire d'une seule instance. Elle continue d'être calculée et recopiée par les spécialistes. |
| Graver le gain du catalyseur sur la case | Le rendement ajouté par le script n'apparaît pas dans le rendement du bâtiment. |
| Production ou militaire en second : Ageless | `AGELESS` est un tag du type. Il ne peut pas être posé sur un seul bâtiment. Le second devient obsolète à l'âge suivant, comme en vanilla. |
| Doubler les spécialistes de 50 % à 100 % | La spécification partait d'un multiplicateur à 50 %. Dans le jeu il est déjà à 100 % de la proximité réelle. Le changer n'est ni nécessaire ni possible pour une seule case. |

## Doctrines du premier bâtiment

Sept doctrines par archétype. La doctrine 0 est illimitée. Les doctrines 1 à 6 sont uniques pour l'empire pendant l'âge.

### Faisable

| Effet | Comment |
| :--- | :--- |
| Doctrine standard | Ne rien changer. La proximité vanilla du bâtiment reste. |
| Choix et verrouillage | Le panneau liste les doctrines encore disponibles. Une doctrine unique choisie disparaît jusqu'au changement d'âge. |
| Doctrines de proximité 1 à 3 | Compter les cases voisines qui correspondent (végétation, côte, ressource, quartier urbain, etc.) et verser +1 du rendement à la ville par case. |
| Doctrines passives | Verser le rendement selon un compteur d'empire ou de ville : ressources assignées, ressources stratégiques, fermes et pâturages, merveilles, suzerainetés, promotions de commandants si le jeu les expose. |
| Rendement des spécialistes déjà placés | +2 du rendement de la fondation par spécialiste du quartier, ou la variante indiquée (traditions, commandants). |
| Rafales | Verser le rendement secondaire quand l'événement est vu : technologie, dogme, route commerciale, bâtiment, population, célébration, unité vaincue, entreprise diplomatique. Le montant lu est le rendement actuel de la case. |

### Impossible

| Effet demandé | Pourquoi |
| :--- | :--- |
| Remplacer la proximité d'un seul bâtiment | Même limite que pour le second bâtiment. La proximité d'origine reste. Le bonus de doctrine s'ajoute à la ville, et les spécialistes ne le recopient pas. |
| Emplacement de codex ou de chef-d'œuvre sur un seul bâtiment | `EFFECT_CITY_ADJUST_GREAT_WORK_SLOTS` et `EFFECT_CONSTRUCTIBLE_ADJUST_GREAT_WORK_SLOTS` visent un type, ou tous les bâtiments qui ont déjà un emplacement. Un emplacement donné à une bibliothèque est donné à toutes les bibliothèques. |
| Emplacement de ressource sur une seule ville au titre d'un seul bâtiment | Les emplacements de ressource sont ceux de la ville. Le jeu ne les attache pas à une instance de bâtiment. |
| Emplacement de spécialiste sur un seul quartier | `MaxWorkers` d'une case vient du plafond de la ville, `EFFECT_CITY_ADJUST_WORKER_CAP`. L'augmenter relève toutes les cases de la ville. `EFFECT_DISTRICT_ADJUST_WORKER_CAP` peut filtrer par côte ou par type de bâtiment, pas par le quartier qui a choisi la doctrine. Aucune fonction de script ne modifie `MaxWorkers` d'une case. |
| +10 % de maîtrise, −10 % sur les achats, entretien gratuit, expérience de combat | Ces ajustements, quand ils existent, valent pour la ville ou l'empire. Ils ne peuvent pas être limités au quartier choisi. |

## Affichage et simulation

| Besoin | État |
| :--- | :--- |
| Masquer la proximité dans l'aperçu du second bâtiment | Faisable. Affichage seulement. |
| Montrer le gain calculé au survol | Faisable. Affichage seulement. |
| Texte du second bâtiment dans le panneau de production | Faisable. |
| Nom de la doctrine dans l'infobulle du quartier | Faisable. |
| Changer le chiffre de rendement gravé sur le bâtiment | Impossible. |

## Hors de ce mod

Les bâtiments uniques de civilisation, les murailles, les ponts et les merveilles ne sont pas dans le périmètre. Les doctrines décrites sont celles de l'Antiquité, réutilisées pour les trois âges faute d'une matrice Exploration et Moderne dans la spécification.
