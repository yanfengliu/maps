#include "ShibuyaRendererLibrary.h"
#include "NativeFrameJson.h"
#include "Components/SkyLightComponent.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "PhysicsEngine/BodySetup.h"
#include "GameFramework/Actor.h"
#include "Misc/EngineVersion.h"
#include "EngineUtils.h"
#include "StaticMeshResources.h"
#include "DistanceFieldAtlas.h"
#include "MeshCardBuild.h"
#include "RenderingThread.h"
#include "RenderResource.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"

#include <stdexcept>
#include "SceneView.h"
#include "SceneViewExtension.h"
#include "DynamicResolutionState.h"
#include "Engine/Scene.h"
#include "HAL/IConsoleManager.h"
#include "Misc/ScopeLock.h"
#include "UnrealClient.h"

namespace
{
class FShibuyaMainViewObserver final : public FSceneViewExtensionBase
{
public:
    FShibuyaMainViewObserver(const FAutoRegister& AutoRegister, FRenderTarget* Target,
        FSceneInterface* Scene, const FString& World, const FString& Id)
        : FSceneViewExtensionBase(AutoRegister), ExpectedTarget(Target), ExpectedScene(Scene), WorldPath(World), CaptureId(Id) {}
    virtual void PostRenderView_RenderThread(FRDGBuilder&, FSceneView& View) override
    {
        const auto* Family=View.Family;
        if(!Family || Family->RenderTarget!=ExpectedTarget || Family->Scene!=ExpectedScene ||
            Family->Views.Num()!=1 || View.bIsSceneCapture || View.bIsSceneCaptureCube ||
            View.bIsReflectionCapture || View.bIsPlanarReflection)return;
        auto Result=MakeShared<FJsonObject>();
        Result->SetStringField(TEXT("capture_id"),CaptureId);Result->SetStringField(TEXT("world"),WorldPath);
        Result->SetStringField(TEXT("callback"),TEXT("PostRenderView_RenderThread"));
        Result->SetBoolField(TEXT("game_main_viewport_matched"),true);
        Result->SetNumberField(TEXT("frame_counter"),static_cast<double>(Family->FrameCounter));
        Result->SetNumberField(TEXT("frame_number"),Family->FrameNumber);
        auto Vector=[&](const TCHAR* Key,const FVector& V){Result->SetArrayField(Key,{MakeShared<FJsonValueNumber>(V.X),MakeShared<FJsonValueNumber>(V.Y),MakeShared<FJsonValueNumber>(V.Z)});};
        Vector(TEXT("camera_cm"),View.ViewMatrices.GetViewOrigin());Vector(TEXT("forward"),View.GetViewDirection());
        Result->SetNumberField(TEXT("fov_degrees"),View.FOV);
        const auto Rect=View.UnscaledViewRect;
        Result->SetArrayField(TEXT("output_rect"),{MakeShared<FJsonValueNumber>(Rect.Min.X),MakeShared<FJsonValueNumber>(Rect.Min.Y),MakeShared<FJsonValueNumber>(Rect.Max.X),MakeShared<FJsonValueNumber>(Rect.Max.Y)});
        Result->SetNumberField(TEXT("secondary_fraction"),Family->SecondaryViewFraction);
        const auto* Percentage=Family->GetScreenPercentageInterface();
        Result->SetBoolField(TEXT("primary_fraction_upper_bound_available"),Percentage!=nullptr);
        if(Percentage)Result->SetNumberField(TEXT("primary_fraction_upper_bound"),Percentage->GetResolutionFractionsUpperBound()[GDynamicPrimaryResolutionFraction]);
        Result->SetStringField(TEXT("resolution_bound"),TEXT("Actual secondary fraction/output rect; primary upper bound and requested cvars only. Actual primary fraction/internal rect are unavailable through this public observer."));
        Result->SetStringField(TEXT("feature_level"),View.GetFeatureLevel()==ERHIFeatureLevel::SM6?TEXT("SM6"):TEXT("other"));
        const auto& PP=View.FinalPostProcessSettings;
        Result->SetBoolField(TEXT("manual_exposure"),PP.AutoExposureMethod==AEM_Manual);
        Result->SetBoolField(TEXT("physical_camera"),PP.AutoExposureApplyPhysicalCameraExposure);
        Result->SetNumberField(TEXT("iso"),PP.CameraISO);Result->SetNumberField(TEXT("shutter_speed"),PP.CameraShutterSpeed);
        Result->SetNumberField(TEXT("fstop"),PP.DepthOfFieldFstop);Result->SetNumberField(TEXT("exposure_bias"),PP.AutoExposureBias);
        Result->SetNumberField(TEXT("camera_ev100_derived"),FMath::Log2(PP.DepthOfFieldFstop*PP.DepthOfFieldFstop*PP.CameraShutterSpeed*100.0/PP.CameraISO));
        Result->SetStringField(TEXT("exposure_bound"),TEXT("Merged actual-view physical settings and derived EV100; renderer PreExposure is not measured."));
        Result->SetBoolField(TEXT("lumen_gi"),PP.DynamicGlobalIlluminationMethod==EDynamicGlobalIlluminationMethod::Lumen);
        Result->SetBoolField(TEXT("lumen_reflections"),PP.ReflectionMethod==EReflectionMethod::Lumen);
        Result->SetNumberField(TEXT("lumen_scene_distance_cm"),PP.LumenSceneViewDistance);
        Result->SetNumberField(TEXT("lumen_trace_distance_cm"),PP.LumenMaxTraceDistance);
        Result->SetNumberField(TEXT("lumen_detail"),PP.LumenSceneDetail);
        Result->SetNumberField(TEXT("lumen_quality"),PP.LumenSceneLightingQuality);
        Result->SetNumberField(TEXT("lumen_cache_resolution"),PP.LumenSurfaceCacheResolution);
        for(const auto& Pair:TArray<TPair<FString,FString>>{{TEXT("cached_lighting_ev"),TEXT("r.EyeAdaptation.CachedLightingPreExposure")},{TEXT("clipmap_extent_cm"),TEXT("r.LumenScene.GlobalSDF.ClipmapExtent")},{TEXT("dynamic_resolution_operation_mode"),TEXT("r.DynamicRes.OperationMode")},{TEXT("requested_screen_percentage"),TEXT("r.ScreenPercentage")}})
            if(const auto* Cvar=IConsoleManager::Get().FindConsoleVariable(*Pair.Value))Result->SetNumberField(Pair.Key,Cvar->GetFloat());
        TArray<TSharedPtr<FJsonValue>> Projection;
        const auto Matrix=View.ViewMatrices.GetViewProjectionMatrix();
        for(int32 Row=0;Row<4;++Row)for(int32 Col=0;Col<4;++Col)Projection.Add(MakeShared<FJsonValueNumber>(Matrix.M[Row][Col]));
        Result->SetArrayField(TEXT("view_projection_matrix"),Projection);
        FString JSON;FJsonSerializer::Serialize(Result,TJsonWriterFactory<>::Create(&JSON));
        FScopeLock Lock(&Mutex);Latest=MoveTemp(JSON);
    }
    FString Read() { FScopeLock Lock(&Mutex);return Latest; }
private:
    FRenderTarget* ExpectedTarget;
    FSceneInterface* ExpectedScene;
    FString WorldPath,CaptureId,Latest;
    FCriticalSection Mutex;
};
TSharedPtr<FShibuyaMainViewObserver,ESPMode::ThreadSafe> MainViewObserver;
}

