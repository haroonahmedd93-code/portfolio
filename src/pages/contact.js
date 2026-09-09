import '../main.js';
import { initContactForm } from '../modules/contactForm.js';
import { getContent } from '../modules/content.js';

getContent().then(({ site }) => {
  document.title = `Contact — ${site.name || '[YOUR_NAME]'}`;
  const emailEl = document.getElementById('contact-email');
  const socialEl = document.getElementById('contact-social');
  if (emailEl) {
    emailEl.href = `mailto:${site.email || '[YOUR_EMAIL]'}`;
    emailEl.textContent = site.email || '[YOUR_EMAIL]';
  }
  if (socialEl) {
    socialEl.innerHTML = (site.social || [])
      .map((s) => `<a class="btn" href="${s.url}">${s.label}</a>`)
      .join(' ');
  }
});

initContactForm();
