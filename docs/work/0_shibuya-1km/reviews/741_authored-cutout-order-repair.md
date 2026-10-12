# 741 — Authored mount after strict source cutout

**READY_FOR_SOURCE_REVIEW_BUILD.** Private overlay only; documentation base `383b6caac7e61a903d85c6b031f8fe4225233c6d`. Frozen 715/722/734/736 sources, builds and evidence remain untouched. Root admitted the mount-stage contract. No build, full types, browser, server, GPU or native qualification ran.

Actual 736 failed candidate startup with `Cutout section data/data519.b3dm: a building primitive has no position or source batch IDs`; three baseline originals and zero candidate originals exist. Installed registration uses default priority 0, but `invokeAllPlugins` starts model hooks concurrently. The production facade wrapper explicitly sequences `await prepareFacade → clipCityRoot → buildingSections`. Frozen 715 mounts its unbatched authored mesh inside `prepareFacade`; the unchanged whole-scene validator then traverses it. Changing plugin priority would not repair that composed order.

Two production module copies change. Facade preparation retains its source admission and material work; its new owner-guarded `mountAuthoredBuilding` carries the identical original add call. The production caller invokes it only after `buildingSections` succeeds and section caps attach, inside the existing parse transaction, before final clipping and resource accounting. It captures additions immediately. No validator bypass, generated-mesh skip, fake batch IDs or source-data change was added.

Original authored model/shader/room-plan, source binder, cutout validator and transaction bytes match the frozen compiled-input manifest. Original arrays/indices/metadata/atlas references, inverse parent world mounting and shared current style/time references remain covered by the focused CPU checks and unchanged source. Whole decoded-tile/GPU behavior still needs native verification.

The same positive regression exercises actual public `createBuildings`, installed parser/plugin hooks and parse transaction with literal admitted source triangles. Frozen old 715 exits 1 with the exact missing-batch failure; new production sequence passes. Four further cases pass: malformed unrelated SOURCE still refuses before authored attachment; cancellation after mounting publishes nothing and releases once; owner closure before mounting refuses; late shared uniforms and translated-parent inverse mounting remain correct. Successful transfer and repeated disposal release source/authored resources once.

The first late-style fixture incorrectly omitted the app's `applyFacadeStyle` owner operation. Its failed receipt remains retained; the corrected fixture uses that actual helper. Production delta was unchanged. Old standalone early-mount test expectations cannot be inherited across this contract change.

CPU readers exited; named preparation/test/seal readers were confirmed absent. Output/cache directories do not exist. Root owns exact source review, one private build/type lease and the next six-original noon comparison; 734 observation work stays withheld.

Paths below are relative to `artifacts/authored741/`. Handoff binds all private files, preserved inputs and the initial fixture failure.

| Artifact | SHA-256 |
| --- | --- |
| handoff.json | b608cd1109a6e3665860e62c799029b70534448522d7b72e65e872de525e81b1 |
| source/src/scene/buildings.ts | 2f4fa0a3d7ef903d976c6e5fcc483e662094188f77b7bfb78feb9b0158eee958 |
| source/src/scene/facade-textures.ts | 3b82c8148d738f0b83e263b129737216ff81a05592e583dfe4b96b61487f686f |
| controls-old.json | 6f0ff5bc7480b1d7fe9bc3c132646ded886ec6cfa22280ce63d66dce036f4e52 |
| controls-new.json | fdc17ebdea222f7d66c03280af6a3c271f8e956a2a8482a5c0989bb0fb27f1af |
