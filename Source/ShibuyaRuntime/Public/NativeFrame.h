#pragma once

#include <string>
#include <vector>

// Source and simulation points remain geographic ENU metres. This is the
// single adapter to Unreal's X-east/Y-south/Z-up centimetres. It also applies
// to displacements; unit directions use the reflection without the scale.
namespace Shibuya
{
inline constexpr char NativeFrameID[]="native-centimetres-Xeast-Ysouth-Zup-v2";
inline constexpr char NativeFrameDefinitionSHA256[]="2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170";
inline constexpr unsigned NativeSourceActorCount=112;
inline const std::string NativeFrameActorTag=std::string("ShibuyaNativeFrame:")+NativeFrameID+":"+NativeFrameDefinitionSHA256;
inline bool NativeFrameKnown(double schema,const std::string& id,const std::string& seal)
{return schema==1&&id==NativeFrameID&&seal==NativeFrameDefinitionSHA256;}
inline bool NativeSceneFramesKnown(const std::vector<std::vector<std::string>>& actors)
{
    if(actors.size()!=NativeSourceActorCount)return false;
    for(const auto& tags:actors)
    {
        unsigned count=0;
        for(const auto& tag:tags)if(tag.compare(0,19,"ShibuyaNativeFrame:")==0)
        {if(tag!=NativeFrameActorTag)return false;++count;}
        if(count!=1)return false;
    }
    return true;
}
template<class P> inline constexpr P SourceToNativeCM(const P& p)
{return {p.x*100,-p.y*100,p.z*100};}
template<class P> inline constexpr P NativeCMToSource(const P& p)
{return {p.x/100,-p.y/100,p.z/100};}
template<class P> inline constexpr P SourceToNativeDirection(const P& p)
{return {p.x,-p.y,p.z};}
inline constexpr double NativeHeading(double sourceHeading) {return -sourceHeading;}
inline constexpr double NativeRoll(double sourceRoll) {return -sourceRoll;}
}
