#include "MedievalProbeActor.h"

#include "Camera/PlayerCameraManager.h"
#include "Components/CapsuleComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/DirectionalLight.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "Engine/SkyLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GenericPlatform/GenericPlatformInputDeviceMapper.h"
#include "HAL/FileManager.h"
#include "ImageUtils.h"
#include "Materials/MaterialInterface.h"
#include "MedievalCharacter.h"
#include "MedievalCityRuntime.h"
#include "MedievalSha256.h"
#include "Misc/EngineVersion.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "RHI.h"
#include "RHIStrings.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "UnrealClient.h"

namespace MedievalProbe
{
	constexpr float PawnTimeout = 90.0f;
	constexpr float PrepareSeconds = 0.3f;
	constexpr float SettleSeconds = 2.0f;
	constexpr float WalkSeconds = 3.0f;
	/** When inside the walk step the frame is captured, so W is still held. */
	constexpr float WalkCaptureSeconds = 2.4f;
	constexpr float ToggleSeconds = 0.4f;
	constexpr float LookSeconds = 1.0f;
	/**
	 * Both halves of the sprint comparison run for this long from the same placed
	 * start, so the only difference between them is the held Left Shift. 1.5 s is
	 * short enough that even the sprint stays inside the 12 m of clear street the
	 * layout promises along open_run_heading_deg.
	 */
	constexpr float PacedRunSeconds = 1.5f;
	/** Long enough for each of W, A, S and D to clear the direction thresholds. */
	constexpr float DirectionRunSeconds = 1.2f;
	/** Long enough to carry the character from 7 m short of the gate to well past it. */
	constexpr float GateRunSeconds = 5.0f;
	constexpr float GateApproachCm = 700.0f;
	constexpr float GateClearMarginCm = 200.0f;
	constexpr float JumpRiseSeconds = 0.35f;
	constexpr float JumpLandSeconds = 1.6f;
	constexpr float WallApproachSeconds = 2.5f;
	constexpr float WallPushSeconds = 1.5f;
	constexpr float VantageSettleSeconds = 0.5f;
	constexpr float CaptureTimeout = 25.0f;
	constexpr float LookYawPerTick = 0.5f;
	constexpr float LookPitchPerTick = 0.3f;

	/** 200 m square floor, top face at Z = 0. */
	constexpr float FloorHalfSpanCm = 10000.0f;
	constexpr float FloorThicknessCm = 100.0f;
	/** Distance from the wall face the character is placed at for the wall run. */
	constexpr float WallStandOffCm = 80.0f;
	/** First person camera height above the capsule centre, from AMedievalCharacter. */
	constexpr float FirstPersonCameraZCm = 72.0f;

	/**
	 * Turns a layout heading into the Unreal yaw that points a camera or a walk
	 * direction the same way.
	 *
	 * A layout heading t has the front vector (-sin t, cos t) in the layout frame,
	 * which the point mapping sends to the Unreal direction (-sin t, -cos t). An
	 * Unreal yaw u has the forward (cos u, sin u), so u = -(t + 90). This is not
	 * the actor rule: an asset's front is its local minus Y, which gives yaw -t,
	 * and the two differ by 90 degrees.
	 */
	float HeadingToUnrealYaw(double LayoutYawDegrees)
	{
		return static_cast<float>(-(LayoutYawDegrees + 90.0));
	}

	FString VectorToString(const FVector& Value)
	{
		return FString::Printf(TEXT("%.2f %.2f %.2f"), Value.X, Value.Y, Value.Z);
	}

	TSharedPtr<FJsonObject> MakeVector(const FVector& Value)
	{
		TSharedPtr<FJsonObject> Object = MakeShared<FJsonObject>();
		Object->SetNumberField(TEXT("x_cm"), Value.X);
		Object->SetNumberField(TEXT("y_cm"), Value.Y);
		Object->SetNumberField(TEXT("z_cm"), Value.Z);
		return Object;
	}

	TSharedPtr<FJsonObject> MakeRotator(const FRotator& Value)
	{
		TSharedPtr<FJsonObject> Object = MakeShared<FJsonObject>();
		Object->SetNumberField(TEXT("pitch_deg"), Value.Pitch);
		Object->SetNumberField(TEXT("yaw_deg"), Value.Yaw);
		Object->SetNumberField(TEXT("roll_deg"), Value.Roll);
		return Object;
	}
}

AMedievalProbeActor::AMedievalProbeActor()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PostUpdateWork;
	bReplicates = false;
	SetCanBeDamaged(false);
}

void AMedievalProbeActor::Configure(const FString& InOutputDirectory, EMedievalProbeMode InMode, const FString& InLayoutPath)
{
	OutputDirectory = InOutputDirectory;
	Mode = InMode;
	LayoutPath = InLayoutPath;
}

void AMedievalProbeActor::BeginPlay()
{
	Super::BeginPlay();

	if (!OutputDirectory.IsEmpty())
	{
		IFileManager::Get().MakeDirectory(*OutputDirectory, /*Tree*/ true);
	}

	ScreenshotHandle = UGameViewportClient::OnScreenshotCaptured().AddUObject(
		this, &AMedievalProbeActor::OnScreenshotCaptured);

	// W is +forward, S is -forward, A is -right and D is +right, all relative to
	// where the character faces. Facing each run so that its expected direction is
	// the clear heading means one assertion covers all four, and a wrong modifier
	// sends the character sideways or backwards instead of along it.
	Directions.Add({ EKeys::W, TEXT("W"), 0.0f });
	Directions.Add({ EKeys::S, TEXT("S"), 180.0f });
	Directions.Add({ EKeys::A, TEXT("A"), 90.0f });
	Directions.Add({ EKeys::D, TEXT("D"), -90.0f });

	// The scene the probe owns has to exist before the character's first tick,
	// or it falls from the fallback player start with nothing under it.
	if (Mode == EMedievalProbeMode::Smoke)
	{
		PrepareSmokeScene();
	}
	else
	{
		LoadLayout();
	}

	UE_LOG(LogMedieval, Log, TEXT("Probe armed: mode=%s output=%s layout=%s"),
		Mode == EMedievalProbeMode::Smoke ? TEXT("smoke") : TEXT("city"),
		*OutputDirectory,
		LayoutPath.IsEmpty() ? TEXT("(none)") : *LayoutPath);
}

void AMedievalProbeActor::EndPlay(const EEndPlayReason::Type Reason)
{
	if (ScreenshotHandle.IsValid())
	{
		UGameViewportClient::OnScreenshotCaptured().Remove(ScreenshotHandle);
		ScreenshotHandle.Reset();
	}

	// A probe that never reached its report still owes evidence of why.
	if (!bReportWritten && !OutputDirectory.IsEmpty())
	{
		Fail(FString::Printf(TEXT("Probe ended at stage %d before writing its report."), static_cast<int32>(Stage)));
		WriteReport();
	}

	Super::EndPlay(Reason);
}

APlayerController* AMedievalProbeActor::GetProbeController() const
{
	return GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
}

AMedievalCharacter* AMedievalProbeActor::GetProbeCharacter() const
{
	APlayerController* Controller = GetProbeController();
	return Controller ? Cast<AMedievalCharacter>(Controller->GetPawn()) : nullptr;
}

FVector AMedievalProbeActor::GetViewLocation() const
{
	const APlayerController* Controller = GetProbeController();
	return (Controller && Controller->PlayerCameraManager)
		? Controller->PlayerCameraManager->GetCameraLocation()
		: FVector::ZeroVector;
}

FRotator AMedievalProbeActor::GetViewRotation() const
{
	const APlayerController* Controller = GetProbeController();
	return (Controller && Controller->PlayerCameraManager)
		? Controller->PlayerCameraManager->GetCameraRotation()
		: FRotator::ZeroRotator;
}

float AMedievalProbeActor::FeetZ() const
{
	const AMedievalCharacter* Character = GetProbeCharacter();
	return Character ? Character->GetActorLocation().Z - AMedievalCharacter::CapsuleHalfHeightCm : 0.0f;
}

float AMedievalProbeActor::GroundClearance(bool& bOutFound) const
{
	bOutFound = false;
	const AMedievalCharacter* Character = GetProbeCharacter();
	if (!Character || !GetWorld())
	{
		return 0.0f;
	}

	const FVector Centre = Character->GetActorLocation();
	FHitResult Hit;
	const FCollisionQueryParams Params(TEXT("MedievalProbeGround"), /*bTraceComplex*/ false, Character);
	if (!GetWorld()->LineTraceSingleByChannel(Hit, Centre, Centre - FVector(0.0f, 0.0f, 20000.0f), ECC_WorldStatic, Params))
	{
		return 0.0f;
	}

	bOutFound = true;
	return (Centre.Z - AMedievalCharacter::CapsuleHalfHeightCm) - Hit.ImpactPoint.Z;
}

void AMedievalProbeActor::InjectKey(const FKey& Key, EInputEvent Event, float Amount)
{
	APlayerController* Controller = GetProbeController();
	if (!Controller)
	{
		Fail(TEXT("No player controller to inject input through."));
		return;
	}

	const FInputDeviceId Device =
		IPlatformInputDeviceMapper::Get().GetPrimaryInputDeviceForUser(Controller->GetPlatformUserId());

	// A real key event through the player controller, so the runtime-built
	// Enhanced Input mappings and bindings are what move the character.
	FInputKeyEventArgs Args = FInputKeyEventArgs::CreateSimulated(
		Key, Event, Amount, /*NumSamplesOverride*/ -1, Device);
	Controller->InputKey(Args);
}

void AMedievalProbeActor::InjectMouseAxis(const FKey& Key, float Delta)
{
	APlayerController* Controller = GetProbeController();
	if (!Controller)
	{
		return;
	}

	const FInputDeviceId Device =
		IPlatformInputDeviceMapper::Get().GetPrimaryInputDeviceForUser(Controller->GetPlatformUserId());
	FInputKeyEventArgs Args = FInputKeyEventArgs::CreateSimulated(
		Key, IE_Axis, Delta, /*NumSamplesOverride*/ 1, Device);
	Controller->InputKey(Args);
}

