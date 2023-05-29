const W = 2030;
const H = 950;

const G = {};

const now = new Date();
const hour = now.getHours();
const day = now.toLocaleDateString('nl-NL', { weekday: 'long' }).toUpperCase();
const today = [now.getFullYear(), now.getMonth(), now.getDate()];
const start = encodeURIComponent(new Date(...today).toISOString());
const end = encodeURIComponent(new Date(...today, 23, 59, 59, 999).toISOString());

function url(gas) {
  return [
    'https://api.energyzero.nl/v1/energyprices?',
    `fromDate=${start}&`,
    `tillDate=${end}&`,
    'interval=4&',
    `usageType=${gas ? '3' : '1'}&`,
    'inclBtw=true',
  ].join('');
}

let loading = 2;
function done() {
  loading--;
  if (loading === 0) {
    content();
  }
}

let prices = [];
let gas = Infinity;
let gasToday = false;

// Load elec
new Request(url()).loadJSON().then((res) => {
  prices = res.Prices.sort(
    (a, b) => new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime(),
  ).map(({price}) => price);
  
  done();
}).catch(done);

// Load gas
new Request(url(true)).loadJSON().then((res) => {
  const found = res.Prices.sort(
    (a, b) => new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime(),
  ).reverse()[0];
  
  if (found && found.price !== undefined) {
    gas = found.price;
    
    gasToday = new Date(found.readingDate).getTime() >= new Date(...today, 6).getTime();
  }
  
  done();
}).catch(done);;

// Graph margin T, R, B, L
G.m = { t: 300, r: 100, b: 120, l: 100 };
G.w = W - G.m.l - G.m.r;
G.h = H - G.m.t - G.m.b;

// Graph bar
G.b = {
  // Spacing
  s: 10,
};

// Text
const T = {
  // Margin
  m: { t: 60, b: 20, l: G.m.l - 20 },
  s: 0,
  p: 10,
  f: 0.75,
};
T.h = (G.m.t - T.m.t - T.m.b - T.s) / 2;

const nf = ['nl-NL', {
  style: 'currency',
  currency: 'EUR',
}];

const ctx = new DrawContext();

ctx.size = new Size(W, H);

const backgroundColor = new Color('#292450');
ctx.setFillColor(backgroundColor);
ctx.fillRect(new Rect(0, 0, W, H));

widget.backgroundColor = backgroundColor;

// Icons
ctx.setTextColor(new Color('#ffffff'));
ctx.setFont(Font.regularSystemFont(T.h * 0.9));
ctx.setTextAlignedLeft();
ctx.drawTextInRect('⚡️', new Rect(
  T.m.l,
  T.m.t,
  T.h,
  T.h,
));
ctx.setTextColor(new Color('#ffffff'));
ctx.setFont(Font.regularSystemFont(T.h * 0.9));
ctx.setTextAlignedLeft();
ctx.drawTextInRect('🔥', new Rect(
  T.m.l,
  T.m.t + T.h + T.s,
  T.h,
  T.h,
));

function content() {
  // Calc sizes
  const min = Math.min(...prices);
  let max = Math.max(...prices);
    
  // Text
  ctx.setTextColor(new Color('#eeeeeecc'));
  ctx.setFont(Font.mediumSystemFont(T.h * T.f));
  ctx.setTextAlignedLeft();
  ctx.drawTextInRect(`${min.toLocaleString(...nf)} – ${max.toLocaleString(...nf)}`, new Rect(
    T.m.l + T.s + T.h + T.p,
    T.m.t + T.h * ((1 - T.f) / 2),
    G.w,
    T.h,
  ));
  ctx.setTextColor(new Color(gasToday ? '#eeeeeecc' : '#ff888866'));
  ctx.setFont(Font.mediumSystemFont(T.h * T.f));
  ctx.setTextAlignedLeft();
  ctx.drawTextInRect(gas.toLocaleString(...nf), new Rect(
    T.m.l + T.s + T.h + T.p,
    T.m.t + T.h * (1 + ((1 - T.f) / 2)) + T.s,
    G.w,
    T.h,
  ));
  ctx.setTextColor(new Color('#eeeeeecc'));
  ctx.setFont(Font.boldSystemFont(T.h * T.f));
  ctx.setTextAlignedRight();
  ctx.drawTextInRect(day, new Rect(
    W - G.w - G.m.r,
    T.m.t + T.h * ((1 - T.f) / 2),
    G.w,
    T.h,
  ));
  
  // Prevent 0 max
  if (max - min === 0) {
    max = min + 0.01;
  }
  
  const normalized = prices.map((p) => (p - min) / (max - min));
  
  const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length;
  const high = ( 1 + avg ) / 2;
  
  // Calc bar width
  G.b.w = (G.w - ((normalized.length - 1) * G.b.s)) / normalized.length;
  
  // Draw bars
  normalized.forEach((n, i) => {
    const gh = Math.max(G.h * n, G.b.s);
    const gl = i * (G.b.w + G.b.s) + G.m.l
    
    let color = '#408dff';
    if (n < avg) {
      color = '#80c4fe';
    } else if (n > high) {
      color = '#f33b6e';
    }

    // Color prices under or equal to 0, use green
    if (prices[i] <= 0) {
      color = '#61E294';
    }

    // Color prices under -0.17, use dark green
    if (prices[i] < -0.17) {
      color = '#009494';
    }

    if (i < hour) {
      color += '66';
    }
    
    ctx.setFillColor(new Color(color));
    ctx.fillRect(new Rect(
      gl,
      G.m.t + G.h - gh,
      G.b.w,
      gh,
    ));
    
    if (hour === i) {
      ctx.setTextColor(new Color('#aaffaa'));
      ctx.setFont(Font.heavySystemFont(G.b.w * 0.7));
    } else {
      ctx.setTextColor(new Color(i < hour ? '#eeeeee66' : '#eeeeeecc'));
      ctx.setFont(Font.semiboldSystemFont(G.b.w * 0.7));
    }
  
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(String(i), new Rect(gl, G.m.t + G.h + G.b.s, G.b.w, G.b.w));
  });
  
  // Draw avg line
  const ay = G.m.t + G.h * (1 - avg);
  
  const ap = new Path;
  ap.move(new Point(G.m.l, ay));
  ap.addLine(new Point(G.m.l + G.w, ay));
  
  ctx.addPath(ap);
  
  ctx.setStrokeColor(new Color('#ffffff77'));
  ctx.setLineWidth(G.b.s * 0.75);
  ctx.strokePath();
  
  // Draw
  const widget = new ListWidget();
  widget.backgroundImage = ctx.getImage();
  
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }
  
  Script.complete();
}
