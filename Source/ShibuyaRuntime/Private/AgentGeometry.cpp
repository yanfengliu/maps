#include "ShibuyaWorld.h"
#include "NativeFrame.h"
#include "NativeFrameJson.h"
#include "VehicleBodySupport.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInterface.h"
#include "Dom/JsonObject.h"

namespace
{
FLinearColor Shirt(uint32_t Appearance)
{
    static const FLinearColor Colours[]={FLinearColor(0.09f,0.18f,0.28f),FLinearColor(0.62f,0.08f,0.04f),FLinearColor(0.73f,0.66f,0.48f),FLinearColor(0.15f,0.35f,0.17f),FLinearColor(0.48f,0.35f,0.56f),FLinearColor(0.92f,0.90f,0.85f)};
    return Colours[Appearance%UE_ARRAY_COUNT(Colours)];
}
FLinearColor Skin(uint32_t Appearance)
{
    static const FLinearColor Colours[]={FLinearColor(0.73f,0.46f,0.31f),FLinearColor(0.88f,0.63f,0.44f),FLinearColor(0.44f,0.24f,0.14f),FLinearColor(0.93f,0.74f,0.60f)};
    return Colours[(Appearance>>5)%UE_ARRAY_COUNT(Colours)];
}
FLinearColor Paint(uint32_t Appearance)
{
    static const FLinearColor Colours[]={FLinearColor(0.90f,0.92f,0.94f),FLinearColor(0.025f,0.03f,0.04f),FLinearColor(0.32f,0.36f,0.40f),FLinearColor(0.45f,0.025f,0.02f),FLinearColor(0.08f,0.17f,0.32f),FLinearColor(0.75f,0.58f,0.025f)};
    return Colours[Appearance%UE_ARRAY_COUNT(Colours)];
}
FVector NativeLocal(const FVector& Source) {return FVector(Source.X,-Source.Y,Source.Z);}
FQuat NativeJoint(const FQuat& Source) {return FQuat(-Source.X,Source.Y,-Source.Z,Source.W);}
FTransform Part(const FVector& Origin,double Heading,const FVector& Local,const FVector& Scale,const FQuat& Joint=FQuat::Identity)
{
    const FQuat Yaw(FVector::UpVector,Shibuya::NativeHeading(Heading));
    return FTransform(Yaw*NativeJoint(Joint),Origin+Yaw.RotateVector(NativeLocal(Local)),Scale);
}
FTransform WheelPart(const FVector& Origin,const FQuat& Pose,int32 Wheel,bool Face,double Spin)
{
    const FQuat Rotation=FQuat(FVector(0,1,0),Spin)*(Face?FQuat::Identity:FQuat(FVector(1,0,0),PI/2));
    const FVector Local(Wheel<2?135:-135,Wheel%2?-(Face?88.5:78):(Face?88.5:78),32);
    return FTransform(Pose*NativeJoint(Rotation),Origin+Pose.RotateVector(NativeLocal(Local)),Face?FVector(0.52,0.025,0.055):FVector(0.64,0.64,0.22));
}
}
void AShibuyaWorld::CreateGeometry()
{
    if(PedestrianParts.Num()>0 || VehicleParts.Num()>0) throw std::runtime_error("Runtime population geometry can only be created once in a new game world.");
    UStaticMesh* Cube=LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cube.Cube"));
    UStaticMesh* Sphere=LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    UStaticMesh* Cylinder=LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    UMaterialInterface* Matte=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Runtime/M_AgentMatte.M_AgentMatte"));
    UMaterialInterface* Gloss=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Runtime/M_AgentPaint.M_AgentPaint"));
    UMaterialInterface* Glass=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Runtime/M_AgentGlass.M_AgentGlass"));
    if(!Cube || !Sphere || !Cylinder || !Matte || !Gloss || !Glass)
        throw std::runtime_error("Runtime agent meshes or materials are missing; execute tools/runtime/prepare_assets.py in this Unreal project before playing.");
    auto Create=[&](const FString& Name,UStaticMesh* Mesh,UMaterialInterface* Material)
    {
        auto* Component=NewObject<UInstancedStaticMeshComponent>(this,*Name);
        Component->SetupAttachment(RootComponent);Component->SetStaticMesh(Mesh);Component->SetMaterial(0,Material);
        Component->SetMobility(EComponentMobility::Movable);Component->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Component->SetCastShadow(true);Component->SetNumCustomDataFloats(3);Component->SetCullDistances(0,65000);
        Component->RegisterComponent();AddInstanceComponent(Component);return Component;
    };
    for(int32 PartIndex=0;PartIndex<10;++PartIndex)
        PedestrianParts.Add(Create(FString::Printf(TEXT("PersonPart%d"),PartIndex),PartIndex==1||PartIndex==9?Sphere:PartIndex>=3&&PartIndex<=6?Cylinder:Cube,Matte));
    for(int32 PartIndex=0;PartIndex<14;++PartIndex)
        VehicleParts.Add(Create(FString::Printf(TEXT("CarPart%d"),PartIndex),PartIndex>=3&&PartIndex<=6?Cylinder:Cube,PartIndex==2?Glass:PartIndex==0||PartIndex==1?Gloss:Matte));
    PedestrianTransforms.SetNum(PedestrianParts.Num());VehicleTransforms.SetNum(VehicleParts.Num());
    for(auto& Transforms:PedestrianTransforms)Transforms.SetNum(PedestrianCount);
    for(auto& Transforms:VehicleTransforms)Transforms.SetNum(VehicleCount);
    for(const auto& Agent:Simulation.agents)
    {
        const bool Person=Simulation.routes[Agent.route].kind==Shibuya::Kind::Pedestrian;
        const auto& Components=Person?PedestrianParts:VehicleParts;
        for(int32 PartIndex=0;PartIndex<Components.Num();++PartIndex)
        {
            FLinearColor Colour;
            if(Person)
                Colour=PartIndex==1?Skin(Agent.appearance):PartIndex==0||PartIndex==5||PartIndex==6?Shirt(Agent.appearance):PartIndex==9?FLinearColor(0.035f,0.018f,0.012f):FLinearColor(0.04f,0.045f,0.06f);
            else Colour=PartIndex<=1?Paint(Agent.appearance):PartIndex==2?FLinearColor(0.035f,0.075f,0.1f):PartIndex>=3&&PartIndex<=6?FLinearColor(0.01f,0.012f,0.016f):PartIndex==7?FLinearColor(0.9f,0.89f,0.75f):PartIndex==8?FLinearColor(0.65f,0.01f,0.005f):FLinearColor(0.18f,0.2f,0.22f);
            const int32 Instance=Components[PartIndex]->AddInstance(FTransform::Identity);
            Components[PartIndex]->SetCustomDataValue(Instance,0,Colour.R,false);
            Components[PartIndex]->SetCustomDataValue(Instance,1,Colour.G,false);
            Components[PartIndex]->SetCustomDataValue(Instance,2,Colour.B,false);
        }
    }
}
void AShibuyaWorld::UpdateGeometry()
{
    int32 PersonIndex=0,CarIndex=0;
    size_t AgentSlot=0;
    for(const auto& Agent:Simulation.agents)
    {
        const size_t Slot=AgentSlot++;
        const auto Native=Shibuya::SourceToNativeCM(Agent.position);FVector Origin(Native.x,Native.y,Native.z);
        if(Simulation.routes[Agent.route].kind==Shibuya::Kind::Pedestrian)
        {
            const double Height=0.94+((Agent.appearance>>10)%13)*0.01;
            const double Swing=FMath::Sin(Agent.travelled*4)*0.45*FMath::Min(1.0,Agent.speed/1.0);
            const FQuat Left(FVector(0,1,0),Swing),Right(FVector(0,1,0),-Swing);
            auto Set=[&](int32 Index,FVector Local,FVector Scale,const FQuat& Rotation=FQuat::Identity)
            { PedestrianTransforms[Index][PersonIndex]=Part(Origin,Agent.heading,Local*Height,Scale*Height,Rotation); };
            Set(0,FVector(0,0,118),FVector(0.36,0.24,0.60));
            Set(1,FVector(0,0,165),FVector(0.24,0.24,0.28));
            Set(2,FVector(0,0,81),FVector(0.33,0.23,0.18));
            Set(3,FVector(0,-10,76)+Left.RotateVector(FVector(0,0,-33)),FVector(0.12,0.12,0.66),Left);
            Set(4,FVector(0,10,76)+Right.RotateVector(FVector(0,0,-33)),FVector(0.12,0.12,0.66),Right);
            Set(5,FVector(0,-24,145)+Right.RotateVector(FVector(0,0,-25)),FVector(0.10,0.10,0.50),Right);
            Set(6,FVector(0,24,145)+Left.RotateVector(FVector(0,0,-25)),FVector(0.10,0.10,0.50),Left);
            Set(7,FVector(0,-10,76)+Left.RotateVector(FVector(3,0,-68)),FVector(0.24,0.12,0.10),Left);
            Set(8,FVector(0,10,76)+Right.RotateVector(FVector(3,0,-68)),FVector(0.24,0.12,0.10),Right);
            Set(9,FVector(-1,0,177),FVector(0.255,0.245,0.11));
            ++PersonIndex;
        }
        else
        {
            const auto& Route=Simulation.routes[Agent.route];Shibuya::Point Tangent;Route.At(Agent.distance,0,&Tangent);
            double Pitch=std::atan2(Tangent.z,std::hypot(Tangent.x,Tangent.y)),Roll=std::atan(Route.CrossSlope(Agent.distance));
            if(VehicleBodySupportData)
            {
                auto Fit=VehicleBodySupportData->Pose(Slot,Agent.route,Route.id,Agent.distance,Agent.generation,
                    {Agent.position.x,Agent.position.y,Agent.position.z},Agent.heading,Agent.travelled);
                if(Fit.valid&&!VehicleBodySupportData->cache[Slot].nativeVerified)
                {
                    const FVector FitOrigin(Origin.X,Origin.Y,Fit.height*100);
                    const FQuat FitRotation=FQuat(FVector::UpVector,Shibuya::NativeHeading(Agent.heading))*FQuat(FVector(0,1,0),-Fit.pitch)*FQuat(FVector(1,0,0),Shibuya::NativeRoll(Fit.roll));
                    const FVector FitUp=FitRotation.RotateVector(FVector::UpVector);
                    std::array<Shibuya::BodyPoint,10> Actual;
                    for(size_t C=0;C<6;++C)
                    {
                        const auto Local=Shibuya::VehicleBodyContacts[C];const auto P=FitOrigin+FitRotation.RotateVector(FVector(Local.x*100,-Local.y*100,0));Actual[C]={P.X,P.Y,P.Z};
                    }
                    for(int32 Wheel=0;Wheel<4;++Wheel)
                    {
                        const auto Transform=WheelPart(FitOrigin,FitRotation,Wheel,false,Agent.travelled/0.32);
                        const auto Mesh=VehicleParts[3+Wheel]->GetStaticMesh();
                        if(!Mesh)throw std::runtime_error("Vehicle body verification needs the actual tyre mesh bounds.");
                        FVector Radial=Transform.InverseTransformVectorNoScale(-FitUp);Radial.Z=0;Radial=Radial.GetSafeNormal();
                        const auto Bounds=Mesh->GetBounds();const double Radius=FMath::Max(Bounds.BoxExtent.X,Bounds.BoxExtent.Y);
                        const auto P=Transform.TransformPosition(Bounds.Origin+Radial*Radius);Actual[6+Wheel]={P.X,P.Y,P.Z};
                    }
                    Fit=VehicleBodySupportData->VerifyActual(Slot,Route.id,Actual);
                }
                if(Fit.valid){Origin.Z=Fit.height*100;Pitch=Fit.pitch;Roll=Fit.roll;}
                // A refused pose stays visible and moving under the old pose.
                // Its cumulative refusal vetoes native acceptance below.
            }
            else if(SupportFailures==0)++SupportFailures;
            const FQuat Pose=FQuat(FVector::UpVector,Shibuya::NativeHeading(Agent.heading))*FQuat(FVector(0,1,0),-Pitch)*FQuat(FVector(1,0,0),Shibuya::NativeRoll(Roll));
            auto Set=[&](int32 Index,const FVector& Local,const FVector& Scale,const FQuat& Rotation=FQuat::Identity)
            { VehicleTransforms[Index][CarIndex]=FTransform(Pose*NativeJoint(Rotation),Origin+Pose.RotateVector(NativeLocal(Local)),Scale); };
            Set(0,FVector(0,0,68),FVector(4.25,1.75,0.80));
            Set(1,FVector(-15,0,119),FVector(2.15,1.60,0.36));
            Set(2,FVector(-15,0,108),FVector(2.28,1.65,0.41));
            for(int32 Wheel=0;Wheel<4;++Wheel)
            {
                VehicleTransforms[3+Wheel][CarIndex]=WheelPart(Origin,Pose,Wheel,false,Agent.travelled/0.32);
                // A visible wheel-face bar makes spin observable; a uniform
                // cylindrical tyre alone is rotationally symmetric.
                VehicleTransforms[10+Wheel][CarIndex]=WheelPart(Origin,Pose,Wheel,true,Agent.travelled/0.32);
            }
            Set(7,FVector(214,0,72),FVector(0.05,1.35,0.18));
            Set(8,FVector(-214,0,72),FVector(0.05,1.35,0.15));
            Set(9,FVector(0,0,31),FVector(3.65,1.50,0.08));
            ++CarIndex;
        }
    }
    for(int32 PartIndex=0;PartIndex<PedestrianParts.Num();++PartIndex)
        PedestrianParts[PartIndex]->BatchUpdateInstancesTransforms(0,PedestrianTransforms[PartIndex],false,true,false);
    for(int32 PartIndex=0;PartIndex<VehicleParts.Num();++PartIndex)
        VehicleParts[PartIndex]->BatchUpdateInstancesTransforms(0,VehicleTransforms[PartIndex],false,true,false);
}
TSharedPtr<FJsonObject> AShibuyaWorld::GeometrySnapshot() const
{
    auto Result=MakeShared<FJsonObject>();Result->SetObjectField(TEXT("native_frame"),Shibuya::NativeFrameJSON());
    Result->SetNumberField(TEXT("pedestrian_parts"),PedestrianParts.Num());Result->SetNumberField(TEXT("vehicle_parts"),VehicleParts.Num());
    bool Valid=PedestrianParts.Num()==10 && VehicleParts.Num()==14;
    TArray<TSharedPtr<FJsonValue>> People,Cars,Parts;
    auto Inspect=[&](const TArray<TObjectPtr<UInstancedStaticMeshComponent>>& Components,int32 Expected,TArray<TSharedPtr<FJsonValue>>& Bodies,const FString& Kind)
    {
        for(int32 PartIndex=0;PartIndex<Components.Num();++PartIndex)
        {
            const auto* Component=Components[PartIndex].Get();auto Record=MakeShared<FJsonObject>();
            Record->SetStringField(TEXT("kind"),Kind);Record->SetNumberField(TEXT("part"),PartIndex);Record->SetNumberField(TEXT("actual_instance_count"),Component->GetInstanceCount());
            Record->SetStringField(TEXT("mesh_asset"),Component->GetStaticMesh()?Component->GetStaticMesh()->GetPathName():TEXT("missing"));
            Record->SetStringField(TEXT("material_asset"),Component->GetMaterial(0)?Component->GetMaterial(0)->GetPathName():TEXT("missing"));
            Valid=Valid&&Component->GetInstanceCount()==Expected;
            TArray<TSharedPtr<FJsonValue>> Samples;
            TArray<TSharedPtr<FJsonValue>> RelativeRotations;
            for(int32 Instance=0;Instance<Component->GetInstanceCount();++Instance)
            {
                FTransform Transform;
                if(!Component->GetInstanceTransform(Instance,Transform,true) || Transform.ContainsNaN()){Valid=false;continue;}
                const FVector Position=Transform.GetTranslation();
                if(PartIndex==0)Bodies.Add(MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(Position.X),MakeShared<FJsonValueNumber>(Position.Y),MakeShared<FJsonValueNumber>(Position.Z)}));
                if(Instance<3)
                {
                    const FVector Rotation=Transform.GetRotation().Euler();
                    Samples.Add(MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(Position.X),MakeShared<FJsonValueNumber>(Position.Y),MakeShared<FJsonValueNumber>(Position.Z),MakeShared<FJsonValueNumber>(Rotation.X),MakeShared<FJsonValueNumber>(Rotation.Y),MakeShared<FJsonValueNumber>(Rotation.Z)}));
                    FTransform Body;if(Components[0]->GetInstanceTransform(Instance,Body,true))
                    {const FVector Joint=(Body.GetRotation().Inverse()*Transform.GetRotation()).Euler();RelativeRotations.Add(MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(Joint.X),MakeShared<FJsonValueNumber>(Joint.Y),MakeShared<FJsonValueNumber>(Joint.Z)}));}
                }
            }
            Record->SetArrayField(TEXT("sample_world_transforms"),Samples);Record->SetArrayField(TEXT("sample_body_relative_rotations_degrees"),RelativeRotations);Parts.Add(MakeShared<FJsonValueObject>(Record));
        }
    };
    Inspect(PedestrianParts,PedestrianCount,People,TEXT("pedestrian"));Inspect(VehicleParts,VehicleCount,Cars,TEXT("vehicle"));
    TArray<TSharedPtr<FJsonValue>> Generations;for(const auto& Agent:Simulation.agents)if(Simulation.routes[Agent.route].kind==Shibuya::Kind::Vehicle)Generations.Add(MakeShared<FJsonValueNumber>(Agent.generation));
    Result->SetArrayField(TEXT("vehicle_generations"),Generations);
    // Bound actual mesh boxes in each rendered car's heading frame. Wheel spin
    // preserves Y; its XZ radius supplies a conservative envelope for all angles.
    double MaximumX=0,MaximumY=0,WheelX=0,WheelY=0;bool Envelope=VehicleParts.Num()==14;
    for(int32 PartIndex=0;PartIndex<VehicleParts.Num();++PartIndex)
    {
        const auto* Component=VehicleParts[PartIndex].Get();const auto Mesh=Component->GetStaticMesh();if(!Mesh){Envelope=false;continue;}
        FVector Vertices[8];Mesh->GetBounds().GetBox().GetVertices(Vertices);
        for(int32 Instance=0;Instance<Component->GetInstanceCount();++Instance)
        {
            FTransform Body,Transform;
            if(!VehicleParts[0]->GetInstanceTransform(Instance,Body,true)||!Component->GetInstanceTransform(Instance,Transform,true)){Envelope=false;continue;}
            const FTransform Pose(Body.GetRotation(),Body.GetTranslation()-Body.GetRotation().RotateVector(FVector(0,0,68)),FVector::OneVector);
            for(const auto& V:Vertices){const FVector Local=Pose.InverseTransformPosition(Transform.TransformPosition(V));MaximumX=FMath::Max(MaximumX,FMath::Abs(Local.X));MaximumY=FMath::Max(MaximumY,FMath::Abs(Local.Y));}
        }
        if((PartIndex>=3&&PartIndex<=6)||PartIndex>=10)
        {
            const bool Face=PartIndex>=10;const int32 Wheel=Face?PartIndex-10:PartIndex-3;
            const FTransform Base=WheelPart(FVector::ZeroVector,FQuat::Identity,Wheel,Face,0);
            for(const auto& V:Vertices)
            {
                const FVector Offset=Base.TransformVector(V);WheelX=FMath::Max(WheelX,FMath::Abs(Base.GetTranslation().X)+std::hypot(Offset.X,Offset.Z));
                WheelY=FMath::Max(WheelY,FMath::Abs(Base.GetTranslation().Y+Offset.Y));
            }
        }
    }
    Envelope=Envelope&&MaximumX<=220.0001&&MaximumY<=90.0001&&WheelX<=220.0001&&WheelY<=90.0001;
    Result->SetBoolField(TEXT("actual_mesh_footprint_verified"),Envelope);Result->SetNumberField(TEXT("actual_mesh_half_length_cm"),MaximumX);Result->SetNumberField(TEXT("actual_mesh_half_width_cm"),MaximumY);
    Result->SetNumberField(TEXT("all_wheel_angles_half_length_cm"),WheelX);Result->SetNumberField(TEXT("all_wheel_angles_half_width_cm"),WheelY);
    Result->SetStringField(TEXT("footprint_bound"),TEXT("Actual native asset boxes and world instance transforms within4.4x1.8m; wheel Y invariant and conservative XZ radius bound every rotation angle."));
    Result->SetBoolField(TEXT("actual_counts_and_transforms_valid"),Valid);Result->SetArrayField(TEXT("pedestrian_body_positions_cm"),People);
    Result->SetArrayField(TEXT("vehicle_body_positions_cm"),Cars);Result->SetArrayField(TEXT("parts"),Parts);return Result;
}

