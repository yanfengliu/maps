# Bounded native first-hit discriminator

Read-only verification at assigned canonical HEAD f45b6e268a2b38b26a64897cd1449ae4c0d217dc. No product, source, data, package, Git, import, build or save changes. Two isolated NullRHI editor commandlets were authorized under the root engine lease. No GUI, browser, external model, CIM, network or rendered gate ran. Every directly read/written path and ancestor was freshly inspected for reparse points.

## Verdict and bound

After the existing asset-compilation readiness barrier, actual native first-hit physics selects road City_052_data65 at the exact refusal XY. Immediately across the packed native edge toward the remaining terrain vertex, it selects upper terrain. Thus the tolerant source witness is false at that exact XY, while a real upper first-hit terrain surface exists on the interior side. This finite observation supports neither a blanket road preference nor blanket highest-ground preference. It does not establish route-wide or continuous gameplay support.

The corrected editor probe positively calibrates against one held-out interior road ray from the admitted 282-ray native installation and exactly reproduces the two retained posed contacts in both simple/complex modes (four game-query replays). This is a bound to those discrete physics queries; it does not establish equality to the entire game state, controls or population behavior. The retained ordinary-game support failures remain valid and RED.

## Instrument correction

The first 44-query run omitted Editor.AsyncAssetCompilationFinishAll. Its exact/exterior rays missed roads, and its retained car query incorrectly measured lower terrain rather than the known game road. The log shows only TerrainSupport waiting for static-mesh readiness when its mesh description was accessed. Those immutable original results are raw editor-world evidence of an unready instrument, and must never be cited as gameplay holes.

The v2 run uses the same existing barrier that shibuya_tools._support_collision executes before its native support rays. The barrier took 0.28200000000651926 seconds. All 25 loaded road components and the terrain component were recorded before and after it, with unchanged exposed configuration: QueryAndPhysics, BlockAll, Visibility Block, own BodySetup, UseComplexAsSimple, is_visible=true and hidden=false. Python does not expose the queried registration/physics/render-state accessors; v2 records that limitation. NullRHI performs no rendering. No collision flags, meshes or actor transforms were changed.

Held-out original ray native-0-2-vehicle_centre-5 at ENU [392.9418544760318,225.45377010030992]m returned City_052_data65 native face 765, z 10.730327765324336m, signed normal [-0.023692489018807425,0.012383119727434807,0.9996425982869628], in both modes. It agrees with the original actual installation ray.

## Exact native geometry and query

Terrain source-description triangle 810530 was read from the loaded native mesh and transformed by its actual actor transform. Its world-centimetre vertices are:

```json
[
  [
    42773.92578125,
    26591.36328125,
    1160.529052734375
  ],
  [
    42829.1484375,
    26572.216796875,
    1165.822998046875
  ],
  [
    42663.484375,
    26629.599609375,
    1149.9415283203125
  ]
]
```

The longest edge is vertices 1–2. The edge point nearest the refusal XY is [42747.19513897767,26600.603827181367]cm. Its inward XY unit vector is [0.32730187004135164,0.9449198303916762]. Positive offsets below point toward vertex 0. The exact refusal query is the literal double multiplication [427.47194895559466*100,266.006031244335*100] = [42747.19489555946,26600.603124433503]cm. Its measured signed edge distance is -0.0007437116278205536cm (about 7.437 um outside).

Every edge/exact point was cast from road reference 11.268758623698652m +80cm to -100 cm, and separately from +200m to-100m. Each cast ran both simple and complex query modes on Visibility, without ignored source actors or a normal flip. All 46 v2 rays returned actual blocking_hit=true. Simple/complex actor, face, impact height and blocking-hit fields agree exactly per query. Full endpoints, impact points, signed normals, time, distance and initial-overlap fields are retained in v2/native.json.

| Runtime-window point | First actor | Native face | Impact height m | Signed ground minus road reference cm |
| --- | --- | ---: | ---: | ---: |
| source-refusal-exact/runtime-window | City_052_data65 | 913 | 11.268758489153083 | -1.3454556892611436E-05 |
| native-edge-offset--0.01m/runtime-window | City_052_data65 | 913 | 11.268952149803878 | 0.019352610522673785 |
| native-edge-offset--0.001m/runtime-window | City_052_data65 | 913 | 11.268777725496777 | 0.0019101798125120695 |
| native-edge-offset--0.0001m/runtime-window | City_052_data65 | 913 | 11.268760283066067 | 0.00016593674149589788 |
| native-edge-offset--2e-05m/runtime-window | City_052_data65 | 913 | 11.268758732627782 | 1.0892912996496307E-05 |
| native-edge-offset-0m/runtime-window | City_069_terrain | 809308 | 11.579665033440829 | 31.09064097421765 |
| native-edge-offset-2e-05m/runtime-window | City_069_terrain | 809308 | 11.579665664143645 | 31.09070404449926 |
| native-edge-offset-0.0001m/runtime-window | City_069_terrain | 809308 | 11.57966818695491 | 31.09095632562571 |
| native-edge-offset-0.001m/runtime-window | City_069_terrain | 809295 | 11.579693167760782 | 31.093454406212913 |
| native-edge-offset-0.01m/runtime-window | City_069_terrain | 809295 | 11.579938971763692 | 31.118034806504056 |

