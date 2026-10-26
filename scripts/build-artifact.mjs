// Turns dist-artifact/ into one HTML body for a Claude artifact: CSS and JS inlined,
// no <html>/<head>/<body> (the artifact host adds its own skeleton).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const dir = 'dist-artifact/assets'
const files = readdirSync(dir)
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')

const page = `<title>World Travel</title>
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`
writeFileSync('dist-artifact/world-travel.html', page)
console.log(`dist-artifact/world-travel.html ${(page.length / 1024).toFixed(0)} KB`)
