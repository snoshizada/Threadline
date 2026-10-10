let STORE = 'threadline-data'
let THEME_KEY = 'threadline-theme'
let COLORS = ['sage', 'cobalt', 'plum', 'rust', 'rose', 'ochre', 'teal']
let DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
let DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
let MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
let TICKS = [['1h', 1], ['6h', 6], ['1d', 24], ['3d', 72], ['1w', 168], ['2w', 336], ['1mo', 720], ['2mo', 1440], ['3mo', 2160]]
let H0 = 0.5
let SCALE = 116
let MAXH = 2208
let TOP = 26

let now = new Date()
let busy = {}
let view = 'threads'
let saveFn = null
let deleteFn = null
let undoFn = null
let drag = null
let dragEnded = 0
let toastTimer = null
let data = load()


function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function ymd(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function parse(s) {
  let p = s.split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}

function addDays(d, n) {
  let x = new Date(d.getTime())
  x.setDate(x.getDate() + n)
  return x
}

function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function mondayOf(d) {
  let x = dayStart(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}

function daysBetween(a, b) {
  return Math.round((dayStart(b) - dayStart(a)) / 86400000)
}

function moment(ds, time) {
  let d = parse(ds)
  if (time) {
    let t = time.split(':')
    d.setHours(+t[0], +t[1])
  } else {
    d.setHours(12, 0)
  }
  return d
}

function isOver(ds, time) {
  if (time) return moment(ds, time) < now
  return addDays(parse(ds), 1) <= now
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  })
}

function hy(h) {
  return SCALE * Math.log(1 + Math.max(h, 0) / H0)
}

function yh(y) {
  return H0 * (Math.exp(y / SCALE) - 1)
}

function th(id) {
  return data.threads.find(function (t) { return t.id == id })
}

function findItem(id) {
  return data.items.find(function (x) { return x.id == id })
}


function load() {
  try {
    let raw = localStorage.getItem(STORE)
    if (raw) {
      let d = JSON.parse(raw)
      if (d && Array.isArray(d.threads) && Array.isArray(d.items)) return fixUp(d)
    }
  } catch (e) {}
  return demo()
}

function fixUp(d) {
  d.threads.forEach(function (t) {
    t.days = t.days || []
    t.breaks = t.breaks || []
    t.occ = t.occ || {}
    t.repeat = t.repeat || 'none'
    t.start = t.start || ymd(new Date())
    t.color = COLORS.indexOf(t.color) > -1 ? t.color : 'sage'
  })
  d.items.forEach(function (it) {
    it.date = it.date || ''
    it.time = it.time || ''
    it.kind = it.kind || 'event'
  })
  return d
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(data))
  } catch (e) {}
}

function demo() {
  let mon = mondayOf(new Date())
  let d = function (n) { return ymd(addDays(mon, n)) }

  let therapy = { id: 't1', name: 'Therapy', color: 'sage', repeat: 'weekly', days: [3], time: '16:00', place: '', start: d(2 - 91), count: true, offset: 0, breaks: [], occ: {} }
  let uni = { id: 't2', name: 'Uni · Psychology Y2', color: 'cobalt', repeat: 'weekly', days: [1, 3, 5], time: '13:00', place: '', start: d(-35), count: false, offset: 0, breaks: [{ label: 'Reading week', from: d(21), to: d(25) }], occ: {} }
  let dnd = { id: 't3', name: 'D&D · Hollow Crown', color: 'plum', repeat: 'fortnightly', days: [6], time: '18:00', place: "Jo's", start: d(-2), count: true, offset: 21, breaks: [], occ: {} }
  let errands = { id: 't4', name: 'Errands', color: 'rust', repeat: 'none', days: [], time: '', place: '', start: d(0), count: false, offset: 0, breaks: [], occ: {} }

  let items = [
    { id: 'i1', thread: 't4', title: 'Post the parcel', kind: 'todo', date: d(-5), time: '', note: '', hours: 0, mins: 10, done: true },
    { id: 'i2', thread: 't4', title: 'Pharmacy pickup', kind: 'todo', date: d(-1), time: '', note: '', hours: 0, mins: 15, done: true },
    { id: 'i3', thread: 't4', title: 'Library book due', kind: 'due', date: d(7), time: '', note: 'on your way home', hours: 0, mins: 0, done: false },
    { id: 'i4', thread: 't2', title: 'Essay: Memory & emotion', kind: 'due', date: d(18), time: '', note: '', hours: 8, mins: 0, done: false },
    { id: 'i5', thread: 't4', title: 'Bus pass renewal', kind: 'due', date: d(25), time: '', note: '', hours: 0, mins: 0, done: false },
    { id: 'i6', thread: 't2', title: 'Cognitive Psych exam', kind: 'event', date: d(65), time: '09:30', note: 'Main Hall', hours: 0, mins: 0, done: false },
    { id: 'i7', thread: 't4', title: 'Fix glasses', kind: 'todo', date: '', time: '', note: '', hours: 0, mins: 20, done: false },
    { id: 'i8', thread: 't4', title: 'Buy a dice set', kind: 'todo', date: '', time: '', note: '', hours: 0, mins: 0, done: false },
    { id: 'i9', thread: 't1', title: 'Book GP for referral letter', kind: 'todo', date: '', time: '', note: '', hours: 0, mins: 10, done: false }
  ]

  let a = nextOcc(therapy)
  if (a) therapy.occ[a.date] = { note: '3 things to bring' }
  let b = nextOcc(uni)
  if (b) uni.occ[b.date] = { title: 'Stats tutorial', note: 'Room 4.02' }
  let c = nextOcc(dnd)
  if (c) dnd.occ[c.date] = { note: 'level up to 6 first' }

  return { version: 1, threads: [therapy, uni, dnd, errands], items: items }
}