void AMedievalProbeActor::OpenStep(const FString& Name, const FString& Kind, const FString& Key,
	const FString& KeyEvent, bool bControlEvidence)
{
	CurrentStep = FMedievalProbeStep();
	CurrentStep.Name = Name;
	CurrentStep.Kind = Kind;
	CurrentStep.Key = Key;
	CurrentStep.KeyEvent = KeyEvent;
	CurrentStep.bControlEvidence = bControlEvidence;

	const AMedievalCharacter* Character = GetProbeCharacter();
	const APlayerController* Controller = GetProbeController();
	if (Character)
	{
		CurrentStep.StartLocation = Character->GetActorLocation();
		CurrentStep.EndLocation = CurrentStep.StartLocation;
		CurrentStep.CameraName = Character->GetActiveCameraName().ToString();
		CurrentStep.CameraLocation = Character->GetActiveCameraLocation();
		CurrentStep.CameraRotation = Character->GetActiveCameraRotation();
		CurrentStep.WalkPhaseStart = Character->GetWalkPhase();
		RecordView(/*bCountTowardsWorst*/ false);
	}
	if (Controller)
	{
		CurrentStep.ControlRotationStart = Controller->GetControlRotation();
		CurrentStep.ControlRotationEnd = CurrentStep.ControlRotationStart;
	}

	const float Feet = FeetZ();
	CurrentStep.FeetZMin = Feet;
	CurrentStep.FeetZMax = Feet;
	bool bFound = false;
	const float Clearance = GroundClearance(bFound);
	CurrentStep.ClearanceMinCm = Clearance;
	CurrentStep.ClearanceMaxCm = Clearance;
	CurrentStep.bGroundFound = bFound;

	bStepOpen = true;
}

void AMedievalProbeActor::RecordView(bool bCountTowardsWorst)
{
	const AMedievalCharacter* Character = GetProbeCharacter();
	if (!Character)
	{
		return;
	}

	CurrentStep.ViewLocation = GetViewLocation();
	CurrentStep.ViewRotation = GetViewRotation();
	CurrentStep.ViewToActiveCameraCm =
		FVector::Dist(CurrentStep.ViewLocation, Character->GetActiveCameraLocation());

	// Counted only at the end of a step, never at the start. OpenStep runs in the
	// same tick as PlaceCharacter and after the camera manager has already run for
	// that tick, so an opening sample reads the POV from before the teleport: a
	// stale read, not a lag. By the end of a step the POV is current, and a camera
	// that is genuinely not the one being rendered still shows up there, because it
	// stays a spring arm away for the whole step.
	//
	// A passing sample is exactly 0, because GetCameraLocation returns the POV that
	// CalcCamera copied from the active camera component: one value, not two that
	// approach each other. The 5 cm tolerance is unused slack, not a tuned
	// threshold. That is why the count below matters: without it, zero samples and
	// a clean pass would both write 0 and an empty step name.
	if (!bCountTowardsWorst || CurrentStep.Kind == TEXT("placement"))
	{
		return;
	}
	++ViewSampleCount;
	if (ViewSampleCount == 1 || CurrentStep.ViewToActiveCameraCm > WorstViewToCameraCm)
	{
		WorstViewToCameraCm = CurrentStep.ViewToActiveCameraCm;
		WorstViewStep = CurrentStep.Name;
	}
}

void AMedievalProbeActor::SampleStep()
{
	if (!bStepOpen)
	{
		return;
	}

	const AMedievalCharacter* Character = GetProbeCharacter();
	if (!Character)
	{
		return;
	}

	CurrentStep.EndLocation = Character->GetActorLocation();
	CurrentStep.EndSpeedCmS = Character->GetHorizontalSpeed();
	CurrentStep.PeakSpeedCmS = FMath::Max(CurrentStep.PeakSpeedCmS, CurrentStep.EndSpeedCmS);
	CurrentStep.WalkPhaseEnd = Character->GetWalkPhase();
	CurrentStep.LegPitchPeak = FMath::Max(CurrentStep.LegPitchPeak, FMath::Abs(Character->GetLeftLegPitch()));
	PeakLegPitch = FMath::Max(PeakLegPitch, CurrentStep.LegPitchPeak);

	if (const APlayerController* Controller = GetProbeController())
	{
		CurrentStep.ControlRotationEnd = Controller->GetControlRotation();
	}

	const float Feet = FeetZ();
	CurrentStep.FeetZMin = FMath::Min(CurrentStep.FeetZMin, Feet);
	CurrentStep.FeetZMax = FMath::Max(CurrentStep.FeetZMax, Feet);

	bool bFound = false;
	const float Clearance = GroundClearance(bFound);
	if (bFound)
	{
		CurrentStep.bGroundFound = true;
		CurrentStep.ClearanceMinCm = FMath::Min(CurrentStep.ClearanceMinCm, Clearance);
		CurrentStep.ClearanceMaxCm = FMath::Max(CurrentStep.ClearanceMaxCm, Clearance);

		if (bEnvelopeSampling)
		{
			if (!bFeetSampled)
			{
				RunClearanceMin = Clearance;
				RunClearanceMax = Clearance;
				bFeetSampled = true;
			}
			RunClearanceMin = FMath::Min(RunClearanceMin, Clearance);
			RunClearanceMax = FMath::Max(RunClearanceMax, Clearance);
		}
	}
	else if (bEnvelopeSampling)
	{
		bGroundLost = true;
	}
}

void AMedievalProbeActor::CloseStep()
{
	if (!bStepOpen)
	{
		return;
	}

	SampleStep();
	CurrentStep.DurationSeconds = StageTime;
	CurrentStep.DistanceCm = FVector::Dist2D(CurrentStep.StartLocation, CurrentStep.EndLocation);

	if (const AMedievalCharacter* Character = GetProbeCharacter())
	{
		CurrentStep.CameraName = Character->GetActiveCameraName().ToString();
		CurrentStep.CameraLocation = Character->GetActiveCameraLocation();
		CurrentStep.CameraRotation = Character->GetActiveCameraRotation();
		RecordView(/*bCountTowardsWorst*/ true);
	}
	Steps.Add(CurrentStep);
	bStepOpen = false;

	UE_LOG(LogMedieval, Log, TEXT("Probe step '%s' (%s %s): moved %.1f cm, end speed %.1f cm/s, camera %s at %s."),
		*CurrentStep.Name, *CurrentStep.Key, *CurrentStep.KeyEvent, CurrentStep.DistanceCm,
		CurrentStep.EndSpeedCmS, *CurrentStep.CameraName, *MedievalProbe::VectorToString(CurrentStep.CameraLocation));
}

void AMedievalProbeActor::RequestCapture(const FString& Name)
{
	PendingShotName = Name;
	ActiveCaptureName = Name;
	PendingShotPath = FPaths::Combine(OutputDirectory, Name + TEXT(".png"));
	bCaptureWritten = false;

	if (bStepOpen)
	{
		CurrentStep.Screenshot = Name;
	}

	IFileManager::Get().Delete(*PendingShotPath, /*RequireExists*/ false, /*EvenReadOnly*/ true, /*Quiet*/ true);
	FScreenshotRequest::RequestScreenshot(PendingShotPath, /*bShowUI*/ false, /*bAddFilenameSuffix*/ false);
}

void AMedievalProbeActor::MeasureGroundRegion(int32 Width, int32 Height, const TArray<FColor>& Colors,
	FMedievalProbeShot& Shot) const
{
	// A band low in the frame. At a 1.6 m eye height with the camera near the
	// horizon this is ground roughly 3 to 6 m ahead, so for a plaza vantage it is
	// cobble and nothing else.
	const int32 X0 = (Width * 15) / 100;
	const int32 X1 = (Width * 85) / 100;
	const int32 Y0 = (Height * 70) / 100;
	const int32 Y1 = (Height * 98) / 100;
	Shot.GroundRect[0] = X0;
	Shot.GroundRect[1] = Y0;
	Shot.GroundRect[2] = X1;
	Shot.GroundRect[3] = Y1;

	auto ToLinear = [](uint8 Channel) -> double
	{
		const double Value = Channel / 255.0;
		return Value <= 0.04045 ? Value / 12.92 : FMath::Pow((Value + 0.055) / 1.055, 2.4);
	};

	double SumR = 0.0;
	double SumG = 0.0;
	double SumB = 0.0;
	double SumLinear = 0.0;
	int64 Clipped = 0;
	int64 Samples = 0;
	int64 Histogram[256] = {};
	for (int32 Y = Y0; Y < Y1; ++Y)
	{
		for (int32 X = X0; X < X1; ++X)
		{
			const int32 Index = Y * Width + X;
			if (!Colors.IsValidIndex(Index))
			{
				continue;
			}
			const FColor& Colour = Colors[Index];
			SumR += Colour.R;
			SumG += Colour.G;
			SumB += Colour.B;
			SumLinear += (ToLinear(Colour.R) + ToLinear(Colour.G) + ToLinear(Colour.B)) / 3.0;
			Clipped += (Colour.R >= 250 || Colour.G >= 250 || Colour.B >= 250) ? 1 : 0;
			++Histogram[FMath::Clamp((Colour.R + Colour.G + Colour.B) / 3, 0, 255)];
			++Samples;
		}
	}

	if (Samples == 0)
	{
		return;
	}

	Shot.GroundR = static_cast<float>(SumR / Samples);
	Shot.GroundG = static_cast<float>(SumG / Samples);
	Shot.GroundB = static_cast<float>(SumB / Samples);
	Shot.GroundMeanSrgb = static_cast<float>((SumR + SumG + SumB) / (3.0 * Samples));
	Shot.GroundMeanLinear = static_cast<float>(SumLinear / Samples);
	Shot.GroundClippedFraction = static_cast<float>(static_cast<double>(Clipped) / Samples);

	auto Percentile = [&Histogram, Samples](double Fraction) -> float
	{
		const int64 Target = static_cast<int64>(Fraction * Samples);
		int64 Running = 0;
		for (int32 Bin = 0; Bin < 256; ++Bin)
		{
			Running += Histogram[Bin];
			if (Running >= Target)
			{
				return static_cast<float>(Bin);
			}
		}
		return 255.0f;
	};

	Shot.GroundP10 = Percentile(0.10);
	Shot.GroundP50 = Percentile(0.50);
	Shot.GroundP90 = Percentile(0.90);
	Shot.GroundP90Linear = static_cast<float>(ToLinear(static_cast<uint8>(FMath::Clamp(Shot.GroundP90, 0.0f, 255.0f))));
}

