#include "MedievalProbeSubsystem.h"

#include "Engine/World.h"
#include "MedievalCityRuntime.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "UObject/UObjectGlobals.h"

const TCHAR* UMedievalProbeSubsystem::ProbeDirectorySwitch = TEXT("MedievalProbe=");

void UMedievalProbeSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	const TCHAR* CommandLine = FCommandLine::Get();
	if (!FParse::Value(CommandLine, ProbeDirectorySwitch, OutputDirectory) || OutputDirectory.IsEmpty())
	{
		return;
	}

	OutputDirectory = FPaths::ConvertRelativePathToFull(OutputDirectory);

	FString ModeText;
	if (FParse::Value(CommandLine, TEXT("MedievalProbeMode="), ModeText) && ModeText.Equals(TEXT("city"), ESearchCase::IgnoreCase))
	{
		Mode = EMedievalProbeMode::City;
	}

	if (!FParse::Value(CommandLine, TEXT("MedievalProbeLayout="), LayoutPath))
	{
		LayoutPath = FPaths::Combine(FPaths::ProjectDir(), TEXT("assets/generated/medieval/city_layout.json"));
	}
	LayoutPath = FPaths::ConvertRelativePathToFull(LayoutPath);

	bArmed = true;
	PostLoadMapHandle = FCoreUObjectDelegates::PostLoadMapWithWorld.AddUObject(this, &UMedievalProbeSubsystem::OnPostLoadMap);

	UE_LOG(LogMedieval, Log, TEXT("Probe armed by -%s%s (mode %s)."),
		ProbeDirectorySwitch, *OutputDirectory,
		Mode == EMedievalProbeMode::Smoke ? TEXT("smoke") : TEXT("city"));
}

void UMedievalProbeSubsystem::Deinitialize()
{
	if (PostLoadMapHandle.IsValid())
	{
		FCoreUObjectDelegates::PostLoadMapWithWorld.Remove(PostLoadMapHandle);
		PostLoadMapHandle.Reset();
	}
	Super::Deinitialize();
}

void UMedievalProbeSubsystem::OnPostLoadMap(UWorld* World)
{
	if (!bArmed || bSpawned || !World || !World->IsGameWorld())
	{
		return;
	}

	// Deferred, so the probe is configured before its BeginPlay spawns the test
	// scene the character needs to stand on.
	AMedievalProbeActor* Probe = World->SpawnActorDeferred<AMedievalProbeActor>(
		AMedievalProbeActor::StaticClass(), FTransform::Identity, nullptr, nullptr,
		ESpawnActorCollisionHandlingMethod::AlwaysSpawn);
	if (!Probe)
	{
		UE_LOG(LogMedieval, Error, TEXT("Could not spawn AMedievalProbeActor into world '%s'."), *World->GetMapName());
		return;
	}

	Probe->Configure(OutputDirectory, Mode, LayoutPath);
	Probe->FinishSpawning(FTransform::Identity);
	bSpawned = true;
}
