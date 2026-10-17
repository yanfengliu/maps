#pragma once
#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "ShibuyaRendererLibrary.generated.h"

UCLASS()
class SHIBUYARUNTIME_API UShibuyaRendererLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()
public:
    // Observation only: no recapture, cvar changes, material updates or view-state allocation.
    UFUNCTION(BlueprintCallable,Category="Shibuya")
    static FString InspectWorldResources(UObject* WorldContextObject);
};
