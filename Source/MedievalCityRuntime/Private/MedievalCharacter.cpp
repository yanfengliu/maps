#include "MedievalCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"
#include "Materials/MaterialInterface.h"
#include "MedievalCityRuntime.h"
#include "UObject/ConstructorHelpers.h"

namespace MedievalAvatar
{
	// Measured from the avatar's feet. The figure ends exactly at the capsule top
	// (2 * 88 cm), so nothing pokes through the collider.
	constexpr float HipZ = 88.0f;
	constexpr float HipX = 11.0f;
	constexpr float TorsoBottomZ = 88.0f;
	constexpr float TorsoTopZ = 142.0f;
	constexpr float ShoulderZ = 136.0f;
	constexpr float ShoulderX = 23.0f;
	constexpr float HeadBottomZ = 142.0f;
	constexpr float HatBottomZ = 162.0f;

	constexpr float StrideLengthCm = 110.0f;
	constexpr float SwingDegrees = 32.0f;
	constexpr float BobCm = 2.0f;

	const FVector AlignTop(0.0f, 0.0f, 1.0f);
	const FVector AlignBottom(0.0f, 0.0f, -1.0f);
}

AMedievalCharacter::AMedievalCharacter()
{
	PrimaryActorTick.bCanEverTick = true;
	bUseControllerRotationPitch = false;
	bUseControllerRotationRoll = false;
	bUseControllerRotationYaw = false;

	GetCapsuleComponent()->InitCapsuleSize(CapsuleRadiusCm, CapsuleHalfHeightCm);

	UCharacterMovementComponent* Movement = GetCharacterMovement();
	Movement->MaxWalkSpeed = WalkSpeedCmS;
	Movement->MaxAcceleration = AccelerationCmS2;
	Movement->BrakingDecelerationWalking = BrakingCmS2;
	Movement->JumpZVelocity = JumpImpulseCmS;
	Movement->AirControl = 0.3f;
	Movement->bOrientRotationToMovement = true;
	Movement->RotationRate = FRotator(0.0f, 540.0f, 0.0f);
	Movement->GravityScale = 1.0f;

	FirstPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
	FirstPersonCamera->SetupAttachment(GetCapsuleComponent());
	FirstPersonCamera->SetRelativeLocation(FVector(0.0f, 0.0f, 72.0f));
	FirstPersonCamera->bUsePawnControlRotation = true;
	FirstPersonCamera->FieldOfView = 95.0f;
	FirstPersonCamera->bAutoActivate = false;

	ThirdPersonBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("ThirdPersonBoom"));
	ThirdPersonBoom->SetupAttachment(GetCapsuleComponent());
	ThirdPersonBoom->SetRelativeLocation(FVector(0.0f, 0.0f, 50.0f));
	ThirdPersonBoom->TargetArmLength = 320.0f;
	ThirdPersonBoom->bUsePawnControlRotation = true;
	ThirdPersonBoom->bDoCollisionTest = true;
	ThirdPersonBoom->bEnableCameraLag = true;
	ThirdPersonBoom->CameraLagSpeed = 12.0f;
	ThirdPersonBoom->bEnableCameraRotationLag = true;
	ThirdPersonBoom->CameraRotationLagSpeed = 16.0f;

	ThirdPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ThirdPersonCamera"));
	ThirdPersonCamera->SetupAttachment(ThirdPersonBoom, USpringArmComponent::SocketName);
	ThirdPersonCamera->bUsePawnControlRotation = false;
	ThirdPersonCamera->FieldOfView = 90.0f;
	ThirdPersonCamera->bAutoActivate = true;

	// The avatar is assembled from engine primitive static meshes, so no skeletal
	// mesh or animation asset has to be tracked in Git.
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeMesh(TEXT("/Engine/BasicShapes/Cube.Cube"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> ConeMesh(TEXT("/Engine/BasicShapes/Cone.Cone"));
	static ConstructorHelpers::FObjectFinder<UMaterialInterface> ShapeMaterial(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));

	RecordPrimitiveBounds(TEXT("Cube"), CubeMesh.Object);
	RecordPrimitiveBounds(TEXT("Cylinder"), CylinderMesh.Object);
	RecordPrimitiveBounds(TEXT("Sphere"), SphereMesh.Object);
	RecordPrimitiveBounds(TEXT("Cone"), ConeMesh.Object);

	UMaterialInterface* Material = ShapeMaterial.Object;

	AvatarRoot = CreateDefaultSubobject<USceneComponent>(TEXT("AvatarRoot"));
	AvatarRoot->SetupAttachment(GetCapsuleComponent());
	AvatarRoot->SetRelativeLocation(FVector(0.0f, 0.0f, -CapsuleHalfHeightCm));

	Torso = AddPrimitive(TEXT("Torso"), AvatarRoot, CubeMesh.Object, Material,
		FVector(38.0f, 22.0f, MedievalAvatar::TorsoTopZ - MedievalAvatar::TorsoBottomZ), MedievalAvatar::AlignBottom,
		FVector(0.0f, 0.0f, MedievalAvatar::TorsoBottomZ));

	Head = AddPrimitive(TEXT("Head"), AvatarRoot, SphereMesh.Object, Material,
		FVector(24.0f, 24.0f, 24.0f), MedievalAvatar::AlignBottom,
		FVector(0.0f, 0.0f, MedievalAvatar::HeadBottomZ));

	Hat = AddPrimitive(TEXT("Hat"), AvatarRoot, ConeMesh.Object, Material,
		FVector(30.0f, 30.0f, 2.0f * CapsuleHalfHeightCm - MedievalAvatar::HatBottomZ), MedievalAvatar::AlignBottom,
		FVector(0.0f, 0.0f, MedievalAvatar::HatBottomZ));

	LeftShoulder = CreateDefaultSubobject<USceneComponent>(TEXT("LeftShoulder"));
	LeftShoulder->SetupAttachment(AvatarRoot);
	LeftShoulder->SetRelativeLocation(FVector(0.0f, -MedievalAvatar::ShoulderX, MedievalAvatar::ShoulderZ));

	RightShoulder = CreateDefaultSubobject<USceneComponent>(TEXT("RightShoulder"));
	RightShoulder->SetupAttachment(AvatarRoot);
	RightShoulder->SetRelativeLocation(FVector(0.0f, MedievalAvatar::ShoulderX, MedievalAvatar::ShoulderZ));

	LeftHip = CreateDefaultSubobject<USceneComponent>(TEXT("LeftHip"));
	LeftHip->SetupAttachment(AvatarRoot);
	LeftHip->SetRelativeLocation(FVector(0.0f, -MedievalAvatar::HipX, MedievalAvatar::HipZ));

	RightHip = CreateDefaultSubobject<USceneComponent>(TEXT("RightHip"));
	RightHip->SetupAttachment(AvatarRoot);
	RightHip->SetRelativeLocation(FVector(0.0f, MedievalAvatar::HipX, MedievalAvatar::HipZ));

	// Limbs hang from their pivot, so the mesh's top face is aligned to the pivot
	// origin and the pivot's pitch rotation becomes the swing.
	const FVector ArmSize(12.0f, 12.0f, MedievalAvatar::ShoulderZ - 78.0f);
	LeftArm = AddPrimitive(TEXT("LeftArm"), LeftShoulder, CylinderMesh.Object, Material, ArmSize, MedievalAvatar::AlignTop, FVector::ZeroVector);
	RightArm = AddPrimitive(TEXT("RightArm"), RightShoulder, CylinderMesh.Object, Material, ArmSize, MedievalAvatar::AlignTop, FVector::ZeroVector);

	const FVector LegSize(18.0f, 18.0f, MedievalAvatar::HipZ);
	LeftLeg = AddPrimitive(TEXT("LeftLeg"), LeftHip, CylinderMesh.Object, Material, LegSize, MedievalAvatar::AlignTop, FVector::ZeroVector);
	RightLeg = AddPrimitive(TEXT("RightLeg"), RightHip, CylinderMesh.Object, Material, LegSize, MedievalAvatar::AlignTop, FVector::ZeroVector);
}

