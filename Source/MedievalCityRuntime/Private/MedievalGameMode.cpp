#include "MedievalGameMode.h"

#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerStart.h"
#include "MedievalCharacter.h"
#include "MedievalCityRuntime.h"

AMedievalGameMode::AMedievalGameMode()
{
	DefaultPawnClass = AMedievalCharacter::StaticClass();
	PlayerControllerClass = APlayerController::StaticClass();
	bStartPlayersAsSpectators = false;
}

AActor* AMedievalGameMode::FindPlayerStart_Implementation(AController* Player, const FString& IncomingName)
{
	if (AActor* Start = Super::FindPlayerStart_Implementation(Player, IncomingName))
	{
		return Start;
	}

	if (!FallbackStart)
	{
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		FallbackStart = GetWorld()->SpawnActor<APlayerStart>(
			APlayerStart::StaticClass(), FTransform(FRotator::ZeroRotator, FallbackStartLocation), Params);

		UE_LOG(LogMedieval, Warning,
			TEXT("Map '%s' has no PlayerStart; spawned a fallback start at %s."),
			*GetWorld()->GetMapName(), *FallbackStartLocation.ToCompactString());
	}

	return FallbackStart;
}
