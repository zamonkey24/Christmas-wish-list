import React, { createContext, useContext } from 'react';

export const BalloonLogo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="bl-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff3b0" />
        <stop offset="0.5" stopColor="#e6b422" />
        <stop offset="1" stopColor="#b8860b" />
      </linearGradient>
    </defs>
    <path d="M32 4C19 4 11 14 11 25c0 12 11 22 21 26 10-4 21-14 21-26C53 14 45 4 32 4z" fill="url(#bl-gold)" />
    <path d="M20 14c3-4 8-6 12-6" stroke="#fffbe6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
    <path d="M28 51l4-4 4 4z" fill="#b8860b" />
    <path d="M32 51c-5 3 5 6 0 9" stroke="#e6b422" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const BloomLogo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="bloom-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a5b4fc" />
        <stop offset="1" stopColor="#5eead4" />
      </linearGradient>
    </defs>
    {[0, 72, 144, 216, 288].map(a => (
      <ellipse key={a} cx="32" cy="18" rx="9" ry="15" fill="url(#bloom-g)" opacity="0.92" transform={`rotate(${a} 32 32)`} />
    ))}
    <circle cx="32" cy="32" r="8" fill="#0f172a" />
    <circle cx="32" cy="32" r="4" fill="#e0e7ff" />
  </svg>
);

export const TreeLogo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 6l-3 8h6z" fill="#fbbf24" />
    <path d="M32 8l12 18H20z" fill="#16a34a" />
    <path d="M32 18l16 22H16z" fill="#15803d" />
    <path d="M32 30l20 22H12z" fill="#166534" />
    <rect x="28" y="52" width="8" height="8" rx="1" fill="#7c2d12" />
    <circle cx="26" cy="38" r="2.5" fill="#dc2626" />
    <circle cx="38" cy="44" r="2.5" fill="#fbbf24" />
    <circle cx="30" cy="22" r="2" fill="#dc2626" />
    <circle cx="22" cy="48" r="2.5" fill="#fbbf24" />
    <circle cx="42" cy="34" r="2" fill="#dc2626" />
  </svg>
);

const logoSvgString = (kind) => {
  if (kind === 'classic') {
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='%238b9cf7'><ellipse cx='32' cy='18' rx='9' ry='15'/><ellipse cx='32' cy='18' rx='9' ry='15' transform='rotate(72 32 32)'/><ellipse cx='32' cy='18' rx='9' ry='15' transform='rotate(144 32 32)'/><ellipse cx='32' cy='18' rx='9' ry='15' transform='rotate(216 32 32)'/><ellipse cx='32' cy='18' rx='9' ry='15' transform='rotate(288 32 32)'/></g><circle cx='32' cy='32' r='8' fill='%230f172a'/><circle cx='32' cy='32' r='4' fill='%23e0e7ff'/></svg>";
  }
  if (kind === 'birthday') {
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23fff3b0'/><stop offset='.5' stop-color='%23e6b422'/><stop offset='1' stop-color='%23b8860b'/></linearGradient></defs><path d='M32 4C19 4 11 14 11 25c0 12 11 22 21 26 10-4 21-14 21-26C53 14 45 4 32 4z' fill='url(%23g)'/><path d='M28 51l4-4 4 4z' fill='%23b8860b'/></svg>";
  }
  return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M32 6l-3 8h6z' fill='%23fbbf24'/><path d='M32 8l12 18H20z' fill='%2316a34a'/><path d='M32 18l16 22H16z' fill='%2315803d'/><path d='M32 30l20 22H12z' fill='%23166534'/><rect x='28' y='52' width='8' height='8' fill='%237c2d12'/></svg>";
};

