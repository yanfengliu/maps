#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "CitySimulation.h"
#include "RuntimeReadLimit.h"
#include "ShibuyaWorld.generated.h"

class UCameraComponent;
class UCapsuleComponent;
class UFloatingPawnMovement;
class UInstancedStaticMeshComponent;
class FJsonObject;
class FJsonValue;

UCLASS()
class SHIBUYARUNTIME_API AShibuyaWorld : public AActor
{
    GENERATED_BODY()
public:
    AShibuyaWorld();
    virtual void Tick(float DeltaSeconds) override;
    bool LoadNetwork();
    void ResetPopulation();
    void TogglePaused() { Simulation.paused = !Simulation.paused; }
    Shibuya::Simulation Simulation;
    FVector SpawnFeet = FVector::ZeroVector;
    float SpawnYaw = 0;
    bool Ready = false;
    FString Error;
    FString NetworkSHA256;
    FString SourceManifestSHA256;
    FString SourceManifestPath;
    FString MovementManifestSHA256;
    TMap<FString,FString> InputDigests;
    TMap<FString,int64> InputSizes;
    TMap<FString,Shibuya::RuntimeInputRole> InputRoles;
    FString Attribution;
    int32 PedestrianCount = 0;
    int32 VehicleCount = 0;
    int32 SupportSampleCount = 0;
    uint64 SupportFailures = 0;
    double TickMilliseconds = 0;
    TArray<TSharedPtr<FJsonValue>> NativeBoundaryEvents;
    uint64 NativeBoundaryEventCount = 0;
    TSharedPtr<FJsonObject> Snapshot() const;
    bool InputsUnchanged() const;
    TSharedPtr<FJsonObject> GeometrySnapshot() const;
    TSharedPtr<FJsonObject> PhysicsSnapshot() const;
    TSharedPtr<FJsonObject> AgentDiagnostic(size_t AgentSlot) const;
    TSharedPtr<FJsonObject> VehicleDiagnostics() const;
    TSharedPtr<FJsonObject> SupportContactExample(const FString& Kind, const FString& Contact,
        size_t AgentSlot, int32 Instance, int32 Part, const FVector& Position,
        const FHitResult* Hit, double Rise, double Drop, bool CheckNormal = true) const;
private:
    UPROPERTY() TArray<TObjectPtr<UInstancedStaticMeshComponent>> PedestrianParts;
    UPROPERTY() TArray<TObjectPtr<UInstancedStaticMeshComponent>> VehicleParts;
    TArray<TArray<FTransform>> PedestrianTransforms;
    TArray<TArray<FTransform>> VehicleTransforms;
    void CreateGeometry();
    void UpdateGeometry();
};

UCLASS()
class SHIBUYARUNTIME_API AShibuyaExplorer : public APawn
{
    GENERATED_BODY()
public:
    AShibuyaExplorer();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    virtual UPawnMovementComponent* GetMovementComponent() const override;
    void ResetView();
    bool IsFlying() const { return Flying; }
    bool CanWalkHere() const { FHitResult Ground;return ReachableGround(Ground); }
    FString MovementNotice;
    int32 ForwardEvents = 0, LookEvents = 0, ModeEvents = 0, PauseEvents = 0, ResetEvents = 0;
    uint64 BlockedWalkSteps = 0;
    TSharedPtr<FJsonObject> Snapshot() const;
private:
    UPROPERTY() TObjectPtr<UCapsuleComponent> Collision;
    UPROPERTY() TObjectPtr<UCameraComponent> Camera;
    UPROPERTY() TObjectPtr<UFloatingPawnMovement> Movement;
    float Forward = 0, Right = 0, Vertical = 0;
    bool Flying = false, Fast = false;
    TSharedPtr<FJsonObject> ResetAdmission;
    AShibuyaWorld* City() const;
    void MoveForward(float Value);
    void MoveRight(float Value);
    void MoveVertical(float Value);
    void LookHorizontal(float Value);
    void LookVertical(float Value);
    void FastPressed() { Fast = true; }
    void FastReleased() { Fast = false; }
    void ToggleMode();
    bool ReachableGround(FHitResult& Ground) const;
    void Pause();
    void Reset();
};

UCLASS()
class SHIBUYARUNTIME_API AShibuyaController : public APlayerController
{
    GENERATED_BODY()
public:
    virtual void BeginPlay() override;
    virtual void PlayerTick(float DeltaTime) override;
private:
    FString CheckOutput;
    FString CaptureOutput;
    FString ProbeRunId;
    bool FailReportWrite = false;
    bool Probe = false, NegativeInput = false, Finished = false, InventoryOnly = false;
    double ProbeTime = 0;
    double StageStarted = 0;
    double BenchmarkSeconds = 30;
    bool BenchmarkActive = false;
    double LastPhysicsSample = 0;
    TArray<TSharedPtr<FJsonValue>> PhysicsSamples;
    TMap<FString,int32> ContactExampleCounts;
    void RetainContactExamples(const TSharedPtr<FJsonObject>& Sample);
    int32 ProbeStage = 0;
    TArray<TSharedPtr<FJsonValue>> Snapshots;
    uint64 InputAttempts = 0, InputHandled = 0, InputSuppressed = 0, InputRouteFailures = 0;
    TArray<TSharedPtr<FJsonValue>> InputEvents;
    TSharedPtr<FJsonObject> InputRoutingSnapshot() const;
    bool InjectEvent(FKey Key, EInputEvent Event, float Amount, float DeltaTime, bool Axis);
    TSharedPtr<FJsonObject> InitialAssets;
    TSharedPtr<FJsonObject> AssetSnapshot() const;
    TArray<double> FrameMilliseconds;
    TArray<double> SimulationMilliseconds;
    TArray<double> GPUMilliseconds;
    uint64 InitialStep = 0;
    FVector InitialPosition = FVector::ZeroVector;
    FRotator InitialRotation = FRotator::ZeroRotator;
    bool InjectKey(FKey Key, EInputEvent Event);
    bool InjectAxis(FKey Key, float Amount, float DeltaTime);
    void Record(const FString& Stage);
    void FinishProbe();
};

UCLASS()
class SHIBUYARUNTIME_API AShibuyaGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AShibuyaGameMode();
    virtual void HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer) override;
    virtual APawn* SpawnDefaultPawnAtTransform_Implementation(AController* NewPlayer,const FTransform& SpawnTransform) override;
    virtual void StartPlay() override;
    TSharedPtr<FJsonObject> PlayerStartAdmission;
};

UCLASS()
class SHIBUYARUNTIME_API AShibuyaHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
};
