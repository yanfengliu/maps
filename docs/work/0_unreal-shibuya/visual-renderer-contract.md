# Native renderer diagnostic contract

Prepared by the visual worker on 2026-10-11. This is an implementation contract for the runtime owner, not a claim that these observations have run. Keep all original geometry, photo textures, fixed cameras, 100,000-lux sun and physical ISO100/f16/shutter125 exposure unchanged while diagnosing shadow lighting. The last surface receipt is `artifacts/unreal/surface-20261011-091720/report.json`, SHA `1b62f010bd8a685929d36ae7a9dabb1e6a14b18caa52f8a3953ede08347afc69`. Its map is `4203bd6085a60b99570dc3cfb25c02a503f4642719166b9f07f1f9e20df52808`. The old geometry and normalized-photo manifest remains `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`.

## Read-only resource witness

The installed 5.8.3 headers expose the following C++ accessors without Python reflection. Run once on the game thread after the world has rendered and capture warm-up has completed. In the editor, finish asynchronous asset compilation first through the existing native console command. Allow ordinary world/editor ticks to process queued skylight captures, then call `FlushRenderingCommands()` once before reading sky coefficients. A constructor or `BeginPlay` call alone is too early. Do not recapture or change lighting in the inspection function.

```cpp
#include "Components/SkyLightComponent.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/StaticMesh.h"
#include "StaticMeshResources.h"
#include "DistanceFieldAtlas.h"
#include "MeshCardBuild.h"
#include "RenderingThread.h"
#include "RenderResource.h"

// Sky is an existing USkyLightComponent* in the tested world.
FlushRenderingCommands();
const FTexture* Processed = Sky->GetProcessedSkyTexture();
const FSHVectorRGB3 Irradiance = Sky->GetIrradianceEnvironmentMap();
const bool bProcessedPresent = Processed != nullptr;
const bool bProcessedInitialized = Processed && Processed->IsInitialized();
const bool bProcessedRhiPresent = Processed && Processed->TextureRHI.IsValid();
const uint32 Width = Processed ? Processed->GetSizeX() : 0;
const uint32 Height = Processed ? Processed->GetSizeY() : 0;
for (int32 Basis = 0; Basis < FSHVector3::MaxSHBasis; ++Basis)
{
    // Record all nine actual RGB coefficients, finite flags and absolute max.
    const FVector3f Coefficient(Irradiance.R.V[Basis],
                                Irradiance.G.V[Basis],
                                Irradiance.B.V[Basis]);
}

// Repeat for each distinct existing source UStaticMesh*, once per asset.
const FStaticMeshRenderData* RenderData = Mesh->GetRenderData();
if (RenderData && RenderData->LODResources.Num() > 0)
{
    const FStaticMeshLODResources& Lod = RenderData->LODResources[0];
    const FDistanceFieldVolumeData* Sdf = Lod.DistanceFieldData;
    const FCardRepresentationData* Cards = Lod.CardRepresentationData;
    const bool bValidSdf = Sdf && Sdf->IsValid();
    const SIZE_T SdfResourceBytes = Sdf ? Sdf->GetResourceSizeBytes() : 0;
    const int32 CardCount = Cards ? Cards->MeshCardsBuildData.CardBuildData.Num() : 0;
    const bool bCardContainsNaN = Cards && Cards->ContainsNaN();
    const SIZE_T CardArrayBytes = Cards ? Cards->MeshCardsBuildData.CardBuildData.GetAllocatedSize() : 0;
}

// Capture is the actual existing USceneCaptureComponent2D* used for the frame.
const bool bRequestsPersistentState = Capture->bAlwaysPersistRenderingState;
const bool bCapturesEveryFrame = Capture->bCaptureEveryFrame;
const bool bGlobalIlluminationFlag = Capture->ShowFlags.GlobalIllumination;
const bool bLumenGiFlag = Capture->ShowFlags.LumenGlobalIllumination;
const bool bSkyLightingFlag = Capture->ShowFlags.SkyLighting;
const bool bLightingFlag = Capture->ShowFlags.Lighting;
```

