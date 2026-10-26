import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** A saved photo by id; the small copy unless `full`. */
export default function Thumb({ id, full = false, className, alt = '' }: { id: string; full?: boolean; className?: string; alt?: string }) {
  const photo = useLiveQuery(() => db.photos.get(id), [id])
  const url = useMemo(() => (photo ? URL.createObjectURL(full ? photo.blob : photo.thumb) : undefined), [photo, full])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url ? <img className={className} src={url} alt={alt} loading="lazy" /> : <span className={`${className ?? ''} thumb-empty`} />
}
