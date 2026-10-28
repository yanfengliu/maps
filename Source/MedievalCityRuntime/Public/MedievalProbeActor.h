#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InputCoreTypes.h"
#include "MedievalProbeActor.generated.h"

class AMedievalCharacter;
class APlayerController;
class FJsonObject;

UENUM()
enum class EMedievalProbeMode : uint8
{
	Smoke,
	City,
};

UENUM()
enum class EMedievalProbeStage : uint8
{
	WaitForPawn,
	PrepareScene,
	Settle,
	CaptureIdle,
	WalkThirdPerson,
	ToggleCamera,
	CaptureFirstPerson,
	WalkFirstPerson,
	LookAround,
	CaptureLook,
	DirectionRun,
	PacedWalk,
	PacedSprint,
	Jump,
	WallApproach,
	WallPush,
	CaptureWall,
	GatePassage,
	Vantage,
	Report,
	Finished,
};

/** One entry in probe.json's "steps" array. */
USTRUCT()
struct FMedievalProbeStep
{
	GENERATED_BODY()

	FString Name;
	FString Kind;
	FString Key;
	FString KeyEvent;
	FString Note;
	float DurationSeconds = 0.0f;
	FVector StartLocation = FVector::ZeroVector;
	FVector EndLocation = FVector::ZeroVector;
	float DistanceCm = 0.0f;
	float EndSpeedCmS = 0.0f;
	float PeakSpeedCmS = 0.0f;
	/** Which camera component the character believes is active, and where it is. */
	FString CameraName;
	FVector CameraLocation = FVector::ZeroVector;
	FRotator CameraRotation = FRotator::ZeroRotator;
	/**
	 * Where the player controller is actually rendering from, taken from
	 * APlayerCameraManager. This is the number the camera-mode check uses: the
	 * component transforms above stay valid whether or not a component is
	 * active, so measuring them would only re-read the flag under test.
	 */
	FVector ViewLocation = FVector::ZeroVector;
	FRotator ViewRotation = FRotator::ZeroRotator;
	/** Distance between the rendered view and the component said to be active, at the step's end. */
	float ViewToActiveCameraCm = 0.0f;
	FRotator ControlRotationStart = FRotator::ZeroRotator;
	FRotator ControlRotationEnd = FRotator::ZeroRotator;
	float FeetZMin = 0.0f;
	float FeetZMax = 0.0f;
	/** Feet height above the surface found by a downward trace; 0 means standing on it. */
	float ClearanceMinCm = 0.0f;
	float ClearanceMaxCm = 0.0f;
	bool bGroundFound = false;
	float WalkPhaseStart = 0.0f;
	float WalkPhaseEnd = 0.0f;
	float LegPitchPeak = 0.0f;
	FString Screenshot;
	/** False for steps that set state directly; those are placement, not control evidence. */
	bool bControlEvidence = true;
};

/** One captured frame recorded in probe.json's "screenshots" array. */
USTRUCT()
struct FMedievalProbeShot
{
	GENERATED_BODY()

	FString Name;
	FString File;
	FString Sha256;
	int64 Bytes = 0;
	int32 Width = 0;
	int32 Height = 0;
	/** Measured from the frame the engine handed back, before it was compressed. */
	float MeanLuma = 0.0f;
	float LumaStdDev = 0.0f;
	float BlackFraction = 0.0f;
	bool bBlank = true;

	/**
	 * Exposure probe: the mean of a fixed rectangle low in the frame, which at a
	 * 1.6 m eye height looking near the horizon is ground a few metres ahead. It
	 * exists so exposure can be judged against a material's recorded albedo with
	 * numbers rather than by eye.
	 */
	int32 GroundRect[4] = { 0, 0, 0, 0 };
	float GroundMeanSrgb = 0.0f;
	float GroundMeanLinear = 0.0f;
	float GroundR = 0.0f;
	float GroundG = 0.0f;
	float GroundB = 0.0f;
	float GroundClippedFraction = 0.0f;
	/**
	 * Percentiles of the same band. The band mixes sunlit ground with ground in
	 * shadow, so the mean alone hides over-exposure: p90 is the sunlit surface and
	 * is the number exposure is judged on, p10 is the shadow.
	 */
	float GroundP10 = 0.0f;
	float GroundP50 = 0.0f;
	float GroundP90 = 0.0f;
	/** p90 converted back to linear, to compare against a material's recorded albedo. */
	float GroundP90Linear = 0.0f;
};

