const STORAGE_KEY = 'pkg-segambut-bookings';

export function fetchBookings() {
  return new Promise((resolve) => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    resolve(saved ? JSON.parse(saved) : []);
  });
}

export function saveBookings(bookings) {
  return new Promise((resolve) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    resolve(bookings);
  });
}
