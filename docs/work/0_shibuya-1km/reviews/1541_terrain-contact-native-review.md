# 1541 — Terrain/contact native review

2026-10-18 UTC. **A2 remains OPEN.** Main b1c2f93a, unchanged executable e1097edd. No concrete float/sink or terrain defect is qualified.

I inspected all 22 Satellite originals individually at native 1280×720 and rehashed them against run 7f403f3841a95a62. Certificate SHA-256: 9ac73ddecd91e219310aa0da16d37bf621c936b5bec74102bfb600fe93d13547. Paths below are relative to artifacts/visual/; SHA-256 follows each.

```text
hero/hero-satellite-dusk-crossing.png c9427506caa91790d412bcb4e7f90b7d2266a7e6e1a1e8a551d4f8eea3fdeb6d
hero/hero-satellite-dusk-approach.png 8a0e1173497d5b6ac6f1f60cbbd846fc54faa481e4d79eec276c6115594b89f3
hero/hero-satellite-noon-crossing.png 41346416a09d445267852f743990ea8702beebb7b78181ed3874c41eb12dcf0d
hero/hero-satellite-noon-approach.png d011df5b1557413df12de454739502a9406bdff9be200b496a55cdfd3925614a
sweep/satellite/plaza-az000.png f80e6e821797e9f660f12bd947c854aa531b327e04049bfd05e6517deafccc43
sweep/satellite/plaza-az060.png 19eada22f5d4ad11d397cd496060a217475ed368428126298d4782fc63c33bf7
sweep/satellite/plaza-az120.png 7110dbc52ab024db8a2086a9b8a55345b957d2f13f18d17aa902b2e591d47993
sweep/satellite/plaza-az180.png 759303a1009fd157db76c7589799da6f8b6583c57314665ff546b82f04df00ea
sweep/satellite/plaza-az240.png c3329be51ac36aa715ad7901134ae735923ad4520aa861e0cd39eb8c040f7c99
sweep/satellite/plaza-az300.png 596c8e42b1ce41efca618e277635c8ea1487cb9a53477da680e2bcf50541ea08
sweep/satellite/block-az000.png 9f2f578fea60658fc533bb0934f69c0c44b562ea7e942b1ca5236480c76291df
sweep/satellite/block-az060.png 83c83625b3b96bef59d60af02a35dbc84782c7340d445476fb17869f5e11f0b4
sweep/satellite/block-az120.png f8491beb8578df5fc443293b84e5a2bbe485027a7e82851cbdeee5513d5da0b6
sweep/satellite/block-az180.png 311d457494503df9e682b4232e83ab403aa6fa54cb6ad2793642ed76a521f9ce
sweep/satellite/block-az240.png 7b94f7599b428ec1be3e83889efa13f16431f9daf2806ce420a3a48e3abc32b4
sweep/satellite/block-az300.png 49a8e0d8d18d038546459e3ebed0c3ca7f6bc1eefbc46dafe3f6b5c17fd2684e
sweep/satellite/overhead-az000.png 7f96cc7d0b52d28d2cc653eaba35ea3a9eb560550065645a58d1633a366e4c14
sweep/satellite/overhead-az060.png 32db77c9c85c6781bafae02dd118b5d7294612a77177114e62d019124f9fec02
sweep/satellite/overhead-az120.png da2d85f97e9cccb99147da2189dbe70454775eede98cbe9ef33fcf6a2c6123f6
sweep/satellite/overhead-az180.png 8f914dab527033053a5cc5e7e75114921522de30bd14d40e7f1ef8e160654a9c
sweep/satellite/overhead-az240.png 13b73d210bbdca1309975a4ee0a78eaf8bb23c9c8b8fe521e37e7ec594c43c15
sweep/satellite/overhead-az300.png d1756852252dc1c93c34a6b889419d3f0516dbb87a0e054f5238f5f5fc0358c8
```

The six overhead views (950 m, polar .62) render the square but rooftops and dark streets conceal most contact boundaries; they do not make the valley profile unambiguous. Six block views (220 m, 1.28) expose short street fragments, with major foreground obstruction at az060. Six plaza views (45 m, 1.5) and four noon/dusk heroes show central frontage bases meeting pavement without a clear exposed gap or buried storefront; plaza180 is inside an obstructing interior. These are finite visible contacts, not every footprint.

Valley/Dōgenzaka relief and whole-AOI contact remain unqualified, not proved defective. 1540 owns source terrain/contact checks. Pixels do not establish geographic authenticity. Failed 1534 NE evidence supplies no whole-scene proof.

Smallest purposeful next view: at noon, use real controls to look uphill along Dōgenzaka toward world (X,Z)=(-300,+200) m, showing road length and frontage bases on both sides (1540 source sampling). Retain actual pose/hash; first verify the intended corridor is visible. If it cannot expose valley context, add a reverse low oblique looking downhill toward the crossing/east slope. Select any further contact view from a named source outlier. No capture was dispatched.

No browser, GUI, server, test, gate, capture or executable/cache/index/Git change. No owned runtime resource.
