import { useCallback, useEffect, useRef, useState } from 'react';
import MovieCard from './MovieCard.jsx';
import { searchMovies } from './api.js';

const HISTORY_KEY = 'movie-search-history';
const HISTORY_LIMIT = 5;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState(null);

  // Пагинация
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [activeQuery, setActiveQuery] = useState('');

  // Клиентский фильтр по году
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  // История
  const [history, setHistory] = useState(loadHistory);

  const abortRef = useRef(null);
  const lastSearchedRef = useRef('');

  const fetchMovies = useCallback(async (rawQuery, pageNum) => {
    const search = rawQuery.trim();
    if (!search) {
      setMovies([]);
      setStatus('idle');
      setError(null);
      setTotalResults(0);
      setPage(1);
      setActiveQuery('');
      return;
    }

    lastSearchedRef.current = search;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setError(null);

    try {
      const data = await searchMovies(search, pageNum, controller.signal);

      if (data.Response === 'False') {
        setMovies([]);
        setTotalResults(0);
        setStatus('error');
        setError(
          data.Error === 'Movie not found!' ? 'Ничего не найдено' : data.Error
        );
        setPage(1);
        return;
      }

      setMovies(data.Search || []);
      setTotalResults(Number(data.totalResults) || 0);
      setStatus('success');
      setPage(pageNum);
      setActiveQuery(search);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMovies([]);
      setTotalResults(0);
      setStatus('error');
      setError(err.message || 'Не удалось выполнить запрос');
      setPage(1);
    }
  }, []);

  // Автопоиск с debounce (шаг 7)
  useEffect(() => {
    const search = query.trim();

    if (search.length <= 2) {
      abortRef.current?.abort();
      setMovies([]);
      setStatus('idle');
      setError(null);
      setTotalResults(0);
      setPage(1);
      return;
    }

    if (search === lastSearchedRef.current) return;

    const timer = setTimeout(() => {
      fetchMovies(search, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, fetchMovies]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // --- История ---
  const addToHistory = (term) => {
    setHistory((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(
        0,
        HISTORY_LIMIT
      );
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* приватный режим — игнорируем */
      }
      return next;
    });
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* noop */
    }
    setHistory([]);
  };

  // --- Обработчики ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    const search = query.trim();
    if (!search) return;

    addToHistory(search);

    // уже показан этот же результат с 1-й страницы — не дублируем
    if (
      search === lastSearchedRef.current &&
      status === 'success' &&
      page === 1
    ) {
      return;
    }
    fetchMovies(search, 1);
  };

  const handleHistoryClick = (term) => {
    if (status === 'loading') return;
    setQuery(term);
    addToHistory(term);
    if (term === lastSearchedRef.current && status === 'success' && page === 1) {
      return;
    }
    fetchMovies(term, 1);
  };

  // --- Пагинация ---
  const totalPages = Math.max(1, Math.ceil(totalResults / 10));
  const goToPage = (p) => {
    if (status === 'loading') return;
    if (p < 1 || p > totalPages) return;
    fetchMovies(activeQuery, p);
  };

  // --- Фильтр по году (клиентский) ---
  const yearNumFrom = parseInt(yearFrom, 10);
  const yearNumTo = parseInt(yearTo, 10);
  const hasYearFilter = !Number.isNaN(yearNumFrom) || !Number.isNaN(yearNumTo);

  const filteredMovies = movies.filter((m) => {
    const match = String(m.Year).match(/\d{4}/); // "2010" или "2010–2015"
    if (!match) return true;
    const year = Number(match[0]);
    if (!Number.isNaN(yearNumFrom) && year < yearNumFrom) return false;
    if (!Number.isNaN(yearNumTo) && year > yearNumTo) return false;
    return true;
  });

  const isLoading = status === 'loading';

  return (
    <main>
      <h1>Поиск фильмов</h1>
      <p className="subtitle">React + OMDb API</p>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите название фильма…"
          aria-label="Название фильма"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Ищем…' : 'Найти'}
        </button>
      </form>

      {history.length > 0 && (
        <section className="history">
          <span className="history__label">История:</span>
          <div className="history__list">
            {history.map((term) => (
              <button
                key={term}
                type="button"
                className="history__chip"
                onClick={() => handleHistoryClick(term)}
                disabled={isLoading}
                title={`Искать «${term}»`}
              >
                {term}
              </button>
            ))}
            <button
              type="button"
              className="history__clear"
              onClick={clearHistory}
            >
              Очистить
            </button>
          </div>
        </section>
      )}

      {status === 'idle' && (
        <p className="status">Введите название фильма и нажмите «Найти».</p>
      )}

      {status === 'loading' && (
        <p className="status">
          <span className="spinner" aria-hidden="true" />
          Загрузка…
        </p>
      )}

      {status === 'error' && (
        <div className="status error">
          <p>
            {error === 'Ничего не найдено'
              ? 'Ничего не найдено по вашему запросу.'
              : `Ошибка: ${error}`}
          </p>
        </div>
      )}

      {status === 'success' && (
        <>
          <div className="filters">
            <span className="filters__label">Год:</span>
            <input
              type="number"
              placeholder="от"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              min="1900"
              max="2100"
            />
            <span>—</span>
            <input
              type="number"
              placeholder="до"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              min="1900"
              max="2100"
            />
            {hasYearFilter && (
              <button
                type="button"
                className="filters__reset"
                onClick={() => {
                  setYearFrom('');
                  setYearTo('');
                }}
              >
                Сбросить
              </button>
            )}
            <span className="filters__hint">
              На странице: {filteredMovies.length} из {movies.length}
            </span>
          </div>

          {movies.length === 0 ? (
            <p className="status">Ничего не найдено по вашему запросу.</p>
          ) : filteredMovies.length === 0 ? (
            <p className="status">По фильтру года ничего не найдено.</p>
          ) : (
            <div className="movie-list">
              {filteredMovies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} />
              ))}
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              ← Назад
            </button>
            <span>
              Страница {page} из {totalPages} · всего {totalResults}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Вперёд →
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default App;