FString UShibuyaRendererLibrary::InspectNativeFrameJsonControls()
{
    const TCHAR* ID=TEXT("native-centimetres-Xeast-Ysouth-Zup-v2");
    const TCHAR* Seal=TEXT("2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170");
    auto Input=[&](const TCHAR* Schema){return FString::Printf(TEXT("{\"native_frame\":{\"schema_version\":%s,\"id\":\"%s\",\"definition_sha256\":\"%s\"}}"),Schema,ID,Seal);};
    auto TypeName=[](EJson Type)->FString
    {
        switch(Type){case EJson::Null:return TEXT("Null");case EJson::String:return TEXT("String");case EJson::Number:return TEXT("Number");
            case EJson::Boolean:return TEXT("Boolean");case EJson::Array:return TEXT("Array");case EJson::Object:return TEXT("Object");default:return TEXT("None");}
    };
    bool Passed=true;int32 AliasWitnesses=0;TArray<TSharedPtr<FJsonValue>> Cases;
    auto Check=[&](const TCHAR* Name,const FString& JSON,EJson ExpectedType,bool ExpectedAdmission)
    {
        auto Row=MakeShared<FJsonObject>();Row->SetStringField(TEXT("name"),Name);Row->SetStringField(TEXT("input_json"),JSON);
        TSharedPtr<FJsonObject> Packet;const bool Parsed=FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(JSON),Packet)&&Packet.IsValid();
        Row->SetBoolField(TEXT("parsed"),Parsed);const TSharedPtr<FJsonObject>* Frame=nullptr;TSharedPtr<FJsonValue> Schema;
        double Coerced=0;bool Converted=false;EJson IDType=EJson::None,SealType=EJson::None;
        if(Parsed&&Packet->TryGetObjectField(TEXT("native_frame"),Frame)&&Frame&&Frame->IsValid())
        {Schema=(*Frame)->TryGetField(TEXT("schema_version"));Converted=(*Frame)->TryGetNumberField(TEXT("schema_version"),Coerced);
            const auto IDValue=(*Frame)->TryGetField(TEXT("id")),SealValue=(*Frame)->TryGetField(TEXT("definition_sha256"));
            IDType=IDValue.IsValid()?IDValue->Type:EJson::None;SealType=SealValue.IsValid()?SealValue->Type:EJson::None;}
        const EJson Type=Schema.IsValid()?Schema->Type:EJson::None;
        Row->SetStringField(TEXT("id_json_type"),TypeName(IDType));Row->SetStringField(TEXT("seal_json_type"),TypeName(SealType));
        Row->SetStringField(TEXT("schema_json_type"),TypeName(Type));Row->SetStringField(TEXT("expected_schema_json_type"),TypeName(ExpectedType));
        Row->SetBoolField(TEXT("coercing_number_conversion_succeeded"),Converted);if(Converted)Row->SetNumberField(TEXT("coerced_schema_value"),Coerced);
        bool Admitted=false;
        if(Parsed)try{Shibuya::AdmitNativeFrame(Packet,TEXT("actual Unreal JSON control"));Admitted=true;}
            catch(const std::exception& Error){Row->SetStringField(TEXT("refusal"),UTF8_TO_TCHAR(Error.what()));}
        Row->SetBoolField(TEXT("admitted"),Admitted);Row->SetBoolField(TEXT("expected_admitted"),ExpectedAdmission);
        const bool Alias=FString(Name)==TEXT("boolean-true")||FString(Name)==TEXT("numeric-string");
        if(Alias&&Converted&&Coerced==1&&!Admitted)++AliasWitnesses;
        const bool Correct=Parsed&&Type==ExpectedType&&Admitted==ExpectedAdmission;
        Row->SetBoolField(TEXT("passed"),Correct);Passed=Passed&&Correct;Cases.Add(MakeShared<FJsonValueObject>(Row));
    };
    Check(TEXT("number-one"),Input(TEXT("1")),EJson::Number,true);
    Check(TEXT("number-one-decimal"),Input(TEXT("1.0")),EJson::Number,true);
    Check(TEXT("boolean-true"),Input(TEXT("true")),EJson::Boolean,false);
    Check(TEXT("boolean-false"),Input(TEXT("false")),EJson::Boolean,false);
    Check(TEXT("numeric-string"),Input(TEXT("\"1\"")),EJson::String,false);
    Check(TEXT("null-schema"),Input(TEXT("null")),EJson::Null,false);
    Check(TEXT("array-schema"),Input(TEXT("[]")),EJson::Array,false);
    Check(TEXT("object-schema"),Input(TEXT("{}")),EJson::Object,false);
    Check(TEXT("wrong-number"),Input(TEXT("2")),EJson::Number,false);
    Check(TEXT("zero-schema"),Input(TEXT("0")),EJson::Number,false);
    Check(TEXT("missing-schema"),Input(TEXT("1")).Replace(TEXT("\"schema_version\":1,"),TEXT("")),EJson::None,false);
    Check(TEXT("missing-frame"),TEXT("{}"),EJson::None,false);
    Check(TEXT("extra-field"),Input(TEXT("1")).Replace(TEXT("\"schema_version\":1"),TEXT("\"schema_version\":1,\"extra\":true")),EJson::Number,false);
    Check(TEXT("old-frame"),Input(TEXT("1")).Replace(TEXT("Xeast-Ysouth"),TEXT("Xeast-Ynorth")),EJson::Number,false);
    Check(TEXT("wrong-seal"),Input(TEXT("1")).Replace(Seal,TEXT("0000000000000000000000000000000000000000000000000000000000000000")),EJson::Number,false);
    Check(TEXT("array-frame"),TEXT("{\"native_frame\":[]}"),EJson::None,false);
    Check(TEXT("boolean-id"),Input(TEXT("1")).Replace(*FString::Printf(TEXT("\"id\":\"%s\""),ID),TEXT("\"id\":true")),EJson::Number,false);
    Check(TEXT("number-seal"),Input(TEXT("1")).Replace(*FString::Printf(TEXT("\"definition_sha256\":\"%s\""),Seal),TEXT("\"definition_sha256\":1")),EJson::Number,false);
    auto Result=MakeShared<FJsonObject>();Result->SetObjectField(TEXT("native_frame"),Shibuya::NativeFrameJSON());
    Result->SetBoolField(TEXT("passed"),Passed&&Cases.Num()==18&&AliasWitnesses==2);Result->SetNumberField(TEXT("case_count"),Cases.Num());
    Result->SetNumberField(TEXT("coercing_alias_witnesses_refused"),AliasWitnesses);Result->SetArrayField(TEXT("cases"),Cases);
    Result->SetStringField(TEXT("bound"),TEXT("Actual Unreal JSON parser/value types and current production frame admission. Coercing number readback witnesses the historical boolean/string aliases. No world, asset or geometry mutation."));
    FString JSON;FJsonSerializer::Serialize(Result,TJsonWriterFactory<>::Create(&JSON));return JSON;
}

