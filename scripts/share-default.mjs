import {writeFile} from 'node:fs/promises';
import {renderShareCard} from '../server/share-card.js';
/* Static OGP image for the game's root URL. Re-run after changing the card design; commit the result. */
const target=new URL('../src/assets/share-default.png',import.meta.url);
await writeFile(target,await renderShareCard({kind:'title'}));
console.log('share-default.png written → '+target.pathname);
