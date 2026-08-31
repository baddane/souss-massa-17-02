// Interrupteurs de fonctionnalites, regroupes ici pour qu'une remise en service
// soit un seul booleen a basculer, et non une chasse a travers le code.

/**
 * Ouverture des comptes candidat.
 *
 * `false` : plus aucun parcours ne propose de creer un compte — ni le panneau
 * qui suivait une candidature, ni la page d'inscription, ni la carte d'alerte
 * sous les offres. Postuler reste possible, avec depot du CV : c'est le but,
 * collecter le plus de CV possible sans dresser de barriere a l'entree.
 *
 * CE QUI CONTINUE DE FONCTIONNER, ET NE DOIT PAS ETRE CASSE EN LE REACTIVANT :
 *   - la candidature elle-meme et l'envoi du CV ;
 *   - la case de consentement CVtheque, qui est la base juridique permettant
 *     aux entreprises de consulter ces CV — la retirer viderait la collecte de
 *     son interet ;
 *   - les comptes deja crees : connexion, espace candidat, alertes existantes.
 *     Fermer les inscriptions n'est pas fermer les comptes.
 *
 * Repasser a `true` remet les trois parcours en service, sans autre changement.
 */
export const INSCRIPTION_CANDIDAT_OUVERTE = false;
