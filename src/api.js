// Единая точка входа для OMDb-запросов
const API_KEY = import.meta.env.VITE_OMDB_API_KEY || 'ВАШ_КЛЮЧ';
const API_URL = 'https://www.omdbapi.com/';

// Поиск с пагинацией (?s=)
export async function searchMovies(query, page = 1, signal) {
  const url =
    `${API_URL}?s=${encodeURIComponent(query)}` +
    `&page=${page}&apikey=${API_KEY}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Ошибка сети: ${res.status} ${res.statusText}`);
  return res.json();
}

// Детали одного фильма (?i=) — нужен для Plot
export async function fetchMovieDetails(imdbID) {
  const url =
    `${API_URL}?i=${encodeURIComponent(imdbID)}` +
    `&plot=short&apikey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ошибка сети: ${res.status}`);
  return res.json();
}