#pragma once
#include "CoreMinimal.h"
#include "RuntimeReadLimit.h"

namespace Shibuya
{
// Windows checks every existing project component for any reparse-point kind,
// refusing access errors. The output path is checked again after mkdir.
FString ConfinedProjectFile(const FString& Relative,bool MustExist);
// Admission on both stat and opened handle occurs before the bounded allocation.
// A single opened archive reads exactly that admitted byte count; growth cannot
// increase the buffer, and size changes/errors make the input fail closed.
// Role caps are fixed by native call sites, never by an input record's size.
TArray<uint8> ReadBoundedProjectInput(const FString& Relative,int64 ExpectedSize=-1,RuntimeInputRole Role=RuntimeInputRole::Source);
}
