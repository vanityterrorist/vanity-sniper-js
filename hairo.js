import tls from 'tls';
import WebSocket from 'ws';
import http2 from 'http2';

const t = '';
const p = '';
const sID = '';
const whURL = '';
const gs = new Map();
let mfaT = '';

class H2 {
  constructor() {
    this.s = http2.connect("https://canary.discord.com", {
      settings: {noDelay:true},
      secureContext: tls.createSecureContext({ciphers:'ECDHE-RSA-AES128-GCM-SHA256:AES128-SHA'})
    });
    this.s.on('error', () => setTimeout(() => this.constructor(), 5000));
    this.s.on('close', () => setTimeout(() => this.constructor(), 5000));
  }
  
  async r(m, p, h = {}, b = null) {
    return new Promise((rs, rj) => {
      const hs = {
        'Content-Type': 'application/json',
        'Authorization': t,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36',
        'X-Super-Properties': 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJwdGIiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC4xMTMwIiwib3NfdmVyc2lvbiI6IjEwLjAuMTkwNDUiLCJvc19hcmNoIjoieDY0IiwiYXBwX2FyY2giOiJ4NjQiLCJzeXN0ZW1fbG9jYWxlIjoidHIiLCJoYXNfY2xpZW50X21vZHMiOmZhbHNlLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWxlIEdlY2tvKSBkaXNjb3JkLzEuMC4xMTMwIENocm9tZS8xMjguMC42NjEzLjE4NiBFbGVjdHJvbi8zMi4yLjcgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjMyLjIuNyIsIm9zX3Nka192ZXJzaW9uIjoiMTkwNDUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjozNjY5NTUsIm5hdGl2ZV9idWlsZF9udW1iZXIiOjU4NDYzLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ==',
        ...h,
        ":method": m,
        ":path": p,
        ":authority": "canary.discord.com",
        ":scheme": "https"
      };
      const s = this.s.request(hs);
      const c = [];
      s.on("data", d => c.push(d));
      s.on("end", () => { try { rs(Buffer.concat(c).toString()); } catch (e) { rj(e); } });
      s.on("error", rj);
      if (b) s.write(typeof b === 'string' ? b : JSON.stringify(b));
      s.end();
    });
  }
}

const c = new H2();

async function getMFA() {
  try {
    const r = await c.r('PATCH', '/api/v9/guilds/0/vanity-url');
    const d = JSON.parse(r || '{}');
    if (d.code === 60003 && d.mfa?.ticket) {
      const mr = await c.r('POST', '/api/v9/mfa/finish', {}, {
        ticket: d.mfa.ticket,
        mfa_type: 'password',
        data: p
      });
      const md = JSON.parse(mr || '{}');
      if (md.token) return md.token;
    }
  } catch (e) {}
  process.exit(1);
}

async function patch(v) {
  try {
    c.r('PATCH', `/api/v9/guilds/${sID}/vanity-url`, {'X-Discord-MFA-Authorization': mfaT}, {code: v});
    for (let i = 0; i < 5; i++) {
      const s = tls.connect({
        host: 'canary.discord.com',
        port: 443,
        rejectUnauthorized: false,
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:AES128-SHA'
      }, () => {
        const d = JSON.stringify({code: v});
        s.write(
          `PATCH /api/v9/guilds/${sID}/vanity-url HTTP/1.1\r\n` +
          `Host: canary.discord.com\r\n` +
          `Authorization: ${t}\r\n` +
          `Content-Type: application/json\r\n` +
          `X-Discord-MFA-Authorization: ${mfaT}\r\n` +
          `Content-Length: ${d.length}\r\n\r\n` +
          d
        );
      });
      s.on('error', () => {});
      s.on('data', () => s.destroy());
    }
    notify(v);
  } catch (e) {}
}

async function notify(v) {
  try {
    const axios = require('axios');
    await axios.post(whURL, {
      content: '@everyone',
      embeds: [{
        description: '```claimed```',
        color: 0x00ff00,
        image: {url: 'https://cdn.discordapp.com/attachments/1312777357500879001/1333059772328575066/togif.gif?ex=67f67028&is=67f51ea8&hm=4861fc317a8e0b2c9f2cd3e706866493a049677d0ec8471ae0646130d24c6d8e&'},
        fields: [
          {name: "Vanity", value: `\`${v}\``, inline: true},
          {name: "Guild", value: `\`${sID}\``, inline: true}
        ],
        footer: {
          text: `<: | ${new Date().toLocaleTimeString('tr-TR')}`,
          icon_url: 'https://cdn.discordapp.com/attachments/1312777357500879001/1333059772328575066/togif.gif?ex=67f67028&is=67f51ea8&hm=4861fc317a8e0b2c9f2cd3e706866493a049677d0ec8471ae0646130d24c6d8e&'
        },
        timestamp: new Date().toISOString()
      }]
    }, {timeout: 2000});
  } catch (e) {}
}

function handleGU(d) {
  const gid = d.guild_id;
  const ov = gs.get(gid);
  if (ov) {
    if (!d.vanity_url_code) {
      patch(ov);
      return;
    }
    if (d.vanity_url_code !== ov) {
      patch(ov);
    }
  }
  if (d.vanity_url_code) {
    gs.set(gid, d.vanity_url_code);
  } else {
    gs.delete(gid);
  }
}

function connectWS() {
  const ws = new WebSocket('wss://gateway-us-east1-b.discord.gg', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36'
    }
  });

  ws.on('open', () => {
    ws.send(JSON.stringify({
      op: 2,
      d: {
        token: t,
        intents: 1,
        properties: {
          os: 'linux',
          browser: 'firefox',
          device: 'hairo'
        }
      }
    }));

    setInterval(() => {
      ws.send(JSON.stringify({op: 1, d: null}));
    }, 41250);
  });

  ws.on('message', async (d) => {
    try {
      const m = JSON.parse(d);
      if (m.t === 'GUILD_UPDATE') {
        handleGU(m.d);
      } else if (m.t === 'READY') {
        m.d.guilds.forEach(g => {
          if (g.vanity_url_code) {
            gs.set(g.id, g.vanity_url_code);
          }
        });
      }
      if (m.op === 7) {
        ws.close();
        setTimeout(connectWS, 1000);
      }
    } catch (e) {
      ws.close();
    }
  });

  ws.on('close', () => {
    setTimeout(connectWS, 1000);
  });

  ws.on('error', () => {
    ws.close();
  });
}

async function main() {
  mfaT = await getMFA();
  setInterval(async () => {
    const nt = await getMFA();
    if (nt) mfaT = nt;
  }, 4 * 60 * 1000);
  connectWS();
}

main();
