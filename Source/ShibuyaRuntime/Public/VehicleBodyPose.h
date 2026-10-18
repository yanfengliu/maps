#pragma once

// Bound: a sufficient finite rigid fit using a qualified caller-owned ground
// query and whole-footprint predicate. This header cannot establish either.
#include <array>
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>

namespace Shibuya
{
struct BodyPoint { double x=0,y=0,z=0; };
inline constexpr std::array<BodyPoint,10> VehicleBodyContacts{{
    {2.2,0,0},{-2.2,0,0},{2.2,.9,0},{2.2,-.9,0},{-2.2,.9,0},{-2.2,-.9,0},
    {1.35,.78,0},{1.35,-.78,0},{-1.35,.78,0},{-1.35,-.78,0}}};
struct BodyGround
{
    bool found=false,eligible=false,sameFirstHit=false;
    double height=0,normalZ=0;
    std::size_t face=std::numeric_limits<std::size_t>::max();
};
enum class BodyPoseFailure { None,InvalidInput,MissingSupport,IneligibleSupport,
    ChangedFirstHit,InvalidSupport,Normal,Grade,ContactGap,Footprint };
struct BodyPose
{
    bool valid=false;
    double height=0,pitch=0,roll=0,maximumGap=0;
    unsigned queries=0;
    std::size_t failedContact=VehicleBodyContacts.size();
    BodyPoseFailure failure=BodyPoseFailure::InvalidInput;
    std::array<std::size_t,10> supportFaces{};
};
inline std::array<BodyPoint,10> PlaceVehicleBody(const BodyPoint& origin,double heading,
    double height,double pitch,double roll)
{
    const double ch=std::cos(heading),sh=std::sin(heading),cp=std::cos(pitch),sp=std::sin(pitch),
        cr=std::cos(roll),sr=std::sin(roll);
    std::array<BodyPoint,10> placed;
    for(std::size_t i=0;i<VehicleBodyContacts.size();++i)
    {
        const auto p=VehicleBodyContacts[i];
        const double along=cp*p.x-sp*sr*p.y,across=cr*p.y,up=sp*p.x+cp*sr*p.y;
        placed[i]={origin.x+ch*along-sh*across,origin.y+sh*along+ch*across,height+up};
    }
    return placed;
}
// Query receives actual posed XYZ and the immutable source reference height.
// It must enumerate blockers before eligibility, select both the fixed-reference
// and posed +0.8/-1.0m first hits, and require their agreement. It must not use a
// different reference, choose a lower hit or infer ground eligibility from slope.
// WholeFootprint must check the actual four-corner polygon against admitted
// source coverage/building/layer exclusions, rather than only these ten points.
template<class Query,class WholeFootprint>
BodyPose FitVehicleBody(const BodyPoint& origin,double heading,Query&& query,WholeFootprint&& footprint)
{
    BodyPose result;result.height=origin.z;
    if(!std::isfinite(origin.x)||!std::isfinite(origin.y)||!std::isfinite(origin.z)||!std::isfinite(heading))return result;
    auto refuse=[&](BodyPoseFailure reason,std::size_t contact)
    {result.failure=reason;result.failedContact=contact;return result;};
    auto validate=[&](const BodyGround& hit,const BodyPoint& p)
    {
        if(!hit.found)return BodyPoseFailure::MissingSupport;
        if(!hit.sameFirstHit)return BodyPoseFailure::ChangedFirstHit;
        if(!hit.eligible)return BodyPoseFailure::IneligibleSupport;
        if(!std::isfinite(hit.height)||!std::isfinite(hit.normalZ)||hit.height<origin.z-1||hit.height>origin.z+.8||
            hit.height<p.z-1||hit.height>p.z+.8)return BodyPoseFailure::InvalidSupport;
        if(hit.normalZ<.7)return BodyPoseFailure::Normal;
        return BodyPoseFailure::None;
    };
    const auto flat=PlaceVehicleBody(origin,heading,origin.z,0,0);
    std::array<double,10> ground;
    double sum=0,along=0,across=0,along2=0,across2=0;
    for(std::size_t i=0;i<flat.size();++i)
    {
        const auto hit=query(flat[i],origin.z);++result.queries;
        const auto reason=validate(hit,flat[i]);
        if(reason!=BodyPoseFailure::None)return refuse(reason,i);
        ground[i]=hit.height;const auto p=VehicleBodyContacts[i];
        sum+=hit.height;along+=p.x*hit.height;across+=p.y*hit.height;
        along2+=p.x*p.x;across2+=p.y*p.y;
    }
    result.height=sum/ground.size();along/=along2;across/=across2;
    double low=std::numeric_limits<double>::infinity(),high=-low;
    for(std::size_t i=0;i<ground.size();++i)
    {
        const auto p=VehicleBodyContacts[i];const double residual=ground[i]-(result.height+along*p.x+across*p.y);
        low=std::min(low,residual);high=std::max(high,residual);
    }
    result.height+=(low+high)/2;result.pitch=std::atan(along);
    result.roll=std::atan(across*std::cos(result.pitch));
    if(!std::isfinite(result.height)||!std::isfinite(result.pitch)||!std::isfinite(result.roll))
        return refuse(BodyPoseFailure::InvalidSupport,VehicleBodyContacts.size());
    if(std::hypot(along,across)>.2)return refuse(BodyPoseFailure::Grade,VehicleBodyContacts.size());
    const auto placed=PlaceVehicleBody(origin,heading,result.height,result.pitch,result.roll);
    if(!footprint(placed))return refuse(BodyPoseFailure::Footprint,VehicleBodyContacts.size());
    for(std::size_t i=0;i<placed.size();++i)
    {
        const auto hit=query(placed[i],origin.z);++result.queries;
        result.supportFaces[i]=hit.face;
        const auto reason=validate(hit,placed[i]);
        if(reason!=BodyPoseFailure::None)return refuse(reason,i);
        const double gap=std::abs(hit.height-placed[i].z);result.maximumGap=std::max(result.maximumGap,gap);
        if(gap>.2)return refuse(BodyPoseFailure::ContactGap,i);
    }
    result.valid=true;result.failure=BodyPoseFailure::None;return result;
}
}
