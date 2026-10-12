// Historical eligibility guards stay strict; current-source successor admission is unresolved.
export const HISTORICAL_HERO_INPUTS=Object.freeze([
  {
    "path": "data/scene/roads.mesh",
    "sha256": "0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc",
    "bytes": 6509676
  },
  {
    "path": "data/scene/pavements.mesh",
    "sha256": "3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62",
    "bytes": 13068136
  },
  {
    "path": "data/scene/pavement-recipe.json",
    "sha256": "0750f79ea57e8b58273d8bb65ff86a101e089c099bc7d048157708ec6ebb3c58",
    "bytes": 5688456
  },
  {
    "path": "data/scene/pavement-source.json",
    "sha256": "ab6a66b4da3fda3b0f3e60853f468fd203fd76bc92c56fdaa1d9a5a0dbdd58ea",
    "bytes": 34410496
  },
  {
    "path": "data/scene/terrain.mesh",
    "sha256": "c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773",
    "bytes": 4415496
  }
]);
export const HISTORICAL_OBSTACLE_INPUTS=Object.freeze([
  {
    "path": "data/scene/buildings/tileset.json",
    "sha256": "71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483"
  },
  {
    "path": "data/scene/buildings/data/data518.b3dm",
    "sha256": "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b"
  },
  {
    "path": "data/scene/decorations.json",
    "sha256": "f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918"
  },
  {
    "path": "data/scene/control-hardware.json",
    "sha256": "a65058ee0afc162e77189b11d3710162d0b299e02c4ac99c9a44b32ee99d2509"
  }
]);
export const NETWORK_INPUT=Object.freeze({
  "path": "data/network/network.json",
  "bytes": 10239410,
  "sha256": "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677"
});
export const FEMALE_INPUTS=Object.freeze([
  {
    "path": "data/scene/agents/commuter-female-near.glb",
    "bytes": 3359268,
    "sha256": "9de612756ffa1e71976adb0ab9bf08fc2f534fbd82941450d51f9a9ed03761cb"
  },
  {
    "path": "data/scene/agents/commuter-female-near-positions.f16",
    "bytes": 7077888,
    "sha256": "c883460904ffa489d9eba1e39494dce905f4b94f889cf6fa8ffb40cd18f0a0c7"
  },
  {
    "path": "data/scene/agents/commuter-female-near-normals.f16",
    "bytes": 7077888,
    "sha256": "15b4256c11c5f72d434f83f94289a7fca525775ce71845ac7ce976e515e76193"
  },
  {
    "path": "data/scene/agents/commuter-female-medium.glb",
    "bytes": 2256284,
    "sha256": "ef0a653610089980eb1c92b071ba321bc42ab8d21b29f26166eff7b8de1184a6"
  },
  {
    "path": "data/scene/agents/commuter-female-medium-positions.f16",
    "bytes": 1572864,
    "sha256": "4a33016ccdb585d6ca3cab74f5c4f0bb94af9a836adace41d4cc263861cc753b"
  },
  {
    "path": "data/scene/agents/commuter-female-medium-normals.f16",
    "bytes": 1572864,
    "sha256": "18aa61c850ba2db2898113cfc9bf8d4cbfc4af565c459ad725e160aa8344bbbf"
  },
  {
    "path": "data/scene/agents/commuter-female-far.glb",
    "bytes": 2130104,
    "sha256": "685bfacd58dd01d3a5bf13da02a8639152e173ab76352a16840de4421c8753dc"
  },
  {
    "path": "data/scene/agents/commuter-female-far-positions.f16",
    "bytes": 786432,
    "sha256": "1d676356e31c8c2e1231d65b4a4902bf517420411c7fc7a11ae7dfafdd50ea3b"
  },
  {
    "path": "data/scene/agents/commuter-female-far-normals.f16",
    "bytes": 786432,
    "sha256": "3b15a62d036ab16620ad67b123a8808119dfb97554bb3032420d68fae4909920"
  },
  {
    "path": "data/scene/agents/commuter-female.json",
    "bytes": 13924,
    "sha256": "3228439e0f0b6a0082f80750e2a3e315a1a234a6b7ce639023fe3000f0aa6d92"
  }
]);
export const REFERENCE_INPUTS=Object.freeze([
  {
    "path": "near/extracted.json",
    "bytes": 699177,
    "sha256": "c113b2f53f64ecf38b49a94b674557eab1bebf00a4d6f1ad7a12a9b01434f11f"
  },
  {
    "path": "near/source-weights.json",
    "bytes": 2185524,
    "sha256": "cabcff940226e63f309c0c92cd89e36d534417986a33c89428d8428f5b5c9d57"
  },
  {
    "path": "near/selected-sidecar.json",
    "bytes": 460438,
    "sha256": "4764a9cd3479fcc17e7a024dfad30097af7d6135440ee04c20c0b64547ebff06"
  },
  {
    "path": "medium/extracted.json",
    "bytes": 699266,
    "sha256": "916220b38942c6a3542efb28c86a1071cc7eebb44dcf1177979a0b02ec733993"
  },
  {
    "path": "medium/source-weights.json",
    "bytes": 277435,
    "sha256": "1391dcf83e32a45baa79aa3ee8b8f875949088a8190d11baf83824d90dfc3cd4"
  },
  {
    "path": "medium/selected-sidecar.json",
    "bytes": 69063,
    "sha256": "abfc3481c6e1fb23d42e8a6d76a01ac8ecb07bc99ec0d687cbdc234e9be89c0d"
  },
  {
    "path": "far/extracted.json",
    "bytes": 699218,
    "sha256": "3d08546b970e40e7b13f4dbedfeaaf463de8150ee7dcf5a4ab798ec809aea3b0"
  },
  {
    "path": "far/source-weights.json",
    "bytes": 62675,
    "sha256": "87a5009c3f8300886eadedf5caa11550c3e9b0cf9a44c110d741278e347c1557"
  },
  {
    "path": "far/selected-sidecar.json",
    "bytes": 29000,
    "sha256": "8eed39feee4f022bf604092aba6883b857175865b0705c587c8dbeba62ce579a"
  }
]);
export const CURRENT_OWNER_INPUTS=Object.freeze([
  {
    "path": "src/agents/population/local-ordered/controller.mjs",
    "bytes": 28230,
    "sha256": "17c01366d56c9285e8fb1892b80cd0b3bec9eb2f52d20364eb72797e106d3c6e"
  },
  {
    "path": "src/agents/population/local-walk-gait.ts",
    "bytes": 11188,
    "sha256": "23219df38c04475cec620b62e422f1a18989a47205d60cc742bf2b443107d223"
  },
  {
    "path": "src/agents/population/local-ordered/solve-leg.mjs",
    "bytes": 1520,
    "sha256": "e76b4ce2d41d82938d36b7310809bb4383887ab8908ce9984a848c2a81bf3e75"
  }
]);
export const FEMALE_SOURCE_INPUT=Object.freeze({
  "path": "data/scene/agents/commuter-female-source.blend",
  "bytes": 1580178,
  "sha256": "2cf7840fa8478279cc8f96bca8be42d03cef6ada5e3e58fafd9998fed6369b41"
});
export const BAKER_INPUT=Object.freeze({
  "path": "tools/agents/bake-human.py",
  "bytes": 23124,
  "sha256": "62cec8bc8d3c3b52cc4d5322b6da342bfcebf22fb10e4cce261cc08d1b1ab79a"
});