void AMedievalCharacter::RecordPrimitiveBounds(FName Name, UStaticMesh* PrimitiveMesh)
{
	if (PrimitiveMesh)
	{
		PrimitiveBounds.Add(Name, PrimitiveMesh->GetBoundingBox());
	}
	else
	{
		UE_LOG(LogMedieval, Error,
			TEXT("Engine primitive '%s' did not load from /Engine/BasicShapes; the avatar cannot be assembled without it."),
			*Name.ToString());
	}
}

UStaticMeshComponent* AMedievalCharacter::AddPrimitive(FName Name, USceneComponent* Parent, UStaticMesh* PrimitiveMesh,
	UMaterialInterface* Material, const FVector& DesiredSizeCm, const FVector& AlignFraction,
	const FVector& PivotCm)
{
	UStaticMeshComponent* Component = CreateDefaultSubobject<UStaticMeshComponent>(Name);
	Component->SetupAttachment(Parent);
	Component->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Component->SetCanEverAffectNavigation(false);
	Component->bCastDynamicShadow = true;
	Component->SetRelativeLocation(PivotCm);

	if (!PrimitiveMesh)
	{
		return Component;
	}

	Component->SetStaticMesh(PrimitiveMesh);
	if (Material)
	{
		Component->SetMaterial(0, Material);
	}

	// Measure the primitive instead of assuming its origin convention, so a change
	// in the engine's BasicShapes cannot silently shift a limb.
	const FBox Bounds = PrimitiveMesh->GetBoundingBox();
	const FVector Size = Bounds.GetSize();
	const FVector Centre = Bounds.GetCenter();
	const FVector Scale(
		Size.X > KINDA_SMALL_NUMBER ? DesiredSizeCm.X / Size.X : 1.0f,
		Size.Y > KINDA_SMALL_NUMBER ? DesiredSizeCm.Y / Size.Y : 1.0f,
		Size.Z > KINDA_SMALL_NUMBER ? DesiredSizeCm.Z / Size.Z : 1.0f);

	Component->SetRelativeScale3D(Scale);
	Component->SetRelativeLocation(PivotCm - (Centre * Scale) - AlignFraction * DesiredSizeCm * 0.5);
	return Component;
}

