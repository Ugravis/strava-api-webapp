import type { TargetLocale } from '@kilotrace/shared';

/**
 * The words of the site that DeepL must translate as its texts do (the
 * catalogs of `packages/ui/src/messages`), from French; both forms of a
 * word, a glossary matching words as written. Changing it creates a new
 * glossary at DeepL on the next translation.
 */
export const GLOSSARY: Record<TargetLocale, Record<string, string>> = {
  en: {
    abonné: 'follower',
    abonnés: 'followers',
    abonnements: 'following',
    tuile: 'tile',
    tuiles: 'tiles',
    gare: 'station',
    gares: 'stations',
    'plus grand carré': 'biggest square',
    Kilotrace: 'Kilotrace',
  },
  it: {
    abonné: 'follower',
    abonnés: 'follower',
    abonnements: 'seguiti',
    tuile: 'riquadro',
    tuiles: 'riquadri',
    gare: 'stazione',
    gares: 'stazioni',
    'plus grand carré': 'quadrato più grande',
    Kilotrace: 'Kilotrace',
  },
  es: {
    abonné: 'seguidor',
    abonnés: 'seguidores',
    abonnements: 'seguidos',
    tuile: 'cuadrícula',
    tuiles: 'cuadrículas',
    gare: 'estación',
    gares: 'estaciones',
    'plus grand carré': 'cuadrado más grande',
    Kilotrace: 'Kilotrace',
  },
  de: {
    abonné: 'Follower',
    abonnés: 'Follower',
    abonnements: 'Gefolgte',
    tuile: 'Kachel',
    tuiles: 'Kacheln',
    gare: 'Bahnhof',
    gares: 'Bahnhöfe',
    'plus grand carré': 'größtes Quadrat',
    Kilotrace: 'Kilotrace',
  },
};