function inBreak(t, ds) {
  for (let b of t.breaks) {
    if (b.from && b.to && ds >= b.from && ds <= b.to) return true
  }
  return false
}

function occurrences(t, until) {
  let list = []
  if (t.repeat == 'none' || !t.days.length) return list
  let d = parse(t.start)
  let end = dayStart(until)
  let anchor = mondayOf(d)
  let n = t.offset || 0
  while (d <= end) {
    if (t.days.indexOf(d.getDay()) > -1) {
      let ok = true
      if (t.repeat == 'fortnightly') {
        let w = Math.round(daysBetween(anchor, mondayOf(d)) / 7)
        if (w % 2 != 0) ok = false
      }
      let key = ymd(d)
      if (ok && inBreak(t, key)) ok = false
      if (ok) {
        let o = t.occ[key] || {}
        if (!o.skip) n++
        list.push({ date: key, time: t.time, n: o.skip ? 0 : n, skip: !!o.skip, title: o.title || '', note: o.note || '' })
      }
    }
    d = addDays(d, 1)
  }
  return list
}

function nextOcc(t) {
  let list = occurrences(t, addDays(now, 200))
  for (let o of list) {
    if (!o.skip && !isOver(o.date, o.time)) return o
  }
  return null
}

function doneCount(t) {
  let c = t.offset || 0
  for (let o of occurrences(t, now)) {
    if (!o.skip && isOver(o.date, o.time)) c = o.n
  }
  return c
}

function occTitle(t, o) {
  if (o.title) return o.title
  if (o.skip) return t.name + ' (skipped)'
  if (t.count) return t.name + ' · session ' + o.n
  return t.name
}

function itemState(it) {
  if (it.done) return 'done'
  if (it.kind == 'event' && isOver(it.date, it.time)) return 'done'
  if (isOver(it.date, it.time)) return 'late'
  return 'coming'
}

function dayLabel(ds) {
  let d = parse(ds)
  let dd = daysBetween(now, d)
  if (dd == 0) return 'Today'
  if (dd == 1) return 'Tomorrow'
  if (dd == -1) return 'Yesterday'
  let s = DAY[d.getDay()] + ' ' + d.getDate()
  if (dd > 13 || dd < -6) s += ' ' + MON[d.getMonth()]
  if (d.getFullYear() != now.getFullYear()) s += ' ' + d.getFullYear()
  return s
}

function when(ds, time) {
  let lab = dayLabel(ds)
  if (!time) return lab
  if (lab == 'Today' || lab == 'Tomorrow' || lab == 'Yesterday') return lab + ' ' + time
  return lab + ', ' + time
}

function shortDate(ds) {
  let d = parse(ds)
  return d.getDate() + ' ' + MON[d.getMonth()]
}

function rangeText(a, b) {
  let x = parse(a)
  let y = parse(b)
  if (a == b) return shortDate(a)
  if (x.getMonth() == y.getMonth()) return x.getDate() + '–' + y.getDate() + ' ' + MON[y.getMonth()]
  return shortDate(a) + ' – ' + shortDate(b)
}

function computeBusy() {
  busy = {}
  let until = addDays(now, 120)
  for (let t of data.threads) {
    if (!t.time || t.time < '17:00') continue
    for (let o of occurrences(t, until)) {
      if (!o.skip) busy[o.date] = true
    }
  }
  for (let it of data.items) {
    if (it.date && it.kind == 'event' && it.time >= '17:00' && !it.done) busy[it.date] = true
  }
}

function freeEvenings(ds) {
  let end = parse(ds)
  let d = dayStart(now)
  let c = 0
  if (now.getHours() >= 19) d = addDays(d, 1)
  while (d < end) {
    if (!busy[ymd(d)]) c++
    d = addDays(d, 1)
  }
  return c
}

function nextLabel(t) {
  let list = []
  let o = nextOcc(t)
  if (o) list.push({ m: moment(o.date, o.time), date: o.date, time: o.time, n: t.count ? o.n : 0 })
  for (let it of data.items) {
    if (it.thread != t.id || !it.date || it.done || isOver(it.date, it.time)) continue
    list.push({ m: moment(it.date, it.time), date: it.date, time: it.time, n: 0 })
  }
  list.sort(function (a, b) { return a.m - b.m })
  if (!list.length) {
    let u = undatedFor(t.id).length
    return u ? u + ' UNDATED' : 'ALL CLEAR'
  }
  let c = list[0]
  let d = parse(c.date)
  let dd = daysBetween(now, d)
  if (dd == 0) return 'TODAY' + (c.time ? ' ' + c.time : '')
  if (dd == 1) return 'TOMORROW' + (c.time ? ' ' + c.time : '')
  let s = DAY[d.getDay()].toUpperCase() + ' ' + d.getDate()
  if (c.n) return s + ' · S' + c.n
  if (dd < 14) return s + ' · IN ' + dd + 'D'
  return s + ' · IN ' + Math.round(dd / 7) + 'W'
}