export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    emoji: '🎁',
    blurb: 'Calm and simple, no holiday theme',
    Logo: BloomLogo,
    favicon: `data:image/svg+xml,${logoSvgString('classic')}`,
    pageTitle: 'GiftBloom | Wishlists made easy',
    headerTitle: (owner) => (owner ? `${owner}'s Wishlist Quiz` : 'My Wishlist Quiz'),
    badge: '✨ Wishlist',
    matcher: 'GIFT MATCH ENGINE',
    bundleTitle: (n) => `Curated ${n}-Item Gift Bundle!`,
    soloTitle: 'Your Top Matched Gift!',
    galleryTitle: (owner) => `${owner ? `${owner}'s` : 'My'} Full Wishlist 🎁`,
    adminTitle: 'Wishlist Admin 🛠️',
    secretGifter: 'Secret Gifter',
    claimerPlaceholder: 'e.g. Aunt Sarah or Cousin Leo',
    messageLabel: 'Optional Note / Message',
    messagePlaceholder: 'e.g. Got this for you!',
    closeDesc: 'Looking for a top wishlist item or the big main gift!',
    bestFitTitle: '🔮 The Perfect Pick (Best overall match)',
    quizEmoji: '✨',
    footer: 'Wishlist Quiz',
    description: 'Take the quiz to find the perfect gift from a personalized wishlist, matched to your budget and vibe.',
    particles: 'none'
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    emoji: '🎄',
    blurb: 'Red & green, snowfall',
    Logo: TreeLogo,
    favicon: `data:image/svg+xml,${logoSvgString('christmas')}`,
    pageTitle: "Santa's Wishlist Matcher | Personalized Christmas Quiz",
    headerTitle: (owner) => (owner ? `${owner}'s Christmas Quiz` : 'My Holiday Wishlist Quiz'),
    badge: '2026 Edition ❄️',
    matcher: "SANTA'S GIFT MATCH ENGINE",
    bundleTitle: (n) => `Curated ${n}-Item Christmas Gift Bundle!`,
    soloTitle: 'Your Top Matched Christmas Gift!',
    galleryTitle: (owner) => `${owner ? `${owner}'s` : 'My'} Full Christmas Wishlist 🎁`,
    adminTitle: "Santa's Workshop & Wishlist Admin 🛠️",
    secretGifter: 'Secret Santa',
    claimerPlaceholder: 'e.g. Aunt Sarah or Cousin Leo 🎅',
    messageLabel: 'Optional Note / Warm Holiday Message',
    messagePlaceholder: 'e.g. Got this for you! Merry Christmas!',
    closeDesc: 'Looking for a top wishlist item or big main Christmas gift!',
    bestFitTitle: "🔮 Santa's Choice (Best overall match)",
    quizEmoji: '🎄',
    footer: 'Personalized Christmas Wishlist Quiz',
    description: 'Take the quiz to find the perfect Christmas gift from my personalized wishlist according to your budget and vibe!',
    particles: 'snow'
  },
  birthday: {
    id: 'birthday',
    name: 'Birthday',
    emoji: '🎂',
    blurb: 'White marble, gold, sparkles',
    Logo: BalloonLogo,
    favicon: `data:image/svg+xml,${logoSvgString('birthday')}`,
    pageTitle: 'Birthday Wishlist Matcher | Personalized Gift Quiz',
    headerTitle: (owner) => (owner ? `${owner}'s Birthday Quiz` : 'My Birthday Wishlist Quiz'),
    badge: '🎂 Birthday Edition',
    matcher: 'BIRTHDAY GIFT MATCH ENGINE',
    bundleTitle: (n) => `Curated ${n}-Item Birthday Gift Bundle!`,
    soloTitle: 'Your Top Matched Birthday Gift!',
    galleryTitle: (owner) => `${owner ? `${owner}'s` : 'My'} Full Birthday Wishlist 🎁`,
    adminTitle: 'Gift Workshop & Wishlist Admin 🛠️',
    secretGifter: 'Secret Gifter',
    claimerPlaceholder: 'e.g. Aunt Sarah or Cousin Leo 🎈',
    messageLabel: 'Optional Note / Warm Birthday Message',
    messagePlaceholder: 'e.g. Got this for you! Happy Birthday!',
    closeDesc: 'Looking for a top wishlist item or the big main birthday gift!',
    bestFitTitle: '🔮 The Perfect Pick (Best overall match)',
    quizEmoji: '🎈',
    footer: 'Personalized Birthday Wishlist Quiz',
    description: 'Take the quiz to find the perfect birthday gift from my personalized wishlist according to your budget and vibe!',
    particles: 'sparkle'
  }
};

export const ThemeContext = createContext(THEMES.classic);
export const useTheme = () => useContext(ThemeContext);
