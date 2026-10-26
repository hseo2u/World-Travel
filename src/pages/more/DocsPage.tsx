import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../../db'
import type { DocFile } from '../../types'

const PRESETS = ['여권 정보면', '여행자보험 증서', '황열병 예방접종 증명서', '국제운전면허증', '증명사진', '항공권 e-티켓']

export default function DocsPage() {
  const navigate = useNavigate()
  const docs = useLiveQuery(() => db.docs.orderBy('id').toArray().then((d) => d.sort((a, b) => a.created.localeCompare(b.created))), [], [] as DocFile[])
  const [title, setTitle] = useState('')
  const [open, setOpen] = useState<DocFile | undefined>()
  const [confirmId, setConfirmId] = useState<string | undefined>()
  const urls = useMemo(() => new Map(docs.map((d) => [d.id, URL.createObjectURL(d.blob)])), [docs])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])

  async function add(files: FileList | null) {
    if (!files?.length) return
    const base = title.trim()
    for (const [i, f] of [...files].entries()) {
      const name = base ? (files.length > 1 ? `${base} ${i + 1}` : base) : f.name.replace(/\.[^.]+$/, '')
      await db.docs.add({ id: newId(), title: name, blob: f, mime: f.type, created: new Date().toISOString() })
    }
    setTitle('')
  }

  async function remove(id: string) {
    if (confirmId !== id) return setConfirmId(id)
    await db.docs.delete(id)
    setConfirmId(undefined)
    setOpen(undefined)
  }

  if (open) {
    const url = urls.get(open.id)
    return (
      <div className="page">
        <header className="page-head">
          <button className="icon-btn" onClick={() => setOpen(undefined)} aria-label="뒤로">←</button>
          <h1>{open.title}</h1>
        </header>
        {open.mime.startsWith('image/') ? (
          <img className="doc-full" src={url} alt={open.title} />
        ) : (
          <a className="btn primary wide" href={url} target="_blank" rel="noreferrer">파일 열기</a>
        )}
        <button className="btn danger" onClick={() => remove(open.id)}>{confirmId === open.id ? '정말 삭제' : '삭제'}</button>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/more')} aria-label="뒤로">←</button>
        <h1>중요 서류</h1>
      </header>
      <p className="muted">사진이나 PDF를 이 폰 안에만 저장해요. 인터넷 없이도 바로 꺼내 보여줄 수 있어요. 폰을 잃어버릴 때를 대비해 클라우드나 메일에도 한 부 남겨두세요.</p>

      <section className="card">
        <h2>추가하기</h2>
        <div className="chips">
          {PRESETS.filter((p) => !docs.some((d) => d.title === p)).map((p) => (
            <button key={p} className={title === p ? 'chip active' : 'chip'} onClick={() => setTitle(p)}>{p}</button>
          ))}
        </div>
        <div className="inline-form">
          <input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="이름 (예: 여권 정보면)" />
          <label className="btn">
            사진·파일 고르기
            <input id="d-file" type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
          </label>
        </div>
      </section>

      {docs.length === 0 ? (
        <p className="muted">아직 저장한 서류가 없어요.</p>
      ) : (
        <ul className="doc-grid">
          {docs.map((d) => (
            <li key={d.id}>
              <button className="doc-tile" onClick={() => setOpen(d)}>
                {d.mime.startsWith('image/') ? <img src={urls.get(d.id)} alt="" /> : <span className="doc-pdf">PDF</span>}
                <span className="doc-name">{d.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
