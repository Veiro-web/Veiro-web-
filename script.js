// Ustaw aktualny rok w stopce
document.getElementById('year').textContent = new Date().getFullYear();

// Obsługa formularza kontaktowego (wyceny) — wysyłka przez Formspree
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

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Wysyłanie...';

  const formData = new FormData(form);

  fetch(form.action, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json'
    }
  })
    .then((response) => {
      if (response.ok) {
        status.textContent = 'Dziękujemy! Twoje zapytanie zostało wysłane. Skontaktujemy się wkrótce.';
        status.className = 'form-status success';
        form.reset();
      } else {
        return response.json().then((data) => {
          throw new Error(
            data && data.errors
              ? data.errors.map((err) => err.message).join(', ')
              : 'Wystąpił błąd podczas wysyłania.'
          );
        });
      }
    })
    .catch(() => {
      status.textContent = 'Ups! Coś poszło nie tak. Spróbuj ponownie lub zadzwoń: 516 377 014.';
      status.className = 'form-status error';
    })
    .finally(() => {
      submitButton.disabled = false;
      submitButton.textContent = 'Wyślij zapytanie';
    });
});
