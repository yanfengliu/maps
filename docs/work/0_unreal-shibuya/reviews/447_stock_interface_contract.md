# Installed stock-property route, read-only investigation 2026-10-17

Verdict: the installed source resolves the complete requested property and serialization contract. This route needs a finite operator repair, not another guessed property list. No engine, browser, build, tests or native calls were launched; no canonical files changed. This source audit is not a live success claim. Runtime readback and refusal remain required. Native helper and candidate inputs remain fixed.

All source references below have prefix `C:/Program Files/Epic Games/UE_5.8/Engine/`.

## Exact properties

Top-level names in ObjectTools get_properties.properties and in the JSON string passed to set_properties.values are native reflected names. ToolsetLibrary.cpp lines64-105 and174-227 uses PropertyAccessUtil::FindPropertyByName and writes each result under the requested FName string. Python aliases with underscores do not resolve. Installed headers establish these exact names:

| v2 alias | exact native FName | header, line |
| --- | --- | --- |
| source_type | SourceType | Source/Runtime/Engine/Classes/Components/SkyLightComponent.h:112 |
| cubemap | Cubemap | same:116 |
| intensity | Intensity | Source/Runtime/Engine/Classes/Components/LightComponentBase.h:37 |
| lower_hemisphere_is_black | bLowerHemisphereIsBlack | SkyLightComponent.h:143 |
| real_time_capture | bRealTimeCapture | SkyLightComponent.h:108 |
| light_color | LightColor | LightComponentBase.h:44 |
| use_temperature | bUseTemperature | Source/Runtime/Engine/Classes/Components/LightComponent.h:69 |
| override_materials | OverrideMaterials | Source/Runtime/Engine/Classes/Components/MeshComponent.h:31 |
| fov_angle | FOVAngle | Source/Runtime/Engine/Classes/Components/SceneCaptureComponent2D.h:44 |
| override_custom_near_clipping_plane | bOverride_CustomNearClippingPlane | same:94 |
| custom_near_clipping_plane | CustomNearClippingPlane | same:100 |
| max_view_distance_override | MaxViewDistanceOverride | Source/Runtime/Engine/Classes/Components/SceneCaptureComponent.h:156 |
| post_process_settings | PostProcessSettings | SceneCaptureComponent2D.h:87 |
| projection_type | ProjectionType | same:40 |
| use_custom_projection_matrix | bUseCustomProjectionMatrix | same:104 |
| relative_rotation | RelativeRotation | Source/Runtime/Engine/Classes/Components/SceneComponent.h:143 |
| nested override_white_temp | bOverride_WhiteTemp | Source/Runtime/Engine/Classes/Engine/Scene.h:720 |
| nested white_temp | WhiteTemp | same:1507 |

## Stock calls and payloads

Toolset remains editor_toolset.toolsets.object.ObjectTools. get_properties(instance={"refPath":"ACTUAL_COMPONENT_PATH"}, properties=["SourceType","Cubemap","Intensity","bLowerHemisphereIsBlack","bRealTimeCapture"]) returns a JSON-formatted string, decoded by existing mcp_run.tool_value lines331-342. Example decoded result: {"SourceType":"SLS_SpecifiedCubemap","Cubemap":{"refPath":"/Engine/MapTemplates/Sky/DaylightAmbientCubemap.DaylightAmbientCubemap"},"Intensity":1.0,"bLowerHemisphereIsBlack":false,"bRealTimeCapture":false}. Use the actual requested native keys for all later checks and restoration.

set_properties(instance={"refPath":"ACTUAL_COMPONENT_PATH"}, values=json.dumps({...})) returns boolean true on whole success. values is a STRING containing the JSON object; references inside it remain OBJECTS, not double-encoded JSON. Setter can partially apply siblings before failure, so preserve pre-write values and restore even after false/error (ToolsetLibrary.cpp:234-260).

Sky values: {"SourceType":1,"Cubemap":{"refPath":"/Engine/MapTemplates/Sky/DaylightAmbientCubemap.DaylightAmbientCubemap"},"Intensity":1.0,"bRealTimeCapture":false,"bLowerHemisphereIsBlack":false,"LightColor":{"r":1.0,"g":1.0,"b":1.0,"a":1.0}}.

Sun values: {"Intensity":25000.0,"bUseTemperature":false,"LightColor":{"r":SRGB_BYTE_R/255.0,"g":SRGB_BYTE_G/255.0,"b":SRGB_BYTE_B/255.0,"a":1.0}}. SRGB_BYTE values are exactly the v2 candidate's existing transfer-function and integer rounding output. Do not supply255-valued channels: that would saturate to white and change the candidate.

Material values for each of the same three root components: {"OverrideMaterials":[{"refPath":"/Game/AppearanceRepair/CrossingV2/OriginalInstance1.OriginalInstance1"}]}.

Projection values: {"FOVAngle":85.56559011236283,"bOverride_CustomNearClippingPlane":true,"CustomNearClippingPlane":100.0,"MaxViewDistanceOverride":800000.0}. Add readback of ProjectionType (string Perspective), bUseCustomProjectionMatrix (boolean false), RelativeRotation (rotator object). Preserve numeric tolerance already required for FOV.

White balance: use the minimal supported nested patch {"PostProcessSettings":{"bOverride_WhiteTemp":true,"WhiteTemp":6500.0}}. The stock setter recurses into ordinary structs and only touches supplied matching fields, with per-field notifications; no need to resend the giant exported PostProcessSettings. Source: Plugins/Experimental/ToolsetRegistry/Source/ToolsetRegistry/Private/ToolsetRegistry/ToolsetLibraryImpl.cpp:200-243,673-740. Readback of PostProcessSettings has the normal converter's lower-first-letter field export: bOverride_WhiteTemp and whiteTemp. This differs from the native top-level property keys. Exact native nested setter spelling is supported by FindFProperty(FName(key)); do not use override_white_temp or white_temp.

