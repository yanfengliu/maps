#pragma once
#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "ShibuyaRendererLibrary.generated.h"

class UStaticMeshComponent;

UCLASS()
class SHIBUYARUNTIME_API UShibuyaRendererLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()
public:
    // Fixed read-only regression controls on actual Unreal JSON value types.
    UFUNCTION(BlueprintCallable,Category="Shibuya")
    static FString InspectNativeFrameJsonControls();

    // Observation only: no recapture, cvar changes, material updates or view-state allocation.
    UFUNCTION(BlueprintCallable,Category="Shibuya")
    static FString InspectWorldResources(UObject* WorldContextObject);

    // Read-only current collision context. Game builds explicitly lack editor source data.
    UFUNCTION(BlueprintCallable,Category="Shibuya")
    static FString InspectSupportCollisionContext(const UStaticMeshComponent* Component);

    // Probe-only, after benchmark. Observes the actual game viewport, never creates a view.
    static void BeginMainViewCapture(UObject* WorldContextObject, const FString& CaptureId);
    static FString EndMainViewCapture();
    static void StopMainViewCapture();
};