void UShibuyaRendererLibrary::BeginMainViewCapture(UObject* Context,const FString& CaptureId)
{
    StopMainViewCapture();
    UWorld* World=GEngine?GEngine->GetWorldFromContextObject(Context,EGetWorldErrorMode::ReturnNull):nullptr;
    auto* Client=GEngine?GEngine->GameViewport.Get():nullptr;
    if(!World || World->WorldType!=EWorldType::Game || !Client || Client->GetWorld()!=World || !Client->Viewport)
        throw std::runtime_error("Capture needs the actual standalone Game world and main viewport.");
    MainViewObserver=FSceneViewExtensions::NewExtension<FShibuyaMainViewObserver>(Client->Viewport,World->Scene,World->GetPathName(),CaptureId);
}
FString UShibuyaRendererLibrary::EndMainViewCapture()
{
    FlushRenderingCommands(); // Capture only, after the measured interval.
    FString Result=MainViewObserver.IsValid()?MainViewObserver->Read():FString();
    MainViewObserver.Reset(); // Registry owns weak references; release after render commands finish.
    return Result;
}
void UShibuyaRendererLibrary::StopMainViewCapture()
{
    if(MainViewObserver.IsValid()){FlushRenderingCommands();MainViewObserver.Reset();}
}

FString UShibuyaRendererLibrary::InspectWorldResources(UObject* WorldContextObject)
{
    auto Result=MakeShared<FJsonObject>();
    UWorld* World=GEngine?GEngine->GetWorldFromContextObject(WorldContextObject,EGetWorldErrorMode::ReturnNull):nullptr;
    Result->SetStringField(TEXT("bound"),TEXT("Once-warmed existing-world resources after one render-command flush; resource availability does not establish that a particular view used indirect GI."));
    if(!World){Result->SetStringField(TEXT("error"),TEXT("No existing world for the supplied context."));FString JSON;FJsonSerializer::Serialize(Result,TJsonWriterFactory<>::Create(&JSON));return JSON;}
    FlushRenderingCommands();
    Result->SetStringField(TEXT("world"),World->GetPathName());Result->SetNumberField(TEXT("world_type"),static_cast<int32>(World->WorldType));
    TArray<TSharedPtr<FJsonValue>> Skies,Meshes,Captures,Components;
    TSet<UStaticMesh*> UniqueMeshes;
    for(TActorIterator<AActor> It(World);It;++It)
    {
        TArray<USkyLightComponent*> SkyComponents;It->GetComponents(SkyComponents);
        for(auto* Sky:SkyComponents)
        {
            auto Record=MakeShared<FJsonObject>();Record->SetStringField(TEXT("component"),Sky->GetPathName());
            const FTexture* Texture=Sky->GetProcessedSkyTexture();const FSHVectorRGB3 SH=Sky->GetIrradianceEnvironmentMap();
            Record->SetBoolField(TEXT("processed_present"),Texture!=nullptr);Record->SetBoolField(TEXT("processed_initialized"),Texture&&Texture->IsInitialized());
            Record->SetBoolField(TEXT("processed_rhi_present"),Texture&&Texture->TextureRHI.IsValid());
            Record->SetNumberField(TEXT("width"),Texture?Texture->GetSizeX():0);Record->SetNumberField(TEXT("height"),Texture?Texture->GetSizeY():0);
            TArray<TSharedPtr<FJsonValue>> Coefficients;double Maximum=0;bool Finite=true;
            for(int32 Basis=0;Basis<FSHVector3::MaxSHBasis;++Basis)
            {
                const double R=SH.R.V[Basis],G=SH.G.V[Basis],B=SH.B.V[Basis];Finite=Finite&&FMath::IsFinite(R)&&FMath::IsFinite(G)&&FMath::IsFinite(B);
                Maximum=FMath::Max(Maximum,FMath::Max(FMath::Abs(R),FMath::Max(FMath::Abs(G),FMath::Abs(B))));
                Coefficients.Add(MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(R),MakeShared<FJsonValueNumber>(G),MakeShared<FJsonValueNumber>(B)}));
            }
            Record->SetArrayField(TEXT("sh_rgb_coefficients"),Coefficients);Record->SetBoolField(TEXT("sh_finite"),Finite);Record->SetNumberField(TEXT("sh_absolute_max"),Maximum);
            Skies.Add(MakeShared<FJsonValueObject>(Record));
        }
        if(It->ActorHasTag(TEXT("ShibuyaSource")))
        {
            TArray<UStaticMeshComponent*> Source;It->GetComponents(Source);
            for(const auto* Component:Source)
            {
                auto Record=MakeShared<FJsonObject>();Record->SetStringField(TEXT("component"),Component->GetPathName());
                Record->SetBoolField(TEXT("affects_distance_field_lighting"),Component->bAffectDistanceFieldLighting);
                if(UStaticMesh* Mesh=Component->GetStaticMesh().Get()){UniqueMeshes.Add(Mesh);Record->SetStringField(TEXT("asset"),Mesh->GetPathName());}
                Components.Add(MakeShared<FJsonValueObject>(Record));
            }
        }
        TArray<USceneCaptureComponent2D*> SceneCaptures;It->GetComponents(SceneCaptures);
        for(const auto* Capture:SceneCaptures)
        {
            auto Record=MakeShared<FJsonObject>();Record->SetStringField(TEXT("component"),Capture->GetPathName());
            Record->SetBoolField(TEXT("requests_persistent_state"),Capture->bAlwaysPersistRenderingState);Record->SetBoolField(TEXT("captures_every_frame"),Capture->bCaptureEveryFrame);
            Record->SetBoolField(TEXT("gi_flag"),Capture->ShowFlags.GlobalIllumination);Record->SetBoolField(TEXT("lumen_gi_flag"),Capture->ShowFlags.LumenGlobalIllumination);
            Record->SetBoolField(TEXT("sky_lighting_flag"),Capture->ShowFlags.SkyLighting);Record->SetBoolField(TEXT("lighting_flag"),Capture->ShowFlags.Lighting);Captures.Add(MakeShared<FJsonValueObject>(Record));
        }
    }
    for(auto* Mesh:UniqueMeshes)
    {
        auto Record=MakeShared<FJsonObject>();Record->SetStringField(TEXT("asset"),Mesh->GetPathName());const FStaticMeshRenderData* Data=Mesh->GetRenderData();
        Record->SetBoolField(TEXT("render_data_present"),Data!=nullptr);Record->SetNumberField(TEXT("lod_count"),Data?Data->LODResources.Num():0);
        if(Data&&Data->LODResources.Num()>0)
        {
            const auto& LOD=Data->LODResources[0];const auto* SDF=LOD.DistanceFieldData;const auto* Cards=LOD.CardRepresentationData;
            Record->SetBoolField(TEXT("sdf_present"),SDF!=nullptr);Record->SetBoolField(TEXT("sdf_valid"),SDF&&SDF->IsValid());Record->SetBoolField(TEXT("sdf_async_building"),SDF&&SDF->bAsyncBuilding);
            Record->SetNumberField(TEXT("sdf_resource_bytes"),SDF?SDF->GetResourceSizeBytes():0);
            TArray<TSharedPtr<FJsonValue>> Mips;if(SDF)for(const auto& Mip:SDF->Mips)Mips.Add(MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(Mip.IndirectionDimensions.X),MakeShared<FJsonValueNumber>(Mip.IndirectionDimensions.Y),MakeShared<FJsonValueNumber>(Mip.IndirectionDimensions.Z)}));
            Record->SetArrayField(TEXT("sdf_mip_dimensions"),Mips);Record->SetBoolField(TEXT("cards_present"),Cards!=nullptr);
            Record->SetNumberField(TEXT("card_count"),Cards?Cards->MeshCardsBuildData.CardBuildData.Num():0);Record->SetBoolField(TEXT("cards_contain_nan"),Cards&&Cards->ContainsNaN());
            Record->SetNumberField(TEXT("card_array_bytes"),Cards?Cards->MeshCardsBuildData.CardBuildData.GetAllocatedSize():0);
        }
        Meshes.Add(MakeShared<FJsonValueObject>(Record));
    }
    Result->SetArrayField(TEXT("skylights"),Skies);Result->SetArrayField(TEXT("source_components"),Components);Result->SetArrayField(TEXT("distinct_source_meshes"),Meshes);
    Result->SetNumberField(TEXT("distinct_source_mesh_count"),UniqueMeshes.Num());Result->SetArrayField(TEXT("scene_captures"),Captures);
    if(GEngine&&GEngine->GameViewport)
    {
        auto Flags=MakeShared<FJsonObject>();const auto& Show=GEngine->GameViewport->EngineShowFlags;
        Flags->SetBoolField(TEXT("gi"),Show.GlobalIllumination);Flags->SetBoolField(TEXT("lumen_gi"),Show.LumenGlobalIllumination);
        Flags->SetBoolField(TEXT("sky_lighting"),Show.SkyLighting);Flags->SetBoolField(TEXT("lighting"),Show.Lighting);Result->SetObjectField(TEXT("main_viewport_flags"),Flags);
    }
    FString JSON;FJsonSerializer::Serialize(Result,TJsonWriterFactory<>::Create(&JSON));return JSON;
}