void AMedievalCharacter::SetFirstPerson(bool bNewFirstPerson)
{
	bFirstPerson = bNewFirstPerson;

	// Exactly one camera is active; AActor::CalcCamera uses the first active one.
	FirstPersonCamera->SetActive(bFirstPerson);
	ThirdPersonCamera->SetActive(!bFirstPerson);

	AvatarRoot->SetVisibility(!bFirstPerson, /*bPropagateToChildren*/ true);

	bUseControllerRotationYaw = bFirstPerson;
	GetCharacterMovement()->bOrientRotationToMovement = !bFirstPerson;

	UE_LOG(LogMedieval, Log, TEXT("Camera mode is now %s; avatar %s."),
		bFirstPerson ? TEXT("first person") : TEXT("third person"),
		bFirstPerson ? TEXT("hidden") : TEXT("visible"));
}

void AMedievalCharacter::ToggleCameraMode()
{
	SetFirstPerson(!bFirstPerson);
}

FVector AMedievalCharacter::GetActiveCameraLocation() const
{
	return bFirstPerson ? FirstPersonCamera->GetComponentLocation() : ThirdPersonCamera->GetComponentLocation();
}

FRotator AMedievalCharacter::GetActiveCameraRotation() const
{
	return bFirstPerson ? FirstPersonCamera->GetComponentRotation() : ThirdPersonCamera->GetComponentRotation();
}

FName AMedievalCharacter::GetActiveCameraName() const
{
	return bFirstPerson ? FName(TEXT("FirstPersonCamera")) : FName(TEXT("ThirdPersonCamera"));
}

float AMedievalCharacter::GetHorizontalSpeed() const
{
	return GetVelocity().Size2D();
}

float AMedievalCharacter::GetLeftLegPitch() const
{
	return LeftHip ? LeftHip->GetRelativeRotation().Pitch : 0.0f;
}

void AMedievalCharacter::BeginPlay()
{
	Super::BeginPlay();
	SetFirstPerson(false);
}

void AMedievalCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	UpdateWalkCycle(DeltaSeconds);
}