## Serialization evidence

Registry built-in Color/Reference/Transform converters are installed in Plugins/Experimental/ToolsetRegistry/Source/ToolsetRegistry/Private/ToolsetRegistry/ToolsetRegistry.cpp:29-36. The common prefix for the next files is that Private/ToolsetRegistry directory.

ToolsetJson.cpp:168-199 delegates property JSON to FJsonObjectConverter with registered custom import/export callbacks; recursive conversion therefore also uses ReferenceConverter for Cubemap and each OverrideMaterials element. ReferenceConverter.cpp:193-239 exports object paths as {refPath:path};249-260 accepts that form or a string;298-308 requires Package.Object syntax;425-444 resolves/loads non-instanced object references, checks their actual class and sets the property. Null reference properties round-trip as null. Both supplied asset paths already have the required separator. Arrays are normal JSON arrays with each element converted, not a reference to an array.

ColorConverter.cpp:90-105 exports FColor through ReinterpretAsLinear: byte channels normalized by255, without gamma conversion. Lines109-127 imports RGBA numbers as FLinearColor then calls ToFColor(false); normalized values are quantized without a gamma transfer. ColorConverter schema lines45-66 explicitly caps FColor at1. Supplying existing intended sRGB bytes divided by255 preserves those bytes. FLinearColor fields elsewhere use their actual linear values. All channels must be present for this use.

Source/Runtime/JsonUtilities/Private/JsonObjectConverter.cpp:109-142 exports enum properties and byte enum properties as authored-name STRINGS and booleans as JSON booleans. Lines593-670 accepts numeric enum values or authored strings and imports booleans via AsBool. SkyLightComponent.h:84-91 orders SLS_CapturedScene=0, SLS_SpecifiedCubemap=1. Source/Runtime/Engine/Classes/Camera/CameraTypes.h:15-20 orders Perspective=0, Orthographic=1. Source/Runtime/CoreUObject/Private/UObject/Enum.cpp:928-937 obtains authored names via GetNameStringByIndex. JsonObjectConverter.cpp:33-43 lowercases the first letter and changes ID to Id for normal STRUCT export; it does not strip b or introduce underscores. This explains whiteTemp and the retained bOverride_WhiteTemp.

## Actor transforms and actual camera basis

The current v2 assumptions translation and quaternion are invalid. Installed ActorTools.get_actor_transform (Plugins/Experimental/Toolsets/EditorToolset/Content/Python/editor_toolset/toolsets/actor.py:141 onward) returns unreal.Transform, and the registered TransformConverter returns:

{"location":{"x":100,"y":200,"z":300},"rotation":{"pitch":10,"yaw":20,"roll":30},"scale":{"x":1,"y":1,"z":1}}

All distances are native centimetres; rotation is DEGREES. TransformConverter.h:13-30 defines optional Location/FVector, Rotation/FRotator, Scale/FVector. TransformConverter.cpp:48-54 serializes those fields;96-102 fills them from the actual native transform and converts native quaternion to Rotator. Lines77-93 imports set fields back, preserving unset fields. Restore the exact full returned object through ActorTools.set_actor_transform(actor=ref,xform=returned,worldspace=true). ActorTools.look_at(actor=ref,target={"x":...,"y":...,"z":...}) calls native find_look_at_rotation and sets actor rotation. Use returned location for the sun target calculation.

Avoid inferring the capture actor path from its component string: ActorTools.get_component_actor(component={"refPath":capture_component}) is a stock source-defined tool and returns its actual owning actor reference (actor.py:246 onward). get_root_component returns an object ref or null; find_actors returns an array of object refs. Existing find_actors(name=...,tag="",collision_channels=[]) had already succeeded in retained failure2. Its Python declaration also permits explicit root=null,actor_type=null,bounds=null if schema demands the default arguments.

A complete basis readback needs NO new native helper: read actual native actor Transform and derive basis from its returned pitch/yaw/roll with the engine's own matrix formula. Let SP/CP=sin/cos(pitch radians), SY/CY=sin/cos(yaw radians), SR/CR=sin/cos(roll radians).

forward = [CP*CY, CP*SY, SP]
right = [SR*SP*CY-CR*SY, SR*SP*SY+CR*CY, -SR*CP]
up = [-(CR*SP*CY+SR*SY), CY*SR-CR*SP*SY, CR*CP]

Primary source: Source/Runtime/Core/Public/Math/RotationTranslationMatrix.h:47-86 gives these three matrix rows; Source/Runtime/Core/Public/Math/Matrix.inl:646-660 returns rows0/1/2 for native X/Y/Z axes. This is actual native transform readback plus documented arithmetic, not a presumed requested camera. Compare every axis with the fixed native basis and retain the actual rotator, location, scale and formula provenance. Require unit scale or account for it explicitly. RelativeRotation readback is also pitch/yaw/roll, but world actor transform is the correct reference for the contract.

## Finite repair boundary and remaining runtime uncertainty

Repair every alias above; use normalized FColor; minimal native-key WB patch; use location/Rotator world transforms and the primary-source basis formula; optionally use get_component_actor instead of path slicing. Update restoration dictionaries, checks and report names together. Preserve the exact candidate, native time budget, one native launch, frozen assets/helper, no saves and existing cleanup. No unknown serialization contract remains for these requested fields. Whether assets resolve and the scene renders within the remaining clock is runtime uncertainty, not source-proven success. All setter results, actual readbacks, original disk pins, capture PNG hashes and owned cleanup still decide acceptance.
