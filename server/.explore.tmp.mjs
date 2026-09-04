import { Chess } from "cm-chess";
const P = 1;
const pos = (sans) => { const c=new Chess(); for(const s of sans) c.move(s); return c.fen().split(" ").slice(0,4).join(" "); };
const cand = async (sans, side) => {
  const r = await fetch(`http://localhost:3001/api/move-habits?profileId=${P}&side=${side}&fen=${encodeURIComponent(pos(sans))}`);
  return (await r.json()).candidates ?? [];
};
const pct = (x) => (x*100).toFixed(1)+"%";

async function walk(side, sans, depth, minCount) {
  if (depth === 0) return;
  const cs = await cand(sans, side);
  const top = cs.filter(c => c.count >= minCount).slice(0, 3);
  if (!top.length) return;
  const mover = (sans.length % 2 === 0) ? "white" : "black";
  const who = mover === side ? "Arnaud" : "adv";
  for (const [i,c] of top.entries()) {
    const n = Math.floor(sans.length/2)+1;
    const label = mover==="white" ? `${n}.${c.san}` : `${n}...${c.san}`;
    console.log("  ".repeat(sans.length) + `${label} [${who}] ${c.count} p, ${pct(c.winRate)}`);
    if (i === 0) await walk(side, [...sans, c.san], depth-1, minCount);
  }
}
for (const side of ["white","black"]) {
  console.log(`\n===== ${side.toUpperCase()} =====`);
  await walk(side, [], 12, side==="white" ? 8 : 8);
}