void AMedievalCharacter::UpdateWalkCycle(float DeltaSeconds)
{
	const float Speed = GetHorizontalSpeed();
	const float TargetBlend = FMath::Clamp(Speed / WalkSpeedCmS, 0.0f, 1.6f);
	WalkBlend = FMath::FInterpTo(WalkBlend, TargetBlend, DeltaSeconds, 8.0f);

	if (Speed > 5.0f)
	{
		const float Cadence = Speed / MedievalAvatar::StrideLengthCm;
		WalkPhase = FMath::Fmod(WalkPhase + 2.0f * PI * Cadence * DeltaSeconds, 2.0f * PI);
	}
	else if (WalkBlend < 0.02f)
	{
		// Settle the legs under the body instead of freezing mid-stride.
		WalkPhase = FMath::FInterpTo(WalkPhase > PI ? WalkPhase - 2.0f * PI : WalkPhase, 0.0f, DeltaSeconds, 8.0f);
	}

	const float Swing = MedievalAvatar::SwingDegrees * FMath::Min(WalkBlend, 1.2f);
	const float Wave = FMath::Sin(WalkPhase);

	LeftHip->SetRelativeRotation(FRotator(Swing * Wave, 0.0f, 0.0f));
	RightHip->SetRelativeRotation(FRotator(-Swing * Wave, 0.0f, 0.0f));
	LeftShoulder->SetRelativeRotation(FRotator(-Swing * 0.7f * Wave, 0.0f, 0.0f));
	RightShoulder->SetRelativeRotation(FRotator(Swing * 0.7f * Wave, 0.0f, 0.0f));

	const float Bob = MedievalAvatar::BobCm * WalkBlend * FMath::Abs(FMath::Sin(WalkPhase));
	AvatarRoot->SetRelativeLocation(FVector(0.0f, 0.0f, -CapsuleHalfHeightCm + Bob));
}

void AMedievalCharacter::BuildInputObjects()
{
	if (MappingContext)
	{
		return;
	}

	auto MakeAction = [this](const TCHAR* Name, EInputActionValueType ValueType) -> UInputAction*
	{
		UInputAction* Action = NewObject<UInputAction>(this, Name);
		Action->ValueType = ValueType;
		return Action;
	};

	MoveAction = MakeAction(TEXT("IA_Move"), EInputActionValueType::Axis2D);
	LookAction = MakeAction(TEXT("IA_Look"), EInputActionValueType::Axis2D);
	JumpAction = MakeAction(TEXT("IA_Jump"), EInputActionValueType::Boolean);
	SprintAction = MakeAction(TEXT("IA_Sprint"), EInputActionValueType::Boolean);
	ToggleCameraAction = MakeAction(TEXT("IA_ToggleCamera"), EInputActionValueType::Boolean);
	QuitAction = MakeAction(TEXT("IA_Quit"), EInputActionValueType::Boolean);

	MappingContext = NewObject<UInputMappingContext>(this, TEXT("IMC_Medieval"));

	// W/A/S/D are digital keys feeding one Axis2D action, so each needs modifiers:
	// swizzle lifts the key's X value onto Y for forward/back, negate flips it.
	auto Swizzle = [this](EInputAxisSwizzle Order) -> UInputModifierSwizzleAxis*
	{
		UInputModifierSwizzleAxis* Modifier = NewObject<UInputModifierSwizzleAxis>(this);
		Modifier->Order = Order;
		return Modifier;
	};
	auto Negate = [this]() -> UInputModifierNegate*
	{
		return NewObject<UInputModifierNegate>(this);
	};

	FEnhancedActionKeyMapping& Forward = MappingContext->MapKey(MoveAction, EKeys::W);
	Forward.Modifiers.Add(Swizzle(EInputAxisSwizzle::YXZ));

	FEnhancedActionKeyMapping& Back = MappingContext->MapKey(MoveAction, EKeys::S);
	Back.Modifiers.Add(Swizzle(EInputAxisSwizzle::YXZ));
	Back.Modifiers.Add(Negate());

	FEnhancedActionKeyMapping& Left = MappingContext->MapKey(MoveAction, EKeys::A);
	Left.Modifiers.Add(Negate());

	MappingContext->MapKey(MoveAction, EKeys::D);

	MappingContext->MapKey(LookAction, EKeys::MouseX);
	FEnhancedActionKeyMapping& LookUp = MappingContext->MapKey(LookAction, EKeys::MouseY);
	LookUp.Modifiers.Add(Swizzle(EInputAxisSwizzle::YXZ));

	MappingContext->MapKey(JumpAction, EKeys::SpaceBar);
	MappingContext->MapKey(SprintAction, EKeys::LeftShift);
	MappingContext->MapKey(ToggleCameraAction, EKeys::V);
	MappingContext->MapKey(QuitAction, EKeys::Escape);

	UE_LOG(LogMedieval, Log, TEXT("Built %d runtime input key mappings with no input asset on disk."),
		MappingContext->GetMappings().Num());
}

