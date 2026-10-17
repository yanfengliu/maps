#pragma once
#include <cstdint>
#include <stdexcept>
#include <string>

namespace Shibuya
{
constexpr int64_t MaximumRuntimeInputBytes=32*1024*1024;
enum class RuntimeInputRole : uint8_t { Source,SupportManifest,DerivedTerrain,CodeSnapshot,ConfigurationSnapshot };
inline int64_t RuntimeInputLimit(RuntimeInputRole role)
{
    switch(role)
    {
        case RuntimeInputRole::Source:return MaximumRuntimeInputBytes;
        case RuntimeInputRole::SupportManifest:return 16*1024*1024;
        case RuntimeInputRole::DerivedTerrain:return 64*1024*1024;
        case RuntimeInputRole::CodeSnapshot:return 2*1024*1024;
        case RuntimeInputRole::ConfigurationSnapshot:return 100000;
    }
    throw std::runtime_error("Runtime input has an unknown fixed admission role.");
}
inline const char* RuntimeInputRoleName(RuntimeInputRole role)
{
    switch(role)
    {
        case RuntimeInputRole::Source:return "source";
        case RuntimeInputRole::SupportManifest:return "support_manifest";
        case RuntimeInputRole::DerivedTerrain:return "derived_terrain";
        case RuntimeInputRole::CodeSnapshot:return "code_snapshot";
        case RuntimeInputRole::ConfigurationSnapshot:return "configuration_snapshot";
    }
    throw std::runtime_error("Runtime input has an unknown fixed admission role.");
}
inline void AdmitRuntimeInputSize(int64_t size,int64_t expected,const std::string& name,RuntimeInputRole role=RuntimeInputRole::Source)
{
    const int64_t maximum=RuntimeInputLimit(role);
    if(size<1 || size>maximum || expected<-1 || expected>maximum ||
       (expected!=-1 && size!=expected))
        throw std::runtime_error("Runtime input "+name+" needs an existing1-"+std::to_string(maximum)+"-byte file matching its declared size before allocation (role="+RuntimeInputRoleName(role)+").");
}
}
