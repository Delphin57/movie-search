import { fetchMovieDetails } from './api.js';

// Кэш: imdbID -> { ok: boolean, plot?: string }
const cache = new Map();

// Промисы «в полёте» — чтобы 2 карточки с одним imdbID (или повторный монтаж)
// не запускали два одинаковых запроса
const inflight = new Map();

export function fetchPlot(imdbID) {
  if (cache.has(imdbID)) {
    return Promise.resolve(cache.get(imdbID));
  }
  if (inflight.has(imdbID)) {
    return inflight.get(imdbID);
  }

  const promise = (async () => {
    try {
      const data = await fetchMovieDetails(imdbID);
      if (data.Response === 'False') {
        throw new Error(data.Error || 'Не найдено');
      }
      const result = {
        ok: true,
        plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : 'Описание недоступно.',
      };
      cache.set(imdbID, result);
      return result;
    } catch {
      // Кэшируем и ошибку — чтобы при перелистывании не спамить API
      const result = { ok: false };
      cache.set(imdbID, result);
      return result;
    } finally {
      inflight.delete(imdbID);
    }
  })();

  inflight.set(imdbID, promise);
  return promise;
}