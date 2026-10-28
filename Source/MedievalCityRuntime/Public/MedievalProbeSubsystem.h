#pragma once

#include "CoreMinimal.h"
#include "MedievalProbeActor.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "MedievalProbeSubsystem.generated.h"

/**
 * Spawns the probe actor, and only when -MedievalProbe=<directory> is on the
 * command line, so ordinary play never runs the sequence.
 */
UCLASS()
class MEDIEVALCITYRUNTIME_API UMedievalProbeSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	/** Command line switch that arms the probe. */
	static const TCHAR* ProbeDirectorySwitch;

private:
	void OnPostLoadMap(UWorld* World);

	FString OutputDirectory;
	FString LayoutPath;
	EMedievalProbeMode Mode = EMedievalProbeMode::Smoke;
	bool bArmed = false;
	bool bSpawned = false;
	FDelegateHandle PostLoadMapHandle;
};
