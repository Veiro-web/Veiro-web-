// Ustaw aktualny rok w stopce
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Elementy formularza =====
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const phoneInput = document.getElementById('phone');
const phoneWarning = document.getElementById('phone-warning');

// Rodzaj sprzątania (akordeon — rozwija tylko opis, wybór jednej opcji)
const cleaningAccordion = document.getElementById('cleaning-accordion');
const cleaningItems = Array.from(cleaningAccordion.querySelectorAll('.accordion-item'));
const cleaningTypeInput = document.getElementById('cleaning-type-input');
const cleaningTypeWarning = document.getElementById('cleaning-type-warning');

// Rodzaj obiektu (kafelki, wybór jednej opcji) — widoczne od razu
const objectTypeTiles = document.getElementById('object-type-tiles');
const objectTypeButtons = Array.from(objectTypeTiles.querySelectorAll('.tile-option'));
const objectTypeInput = document.getElementById('object-type-input');
const objectTypeWarning = document.getElementById('object-type-warning');

// Metraż — tylko dodatnie liczby całkowite
const areaInput = document.getElementById('area');

// Polski numer telefonu: dokładnie 9 cyfr (bez +48)
const PHONE_PATTERN = /^[0-9]{9}$/;

// ===== Telefon: tylko cyfry, dynamiczny komunikat ostrzegawczy =====
phoneInput.addEventListener('input', function () {
  phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '').slice(0, 9);
  updatePhoneWarning();
});

phoneInput.addEventListener('blur', updatePhoneWarning);

function updatePhoneWarning() {
  const value = phoneInput.value.trim();
  const showWarning = value.length > 0 && !PHONE_PATTERN.test(value);
  phoneWarning.hidden = !showWarning;
  phoneInput.classList.toggle('invalid', showWarning);
}

// ===== Metraż: tylko dodatnie liczby całkowite =====
areaInput.addEventListener('input', function () {
  areaInput.value = areaInput.value.replace(/[^0-9]/g, '');
});

// ===== Akordeon: Rodzaj sprzątania — klik rozwija/zwija TYLKO opis danej karty =====
cleaningItems.forEach((item) => {
  const header = item.querySelector('.accordion-header');
  const panel = item.querySelector('.accordion-panel');

  header.addEventListener('click', function () {
    const isActive = item.classList.contains('active');

    // Zwiń wszystkie karty i wyczyść zaznaczenie — wybór jest jeden na raz
    cleaningItems.forEach((other) => {
      other.classList.remove('active');
      other.querySelector('.accordion-panel').style.maxHeight = '0px';
    });

    if (isActive) {
      // Kliknięcie ponownie zwija kartę i usuwa wybór
      cleaningTypeInput.value = '';
      return;
    }

    // Rozwiń opis wybranej karty i zaznacz ją jako wybrany wariant
    item.classList.add('active');
    panel.style.maxHeight = panel.querySelector('.accordion-panel-inner').scrollHeight + 'px';
    cleaningTypeInput.value = item.dataset.value;
    cleaningTypeWarning.hidden = true;
  });
});

// ===== Kafelki: Rodzaj obiektu (jedna opcja) =====
objectTypeButtons.forEach((btn) => {
  btn.addEventListener('click', function () {
    const isActive = btn.classList.contains('active');
    objectTypeButtons.forEach((b) => b.classList.remove('active'));

    if (isActive) {
      objectTypeInput.value = '';
      return;
    }

    btn.classList.add('active');
    objectTypeInput.value = btn.dataset.value;
    objectTypeWarning.hidden = true;
  });
});

// Po zmianie rozmiaru okna — przelicz wysokość rozwiniętej karty opisu (żeby nie "obcinało" treści)
window.addEventListener('resize', function () {
  cleaningItems.forEach((item) => {
    if (item.classList.contains('active')) {
      const panel = item.querySelector('.accordion-panel');
      panel.style.maxHeight = panel.querySelector('.accordion-panel-inner').scrollHeight + 'px';
    }
  });
});

// ===== Wysyłka formularza (Formspree) =====
form.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = form.name.value.trim();
  const phone = phoneInput.value.trim();
  const cleaningType = cleaningTypeInput.value;
  const objectType = objectTypeInput.value;

  if (!name || !phone) {
    status.textContent = 'Proszę wypełnić wszystkie wymagane pola (*).';
    status.className = 'form-status error';
    return;
  }

  if (!cleaningType) {
    cleaningTypeWarning.hidden = false;
    status.textContent = 'Wybierz rodzaj sprzątania.';
    status.className = 'form-status error';
    cleaningAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  cleaningTypeWarning.hidden = true;

  if (!objectType) {
    objectTypeWarning.hidden = false;
    status.textContent = 'Wybierz rodzaj obiektu.';
    status.className = 'form-status error';
    objectTypeTiles.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  objectTypeWarning.hidden = true;

  updatePhoneWarning();
  if (!PHONE_PATTERN.test(phone)) {
    status.textContent = 'Podaj poprawny numer telefonu (9 cyfr, bez +48).';
    status.className = 'form-status error';
    phoneInput.focus();
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
        phoneWarning.hidden = true;
        cleaningTypeWarning.hidden = true;
        objectTypeWarning.hidden = true;
        cleaningItems.forEach((item) => {
          item.classList.remove('active');
          item.querySelector('.accordion-panel').style.maxHeight = '0px';
        });
        objectTypeButtons.forEach((b) => b.classList.remove('active'));
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

// ===== Umiarkowane animacje pojawiania się sekcji przy przewijaniu =====
// Lekki IntersectionObserver — bez zewnętrznych bibliotek, nie obciąża strony.
(function () {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  // Jeśli użytkownik woli ograniczony ruch lub brak wsparcia observera — pokaż od razu.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));
})();