/**
 * Runs one fixed control sequence against the real game and writes probe.json.
 *
 * Spawned only when -MedievalProbe=<directory> is on the command line, so it
 * never runs in ordinary play. Movement is driven by injecting real key events
 * through the player controller, which exercises the Enhanced Input bindings
 * themselves rather than the character's movement functions.
 */
UCLASS()
class MEDIEVALCITYRUNTIME_API AMedievalProbeActor : public AActor
{
	GENERATED_BODY()

public:
	AMedievalProbeActor();

	virtual void Tick(float DeltaSeconds) override;

	void Configure(const FString& InOutputDirectory, EMedievalProbeMode InMode, const FString& InLayoutPath);

	static constexpr int32 ShotWidth = 1280;
	static constexpr int32 ShotHeight = 720;
	static constexpr float RequiredWalkDistanceCm = 300.0f;
	static constexpr float MaxWallPushCm = 100.0f;
	/** Sprinting must cover at least this much more ground than walking the same time. */
	static constexpr float SprintMinRatio = 1.4f;
	static constexpr float SprintMinExtraCm = 150.0f;
	/** The rendered view must sit on the camera component said to be active. */
	static constexpr float MaxViewToCameraCm = 5.0f;
	/** Each of W, A, S and D must carry the character this far the right way, and no further the wrong way. */
	static constexpr float DirectionMinAlongCm = 150.0f;
	static constexpr float DirectionMaxAcrossCm = 60.0f;
	/** The wall approach must actually travel, or a stuck character would pass the push test. */
	static constexpr float WallApproachMinCm = 25.0f;
	static constexpr float GroundFeetMinCm = -25.0f;
	static constexpr float GroundFeetMaxCm = 25.0f;
	static constexpr float JumpFeetMaxCm = 200.0f;

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type Reason) override;