void AMedievalCharacter::ApplyInputContext()
{
	BuildInputObjects();

	APlayerController* PlayerController = Cast<APlayerController>(GetController());
	if (!PlayerController)
	{
		return;
	}

	ULocalPlayer* LocalPlayer = PlayerController->GetLocalPlayer();
	if (!LocalPlayer)
	{
		return;
	}

	UEnhancedInputLocalPlayerSubsystem* Subsystem =
		ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LocalPlayer);
	if (!Subsystem)
	{
		UE_LOG(LogMedieval, Error,
			TEXT("No UEnhancedInputLocalPlayerSubsystem on the local player; check DefaultPlayerInputClass in Config/DefaultInput.ini."));
		return;
	}

	Subsystem->ClearAllMappings();
	Subsystem->AddMappingContext(MappingContext, 0);
	bInputContextApplied = true;
	UE_LOG(LogMedieval, Log, TEXT("Applied runtime mapping context IMC_Medieval to the local player subsystem."));
}

void AMedievalCharacter::PawnClientRestart()
{
	Super::PawnClientRestart();
	ApplyInputContext();
}

void AMedievalCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	BuildInputObjects();

	UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!Input)
	{
		UE_LOG(LogMedieval, Error,
			TEXT("PlayerInputComponent is %s, not UEnhancedInputComponent; set DefaultInputComponentClass to /Script/EnhancedInput.EnhancedInputComponent."),
			*GetNameSafe(PlayerInputComponent));
		return;
	}

	BoundActionNames.Reset();
	Input->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AMedievalCharacter::Move);
	BoundActionNames.Add(TEXT("IA_Move"));
	Input->BindAction(LookAction, ETriggerEvent::Triggered, this, &AMedievalCharacter::Look);
	BoundActionNames.Add(TEXT("IA_Look"));
	Input->BindAction(JumpAction, ETriggerEvent::Started, this, &AMedievalCharacter::StartJump);
	Input->BindAction(JumpAction, ETriggerEvent::Completed, this, &AMedievalCharacter::StopJump);
	BoundActionNames.Add(TEXT("IA_Jump"));
	Input->BindAction(SprintAction, ETriggerEvent::Started, this, &AMedievalCharacter::StartSprint);
	Input->BindAction(SprintAction, ETriggerEvent::Completed, this, &AMedievalCharacter::StopSprint);
	BoundActionNames.Add(TEXT("IA_Sprint"));
	Input->BindAction(ToggleCameraAction, ETriggerEvent::Started, this, &AMedievalCharacter::ToggleCameraMode);
	BoundActionNames.Add(TEXT("IA_ToggleCamera"));
	Input->BindAction(QuitAction, ETriggerEvent::Started, this, &AMedievalCharacter::Quit);
	BoundActionNames.Add(TEXT("IA_Quit"));

	ApplyInputContext();
}

void AMedievalCharacter::Move(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!Controller || Axis.IsNearlyZero())
	{
		return;
	}

	const FRotator YawOnly(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
	const FRotationMatrix Frame(YawOnly);
	AddMovementInput(Frame.GetUnitAxis(EAxis::X), Axis.Y);
	AddMovementInput(Frame.GetUnitAxis(EAxis::Y), Axis.X);
}

void AMedievalCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(-Axis.Y);
}

void AMedievalCharacter::StartJump()
{
	Jump();
}

void AMedievalCharacter::StopJump()
{
	StopJumping();
}

void AMedievalCharacter::StartSprint()
{
	bSprinting = true;
	GetCharacterMovement()->MaxWalkSpeed = SprintSpeedCmS;
}

void AMedievalCharacter::StopSprint()
{
	bSprinting = false;
	GetCharacterMovement()->MaxWalkSpeed = WalkSpeedCmS;
}

void AMedievalCharacter::Quit()
{
	UE_LOG(LogMedieval, Log, TEXT("Quit action triggered; requesting engine exit."));
	RequestEngineExit(TEXT("MedievalCharacter quit action"));
}