void AMedievalProbeActor::OnScreenshotCaptured(int32 Width, int32 Height, const TArray<FColor>& Colors)
{
	// Binding this delegate means the engine hands the frame back instead of
	// writing it, so the probe compresses and hashes the exact pixels it also
	// measured. Nothing else writes these files.
	if (PendingShotName.IsEmpty() || bCaptureWritten)
	{
		return;
	}

	FMedievalProbeShot Shot;
	Shot.Name = PendingShotName;
	Shot.File = FPaths::GetCleanFilename(PendingShotPath);
	Shot.Width = Width;
	Shot.Height = Height;

	double LumaSum = 0.0;
	double LumaSquareSum = 0.0;
	int64 DarkCount = 0;
	for (const FColor& Colour : Colors)
	{
		const double Luma = 0.2126 * Colour.R + 0.7152 * Colour.G + 0.0722 * Colour.B;
		LumaSum += Luma;
		LumaSquareSum += Luma * Luma;
		DarkCount += Luma < 8.0 ? 1 : 0;
	}
	const int64 Count = FMath::Max<int64>(Colors.Num(), 1);
	const double Mean = LumaSum / Count;
	Shot.MeanLuma = static_cast<float>(Mean);
	Shot.LumaStdDev = static_cast<float>(FMath::Sqrt(FMath::Max(0.0, LumaSquareSum / Count - Mean * Mean)));
	Shot.BlackFraction = static_cast<float>(static_cast<double>(DarkCount) / Count);
	// A real rendered frame of a lit scene is neither dark nor uniform.
	Shot.bBlank = Shot.MeanLuma < 6.0f || Shot.LumaStdDev < 1.5f;

	MeasureGroundRegion(Width, Height, Colors, Shot);

	TArray64<uint8> Png;
	FImageUtils::PNGCompressImageArray(Width, Height, TArrayView64<const FColor>(Colors.GetData(), Colors.Num()), Png);
	if (Png.Num() == 0 || !FFileHelper::SaveArrayToFile(Png, *PendingShotPath))
	{
		Fail(FString::Printf(TEXT("Could not write screenshot '%s' to %s."), *PendingShotName, *PendingShotPath));
		bCaptureWritten = true;
		return;
	}

	Shot.Bytes = Png.Num();
	Shot.Sha256 = MedievalSha256::HashBytes(Png);
	if (Shot.Sha256.IsEmpty())
	{
		Fail(FString::Printf(TEXT("No SHA-256 provider produced a digest for screenshot '%s'."), *PendingShotName));
	}
	if (Shot.Width != ShotWidth || Shot.Height != ShotHeight)
	{
		Fail(FString::Printf(TEXT("Screenshot '%s' is %dx%d, not the required %dx%d."),
			*PendingShotName, Shot.Width, Shot.Height, ShotWidth, ShotHeight));
	}
	if (Shot.bBlank)
	{
		Fail(FString::Printf(
			TEXT("Screenshot '%s' is blank: mean luma %.2f, standard deviation %.2f, %.1f%% near-black pixels."),
			*PendingShotName, Shot.MeanLuma, Shot.LumaStdDev, 100.0f * Shot.BlackFraction));
	}

	Shots.Add(Shot);
	bCaptureWritten = true;

	UE_LOG(LogMedieval, Log,
		TEXT("Probe captured %s (%dx%d, %lld bytes, mean luma %.2f, stddev %.2f, sha256 %s)."),
		*Shot.File, Shot.Width, Shot.Height, Shot.Bytes, Shot.MeanLuma, Shot.LumaStdDev, *Shot.Sha256);
}

bool AMedievalProbeActor::PollCapture()
{
	if (PendingShotName.IsEmpty())
	{
		return true;
	}

	if (bCaptureWritten)
	{
		PendingShotName.Reset();
		return true;
	}

	if (StageTime > MedievalProbe::CaptureTimeout)
	{
		Fail(FString::Printf(TEXT("Screenshot '%s' was not produced for %s within %.0f s."),
			*PendingShotName, *PendingShotPath, MedievalProbe::CaptureTimeout));
		PendingShotName.Reset();
		return true;
	}

	return false;
}

void AMedievalProbeActor::PrepareSmokeScene()
{
	UWorld* World = GetWorld();
	if (!World)
	{
		return;
	}

	UStaticMesh* Cube = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube"));
	UMaterialInterface* Material = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	if (!Cube)
	{
		Fail(TEXT("/Engine/BasicShapes/Cube.Cube did not load, so the probe cannot spawn a test floor."));
		return;
	}

	const FBox Bounds = Cube->GetBoundingBox();
	const FVector Size = Bounds.GetSize();

	auto SpawnBox = [&](const FString& Name, const FVector& CentreCm, const FVector& ExtentCm) -> AStaticMeshActor*
	{
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		Params.Name = FName(*Name);
		AStaticMeshActor* Actor = World->SpawnActor<AStaticMeshActor>(AStaticMeshActor::StaticClass(), FTransform(CentreCm), Params);
		if (!Actor)
		{
			return nullptr;
		}

		UStaticMeshComponent* Component = Actor->GetStaticMeshComponent();
		Component->SetMobility(EComponentMobility::Movable);
		Component->SetStaticMesh(Cube);
		if (Material)
		{
			Component->SetMaterial(0, Material);
		}
		Component->SetRelativeScale3D(FVector(
			Size.X > KINDA_SMALL_NUMBER ? ExtentCm.X / Size.X : 1.0f,
			Size.Y > KINDA_SMALL_NUMBER ? ExtentCm.Y / Size.Y : 1.0f,
			Size.Z > KINDA_SMALL_NUMBER ? ExtentCm.Z / Size.Z : 1.0f));
		Component->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
		Component->SetCollisionObjectType(ECC_WorldStatic);
		Component->SetCollisionProfileName(TEXT("BlockAll"));
		OwnedSceneActors.Add(Actor);
		return Actor;
	};

	// Flat test floor, top face at Z = 0, so the probe needs no city content.
	SpawnBox(TEXT("MedievalProbeFloor"),
		FVector(0.0f, 0.0f, -MedievalProbe::FloorThicknessCm * 0.5f),
		FVector(2.0f * MedievalProbe::FloorHalfSpanCm, 2.0f * MedievalProbe::FloorHalfSpanCm, MedievalProbe::FloorThicknessCm));

	// A wall for the collision step, well beyond the two walking runs (about 17 m
	// of forward travel) so neither of them reaches it.
	WallCentre = FVector(4000.0f, 0.0f, 300.0f);
	SpawnBox(TEXT("MedievalProbeWall"), WallCentre, FVector(40.0f, 6000.0f, 600.0f));
	WallApproachRotation = FRotator(0.0f, 0.0f, 0.0f);
	WallApproachStart = FVector(
		WallCentre.X - 20.0f - AMedievalCharacter::CapsuleRadiusCm - MedievalProbe::WallStandOffCm,
		0.0f,
		AMedievalCharacter::CapsuleHalfHeightCm + 5.0f);
	bHaveWallRun = true;

	FActorSpawnParameters LightParams;
	LightParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	if (ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(
		ADirectionalLight::StaticClass(), FTransform(FRotator(-42.0f, 125.0f, 0.0f), FVector(0.0f, 0.0f, 2000.0f)), LightParams))
	{
		if (UDirectionalLightComponent* Component = Cast<UDirectionalLightComponent>(Sun->GetLightComponent()))
		{
			Component->SetMobility(EComponentMobility::Movable);
			Component->SetIntensity(6.0f);
			Component->SetAtmosphereSunLight(true);
		}
		OwnedSceneActors.Add(Sun);
	}

	if (AActor* Atmosphere = World->SpawnActor<AActor>(ASkyAtmosphere::StaticClass(), FTransform::Identity, LightParams))
	{
		OwnedSceneActors.Add(Atmosphere);
	}

	if (ASkyLight* Sky = World->SpawnActor<ASkyLight>(
		ASkyLight::StaticClass(), FTransform(FVector(0.0f, 0.0f, 1500.0f)), LightParams))
	{
		if (USkyLightComponent* Component = Sky->GetLightComponent())
		{
			Component->SetMobility(EComponentMobility::Movable);
			Component->SourceType = SLS_CapturedScene;
			Component->bRealTimeCapture = true;
			Component->SetIntensity(1.0f);
			Component->RecaptureSky();
		}
		OwnedSceneActors.Add(Sky);
	}

	Notes.Add(TEXT("Smoke mode: the probe spawned its own 200 m floor, a test wall, a sun, a sky atmosphere and a sky light, so it needs no city content."));

	Vantages.Add({ TEXT("smoke_floor_wide"), FVector(-600.0f, -600.0f, 300.0f), 45.0f, -12.0f, TEXT("smoke_default") });
	Vantages.Add({ TEXT("smoke_floor_low"), FVector(300.0f, 250.0f, 160.0f), 200.0f, -4.0f, TEXT("smoke_default") });

	// Open floor well short of the test wall, for the paired walk and sprint runs.
	SprintRunStart = FVector(0.0f, 0.0f, AMedievalCharacter::CapsuleHalfHeightCm + 5.0f);
	SprintRunYaw = 0.0f;
	bHaveSprintRun = true;
}

