const truncate = (text: string, length: number, ellipsis = '...') =>
  text.length > length ? text.slice(0, length - ellipsis.length) + ellipsis : text;
const eq = (a: string | undefined, b: string, sensitive = false) =>
  sensitive ? a === b : a?.toLowerCase() === b.toLowerCase();
const eqludes = (a: string | undefined, b: string, sensitive = false) =>
  sensitive ? a?.includes(b) : a?.toLowerCase().includes(b.toLowerCase());
const eqstart = (a: string | undefined, b: string, sensitive = false) =>
  sensitive ? a?.startsWith(b) : a?.toLowerCase().startsWith(b.toLowerCase());
export { eq, eqludes, eqstart, truncate };

export const emojiFace = [
  ...new Intl.Segmenter().segment(
    '😀😁😂🤣😃😄😎😋😊😉😆😅😍😘🥰😗😙🥲🤔🤩🤗🙂☺️😚🫡🤨😐😑😶🫥😮😥😣😏🙄😶‍🌫️🤐' +
      '😯😪😫🥱😴😒🤤😝😜😛😌😓😔😕🫤🙃🫠😞😖🙁☹️😲🤑😟😤😢😭😦😧😰😮‍💨😬🤯😩😨😱🥵' +
      '😳🤪😵😷😠🥴😵‍💫🤒🤕🤮🤧😇🤠🥹🥺🥸🥳🤥🫨🙂‍↔️🙂‍↕️🤫🤭🤓🧐🫣🫢'
  )
].map(s => s.segment);
