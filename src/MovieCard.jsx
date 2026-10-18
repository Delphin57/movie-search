import { useEffect, useState } from 'react';
import { fetchPlot } from './plotCache.js';

const PLACEHOLDER =
  'https://placehold.co/300x450/1c1f27/9aa0ae?text=No+Poster';

function MovieCard({ movie }) {
  const [plot, setPlot] = useState('');
  const [plotStatus, setPlotStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    let cancelled = false;
    setPlotStatus('loading');

    fetchPlot(movie.imdbID).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setPlot(res.plot);
        setPlotStatus('success');
      } else {
        setPlotStatus('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [movie.imdbID]);

  const posterUrl =
    movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : PLACEHOLDER;

  return (
    <article className="movie-card">
      <img
        src={posterUrl}
        alt={movie.Title}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = PLACEHOLDER;
        }}
      />
      <div className="movie-card__body">
        <h3>{movie.Title}</h3>
        <p>
          <strong>Год:</strong> {movie.Year}
        </p>
        <p className="movie-card__type">{movie.Type}</p>

        <div className="movie-card__plot">
          {plotStatus === 'loading' && (
            <span className="plot-skeleton">
              <span className="spinner spinner--sm" aria-hidden="true" />
              Загрузка описания…
            </span>
          )}
          {plotStatus === 'error' && (
            <span className="plot-error">Не удалось загрузить описание</span>
          )}
          {plotStatus === 'success' && <span>{plot}</span>}
        </div>
      </div>
    </article>
  );
}

export default MovieCard;