function summary(t) {
  let bits = []
  if (t.repeat != 'none' && t.days.length) {
    let days = t.days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7) })
    let s = ''
    if (days.length == 1) {
      s = (t.repeat == 'fortnightly' ? 'Fortnightly, ' : 'Weekly, ') + DAYS[days[0]]
    } else {
      s = (t.repeat == 'fortnightly' ? 'Fortnightly · ' : '') + days.map(function (x) { return DAY[x] }).join(', ')
    }
    if (t.time) s += ' ' + t.time
    if (t.place) s += ' at ' + t.place
    bits.push(s)
  }
  if (t.count) {
    let o = nextOcc(t)
    if (o) bits.push('session ' + o.n + ' next')
    let dc = doneCount(t)
    if (dc) bits.push(dc + ' so far')
  }
  let today = ymd(now)
  for (let b of t.breaks) {
    if (b.from && b.to && b.to >= today) bits.push((b.label || 'Break').toLowerCase() + ' ' + rangeText(b.from, b.to))
  }
  let dues = data.items.filter(function (it) {
    return it.thread == t.id && it.kind == 'due' && it.date && !it.done && !isOver(it.date, it.time)
  })
  dues.sort(function (a, b) { return a.date < b.date ? -1 : 1 })
  if (dues.length) bits.push(dues[0].title + (/\bdue$/i.test(dues[0].title) ? ' ' : ' due ') + shortDate(dues[0].date))
  if (!bits.length) return 'Nothing dated yet. Add an event or a deadline.'
  let out = bits.join(' · ')
  return out.charAt(0).toUpperCase() + out.slice(1)
}

function undatedFor(tid) {
  return data.items.filter(function (it) { return it.thread == tid && !it.date && !it.done })
}

function chipHtml(it, dragable) {
  let t = th(it.thread)
  let col = t ? t.color : 'rust'
  let extra = it.mins ? ' <small>· ' + it.mins + ' min</small>' : ''
  return '<button class="chip" style="--c:var(--c-' + col + ')" data-act="item" data-id="' + it.id + '"' + (dragable ? ' data-drag="' + it.id + '"' : '') + '>' + esc(it.title) + extra + '</button>'
}


function render() {
  now = new Date()
  computeBusy()
  renderTop()
  renderThreads()
  renderHorizon()
  layoutHorizon()
}

function renderTop() {
  document.getElementById('today').textContent = DAY[now.getDay()].toUpperCase() + ' ' + now.getDate() + ' ' + MON[now.getMonth()].toUpperCase()

  let h = now.getHours()
  let g = 'Good evening'
  if (h < 5) g = 'Up late'
  else if (h < 12) g = 'Good morning'
  else if (h < 18) g = 'Good afternoon'

  let in7 = addDays(now, 7)
  let count = 0
  let dues = 0
  for (let t of data.threads) {
    for (let o of occurrences(t, in7)) {
      if (!o.skip && !isOver(o.date, o.time) && moment(o.date, o.time) < in7) count++
    }
  }
  for (let it of data.items) {
    if (!it.date || it.done || isOver(it.date, it.time)) continue
    if (moment(it.date, it.time) < in7) {
      count++
      if (it.kind == 'due') dues++
    }
  }
  let undated = data.items.filter(function (it) { return !it.date && !it.done }).length

  let parts = []
  if (count == 0) parts.push('A clear week ahead')
  else parts.push(count + (count == 1 ? ' thing' : ' things') + ' in the next 7 days')
  if (dues) parts.push(dues + (dues == 1 ? ' deadline' : ' deadlines'))
  if (undated) parts.push(undated + ' waiting for a date')

  document.getElementById('hello').innerHTML = '<h2>' + g + '.</h2><p>' + parts.join(' · ') + '</p>'
}

function renderThreads() {
  let el = document.getElementById('threads')
  let start = addDays(mondayOf(now), -7)
  let end = addDays(start, 42)
  let span = end - start
  let p = function (m) { return Math.round((m - start) / span * 10000) / 100 }

  let weeks = ''
  for (let i = 0; i < 6; i++) {
    let d = addDays(start, i * 7)
    let txt = (i == 0 || d.getDate() <= 7) ? d.getDate() + ' ' + MON[d.getMonth()].toUpperCase() : d.getDate()
    weeks += '<span style="left:' + (i / 6 * 100) + '%">' + txt + '</span>'
  }

  let html = '<div class="panel-head"><h1>Threads</h1><p>Six weeks, by what you\'re keeping up with</p></div>'
  html += '<div class="weeks mono"><div class="weeks-in">' + weeks + '</div></div>'

  if (!data.threads.length) {
    html += '<div class="empty"><b>No threads yet</b>A thread is anything you keep showing up for: a class, a club, therapy, the gym.<br><button class="btn primary" data-act="new-thread">Make your first thread</button></div>'
  }

  for (let t of data.threads) {
    let marks = ''
    for (let b of t.breaks) {
      if (!b.from || !b.to) continue
      let a = parse(b.from)
      let z = addDays(parse(b.to), 1)
      if (z <= start || a >= end) continue
      let l = Math.max(0, p(a))
      let r = Math.min(100, p(z))
      marks += '<span class="brk" style="left:' + l + '%;width:' + (r - l) + '%" title="' + esc(b.label || 'Break') + '"></span>'
    }

    let occs = occurrences(t, addDays(end, -1)).filter(function (o) { return parse(o.date) >= start })
    for (let o of occs) {
      let cls = o.skip ? 'skip' : (isOver(o.date, o.time) ? 'done' : 'coming')
      let tip = occTitle(t, o) + ' · ' + when(o.date, o.time)
      marks += '<button class="mk ' + cls + '" style="left:' + p(moment(o.date, o.time)) + '%" data-act="occ" data-t="' + t.id + '" data-d="' + o.date + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '"></button>'
    }

    for (let it of data.items) {
      if (it.thread != t.id || !it.date) continue
      let m = moment(it.date, it.time)
      if (m < start || m >= end) continue
      let cls = itemState(it)
      let tip = it.title + ' · ' + when(it.date, it.time)
      marks += '<button class="mk ' + (it.kind == 'due' ? 'due ' : '') + cls + '" style="left:' + p(m) + '%" data-act="item" data-id="' + it.id + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '"></button>'
    }

    marks += '<span class="nowline" style="left:' + p(now) + '%"></span>'

    let chips = undatedFor(t.id).map(function (it) { return chipHtml(it, false) }).join('')

    html += '<article class="thread" style="--c:var(--c-' + t.color + ')">'
    html += '<div class="thread-top"><button class="thread-name" data-act="thread" data-id="' + t.id + '"><span class="cdot"></span><span class="nm">' + esc(t.name) + '</span></button>'
    html += '<span class="next mono">' + esc(nextLabel(t)) + '</span></div>'
    html += '<div class="track">' + marks + '</div>'
    html += '<p class="summary">' + esc(summary(t)) + '</p>'
    if (chips) html += '<div class="chips">' + chips + '</div>'
    html += '</article>'
  }

  html += '<div class="legend"><span><i></i>done</span><span><i class="o"></i>coming</span><span><i class="d"></i>due</span><span><i class="b"></i>break</span></div>'
  el.innerHTML = html
}