Signed normals measured by physics: road 913 [-0.024307609949688065,0.028915227995389276,0.9992862701390972]; terrain 809308 [-0.0954790768236939,-0.0001487848718397852,0.9954314259415148]; adjacent terrain 809295 [-0.09411352746487331,0.0038240295480803,0.9955541274818432]. Native cooked collision face IDs and source-description triangle IDs are distinct observations; no unverified index correspondence is asserted.

## Retained posed controls

At original fixed step 420, foot-1074513107-0 left_shoe_bottom at [9626.952920928561,9231.79176093721,72.23752567834936]cm replays its exact +80/-100cm ray. First hit is terrain 620961 at z 93.05443906824692cm, gap +20.816913389897564cm, signed normal [-0.03583447901651553,-0.07484936482207047,0.9965507828000276]. Both modes match the retained game record exactly.

At original fixed step 420, vehicle-loop-12 body_plane_5 at [33324.14872844495,17963.25586283508,1058.613498546135]cm replays its exact +80/-100cm ray. First hit is road data65 face 695 at z 1033.5562031050863cm, gap -25.05729544104861cm, signed normal [0.039868153237218686,0.028109846022982277,0.9988094747818616]. Both modes match the retained game record exactly.

## Pins, processes and receipts

The exact Source2 manifest fd17760ee6e38b93da891579332d1b870af47aa5e604f9bdbd344c112c5a974d, derived terrain 1a420a5d2120926e02eb6d5cbff03b169a0169610a4a64055cb9129400edd21a and map b4e82679ff9993a3be9cd8f3bef4581b6006ea7dd0e4ffeea51b1a4242797c70 were required before launch and remained byte-identical after each run. The terrain package and all 25 road packages were also hashed before/after unchanged. All 27 map/surface package hashes agree with the retained ordinary-game receipt. Full individual hashes are in both receipt.json files.

Original run: 8.148621082305908s, owned editor 8564; remaining descendants 29280/62928 were terminated only through its Job. Corrected v2: 9.129608869552612s, owned editor 57232; remaining descendants 48556/3468 were terminated only through its Job. Both were created suspended, observed assigned to their own kill-on-close Job before resume, and verified Job-empty in finally cleanup. A final Get-Process check found none of these six PIDs. No other process was stopped. Evidence remains needed by the active task.

| Artifact | SHA-256 |
| --- | --- |
| native_probe.py | 3fc2b2a95b0e1428ceac0e40f3350b466ca4b813ef6325ace6fd361c594f6d09 |
| run_probe.py | d62d76c559b6905f76456c929a8c2d77e2c1520c07cd24a0c7bd216dcfa01a5b |
| native.json | 4042009ebe9180eafb52310595d6f0d9cd3af0754fffac29105dfb6bda325e2b |
| receipt.json | 3db36fc6d1f499a33d85afb59d880ae2a53bb416efc9af47cd8f4893f124953b |
| stdout.log | f97350e9cbca4a0600875219ba3bb25b3b317d55d1bb0e0e54d4be73239a2340 |
| editor.log | 78c651be0179df853340b40f3d5876bb526c74d8c3aa132af2bec0c2af4f7de6 |
| request.json | 58101515848b56e68077fc05f5e77fbd6f253fed74d8f617a195639593224791 |
| v2/native_probe.py | 2b1ec19f38178fdfafcdc8ba4b30fa84f5f4f1faf7317c715a0eb1cdb911ca99 |
| v2/run_probe.py | f929e783b8a927563ffe96e4e21ec72a8f124bb3ef014840d505559b07cc8b31 |
| v2/native.json | fe50ef667e04555a7122dcb279739ace60f32bec792edfa938cc1a1bb961aeca |
| v2/receipt.json | e65e8b28126b8565b214ff629a23bed84021215c6334b8f15d458c8e8e2f72b8 |
| v2/stdout.log | a366c0653b1bfcb3fec487d43443022e3f3628e1a5c7543884eb4df0c2bed9b6 |
| v2/editor.log | f060277a8fdce182b8480c3e63d43b25a7b80c55e5d3e85c7973f3d9fb6ab194 |
| v2/request.json | 9effe93ac18360890064e8839e61e27585924a31d2fd95f4937fc37cca413724 |
| summary.json | b70af0918f09790158327a5c03669a8162ea33369156d74591884d5d412edbb9 |
