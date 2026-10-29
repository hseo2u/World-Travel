import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db'
import { BACKUP_KV, daysSince, makeBackup, readBackup, restoreBackup, summarize, type BackupFile } from '../../lib/backup'
import { todayIso } from '../../lib/dates'
import { useKv } from '../../lib/useKv'

const LABEL: Record<string, string> = { days: '계획한 날', stops: '세부 장소', bookings: '예약', expenses: '지출', moments: '기록', photos: '사진', docs: '서류', packItems: '준비물' }

export default function BackupPage() {
  const navigate = useNavigate()
  const last = useKv(BACKUP_KV).at
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState<BackupFile | undefined>()
  const [confirm, setConfirm] = useState(false)
  const ago = daysSince(last)

  async function save() {
    setBusy(true)
    setMsg('')
    try {
      const blob = await makeBackup()
      const file = new File([blob], `세계여행-백업-${todayIso()}.json`, { type: 'application/json' })
      // On iPhone the share sheet is the way to put it in Files or iCloud Drive.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '세계여행 백업' })
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      await db.kv.put({ key: BACKUP_KV, value: { at: new Date().toISOString() } })
      setMsg(`백업 파일을 만들었어요 (${mb(blob.size)}). 파일 앱의 iCloud Drive에 저장해 두세요.`)
    } catch (e) {
      // Closing the share sheet without saving is not an error worth showing.
      if ((e as Error).name !== 'AbortError') setMsg('백업 파일을 만들지 못했어요. 다시 해보세요.')
    } finally {
      setBusy(false)
    }
  }

  async function pick(files: FileList | null) {
    setMsg('')
    setConfirm(false)
    if (!files?.[0]) return
    try {
      setPending(await readBackup(files[0]))
    } catch (e) {
      setPending(undefined)
      setMsg((e as Error).message)
    }
  }

  async function restore() {
    if (!pending) return
    if (!confirm) return setConfirm(true)
    setBusy(true)
    try {
      await restoreBackup(pending)
      setPending(undefined)
      setMsg('백업에서 되살렸어요.')
    } catch {
      setMsg('되살리지 못했어요. 지금 데이터는 그대로예요.')
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  const summary = pending && summarize(pending)
  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/more')} aria-label="뒤로">←</button>
        <h1>백업</h1>
      </header>
      <p className="muted">계획, 예약, 가계부, 기록, 사진, 서류가 전부 이 아이폰 안에만 있어요. 홈 화면 아이콘을 지우거나 폰을 잃어버리면 같이 사라지니, 일주일에 한 번은 백업 파일을 만들어 iCloud Drive에 넣어두세요.</p>

      <section className="card">
        <h2>백업 파일 만들기</h2>
        <p className="muted">{ago === undefined ? '아직 백업한 적이 없어요.' : ago === 0 ? '오늘 백업했어요.' : `마지막 백업: ${ago}일 전`}</p>
        <button className="btn primary wide" disabled={busy} onClick={save}>{busy && !pending ? '만드는 중…' : '백업 파일 만들기'}</button>
      </section>

      <section className="card">
        <h2>백업에서 되살리기</h2>
        <p className="muted">새 폰이나 앱을 다시 설치했을 때 써요. 지금 이 폰에 있는 내용은 백업 내용으로 바뀌어요.</p>
        <label className="btn wide">
          백업 파일 고르기
          <input id="bk-file" type="file" accept="application/json,.json" hidden onChange={(e) => { void pick(e.target.files); e.target.value = '' }} />
        </label>
        {summary && (
          <div className="backup-sum">
            <div><strong>{new Date(summary.created).toLocaleString('ko-KR')}</strong>에 만든 백업</div>
            <div className="muted">{Object.entries(LABEL).filter(([k]) => summary.counts[k]).map(([k, l]) => `${l} ${summary.counts[k]}`).join(' · ') || '빈 백업이에요'}</div>
            <button className="btn danger wide" disabled={busy} onClick={restore}>{confirm ? '정말 바꾸기 (되돌릴 수 없어요)' : '이 백업으로 바꾸기'}</button>
          </div>
        )}
      </section>
      {msg && <p className="notice-line" role="status">{msg}</p>}
    </div>
  )
}

function mb(bytes: number) {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))}KB` : `${(bytes / 1_000_000).toFixed(1)}MB`
}
