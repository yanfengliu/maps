# 406 — GPU de-light Cartographic regression review

2026-09-30. Independent reviewer: `/root/fresh404`. Integration owner:root. **Vote: ACCEPT within basic Cartographic static regression scope.** No material regression was found in the 22 assigned current originals against their 22 matching retained 397 originals. Cartographic polish remains deferred under the owner's Satellite focus.

## Native inspection and bound

Opened every current and baseline image individually at its native 1280×720 resolution using original-detail file viewing, in matching pairs. No contact sheet, resized substitute, browser, server, GPU lane, capture, runtime gate or product edit was used. This review covers missing geometry/materials, blank/error surfaces, transparency/cutout failure and gross shared-rendering changes. It supplies no live dropdown/continuity, motion, numerical pixel parity, lifecycle or whole-AOI quality verdict.

The current certificate is `artifacts/visual/complete.json`, SHA-256 `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce`, run `9174dee71f86ed7d`, RTX 4090/driver 616.64. Current paths below are relative to `artifacts/visual/`; the matching baseline paths are relative to `artifacts/gpu-delight397-baseline/artifacts/visual/`. Every current PNG SHA matched both the certificate and its own manifest. Every retained PNG SHA matched its baseline manifest. Current dimensions were independently read from each PNG header. A final rehash retained the same certificate and all 44 inspected image bindings.

Recorded actual pose values match each counterpart. Sweep values are the manifest's actual camera azimuth/polar rounded to five decimal radians and distance to two decimal metres. Hero poses retain full precision: crossing position (31.740094910264936,18.383176431187113,31.74009491026494), target (0,15.199999999999998,0); approach position (149.03228789316648,78.27735890300524,149.0322878931665), the same target. The table gives distance/azimuth/polar. Matching recorded poses do not claim unrecorded sub-rounding identity.

| Inspected frame | Actual pose: metres/radians/radians | Current SHA-256 | Retained baseline SHA-256 |
| --- | --- | --- | --- |
| `hero/hero-cartographic-dusk-crossing.png` | 44.99999846685906 / 0.7853981633974483 / 1.4999999450937775 | `64fbe3642ac8ae7b868aa457a37493b40718f0a2d4461f37477cb2114ba24895` | `0a1fdef00beeabc5cacadd8781cb15f4b5b32a794b01ff23d16b4710617a0af1` |
| `hero/hero-cartographic-dusk-approach.png` | 219.99999744436784 / 0.7853981633974482 / 1.2799999358678584 | `1f5de05e266ec60d628724115bd3308154b0534fbad81a61433937085d0b9200` | `a6fcaef139e8c02e5d811c9a91b56b4b4e9655ec9bd151fef3d097ec7fb4a584` |
| `hero/hero-cartographic-noon-crossing.png` | 44.99999846685906 / 0.7853981633974483 / 1.4999999450937775 | `13dc923b6a407bbc789469eecb25eb5af8cb39ec8202058892f7cf833cd916cb` | `f1ce6f91f23ca5e06868bb2e2b8fcffe92ab4b9842971a82bd1dbce2a68ef56d` |
| `hero/hero-cartographic-noon-approach.png` | 219.99999744436784 / 0.7853981633974482 / 1.2799999358678584 | `e756eef4a813396b57f2c7159a1a17f7c42d7ff96e9e2ceb74ed477aeb88c989` | `d5a176d47c1b99ead329e3f59177e9925737ee936291bfe33c7efd6a3a3b86aa` |
| `sweep/cartographic/plaza-az000.png` | 45 / 0 / 1.5 | `87d8be87fecce4d83ef4593ade0ee018cd915d83ff24825bca4548b151d2f457` | `62836b632e5404a5e61edf90c7f8492620dfcf64d8f3dcbc4bba1686c5b50d56` |
| `sweep/cartographic/plaza-az060.png` | 45 / 1.0472 / 1.5 | `1dd107dd2a8f9e842d54d3c0fefd1238fc675e3f725e8fb0f26c29809a1d46f3` | `de4ae3ecba38a402fed0fdd08506b6d1994808a07753cacf02abcecc1f59d42d` |
| `sweep/cartographic/plaza-az120.png` | 45 / 2.0944 / 1.5 | `bcb818f6a239752d726594d84ab6250e98066616c43b43cd1d478673eefa3ff4` | `567bbdbcbf46788e70ee357fac3c6827cbdce2c81b1183d906a1c88025f56cb1` |
| `sweep/cartographic/plaza-az180.png` | 45 / -3.14159 / 1.5 | `88a303bd9a30eeca42a3e402b992e85f74b3a0afdc8465ec8587e954bb05fbe3` | `bb4899a4726eaed7660d49e57417469f4cabd14762fe615b14b71d8a94d688d0` |
| `sweep/cartographic/plaza-az240.png` | 45 / -2.0944 / 1.5 | `b4491d9995af3bfece6dbdc33625cfa8d347c29c661e2ecd95c3654325efda0f` | `1336add0ebbe02f64e4e750efd7de654b6da40f92f9dd27ff30fc303b29299f3` |
| `sweep/cartographic/plaza-az300.png` | 45 / -1.0472 / 1.5 | `d37f1990fb5822096a22a70c8d5a9d3f9d9d9954470ab84be5126d061d9cba53` | `1ad5571415cf513e11c3f360599a4e1acba03b6e0b2926d7d3eb64ac044ce28a` |
| `sweep/cartographic/block-az000.png` | 220 / 0 / 1.28 | `5fabacd2965108f1480a7e9cc009c3eafe1a075a544fe08b7a4fc15608c7e98c` | `ce8d4189df0c139560ce7ff84f4adfcddfdb82b208ec38e3d9da86162b93df24` |
| `sweep/cartographic/block-az060.png` | 220 / 1.0472 / 1.28 | `b6a97a387881572ca10e3d6e6e4525858ef81cd513a94e86149e3dafb381504b` | `661d442cf7a2905d96e69391a375c040887e375cc9e75b5b1cbf999f1df5d3ff` |
| `sweep/cartographic/block-az120.png` | 220 / 2.0944 / 1.28 | `b911c5414586dfec2a6928a11b17fec6715006e4b37a3079009b56ba1e229b23` | `e3fd467ec0ae4f8765a33eefbf2715f0c53e17e184a9b44a20024c233e34ece4` |
| `sweep/cartographic/block-az180.png` | 220 / -3.14159 / 1.28 | `7a88288ea4845b8d921ce1f17479015b4e3d69a3491cee08771b7a68f08400d1` | `0a41770c240b673fb26a056354ef8b69f17501772cf2b8bf2b79b936ac9bc700` |
| `sweep/cartographic/block-az240.png` | 220 / -2.0944 / 1.28 | `bddfabecab55d702c3092e82c6faca6f11610c9069c5ed606a80c64eb575aabb` | `84d961afa4133b10b5585d47052620eefb700c85c3313b1854c35de66aed4b1a` |
| `sweep/cartographic/block-az300.png` | 220 / -1.0472 / 1.28 | `1e441a22f0a8a7499ece09f98c5b11716918ef1fed7c6bc3063b511fe80bb035` | `91f97fd21c2c459002c99ea868c01ca3c9d80a4e4c0c9a5147d9a972a9e32f03` |
| `sweep/cartographic/overhead-az000.png` | 950 / 0 / 0.62 | `70ebb7c0a39725a6d24b63ecbc19670d53ee91a7f1313681915408f4b87cd10c` | `c11f5a35464b078c8defca5aba9abd010d2fd9072106bcd6bd017efabbe2cb60` |
| `sweep/cartographic/overhead-az060.png` | 950 / 1.0472 / 0.62 | `b45e67f2b3f924d004b087cb9468d7e8b57d8d178adf7c78b47d7ce705134f62` | `1d9a9774ea13d436f6e767e37782546dd889ebfa72155b0d0625760f6bd18537` |
| `sweep/cartographic/overhead-az120.png` | 950 / 2.0944 / 0.62 | `5648842e940e50cd954532d0a7267a446c72921ebeb8383546fd1553fd5783c1` | `efe7fd7531dfe457381a1f748f8bfabf784d4d93c43e0876cd83af2758a64361` |
| `sweep/cartographic/overhead-az180.png` | 950 / -3.14159 / 0.62 | `aa25629cea1e2349f6138d015702734bd3cb8fa14952ebdae775c20459f8c7d1` | `6b07f44a7415a30b8d591fc2daa81651db899895b27097ba09dbe2ed6d0f73f2` |
| `sweep/cartographic/overhead-az240.png` | 950 / -2.0944 / 0.62 | `69ea645be776c226333d80789bc525e0b1a8cb1e16cbe3847864b4002ee49a7d` | `e0a681df5cd666d9c6ac9f3009fa888ba858757a2245f90354938d75d8fdd8bb` |
| `sweep/cartographic/overhead-az300.png` | 950 / -1.0472 / 0.62 | `a8881ceb5e4764c6457f2cf4374179284fd39a589694a34879257c3e9d9d433d` | `94e0fa21db39669c35e9af90eb53168e318a647f609ffaf33d16e17008078c01` |