TSharedPtr<FJsonObject> AShibuyaWorld::PhysicsSnapshot() const
{
    auto Result=MakeShared<FJsonObject>();Result->SetObjectField(TEXT("native_frame"),Shibuya::NativeFrameJSON());int32 Traces=0,Failures=0,SourceTraces=0,SourceFailures=0;double MaximumGap=0,MaximumSourceResidual=0;
    TArray<size_t> People,Cars;
    for(size_t Slot=0;Slot<Simulation.agents.size();++Slot)
        (Simulation.routes[Simulation.agents[Slot].route].kind==Shibuya::Kind::Pedestrian?People:Cars).Add(Slot);
    TArray<TSharedPtr<FJsonValue>> Examples;TMap<FString,int32> ExampleCounts;
    auto Ground=[&](const FVector& Position,const FString& Kind,const FString& Contact,size_t Slot,int32 Instance,int32 Part)
    {
        ++Traces;FHitResult Hit;FCollisionQueryParams Query(SCENE_QUERY_STAT(ShibuyaRenderedContact),true,this);
        Query.bReturnFaceIndex=true;
        const bool Found=GetWorld()->LineTraceSingleByChannel(Hit,Position+FVector(0,0,80),Position-FVector(0,0,100),ECC_Visibility,Query);
        FString Reason=TEXT("miss");
        if(!Found)++Failures;
        else
        {
            const double Gap=FMath::Abs(Hit.ImpactPoint.Z-Position.Z);MaximumGap=FMath::Max(MaximumGap,Gap);
            Reason=Gap>20?TEXT("gap"):Hit.ImpactNormal.Z<0.7?TEXT("normal"):TEXT("pass");
            if(Gap>20 || Hit.ImpactNormal.Z<0.7)++Failures;
        }
        auto SourceProof=MakeShared<FJsonObject>();
        if(Kind!=TEXT("shoe"))
        {
            ++SourceTraces;bool Matched=false;
            try
            {
                if(VehicleBodySupportData&&Slot<Simulation.agents.size())
                {
                    const auto& Agent=Simulation.agents[Slot];const auto& Route=Simulation.routes[Agent.route];
                    const auto* Window=VehicleBodySupportData->Window(Route.id,Agent.distance);
                    if(Window)
                    {
                        const auto* NativeComponent=Found?Cast<UStaticMeshComponent>(Hit.GetComponent()):nullptr;
                        const std::string Preferred=NativeComponent&&NativeComponent->GetStaticMesh()?TCHAR_TO_UTF8(*NativeComponent->GetStaticMesh()->GetPathName()):"";
                        const Shibuya::BodyPoint Native{Position.X,Position.Y,Position.Z};
                        const auto SourceHit=VehicleBodySupportData->Query(Shibuya::NativeCMToSource(Native),Agent.position.z,*Window,&Native,Preferred);
                        SourceProof->SetBoolField(TEXT("found"),SourceHit.found);SourceProof->SetBoolField(TEXT("eligible"),SourceHit.eligible);SourceProof->SetBoolField(TEXT("same_first_hit"),SourceHit.sameFirstHit);
                        if(SourceHit.found&&SourceHit.face<VehicleBodySupportData->faces.size())
                        {
                            const auto& Face=VehicleBodySupportData->faces[SourceHit.face];
                            SourceProof->SetStringField(TEXT("source_path"),UTF8_TO_TCHAR(Face.sourcePath.c_str()));SourceProof->SetStringField(TEXT("mesh_path"),UTF8_TO_TCHAR(Face.meshPath.c_str()));
                            SourceProof->SetNumberField(TEXT("source_triangle"),Face.triangle);SourceProof->SetNumberField(TEXT("height_cm"),SourceHit.height*100);SourceProof->SetNumberField(TEXT("signed_normal_z"),SourceHit.normalZ);
                            const auto* Component=Found?Cast<UStaticMeshComponent>(Hit.GetComponent()):nullptr;
                            const double Residual=Found?std::abs(SourceHit.height*100-Hit.ImpactPoint.Z):INFINITY;
                            if(Found)MaximumSourceResidual=std::max(MaximumSourceResidual,Residual);
                            Matched=Found&&SourceHit.eligible&&SourceHit.sameFirstHit&&Component&&Component->GetStaticMesh()&&
                                Component->GetStaticMesh()->GetPathName()==UTF8_TO_TCHAR(Face.meshPath.c_str())&&Residual<=VehicleBodySupportData->nativeSourceToleranceCM;
                        }
                    }
                }
            }
            catch(const std::exception&){SourceProof->SetStringField(TEXT("reason"),TEXT("qualified_source_query_refused"));}
            SourceProof->SetBoolField(TEXT("native_matches_source"),Matched);
            if(!Matched){++SourceFailures;if(VehicleBodySupportData)++VehicleBodySupportData->nativeContactFailures;if(Reason==TEXT("pass")){Reason=TEXT("source");++Failures;}}
        }
        const FString Key=Kind+TEXT("/")+Reason;int32& Count=ExampleCounts.FindOrAdd(Key);
        if(Count<(Reason==TEXT("pass")?1:8))
        {++Count;auto Example=SupportContactExample(Kind,Contact,Slot,Instance,Part,Position,Found?&Hit:nullptr,80,100);if(Kind!=TEXT("shoe")){Example->SetObjectField(TEXT("body_source_first_hit"),SourceProof);Example->SetStringField(TEXT("native_contact_reason"),Example->GetStringField(TEXT("reason")));Example->SetStringField(TEXT("reason"),Reason);}Examples.Add(MakeShared<FJsonValueObject>(Example));}
    };
    for(int32 Person=0;Person<PedestrianCount;++Person)for(int32 Shoe:{7,8})
    {
        if(Person>=People.Num()){++Failures;continue;}
        FTransform Transform;const auto* Part=PedestrianParts[Shoe].Get();const auto Mesh=Part->GetStaticMesh();
        if(!Mesh || !Part->GetInstanceTransform(Person,Transform,true)){++Failures;continue;}
        FVector Corners[8];Mesh->GetBounds().GetBox().GetVertices(Corners);FVector Bottom=Transform.TransformPosition(Corners[0]);
        for(const auto& V:Corners){const auto P=Transform.TransformPosition(V);if(P.Z<Bottom.Z)Bottom=P;}
        Ground(Bottom,TEXT("shoe"),Shoe==7?TEXT("left_shoe_bottom"):TEXT("right_shoe_bottom"),People[Person],Person,Shoe);
    }
    for(int32 Car=0;Car<VehicleCount;++Car)
    {
        if(Car>=Cars.Num()){++Failures;continue;}
        FTransform Body;if(!VehicleParts[0]->GetInstanceTransform(Car,Body,true)){++Failures;continue;}
        const FVector Up=Body.GetRotation().RotateVector(FVector::UpVector);
        const FTransform Pose(Body.GetRotation(),Body.GetTranslation()-Up*68,FVector::OneVector);
        // Ground the actual pitched/rolled car plane at front/back and corners,
        // plus circular tyre contacts using the actual mesh bound and transform.
        int32 Contact=0;
        for(const FVector& P:{FVector(220,0,0),FVector(-220,0,0),FVector(220,90,0),FVector(220,-90,0),FVector(-220,90,0),FVector(-220,-90,0)})
        {Ground(Pose.TransformPosition(P),Contact<2?TEXT("body_end"):TEXT("body_corner"),FString::Printf(TEXT("body_plane_%d"),Contact),Cars[Car],Car,0);++Contact;}
        for(int32 Wheel=3;Wheel<=6;++Wheel)
        {
            FTransform Transform;const auto* Part=VehicleParts[Wheel].Get();const auto Mesh=Part->GetStaticMesh();
            if(!Mesh || !Part->GetInstanceTransform(Car,Transform,true)){++Failures;continue;}
            FVector Radial=Transform.InverseTransformVectorNoScale(-Up);Radial.Z=0;Radial=Radial.GetSafeNormal();
            const auto Bounds=Mesh->GetBounds();const double Radius=FMath::Max(Bounds.BoxExtent.X,Bounds.BoxExtent.Y);
            Ground(Transform.TransformPosition(Bounds.Origin+Radial*Radius),TEXT("tyre"),FString::Printf(TEXT("wheel_%d_bottom"),Wheel-3),Cars[Car],Car,Wheel);
        }
    }
    Result->SetNumberField(TEXT("fixed_steps"),Simulation.Steps());Result->SetNumberField(TEXT("actual_contact_traces"),Traces);Result->SetNumberField(TEXT("failures"),Failures);Result->SetNumberField(TEXT("maximum_ground_gap_cm"),MaximumGap);
    Result->SetArrayField(TEXT("contact_examples"),Examples);
    Result->SetNumberField(TEXT("body_source_contact_checks"),SourceTraces);Result->SetNumberField(TEXT("body_source_contact_failures"),SourceFailures);Result->SetNumberField(TEXT("maximum_source_native_residual_cm"),MaximumSourceResidual);
    Result->SetStringField(TEXT("examples_bound"),TEXT("At most8 failures per shoe/tyre/body_end/body_corner and miss/gap/normal/source reason, plus1 success per kind; existing native rays and native thresholds are preserved. Counts include every actual contact and every car source/native comparison."));
    auto BodySupport=MakeShared<FJsonObject>();
    BodySupport->SetBoolField(TEXT("available"),static_cast<bool>(VehicleBodySupportData));
    BodySupport->SetNumberField(TEXT("unavailable_failures"),SupportFailures);
    if(VehicleBodySupportData)
    {
        const auto& B=*VehicleBodySupportData;
        BodySupport->SetStringField(TEXT("packet_sha256"),UTF8_TO_TCHAR(B.generationDigest.c_str()));
        BodySupport->SetNumberField(TEXT("evaluations"),B.evaluations);BodySupport->SetNumberField(TEXT("qualified_points"),B.qualifiedPoints);
        BodySupport->SetNumberField(TEXT("cumulative_failures"),B.failures);BodySupport->SetNumberField(TEXT("changed_first_hit_failures"),B.changedFirstHits);
        BodySupport->SetNumberField(TEXT("native_source_contact_failures"),B.nativeContactFailures);
        BodySupport->SetNumberField(TEXT("ineligible_failures"),B.ineligible);BodySupport->SetNumberField(TEXT("footprint_failures"),B.footprintFailures);
    }
    Result->SetObjectField(TEXT("vehicle_body_support"),BodySupport);
    const bool PosesPassed=VehicleCount==0||(VehicleBodySupportData&&VehicleBodySupportData->failures==0&&VehicleBodySupportData->nativeContactFailures==0&&SupportFailures==0);
    Result->SetBoolField(TEXT("passed"),Traces==PedestrianCount*2+VehicleCount*10&&Failures==0&&PosesPassed);
    Result->SetStringField(TEXT("bound"),TEXT("Sampled real game visibility physics at actual shoe bounds, actual tilted tyre contacts and car front/back/corners; gap<=20cm and normal.Z>=0.7. Discrete motion samples do not prove continuous support."));return Result;
}
