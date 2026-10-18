# Independent native sky investigation

Author: `/root/unreal_capability/sky_capture_diagnosis`. Read-only investigation,2026-10-11. Inputs: native `render-20261011-083645` receipt and all six individually inspected1280×720 PNGs; frozen helper SHA`664488404e6fc22328f651c125d40730bcd1c878b20569dbf14490c221e9d881` and runner SHA`b5f998faaba851a7203e1d5c80606bbc1cf4a86a0233ac978c316491e2ac2a18`. Authored findings follow.

Two independent native capture problems explain the current darkness. Neither requires changing photos, materials, geometry, physical exposure or the six acceptance cameras.

1. Real-time skylight cannot update from SceneCapture2D views. Installed `ReflectionEnvironmentRealTimeCapture.cpp:351` returns immediately for `MainView.bIsSceneCapture`. Meanwhile `SkyLightComponent.cpp:942` removes real-time skylights from the ordinary recapture queue. `RecaptureSky()` only queues work. Therefore80 capture frames cannot populate real-time sky irradiance when no ordinary viewport renders. This is a strong causal explanation for black shadow facades; the receipt does not prove an ordinary viewport rendered.
2. The export pipeline writes linear-gamma U8 output as conventional PNG bytes. Frozen code creates `RTF_RGBA8`; its default `bForceLinearGamma=true` makes `TextureRenderTarget2D.cpp:704` GetDisplayGamma return1. Filmic tonemapping then applies exponent2.2 before display encoding: `PostProcessTonemap.cpp:281`, `PostProcessCombineLUTs.usf:305`. Crucially, `ImageWrapperModule.cpp:494` explicitly leaves linear U8 bytes unchanged during PNG compression. This makes mids darker when viewed as normal SDR. Merely choosing `RTF_RGBA8_SRGB` is insufficient assurance: `CreateRenderTarget2D` directly assigns the enum, and `InitAutoFormat` does not clear the constructor’s linear-gamma flag.

The apparent black sky is not a valid atmosphere failure witness. At60° horizontal FOV, vertical half-FOV is17.992°. Every fixed camera’s top ray points below the horizon: crossing−1.34°, crossing-west−16.49°, both block views−18.13°, both crop views−11.68°.

Epic documents that the lower virtual-planet hemisphere is black without terrain or a filler. All six frames therefore look toward geometry or the lower hemisphere, even beyond the crop. [Sky Atmosphere documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/sky-atmosphere-component-in-unreal-engine)

The next bounded diagnostic should use one owned engine session and separate arms, preserving source bytes and all six fixed views:

| Arm | Native change | Expected observable |
|---|---|---|
| Gamma only | `texture.set_editor_property("target_gamma",2.2)` | Lit photo mids brighten; absent shadow illumination remains. |
| Ambient only | `sky.light_component.set_real_time_capture(False)`, then `recapture_sky()` after asset compilation completes and separate editor ticks | Shadow photo facades gain sky illumination; sun direction and hard-shadow silhouettes remain. |
| Combined | Both changes | Readable lit and shaded photos without emissive substitution. |

`TargetGamma` is reflected BlueprintReadWrite in `TextureRenderTarget.h:26`. `SetRealTimeCapture` is BlueprintCallable in `SkyLightComponent.h:279`; use the setter to refresh render state.

Add one upward-looking exploratory capture solely to test upper atmosphere. Report actual atmosphere actor state and `r.SupportSkyAtmosphere`, `r.SkyAtmosphere`, `r.SkyLight.RealTimeReflectionCapture`, `r.LUT.TonemappingMethod`, target gamma and capture flags. Native processed-sky/irradiance getters are not reflected, so Python must not claim their readiness.

I inspected all six final PNGs individually at native resolution and recomputed their SHA-256 values; every value matches `render-20261011-083645/report.json`. The log also confirms `r.GenerateMeshDistanceFields=1`, so missing project distance-field support is not presently supported as the cause. No engines launched, files edited or dependencies installed.
