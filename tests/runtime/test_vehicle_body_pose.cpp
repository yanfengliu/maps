#include "VehicleBodyPose.h"
#include "fixtures/vehicle_body_retained.h"
#include <iostream>
#include <stdexcept>
#include <vector>
#include <string>

namespace
{
unsigned Checks=0;
void Check(bool condition,const char* name)
{++Checks;if(!condition)throw std::runtime_error(name);}
double Distance(const Shibuya::BodyPoint& a,const Shibuya::BodyPoint& b)
{return std::sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y)+(a.z-b.z)*(a.z-b.z));}
struct RoadQuery
{
    const RoadFixture& road;
    Shibuya::BodyGround operator()(const Shibuya::BodyPoint& p,double reference) const
    {
        bool original=false,posed=false;double oz=-1e99,pz=-1e99,on=0,pn=0;
        for(const auto& t:road.triangles)
        {
            const auto a=t[0],b=t[1],c=t[2];const double ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y;
            const double d=ux*vy-uy*vx;if(d==0)continue;
            const double s=((p.x-a.x)*vy-(p.y-a.y)*vx)/d,r=(ux*(p.y-a.y)-uy*(p.x-a.x))/d;
            if(s<0||r<0||s+r>1)continue;
            const double z=a.z+s*(b.z-a.z)+r*(c.z-a.z);
            const double gx=((b.z-a.z)*vy-(c.z-a.z)*uy)/d,gy=(ux*(c.z-a.z)-vx*(b.z-a.z))/d;
            const double normal=1/std::sqrt(1+gx*gx+gy*gy);
            if(z>=reference-1&&z<=reference+.8&&(!original||z>oz)){original=true;oz=z;on=normal;}
            if(z>=p.z-1&&z<=p.z+.8&&(!posed||z>pz)){posed=true;pz=z;pn=normal;}
        }
        // Numerical road-only fixture: this does not supply production source eligibility.
        return {original&&posed,true,original&&posed&&oz==pz,pz,pn};
    }
};
}
int main()
{
    try {
    using namespace Shibuya;
    auto whole=[](const std::array<BodyPoint,10>&){return true;};
    auto plane=[](const BodyPoint& p,double){return BodyGround{true,true,true,2+.1*p.x-.04*p.y,1/std::sqrt(1+.01+.0016)};};
    const auto fit=FitVehicleBody({0,0,2},.7,plane,whole);
    Check(fit.valid&&fit.queries==20&&fit.maximumGap<1e-12,"sloped plane finite fit");
    auto crest=[](const BodyPoint& p,double){return BodyGround{true,true,true,2-.08*std::abs(p.x)+.02*p.y,.996};};
    const BodyPoint origin{.2,0,1.984};const auto old=PlaceVehicleBody(origin,0,origin.z,std::atan(-.08),std::atan(.02));
    double oldGap=0;for(const auto& p:old)oldGap=std::max(oldGap,std::abs(crest(p,origin.z).height-p.z));
    Check(oldGap>.2,"old tangent crest is RED");
    const auto repaired=FitVehicleBody(origin,0,crest,whole);
    Check(repaired.valid&&repaired.maximumGap<.05&&repaired.queries==20,"finite crest fit GREEN");
    auto refused=[&](auto query,BodyPoseFailure reason){const auto result=FitVehicleBody({0,0,0},0,query,whole);Check(!result.valid&&result.failure==reason,"qualified query refusal retained");};
    refused([](const BodyPoint&,double){return BodyGround{};},BodyPoseFailure::MissingSupport);
    refused([](const BodyPoint&,double){return BodyGround{true,false,true,0,1};},BodyPoseFailure::IneligibleSupport);
    refused([](const BodyPoint&,double){return BodyGround{true,true,true,0,.69};},BodyPoseFailure::Normal);
    refused([](const BodyPoint&,double){return BodyGround{true,true,true,.81,1};},BodyPoseFailure::InvalidSupport);
    refused([](const BodyPoint& p,double){return BodyGround{true,true,true,.21*p.x,.97};},BodyPoseFailure::Grade);
    refused([](const BodyPoint& p,double){return BodyGround{true,true,true,p.x>2?.6:0,1};},BodyPoseFailure::ContactGap);
    const auto edge=FitVehicleBody({0,0,0},0,[](const BodyPoint& p,double){return BodyGround{true,true,true,.2*p.x,1};},whole);
    Check(edge.valid,"exact0.2 plane-grade boundary");
    unsigned calls=0;
    const auto changed=FitVehicleBody({0,0,2},0,[&](const BodyPoint&,double reference)
        {Check(reference==2,"immutable reference");return BodyGround{true,true,++calls<=10,2.4,1};},whole);
    Check(!changed.valid&&changed.failure==BodyPoseFailure::ChangedFirstHit,"new blocker in posed window refuses without refit");
    const auto outside=FitVehicleBody({0,0,0},.6,[](const BodyPoint& p,double){return BodyGround{true,std::abs(p.y)<=1,true,0,1};},whole);
    Check(!outside.valid&&outside.failure==BodyPoseFailure::IneligibleSupport,"terrain outside original corridor refused");
    const auto hole=FitVehicleBody({0,0,0},0,[](const BodyPoint&,double){return BodyGround{true,true,true,0,1};},[](const auto&){return false;});
    Check(!hole.valid&&hole.failure==BodyPoseFailure::Footprint,"whole body coverage cannot be replaced by ten contacts");
    const auto placed=PlaceVehicleBody(origin,.7,repaired.height,repaired.pitch,repaired.roll);
    Check(std::abs(Distance(placed[0],placed[1])-4.4)<1e-12,"full4.4m body preserved");
    Check(std::abs(Distance(placed[2],placed[3])-1.8)<1e-12,"full1.8m body preserved");
    for(const auto& road:RetainedRoads())
    {
        RoadQuery query{road};const auto positions=PlaceVehicleBody(road.origin,road.heading,road.origin.z,road.pitch,road.roll);
        for(const auto& contact:road.contacts)
        {
            Check(Distance(positions[contact.index],contact.position)<1e-10,"actual old native contact pose reproduced");
            Check(std::abs((query(positions[contact.index],road.origin.z).height-positions[contact.index].z)*100-contact.gapCm)<1e-7,"actual retained old native gap reproduced");
        }
        const auto result=FitVehicleBody(road.origin,road.heading,query,whole);
        Check(result.valid&&result.queries==20&&result.maximumGap<.06,"retained road-only geometry passes finite fit");
        std::cout<<road.name<<" finite20 maximum_gap_cm="<<result.maximumGap*100<<"\n";
    }
    std::cout<<"PASS: "<<Checks<<" finite-body core assertions; road-only retained cases do not qualify source/native support\n";
    } catch(const std::exception& error){std::cerr<<"FAIL: "<<error.what()<<"\n";return 1;}
}
