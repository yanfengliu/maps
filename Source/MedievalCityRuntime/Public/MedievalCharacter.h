#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "MedievalCharacter.generated.h"

class UCameraComponent;
class UInputAction;
class UInputMappingContext;
class USpringArmComponent;
class UStaticMesh;
class UStaticMeshComponent;

/**
 * Player character for the medieval town.
 *
 * Every input object is built in C++ at runtime, and the third person avatar is
 * assembled from engine primitive static meshes, so nothing tracked in Git is a
 * binary Unreal package.
 */
UCLASS()
class MEDIEVALCITYRUNTIME_API AMedievalCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AMedievalCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void PawnClientRestart() override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	/** True when the first person camera is the active one. */
	UFUNCTION(BlueprintCallable, Category = "Medieval|Camera")
	bool IsFirstPerson() const { return bFirstPerson; }

	/** Activates exactly one camera and matches avatar visibility and rotation source to it. */
	UFUNCTION(BlueprintCallable, Category = "Medieval|Camera")
	void SetFirstPerson(bool bNewFirstPerson);

	UFUNCTION(BlueprintCallable, Category = "Medieval|Camera")
	void ToggleCameraMode();

	/** World location of whichever camera is active right now. */
	UFUNCTION(BlueprintCallable, Category = "Medieval|Camera")
	FVector GetActiveCameraLocation() const;

	UFUNCTION(BlueprintCallable, Category = "Medieval|Camera")
	FRotator GetActiveCameraRotation() const;

	UFUNCTION(BlueprintCallable, Category = "Medieval|Camera")
	FName GetActiveCameraName() const;

	/** Horizontal speed in cm/s, the quantity that drives the procedural walk cycle. */
	UFUNCTION(BlueprintCallable, Category = "Medieval|Movement")
	float GetHorizontalSpeed() const;

	UFUNCTION(BlueprintCallable, Category = "Medieval|Movement")
	bool IsSprinting() const { return bSprinting; }

	/** Local-space bounds of each engine primitive the avatar uses, as measured at construction. */
	const TMap<FName, FBox>& GetPrimitiveBounds() const { return PrimitiveBounds; }

	/** Names of the input actions that were built and bound, for probe evidence. */
	const TArray<FName>& GetBoundActionNames() const { return BoundActionNames; }

	bool WasInputContextApplied() const { return bInputContextApplied; }

	/** Walk cycle phase in radians; the probe reads it to show the legs actually swing. */
	float GetWalkPhase() const { return WalkPhase; }

	float GetLeftLegPitch() const;

	static constexpr float CapsuleRadiusCm = 34.0f;
	static constexpr float CapsuleHalfHeightCm = 88.0f;
	static constexpr float WalkSpeedCmS = 300.0f;
	static constexpr float SprintSpeedCmS = 600.0f;
	static constexpr float JumpImpulseCmS = 420.0f;
	static constexpr float AccelerationCmS2 = 1500.0f;
	static constexpr float BrakingCmS2 = 2000.0f;

protected:
	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void StartJump();
	void StopJump();
	void StartSprint();
	void StopSprint();
	void Quit();

	/** Creates the input actions, modifiers and mapping context if they do not exist yet. */
	void BuildInputObjects();

	/** Adds the runtime-built mapping context to the local player subsystem. */
	void ApplyInputContext();

	void UpdateWalkCycle(float DeltaSeconds);

	// --- Components ---------------------------------------------------------

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Medieval|Camera")
	TObjectPtr<UCameraComponent> FirstPersonCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Medieval|Camera")
	TObjectPtr<USpringArmComponent> ThirdPersonBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Medieval|Camera")
	TObjectPtr<UCameraComponent> ThirdPersonCamera;

	/** Parent of every avatar primitive, so one visibility call hides the whole figure. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Medieval|Avatar")
	TObjectPtr<USceneComponent> AvatarRoot;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> Torso;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> Head;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> Hat;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<USceneComponent> LeftShoulder;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<USceneComponent> RightShoulder;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<USceneComponent> LeftHip;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<USceneComponent> RightHip;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> LeftArm;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> RightArm;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> LeftLeg;

	UPROPERTY(VisibleAnywhere, Category = "Medieval|Avatar")
	TObjectPtr<UStaticMeshComponent> RightLeg;

	// --- Runtime-built Enhanced Input objects -------------------------------
	// These are UPROPERTY so the garbage collector keeps them alive; they have
	// no asset on disk.

	UPROPERTY(Transient)
	TObjectPtr<UInputMappingContext> MappingContext;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> MoveAction;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> LookAction;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> JumpAction;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> SprintAction;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> ToggleCameraAction;

	UPROPERTY(Transient)
	TObjectPtr<UInputAction> QuitAction;

private:
	/**
	 * Adds one engine primitive under Parent.
	 *
	 * The mesh is scaled to DesiredSizeCm from its measured local bounds, and
	 * placed so that the face chosen by AlignFraction (0 centre, +1 max, -1 min
	 * per axis) sits at PivotCm in the parent's space. Measuring instead of
	 * assuming means a primitive whose origin is not at its centre still lands
	 * where the figure needs it.
	 */
	UStaticMeshComponent* AddPrimitive(FName Name, USceneComponent* Parent, UStaticMesh* PrimitiveMesh,
		UMaterialInterface* Material, const FVector& DesiredSizeCm, const FVector& AlignFraction,
		const FVector& PivotCm);

	void RecordPrimitiveBounds(FName Name, UStaticMesh* PrimitiveMesh);

	bool bFirstPerson = false;
	bool bSprinting = false;
	bool bInputContextApplied = false;
	float WalkPhase = 0.0f;
	float WalkBlend = 0.0f;

	TMap<FName, FBox> PrimitiveBounds;
	TArray<FName> BoundActionNames;
};
