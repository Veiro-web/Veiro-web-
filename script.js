// Ustaw aktualny rok w stopce
document.getElementById('year').textContent = new Date().getFullYear();

// Obsługa formularza kontaktowego (wyceny)
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const service = form.service.value;

  if (!name || !phone || !service) {
    status.textContent = 'Proszę wypełnić wszystkie wymagane pola (*).';
    status.className = 'form-status error';
    return;
  }

  // Miejsce na integrację z backendem / API wysyłki e-mail (np. EmailJS, Formspree, własny endpoint).
  // Na razie tylko potwierdzenie wizualne dla użytkownika:
  status.textContent = 'Dziękujemy! Twoje zapytanie zostało zarejestrowane. Skontaktujemy się wkrótce.';
  status.className = 'form-status success';
  form.reset();
});