void AMedievalProbeActor::LoadLayout()
{
	FString Json;
	if (LayoutPath.IsEmpty() || !FFileHelper::LoadFileToString(Json, *LayoutPath))
	{
		Fail(FString::Printf(
			TEXT("City mode needs the layout at '%s', which is missing; run tools/medieval/build_layout.py and tools/medieval/build_level.py first, or use --mode smoke."),
			*LayoutPath));
		return;
	}

	TSharedPtr<FJsonObject> Root;
	const TSharedRef<TJsonReader<TCHAR>> Reader = TJsonReaderFactory<TCHAR>::Create(Json);
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		Fail(FString::Printf(TEXT("Layout '%s' is not valid JSON."), *LayoutPath));
		return;
	}

	// An authored metre point (x, y, z) arrives as the Unreal centimetre point
	// (100x, -100y, 100z): only Y is negated, no axis swap. Measured against this
	// engine install, see the world frame section of design.md.
	auto ReadMetreVector = [](const TArray<TSharedPtr<FJsonValue>>* Values, float DefaultZ) -> FVector
	{
		FVector Result(0.0f, 0.0f, DefaultZ);
		if (Values)
		{
			if (Values->Num() > 0) { Result.X = static_cast<float>((*Values)[0]->AsNumber() * 100.0); }
			if (Values->Num() > 1) { Result.Y = static_cast<float>((*Values)[1]->AsNumber() * -100.0); }
			if (Values->Num() > 2) { Result.Z = static_cast<float>((*Values)[2]->AsNumber() * 100.0); }
		}
		return Result;
	};

	const TSharedPtr<FJsonObject>* Start = nullptr;
	if (Root->TryGetObjectField(TEXT("player_start_m"), Start) && Start)
	{
		const TArray<TSharedPtr<FJsonValue>>* Location = nullptr;
		(*Start)->TryGetArrayField(TEXT("location"), Location);
		PlayerStartLocation = ReadMetreVector(Location, 0.0f);
		PlayerStartLocation.Z += AMedievalCharacter::CapsuleHalfHeightCm + 10.0f;
		PlayerStartYaw = MedievalProbe::HeadingToUnrealYaw(
			(*Start)->HasField(TEXT("yaw_deg")) ? (*Start)->GetNumberField(TEXT("yaw_deg")) : 0.0);
		// A flag, not a zero test: a layout may legitimately put the start at the
		// town centre, which is the origin.
		bHavePlayerStart = true;
	}

	const TSharedPtr<FJsonObject>* Walk = nullptr;
	if (Root->TryGetObjectField(TEXT("walk_probe_m"), Walk) && Walk)
	{
		const TArray<TSharedPtr<FJsonValue>>* OpenStart = nullptr;
		if ((*Walk)->TryGetArrayField(TEXT("open_run_start"), OpenStart) && OpenStart)
		{
			SprintRunStart = ReadMetreVector(OpenStart, 0.0f);
			SprintRunStart.Z = AMedievalCharacter::CapsuleHalfHeightCm + 10.0f;
			SprintRunYaw = MedievalProbe::HeadingToUnrealYaw(
				(*Walk)->HasField(TEXT("open_run_heading_deg")) ? (*Walk)->GetNumberField(TEXT("open_run_heading_deg")) : 0.0);
			bHaveSprintRun = true;
		}
	}

	const TArray<TSharedPtr<FJsonValue>>* VantageList = nullptr;
	if (Root->TryGetArrayField(TEXT("vantages_m"), VantageList) && VantageList)
	{
		for (const TSharedPtr<FJsonValue>& Value : *VantageList)
		{
			const TSharedPtr<FJsonObject> Object = Value->AsObject();
			if (!Object.IsValid())
			{
				continue;
			}
			const TArray<TSharedPtr<FJsonValue>>* Location = nullptr;
			Object->TryGetArrayField(TEXT("location"), Location);
			FProbeVantage Vantage;
			Vantage.Name = Object->GetStringField(TEXT("name"));
			Vantage.Location = ReadMetreVector(Location, 160.0f);
			Vantage.Yaw = MedievalProbe::HeadingToUnrealYaw(
				Object->HasField(TEXT("yaw_deg")) ? Object->GetNumberField(TEXT("yaw_deg")) : 0.0);
			Vantage.Pitch = static_cast<float>(Object->HasField(TEXT("pitch_deg")) ? Object->GetNumberField(TEXT("pitch_deg")) : 0.0);
			Vantage.Source = TEXT("city_layout");
			Vantages.Add(Vantage);
		}
	}

	const TSharedPtr<FJsonObject>* WalkProbe = nullptr;
	if (Root->TryGetObjectField(TEXT("walk_probe_m"), WalkProbe) && WalkProbe)
	{
		const TArray<TSharedPtr<FJsonValue>>* WallStart = nullptr;
		if ((*WalkProbe)->TryGetArrayField(TEXT("wall_run_start"), WallStart) && WallStart)
		{
			WallApproachStart = ReadMetreVector(WallStart, 0.0f);
			WallApproachStart.Z = AMedievalCharacter::CapsuleHalfHeightCm + 10.0f;
			WallApproachRotation = FRotator(0.0f, MedievalProbe::HeadingToUnrealYaw(
				(*WalkProbe)->HasField(TEXT("wall_run_heading_deg"))
					? (*WalkProbe)->GetNumberField(TEXT("wall_run_heading_deg")) : 0.0), 0.0f);
			bHaveWallRun = true;
		}
	}

	// The gatehouse placement, for the one run that walks a colliding character
	// through the arch rather than taking the opening on trust.
	const TArray<TSharedPtr<FJsonValue>>* Placements = nullptr;
	if (bHaveSprintRun && Root->TryGetArrayField(TEXT("placements"), Placements) && Placements)
	{
		for (const TSharedPtr<FJsonValue>& Value : *Placements)
		{
			const TSharedPtr<FJsonObject> Object = Value->AsObject();
			if (!Object.IsValid() || Object->GetStringField(TEXT("tag")) != TEXT("gate"))
			{
				continue;
			}
			const TArray<TSharedPtr<FJsonValue>>* Location = nullptr;
			Object->TryGetArrayField(TEXT("location_m"), Location);
			GateCentre = ReadMetreVector(Location, 0.0f);
			// Walk along the street the open run already proved is clear.
			GateStreetDirection = FRotator(0.0f, SprintRunYaw, 0.0f).Vector();
			bHaveGate = true;
			break;
		}
	}

	Notes.Add(FString::Printf(
		TEXT("City mode: read %d vantages, the wall run, the open run and %s from %s."),
		Vantages.Num(), bHaveGate ? TEXT("the gatehouse") : TEXT("no gatehouse"), *LayoutPath));
	if (bHaveGate)
	{
		Notes.Add(TEXT("The gate run demonstrates this gatehouse's arch at this placement against the collision the character walks on. It is not a claim about gate passability in general."));
	}
}

bool AMedievalProbeActor::PlaceCharacter(const FVector& Location, const FRotator& Rotation, const FString& Note)
{
	AMedievalCharacter* Character = GetProbeCharacter();
	APlayerController* Controller = GetProbeController();
	if (!Character || !Controller)
	{
		return false;
	}

	Character->GetCharacterMovement()->StopMovementImmediately();
	Character->SetActorLocationAndRotation(Location, FRotator(0.0f, Rotation.Yaw, 0.0f), false, nullptr, ETeleportType::TeleportPhysics);
	Controller->SetControlRotation(Rotation);

	FMedievalProbeStep Placement;
	Placement.Name = Note;
	Placement.Kind = TEXT("placement");
	Placement.Key = TEXT("(none)");
	Placement.KeyEvent = TEXT("(none)");
	Placement.Note = TEXT("State was set directly; this is placement, not evidence about the controls.");
	Placement.bControlEvidence = false;
	Placement.StartLocation = Location;
	Placement.EndLocation = Location;
	Placement.CameraName = Character->GetActiveCameraName().ToString();
	Placement.CameraLocation = Character->GetActiveCameraLocation();
	Placement.CameraRotation = Character->GetActiveCameraRotation();
	Placement.ControlRotationStart = Rotation;
	Placement.ControlRotationEnd = Rotation;
	Placement.ViewLocation = GetViewLocation();
	Placement.ViewRotation = GetViewRotation();
	Placement.bGroundFound = false;
	Steps.Add(Placement);
	return true;
}

void AMedievalProbeActor::Fail(const FString& Reason)
{
	Failures.AddUnique(Reason);
	UE_LOG(LogMedieval, Error, TEXT("Probe failure: %s"), *Reason);
}

void AMedievalProbeActor::EnterStage(EMedievalProbeStage NextStage)
{
	Stage = NextStage;
	StageTime = 0.0f;

	switch (Stage)
	{
	case EMedievalProbeStage::PrepareScene:
		if (Mode == EMedievalProbeMode::City)
		{
			if (bHavePlayerStart)
			{
				PlaceCharacter(PlayerStartLocation, FRotator(0.0f, PlayerStartYaw, 0.0f),
					TEXT("place_at_layout_player_start"));
			}
			else
			{
				// Said out loud rather than skipped silently: the run then starts
				// wherever the game mode put the character, not where the layout says.
				Notes.Add(TEXT("The layout has no player_start_m, so the probe did not place the character at one."));
			}
		}
		break;

	case EMedievalProbeStage::Settle:
		// Kind "settle" rather than "control" keeps these samples out of the
		// per-step walking envelope, which they would break: the character is still
		// dropping to the ground. They do still feed the whole-run aggregate, which
		// is deliberately wide enough for the drop and for the jump.
		OpenStep(TEXT("settle"), TEXT("settle"), TEXT("(none)"), TEXT("(none)"), false);
		break;

	case EMedievalProbeStage::CaptureIdle:
		OpenStep(TEXT("capture_idle_third_person"), TEXT("capture"), TEXT("(none)"), TEXT("(none)"), false);
		RequestCapture(TEXT("01_idle_third_person"));
		break;

	case EMedievalProbeStage::WalkThirdPerson:
		OpenStep(TEXT("hold_w_third_person"), TEXT("control"), TEXT("W"), TEXT("IE_Pressed held, IE_Released at end"), true);
		InjectKey(EKeys::W, IE_Pressed, 1.0f);
		break;

	case EMedievalProbeStage::ToggleCamera:
		OpenStep(TEXT("toggle_camera_to_first_person"), TEXT("control"), TEXT("V"), TEXT("IE_Pressed then IE_Released"), true);
		InjectKey(EKeys::V, IE_Pressed, 1.0f);
		InjectKey(EKeys::V, IE_Released, 0.0f);
		break;

	case EMedievalProbeStage::CaptureFirstPerson:
		OpenStep(TEXT("capture_first_person"), TEXT("capture"), TEXT("(none)"), TEXT("(none)"), false);
		RequestCapture(TEXT("03_first_person"));
		break;

	case EMedievalProbeStage::WalkFirstPerson:
		OpenStep(TEXT("hold_w_first_person"), TEXT("control"), TEXT("W"), TEXT("IE_Pressed held, IE_Released at end"), true);
		InjectKey(EKeys::W, IE_Pressed, 1.0f);
		break;

	case EMedievalProbeStage::LookAround:
		OpenStep(TEXT("look_with_mouse"), TEXT("control"), TEXT("MouseX, MouseY"), TEXT("IE_Axis every frame"), true);
		LookRotationStart = GetProbeController() ? GetProbeController()->GetControlRotation() : FRotator::ZeroRotator;
		break;

	case EMedievalProbeStage::CaptureLook:
		OpenStep(TEXT("capture_first_person_look"), TEXT("capture"), TEXT("(none)"), TEXT("(none)"), false);
		RequestCapture(TEXT("04_first_person_look"));
		break;

	case EMedievalProbeStage::DirectionRun:
		DirectionIndex = 0;
		bDirectionPlaced = false;
		DirectionPhaseTime = 0.0f;
		break;

	case EMedievalProbeStage::PacedWalk:
		if (bHaveSprintRun)
		{
			PlaceCharacter(SprintRunStart, FRotator(0.0f, SprintRunYaw, 0.0f), TEXT("place_at_paced_run_start"));
		}
		OpenStep(TEXT("paced_walk_w_only"), TEXT("control"), TEXT("W"),
			TEXT("IE_Pressed held, IE_Released at end"), true);
		InjectKey(EKeys::W, IE_Pressed, 1.0f);
		break;

	case EMedievalProbeStage::PacedSprint:
		// Same start, same heading, same duration: the only difference is Left Shift.
		if (bHaveSprintRun)
		{
			PlaceCharacter(SprintRunStart, FRotator(0.0f, SprintRunYaw, 0.0f), TEXT("place_at_paced_run_start_again"));
		}
		OpenStep(TEXT("paced_sprint_shift_and_w"), TEXT("control"), TEXT("LeftShift + W"),
			TEXT("both IE_Pressed held, both IE_Released at end"), true);
		InjectKey(EKeys::LeftShift, IE_Pressed, 1.0f);
		InjectKey(EKeys::W, IE_Pressed, 1.0f);
		break;

	case EMedievalProbeStage::Jump:
		OpenStep(TEXT("jump"), TEXT("control"), TEXT("SpaceBar"), TEXT("IE_Pressed then IE_Released"), true);
		InjectKey(EKeys::SpaceBar, IE_Pressed, 1.0f);
		InjectKey(EKeys::SpaceBar, IE_Released, 0.0f);
		break;

	case EMedievalProbeStage::WallApproach:
		if (bHaveWallRun)
		{
			PlaceCharacter(WallApproachStart, WallApproachRotation, TEXT("place_at_wall_run_start"));
		}
		OpenStep(TEXT("wall_approach"), TEXT("control"), TEXT("W"), TEXT("IE_Pressed held into wall_push"), true);
		InjectKey(EKeys::W, IE_Pressed, 1.0f);
		break;

	case EMedievalProbeStage::WallPush:
		OpenStep(TEXT("wall_push"), TEXT("control"), TEXT("W"), TEXT("still held from wall_approach, IE_Released at end"), true);
		break;

	case EMedievalProbeStage::CaptureWall:
		OpenStep(TEXT("capture_wall_contact"), TEXT("capture"), TEXT("(none)"), TEXT("(none)"), false);
		RequestCapture(TEXT("06_wall_contact"));
		break;

	case EMedievalProbeStage::Vantage:
		VantageIndex = 0;
		VantagePhaseTime = 0.0f;
		bVantagePlaced = false;
		// Vantage captures move the character directly, so they are placement and
		// stop counting towards the ground envelope the controls are judged on.
		bEnvelopeSampling = false;
		if (AMedievalCharacter* Character = GetProbeCharacter())
		{
			Character->GetCharacterMovement()->SetMovementMode(MOVE_Flying);
		}
		break;

	default:
		break;
	}
}