FString UShibuyaRendererLibrary::InspectSupportCollisionContext(const UStaticMeshComponent* Component)
{
    auto Result=MakeShared<FJsonObject>();
    Result->SetNumberField(TEXT("schema_version"),1);
    Result->SetStringField(TEXT("observer"),TEXT("ue-public-static-mesh-collision-context-v1"));
    Result->SetBoolField(TEXT("available"),false);
    auto Finish=[&](){FString JSON;FJsonSerializer::Serialize(Result,TJsonWriterFactory<>::Create(&JSON));return JSON;};
#if WITH_EDITOR && WITH_EDITORONLY_DATA
    auto Unavailable=[&](const TCHAR* Reason){Result->SetStringField(TEXT("unavailable_reason"),Reason);return Finish();};
    Result->SetBoolField(TEXT("editor_data_available"),true);
    if(!IsInGameThread())return Unavailable(TEXT("Collision context must be observed on the game thread."));
    if(!IsValid(Component))return Unavailable(TEXT("Static mesh component is unavailable."));
    const auto* Actor=Component->GetOwner();
    const UStaticMesh* Mesh=Component->GetStaticMesh().Get();
    if(!IsValid(Actor)||!IsValid(Mesh))return Unavailable(TEXT("Component owner or static mesh is unavailable."));
    const auto* Body=Mesh->GetBodySetup();
    const auto* RenderData=Mesh->GetRenderData();
    if(!IsValid(Body)||!RenderData||RenderData->LODResources.Num()==0||Mesh->GetNumSourceModels()==0)
        return Unavailable(TEXT("Body, render LOD or editor source model is unavailable."));
    const auto* Clean=IConsoleManager::Get().FindConsoleVariable(TEXT("p.EnableMeshClean"));
    if(!Clean)return Unavailable(TEXT("p.EnableMeshClean is unavailable."));
    Result->SetStringField(TEXT("engine_version"),FEngineVersion::Current().ToString());
    Result->SetNumberField(TEXT("current_enable_mesh_clean"),Clean->GetInt());
    Result->SetStringField(TEXT("actor_path"),Actor->GetPathName());
    Result->SetStringField(TEXT("component_path"),Component->GetPathName());
    Result->SetStringField(TEXT("mesh_path"),Mesh->GetPathName());
    Result->SetStringField(TEXT("body_path"),Body->GetPathName());
    Result->SetBoolField(TEXT("own_complex_source"),Mesh->ComplexCollisionMesh==nullptr);
    auto EnumName=[](auto Value){const UEnum* Enum=StaticEnum<decltype(Value)>();return Enum?Enum->GetNameStringByValue(static_cast<int64>(Value)):FString();};
    Result->SetStringField(TEXT("collision_trace_flag"),EnumName(Body->CollisionTraceFlag.GetValue()));
    Result->SetBoolField(TEXT("double_sided"),Body->bDoubleSidedGeometry!=0);
    Result->SetBoolField(TEXT("mesh_collide_all"),Body->bMeshCollideAll!=0);
    Result->SetNumberField(TEXT("lod_for_collision"),Mesh->LODForCollision);
    // Match GetPhysicsTriMeshData's all-data/selected-LOD path without requesting/cooking it.
    const int32 LOD=Body->bMeshCollideAll?0:FMath::Clamp(Mesh->LODForCollision,0,RenderData->LODResources.Num()-1);
    Result->SetNumberField(TEXT("selected_collision_lod"),LOD);
    TArray<TSharedPtr<FJsonValue>> Sections;
    for(int32 Index=0;Index<RenderData->LODResources[LOD].Sections.Num();++Index)
        Sections.Add(MakeShared<FJsonValueBoolean>(Mesh->GetSectionInfoMap().Get(LOD,Index).bEnableCollision));
    Result->SetArrayField(TEXT("section_collision_enabled"),Sections);
    auto Vector=[&](const TCHAR* Key,const FVector& V){Result->SetArrayField(Key,{MakeShared<FJsonValueNumber>(V.X),MakeShared<FJsonValueNumber>(V.Y),MakeShared<FJsonValueNumber>(V.Z)});};
    auto Rotation=[&](const TCHAR* Key,const FRotator& R){Result->SetArrayField(Key,{MakeShared<FJsonValueNumber>(R.Pitch),MakeShared<FJsonValueNumber>(R.Yaw),MakeShared<FJsonValueNumber>(R.Roll)});};
    Vector(TEXT("body_build_scale"),Body->BuildScale3D);
    Vector(TEXT("render_build_scale"),Mesh->GetSourceModel(0).BuildSettings.BuildScale3D);
    Vector(TEXT("actor_location_cm"),Actor->GetActorLocation());Rotation(TEXT("actor_rotation"),Actor->GetActorRotation());Vector(TEXT("actor_scale"),Actor->GetActorScale3D());
    Vector(TEXT("component_location_cm"),Component->GetComponentLocation());Rotation(TEXT("component_rotation"),Component->GetComponentRotation());Vector(TEXT("component_scale"),Component->GetComponentScale());
    Result->SetStringField(TEXT("collision_enabled"),EnumName(Component->GetCollisionEnabled()));
    Result->SetStringField(TEXT("collision_profile"),Component->GetCollisionProfileName().ToString());
    Result->SetStringField(TEXT("collision_object_type"),EnumName(Component->GetCollisionObjectType()));
    Result->SetStringField(TEXT("visibility_response"),EnumName(Component->GetCollisionResponseToChannel(ECC_Visibility)));
    const auto& Nanite=Mesh->GetNaniteSettings();
    Result->SetBoolField(TEXT("nanite_enabled"),Nanite.bEnabled!=0);
    Result->SetStringField(TEXT("fallback_target"),EnumName(Nanite.FallbackTarget));
    Result->SetStringField(TEXT("generate_fallback"),EnumName(Nanite.GenerateFallback));
    Result->SetNumberField(TEXT("fallback_percent_triangles"),Nanite.FallbackPercentTriangles);
    Result->SetNumberField(TEXT("fallback_relative_error"),Nanite.FallbackRelativeError);
    Result->SetNumberField(TEXT("keep_percent_triangles"),Nanite.KeepPercentTriangles);
    Result->SetNumberField(TEXT("trim_relative_error"),Nanite.TrimRelativeError);
    Result->SetBoolField(TEXT("available"),true);
#else
    (void)Component;
    Result->SetBoolField(TEXT("editor_data_available"),false);
    Result->SetStringField(TEXT("unavailable_reason"),TEXT("WITH_EDITOR source collision context is unavailable in this target."));
#endif
    return Finish();
}
