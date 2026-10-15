#!/usr/bin/env python3
"""src/*.js を index.html の embedded-game-assets に詰め直す（vendor は既存のものを保持）。
使い方: python3 -I repack.py [--out 出力パス] [--debug]
  --debug : window.__dbg を生やした検証用ビルド（公開物には使わない）
"""
import base64, json, re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
out = args[args.index('--out') + 1] if '--out' in args else os.path.join(here, 'index.html')
debug = '--debug' in args
html = open(os.path.join(here, 'index.html'), encoding='utf-8').read()
pat = re.compile(r'(<script id="embedded-game-assets" type="application/json">)(.*?)(</script>)', re.S)
m = pat.search(html)
assets = json.loads(m.group(2))
for name in ['game.js', 'render.js', 'simulation.js', 'camera-control.js']:
    text = open(os.path.join(here, 'src', name), encoding='utf-8').read()
    if debug and name == 'game.js':
        text = text.replace("updateHud();requestAnimationFrame(frame);}", "updateHud();}")  # 自動ループ停止（手動で1フレームずつ進める）
        text += "\nwindow.__dbg={game,get view(){return view},input,frame:(dt,s)=>{game.step(dt,s||{x:0,y:0,actions:{}},(d,p,o)=>view.movement(d,p,o));view.animate(game,dt,s||{x:0,y:0});},events,renderPanel,updateHud,transition,startIntro,dqAdvance,dqTick,dq,beginTake,advanceOpening,declineTake,startPlay,audio};\n"
    assets[name] = base64.b64encode(text.encode('utf-8')).decode('ascii')
new = html[:m.start(2)] + json.dumps(assets, separators=(',', ':')) + html[m.end(2):]
open(out, 'w', encoding='utf-8').write(new)
print('wrote', out, len(new))
