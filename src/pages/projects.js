import '../main.js';
import { initProjectsGrid } from '../modules/projectsGrid.js';
import { getContent } from '../modules/content.js';

getContent().then(({ site }) => {
  document.title = `Work — ${site.name || '[YOUR_NAME]'}`;
});

initProjectsGrid();
