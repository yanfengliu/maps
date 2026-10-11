# Shibuya in Unreal Engine 5.8

This branch starts a fresh Unreal Engine 5.8 experiment for the same roughly 1 km square around Shibuya Scramble Crossing. The intended result is a photoreal leaning city with moving pedestrians and vehicles.

Only `AGENTS.md` and `CLAUDE.md` were carried into this checkout. They preserve the owner's instructions byte for byte. Every other file here is new. The previous Vite project, dependencies, source code, configuration, documentation, scene cache, and assets are excluded.

The installed engine has been identified as Unreal Engine 5.8.3, changelist 58210709. An MCP connection, a built city, and rendered acceptance have not yet been established. The [plan](docs/work/0_unreal-shibuya/plan.md) records the remaining work and verification criteria.

The [branch rules](docs/policies/local-rules.md) record the owner's explicit stack and isolation instructions. They explain how the historical browser gates inside the preserved instruction file apply to this fresh Unreal branch.

## Geographic scope

The origin is Shibuya Scramble Crossing at latitude 35.6595 N, longitude 139.7005 E. The crop is latitude 35.6550-35.6640 N and longitude 139.6950-139.7060 E, approximately 997.1 by 997.3 metres as described in the retained instructions. A fresh Unreal coordinate transform and source pipeline must be designed and checked before importing data.

## Branch ownership

The orchestrator owns scope, shared contracts, and acceptance. Workers own bounded implementation and independent review. This experiment stays on `codex/shibuya-unreal-5.8`; main and its active work remain separate. Do not merge the replacement tree onto main under the standing generic merge rule.