function renderHorizon() {
  let el = document.getElementById('horizon')
  let entries = []
  let late = []

  for (let t of data.threads) {
    let o = nextOcc(t)
    if (o) entries.push({ t: t, o: o, m: moment(o.date, o.time) })
  }
  for (let it of data.items) {
    if (!it.date || it.done) continue
    let t = th(it.thread)
    if (!t) continue
    if (isOver(it.date, it.time)) {
      if (it.kind != 'event') late.push(it)
      continue
    }
    entries.push({ t: t, it: it, m: moment(it.date, it.time) })
  }
  entries.sort(function (a, b) { return a.m - b.m })

  let html = '<div class="panel-head"><h1>Horizon</h1><p>Near things get room. Far things get a line.</p></div>'

  if (late.length) {
    html += '<div class="late-box"><p>Slipped past · ' + late.length + '</p><div class="chips">'
    html += late.map(function (it) { return chipHtml(it, true) }).join('')
    html += '</div></div>'
  }

  html += '<div class="hz" id="hz">'
  for (let tk of TICKS) {
    html += '<div class="hz-tick" style="top:' + (TOP + hy(tk[1])) + 'px"><span class="mono">' + tk[0] + '</span></div>'
  }
  html += '<div class="hz-line"></div><div class="hz-now"></div>'
  html += '<div class="hz-nowlabel mono">NOW · ' + DAY[now.getDay()].toUpperCase() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</div>'
  html += '<svg class="hz-links" id="hz-links"></svg>'

  let later = []
  for (let e of entries) {
    let h = (e.m - now) / 3600000
    if (h > MAXH) {
      later.push(e)
      continue
    }
    let col = e.t.color
    let isDue = e.it && e.it.kind == 'due'
    html += '<span class="hz-dot' + (isDue ? ' due' : '') + '" style="--c:var(--c-' + col + ')"></span>'
    html += '<div class="hz-item" data-y="' + (TOP + hy(h)) + '" data-c="' + col + '" style="--c:var(--c-' + col + ')">'
    if (e.o) {
      let sub = when(e.o.date, e.o.time)
      if (e.o.note) sub += ' · ' + e.o.note
      else if (e.t.place) sub += ' · at ' + e.t.place
      html += '<button class="hz-main" data-act="occ" data-t="' + e.t.id + '" data-d="' + e.o.date + '"><span class="hz-title">' + esc(occTitle(e.t, e.o)) + '</span><span class="hz-sub">' + esc(sub) + '</span></button>'
    } else {
      let it = e.it
      let s = itemSub(it)
      html += '<button class="hz-main" data-act="item" data-id="' + it.id + '"><span class="hz-title">' + esc(it.title) + '</span><span class="hz-sub' + (s.warn ? ' warn' : '') + '">' + esc(s.text) + '</span></button>'
      if (it.kind != 'event') {
        html += '<button class="hz-check" data-act="check" data-id="' + it.id + '" aria-label="Mark done" title="Mark done"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>'
      }
    }
    html += '</div>'
  }
  html += '<div class="hz-drop" id="hz-drop" hidden><span></span></div>'
  html += '</div>'

  if (later.length) {
    html += '<div class="further"><h3>Further out</h3>'
    for (let e of later) {
      if (e.o) {
        html += '<button class="further-row" style="--c:var(--c-' + e.t.color + ')" data-act="occ" data-t="' + e.t.id + '" data-d="' + e.o.date + '"><span class="cdot"></span><b>' + esc(occTitle(e.t, e.o)) + '</b><span>' + esc(when(e.o.date, e.o.time)) + '</span></button>'
      } else {
        html += '<button class="further-row" style="--c:var(--c-' + e.t.color + ')" data-act="item" data-id="' + e.it.id + '"><span class="cdot"></span><b>' + esc(e.it.title) + '</b><span>' + esc(when(e.it.date, e.it.time)) + '</span></button>'
      }
    }
    html += '</div>'
  }

  let undated = data.items.filter(function (it) { return !it.date && !it.done && th(it.thread) })
  html += '<div class="undated"><h3>No date yet</h3>'
  if (undated.length) {
    html += '<p>Drag onto the line to give it one.</p><div class="chips">' + undated.map(function (it) { return chipHtml(it, true) }).join('') + '</div>'
  } else {
    html += '<p class="none">Nothing floating around. Nice.</p>'
  }
  html += '</div>'

  el.innerHTML = html
}