Record asset paths and distinct-asset denominator, SDF presence/validity/async-building and nonzero mip dimensions, mesh-card count, invalid-number flag, source actor/component `bAffectDistanceFieldLighting`, and missing resources separately. Do not count a missing resource as a valid zero. `GetResourceSizeBytes()` is resource accounting, not GPU or whole-process allocation. SH coefficients are native values; this contract does not assign physical irradiance units to them. A nonzero processed resource establishes availability, not that the final capture used it. Do not call `GetViewState(0)` as an observation: the installed accessor allocates the state when needed. The snippet records persistence requests only. Actual rendered A/B evidence and renderer logs must establish execution; a future capture subclass could expose its protected preexisting `ViewStates` without allocating, but that is outside this contract.

Header references are relative to the installed engine `Engine/Source/Runtime/`: `Engine/Classes/Components/SkyLightComponent.h:308` exposes the processed texture and SH map; `Core/Public/Math/SHMath.h:39` defines nine basis values for order3 and `:502` exposes RGB channels; `Engine/Classes/Engine/StaticMesh.h:644` exposes render data; `Engine/Public/StaticMeshResources.h:425` and `:428` hold LOD resources; `Engine/Public/DistanceFieldAtlas.h:241` defines SDF data and `:287` validity; `Engine/Public/MeshCardBuild.h:95` and `:145` expose cards; `RenderCore/Public/RenderResource.h:260` defines texture resource state/dimensions. Use installed headers as the compilation authority; this snippet has not yet been compiled.

## Renderer execution control

After the fixed crossing view has warmed, use supported native console controls without saving the map: `r.LumenScene.DumpStats 2` for real mesh SDF/card/page counts and `r.LumenScene.SurfaceCache.LogUpdates 1` for actual surface-capture updates. Restore the latter to its observed prior value after the diagnostic. A dump may print zero without proving diffuse GI ran. Record its native log bytes, actual flag values, all Lumen/scalability/distance-field cvars and the frame count.

Capture a bounded fixed-camera A/B with `r.Lumen.DiffuseIndirect.Allow` at its actual baseline value and at0, holding sun, exposure, gamma, geometry and photos fixed. Each arm requires its own persistent warm-up and identical frame count. Compare full native pixels and the previously sampled shadow-facade and lit-ground coordinates. Restore the baseline cvar in a `finally` path. This is a diagnostic control, not acceptance when GI is disabled. If the arms are identical, that is evidence to investigate missing execution/resource coverage; it does not authorize raising skylight intensity.

Installed `Renderer/Private/Lumen/LumenDiffuseIndirect.cpp:290` requires a valid persistent view, supported tracing/project, final Lumen PP method, enabled diffuse cvar and both GlobalIllumination/LumenGlobalIllumination flags. `Renderer/Private/SceneCaptureRendering.cpp:1468` adds per-capture Lumen scene data only with a persistent view state and final Lumen method. `Renderer/Private/Lumen/Lumen.cpp:228` additionally requires a processed or realtime skylight resource and SkyLighting flag for Lumen skylight handling. The defaults and PP enum alone cannot prove those conditions.

The ordinary game viewport, once the genuine local SDK and runtime module work, is an independent render path. Compare the same source-bound location/orientation and physical lighting there. Main-view correctness cannot be inferred from SceneCapture frames, and direct camera state assignment does not prove user input controls.

## Scope and next candidate

The last eight images have now been inspected individually at1280x720. Ground imagery and lit facades are visible; crossing, southeast block and southeast crop remain too dark. Upper-sky pixels exist but are dim. The central pixel darkness gate remains failed. The all-zero immediate HDR value on one shadow facade confirms direct/instantaneous capture darkness; that separate immediate capture has no warmed Lumen history and therefore does not establish that the final persistent capture had zero indirect lighting.

If captured-sky resources or execution fail, repair that mechanism first. If resources and GI execute yet shadow irradiance remains insufficient, a source-documented physical environment reference is a distinct candidate. Keep fixed inputs and reject clipping, washed photo details, emissive facades, deleted geometry or camera-only hiding. Complex multi-building meshes may have poor card/SDF coverage; [Epic's technical documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine) describes this limitation. Actual native resources and coverage must decide whether it applies here; splitting assets or rebuilding cards would require a coordinated source/runtime contract.
