export default function ComingSoon({ title, step }: { title: string; step: string }) {
  return (
    <div className="page">
      <header className="page-head"><h1>{title}</h1></header>
      <div className="card">
        <p>{title}은 {step}에 만들 예정이에요.</p>
      </div>
    </div>
  )
}
