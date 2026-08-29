// Signature des articles de l'Observatoire de l'emploi.
//
// Les analyses sont signees d'une PERSONNE, pas d'une organisation : c'est ce
// qui leur donne leur autorite (et ce que Google evalue sous le critere
// d'expertise de l'auteur). Le nom et le lien LinkedIn alimentent a la fois le
// bloc de signature affiche sous l'article et le JSON-LD `NewsArticle`.
//
// REGLE EXPLICITE : ne jamais mentionner de fonction d'employeur ni de titre
// administratif. La signature se limite a l'expertise. Toute contribution
// future — article redige a la main comme article de la routine editoriale —
// doit s'y tenir.

export const AUTEUR = {
  nom: 'Rachid Baddane',
  /**
   * Libelle affiche sous l'article. Une seule phrase : majuscule en tete,
   * minuscules ensuite (apposition apres un nom), « et » avant le dernier
   * element et pas de virgule devant.
   */
  titre: 'Expert en emploi, conseiller en orientation professionnelle et consultant en ressources humaines',
  /**
   * Les memes intitules, separes, pour le JSON-LD. `jobTitle` doit porter
   * plusieurs VALEURS et non une phrase : un moteur qui lirait
   * « expert en emploi, conseiller… » comme un titre unique ne reconnaitrait
   * aucune des trois competences.
   */
  titres: [
    'Expert en emploi',
    'Conseiller en orientation professionnelle',
    'Consultant en ressources humaines',
  ],
  /**
   * Profil LinkedIn, en forme CANONIQUE — sans les parametres `utm_*` que
   * l'application mobile ajoute au partage. Ils ne servent qu'au suivi interne
   * de LinkedIn, salissent un lien public et brouilleraient le `sameAs` du
   * JSON-LD, dont tout l'interet est de designer une ressource stable.
   *
   * Vide = aucun lien affiche ni publie : un lien errone vaut moins que pas de lien.
   */
  linkedin: 'https://www.linkedin.com/in/rachid-baddane-40a6a061',
} as const;