function itemSub(it) {
  let lab = dayLabel(it.date)
  let text = ''
  let warn = false
  if (it.kind == 'due') {
    let l = lab == 'Today' || lab == 'Tomorrow' ? lab.toLowerCase() : lab
    text = 'Due ' + l
    if (it.time) text += ' at ' + it.time
    if (it.hours) {
      let free = freeEvenings(it.date)
      text += ' · needs about ' + it.hours + 'h · ' + free + ' free evening' + (free == 1 ? '' : 's') + ' before it'
      warn = true
    }
  } else {
    text = when(it.date, it.time)
    if (it.kind == 'todo' && it.mins) text += ' · ' + it.mins + ' min'
    let dd = daysBetween(now, parse(it.date))
    if (it.kind == 'event' && dd >= 14) text += ' · ' + Math.round(dd / 7) + ' weeks'
  }
  if (it.note) text += ' · ' + it.note
  return { text: text, warn: warn }
}

function layoutHorizon() {
  let box = document.getElementById('hz')
  if (!box || !box.offsetParent) return
  let items = box.querySelectorAll('.hz-item')
  let dots = box.querySelectorAll('.hz-dot')
  let lx = box.querySelector('.hz-line').offsetLeft + 1
  let lastDot = TOP + 4
  let lastBottom = TOP + 14
  let svg = ''

  for (let i = 0; i < items.length; i++) {
    let el = items[i]
    let ideal = +el.dataset.y
    let dy = Math.max(ideal, lastDot + 17)
    let ly = Math.max(dy - 14, lastBottom + 12)
    dots[i].style.top = dy + 'px'
    el.style.top = ly + 'px'
    lastDot = dy
    lastBottom = ly + el.offsetHeight
    let tx = el.offsetLeft
    let ty = ly + 13
    svg += '<path d="M' + (lx + 8) + ' ' + dy + ' H' + (lx + 14) + ' L' + (tx - 6) + ' ' + ty + '" style="stroke:var(--c-' + el.dataset.c + ')"/>'
  }

  let h = Math.max(TOP + hy(MAXH) + 30, lastBottom + 30)
  box.style.height = h + 'px'
  let links = document.getElementById('hz-links')
  links.setAttribute('width', box.clientWidth)
  links.setAttribute('height', h)
  links.innerHTML = svg
}


function setView(v) {
  view = v
  document.body.dataset.view = v
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.classList.toggle('on', b.dataset.v == v)
  })
  layoutHorizon()
  window.scrollTo(0, 0)
}

function closeMenus() {
  document.getElementById('new-menu').hidden = true
  document.getElementById('settings-menu').hidden = true
}

function toggleMenu(id) {
  let m = document.getElementById(id)
  let was = m.hidden
  closeMenus()
  m.hidden = !was
}

function toast(msg, undo) {
  let el = document.getElementById('toast')
  undoFn = undo || null
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button data-act="undo">Undo</button>' : '')
  el.hidden = false
  el.classList.remove('show')
  void el.offsetWidth
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(function () {
    el.classList.remove('show')
    toastTimer = setTimeout(function () { el.hidden = true }, 250)
  }, 4500)
}

function openSheet(title, body, onSave, opts) {
  opts = opts || {}
  let form = document.getElementById('sheet-form')
  let foot = ''
  if (opts.del) foot += '<button type="button" class="btn danger" data-act="delete">Delete</button>'
  if (opts.extra) foot += opts.extra
  form.innerHTML = '<div class="sheet-head"><h2>' + esc(title) + '</h2><button type="button" class="icon-btn" data-act="close" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
    + '<div class="sheet-body">' + body + '</div>'
    + '<div class="sheet-foot"><p class="err" id="sheet-err" hidden></p>' + foot + '<span class="grow"></span><button type="button" class="btn ghost" data-act="close">Cancel</button><button type="submit" class="btn primary">Save</button></div>'
  form.dataset.kind = opts.kind || ''
  form.dataset.rep = opts.rep || ''
  form.dataset.count = opts.count ? '1' : ''
  saveFn = onSave
  deleteFn = opts.del || null
  closeMenus()
  document.getElementById('sheet').hidden = false
  form.scrollTop = 0
  let first = form.querySelector('input[type=text]')
  if (first && window.innerWidth > 640) setTimeout(function () { first.focus() }, 50)
}

function closeSheet() {
  document.getElementById('sheet').hidden = true
  saveFn = null
  deleteFn = null
}

function nextColor() {
  for (let c of COLORS) {
    if (!data.threads.some(function (t) { return t.color == c })) return c
  }
  return COLORS[data.threads.length % COLORS.length]
}

