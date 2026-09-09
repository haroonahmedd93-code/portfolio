import '../main.js';
import { renderAbout } from '../modules/about.js';
import { getContent } from '../modules/content.js';

getContent().then(({ site }) => {
  document.title = `About — ${site.name || '[YOUR_NAME]'}`;
});

renderAbout();
