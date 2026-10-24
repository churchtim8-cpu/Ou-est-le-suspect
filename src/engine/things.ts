/**
 * Everything a clue can point at: the 30 places of Bellevue (the same set and
 * wording as the town lesson deck) and the street things the suspect hides
 * by (a tree, a bench, parked cars).
 *
 * French forms are spelled out in full, never assembled from pieces at play
 * time, so a mistake like "de le" cannot happen: `word` is the noun with its
 * article, `de` is the form after "de" (du / de la / de l' / des).
 */

export interface Thing {
  key: string;
  /** With its article: "la banque", "l'école", "le commissariat de police". */
  word: string;
  /** After "de": "de la banque", "de l'école", "du commissariat de police". */
  de: string;
  /** English with its article: "the bank". */
  en: string;
  gender: 'm' | 'f';
}

function thing(key: string, word: string, en: string, gender: 'm' | 'f'): Thing {
  let de: string;
  if (word.startsWith("l'")) de = `de ${word}`;
  else if (word.startsWith('le ')) de = `du ${word.slice(3)}`;
  else if (word.startsWith('la ')) de = `de ${word}`;
  else if (word.startsWith('les ')) de = `des ${word.slice(4)}`;
  else throw new Error(`No article on "${word}"`);
  return { key, word, de, en, gender };
}

/** The 30 places, grouped by district in the order of the deck. */
export const PLACES = {
  // Le centre-ville
  police_station: thing('police_station', 'le commissariat de police', 'the police station', 'm'),
  town_hall: thing('town_hall', 'la mairie', 'the town hall', 'f'),
  post_office: thing('post_office', 'la poste', 'the post office', 'f'),
  square: thing('square', 'la place', 'the square', 'f'),
  bank: thing('bank', 'la banque', 'the bank', 'f'),
  library: thing('library', 'la bibliothèque', 'the library', 'f'),
  school: thing('school', "l'école", 'the school', 'f'),
  museum: thing('museum', 'le musée', 'the museum', 'm'),
  // La rue des magasins
  bakery: thing('bakery', 'la boulangerie', 'the bakery', 'f'),
  market: thing('market', 'le marché', 'the market', 'm'),
  supermarket: thing('supermarket', 'le supermarché', 'the supermarket', 'm'),
  pharmacy: thing('pharmacy', 'la pharmacie', 'the pharmacy', 'f'),
  shop: thing('shop', 'le magasin', 'the shop', 'm'),
  bookshop: thing('bookshop', 'la librairie', 'the bookshop', 'f'),
  cafe: thing('cafe', 'le café', 'the café', 'm'),
  shopping_centre: thing('shopping_centre', 'le centre commercial', 'the shopping centre', 'm'),
  // Le front de mer
  beach: thing('beach', 'la plage', 'the beach', 'f'),
  park: thing('park', 'le parc', 'the park', 'm'),
  swimming_pool: thing('swimming_pool', 'la piscine', 'the swimming pool', 'f'),
  stadium: thing('stadium', 'le stade', 'the stadium', 'm'),
  cinema: thing('cinema', 'le cinéma', 'the cinema', 'm'),
  theatre: thing('theatre', 'le théâtre', 'the theatre', 'm'),
  restaurant: thing('restaurant', 'le restaurant', 'the restaurant', 'm'),
  hotel: thing('hotel', "l'hôtel", 'the hotel', 'm'),
  // Le quartier de la gare
  train_station: thing('train_station', 'la gare', 'the train station', 'f'),
  bus_station: thing('bus_station', 'la gare routière', 'the bus station', 'f'),
  bus_stop: thing('bus_stop', "l'arrêt de bus", 'the bus stop', 'm'),
  gas_station: thing('gas_station', 'la station-service', 'the petrol station', 'f'),
  car_park: thing('car_park', 'le parking', 'the car park', 'm'),
  hospital: thing('hospital', "l'hôpital", 'the hospital', 'm'),
} as const satisfies Record<string, Thing>;

export type PlaceKey = keyof typeof PLACES;

/** Street things a suspect can hide by. */
export const PROPS = {
  tree: thing('tree', "l'arbre", 'the tree', 'm'),
  bench: thing('bench', 'le banc', 'the bench', 'm'),
  red_car: thing('red_car', 'la voiture rouge', 'the red car', 'f'),
  blue_car: thing('blue_car', 'la voiture bleue', 'the blue car', 'f'),
  bin: thing('bin', 'la poubelle', 'the bin', 'f'),
  lamp: thing('lamp', 'le lampadaire', 'the lamp post', 'm'),
  kiosk: thing('kiosk', 'le kiosque', 'the kiosk', 'm'),
  parasol: thing('parasol', 'le parasol', 'the parasol', 'm'),
  phone_box: thing('phone_box', 'la cabine téléphonique', 'the phone box', 'f'),
  fountain: thing('fountain', 'la fontaine', 'the fountain', 'f'),
  stairs: thing('stairs', 'les escaliers du musée', 'the museum steps', 'm'),
} as const satisfies Record<string, Thing>;

export type PropKey = keyof typeof PROPS;

/** The street itself: "au bout de la rue". */
export const STREET_THING = thing('street', 'la rue', 'the street', 'f');

export const THINGS: Record<string, Thing> = { ...PLACES, ...PROPS, street: STREET_THING };

/** A roof belongs to a building: "le toit de la poste", "le toit du musée". */
export function roofOf(t: Thing): { word: string; en: string } {
  return { word: `le toit ${t.de}`, en: `the roof of ${t.en}` };
}