function openThreadForm(id) {
  let t = id ? th(id) : null
  let isNew = !t
  if (!t) t = { id: '', name: '', color: nextColor(), repeat: 'weekly', days: [now.getDay()], time: '', place: '', start: ymd(now), count: false, offset: 0, breaks: [], occ: {} }
  let b = t.breaks[0] || { label: '', from: '', to: '' }

  let sw = COLORS.map(function (c) {
    return '<label class="sw" style="--c:var(--c-' + c + ')" title="' + c + '"><input type="radio" name="color" value="' + c + '"' + (t.color == c ? ' checked' : '') + '><span></span></label>'
  }).join('')

  let order = [1, 2, 3, 4, 5, 6, 0]
  let letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  let days = order.map(function (d, i) {
    return '<label class="day" title="' + DAYS[d] + '"><input type="checkbox" name="days" value="' + d + '"' + (t.days.indexOf(d) > -1 ? ' checked' : '') + '><span>' + letters[i] + '</span></label>'
  }).join('')

  let body = ''
  body += '<label class="f"><span>Name</span><input type="text" name="name" maxlength="60" placeholder="Therapy, Book club, Uni…" value="' + esc(t.name) + '"></label>'
  body += '<div class="f"><span class="flabel">Colour</span><div class="swatches">' + sw + '</div></div>'
  body += '<label class="f"><span>Repeats</span><select name="repeat">'
  body += '<option value="weekly"' + (t.repeat == 'weekly' ? ' selected' : '') + '>Every week</option>'
  body += '<option value="fortnightly"' + (t.repeat == 'fortnightly' ? ' selected' : '') + '>Every other week</option>'
  body += '<option value="none"' + (t.repeat == 'none' ? ' selected' : '') + '>Doesn\'t repeat</option>'
  body += '</select></label>'
  body += '<div class="only-rep">'
  body += '<div class="f"><span class="flabel">On</span><div class="days">' + days + '</div></div>'
  body += '<div class="row"><label class="f"><span>Time</span><input type="time" name="time" value="' + esc(t.time) + '"></label>'
  body += '<label class="f"><span>Starting</span><input type="date" name="start" value="' + esc(t.start) + '"></label></div>'
  body += '<label class="f"><span>Where</span><input type="text" name="place" maxlength="60" placeholder="Optional" value="' + esc(t.place) + '"></label>'
  body += '<label class="check"><input type="checkbox" name="count"' + (t.count ? ' checked' : '') + '> Number the sessions</label>'
  body += '<label class="f only-count"><span>Sessions already done before the start date</span><input type="number" name="offset" min="0" step="1" value="' + (t.offset || 0) + '"></label>'
  body += '<div class="box"><span class="flabel">A break, like a reading week or a holiday</span>'
  body += '<label class="f"><span>Label</span><input type="text" name="blabel" maxlength="40" placeholder="Reading week" value="' + esc(b.label) + '"></label>'
  body += '<div class="row"><label class="f"><span>From</span><input type="date" name="bfrom" value="' + esc(b.from) + '"></label>'
  body += '<label class="f"><span>To</span><input type="date" name="bto" value="' + esc(b.to) + '"></label></div></div>'
  body += '</div>'

  openSheet(isNew ? 'New thread' : 'Edit thread', body, function (fd) {
    let name = (fd.get('name') || '').trim()
    if (!name) return 'Give the thread a name'
    let rep = fd.get('repeat')
    let ds = fd.getAll('days').map(Number)
    if (rep != 'none' && !ds.length) return 'Pick at least one day'
    t.name = name
    t.color = fd.get('color') || t.color
    t.repeat = rep
    t.days = rep == 'none' ? [] : ds
    t.time = rep == 'none' ? '' : (fd.get('time') || '')
    t.start = fd.get('start') || t.start || ymd(now)
    t.place = (fd.get('place') || '').trim()
    t.count = rep != 'none' && !!fd.get('count')
    t.offset = Math.max(0, parseInt(fd.get('offset')) || 0)
    let bl = (fd.get('blabel') || '').trim()
    let bf = fd.get('bfrom') || ''
    let bt = fd.get('bto') || ''
    if (bf && !bt) bt = bf
    if (bt && !bf) bf = bt
    if (bf > bt) {
      let x = bf
      bf = bt
      bt = x
    }
    t.breaks = bf ? [{ label: bl || 'Break', from: bf, to: bt }] : []
    if (isNew) {
      t.id = uid()
      data.threads.push(t)
      toast('Thread added')
    }
  }, {
    rep: t.repeat,
    count: t.count,
    del: isNew ? null : function () {
      if (!confirm('Delete "' + t.name + '" and everything in it?')) return false
      data.threads = data.threads.filter(function (x) { return x.id != t.id })
      data.items = data.items.filter(function (x) { return x.thread != t.id })
      toast('Thread deleted')
    }
  })

  let form = document.getElementById('sheet-form')
  form.querySelector('[name=repeat]').onchange = function () { form.dataset.rep = this.value }
  form.querySelector('[name=count]').onchange = function () { form.dataset.count = this.checked ? '1' : '' }
}

