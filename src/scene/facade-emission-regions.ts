/** Authored illumination only. Source sign interiors are bound to verified
 * tile bytes, GML IDs and normalized glTF UV0.
 * UV origin is the source image top-left (DataTexture flipY=false).
 * No neighbouring wall, roof, other atlas or LOD inherits this selection.
 * Provenance and omitted regions: docs/reference/facade-emission.md.
 */
export const FACADE_EMISSION_REGIONS = [
  {
    "id": "ikea-source-panel",
    "group": 1,
    "tileUri": "data/data488.b3dm",
    "tileSha256": "6960fa916ea7c4702f423ac8f52ab0cfe53963f3846624dbb1625887796ec8e1",
    "gmlId": "bldg_23c835e4-6ac1-4461-8925-2be8428604b0",
    "uv": [
      [
        0.06697872220226159,
        0.36613894346467274
      ],
      [
        0.09499142346489699,
        0.3667192906265125
      ],
      [
        0.09507934771705154,
        0.38418230873377734
      ],
      [
        0.06696291621738718,
        0.3837073911924393
      ]
    ],
    "origin": [
      -85.7263394792138,
      63.88417342612023,
      -82.45077726788234
    ],
    "normal": [
      0.6599298398451424,
      -0.00002518224951765438,
      0.7513272295397118
    ],
    "planeHalfThicknessM": 0.03,
    "normalMinimumDot": 0.995,
    "radiance": 0.65,
    "sourcePixelBounds": [
      628,
      699,
      112,
      153
    ],
    "sourceFrameSha256": "7bbded054028fc9881487727d0d7fab86b226cb2ccacd1d7741e8110407f108b"
  },
  {
    "id": "hisamitsu-source-panel",
    "group": 2,
    "tileUri": "data/data518.b3dm",
    "tileSha256": "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b",
    "gmlId": "bldg_e6e4de58-1a37-4345-8795-6b759771ade6",
    "uv": [
      [
        0.7642441109226997,
        0.7318661502046296
      ],
      [
        0.7710967344722216,
        0.7319768810192896
      ],
      [
        0.7710574446280659,
        0.7439902018423827
      ],
      [
        0.7641551410859135,
        0.7439068110828626
      ]
    ],
    "origin": [
      -39.55153909444925,
      53.59002376017337,
      -25.005189925511075
    ],
    "normal": [
      0.680498101356804,
      -0.000042595344041898446,
      0.7327498428764225
    ],
    "planeHalfThicknessM": 0.03,
    "normalMinimumDot": 0.995,
    "radiance": 0.65,
    "sourcePixelBounds": [
      557,
      606,
      31,
      107
    ],
    "sourceFrameSha256": "7bbded054028fc9881487727d0d7fab86b226cb2ccacd1d7741e8110407f108b"
  },
  {
    "id": "japanese-source-panel",
    "group": 3,
    "tileUri": "data/data518.b3dm",
    "tileSha256": "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b",
    "gmlId": "bldg_5e891186-4803-48a0-9664-284f212881ac",
    "uv": [
      [
        0.046778123835984176,
        0.30577548217738937
      ],
      [
        0.07445988555165672,
        0.30557648104009705
      ],
      [
        0.07427933854187621,
        0.31789828895581396
      ],
      [
        0.04647720388053654,
        0.31806518334051015
      ]
    ],
    "origin": [
      -81.38488211360367,
      64.25664671161258,
      -32.533791300900425
    ],
    "normal": [
      0.7239879360091322,
      0.000047677589899619635,
      0.6898126312558244
    ],
    "planeHalfThicknessM": 0.03,
    "normalMinimumDot": 0.995,
    "radiance": 0.65,
    "sourcePixelBounds": [
      442,
      525,
      48,
      96
    ],
    "sourceFrameSha256": "7bbded054028fc9881487727d0d7fab86b226cb2ccacd1d7741e8110407f108b"
  },
  {
    // Original Coca-Cola artwork on TSUTAYA's photographed front, faces494/495.
    // One inset quad retains the script; its narrow non-letter border stays unlit.
    "id": "coca-cola-source-panel",
    "group": 4,
    "tileUri": "data/data518.b3dm",
    "tileSha256": "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b",
    "gmlId": "bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27",
    "uv": [[0.06494140625, 0.751220703125], [0.084228515625, 0.755615234375], [0.088134765625, 0.773193359375], [0.06494140625, 0.768310546875]],
    "origin": [1.3588832411018075, 15.099723530461581, -30.313774060238522],
    "normal": [0.1179914707026081, 0.000022176976186617485, 0.9930146083263918],
    "planeHalfThicknessM": 0.03,
    "normalMinimumDot": 0.995,
    "radiance": 0.65
  }
] as const;
