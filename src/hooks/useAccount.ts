import { useEffect, useState } from 'react';
import { supabaseOffers } from '../services/supabase';

// Qui est en train de regarder le site ?
//
// POURQUOI : le menu affichait « Mon espace » a tout le monde, y compris aux
// visiteurs qui n'ont justement pas d'espace — un libelle qui presuppose la
// possession ne dit rien a celui qui n'a pas encore de compte, et envoie une
// entreprise vers l'espace candidat. Plutot que de demander au visiteur de
// deviner, le menu s'adapte a ce qu'il est.
//
// COUT : un visiteur anonyme (l'immense majorite) ne declenche AUCUNE requete —
// l'absence de session suffit a conclure. Les deux lectures ne partent que pour
// quelqu'un de deja connecte.

export type AccountKind = 'loading' | 'anonymous' | 'candidate' | 'company';

export interface Account {
  kind: AccountKind;
  email: string | null;
  name: string | null;
}

const ANON: Account = { kind: 'anonymous', email: null, name: null };

export function useAccount(): Account {
  const [account, setAccount] = useState<Account>({ kind: 'loading', email: null, name: null });

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      try {
        const { data: { session } } = await supabaseOffers.auth.getSession();
        const user = session?.user;
        if (!user) { if (!cancelled) setAccount(ANON); return; }

        // Les deux lectures partent ensemble : la RLS ne renvoie de toute facon
        // que la fiche du compte courant (ou rien).
        const [cand, comp] = await Promise.all([
          supabaseOffers.from('candidats').select('nom_complet').eq('id', user.id).maybeSingle(),
          supabaseOffers.from('comptes_entreprise').select('nom_entreprise').eq('id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;

        if (comp.data) {
          setAccount({ kind: 'company', email: user.email || null, name: (comp.data as any).nom_entreprise || null });
        } else if (cand.data) {
          setAccount({ kind: 'candidate', email: user.email || null, name: (cand.data as any).nom_complet || null });
        } else {
          // Session valide sans fiche : compte admin, ou compte cree a l'instant
          // dont le profil n'est pas encore ecrit. On ne devine pas.
          setAccount(ANON);
        }
      } catch {
        if (!cancelled) setAccount(ANON);
      }
    };

    resolve();

    // Le menu doit suivre une connexion ou une deconnexion sans rechargement.
    const { data: { subscription } } = supabaseOffers.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setAccount(ANON);
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') resolve();
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return account;
}
