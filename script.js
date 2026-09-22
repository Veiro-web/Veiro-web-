// Ustaw aktualny rok w stopce
document.getElementById('year').textContent = new Date().getFullYear();

// Obsługa formularza kontaktowego (wyceny) — wysyłka przez Formspree
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const phoneInput = document.getElementById('phone');
const emailInput = document.getElementById('email');

// Blokada wpisywania czegokolwiek innego niż cyfry w polu telefonu (na bieżąco)
phoneInput.addEventListener('input', function () {
  phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');
});

// Prosty, ale skuteczny wzorzec walidacji adresu e-mail
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Numer telefonu: tylko cyfry, 9–15 znaków
const PHONE_PATTERN = /^[0-9]{9,15}$/;

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = form.name.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const service = form.service.value;

  if (!name || !phone || !email || !service) {
    status.textContent = 'Proszę wypełnić wszystkie wymagane pola (*).';
    status.className = 'form-status error';
    return;
  }

  if (!PHONE_PATTERN.test(phone)) {
    status.textContent = 'Podaj poprawny numer telefonu (tylko cyfry, 9–15 znaków).';
    status.className = 'form-status error';
    phoneInput.focus();
    return;
  }

  if (!EMAIL_PATTERN.test(email)) {
    status.textContent = 'Podaj poprawny adres e-mail, np. jan.kowalski@example.com.';
    status.className = 'form-status error';
    emailInput.focus();
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
