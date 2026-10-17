#include "ShibuyaWorld.h"
#include "RuntimeFiles.h"
#include "RuntimePath.h"
#include "ShibuyaRendererLibrary.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/LocalPlayer.h"
#include "Components/InputComponent.h"
#include "GameFramework/InputSettings.h"
#include "GameFramework/PlayerInput.h"
#include "GenericPlatform/GenericPlatformInputDeviceMapper.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "InputKeyEventArgs.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Misc/Guid.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformMemory.h"
#include "UnrealClient.h"
#include "RHI.h"
#include "GenericPlatform/GenericPlatformDriver.h"

namespace
{
AShibuyaWorld* City(UWorld* World) { for(TActorIterator<AShibuyaWorld> It(World);It;++It)return *It;return nullptr; }
FString ReportPath(const FString& Relative)
{
    if(!Relative.StartsWith(TEXT("Artifacts/")))throw std::runtime_error("Runtime check output needs a project-relative Artifacts path.");
    return Shibuya::ConfinedProjectFile(Relative,false);
}
double Quantile(TArray<double> Samples,double Fraction)
{
    if(Samples.IsEmpty())return 0;Samples.Sort();return Samples[FMath::Clamp(static_cast<int32>(Fraction*(Samples.Num()-1)),0,Samples.Num()-1)];
}
}
void AShibuyaController::BeginPlay()
{
    Super::BeginPlay();bShowMouseCursor=false;SetInputMode(FInputModeGameOnly());
    Probe=FParse::Value(FCommandLine::Get(),TEXT("ShibuyaRuntimeCheck="),CheckOutput);
    NegativeInput=FParse::Param(FCommandLine::Get(),TEXT("ShibuyaDisableProbeInput"));
    InventoryOnly=FParse::Param(FCommandLine::Get(),TEXT("ShibuyaAssetInventoryOnly"));
    FParse::Value(FCommandLine::Get(),TEXT("ShibuyaRuntimeCapture="),CaptureOutput);
    FParse::Value(FCommandLine::Get(),TEXT("ShibuyaBenchmarkSeconds="),BenchmarkSeconds);
    if(!FMath::IsFinite(BenchmarkSeconds) || BenchmarkSeconds<10 || BenchmarkSeconds>120)BenchmarkSeconds=30;
    if(Probe)
    {
        try
        {
            ProbeRunId=FGuid::NewGuid().ToString(EGuidFormats::Digits);
            FParse::Value(FCommandLine::Get(),TEXT("ShibuyaRunId="),ProbeRunId);
            if(ProbeRunId.Len()!=32)throw std::runtime_error("Runtime check run id needs32 hexadecimal digits.");
            for(TCHAR C:ProbeRunId)if(!FChar::IsHexDigit(C))throw std::runtime_error("Runtime check run id needs32 hexadecimal digits.");
            FailReportWrite=FParse::Param(FCommandLine::Get(),TEXT("ShibuyaFailReportWrite"));
            FString Path=ReportPath(CheckOutput);
            if(!IFileManager::Get().DirectoryExists(*FPaths::GetPath(Path)) && !IFileManager::Get().MakeDirectory(*FPaths::GetPath(Path),true))
                throw std::runtime_error("Runtime check could not prepare its report directory.");
            Path=ReportPath(CheckOutput);
            if(IFileManager::Get().FileExists(*Path) && !IFileManager::Get().Delete(*Path,false,false,true))
                throw std::runtime_error("Runtime check could not remove its prior receipt; use a writable fresh output path.");
            if(IFileManager::Get().FileExists(*Path))throw std::runtime_error("A prior runtime receipt survived preparation.");
            ConsoleCommand(TEXT("stat unit"),false);
        }
        catch(const std::exception& Failure)
        {Finished=true;UE_LOG(LogTemp,Error,TEXT("SHIBUYA_RUNTIME_CHECK FAIL report preparation: %s"),UTF8_TO_TCHAR(Failure.what()));FPlatformMisc::RequestExitWithStatus(false,2);}
    }
}
bool AShibuyaController::InjectKey(FKey Key,EInputEvent Event)
{
    return InjectEvent(Key,Event,1,0,false);
}
bool AShibuyaController::InjectAxis(FKey Key,float Amount,float DeltaTime)
{
    return InjectEvent(Key,IE_Axis,Amount,DeltaTime,true);
}
TSharedPtr<FJsonObject> AShibuyaController::InputRoutingSnapshot() const
{
    auto Result=MakeShared<FJsonObject>();
    const auto* Local=GetLocalPlayer();auto* Viewport=GEngine?GEngine->GameViewport.Get():nullptr;
    const auto& Mapper=IPlatformInputDeviceMapper::Get();
    const auto User=Local?Local->GetPlatformUserId():PLATFORMUSERID_NONE;
    const auto Device=Mapper.GetPrimaryInputDeviceForUser(User);
    const auto* Target=Viewport?GEngine->GetLocalPlayerFromInputDevice(Viewport,Device):nullptr;
    const auto* OldTarget=Viewport?GEngine->GetLocalPlayerFromInputDevice(Viewport,INPUTDEVICEID_NONE):nullptr;
    Result->SetNumberField(TEXT("attempted_events"),InputAttempts);Result->SetNumberField(TEXT("handled_events"),InputHandled);
    Result->SetNumberField(TEXT("suppressed_events"),InputSuppressed);Result->SetNumberField(TEXT("route_failures"),InputRouteFailures);
    Result->SetBoolField(TEXT("injection_suppressed"),NegativeInput);
    Result->SetNumberField(TEXT("platform_user_id"),User.GetInternalId());Result->SetNumberField(TEXT("primary_device_id"),Device.GetId());
    Result->SetNumberField(TEXT("device_mapped_user_id"),Mapper.GetUserForInputDevice(Device).GetInternalId());
    Result->SetNumberField(TEXT("old_invalid_device_mapped_user_id"),Mapper.GetUserForInputDevice(INPUTDEVICEID_NONE).GetInternalId());
    Result->SetStringField(TEXT("local_player"),Local?Local->GetPathName():TEXT("missing"));
    Result->SetStringField(TEXT("viewport_target_player"),Target?Target->GetPathName():TEXT("missing"));
    Result->SetStringField(TEXT("old_invalid_device_target_player"),OldTarget?OldTarget->GetPathName():TEXT("missing"));
    Result->SetStringField(TEXT("controller"),GetPathName());Result->SetStringField(TEXT("pawn"),GetPawn()?GetPawn()->GetPathName():TEXT("missing"));
    Result->SetBoolField(TEXT("registered_device_routes_to_this_controller"),Local&&User.IsValid()&&Device.IsValid()&&Mapper.GetUserForInputDevice(Device)==User&&Target==Local&&Target->PlayerController==this&&Local->GetViewportClient()==Viewport);
    Result->SetBoolField(TEXT("ignore_input"),!Viewport||Viewport->IgnoreInput());
    Result->SetBoolField(TEXT("viewport_has_focus"),Viewport&&Viewport->Viewport&&Viewport->Viewport->HasFocus());
    Result->SetBoolField(TEXT("viewport_has_mouse_capture"),Viewport&&Viewport->Viewport&&Viewport->Viewport->HasMouseCapture());
    Result->SetStringField(TEXT("actual_player_input_class"),PlayerInput?PlayerInput->GetClass()->GetPathName():TEXT("missing"));
    Result->SetStringField(TEXT("actual_pawn_input_component_class"),GetPawn()&&GetPawn()->InputComponent?GetPawn()->InputComponent->GetClass()->GetPathName():TEXT("missing"));
    Result->SetNumberField(TEXT("configured_action_mappings"),GetDefault<UInputSettings>()->GetActionMappings().Num());
    Result->SetNumberField(TEXT("configured_axis_mappings"),GetDefault<UInputSettings>()->GetAxisMappings().Num());
    return Result;
}
bool AShibuyaController::InjectEvent(FKey Key,EInputEvent Event,float Amount,float DeltaTime,bool Axis)
{
    ++InputAttempts;auto Record=InputRoutingSnapshot();Record->SetStringField(TEXT("key"),Key.ToString());
    Record->SetNumberField(TEXT("event"),static_cast<int32>(Event));Record->SetNumberField(TEXT("amount"),Amount);
    Record->SetNumberField(TEXT("elapsed_s"),ProbeTime);Record->SetBoolField(TEXT("axis"),Axis);
    bool Handled=false;
    if(NegativeInput)++InputSuppressed;
    else if(!Record->GetBoolField(TEXT("registered_device_routes_to_this_controller"))||!GEngine->GameViewport->Viewport)++InputRouteFailures;
    else
    {
        // Use the existing local player's registered device. CreateSimulated
        // preserves the supplied ID; INPUTDEVICEID_NONE cannot identify a user.
        // Route through the ordinary viewport, without changing focus, ignore
        // flags, pawn actions, movement, camera or controller rotation.
        const auto Device=IPlatformInputDeviceMapper::Get().GetPrimaryInputDeviceForUser(GetLocalPlayer()->GetPlatformUserId());
        auto Args=FInputKeyEventArgs::CreateSimulated(Key,Event,Amount,1,Device,false,GEngine->GameViewport->Viewport);
        Args.DeltaTime=DeltaTime;
        Handled=Axis?GEngine->GameViewport->InputAxis(Args):GEngine->GameViewport->InputKey(Args);
        if(Handled)++InputHandled;
    }
    Record->SetBoolField(TEXT("handled"),Handled);InputEvents.Add(MakeShared<FJsonValueObject>(Record));
    if(InputEvents.Num()>128)InputEvents.RemoveAt(0);
    return Handled;
}
void AShibuyaController::Record(const FString& Stage)
{
    auto Result=MakeShared<FJsonObject>();Result->SetStringField(TEXT("stage"),Stage);Result->SetNumberField(TEXT("elapsed_s"),ProbeTime);
    if(AShibuyaWorld* World=City(GetWorld())){Result->SetObjectField(TEXT("simulation"),World->Snapshot());Result->SetObjectField(TEXT("native_geometry"),World->GeometrySnapshot());}
    if(AShibuyaExplorer* Explorer=Cast<AShibuyaExplorer>(GetPawn()))Result->SetObjectField(TEXT("pawn"),Explorer->Snapshot());
    Result->SetObjectField(TEXT("input_routing"),InputRoutingSnapshot());
    Snapshots.Add(MakeShared<FJsonValueObject>(Result));
}
void AShibuyaController::RetainContactExamples(const TSharedPtr<FJsonObject>& Sample)
{
    TArray<TSharedPtr<FJsonValue>> Kept;
    for(const auto& Value:Sample->GetArrayField(TEXT("contact_examples")))
    {
        const auto Example=Value->AsObject();const FString Reason=Example->GetStringField(TEXT("reason"));
        int32& Count=ContactExampleCounts.FindOrAdd(Example->GetStringField(TEXT("contact_kind"))+TEXT("/")+Reason);
        if(Count<(Reason==TEXT("pass")?1:8)){++Count;Kept.Add(Value);}
    }
    Sample->SetArrayField(TEXT("contact_examples"),Kept);
    Sample->SetStringField(TEXT("retained_examples_bound"),TEXT("Across the entire probe, at most8 failures per contact kind/reason plus1 success per kind. Every sample's aggregate contact and failure counts are retained."));
}
void AShibuyaController::PlayerTick(float DeltaTime)
{
    Super::PlayerTick(DeltaTime);
    if(!Probe || Finished)return;
    ProbeTime+=DeltaTime;
    AShibuyaWorld* World=City(GetWorld());AShibuyaExplorer* Explorer=Cast<AShibuyaExplorer>(GetPawn());
    if(ProbeTime>50+BenchmarkSeconds || (World && !World->Ready)){FinishProbe();return;}
    if(!World || !Explorer || !World->Ready || ProbeTime<5)return;
    if(InventoryOnly)
    {
        if(!InitialAssets.IsValid()){InitialAssets=AssetSnapshot();Record(TEXT("inventory_loaded"));StageStarted=ProbeTime;}
        if(ProbeTime-StageStarted>=5){Record(TEXT("inventory_warm"));FinishProbe();}
        return;
    }
    if(!BenchmarkActive&&ProbeStage<14&&ProbeTime-LastPhysicsSample>=0.25&&PhysicsSamples.Num()<256)
    {auto Sample=World->PhysicsSnapshot();RetainContactExamples(Sample);Sample->SetNumberField(TEXT("elapsed_s"),ProbeTime);PhysicsSamples.Add(MakeShared<FJsonValueObject>(Sample));LastPhysicsSample=ProbeTime;}
    const double StageTime=ProbeTime-StageStarted;
    auto Next=[&](int32 Stage){ProbeStage=Stage;StageStarted=ProbeTime;};
    if(BenchmarkActive && World->Ready && !World->Simulation.paused)
    {
        FrameMilliseconds.Add(DeltaTime*1000);SimulationMilliseconds.Add(World->TickMilliseconds);
        if(GEngine&&GEngine->GameViewport)
            if(const auto* Units=GEngine->GameViewport->GetStatUnitData();Units&&Units->RawGPUFrameTime[0]>0)GPUMilliseconds.Add(Units->RawGPUFrameTime[0]);
    }
    if(ProbeStage==0)
    {
        InitialAssets=AssetSnapshot();InitialPosition=Explorer->GetActorLocation();InitialRotation=GetControlRotation();InitialStep=World->Simulation.Steps();
        Record(TEXT("initial"));InjectKey(EKeys::W,IE_Pressed);Next(1);
    }
    else if(ProbeStage==1 && StageTime>2)
    {
        InjectKey(EKeys::W,IE_Released);Record(TEXT("walk"));InjectAxis(EKeys::MouseX,40,DeltaTime);InjectAxis(EKeys::MouseY,-8,DeltaTime);Next(2);
    }
    else if(ProbeStage==2 && StageTime>0.3)
    {
        Record(TEXT("look"));InjectKey(EKeys::Tab,IE_Pressed);InjectKey(EKeys::Tab,IE_Released);Next(3);
    }
    else if(ProbeStage==3 && StageTime>0.3)
    {
        Record(TEXT("flight_mode"));InjectKey(EKeys::E,IE_Pressed);InjectKey(EKeys::LeftShift,IE_Pressed);Next(4);
    }
    else if(ProbeStage==4 && StageTime>1)
    {
        InjectKey(EKeys::E,IE_Released);InjectKey(EKeys::LeftShift,IE_Released);Record(TEXT("flight"));InjectKey(EKeys::Tab,IE_Pressed);InjectKey(EKeys::Tab,IE_Released);Next(5);
    }
    else if(ProbeStage==5 && StageTime>0.3)
    {Record(TEXT("walk_refused"));InjectKey(EKeys::Q,IE_Pressed);InjectKey(EKeys::LeftShift,IE_Pressed);Next(6);}
    else if(ProbeStage==6 && (Explorer->CanWalkHere() || StageTime>6 || NegativeInput))
    {InjectKey(EKeys::Q,IE_Released);InjectKey(EKeys::LeftShift,IE_Released);Record(TEXT("descent_ground"));Next(7);}
    else if(ProbeStage==7 && StageTime>0.3)
    {InjectKey(EKeys::Tab,IE_Pressed);InjectKey(EKeys::Tab,IE_Released);InjectKey(EKeys::W,IE_Pressed);Next(8);}
    else if(ProbeStage==8 && StageTime>1)
    {InjectKey(EKeys::W,IE_Released);Record(TEXT("walk_recovered"));InjectKey(EKeys::P,IE_Pressed);InjectKey(EKeys::P,IE_Released);Next(9);}
    else if(ProbeStage==9 && StageTime>0.3)
    {Record(TEXT("pause_start"));Next(10);}
    else if(ProbeStage==10 && StageTime>1)
    {Record(TEXT("pause_end"));InjectKey(EKeys::P,IE_Pressed);InjectKey(EKeys::P,IE_Released);Next(11);}
    else if(ProbeStage==11 && StageTime>1.1)
    {Record(TEXT("resume"));InjectKey(EKeys::R,IE_Pressed);InjectKey(EKeys::R,IE_Released);Next(12);}
    else if(ProbeStage==12 && StageTime>0.3)
    {Record(TEXT("reset"));Next(13);}
    else if(ProbeStage==13 && StageTime>3)
    {
        Record(TEXT("benchmark_start"));FrameMilliseconds.Empty();SimulationMilliseconds.Empty();GPUMilliseconds.Empty();BenchmarkActive=true;Next(14);
    }
    else if(ProbeStage==14 && StageTime>BenchmarkSeconds)
    {BenchmarkActive=false;Record(TEXT("benchmark_end"));if(!CaptureOutput.IsEmpty())FScreenshotRequest::RequestScreenshot(ReportPath(CaptureOutput),true,false);Next(15);}
    else if(ProbeStage==15 && StageTime>0.5)FinishProbe();
}
void AShibuyaController::FinishProbe()
{
    Finished=true;
    auto Report=MakeShared<FJsonObject>();Report->SetStringField(TEXT("bound"),TEXT("Native standalone game viewport input events, seeded fixed-step runtime motion and route/native collision support; screenshots and GPU performance require a hardware-rendered run."));
    Report->SetBoolField(TEXT("inventory_only"),InventoryOnly);Report->SetBoolField(TEXT("negative_input_control"),NegativeInput);Report->SetStringField(TEXT("input_entry"),TEXT("UGameViewportClient::InputKey/InputAxis"));
    Report->SetArrayField(TEXT("physics_motion_samples"),PhysicsSamples);
    Report->SetObjectField(TEXT("input_routing"),InputRoutingSnapshot());Report->SetArrayField(TEXT("input_event_attempts"),InputEvents);
    Report->SetArrayField(TEXT("snapshots"),Snapshots);Report->SetNumberField(TEXT("frame_samples"),FrameMilliseconds.Num());
    Report->SetNumberField(TEXT("frame_ms_p50"),Quantile(FrameMilliseconds,0.5));Report->SetNumberField(TEXT("frame_ms_p95"),Quantile(FrameMilliseconds,0.95));
    Report->SetNumberField(TEXT("simulation_ms_p95"),Quantile(SimulationMilliseconds,0.95));
    Report->SetNumberField(TEXT("gpu_ms_p95"),Quantile(GPUMilliseconds,0.95));Report->SetNumberField(TEXT("gpu_samples"),GPUMilliseconds.Num());
    Report->SetStringField(TEXT("rhi"),GDynamicRHI?GDynamicRHI->GetName():TEXT("unavailable"));Report->SetStringField(TEXT("adapter"),GRHIAdapterName);
    Report->SetStringField(TEXT("gpu_driver_version"),FPlatformMisc::GetGPUDriverInfo(GRHIAdapterName).UserDriverVersion);
    if(GEngine && GEngine->GameViewport && GEngine->GameViewport->Viewport)
    { const auto Size=GEngine->GameViewport->Viewport->GetSizeXY();Report->SetNumberField(TEXT("width"),Size.X);Report->SetNumberField(TEXT("height"),Size.Y); }
    bool Passed=Snapshots.Num()==14;
    TMap<FString,TSharedPtr<FJsonObject>> ByStage;
    for(const auto& Value:Snapshots){auto Object=Value->AsObject();ByStage.Add(Object->GetStringField(TEXT("stage")),Object);}
    auto Get=[&](const TCHAR* Stage,const TCHAR* Part)->TSharedPtr<FJsonObject>
    {const auto* Found=ByStage.Find(Stage);return Found?(*Found)->GetObjectField(Part):nullptr;};
    auto NativePoint=[](const TSharedPtr<FJsonObject>& Object,const TCHAR* Field)
    {const auto& Coordinates=Object->GetArrayField(Field);return FVector(Coordinates[0]->AsNumber(),Coordinates[1]->AsNumber(),Coordinates[2]->AsNumber());};
    auto Walk=Get(TEXT("walk"),TEXT("pawn")),Look=Get(TEXT("look"),TEXT("pawn")),Flight=Get(TEXT("flight"),TEXT("pawn"));
    auto PauseStart=Get(TEXT("pause_start"),TEXT("simulation")),PauseEnd=Get(TEXT("pause_end"),TEXT("simulation"));
    auto Resume=Get(TEXT("resume"),TEXT("simulation")),Reset=Get(TEXT("reset"),TEXT("pawn"));
    auto Refused=Get(TEXT("walk_refused"),TEXT("pawn")),Recovered=Get(TEXT("walk_recovered"),TEXT("pawn")),Descent=Get(TEXT("descent_ground"),TEXT("pawn"));
    bool WalkMoved=false,LookChanged=false,FlightMoved=false,PauseHeld=false,Resumed=false,ResetWorked=false,UnsupportedWalkRefused=false,WalkingRecovered=false;
    if(Walk && Look && Flight && PauseStart && PauseEnd && Resume && Reset)
    {
        WalkMoved=FVector::Dist2D(NativePoint(Walk,TEXT("position_cm")),InitialPosition)>20 && Walk->GetNumberField(TEXT("forward_input_events"))>0;
        LookChanged=FMath::Abs(NativePoint(Look,TEXT("control_rotation_degrees")).Y-InitialRotation.Yaw)>2 && Look->GetNumberField(TEXT("look_input_events"))>0;
        FlightMoved=NativePoint(Flight,TEXT("position_cm")).Z-InitialPosition.Z>100 && Flight->GetBoolField(TEXT("flying"));
        PauseHeld=PauseStart->GetBoolField(TEXT("paused")) && PauseEnd->GetBoolField(TEXT("paused")) && PauseStart->GetNumberField(TEXT("fixed_steps"))==PauseEnd->GetNumberField(TEXT("fixed_steps"));
        Resumed=!Resume->GetBoolField(TEXT("paused")) && Resume->GetNumberField(TEXT("fixed_steps"))>PauseEnd->GetNumberField(TEXT("fixed_steps"));
        ResetWorked=FVector::Dist(NativePoint(Reset,TEXT("position_cm")),InitialPosition)<5 && Reset->GetNumberField(TEXT("reset_input_events"))==1;
        UnsupportedWalkRefused=Refused&&Refused->GetBoolField(TEXT("flying"))&&!Refused->GetStringField(TEXT("movement_notice")).IsEmpty();
        WalkingRecovered=Recovered&&Descent&&FVector::Dist2D(NativePoint(Recovered,TEXT("position_cm")),NativePoint(Descent,TEXT("position_cm")))>20&&!Recovered->GetBoolField(TEXT("flying"))&&Recovered->GetNumberField(TEXT("mode_input_events"))>=3&&NativePoint(Recovered,TEXT("position_cm")).Z-InitialPosition.Z<100;
    }
    auto* World=City(GetWorld());
    if(World)
    {
        Report->SetObjectField(TEXT("load_state"),World->Snapshot());
        TSharedPtr<FJsonObject> Resources;
        if(FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(UShibuyaRendererLibrary::InspectWorldResources(World)),Resources))Report->SetObjectField(TEXT("renderer_resources"),Resources);
    }
    bool PopulationMoved=false,SupportValid=false,SeparationValid=false,NativeCounts=false,InputsStable=false,PeopleAnimated=false,VehiclesAnimated=false;
    if(World && World->Ready)
    {
        auto State=World->Snapshot();Report->SetObjectField(TEXT("final_simulation"),State);
        const auto Geometry=World->GeometrySnapshot();
        NativeCounts=Geometry->GetBoolField(TEXT("actual_counts_and_transforms_valid"))&&Geometry->GetBoolField(TEXT("actual_mesh_footprint_verified"));
        InputsStable=World->InputsUnchanged();
        auto ActualStart=Get(TEXT("benchmark_start"),TEXT("native_geometry")),ActualEnd=Get(TEXT("benchmark_end"),TEXT("native_geometry"));
        int32 MovedPeople=0,MovedCars=0;
        auto CountMoved=[&](const TCHAR* Field,int32 Expected)
        {
            if(!ActualStart||!ActualEnd)return 0;
            const auto& Before=ActualStart->GetArrayField(Field);const auto& After=ActualEnd->GetArrayField(Field);
            if(Before.Num()!=Expected||After.Num()!=Expected)return 0;
            int32 Count=0;
            for(int32 i=0;i<Expected;++i)
            {
                if(FString(Field)==TEXT("vehicle_body_positions_cm"))
                {
                    const auto& GenerationsBefore=ActualStart->GetArrayField(TEXT("vehicle_generations"));const auto& GenerationsAfter=ActualEnd->GetArrayField(TEXT("vehicle_generations"));
                    if(GenerationsBefore.Num()!=Expected||GenerationsAfter.Num()!=Expected)return 0;
                    if(GenerationsBefore[i]->AsNumber()!=GenerationsAfter[i]->AsNumber())continue;
                }
                const auto& A=Before[i]->AsArray();const auto& B=After[i]->AsArray();
                const double Distance=std::hypot(A[0]->AsNumber()-B[0]->AsNumber(),A[1]->AsNumber()-B[1]->AsNumber());
                if(Distance>10)++Count;
            }
            return Count;
        };
        MovedPeople=CountMoved(TEXT("pedestrian_body_positions_cm"),World->PedestrianCount);MovedCars=CountMoved(TEXT("vehicle_body_positions_cm"),World->VehicleCount);
        auto JointMoved=[&](const FString& Kind,int32 First,int32 Last)
        {
            if(!ActualStart||!ActualEnd)return false;
            const auto& A=ActualStart->GetArrayField(TEXT("parts"));const auto& B=ActualEnd->GetArrayField(TEXT("parts"));if(A.Num()!=B.Num())return false;
            for(int32 p=0;p<A.Num();++p)
            {
                const auto Before=A[p]->AsObject(),After=B[p]->AsObject();const int32 Part=static_cast<int32>(Before->GetNumberField(TEXT("part")));
                if(Before->GetStringField(TEXT("kind"))!=Kind||Part<First||Part>Last)continue;
                const auto& RotationsA=Before->GetArrayField(TEXT("sample_body_relative_rotations_degrees"));const auto& RotationsB=After->GetArrayField(TEXT("sample_body_relative_rotations_degrees"));
                if(RotationsA.Num()!=RotationsB.Num())return false;
                for(int32 i=0;i<RotationsA.Num();++i)
                {
                    if(Kind==TEXT("vehicle")&&ActualStart->GetArrayField(TEXT("vehicle_generations"))[i]->AsNumber()!=ActualEnd->GetArrayField(TEXT("vehicle_generations"))[i]->AsNumber())continue;
                    const auto& X=RotationsA[i]->AsArray();const auto& Y=RotationsB[i]->AsArray();if(X.Num()!=3||Y.Num()!=3)return false;
                    for(int32 Axis=0;Axis<3;++Axis)if(std::abs(std::remainder(Y[Axis]->AsNumber()-X[Axis]->AsNumber(),360.0))>1)return true;
                }
            }
            return false;
        };
        PeopleAnimated=JointMoved(TEXT("pedestrian"),3,6);VehiclesAnimated=JointMoved(TEXT("vehicle"),10,13);
        Report->SetBoolField(TEXT("native_pedestrian_gait_rotated"),PeopleAnimated);Report->SetBoolField(TEXT("native_vehicle_spokes_rotated"),VehiclesAnimated);
        Report->SetNumberField(TEXT("actual_native_people_displaced"),MovedPeople);Report->SetNumberField(TEXT("actual_native_cars_displaced"),MovedCars);
        PopulationMoved=MovedPeople>World->PedestrianCount*0.1&&MovedCars>World->VehicleCount*0.1;
        Report->SetStringField(TEXT("native_motion_bound"),TEXT("Actual body world positions differ by>10cm across benchmark; vehicles with changed generation are excluded so lifecycle jumps cannot count as motion."));
        uint64 SupportErrors=0,SeparationErrors=0;int32 PersonInstance=0,CarInstance=0;
        TArray<TSharedPtr<FJsonValue>> CentreExamples;TMap<FString,int32> CentreExampleCounts;
        Shibuya::Grid Grid(5.0);
        for(size_t i=0;i<World->Simulation.agents.size();++i)
        {
            const auto& Agent=World->Simulation.agents[i];const auto& Route=World->Simulation.routes[Agent.route];
            const bool Person=Route.kind==Shibuya::Kind::Pedestrian;const int32 Instance=Person?PersonInstance++:CarInstance++;
            const FVector Feet(Agent.position.x*100,Agent.position.y*100,Agent.position.z*100);
            FCollisionQueryParams Query(SCENE_QUERY_STAT(ShibuyaAgentSupport),true,World);FHitResult Ground;
            Query.bReturnFaceIndex=true;
            const bool Found=GetWorld()->LineTraceSingleByChannel(Ground,Feet+FVector(0,0,100),Feet-FVector(0,0,120),ECC_Visibility,Query);
            const FString Reason=!Found?TEXT("miss"):FMath::Abs(Ground.ImpactPoint.Z-Feet.Z)>20?TEXT("gap"):TEXT("pass");
            if(!Found || FMath::Abs(Ground.ImpactPoint.Z-Feet.Z)>20)++SupportErrors;
            const FString Kind=Person?TEXT("pedestrian_centre"):TEXT("vehicle_centre");int32& Count=CentreExampleCounts.FindOrAdd(Kind+TEXT("/")+Reason);
            if(Count<(Reason==TEXT("pass")?1:8))
            {++Count;CentreExamples.Add(MakeShared<FJsonValueObject>(World->SupportContactExample(Kind,TEXT("source_foot_origin"),i,Instance,-1,Feet,Found?&Ground:nullptr,100,120,false)));}
            Grid.Neighbours(Agent.position,[&](size_t Other)
            {
                const auto& Neighbour=World->Simulation.agents[Other];
                if(Shibuya::FootprintsOverlap(Route.kind,Agent.position,Agent.heading,World->Simulation.routes[Neighbour.route].kind,Neighbour.position,Neighbour.heading))++SeparationErrors;
            },6.0);
            Grid.Insert(Agent.position,i);
        }
        Report->SetNumberField(TEXT("native_support_failures"),SupportErrors);Report->SetNumberField(TEXT("separation_failures"),SeparationErrors);
        Report->SetArrayField(TEXT("centre_support_examples"),CentreExamples);
        SupportValid=SupportErrors==0&&PhysicsSamples.Num()>=20;
        for(const auto& Sample:PhysicsSamples)SupportValid=SupportValid&&Sample->AsObject()->GetBoolField(TEXT("passed"));
        const auto EndContacts=World->PhysicsSnapshot();RetainContactExamples(EndContacts);Report->SetObjectField(TEXT("final_rendered_contacts"),EndContacts);SupportValid=SupportValid&&EndContacts->GetBoolField(TEXT("passed"));
        SeparationValid=SeparationErrors==0;
    }
    Report->SetBoolField(TEXT("walk_input_moved"),WalkMoved);Report->SetBoolField(TEXT("look_input_changed"),LookChanged);Report->SetBoolField(TEXT("flight_input_moved"),FlightMoved);
    Report->SetBoolField(TEXT("pause_held"),PauseHeld);Report->SetBoolField(TEXT("resume_advanced"),Resumed);Report->SetBoolField(TEXT("reset_restored"),ResetWorked);
    Report->SetBoolField(TEXT("both_populations_moved"),PopulationMoved);Report->SetBoolField(TEXT("native_support_verified"),SupportValid);Report->SetBoolField(TEXT("agent_separation_verified"),SeparationValid);
    Report->SetBoolField(TEXT("unsupported_walk_visibly_refused"),UnsupportedWalkRefused);Report->SetBoolField(TEXT("walking_recovered_through_input"),WalkingRecovered);
    Report->SetBoolField(TEXT("actual_native_population_verified"),NativeCounts);Report->SetBoolField(TEXT("actual_inputs_unchanged"),InputsStable);
    auto BenchmarkStart=Get(TEXT("benchmark_start"),TEXT("simulation")),BenchmarkEnd=Get(TEXT("benchmark_end"),TEXT("simulation"));
    const bool ActiveBenchmark=BenchmarkStart&&BenchmarkEnd&&!BenchmarkStart->GetBoolField(TEXT("paused"))&&!BenchmarkEnd->GetBoolField(TEXT("paused"))&&BenchmarkEnd->GetNumberField(TEXT("fixed_steps"))>BenchmarkStart->GetNumberField(TEXT("fixed_steps"))+BenchmarkSeconds*59;
    Report->SetBoolField(TEXT("benchmark_unpaused_warm_interval"),ActiveBenchmark);Report->SetNumberField(TEXT("benchmark_seconds"),BenchmarkSeconds);
    const auto Memory=FPlatformMemory::GetStats();Report->SetNumberField(TEXT("process_physical_bytes"),Memory.UsedPhysical);Report->SetNumberField(TEXT("process_peak_physical_bytes"),Memory.PeakUsedPhysical);
    const bool Hardware=GDynamicRHI&&FString(GDynamicRHI->GetName()).Contains(TEXT("D3D"))&&!GRHIAdapterName.Contains(TEXT("Basic Render"))&&!GRHIAdapterName.Contains(TEXT("WARP"));
    const bool FullHD=GEngine&&GEngine->GameViewport&&GEngine->GameViewport->Viewport&&GEngine->GameViewport->Viewport->GetSizeXY()==FIntPoint(1920,1080);
    const bool Performance=BenchmarkSeconds>=30&&Hardware&&FullHD&&NativeCounts&&World&&World->PedestrianCount==3000&&World->VehicleCount==200&&ActiveBenchmark&&FrameMilliseconds.Num()>=BenchmarkSeconds*30&&GPUMilliseconds.Num()>FrameMilliseconds.Num()*0.8&&Quantile(FrameMilliseconds,0.95)<=1000.0/60&&Quantile(GPUMilliseconds,0.95)<=1000.0/60;
    Report->SetBoolField(TEXT("performance_target_passed"),Performance);Report->SetStringField(TEXT("performance_bound"),TEXT("Warm active 3000/200 native-instance game rendering at1920x1080; game-frame elapsed p95<=16.667ms; headless throughput, not display presentation latency."));
    const auto FinalAssets=AssetSnapshot();Report->SetObjectField(TEXT("actual_assets_after"),FinalAssets);
    if(InitialAssets.IsValid())Report->SetObjectField(TEXT("actual_assets_before"),InitialAssets);
    if(InventoryOnly)
    {
        Passed=World&&World->Ready&&NativeCounts&&InputsStable&&InitialAssets.IsValid()&&InitialAssets->GetBoolField(TEXT("valid"))&&FinalAssets->GetBoolField(TEXT("valid"))&&Snapshots.Num()==2;
        Report->SetBoolField(TEXT("passed"),Passed);Report->SetStringField(TEXT("run_id"),ProbeRunId);
        Report->SetStringField(TEXT("bound"),TEXT("Inventory-only: actual ready loaded native map and asset packages after5 seconds of game draw warming; ordinary controls and performance not exercised."));
    }
    else Passed=Passed&&WalkMoved&&LookChanged&&FlightMoved&&PauseHeld&&Resumed&&ResetWorked&&UnsupportedWalkRefused&&WalkingRecovered&&PopulationMoved&&PeopleAnimated&&VehiclesAnimated&&SupportValid&&SeparationValid&&NativeCounts&&InputsStable&&World&&World->Ready&&World->Simulation.RedViolations()==0;
    Report->SetBoolField(TEXT("passed"),Passed);Report->SetStringField(TEXT("run_id"),ProbeRunId);
    FString Path;
    try
    {
        Path=ReportPath(CheckOutput);
        if(!IFileManager::Get().DirectoryExists(*FPaths::GetPath(Path)) && !IFileManager::Get().MakeDirectory(*FPaths::GetPath(Path),true))
            throw std::runtime_error("Runtime check could not prepare its terminal report directory.");
        Path=ReportPath(CheckOutput);
        FString JSON;
        if(!FJsonSerializer::Serialize(Report,TJsonWriterFactory<>::Create(&JSON)))throw std::runtime_error("Runtime check could not serialize its terminal report.");
        if(FailReportWrite || !FFileHelper::SaveStringToFile(JSON,*Path))
            throw std::runtime_error("Runtime check could not save its fresh terminal report.");
    }
    catch(const std::exception& Failure)
    {
        Passed=false;
        if(!Path.IsEmpty() && IFileManager::Get().FileExists(*Path))IFileManager::Get().Delete(*Path,false,false,true);
        UE_LOG(LogTemp,Error,TEXT("SHIBUYA_RUNTIME_CHECK FAIL report persistence: %s"),UTF8_TO_TCHAR(Failure.what()));
    }
    UE_LOG(LogTemp,Display,TEXT("%s %s %s"),InventoryOnly?TEXT("SHIBUYA_RUNTIME_INVENTORY"):TEXT("SHIBUYA_RUNTIME_CHECK"),Passed?TEXT("PASS"):TEXT("FAIL"),*Path);
    FPlatformMisc::RequestExitWithStatus(false,Passed?0:1);
}
