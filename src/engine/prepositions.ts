/**
 * The 26 prepositions of place, in the three tiers Mr Henry approved
 * (2026-10-22): the 12 from lesson 3 of the town deck, 8 common ones for
 * Forms 2-3 and adults towards A2, and 6 CSEC stretch ones for Forms 4-5.
 *
 * `takesDe` prepositions are followed by "de" (so du / de la / de l' / des);
 * the others take the noun straight after: "devant la banque".
 */

export interface Preposition {
  id: string;
  /** Written without the "de": "à côté", "près", "devant". */
  fr: string;
  takesDe: boolean;
  en: string;
  tier: 1 | 2 | 3;
}

const p = (id: string, fr: string, takesDe: boolean, en: string, tier: 1 | 2 | 3): Preposition => ({ id, fr, takesDe, en, tier });

export const PREPOSITIONS = {
  devant: p('devant', 'devant', false, 'in front of', 1),
  derriere: p('derriere', 'derrière', false, 'behind', 1),
  sur: p('sur', 'sur', false, 'on', 1),
  sous: p('sous', 'sous', false, 'under', 1),
  dans: p('dans', 'dans', false, 'in', 1),
  entre: p('entre', 'entre', false, 'between', 1),
  a_cote: p('a_cote', 'à côté', true, 'next to', 1),
  a_gauche: p('a_gauche', 'à gauche', true, 'to the left of', 1),
  a_droite: p('a_droite', 'à droite', true, 'to the right of', 1),
  pres: p('pres', 'près', true, 'near', 1),
  loin: p('loin', 'loin', true, 'far from', 1),
  en_face: p('en_face', 'en face', true, 'opposite', 1),
  au_coin: p('au_coin', 'au coin', true, 'at the corner of', 2),
  au_bout: p('au_bout', 'au bout', true, 'at the end of', 2),
  au_milieu: p('au_milieu', 'au milieu', true, 'in the middle of', 2),
  au_bord: p('au_bord', 'au bord', true, 'at the edge of', 2),
  autour: p('autour', 'autour', true, 'around', 2),
  le_long: p('le_long', 'le long', true, 'along', 2),
  en_haut: p('en_haut', 'en haut', true, 'at the top of', 2),
  en_bas: p('en_bas', 'en bas', true, 'at the bottom of', 2),
  a_l_interieur: p('a_l_interieur', "à l'intérieur", true, 'inside', 3),
  a_l_exterieur: p('a_l_exterieur', "à l'extérieur", true, 'outside', 3),
  au_dessus: p('au_dessus', 'au-dessus', true, 'above', 3),
  au_dessous: p('au_dessous', 'au-dessous', true, 'below', 3),
  au_fond: p('au_fond', 'au fond', true, 'at the back of', 3),
  contre: p('contre', 'contre', false, 'against', 3),
} as const satisfies Record<string, Preposition>;

export type PrepId = keyof typeof PREPOSITIONS;
