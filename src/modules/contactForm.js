// Optional protected contact form handler. Ships pointed at a placeholder endpoint —
// wire it to a Vercel-compatible form backend (e.g. Formspree, Getform, or your own
// serverless function with a honeypot + rate limit) by setting the form's `action`
// or by posting JSON to /api/contact if you add that function yourself.
export function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = form.querySelector('.form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: bots fill every field, humans never see this one.
    if (form.elements.company && form.elements.company.value) return;

    const endpoint = form.dataset.endpoint;
    if (!endpoint || endpoint.includes('[')) {
      status.textContent = 'Contact form endpoint not configured yet — email directly for now.';
      status.dataset.state = 'error';
      return;
    }

    status.textContent = 'Sending…';
    status.dataset.state = '';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error('Request failed');
      status.textContent = 'Thanks — message sent.';
      status.dataset.state = 'success';
      form.reset();
    } catch (err) {
      status.textContent = 'Something went wrong — please email directly instead.';
      status.dataset.state = 'error';
    }
  });
}