void AMedievalProbeActor::RunDirectionStage(float DeltaSeconds)
{
	if (!bHaveSprintRun || !Directions.IsValidIndex(DirectionIndex))
	{
		EnterStage(EMedievalProbeStage::PacedWalk);
		return;
	}

	const FProbeDirection& Direction = Directions[DirectionIndex];
	// Every key is run from a facing that puts its expected direction along the
	// clear heading, so all four have the same room and the same expected result.
	const FVector Expected = FRotator(0.0f, SprintRunYaw, 0.0f).Vector();

	if (!bDirectionPlaced)
	{
		PlaceCharacter(SprintRunStart, FRotator(0.0f, SprintRunYaw + Direction.YawOffset, 0.0f),
			FString::Printf(TEXT("place_for_direction_%s"), Direction.Name));
		OpenStep(FString::Printf(TEXT("direction_%s"), Direction.Name), TEXT("control"), Direction.Name,
			TEXT("IE_Pressed held, IE_Released at end"), true);
		InjectKey(Direction.Key, IE_Pressed, 1.0f);
		bDirectionPlaced = true;
		DirectionPhaseTime = 0.0f;
		return;
	}

	DirectionPhaseTime += DeltaSeconds;
	if (DirectionPhaseTime < MedievalProbe::DirectionRunSeconds)
	{
		return;
	}

	InjectKey(Direction.Key, IE_Released, 0.0f);
	CloseStep();

	const FVector Travel = CurrentStep.EndLocation - CurrentStep.StartLocation;
	const float Along = static_cast<float>(FVector::DotProduct(Travel, Expected));
	const FVector Across = Travel - Expected * Along;
	DirectionResults.Add(FString(Direction.Name), FVector2D(Along, Across.Size2D()));

	UE_LOG(LogMedieval, Log, TEXT("Direction %s: %.1f cm along the expected heading, %.1f cm across it."),
		Direction.Name, Along, Across.Size2D());

	++DirectionIndex;
	bDirectionPlaced = false;
	DirectionPhaseTime = 0.0f;
	if (!Directions.IsValidIndex(DirectionIndex))
	{
		EnterStage(EMedievalProbeStage::PacedWalk);
	}
}

void AMedievalProbeActor::RunGateStage(float DeltaSeconds)
{
	if (!bHaveGate)
	{
		Notes.Add(TEXT("No gatehouse in this mode, so the gate passage run did not happen."));
		EnterStage(EMedievalProbeStage::Vantage);
		return;
	}

	if (!bGatePlaced)
	{
		// Start on the street short of the arch, facing along it.
		const FVector Start = GateCentre - GateStreetDirection * MedievalProbe::GateApproachCm;
		PlaceCharacter(FVector(Start.X, Start.Y, AMedievalCharacter::CapsuleHalfHeightCm + 10.0f),
			FRotator(0.0f, GateStreetDirection.Rotation().Yaw, 0.0f), TEXT("place_short_of_gate"));

		OpenStep(TEXT("walk_through_gate"), TEXT("control"), TEXT("W"),
			TEXT("IE_Pressed held, IE_Released at end"), true);
		InjectKey(EKeys::W, IE_Pressed, 1.0f);
		GateLineAlongCm = static_cast<float>(FVector::DotProduct(GateCentre, GateStreetDirection));
		GateStartAlongCm = static_cast<float>(FVector::DotProduct(CurrentStep.StartLocation, GateStreetDirection));
		bGatePlaced = true;
		GatePhaseTime = 0.0f;
		return;
	}

	GatePhaseTime += DeltaSeconds;

	// Capture on crossing the gate line rather than at a guessed time, so the
	// frame is taken inside the archway and shows the opening it went through.
	if (ActiveCaptureName != TEXT("07_gate_passage")
		&& FVector::DotProduct(CurrentStep.EndLocation, GateStreetDirection) >= GateLineAlongCm)
	{
		RequestCapture(TEXT("07_gate_passage"));
	}

	if (GatePhaseTime < MedievalProbe::GateRunSeconds)
	{
		return;
	}

	if (!PollCapture())
	{
		return;
	}
	InjectKey(EKeys::W, IE_Released, 0.0f);

	CloseStep();
	GateEndAlongCm = static_cast<float>(FVector::DotProduct(CurrentStep.EndLocation, GateStreetDirection));
	GateMarginCm = GateEndAlongCm - GateLineAlongCm;
	bGateRunDone = true;

	UE_LOG(LogMedieval, Log,
		TEXT("Gate run: started %.1f cm short of the gate line and ended %.1f cm past it, travelling %.1f cm."),
		GateLineAlongCm - GateStartAlongCm, GateMarginCm, CurrentStep.DistanceCm);

	EnterStage(EMedievalProbeStage::Vantage);
}