function openItemForm(id, kind) {
  if (!data.threads.length) {
    toast('Make a thread first')
    openThreadForm()
    return
  }
  let it = id ? findItem(id) : null
  let isNew = !it
  if (!it) {
    kind = kind || 'event'
    it = { id: '', thread: data.threads[0].id, title: '', kind: kind, date: kind == 'todo' ? '' : ymd(addDays(now, 1)), time: '', note: '', hours: 0, mins: 0, done: false }
  }

  let opts = data.threads.map(function (t) {
    return '<option value="' + t.id + '"' + (t.id == it.thread ? ' selected' : '') + '>' + esc(t.name) + '</option>'
  }).join('')
  let kinds = [['event', 'Event'], ['due', 'Deadline'], ['todo', 'To-do']].map(function (k) {
    return '<label class="pill"><input type="radio" name="kind" value="' + k[0] + '"' + (it.kind == k[0] ? ' checked' : '') + '><span>' + k[1] + '</span></label>'
  }).join('')

  let body = ''
  body += '<label class="f"><span>Title</span><input type="text" name="title" maxlength="80" placeholder="What is it?" value="' + esc(it.title) + '"></label>'
  body += '<div class="f"><span class="flabel">Type</span><div class="pills">' + kinds + '</div></div>'
  body += '<label class="f"><span>Thread</span><select name="thread">' + opts + '</select></label>'
  body += '<div class="row"><label class="f"><span>Date</span><input type="date" name="date" value="' + esc(it.date) + '"></label>'
  body += '<label class="f"><span>Time</span><input type="time" name="time" value="' + esc(it.time) + '"></label></div>'
  body += '<p class="hint only-todo">Leave the date empty to keep it under “No date yet”.</p>'
  body += '<label class="f only-due"><span>Hours of work it needs</span><input type="number" name="hours" min="0" step="0.5" placeholder="Optional" value="' + (it.hours || '') + '"></label>'
  body += '<label class="f only-todo"><span>Minutes it takes</span><input type="number" name="mins" min="0" step="5" placeholder="Optional" value="' + (it.mins || '') + '"></label>'
  body += '<label class="f"><span>Note</span><input type="text" name="note" maxlength="120" placeholder="Room, what to bring, who\'s coming…" value="' + esc(it.note) + '"></label>'
  if (!isNew) body += '<label class="check"><input type="checkbox" name="done"' + (it.done ? ' checked' : '') + '> Done</label>'

  let titles = { event: 'New event', due: 'New deadline', todo: 'New to-do' }
  openSheet(isNew ? titles[it.kind] : 'Edit', body, function (fd) {
    let title = (fd.get('title') || '').trim()
    if (!title) return 'Give it a title'
    let k = fd.get('kind') || 'event'
    let date = fd.get('date') || ''
    if (k != 'todo' && !date) return (k == 'due' ? 'Deadlines' : 'Events') + ' need a date'
    it.title = title
    it.kind = k
    it.thread = fd.get('thread')
    it.date = date
    it.time = date ? (fd.get('time') || '') : ''
    it.note = (fd.get('note') || '').trim()
    it.hours = k == 'due' ? (parseFloat(fd.get('hours')) || 0) : 0
    it.mins = k == 'todo' ? (parseInt(fd.get('mins')) || 0) : 0
    it.done = !!fd.get('done')
    if (isNew) {
      it.id = uid()
      data.items.push(it)
      toast('Added to ' + th(it.thread).name)
    }
  }, {
    kind: it.kind,
    del: isNew ? null : function () {
      let copy = data.items.slice()
      data.items = data.items.filter(function (x) { return x.id != it.id })
      toast('Deleted', function () { data.items = copy })
    }
  })

  let form = document.getElementById('sheet-form')
  form.querySelectorAll('[name=kind]').forEach(function (r) {
    r.onchange = function () {
      form.dataset.kind = this.value
      if (isNew) form.querySelector('h2').textContent = titles[this.value]
    }
  })
}

function openOccForm(tid, ds) {
  let t = th(tid)
  if (!t) return
  let o = occurrences(t, parse(ds)).find(function (x) { return x.date == ds })
  if (!o) return
  let cur = t.occ[ds] || {}
  let plain = t.count && !o.skip ? t.name + ' · session ' + o.n : t.name

  let body = '<p class="sheet-sub">' + esc(when(o.date, o.time) + (t.place ? ' · at ' + t.place : '')) + '</p>'
  body += '<label class="f"><span>Call this one</span><input type="text" name="title" maxlength="80" placeholder="' + esc(plain) + '" value="' + esc(cur.title || '') + '"></label>'
  body += '<label class="f"><span>Note</span><input type="text" name="note" maxlength="120" placeholder="What to bring, what to prep…" value="' + esc(cur.note || '') + '"></label>'
  body += '<label class="check"><input type="checkbox" name="skip"' + (cur.skip ? ' checked' : '') + '> Skip this one' + (t.count ? ' (it won\'t count)' : '') + '</label>'

  openSheet(occTitle(t, o), body, function (fd) {
    let x = {}
    let title = (fd.get('title') || '').trim()
    let note = (fd.get('note') || '').trim()
    if (title) x.title = title
    if (note) x.note = note
    if (fd.get('skip')) x.skip = true
    if (Object.keys(x).length) t.occ[ds] = x
    else delete t.occ[ds]
  }, {
    extra: '<button type="button" class="btn soft" data-act="thread" data-id="' + t.id + '">Edit thread</button>'
  })
}

function markDone(id) {
  let it = findItem(id)
  if (!it) return
  it.done = true
  save()
  render()
  toast('Done: ' + it.title, function () { it.done = false })
}

function dropWhen(h) {
  let d = new Date(now.getTime() + h * 3600000)
  if (h < 20) {
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
    return { date: ymd(d), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) }
  }
  return { date: ymd(d), time: '' }
}

function placeItem(id, h) {
  let it = findItem(id)
  if (!it) return
  let old = { date: it.date, time: it.time }
  let w = dropWhen(h)
  it.date = w.date
  it.time = w.time
  save()
  render()
  toast(it.title + ' → ' + when(w.date, w.time), function () {
    it.date = old.date
    it.time = old.time
  })
}


function themeName() {
  return document.documentElement.dataset.theme || 'auto'
}