private:
	void EnterStage(EMedievalProbeStage NextStage);
	void RunStage(float DeltaSeconds);
	void RunDirectionStage(float DeltaSeconds);
	void RunGateStage(float DeltaSeconds);

	APlayerController* GetProbeController() const;
	AMedievalCharacter* GetProbeCharacter() const;

	/** Where the player controller renders from, not where a component happens to sit. */
	FVector GetViewLocation() const;
	FRotator GetViewRotation() const;

	void InjectKey(const FKey& Key, EInputEvent Event, float Amount);
	void InjectMouseAxis(const FKey& Key, float Delta);

	void OpenStep(const FString& Name, const FString& Kind, const FString& Key, const FString& KeyEvent, bool bControlEvidence);
	void RecordView(bool bCountTowardsWorst);
	void CloseStep();
	void SampleStep();

	void RequestCapture(const FString& Name);
	/** True once the pending capture has been written and hashed, or has timed out. */
	bool PollCapture();
	void OnScreenshotCaptured(int32 Width, int32 Height, const TArray<FColor>& Colors);
	void MeasureGroundRegion(int32 Width, int32 Height, const TArray<FColor>& Colors, FMedievalProbeShot& Shot) const;

	void PrepareSmokeScene();
	void LoadLayout();
	bool PlaceCharacter(const FVector& Location, const FRotator& Rotation, const FString& Note);

	void Fail(const FString& Reason);
	void WriteReport();

	float FeetZ() const;
	/** Feet height above the surface directly below, and whether any was found. */
	float GroundClearance(bool& bOutFound) const;

	// --- Configuration ------------------------------------------------------
	FString OutputDirectory;
	FString LayoutPath;
	EMedievalProbeMode Mode = EMedievalProbeMode::Smoke;

	// --- Sequence state ----------------------------------------------------
	EMedievalProbeStage Stage = EMedievalProbeStage::WaitForPawn;
	float StageTime = 0.0f;
	float TotalTime = 0.0f;
	int32 VantageIndex = 0;
	float VantagePhaseTime = 0.0f;
	bool bVantagePlaced = false;
	bool bReportWritten = false;

	// --- Open step ---------------------------------------------------------
	bool bStepOpen = false;
	FMedievalProbeStep CurrentStep;

	// --- Pending capture ---------------------------------------------------
	FString PendingShotName;
	FString PendingShotPath;
	/** Name of the last capture requested, recorded on the step that asked for it. */
	FString ActiveCaptureName;
	bool bCaptureWritten = false;
	FDelegateHandle ScreenshotHandle;

	// --- Results -----------------------------------------------------------
	TArray<FMedievalProbeStep> Steps;
	TArray<FMedievalProbeShot> Shots;
	TArray<FString> Failures;
	TArray<FString> Notes;

	float ThirdPersonWalkCm = -1.0f;
	float FirstPersonWalkCm = -1.0f;
	float PacedWalkCm = -1.0f;
	float PacedSprintCm = -1.0f;
	float PacedWalkPeakSpeed = 0.0f;
	float PacedSprintPeakSpeed = 0.0f;
	bool bSprintFlagSeen = false;
	float WallApproachCm = -1.0f;
	float WallPushCm = -1.0f;
	FVector ThirdPersonCameraLocation = FVector::ZeroVector;
	FVector FirstPersonCameraLocation = FVector::ZeroVector;
	/** Rendered view positions in each mode; the camera check is made from these. */
	FVector ThirdPersonViewLocation = FVector::ZeroVector;
	FVector FirstPersonViewLocation = FVector::ZeroVector;
	bool bSawThirdPersonCamera = false;
	bool bSawFirstPersonCamera = false;
	/**
	 * Worst disagreement between the rendered view and the active camera component.
	 * The count is load-bearing: a passing sample is exactly 0, so without it a run
	 * that never sampled would be indistinguishable from a run that always agreed.
	 */
	int32 ViewSampleCount = 0;
	float WorstViewToCameraCm = 0.0f;
	FString WorstViewStep;
	FRotator LookRotationStart = FRotator::ZeroRotator;
	FRotator LookRotationEnd = FRotator::ZeroRotator;
	float RunClearanceMin = 0.0f;
	float RunClearanceMax = 0.0f;
	bool bFeetSampled = false;
	bool bGroundLost = false;
	/** False once the probe starts setting the character's location directly. */
	bool bEnvelopeSampling = true;
	float PeakLegPitch = 0.0f;

	// --- Scene the probe owns in smoke mode --------------------------------
	UPROPERTY(Transient)
	TArray<TObjectPtr<AActor>> OwnedSceneActors;

	FVector WallCentre = FVector::ZeroVector;
	FRotator WallApproachRotation = FRotator::ZeroRotator;
	FVector WallApproachStart = FVector::ZeroVector;
	bool bHaveWallRun = false;

	struct FProbeVantage
	{
		FString Name;
		FVector Location = FVector::ZeroVector;
		float Yaw = 0.0f;
		float Pitch = 0.0f;
		FString Source;
	};
	/**
	 * One of the four movement keys, run from a facing chosen so that its expected
	 * direction is the open run's clear heading.
	 *
	 * Each key is tested relative to where the character faces, so the facing is
	 * free to choose: pointing every key's expected direction down the one stretch
	 * of street the layout promises is clear means all four runs have room, and a
	 * key whose modifiers are wrong lands sideways or backwards instead.
	 */
	struct FProbeDirection
	{
		FKey Key;
		const TCHAR* Name = nullptr;
		/**
		 * Degrees added to the Unreal yaw of the clear heading, chosen so the key's
		 * own direction comes out along that heading: W faces it, S faces away, A
		 * faces 90 degrees left of it and D 90 degrees right.
		 */
		float YawOffset = 0.0f;
	};
	TArray<FProbeDirection> Directions;
	int32 DirectionIndex = 0;
	bool bDirectionPlaced = false;
	float DirectionPhaseTime = 0.0f;
	/** Travel along and across the expected direction, per key, for the report. */
	TMap<FString, FVector2D> DirectionResults;

	TArray<FProbeVantage> Vantages;
	FVector PlayerStartLocation = FVector::ZeroVector;
	float PlayerStartYaw = 0.0f;
	bool bHavePlayerStart = false;

	/** Start of the paired walk and sprint runs, on open ground along a clear heading. */
	FVector SprintRunStart = FVector::ZeroVector;
	float SprintRunYaw = 0.0f;
	bool bHaveSprintRun = false;

	/**
	 * The gatehouse, for the one step that walks a colliding character through the
	 * arch. This proves this gatehouse's arch at this placement, nothing wider.
	 */
	FVector GateCentre = FVector::ZeroVector;
	FVector GateStreetDirection = FVector::ZeroVector;
	bool bHaveGate = false;
	bool bGatePlaced = false;
	float GatePhaseTime = 0.0f;
	float GateLineAlongCm = 0.0f;
	float GateStartAlongCm = 0.0f;
	float GateEndAlongCm = 0.0f;
	float GateMarginCm = 0.0f;
	bool bGateRunDone = false;
};