void AMedievalProbeActor::RunStage(float DeltaSeconds)
{
	AMedievalCharacter* Character = GetProbeCharacter();

	switch (Stage)
	{
	case EMedievalProbeStage::WaitForPawn:
		if (Character && Character->WasInputContextApplied())
		{
			UE_LOG(LogMedieval, Log, TEXT("Probe found the player character after %.2f s with its input context applied."), TotalTime);
			EnterStage(EMedievalProbeStage::PrepareScene);
		}
		else if (TotalTime > MedievalProbe::PawnTimeout)
		{
			Fail(FString::Printf(
				TEXT("No AMedievalCharacter with an applied input context appeared within %.0f s; the game mode or Enhanced Input setup did not come up."),
				MedievalProbe::PawnTimeout));
			EnterStage(EMedievalProbeStage::Report);
		}
		break;

	case EMedievalProbeStage::PrepareScene:
		if (StageTime >= MedievalProbe::PrepareSeconds)
		{
			// A scene that could not be prepared cannot produce control evidence.
			EnterStage(Failures.IsEmpty() ? EMedievalProbeStage::Settle : EMedievalProbeStage::Report);
		}
		break;

	case EMedievalProbeStage::Settle:
		if (StageTime >= MedievalProbe::SettleSeconds)
		{
			CloseStep();
			EnterStage(EMedievalProbeStage::CaptureIdle);
		}
		break;

	case EMedievalProbeStage::CaptureIdle:
		if (PollCapture())
		{
			if (Character && !Character->IsFirstPerson())
			{
				ThirdPersonCameraLocation = Character->GetActiveCameraLocation();
				ThirdPersonViewLocation = GetViewLocation();
				bSawThirdPersonCamera = true;
			}
			CloseStep();
			EnterStage(EMedievalProbeStage::WalkThirdPerson);
		}
		break;

	case EMedievalProbeStage::WalkThirdPerson:
		// Captured while W is still held, so the frame shows the walk cycle
		// mid-stride rather than the settled idle pose.
		if (StageTime >= MedievalProbe::WalkCaptureSeconds && ActiveCaptureName != TEXT("02_walk_third_person"))
		{
			RequestCapture(TEXT("02_walk_third_person"));
		}
		if (StageTime >= MedievalProbe::WalkSeconds && PollCapture())
		{
			InjectKey(EKeys::W, IE_Released, 0.0f);
			if (Character && !Character->IsFirstPerson())
			{
				ThirdPersonCameraLocation = Character->GetActiveCameraLocation();
				ThirdPersonViewLocation = GetViewLocation();
				bSawThirdPersonCamera = true;
			}
			CloseStep();
			ThirdPersonWalkCm = CurrentStep.DistanceCm;
			EnterStage(EMedievalProbeStage::ToggleCamera);
		}
		break;

	case EMedievalProbeStage::ToggleCamera:
		if (StageTime >= MedievalProbe::ToggleSeconds)
		{
			CloseStep();
			if (Character && !Character->IsFirstPerson())
			{
				Fail(TEXT("Injecting V did not switch the character to the first person camera."));
			}
			EnterStage(EMedievalProbeStage::CaptureFirstPerson);
		}
		break;

	case EMedievalProbeStage::CaptureFirstPerson:
		if (PollCapture())
		{
			if (Character && Character->IsFirstPerson())
			{
				FirstPersonCameraLocation = Character->GetActiveCameraLocation();
				FirstPersonViewLocation = GetViewLocation();
				bSawFirstPersonCamera = true;
			}
			CloseStep();
			EnterStage(EMedievalProbeStage::WalkFirstPerson);
		}
		break;

	case EMedievalProbeStage::WalkFirstPerson:
		if (StageTime >= MedievalProbe::WalkSeconds)
		{
			InjectKey(EKeys::W, IE_Released, 0.0f);
			CloseStep();
			FirstPersonWalkCm = CurrentStep.DistanceCm;
			EnterStage(EMedievalProbeStage::LookAround);
		}
		break;

	case EMedievalProbeStage::LookAround:
		InjectMouseAxis(EKeys::MouseX, MedievalProbe::LookYawPerTick);
		InjectMouseAxis(EKeys::MouseY, MedievalProbe::LookPitchPerTick);
		if (StageTime >= MedievalProbe::LookSeconds)
		{
			LookRotationEnd = GetProbeController() ? GetProbeController()->GetControlRotation() : FRotator::ZeroRotator;
			CloseStep();
			const float YawDelta = FMath::Abs(FRotator::NormalizeAxis(LookRotationEnd.Yaw - LookRotationStart.Yaw));
			const float PitchDelta = FMath::Abs(FRotator::NormalizeAxis(LookRotationEnd.Pitch - LookRotationStart.Pitch));
			if (YawDelta < 5.0f || PitchDelta < 2.0f)
			{
				Fail(FString::Printf(
					TEXT("Injected mouse axes moved the view by only %.2f deg yaw and %.2f deg pitch; the look binding did not respond."),
					YawDelta, PitchDelta));
			}
			EnterStage(EMedievalProbeStage::CaptureLook);
		}
		break;

	case EMedievalProbeStage::CaptureLook:
		if (PollCapture())
		{
			CloseStep();
			EnterStage(EMedievalProbeStage::DirectionRun);
		}
		break;

	case EMedievalProbeStage::DirectionRun:
		RunDirectionStage(DeltaSeconds);
		break;

	case EMedievalProbeStage::PacedWalk:
		if (StageTime >= MedievalProbe::PacedRunSeconds)
		{
			InjectKey(EKeys::W, IE_Released, 0.0f);
			CloseStep();
			PacedWalkCm = CurrentStep.DistanceCm;
			PacedWalkPeakSpeed = CurrentStep.PeakSpeedCmS;
			EnterStage(EMedievalProbeStage::PacedSprint);
		}
		break;

	case EMedievalProbeStage::PacedSprint:
		if (Character && Character->IsSprinting())
		{
			bSprintFlagSeen = true;
		}
		if (StageTime >= MedievalProbe::PacedRunSeconds)
		{
			InjectKey(EKeys::W, IE_Released, 0.0f);
			InjectKey(EKeys::LeftShift, IE_Released, 0.0f);
			CloseStep();
			PacedSprintCm = CurrentStep.DistanceCm;
			PacedSprintPeakSpeed = CurrentStep.PeakSpeedCmS;
			EnterStage(EMedievalProbeStage::Jump);
		}
		break;

	case EMedievalProbeStage::Jump:
		// One step covers the whole flight, with the frame captured near the apex.
		if (StageTime >= MedievalProbe::JumpRiseSeconds && ActiveCaptureName != TEXT("05_jump"))
		{
			RequestCapture(TEXT("05_jump"));
		}
		if (StageTime >= MedievalProbe::JumpLandSeconds && PollCapture())
		{
			CloseStep();
			if (CurrentStep.ClearanceMaxCm < 20.0f)
			{
				Fail(FString::Printf(
					TEXT("Injecting SpaceBar lifted the character only %.1f cm above the ground; the jump binding did not respond."),
					CurrentStep.ClearanceMaxCm));
			}
			EnterStage(EMedievalProbeStage::WallApproach);
		}
		break;

	case EMedievalProbeStage::WallApproach:
		if (StageTime >= MedievalProbe::WallApproachSeconds)
		{
			CloseStep();
			WallApproachCm = CurrentStep.DistanceCm;
			EnterStage(EMedievalProbeStage::WallPush);
		}
		break;

	case EMedievalProbeStage::WallPush:
		if (StageTime >= MedievalProbe::WallPushSeconds)
		{
			InjectKey(EKeys::W, IE_Released, 0.0f);
			CloseStep();
			WallPushCm = CurrentStep.DistanceCm;
			EnterStage(EMedievalProbeStage::CaptureWall);
		}
		break;

	case EMedievalProbeStage::CaptureWall:
		if (PollCapture())
		{
			CloseStep();
			EnterStage(EMedievalProbeStage::GatePassage);
		}
		break;

	case EMedievalProbeStage::GatePassage:
		RunGateStage(DeltaSeconds);
		break;

	case EMedievalProbeStage::Vantage:
		if (!Vantages.IsValidIndex(VantageIndex))
		{
			EnterStage(EMedievalProbeStage::Report);
			break;
		}

		if (!bVantagePlaced)
		{
			// A vantage names where the camera should be, so the capsule is offset
			// down by the first person camera's height above its centre.
			const FProbeVantage& Vantage = Vantages[VantageIndex];
			PlaceCharacter(Vantage.Location - FVector(0.0f, 0.0f, MedievalProbe::FirstPersonCameraZCm),
				FRotator(Vantage.Pitch, Vantage.Yaw, 0.0f),
				FString::Printf(TEXT("place_at_vantage_%s"), *Vantage.Name));
			bVantagePlaced = true;
			VantagePhaseTime = 0.0f;
			break;
		}

		VantagePhaseTime += DeltaSeconds;
		if (VantagePhaseTime >= MedievalProbe::VantageSettleSeconds && PendingShotName.IsEmpty() && !bStepOpen)
		{
			OpenStep(FString::Printf(TEXT("capture_vantage_%s"), *Vantages[VantageIndex].Name),
				TEXT("capture"), TEXT("(none)"), TEXT("(none)"), false);
			RequestCapture(FString::Printf(TEXT("%02d_vantage_%s"), 10 + VantageIndex, *Vantages[VantageIndex].Name));
			StageTime = 0.0f;
			break;
		}

		if (bStepOpen && PollCapture())
		{
			CloseStep();
			++VantageIndex;
			bVantagePlaced = false;
			VantagePhaseTime = 0.0f;
		}
		break;

	case EMedievalProbeStage::Report:
		WriteReport();
		EnterStage(EMedievalProbeStage::Finished);
		break;

	case EMedievalProbeStage::Finished:
		break;

	default:
		break;
	}
}

void AMedievalProbeActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	TotalTime += DeltaSeconds;
	StageTime += DeltaSeconds;

	SampleStep();
	RunStage(DeltaSeconds);
}

