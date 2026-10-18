#pragma once

#include "NativeFrame.h"
#include "Dom/JsonObject.h"
#include <stdexcept>

namespace Shibuya
{
inline TSharedPtr<FJsonObject> NativeFrameJSON()
{
    auto Frame=MakeShared<FJsonObject>();Frame->SetNumberField(TEXT("schema_version"),1);
    Frame->SetStringField(TEXT("id"),UTF8_TO_TCHAR(NativeFrameID));
    Frame->SetStringField(TEXT("definition_sha256"),UTF8_TO_TCHAR(NativeFrameDefinitionSHA256));return Frame;
}
inline void AdmitNativeFrame(const TSharedPtr<FJsonObject>& Packet,const TCHAR* Context)
{
    const TSharedPtr<FJsonObject>* Frame=nullptr;double Schema=0;FString ID,Seal;
    if(!Packet.IsValid()||!Packet->TryGetObjectField(TEXT("native_frame"),Frame)||!Frame||!Frame->IsValid()||
        (*Frame)->Values.Num()!=3||!(*Frame)->HasTypedField<EJson::Number>(TEXT("schema_version"))||
        !(*Frame)->TryGetNumberField(TEXT("schema_version"),Schema)||
        !(*Frame)->HasTypedField<EJson::String>(TEXT("id"))||!(*Frame)->HasTypedField<EJson::String>(TEXT("definition_sha256"))||
        !(*Frame)->TryGetStringField(TEXT("id"),ID)||!(*Frame)->TryGetStringField(TEXT("definition_sha256"),Seal)||
        !NativeFrameKnown(Schema,TCHAR_TO_UTF8(*ID),TCHAR_TO_UTF8(*Seal)))
        throw std::runtime_error(TCHAR_TO_UTF8(*FString::Printf(TEXT("Runtime %s needs the sealed native ESU v2 frame; regenerate this packet and its bound source generation."),Context)));
}
}
