/**
 * script.js — Свадебный сайт Дамир & Аружан
 * Разделы:
 *  1. AOS.js инициализация
 *  2. Музыкальный плеер
 *  3. Таймер обратного отсчёта
 *  4. Генерация календаря
 *  5. RSVP-форма (fetch → Google Apps Script)
 */

/* ============================================================
   КОНСТАНТА — URL Google Apps Script для RSVP
   Замените на свой URL после публикации скрипта
   ============================================================ */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbys9rXv0uHfwJm_pOXi6H3mUVD4Z7rCRAF_K9hLI-arq0CnRkKxGYS4Zvl4vbpY5Km5/exec';

/* ============================================================
   1. ИНИЦИАЛИЗАЦИЯ AOS.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  AOS.init({
    duration: 700,      // длительность анимации, мс
    once: true,         // анимировать только при первом появлении
    offset: 60,         // отступ от края вьюпорта (px) до старта
    easing: 'ease-out-quad',
  });

  /* Запускаем все модули после загрузки DOM */
  initMusicPlayer();
  initCountdown();
  initCalendar();
  initRsvpForm();
});


/* ============================================================
   2. МУЗЫКАЛЬНЫЙ ПЛЕЕР
   ============================================================ */
function initMusicPlayer() {
  const btn = document.getElementById('music-btn');
  const audio = document.getElementById('bg-audio');
  const icon = document.getElementById('music-icon');

  if (!btn || !audio) return;

  let playing = false;

  btn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      icon.textContent = '♪';
      btn.setAttribute('aria-label', 'Включить музыку');
    } else {
      audio.play().catch(() => {
        /* Автовоспроизведение заблокировано браузером — молча игнорируем */
      });
      icon.textContent = '▐▐';
      btn.setAttribute('aria-label', 'Пауза');
    }
    playing = !playing;
  });
}


/* ============================================================
   3. ТАЙМЕР ОБРАТНОГО ОТСЧЁТА
   Дата свадьбы: 12 июля 2026, 15:00 (UTC+6 — Усть-Каменогорск)
   ============================================================ */
function initCountdown() {
  // Дата свадьбы (месяц 0-индексированный: 6 = июль)
  const WEDDING_DATE = new Date('2026-07-12T15:00:00+06:00');

  const elDays = document.getElementById('timer-days');
  const elHours = document.getElementById('timer-hours');
  const elMinutes = document.getElementById('timer-minutes');
  const elSeconds = document.getElementById('timer-seconds');

  if (!elDays) return; // секция не найдена — выходим

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateTimer() {
    const now = new Date();
    const diff = WEDDING_DATE - now;

    if (diff <= 0) {
      // Свадьба уже наступила!
      elDays.textContent = '00';
      elHours.textContent = '00';
      elMinutes.textContent = '00';
      elSeconds.textContent = '00';
      clearInterval(timerInterval);
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    elDays.textContent = pad(days);
    elHours.textContent = pad(hours);
    elMinutes.textContent = pad(minutes);
    elSeconds.textContent = pad(seconds);
  }

  updateTimer(); // первый вызов сразу
  const timerInterval = setInterval(updateTimer, 1000);
}


/* ============================================================
   4. ГЕНЕРАЦИЯ СЕТКИ КАЛЕНДАРЯ
   Месяц: Июль 2026, выделить 12-е число
   ============================================================ */
function initCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  const YEAR = 2026;
  const MONTH = 6;       // июль (0-индексированный)
  const WEDDING_DAY = 12;

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  /* Заголовки дней недели */
  dayNames.forEach(name => {
    const span = document.createElement('span');
    span.className = 'calendar__day-name';
    span.textContent = name;
    grid.appendChild(span);
  });

  /* Первый день месяца (JS воскресенье=0, нам нужен ISO Пн=0) */
  const firstDay = new Date(YEAR, MONTH, 1).getDay();
  const offset = (firstDay === 0) ? 6 : firstDay - 1; // Монд. первый
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();

  /* Пустые ячейки до начала */
  for (let i = 0; i < offset; i++) {
    const empty = document.createElement('span');
    empty.className = 'calendar__day calendar__day--empty';
    grid.appendChild(empty);
  }

  /* Дни месяца */
  for (let day = 1; day <= daysInMonth; day++) {
    const span = document.createElement('span');
    const dayOfWeek = new Date(YEAR, MONTH, day).getDay();

    let cls = 'calendar__day';
    if (dayOfWeek === 0 || dayOfWeek === 6) cls += ' calendar__day--weekend';
    if (day === WEDDING_DAY) cls += ' calendar__day--today';

    span.className = cls;
    span.textContent = day;
    grid.appendChild(span);
  }
}


/* ============================================================
   5. RSVP-ФОРМА — отправка через fetch на Google Apps Script
   ============================================================ */
function initRsvpForm() {
  const form = document.getElementById('rsvp-form');
  const btn = document.getElementById('rsvp-submit');

  if (!form || !btn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // отменяем перезагрузку страницы

    /* Базовая валидация */
    const name = form.elements['name'].value.trim();
    const attendance = form.elements['attendance'].value;

    if (!name) {
      alert('Пожалуйста, введите ваше имя.');
      form.elements['name'].focus();
      return;
    }
    if (!attendance) {
      alert('Пожалуйста, укажите, сможете ли вы прийти.');
      return;
    }

    /* Блокируем кнопку на время отправки */
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    /* Собираем данные через FormData */
    const data = new FormData(form);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: data,
      });

      if (response.ok) {
        alert('🎉 Спасибо! Ваш ответ получен. Ждём вас!');
        form.reset();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Ошибка отправки формы:', err);
      alert('Произошла ошибка. Пожалуйста, попробуйте ещё раз или свяжитесь с нами напрямую.');
    } finally {
      /* Разблокируем кнопку */
      btn.disabled = false;
      btn.textContent = 'Отправить';
    }
  });
}