void AMedievalProbeActor::WriteReport()
{
	if (bReportWritten)
	{
		return;
	}
	bReportWritten = true;

	// --- Acceptance checks, exactly the four the contract names -------------
	const float RequiredM = RequiredWalkDistanceCm / 100.0f;
	if (ThirdPersonWalkCm < 0.0f || ThirdPersonWalkCm <= RequiredWalkDistanceCm)
	{
		Fail(FString::Printf(
			TEXT("Held W in third person moved the character %.1f cm; more than %.0f cm (%.0f m) is required."),
			FMath::Max(ThirdPersonWalkCm, 0.0f), RequiredWalkDistanceCm, RequiredM));
	}
	if (FirstPersonWalkCm < 0.0f || FirstPersonWalkCm <= RequiredWalkDistanceCm)
	{
		Fail(FString::Printf(
			TEXT("Held W in first person moved the character %.1f cm; more than %.0f cm (%.0f m) is required."),
			FMath::Max(FirstPersonWalkCm, 0.0f), RequiredWalkDistanceCm, RequiredM));
	}

	// Measured between the two rendered view positions, so deleting the SetActive
	// calls that change the view would collapse this to about zero. Measuring the
	// camera components instead would only re-read the flag under test.
	const float CameraSeparation = (bSawThirdPersonCamera && bSawFirstPersonCamera)
		? FVector::Dist(ThirdPersonViewLocation, FirstPersonViewLocation)
		: -1.0f;
	if (!bSawThirdPersonCamera || !bSawFirstPersonCamera)
	{
		Fail(TEXT("Both camera modes were not observed, so the camera change could not be measured."));
	}
	else if (CameraSeparation < 100.0f)
	{
		Fail(FString::Printf(
			TEXT("The rendered view moved only %.1f cm between third and first person; the mode change did not reach the camera."),
			CameraSeparation));
	}
	if (ViewSampleCount == 0)
	{
		Fail(TEXT("The rendered view was never compared against the active camera component, so the camera check did not run at all."));
	}
	else if (WorstViewToCameraCm > MaxViewToCameraCm)
	{
		Fail(FString::Printf(
			TEXT("At step '%s' the rendered view sat %.1f cm from the camera component the character calls active, over the %.0f cm allowed; the active camera is not the one being rendered."),
			*WorstViewStep, WorstViewToCameraCm, MaxViewToCameraCm));
	}

	for (const FProbeDirection& Direction : Directions)
	{
		const FVector2D* Result = DirectionResults.Find(FString(Direction.Name));
		if (!Result)
		{
			Fail(FString::Printf(TEXT("The %s direction run never happened, so that key's mapping was not checked."), Direction.Name));
			continue;
		}
		if (Result->X < DirectionMinAlongCm)
		{
			Fail(FString::Printf(
				TEXT("Holding %s carried the character %.1f cm along its expected direction, under the %.0f cm required; its mapping or modifiers send it the wrong way."),
				Direction.Name, Result->X, DirectionMinAlongCm));
		}
		if (Result->Y > DirectionMaxAcrossCm)
		{
			Fail(FString::Printf(
				TEXT("Holding %s carried the character %.1f cm across its expected direction, over the %.0f cm allowed; its mapping or modifiers point it off axis."),
				Direction.Name, Result->Y, DirectionMaxAcrossCm));
		}
	}

	if (bHaveGate)
	{
		if (!bGateRunDone)
		{
			Fail(TEXT("The gate passage run never finished, so nothing showed a colliding character fits through the arch."));
		}
		else if (GateMarginCm < MedievalProbe::GateClearMarginCm)
		{
			Fail(FString::Printf(
				TEXT("Holding W from %.1f cm short of the gate line left the character %.1f cm past it, under the %.0f cm clear margin; a character with collision does not fit through this arch at this placement."),
				GateLineAlongCm - GateStartAlongCm, GateMarginCm, MedievalProbe::GateClearMarginCm));
		}
	}

	if (bGroundLost)
	{
		Fail(TEXT("No ground was found beneath the character at some point in the run; it left the ground envelope."));
	}
	else if (!bFeetSampled)
	{
		Fail(TEXT("Ground clearance was never sampled, so the ground envelope could not be checked."));
	}
	else if (RunClearanceMin < GroundFeetMinCm || RunClearanceMax > JumpFeetMaxCm)
	{
		Fail(FString::Printf(
			TEXT("Ground clearance ranged %.1f..%.1f cm, outside the %.0f..%.0f cm envelope."),
			RunClearanceMin, RunClearanceMax, GroundFeetMinCm, JumpFeetMaxCm));
	}
	for (const FMedievalProbeStep& Step : Steps)
	{
		if (Step.Kind == TEXT("control") && Step.Name != TEXT("jump")
			&& Step.bGroundFound && Step.ClearanceMaxCm > GroundFeetMaxCm)
		{
			Fail(FString::Printf(
				TEXT("Step '%s' left the character %.1f cm above the ground, over the %.0f cm walking envelope."),
				*Step.Name, Step.ClearanceMaxCm, GroundFeetMaxCm));
		}
	}

	const float SprintRatio = (PacedWalkCm > 1.0f && PacedSprintCm >= 0.0f) ? PacedSprintCm / PacedWalkCm : -1.0f;
	if (PacedWalkCm < 0.0f || PacedSprintCm < 0.0f)
	{
		Fail(TEXT("The paired walk and sprint runs never ran, so sprinting was not checked."));
	}
	else if (!bSprintFlagSeen)
	{
		Fail(TEXT("Injecting LeftShift never put the character into its sprinting state; the sprint binding did not respond."));
	}
	else if (SprintRatio < SprintMinRatio || PacedSprintCm - PacedWalkCm < SprintMinExtraCm)
	{
		Fail(FString::Printf(
			TEXT("Over %.1f s from the same start, W alone covered %.1f cm and LeftShift with W covered %.1f cm (ratio %.2f); at least %.2f times and %.0f cm more is required."),
			MedievalProbe::PacedRunSeconds, PacedWalkCm, PacedSprintCm, SprintRatio, SprintMinRatio, SprintMinExtraCm));
	}

	if (WallPushCm < 0.0f)
	{
		Fail(TEXT("The wall run never ran, so wall collision was not checked."));
	}
	else if (WallApproachCm < WallApproachMinCm)
	{
		// Without this, a character stuck from the start records no push and passes.
		Fail(FString::Printf(
			TEXT("The wall approach moved the character only %.1f cm, under the %.0f cm required, so the %.1f cm push proves nothing: it was already stuck or could not move."),
			FMath::Max(WallApproachCm, 0.0f), WallApproachMinCm, WallPushCm));
	}
	else if (WallPushCm > MaxWallPushCm)
	{
		Fail(FString::Printf(
			TEXT("Holding W against the wall moved the character %.1f cm; at most %.0f cm is allowed."),
			WallPushCm, MaxWallPushCm));
	}

	if (Shots.IsEmpty())
	{
		Fail(TEXT("No screenshot was captured, so there is no rendered evidence."));
	}

	// --- Report ------------------------------------------------------------
	const TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();
	Root->SetNumberField(TEXT("schema_version"), 1);
	Root->SetStringField(TEXT("generator"), TEXT("AMedievalProbeActor"));
	Root->SetStringField(TEXT("mode"), Mode == EMedievalProbeMode::Smoke ? TEXT("smoke") : TEXT("city"));
	Root->SetStringField(TEXT("engine_version"), FEngineVersion::Current().ToString());
	Root->SetStringField(TEXT("rhi"), GDynamicRHI ? GDynamicRHI->GetName() : TEXT("(none)"));
	Root->SetStringField(TEXT("feature_level"), LexToString(GMaxRHIFeatureLevel));
	Root->SetStringField(TEXT("shader_platform"), LexToString(GMaxRHIShaderPlatform));
	Root->SetStringField(TEXT("map"), GetWorld() ? GetWorld()->GetMapName() : TEXT("(no world)"));
	Root->SetStringField(TEXT("output_directory"), OutputDirectory);
	Root->SetNumberField(TEXT("total_seconds"), TotalTime);

	if (const AMedievalCharacter* Character = GetProbeCharacter())
	{
		const TSharedRef<FJsonObject> Input = MakeShared<FJsonObject>();
		Input->SetBoolField(TEXT("context_applied"), Character->WasInputContextApplied());
		TArray<TSharedPtr<FJsonValue>> Actions;
		for (const FName& Name : Character->GetBoundActionNames())
		{
			Actions.Add(MakeShared<FJsonValueString>(Name.ToString()));
		}
		Input->SetArrayField(TEXT("bound_actions"), Actions);
		Input->SetStringField(TEXT("source"), TEXT("Built with NewObject in C++; no input asset exists on disk."));
		Root->SetObjectField(TEXT("input"), Input);

		const TSharedRef<FJsonObject> Primitives = MakeShared<FJsonObject>();
		for (const TPair<FName, FBox>& Pair : Character->GetPrimitiveBounds())
		{
			const TSharedRef<FJsonObject> Entry = MakeShared<FJsonObject>();
			Entry->SetObjectField(TEXT("min_cm"), MedievalProbe::MakeVector(Pair.Value.Min));
			Entry->SetObjectField(TEXT("max_cm"), MedievalProbe::MakeVector(Pair.Value.Max));
			Primitives->SetObjectField(Pair.Key.ToString(), Entry);
		}
		Root->SetObjectField(TEXT("engine_primitive_bounds"), Primitives);
	}

	TArray<TSharedPtr<FJsonValue>> StepValues;
	for (const FMedievalProbeStep& Step : Steps)
	{
		const TSharedRef<FJsonObject> Object = MakeShared<FJsonObject>();
		Object->SetStringField(TEXT("name"), Step.Name);
		Object->SetStringField(TEXT("kind"), Step.Kind);
		Object->SetStringField(TEXT("key"), Step.Key);
		Object->SetStringField(TEXT("key_event"), Step.KeyEvent);
		Object->SetBoolField(TEXT("control_evidence"), Step.bControlEvidence);
		if (!Step.Note.IsEmpty())
		{
			Object->SetStringField(TEXT("note"), Step.Note);
		}
		Object->SetNumberField(TEXT("duration_s"), Step.DurationSeconds);
		Object->SetObjectField(TEXT("start_location"), MedievalProbe::MakeVector(Step.StartLocation));
		Object->SetObjectField(TEXT("end_location"), MedievalProbe::MakeVector(Step.EndLocation));
		Object->SetNumberField(TEXT("distance_cm"), Step.DistanceCm);
		Object->SetNumberField(TEXT("end_speed_cm_s"), Step.EndSpeedCmS);
		Object->SetNumberField(TEXT("peak_speed_cm_s"), Step.PeakSpeedCmS);
		Object->SetNumberField(TEXT("feet_z_min_cm"), Step.FeetZMin);
		Object->SetNumberField(TEXT("feet_z_max_cm"), Step.FeetZMax);
		if (Step.bGroundFound)
		{
			Object->SetNumberField(TEXT("ground_clearance_min_cm"), Step.ClearanceMinCm);
			Object->SetNumberField(TEXT("ground_clearance_max_cm"), Step.ClearanceMaxCm);
		}
		else
		{
			// Nothing traced the ground for this row, so it reports no clearance
			// rather than a zero that reads like a measurement.
			Object->SetField(TEXT("ground_clearance_min_cm"), MakeShared<FJsonValueNull>());
			Object->SetField(TEXT("ground_clearance_max_cm"), MakeShared<FJsonValueNull>());
		}
		Object->SetBoolField(TEXT("ground_measured"), Step.bGroundFound);
		Object->SetNumberField(TEXT("walk_phase_start_rad"), Step.WalkPhaseStart);
		Object->SetNumberField(TEXT("walk_phase_end_rad"), Step.WalkPhaseEnd);
		Object->SetNumberField(TEXT("peak_leg_pitch_deg"), Step.LegPitchPeak);

		const TSharedRef<FJsonObject> Camera = MakeShared<FJsonObject>();
		Camera->SetStringField(TEXT("name"), Step.CameraName);
		Camera->SetObjectField(TEXT("location"), MedievalProbe::MakeVector(Step.CameraLocation));
		Camera->SetObjectField(TEXT("rotation"), MedievalProbe::MakeRotator(Step.CameraRotation));
		Object->SetObjectField(TEXT("camera"), Camera);

		const TSharedRef<FJsonObject> View = MakeShared<FJsonObject>();
		View->SetStringField(TEXT("source"), TEXT("APlayerCameraManager, the position the controller renders from"));
		View->SetObjectField(TEXT("location"), MedievalProbe::MakeVector(Step.ViewLocation));
		View->SetObjectField(TEXT("rotation"), MedievalProbe::MakeRotator(Step.ViewRotation));
		View->SetNumberField(TEXT("distance_to_active_camera_cm_at_step_end"), Step.ViewToActiveCameraCm);
		Object->SetObjectField(TEXT("view"), View);

		Object->SetObjectField(TEXT("control_rotation_start"), MedievalProbe::MakeRotator(Step.ControlRotationStart));
		Object->SetObjectField(TEXT("control_rotation_end"), MedievalProbe::MakeRotator(Step.ControlRotationEnd));
		if (!Step.Screenshot.IsEmpty())
		{
			Object->SetStringField(TEXT("screenshot"), Step.Screenshot);
		}
		StepValues.Add(MakeShared<FJsonValueObject>(Object));
	}
	Root->SetArrayField(TEXT("steps"), StepValues);

	TArray<TSharedPtr<FJsonValue>> ShotValues;
	for (const FMedievalProbeShot& Shot : Shots)
	{
		const TSharedRef<FJsonObject> Object = MakeShared<FJsonObject>();
		Object->SetStringField(TEXT("name"), Shot.Name);
		Object->SetStringField(TEXT("file"), Shot.File);
		Object->SetStringField(TEXT("sha256"), Shot.Sha256);
		Object->SetNumberField(TEXT("bytes"), static_cast<double>(Shot.Bytes));
		Object->SetNumberField(TEXT("width"), Shot.Width);
		Object->SetNumberField(TEXT("height"), Shot.Height);
		Object->SetNumberField(TEXT("mean_luma"), Shot.MeanLuma);
		Object->SetNumberField(TEXT("luma_stddev"), Shot.LumaStdDev);
		Object->SetNumberField(TEXT("black_fraction"), Shot.BlackFraction);
		Object->SetBoolField(TEXT("blank"), Shot.bBlank);

		const TSharedRef<FJsonObject> Ground = MakeShared<FJsonObject>();
		Ground->SetStringField(TEXT("rect"), FString::Printf(TEXT("%d,%d %dx%d"),
			Shot.GroundRect[0], Shot.GroundRect[1],
			Shot.GroundRect[2] - Shot.GroundRect[0], Shot.GroundRect[3] - Shot.GroundRect[1]));
		Ground->SetNumberField(TEXT("mean_srgb_0_255"), Shot.GroundMeanSrgb);
		Ground->SetNumberField(TEXT("mean_linear_0_1"), Shot.GroundMeanLinear);
		Ground->SetNumberField(TEXT("mean_r"), Shot.GroundR);
		Ground->SetNumberField(TEXT("mean_g"), Shot.GroundG);
		Ground->SetNumberField(TEXT("mean_b"), Shot.GroundB);
		Ground->SetNumberField(TEXT("clipped_fraction"), Shot.GroundClippedFraction);
		Ground->SetNumberField(TEXT("p10_srgb"), Shot.GroundP10);
		Ground->SetNumberField(TEXT("p50_srgb"), Shot.GroundP50);
		Ground->SetNumberField(TEXT("p90_srgb"), Shot.GroundP90);
		Ground->SetNumberField(TEXT("p90_linear"), Shot.GroundP90Linear);
		Object->SetObjectField(TEXT("ground_region"), Ground);
		ShotValues.Add(MakeShared<FJsonValueObject>(Object));
	}
	Root->SetArrayField(TEXT("screenshots"), ShotValues);

	const TSharedRef<FJsonObject> Checks = MakeShared<FJsonObject>();
	Checks->SetNumberField(TEXT("third_person_walk_cm"), ThirdPersonWalkCm);
	Checks->SetNumberField(TEXT("first_person_walk_cm"), FirstPersonWalkCm);
	Checks->SetNumberField(TEXT("required_walk_cm"), RequiredWalkDistanceCm);
	Checks->SetObjectField(TEXT("third_person_camera_location"), MedievalProbe::MakeVector(ThirdPersonCameraLocation));
	Checks->SetObjectField(TEXT("first_person_camera_location"), MedievalProbe::MakeVector(FirstPersonCameraLocation));
	Checks->SetObjectField(TEXT("third_person_view_location"), MedievalProbe::MakeVector(ThirdPersonViewLocation));
	Checks->SetObjectField(TEXT("first_person_view_location"), MedievalProbe::MakeVector(FirstPersonViewLocation));
	Checks->SetNumberField(TEXT("camera_separation_cm"), CameraSeparation);
	Checks->SetStringField(TEXT("camera_separation_source"),
		TEXT("Measured between rendered view positions from APlayerCameraManager, not between camera component transforms, which stay valid whether or not a component is active."));
	Checks->SetNumberField(TEXT("view_to_active_camera_samples"), ViewSampleCount);
	Checks->SetNumberField(TEXT("worst_view_to_active_camera_cm"), WorstViewToCameraCm);
	Checks->SetStringField(TEXT("worst_view_to_active_camera_step"), WorstViewStep);
	Checks->SetNumberField(TEXT("view_to_active_camera_limit_cm"), MaxViewToCameraCm);

	const TSharedRef<FJsonObject> DirectionsJson = MakeShared<FJsonObject>();
	for (const FProbeDirection& Direction : Directions)
	{
		if (const FVector2D* Result = DirectionResults.Find(FString(Direction.Name)))
		{
			const TSharedRef<FJsonObject> Entry = MakeShared<FJsonObject>();
			Entry->SetNumberField(TEXT("yaw_offset_from_clear_heading_deg"), Direction.YawOffset);
			Entry->SetNumberField(TEXT("along_expected_cm"), Result->X);
			Entry->SetNumberField(TEXT("across_expected_cm"), Result->Y);
			DirectionsJson->SetObjectField(Direction.Name, Entry);
		}
	}
	DirectionsJson->SetNumberField(TEXT("required_along_cm"), DirectionMinAlongCm);
	DirectionsJson->SetNumberField(TEXT("allowed_across_cm"), DirectionMaxAcrossCm);
	DirectionsJson->SetNumberField(TEXT("run_seconds"), MedievalProbe::DirectionRunSeconds);
	Checks->SetObjectField(TEXT("directions"), DirectionsJson);

	const TSharedRef<FJsonObject> Gate = MakeShared<FJsonObject>();
	Gate->SetBoolField(TEXT("ran"), bGateRunDone);
	if (bHaveGate)
	{
		Gate->SetObjectField(TEXT("gate_centre"), MedievalProbe::MakeVector(GateCentre));
		Gate->SetObjectField(TEXT("street_direction"), MedievalProbe::MakeVector(GateStreetDirection));
		Gate->SetNumberField(TEXT("gate_line_along_cm"), GateLineAlongCm);
		Gate->SetNumberField(TEXT("start_along_cm"), GateStartAlongCm);
		Gate->SetNumberField(TEXT("end_along_cm"), GateEndAlongCm);
		Gate->SetNumberField(TEXT("margin_past_gate_cm"), GateMarginCm);
		Gate->SetNumberField(TEXT("required_margin_cm"), MedievalProbe::GateClearMarginCm);
		Gate->SetStringField(TEXT("bound"),
			TEXT("Shows a colliding character walking through this gatehouse's arch at this placement under held W. Not a claim about gate passability in general."));
	}
	Checks->SetObjectField(TEXT("gate_passage"), Gate);

	Checks->SetNumberField(TEXT("wall_approach_cm"), WallApproachCm);
	Checks->SetNumberField(TEXT("wall_approach_required_cm"), WallApproachMinCm);
	Checks->SetNumberField(TEXT("ground_clearance_min_cm"), RunClearanceMin);
	Checks->SetNumberField(TEXT("ground_clearance_max_cm"), RunClearanceMax);
	Checks->SetBoolField(TEXT("ground_always_found"), !bGroundLost);
	Checks->SetNumberField(TEXT("paced_run_seconds"), MedievalProbe::PacedRunSeconds);
	Checks->SetNumberField(TEXT("paced_walk_cm"), PacedWalkCm);
	Checks->SetNumberField(TEXT("paced_sprint_cm"), PacedSprintCm);
	Checks->SetNumberField(TEXT("paced_walk_peak_speed_cm_s"), PacedWalkPeakSpeed);
	Checks->SetNumberField(TEXT("paced_sprint_peak_speed_cm_s"), PacedSprintPeakSpeed);
	Checks->SetNumberField(TEXT("sprint_ratio"), SprintRatio);
	Checks->SetNumberField(TEXT("sprint_required_ratio"), SprintMinRatio);
	Checks->SetBoolField(TEXT("sprint_state_observed"), bSprintFlagSeen);
	Checks->SetStringField(TEXT("escape_binding"),
		TEXT("Bound to IA_Quit but unexercised: the probe exits through the engine's own exit request."));
	Checks->SetNumberField(TEXT("wall_push_cm"), WallPushCm);
	Checks->SetNumberField(TEXT("wall_push_limit_cm"), MaxWallPushCm);
	Checks->SetNumberField(TEXT("look_yaw_delta_deg"), FRotator::NormalizeAxis(LookRotationEnd.Yaw - LookRotationStart.Yaw));
	Checks->SetNumberField(TEXT("look_pitch_delta_deg"), FRotator::NormalizeAxis(LookRotationEnd.Pitch - LookRotationStart.Pitch));
	Checks->SetNumberField(TEXT("peak_leg_pitch_deg"), PeakLegPitch);
	Root->SetObjectField(TEXT("checks"), Checks);

	TArray<TSharedPtr<FJsonValue>> FailureValues;
	for (const FString& Failure : Failures)
	{
		FailureValues.Add(MakeShared<FJsonValueString>(Failure));
	}
	Root->SetArrayField(TEXT("failures"), FailureValues);

	TArray<TSharedPtr<FJsonValue>> NoteValues;
	for (const FString& Note : Notes)
	{
		NoteValues.Add(MakeShared<FJsonValueString>(Note));
	}
	Root->SetArrayField(TEXT("notes"), NoteValues);
	Root->SetBoolField(TEXT("passed"), Failures.IsEmpty());

	FString Output;
	const TSharedRef<TJsonWriter<TCHAR, TPrettyJsonPrintPolicy<TCHAR>>> Writer =
		TJsonWriterFactory<TCHAR, TPrettyJsonPrintPolicy<TCHAR>>::Create(&Output);
	FJsonSerializer::Serialize(Root, Writer);

	const FString ReportPath = FPaths::Combine(OutputDirectory, TEXT("probe.json"));
	if (!FFileHelper::SaveStringToFile(Output, *ReportPath, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM))
	{
		UE_LOG(LogMedieval, Error, TEXT("Could not write the probe report to %s."), *ReportPath);
	}
	else
	{
		UE_LOG(LogMedieval, Log, TEXT("Probe report written to %s: passed=%s, %d failures, %d screenshots."),
			*ReportPath, Failures.IsEmpty() ? TEXT("true") : TEXT("false"), Failures.Num(), Shots.Num());
	}

	// The probe owns this process; nothing else is going to stop it.
	RequestEngineExit(TEXT("MedievalProbe finished"));
}
