import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Thumb from '../../components/Thumb'
import { formatShort } from '../../lib/dates'
import { groupByCountry } from '../../lib/records'
import { useMoments } from '../../lib/useRecords'
import { ZoomBar } from './shared'

export default function CountriesView() {
  const groups = groupByCountry(useMoments())
  const { hash } = useLocation()
  const ready = groups.length > 0
  // A highlight in the feed opens this view at its country.
  useEffect(() => {
    if (ready && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash, ready])

  return (
    <div className="page record">
      <ZoomBar />
      <h1>나라별</h1>
      {groups.length === 0 && <p className="muted">기록한 나라가 아직 없어요.</p>}
      {groups.map((c) => (
        <section key={c.country} id={`country-${c.country}`} className="country-block">
          <div className="cb-head">
            <h2>{c.country}</h2>
            <span className="muted">도시 {c.cities.length} · 사진 {c.photoIds.length}</span>
          </div>
          {c.cities.map((city) => (
            <Link key={city.city} to={`/record/day/${city.from}`} className="city-row">
              <span className="city-top">
                <strong>{city.city}</strong>
                <span className="muted">{formatShort(city.from)}{city.to !== city.from ? ` ~ ${formatShort(city.to)}` : ''}{city.places ? ` · ${city.places}곳` : ''}</span>
              </span>
              {city.photoIds.length > 0 && (
                <span className="city-strip">
                  {city.photoIds.slice(0, 8).map((id) => <Thumb key={id} id={id} className="strip-photo" />)}
                </span>
              )}
            </Link>
          ))}
        </section>
      ))}
    </div>
  )
}