## Observations and limits

All four dusk/noon hero pairs retain the same building silhouettes, facade/window treatment, signage, pavement/crossing markings and visible tree crowns. The six plaza pairs retain crossing geometry, signals and tree cutouts without new missing surfaces or opaque foliage rectangles. The six block pairs preserve building massing and rail/station surroundings; the foreground wall blocking part of block-az060 and open roof forms are already present in the retained baseline. All six overhead pairs retain the same AOI outline, major towers, rail corridor and surrounding building coverage. Every current frame contains the expected scene and Cartographic UI rather than a blank or error surface. No new material transparency or geometry disappearance was visible at the assigned viewpoints.

Those unchanged occlusions, roof forms and muted distant surfaces remain outside this basic regression acceptance. These fixed static views do not close full-map visual quality, actor behavior, temporal artifacts or performance. Independent Satellite review 403 owns detailed appearance acceptance for the other 22 canonical originals; this reviewer did not repeat that work.

## Manifest identities

`artifacts/visual/sweep/cartographic/manifest.json`: `d7e4063102f946d1a4f4c779dce6445a17074b2a226c131bec8149fa64f63d6a`.

`artifacts/visual/hero/hero.json`: `99aaceff6fa1fb934f0c13753c03dfeee11c6e8e86222f3563bc48fb357d35e0`.

`artifacts/gpu-delight397-baseline/artifacts/visual/sweep/cartographic/manifest.json`: `c06f779ee2f5a506172457a6a90e2614d299e8bf55ef473fb70cc731497b815a`.

`artifacts/gpu-delight397-baseline/artifacts/visual/hero/hero.json`: `395690e99005a5ca4377d05f90d97460fc94b8654a88e78eb04201918f47c28b`.

`artifacts/gpu-delight397-baseline/artifacts/visual/complete.json`: `c8c24e831a7834f4667ec66304a1e024bccc8cc03dfe6cc58d090f2b1a62c3da`.
