import { Link } from 'react-router-dom'

const ITEMS = [
  { to: '/pack', icon: '🎒', title: '준비물', sub: '챙길 것과 여행 중 필요해진 것' },
  { to: '/more/entry', icon: '🛂', title: '나라별 입국 정보', sub: '비자, 머물 수 있는 기간, 쉥겐 90일 계산' },
  { to: '/more/docs', icon: '📄', title: '중요 서류', sub: '여권·보험·예방접종 사본을 폰에 보관' },
  { to: '/more/safety', icon: '🆘', title: '안전카드', sub: '긴급전화, 영사콜센터, 보험사, 비상연락처' },
  { to: '/map', icon: '🗺️', title: '동선 지도', sub: '대륙·나라·도시별로 보는 내 동선' },
  { to: '/map?view=places', icon: '📌', title: '내 장소 지도', sub: '계획에 넣은 곳과 다녀온 곳을 한 지도에' },
  { to: '/ai', icon: '✨', title: 'AI에게 물어보기', sub: '계획을 담은 질문을 만들어 복사' },
  { to: '/more/backup', icon: '💾', title: '백업', sub: '계획·가계부·사진을 파일로 저장하고 되살리기' },
  { to: '/settings', icon: '⚙️', title: '여행 설정', sub: '이름, 출국일, 예산, 솔로·동행' },
]

export default function MorePage() {
  return (
    <div className="page">
      <header className="page-head"><h1>기타</h1></header>
      <ul className="more-list">
        {ITEMS.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className="more-row">
              <span className="more-icon">{it.icon}</span>
              <span className="more-body">
                <strong>{it.title}</strong>
                <span className="muted">{it.sub}</span>
              </span>
              <span className="muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted">모두 폰 안에 저장돼서 인터넷 없이도 열려요.</p>
    </div>
  )
}