function applyTheme(n) {
  if (n == 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = n
  document.getElementById('theme-label').textContent = 'Theme: ' + n.charAt(0).toUpperCase() + n.slice(1)
  try { localStorage.setItem(THEME_KEY, n) } catch (e) {}
}

function cycleTheme() {
  let order = ['auto', 'light', 'dark']
  let n = order[(order.indexOf(themeName()) + 1) % 3]
  applyTheme(n)
}

function exportData() {
  let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  let a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'threadline-backup-' + ymd(now) + '.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(function () { URL.revokeObjectURL(a.href) }, 1000)
  toast('Backup saved')
}

function importData(file) {
  let r = new FileReader()
  r.onload = function () {
    try {
      let d = JSON.parse(r.result)
      if (!d || !Array.isArray(d.threads) || !Array.isArray(d.items)) throw new Error('bad')
      data = fixUp(d)
      save()
      render()
      toast('Backup loaded')
    } catch (e) {
      toast('That file doesn\'t look like a Threadline backup')
    }
  }
  r.readAsText(file)
}


document.addEventListener('click', function (e) {
  if (Date.now() - dragEnded < 350) return
  let b = e.target.closest('[data-act]')
  let a = b ? b.dataset.act : ''
  if (a != 'new' && a != 'menu' && !e.target.closest('.menu')) closeMenus()
  if (!b) return

  if (a == 'view') setView(b.dataset.v)
  else if (a == 'new') toggleMenu('new-menu')
  else if (a == 'menu') toggleMenu('settings-menu')
  else if (a == 'new-thread') { closeMenus(); openThreadForm() }
  else if (a == 'new-event') { closeMenus(); openItemForm(null, 'event') }
  else if (a == 'new-due') { closeMenus(); openItemForm(null, 'due') }
  else if (a == 'new-todo') { closeMenus(); openItemForm(null, 'todo') }
  else if (a == 'thread') openThreadForm(b.dataset.id)
  else if (a == 'item') openItemForm(b.dataset.id)
  else if (a == 'occ') openOccForm(b.dataset.t, b.dataset.d)
  else if (a == 'check') markDone(b.dataset.id)
  else if (a == 'close') closeSheet()
  else if (a == 'delete') {
    if (deleteFn && deleteFn() !== false) {
      closeSheet()
      save()
      render()
    }
  }
  else if (a == 'undo') {
    if (undoFn) {
      undoFn()
      undoFn = null
      save()
      render()
    }
    let el = document.getElementById('toast')
    el.classList.remove('show')
    el.hidden = true
  }
  else if (a == 'theme') cycleTheme()
  else if (a == 'export') { closeMenus(); exportData() }
  else if (a == 'import') { closeMenus(); document.getElementById('import-file').click() }
  else if (a == 'reset') {
    closeMenus()
    if (confirm('Replace everything with the demo data?')) {
      data = demo()
      save()
      render()
      toast('Demo data loaded')
    }
  }
  else if (a == 'empty') {
    closeMenus()
    if (confirm('Clear all threads and items? Export a backup first if you want to keep them.')) {
      data = { version: 1, threads: [], items: [] }
      save()
      render()
      toast('All cleared')
    }
  }
})

document.getElementById('sheet-form').addEventListener('submit', function (e) {
  e.preventDefault()
  if (!saveFn) return
  let res = saveFn(new FormData(this))
  if (typeof res == 'string') {
    let err = document.getElementById('sheet-err')
    err.textContent = res
    err.hidden = false
    return
  }
  closeSheet()
  save()
  render()
})

document.getElementById('import-file').addEventListener('change', function () {
  if (this.files[0]) importData(this.files[0])
  this.value = ''
})

document.addEventListener('keydown', function (e) {
  if (e.key == 'Escape') {
    closeMenus()
    if (!document.getElementById('sheet').hidden) closeSheet()
  }
})

document.addEventListener('pointerdown', function (e) {
  let chip = e.target.closest('[data-drag]')
  if (!chip || e.button > 0) return
  drag = { id: chip.dataset.drag, chip: chip, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, hours: null }
})

document.addEventListener('pointermove', function (e) {
  if (!drag) return
  if (!drag.moved) {
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) return
    drag.moved = true
    drag.ghost = drag.chip.cloneNode(true)
    drag.ghost.classList.add('drag-ghost')
    drag.ghost.removeAttribute('data-act')
    drag.ghost.removeAttribute('data-drag')
    document.body.appendChild(drag.ghost)
    drag.chip.classList.add('dragging')
    document.body.classList.add('is-dragging')
    closeMenus()
  }
  e.preventDefault()
  drag.ghost.style.left = e.clientX + 'px'
  drag.ghost.style.top = e.clientY + 'px'

  let box = document.getElementById('hz')
  let drop = document.getElementById('hz-drop')
  if (!box || !drop) return
  let r = box.getBoundingClientRect()
  let y = e.clientY - r.top
  let bottom = TOP + hy(MAXH)
  if (e.clientX > r.left - 40 && e.clientX < r.right + 40 && y > TOP + 6 && y < bottom) {
    let h = yh(y - TOP)
    let w = dropWhen(h)
    drag.hours = h
    drop.hidden = false
    drop.style.top = y + 'px'
    drop.querySelector('span').textContent = when(w.date, w.time)
  } else {
    drag.hours = null
    drop.hidden = true
  }

  if (e.clientY < 90) window.scrollBy(0, -14)
  else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14)
}, { passive: false })

function endDrag(drop) {
  if (!drag) return
  let d = drag
  drag = null
  if (!d.moved) return
  dragEnded = Date.now()
  if (d.ghost) d.ghost.remove()
  d.chip.classList.remove('dragging')
  document.body.classList.remove('is-dragging')
  let dz = document.getElementById('hz-drop')
  if (dz) dz.hidden = true
  if (drop && d.hours != null) placeItem(d.id, d.hours)
}

document.addEventListener('pointerup', function () { endDrag(true) })
document.addEventListener('pointercancel', function () { endDrag(false) })

window.addEventListener('scroll', function () {
  document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 4)
})

let resizeTimer = null
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(layoutHorizon, 120)
})

window.addEventListener('storage', function (e) {
  if (e.key == STORE) {
    data = load()
    render()
  }
})

setInterval(function () {
  if (!drag && document.getElementById('sheet').hidden) render()
}, 30000)

document.addEventListener('visibilitychange', function () {
  if (!document.hidden && !drag) render()
})

try { applyTheme(localStorage.getItem(THEME_KEY) || 'auto') } catch (e) { applyTheme('auto') }
save()
render()
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHorizon)
