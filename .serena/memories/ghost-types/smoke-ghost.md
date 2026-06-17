# けむりおばけ実装メモ

## 概要
- `SmokeGhost` は `Ghost` を継承する特殊おばけ。
- `GhostType` / `GhostMode` に `smoke` を追加し、`ghost-factory.ts` の固定モードおよびランダム/ハード特殊抽選に含めている。
- UI では `けむり固定` / `Smoke Only` として選択可能。

## 挙動
- 移動速度は `SMOKE_SPEED_MULTIPLIER` で低く、デフォルトではニンゲンより遅い。
- 狩猟中、射程内のまだ弱っていないニンゲンへ煙弾を投げる。
- 煙弾着弾後、煙幕範囲内のニンゲンへ `Human.applySmokeDebuff()` でデバフを付与する。
- デバフ中のニンゲンは移動速度低下、スタミナ減少、微量の生気減少を受ける。煙だけで生気は 1 未満にならない。
- `SmokeGhost.checkCapture()` は、煙デバフ中・疲労中・生気が `SMOKE_WEAK_HEALTH_RATIO` 以下のニンゲンだけ捕食対象にする。

## 関連ファイル
- `src/entities/SmokeGhost.ts`
- `src/entities/Human.ts` (`smokeDebuffTimer`, `applySmokeDebuff`)
- `src/core/constants.ts` (`SMOKE_*` 定数)
- `src/core/types.ts`, `src/entities/ghost-factory.ts`
- `index.html`, `src/locales/*.json`, `README.md`, `AGENTS.md`
