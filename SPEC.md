# 320-midnight-lapis 「MIDNIGHT LAPIS — 夜の博物館」

## 操作/設定UI

| 項目 | 決定 |
|---|---|
| 入力 | Pointer Events + `setPointerCapture`。仮想十字・A/B・SELECT/START。画面ドラッグでカメラ |
| ポーズ | START。タブ非表示の扱いあり |
| ミュート | 未実装。開始タップで WebAudio unlock |
| 保存 | 未使用 |
| iOS | viewport-fit / maximum-scale=1 / safe-area / コントローラトレイ |

## ゲーム概要

夜の博物館に潜入し、今世紀最大のお宝（ラピスラズリ）の前に立つ。ドラクエ式のメッセージとコマンドで「とりますか？」と選ぶ。盗むと警報が鳴り、警備員の捜索が始まる。換気ダクト・地下排水路・川・外海へと逃げる3Dステルス脱出。

- 対象端末: iPhone Safari / GitHub Pages。`index.html` に three.js / rapier / 本体を内蔵
- 編集: `src/*.js` → `python3 -I repack.py` で `index.html` を書き出す
- 勝敗: 外海まで脱出でクリア。見つかって撃たれると失敗

## 未確定・既知の不足

- ミュートトグルなし
- 実機（iPhone）の見た目・体感フレームレートは未検証
- この環境のソフトウェア描画ではハーネスの描画ループ／タップが FAIL することがある（改修前から同じ。コンソールエラー0、通信量は20MB以下）
