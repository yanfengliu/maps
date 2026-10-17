#include "RuntimeFiles.h"
#include "RuntimePath.h"
#include "RuntimeReadLimit.h"
#include "HAL/FileManager.h"
#include "Serialization/Archive.h"
#include "Misc/Paths.h"
#include "Windows/WindowsHWrapper.h"
#include <stdexcept>

FString Shibuya::ConfinedProjectFile(const FString& Relative,bool MustExist)
{
    if(!SafeRelativePath(TCHAR_TO_UTF8(*Relative)))throw std::runtime_error("Runtime file path is not a safe project-relative Windows path.");
    FString Root=FPaths::ConvertRelativePathToFull(FPaths::ProjectDir());FPaths::NormalizeDirectoryName(Root);
    FString Path=Root;
    TArray<FString> Parts;Relative.ParseIntoArray(Parts,TEXT("/"),false);
    auto Inspect=[&](const FString& Current,bool Last,bool AllowMissing=false)
    {
        const DWORD Attributes=::GetFileAttributesW(*Current);
        if(Attributes==INVALID_FILE_ATTRIBUTES)
        {
            const DWORD Error=::GetLastError();
            if(!MustExist && AllowMissing && (Error==ERROR_FILE_NOT_FOUND || Error==ERROR_PATH_NOT_FOUND))return;
            throw std::runtime_error("Cannot inspect runtime file component; missing inputs or access errors are not a pass.");
        }
        if((Attributes&FILE_ATTRIBUTE_REPARSE_POINT)!=0)throw std::runtime_error("Runtime file path crosses an existing reparse point; use real project-local files.");
        if(!Last && (Attributes&FILE_ATTRIBUTE_DIRECTORY)==0)throw std::runtime_error("Runtime file parent component is not a directory.");
        if(Last && (Attributes&FILE_ATTRIBUTE_DIRECTORY)!=0)throw std::runtime_error("Runtime file path names a directory instead of a file.");
    };
    // Include every existing ancestor above ProjectDir. A junction parent can
    // redirect ordinary Editor/Game input reads even when project children are real.
    if(Root.Len()<3 || Root[1]!=TEXT(':') || Root[2]!=TEXT('/'))
        throw std::runtime_error("Runtime project root needs a real absolute Windows drive path.");
    FString Ancestor=Root.Left(3);Inspect(Ancestor,false);
    const FString RootRelative=Root.Mid(3);
    if(!SafeRelativePath(TCHAR_TO_UTF8(*RootRelative)))
        throw std::runtime_error("Runtime project root contains an unsafe Windows path component.");
    TArray<FString> AncestorParts;RootRelative.ParseIntoArray(AncestorParts,TEXT("/"),false);
    for(const auto& Part:AncestorParts){Ancestor=FPaths::Combine(Ancestor,Part);Inspect(Ancestor,false);}
    for(int32 i=0;i<Parts.Num();++i){Path=FPaths::Combine(Path,Parts[i]);Inspect(Path,i==Parts.Num()-1,true);}
    return Path;
}

TArray<uint8> Shibuya::ReadBoundedProjectInput(const FString& Relative,int64 ExpectedSize,RuntimeInputRole Role)
{
    const FString Path=ConfinedProjectFile(Relative,true);
    const int64 StatSize=IFileManager::Get().FileSize(*Path);
    AdmitRuntimeInputSize(StatSize,ExpectedSize,TCHAR_TO_UTF8(*Relative),Role);
    TUniquePtr<FArchive> Reader(IFileManager::Get().CreateFileReader(*Path,FILEREAD_Silent));
    if(!Reader)throw std::runtime_error("Cannot open admitted runtime input "+std::string(TCHAR_TO_UTF8(*Relative))+" for a bounded read.");
    const int64 OpenSize=Reader->TotalSize();
    AdmitRuntimeInputSize(OpenSize,StatSize,TCHAR_TO_UTF8(*Relative),Role);
    TArray<uint8> Bytes;Bytes.SetNumUninitialized(static_cast<int32>(OpenSize));
    Reader->Serialize(Bytes.GetData(),OpenSize);
    if(Reader->IsError() || Reader->Tell()!=OpenSize || Reader->TotalSize()!=OpenSize ||
       IFileManager::Get().FileSize(*Path)!=OpenSize)
        throw std::runtime_error("Runtime input "+std::string(TCHAR_TO_UTF8(*Relative))+" changed size or could not complete its bounded read.");
    return Bytes;
}
