#include "ShibuyaRendererLibrary.h"
#include "Components/SkyLightComponent.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "StaticMeshResources.h"
#include "DistanceFieldAtlas.h"
#include "MeshCardBuild.h"
#include "RenderingThread.h"
#include "RenderResource.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"

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
