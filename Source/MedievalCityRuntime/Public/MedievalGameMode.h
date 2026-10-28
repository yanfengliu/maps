#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MedievalGameMode.generated.h"

/**
 * Game mode for the medieval town.
 *
 * It exists in C++ so the project needs no Blueprint game mode asset, and it
 * supplies a fallback player start so the probe can run on a bare engine map
 * that has no PlayerStart actor in it.
 */
UCLASS()
class MEDIEVALCITYRUNTIME_API AMedievalGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMedievalGameMode();

	virtual AActor* FindPlayerStart_Implementation(AController* Player, const FString& IncomingName) override;

	/** Used only when the loaded map contains no PlayerStart. */
	UPROPERTY(EditDefaultsOnly, Category = "Medieval")
	FVector FallbackStartLocation = FVector(0.0f, 0.0f, 200.0f);

private:
	UPROPERTY(Transient)
	TObjectPtr<AActor> FallbackStart;
};
