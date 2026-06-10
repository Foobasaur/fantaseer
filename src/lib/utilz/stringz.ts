const truncate = (text: string, length: number, ellipsis = '...') =>
  text.length > length ? text.slice(0, length - ellipsis.length) + ellipsis : text;
const eq = (a: string | undefined, b: string, sensitive = false) =>
  sensitive ? a === b : a?.toLowerCase() === b.toLowerCase();
const eqludes = (a: string | undefined, b: string, sensitive = false) =>
  sensitive ? a?.includes(b) : a?.toLowerCase().includes(b.toLowerCase());
const eqstart = (a: string | undefined, b: string, sensitive = false) =>
  sensitive ? a?.startsWith(b) : a?.toLowerCase().startsWith(b.toLowerCase());
export { eq, eqludes, eqstart, truncate };

// Format score: numbers ≥1000 become "1.2k". Optional icon prefix for flair.
export const format = (score: number, max = 1000, fix = 'k') => (score >= max ? (score / max).toFixed(1) + fix : score);

export const emojiFace = [
  ...new Intl.Segmenter().segment(
    '😀😁😂🤣😃😄😎😋😊😉😆😅😍😘🥰😗😙🥲🤔🤩🤗🙂☺️😚🫡🤨😐😑😶🫥😮😥😣😏🙄😶‍🌫️🤐' +
      '😯😪😫🥱😴😒🤤😝😜😛😌😓😔😕🫤🙃🫠😞😖🙁☹️😲🤑😟😤😢😭😦😧😰😮‍💨😬🤯😩😨😱🥵' +
      '😳🤪😵😷😠🥴😵‍💫🤒🤕🤮🤧😇🤠🥹🥺🥸🥳🤥🫨🙂‍↔️🙂‍↕️🤫🤭🤓🧐🫣🫢'
  )
].map(s => s.segment);
