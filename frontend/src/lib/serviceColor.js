// Service tile colours (UI-UX.md "Service tiles"). The API stores no colour and no logo:
// the frontend picks one from the name, so the same name always gets the same colour.

const KNOWN_SERVICES = [
  ['netflix', '#e50914'],
  ['spotify', '#1db954'],
  ['youtube', '#ff0033'],
  ['prime video', '#00a8e1'],
  ['icloud', '#3478f6'],
  ['google one', '#1a73e8'],
  ['notion', '#7048e8'],
  ['cult.fit', '#0f9d74'],
  ['proton', '#6d4aff'],
  ['peloton', '#1f2937'],
];

const PALETTE = ['#2f54eb', '#7048e8', '#0f9d74', '#d9480f', '#c2255c', '#1098ad', '#5c940d', '#495057'];

export function serviceColor(name) {
  const key = name.trim().toLowerCase();
  const known = KNOWN_SERVICES.find(([word]) => key.includes(word));
  if (known) {
    return known[1];
  }
  let sum = 0;
  for (let i = 0; i < key.length; i++) {
    sum += key.charCodeAt(i);
  }
  return PALETTE[sum % PALETTE.length];
}

export function serviceInitial(name) {
  return name.trim().charAt(0).toUpperCase();
}
