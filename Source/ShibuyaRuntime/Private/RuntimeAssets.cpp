#include "ShibuyaWorld.h"
#include "Dom/JsonObject.h"
#include "Engine/World.h"
#include "Engine/Level.h"
#include "Misc/PackagePath.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "UObject/Package.h"
#include "UObject/UObjectIterator.h"

TSharedPtr<FJsonObject> AShibuyaController::AssetSnapshot() const
{
    auto Result=MakeShared<FJsonObject>();bool Valid=true;bool MapFound=false;
    const UWorld* World=GetWorld();const FString MapName=World&&World->PersistentLevel?World->PersistentLevel->GetOutermost()->GetName():TEXT("");
    Result->SetStringField(TEXT("map_package"),MapName);
    FString Project=FPaths::ConvertRelativePathToFull(FPaths::ProjectDir()),Engine=FPaths::ConvertRelativePathToFull(FPaths::EngineDir());
    FPaths::NormalizeDirectoryName(Project);FPaths::NormalizeDirectoryName(Engine);Project+=TEXT("/");Engine+=TEXT("/");
    TArray<UPackage*> Packages;for(TObjectIterator<UPackage> It;It;++It)if(!It->GetLoadedPath().GetLocalFullPath().IsEmpty())Packages.Add(*It);
    Packages.Sort([](const UPackage& A,const UPackage& B){return A.GetName()<B.GetName();});
    TArray<TSharedPtr<FJsonValue>> Records;
    for(const auto* Package:Packages)
    {
        FString Filename=FPaths::ConvertRelativePathToFull(Package->GetLoadedPath().GetLocalFullPath());FPaths::NormalizeFilename(Filename);
        FString Root,Relative;
        if(Filename.StartsWith(Project)){Root=TEXT("project");Relative=Filename.Mid(Project.Len());}
        else if(Filename.StartsWith(Engine)){Root=TEXT("engine");Relative=Filename.Mid(Engine.Len());}
        else {Valid=false;continue;}
        if(!Filename.EndsWith(TEXT(".uasset"))&&!Filename.EndsWith(TEXT(".umap"))){Valid=false;continue;}
        if(!IFileManager::Get().FileExists(*Filename)){Valid=false;continue;}
        auto Entry=MakeShared<FJsonObject>();Entry->SetStringField(TEXT("package_name"),Package->GetName());Entry->SetStringField(TEXT("root"),Root);
        TArray<TSharedPtr<FJsonValue>> Files;Files.Add(MakeShared<FJsonValueString>(Relative));
        const FString Stem=FPaths::ChangeExtension(Filename,TEXT(""));
        for(const TCHAR* Extension:{TEXT("uexp"),TEXT("ubulk"),TEXT("uptnl")})
        {const FString Sidecar=Stem+TEXT(".")+Extension;if(IFileManager::Get().FileExists(*Sidecar))Files.Add(MakeShared<FJsonValueString>(Sidecar.Mid(Root==TEXT("project")?Project.Len():Engine.Len())));}
        Entry->SetArrayField(TEXT("files"),Files);Records.Add(MakeShared<FJsonValueObject>(Entry));
        if(Package->GetName()==MapName&&Filename.EndsWith(TEXT(".umap")))MapFound=true;
    }
    Result->SetBoolField(TEXT("valid"),Valid&&MapFound&&!Records.IsEmpty());Result->SetArrayField(TEXT("packages"),Records);
    Result->SetStringField(TEXT("bound"),TEXT("Actual already-loaded file-backed native packages, including map and asset sidecars. No potential asset catalog and no load/state setter."));
    return Result;
}
