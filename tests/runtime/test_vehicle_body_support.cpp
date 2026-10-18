#include "VehicleBodySupport.h"
#include <iostream>
#include <chrono>
#include <stdexcept>
unsigned Checks=0;
void Check(bool condition,const char* label){++Checks;if(!condition)throw std::runtime_error(label);}
using namespace Shibuya;
BodySupportFace Face(std::array<BodyPoint,3> points,bool road=true)
{
    // Analytic fixture inputs are source-description ENU centimetres; install
    // their reflected native ESU face once, retaining physical clockwise winding.
    for(auto& p:points){p.x=static_cast<float>(p.x);p.y=-static_cast<float>(p.y);p.z=static_cast<float>(p.z);}
    const auto a=points[0],b=points[1],c=points[2];
    if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0)std::swap(points[1],points[2]);
    BodySupportFace f;f.nativeCM=points;f.road=road;f.supportEligible=true;f.normalZ=1;f.sourcePath="data/prepared/road.glb";return f;
}
std::vector<BodyPoint> NativeCoverage(std::vector<BodyPoint> points)
{for(auto& p:points)p.y=-p.y;return points;}
void Box(VehicleBodySupport& support,double x0,double y0,double x1,double y1,double z)
{
    support.faces.push_back(Face({BodyPoint{x0,y0,z},{x1,y0,z},{x1,y1,z}}));
    support.faces.push_back(Face({BodyPoint{x0,y0,z},{x1,y1,z},{x0,y1,z}}));
}

// VP1-CACHE-BOUNDARY: area coverage is not a selected-face point proof.
void CacheBoundaryRegressions()
{
    const unsigned before=Checks;
    auto run=[&](bool edge,int height,bool slope,int side,bool admitted,double ox,double oy,bool straddle=false)
    {
        VehicleBodySupport support;Box(support,ox-500,oy-500,ox+500,oy+500,1200);
        for(auto& face:support.faces){face.sourcePath="data/prepared/ordinary.glb";face.meshPath="/Game/Ordinary.Ordinary";}
        const double high=std::nextafter(1200.0f,std::numeric_limits<float>::infinity());
        const double low=std::nextafter(1200.0f,-std::numeric_limits<float>::infinity());
        const double z=height>0?high:(height<0?low:1200);
        std::array<BodyPoint,3> vertices=edge?
            std::array<BodyPoint,3>{BodyPoint{ox+220,oy-40,z},{ox+220,oy+40,z},{ox+320,oy,z}}:
            std::array<BodyPoint,3>{BodyPoint{ox+220,oy+90,z},{ox+220,oy+(admitted?95:190),z},{ox+320,oy+90,z}};
        if(slope){vertices[1].z=high;vertices[2].z=high;}
        auto bad=Face(vertices);bad.sourcePath="data/prepared/derived.glb";bad.meshPath="/Game/Derived.Derived";
        bad.requiresInterval=true;bad.layerKind="derived-road";
        const auto a=bad.nativeCM[0],b=bad.nativeCM[1],c=bad.nativeCM[2];
        const double nx=-((b.y-a.y)*(c.z-a.z)-(b.z-a.z)*(c.y-a.y)),
            ny=-((b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z)),
            nz=-((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));
        bad.normalZ=nz/std::sqrt(nx*nx+ny*ny+nz*nz);support.faces.push_back(bad);
        BodySupportWindow window;window.start=0;window.end=1;window.minX=ox/100-5;window.maxX=ox/100+5;
        window.minY=oy/100-5;window.maxY=oy/100+5;window.demLow=height<0?12.09:11.90;window.demHigh=height<0?12.10:11.91;window.faces={0,1,2};
        if(straddle){window.demLow=11.99;window.demHigh=12.01;}
        window.coveragePolygonNativeCM=NativeCoverage({{ox-220,oy-90,0},{ox+220,oy-90,0},{ox+220,oy+90,0},{ox-220,oy+90,0}});
        if(admitted)window.intervals={{{ox/100-5,oy/100,0},{ox/100+5,oy/100,0},2}};
        BodyPoint native{ox+220,-(oy+(edge?0:90)),1200};
        if(side)native.x=std::nextafter(native.x,side>0?INFINITY:-INFINITY);
        const auto point=NativeCMToSource(native);
        const auto fast=support.Query(point,12,window,&native,bad.meshPath);
        Check(window.wholeDomain!=straddle,"VP1 area cache preserves the original DEM qualification before a closed-boundary point query");
        Check(fast.found&&fast.sameFirstHit&&fast.normalZ>=.7,"VP1 actual original and posed first hit is retained");
        const bool expectedOrdinary=height<0||side<0;
        Check(expectedOrdinary?fast.face<2:fast.face==2,"VP1 preferred actual mesh cannot select a lower or different face");
        bool exactRegion=false;
        const auto regions=window.qualifiedRegions.find(fast.face);
        if(regions!=window.qualifiedRegions.end())for(const auto& region:regions->second)
        {
            bool inside=true;for(const auto& line:region)if(BodyExact::Sign(BodyExact::At(line,BodyExact::P(native.x,native.y)))<0){inside=false;break;}
            exactRegion=exactRegion||inside;
        }
        Check(fast.eligible==exactRegion,"VP1 certified cache cannot replace exact selected-face eligibility");
        Check(fast.eligible==(expectedOrdinary||admitted),"VP1 corner/edge native blocker obeys original directed-band qualification");
        window.wholeDomain=false;const auto exact=support.Query(point,12,window,&native,bad.meshPath);
        Check(fast.face==exact.face&&fast.eligible==exact.eligible&&fast.sameFirstHit==exact.sameFirstHit&&fast.height==exact.height&&fast.normalZ==exact.normalZ,
            "VP1 cache/exact point verdict and numerical parity including boundary and adjacent native heights");
    };
    for(bool edge:{false,true})
    {
        run(edge,0,false,0,false,0,0);run(edge,1,false,0,false,0,0);run(edge,-1,false,0,false,0,0);
        run(edge,0,true,0,false,0,0);run(edge,0,false,-1,false,0,0);run(edge,0,false,1,false,0,0);
        run(edge,0,false,0,true,0,0);run(edge,0,false,0,false,42752,26624);
    }
    run(false,0,false,0,false,0,0,true);
    std::cout<<"PASS: "<<Checks-before<<" VP1 cache-boundary assertions after all original support checks\n";
}

// Actual patch64 arithmetic fixture, source-description native cm (not a
// cooked mesh export): normal-surface-only-v1/patch64-geometry.json, source raw
// triangle1063539. Source artifact and immutable ray tuple pinned in handoff.
void PhysicalCookRegressions()
{
    const unsigned before=Checks;
    const std::array<BodyPoint,3> patch{{{12090.83203125,-909.2457885742188,68.91686248779297},
        {12090.8056640625,-909.2483520507812,68.91580200195312},
        {12090.8076171875,-909.2457885742188,68.91581726074219}}};
    Check(BodyCookMembership(patch)==0,"actual distinct nonzero patch64 is excluded from the physical first-blocker pool");
    Check(VehicleBodySupport::Orientation(patch[0],patch[1],patch[2].x,patch[2].y)!=0,"patch64 raw projected geometry is conserved and nonzero");
    const std::array<BodyPoint,3> ordinary{{{0,0,0},{1,0,0},{0,1,0}}};
    Check(BodyCookMembership(ordinary)==1,"ordinary large triangle survives both cook predicates in all six orders");
    auto offset=ordinary;for(auto& p:offset){p.x+=42752;p.y+=26624;p.z=1200;}
    Check(BodyCookMembership(offset)==1,"physical membership uses actual float32 native world offsets");
    auto reverse=ordinary;std::swap(reverse[0],reverse[1]);
    Check(BodyCookMembership(reverse)==1,"signed winding does not renumber or remove ordinary cook survivors");
    auto coincident=ordinary;coincident[2]=coincident[1];
    Check(BodyCookMembership(coincident)==0,"zero-weld-distance coincident vertices are rejected");
    const float threshold=1e-4f;
    for(int direction:{-1,0,1})
    {
        const double y=direction<0?std::nextafter(threshold,-INFINITY):direction>0?std::nextafter(threshold,INFINITY):threshold;
        Check(BodyCookMembership({{{0,0,0},{1,0,0},{0,y,0}}})==(direction>0?1:0),"both exclusive float32 cook thresholds preserve neighboring faces without epsilon");
    }
    const std::array<BodyPoint,3> ambiguous{{{-0.904495358467102,0.5511255264282227,0},
        {0.06280823051929474,1.4129271507263184,0},{-0.2651774287223816,1.1208176612854004,0}}};
    Check(BodyCookMembership(ambiguous)==-1,"actual mixed six-order arithmetic refuses ambiguous cook membership");
    auto untagged=ordinary;untagged[0].x=std::nextafter(42752.0,INFINITY);
    Check(BodyCookMembership(untagged)==-1,"untagged non-float32 operands cannot qualify a physical face");
    const std::string id="ue5.8.3-cl58210709-chaos-cook-float32-cm-v1",seal="e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428";
    Check(BodyCookModelKnown(1,id,seal),"known conditional physical model and primary-source seal qualify");
    Check(!BodyCookModelKnown(2,id,seal)&&!BodyCookModelKnown(1,"unknown",seal)&&!BodyCookModelKnown(1,id,std::string(64,'0')),
        "unknown model/version/definition seal cannot qualify source physical faces");
    std::cout<<"PASS: "<<Checks-before<<" conditional physical-cook consumer assertions after all original and VP1 checks\n";
}

// Bound: portable ENU/native adapter and rigid-body parity, not an actual UE transform.
void NativeFrameRegressions()
{
    const unsigned before=Checks;
    Check(NativeFrameKnown(1,"native-centimetres-Xeast-Ysouth-Zup-v2","2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170"),"current geographic frame exact version and definition seal admitted");
    Check(!NativeFrameKnown(1,"native-centimetres-Xeast-Ynorth-Zup","2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170"),"old north-positive native packet frame refused");
    Check(!NativeFrameKnown(0,NativeFrameID,NativeFrameDefinitionSHA256)&&!NativeFrameKnown(2,NativeFrameID,NativeFrameDefinitionSHA256),"unknown geographic frame schema refused");
    Check(!NativeFrameKnown(1,NativeFrameID,"e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428"),"physical cook seal cannot substitute for geographic frame definition");
    Check(!NativeFrameKnown(1,"",NativeFrameDefinitionSHA256)&&!NativeFrameKnown(1,NativeFrameID,""),"missing geographic frame identity or seal refused");
    std::vector<std::vector<std::string>> actors(112,{"ShibuyaSource",NativeFrameActorTag,"unrelated"});
    Check(NativeSceneFramesKnown(actors),"all112 source actors carry exactlyone current native map frame seal");
    auto mixed=actors;mixed[25].erase(mixed[25].begin()+1);Check(!NativeSceneFramesKnown(mixed),"old unmarked terrain/road actor refuses before population spawn");
    mixed=actors;mixed[111][1]="ShibuyaNativeFrame:native-centimetres-Xeast-Ynorth-Zup:old-seal";Check(!NativeSceneFramesKnown(mixed),"mixed old-frame city actor refuses");
    mixed=actors;mixed[0].push_back(NativeFrameActorTag);Check(!NativeSceneFramesKnown(mixed),"duplicate identical native map tag refuses");
    mixed=actors;mixed[0].push_back("ShibuyaNativeFrame:unknown");Check(!NativeSceneFramesKnown(mixed),"second wrong native map tag cannot hide beside valid tag");
    mixed=actors;mixed.pop_back();Check(!NativeSceneFramesKnown(mixed),"missing source actor refuses map admission");
    mixed=actors;mixed.push_back(actors[0]);Check(!NativeSceneFramesKnown(mixed),"extra source actor refuses map admission");
    mixed=actors;mixed[0][1]+="f";Check(mixed[0][1]!=actors[0][1]&&!NativeSceneFramesKnown(mixed),"wrong native map definition seal refuses");
    const auto east=SourceToNativeCM(BodyPoint{1,0,0}),north=SourceToNativeCM(BodyPoint{0,1,0}),up=SourceToNativeCM(BodyPoint{0,0,1});
    Check(east.x==100&&east.y==0&&east.z==0,"geographic east is native positive X centimetres");
    Check(north.x==0&&north.y==-100&&north.z==0,"geographic north is native negative Y centimetres");
    Check(up.x==0&&up.y==0&&up.z==100,"geographic up is native positive Z centimetres");
    const auto right=NativeCMToSource(BodyPoint{0,100,0});
    Check(right.x==0&&right.y==-1&&right.z==0,"ordinary UE camera right while facing east is geographic south");
    const auto direction=SourceToNativeDirection(BodyPoint{.6,.8,0});
    Check(direction.x==.6&&direction.y==-.8&&direction.z==0,"unit directions reflect without centimetre scaling");
    const auto reference=SourceToNativeCM(BodyPoint{162.48467391405973,259.46814789812004,1.1986275345087094});
    Check(reference.x==16248.467391405973&&reference.y==-25946.814789812004&&reference.z==119.86275345087094,"retained C2 source point uses corrected signed native Y");
    for(const BodyPoint p:std::vector<BodyPoint>{{427.47194895559466,266.006031244335,12},{-370.25,-455.125,-3.75}})
    {
        const auto q=NativeCMToSource(SourceToNativeCM(p));
        Check(std::abs(q.x-p.x)<1e-12&&std::abs(q.y-p.y)<1e-12&&std::abs(q.z-p.z)<1e-12,"source native inverse at both geographic quadrants");
    }
    // Compare the unchanged source rigid fit to a separately composed native
    // Rz(-heading)*Ry(-pitch)*Rx(-roll) and reflected local contact. No negative
    // scale or UV operation participates in this rigid placement.
    for(double heading:{0.,.713,-2.2})for(double pitch:{0.,.12})for(double roll:{0.,.04,-.08})
    {
        const BodyPoint origin{427.4,266.1,12};const auto source=PlaceVehicleBody(origin,heading,12.1,pitch,roll);
        const double h=NativeHeading(heading),r=NativeRoll(roll),ch=std::cos(h),sh=std::sin(h),cp=std::cos(pitch),sp=std::sin(pitch),cr=std::cos(r),sr=std::sin(r);
        for(std::size_t i=0;i<source.size();++i)
        {
            const auto local=VehicleBodyContacts[i];const double x=local.x*100,y=-local.y*100;
            const double along=cp*x-sp*sr*y,across=cr*y,z=sp*x+cp*sr*y;
            const BodyPoint native{origin.x*100+ch*along-sh*across,-origin.y*100+sh*along+ch*across,1210+z};
            Check(std::abs(native.x-source[i].x*100)<1e-10&&std::abs(native.y+source[i].y*100)<1e-10&&std::abs(native.z-source[i].z*100)<1e-10,"pitched banked rigid contacts preserve geographic body under ESU conjugation");
        }
    }
    std::cout<<"PASS: "<<Checks-before<<" geographic native-frame assertions; actual UE transforms remain unverified\n";
}

void RouteEndpointRegressions()
{
    const unsigned before=Checks;
    for(const double end:{std::nextafter(1.,0.),std::nextafter(1.,2.)})
    {
        VehicleBodySupport s;BodySupportWindow a,b;a.start=0;a.end=.5;b.start=.5;b.end=end;s.routes["endpoint"]={a,b};
        s.BindRouteLength("endpoint",1);
        Check(s.routes["endpoint"][0].end==.5&&s.routes["endpoint"][1].start==.5,"endpoint binding preserves every intermediate bound");
        Check(s.routes["endpoint"][1].end==1&&s.Window("endpoint",1)!=nullptr,"admitted final endpoint binds to actual production route length");
    }
    for(const bool gap:{false,true})
    {
        VehicleBodySupport s;BodySupportWindow a,b;a.start=0;a.end=.5;b.start=gap?std::nextafter(.5,1.):.5;b.end=gap?1:1.000002;s.routes["endpoint"]={a,b};
        bool refused=false;try{s.BindRouteLength("endpoint",1);}catch(const std::exception&){refused=true;}
        Check(refused,gap?"internal window gap refuses before endpoint normalization":"beyond original one-micrometre endpoint tolerance refuses");
    }
    std::cout<<"PASS: "<<Checks-before<<" route endpoint binding assertions\n";
}
void RoleEligibilityRegressions()
{
    const unsigned before=Checks;
    for(const std::string kind:{"road","derived-road","terrain","terrain-fragment","inferred"})
    {
        Check(BodySupportEligibilityKnown(kind,"",true),"ordinary schema2 true pair is known");
        Check(!BodySupportEligibilityKnown(kind,"",false),"ordinary schema2 false pair refuses");
    }
    for(const std::string role:{"support-top","physical-transition","physical-sidewall"})
    {
        const bool expected=role=="support-top";
        Check(BodySupportEligibilityKnown("inferred",role,expected),"closed reconstruction role Boolean pair accepted");
        Check(!BodySupportEligibilityKnown("inferred",role,!expected),"mismatched reconstruction Boolean pair refused");
        Check(!BodySupportEligibilityKnown("road",role,expected),"reconstruction role cannot alias original road kind");
    }
    Check(!BodySupportEligibilityKnown("inferred","support",true),"unknown role refuses");
    Check(!BodySupportEligibilityKnown("physical-sidewall","",true),"role cannot alias layer kind");
    Check(!BodySupportFace{}.supportEligible,"default constructed physical face fails closed");
    Check(BodySupportLayerPolicyKnown(false,"inferred",true),"declared reconstructed terrain remains non-road");
    Check(BodySupportLayerPolicyKnown(true,"inferred",true),"declared reconstructed road retains road physical role");
    Check(!BodySupportLayerPolicyKnown(false,"inferred",false),"reconstructed terrain cannot remove the original interval policy");
    Check(!BodySupportLayerPolicyKnown(false,"road",true),"ordinary road cannot substitute a derived-terrain binding");
    Check(!BodySupportLayerPolicyKnown(true,"terrain",true),"ordinary terrain cannot substitute a native-road binding");
    for(const std::string role:{"physical-transition","physical-sidewall"})
    {
        VehicleBodySupport support;Box(support,-500,-500,500,500,1000);Box(support,-500,-500,500,500,1001);
        for(size_t i=0;i<support.faces.size();++i)
        {
            auto& f=support.faces[i];f.meshPath=i<2?"/Game/Lower":"/Game/Physical";f.layerKind=i<2?"road":"inferred";
            if(i>=2){f.supportEligible=false;f.reconstructionRole=role;}
        }
        BodySupportWindow w;w.start=0;w.end=1;w.minX=w.minY=-5;w.maxX=w.maxY=5;w.demLow=10.01;w.demHigh=10.02;w.faces={0,1,2,3};
        w.intervals={{{-5,0,0},{5,0,0},10}};support.routes["role"]={w};
        const auto& actual=support.routes["role"][0];
        const auto hit=support.Query({0,0,10},10,actual);
        Check(hit.found&&hit.sameFirstHit&&hit.face>=2&&hit.height==10.01,"ineligible positive-normal physical first blocker is retained");
        Check(!hit.eligible,"eligibility applies only after selecting the higher physical blocker");
        Check(support.faces.size()==4&&actual.faces.size()==4,"all physical rivals remain present");
        const auto fit=support.Fit("role",.5,{0,0,10},.2);
        Check(!fit.valid&&fit.failure==BodyPoseFailure::IneligibleSupport,"production fit refuses physical role without lower-hit fallback");
        // Coplanar ties also retain the chosen ineligible actor.
        VehicleBodySupport tie;Box(tie,-500,-500,500,500,1000);Box(tie,-500,-500,500,500,1000);
        for(size_t i=0;i<tie.faces.size();++i){tie.faces[i].meshPath=i<2?"/Game/Eligible":"/Game/Ineligible";if(i>=2){tie.faces[i].supportEligible=false;tie.faces[i].reconstructionRole=role;}}
        auto tw=w;tw.prepared=false;tw.demLow=9.99;tw.demHigh=10;tw.qualifiedRegions.clear();tw.qualifiedRegionFilters.clear();
        const auto tied=tie.Query({0,0,10},10,tw,nullptr,"/Game/Ineligible");
        Check(tied.found&&tied.face>=2&&!tied.eligible,"equal-height preferred physical blocker cannot fall through");
        Check(!tie.Footprint(PlaceVehicleBody({0,0,10},0,10,0,0),10,tw),"whole footprint cannot bypass equal-height physical blocker");
    }
    std::cout<<"PASS: "<<Checks-before<<" schema2 role/physical-first assertions\n";
}

int main()
{
    try {
    const BodyPoint origin{427.47194895559466,266.006031244335,12};
    VehicleBodySupport support;const double x=origin.x*100,y=origin.y*100;
    Box(support,x-300,y-300,x+300,y+300,1200);
    BodySupportWindow w;w.start=0;w.end=10;w.minX=origin.x-3;w.minY=origin.y-3;w.maxX=origin.x+3;w.maxY=origin.y+3;w.demLow=11.99;w.demHigh=12.01;w.faces={0,1};
    w.coveragePolygonNativeCM=NativeCoverage({{x-270,y-270,0},{x+270,y-270,0},{x+270,y+270,0},{x-270,y+270,0}});
    support.routes["actual-offset"]={w};
    const auto placed=PlaceVehicleBody(origin,.713,12,0,0);
    w.prepared=false;Check(support.Footprint(placed,12,w),"shared native face edge covers at actual world offset");
    Check(support.Fit("actual-offset",5,origin,.713).valid,"qualified finite fit at actual world offset");
    // A nonconforming shared edge consists of one long edge and two short ones.
    support.faces.clear();
    support.faces.push_back(Face({BodyPoint{x-300,y-300,1200},{x,y-300,1200},{x,y+300,1200}}));
    support.faces.push_back(Face({BodyPoint{x-300,y-300,1200},{x,y+300,1200},{x-300,y+300,1200}}));
    Box(support,x,y-300,x+300,y,1200);Box(support,x,y,x+300,y+300,1200);w.faces={0,1,2,3,4,5};
    w.prepared=false;Check(support.Footprint(placed,12,w),"nonconforming shared native edges remain covered");
    support.faces.clear();const double hole=.00390625;
    Box(support,x-300,y-300,x-hole,y+300,1200);Box(support,x+hole,y-300,x+300,y+300,1200);
    Box(support,x-hole,y-300,x+hole,y-hole,1200);Box(support,x-hole,y+hole,x+hole,y+300,1200);w.faces={0,1,2,3,4,5,6,7};
    w.prepared=false;Check(!support.Footprint(placed,12,w),"genuine sub-square-millimetre hole cannot be erased");
    Check(!w.wholeDomain,"cache field presence cannot certify a real hole");
    support.faces.clear();Box(support,x-300,y-300,x+300,y+300,1200);w.faces={0,1};
    Box(support,x-1,y-1,x+1,y+1,1250);w.faces={0,1,2,3};support.faces[2].normalZ=.6;support.faces[3].normalZ=.6;
    w.prepared=false;Check(!support.Footprint(placed,12,w),"tiny ineligible upper blocker cannot be covered by lower road");
    Check(!w.wholeDomain,"ineligible upper blocker vetoes whole-domain fast certificate");
    support.faces.resize(2);Box(support,x-1,y-1,x+1,y+1,1200);support.faces[2].requiresInterval=true;support.faces[3].requiresInterval=true;
    w.prepared=false;Check(!support.Footprint(placed,12,w),"equal-height ineligible native blocker tie refuses rather than choosing the ordinary road");
    support.faces.resize(2);w.faces={0,1};w.buildings={{{origin.x-.01,origin.y-.01,0},{origin.x+.01,origin.y-.01,0},{origin.x+.01,origin.y+.01,0},{origin.x-.01,origin.y+.01,0}}};
    w.prepared=false;Check(!support.Footprint(placed,12,w),"interior building independent of ten contact points refuses");
    w.buildings.clear();support.faces[0].road=false;support.faces[1].road=false;
    w.intervals={{{origin.x-3,origin.y,0},{origin.x+3,origin.y,0},2}};
    w.prepared=false;Check(!support.Footprint(placed,12,w),"terrain footprint outside original directed band refuses");
    const auto straight=PlaceVehicleBody(origin,0,12,0,0);
    w.prepared=false;Check(support.Footprint(straight,12,w),"terrain inside original directed interval qualifies");
    w.demLow=8;w.demHigh=20;support.faces[0].road=true;support.faces[1].road=true;
    w.prepared=false;Check(!support.Footprint(straight,12,w),"uncertain DEM enclosure refuses rather than changing policy");
    support.faces.clear();Box(support,x-300,y-300,x+300,y+300,1200);Box(support,x-300,y-300,x+300,y+300,1285);w.faces={0,1,2,3};w.demLow=11.99;w.demHigh=12.01;
    // Upper road is absent from the original12m+80cm ray, but exposed after fit.
    w.prepared=false;auto changed=support.Query({origin.x,origin.y,12.1},12,w);
    Check(changed.found&&!changed.sameFirstHit,"posed ray cannot silently switch to newly exposed upper road");
    support.faces.resize(2);w.faces={0,1};w.prepared=false;support.routes["actual-offset"]={w};
    // Cache certification and exact fallback are two execution paths of the
    // same support contract. Compare verdicts and exact fitted double values.
    for(const auto& p:std::vector<BodyPoint>{origin,{origin.x+.1,origin.y+.1,12},{w.maxX+1,origin.y,12},{w.maxX-2.2,origin.y,12}})
    {
        auto& window=support.routes["actual-offset"][0];window.prepared=false;
        const auto fast=support.Fit("actual-offset",5,p,0);
        window.wholeDomain=false;const auto exact=support.Fit("actual-offset",5,p,0);
        Check(fast.valid==exact.valid&&fast.failure==exact.failure&&fast.height==exact.height&&fast.pitch==exact.pitch&&fast.roll==exact.roll&&fast.maximumGap==exact.maximumGap,"certified cache/exact numerical and verdict parity");
    }
    support.routes["actual-offset"][0].prepared=false;
    const auto before=support.evaluations;
    const auto initial=support.Pose(7,2,"actual-offset",5,9,origin,.713);
    Check(initial.valid,"cached product pose is qualified");
    support.Pose(7,2,"actual-offset",5,9,origin,.713);
    Check(support.evaluations==before+1,"unchanged stopped pose does not refit when simulation clock advances");
    support.Pose(7,2,"actual-offset",5,10,origin,.713);
    Check(support.evaluations==before+2,"boundary generation invalidates pose cache");
    const auto started=std::chrono::steady_clock::now();
    for(int i=0;i<200;++i)
    {
        const BodyPoint p{origin.x+i*.0001,origin.y,12};const auto fit=support.Pose(i,2,"actual-offset",5+i*.001,1,p,.713);
        auto actual=PlaceVehicleBody(p,.713,fit.height,fit.pitch,fit.roll);for(auto& c:actual)c=SourceToNativeCM(c);
        const auto verified=support.VerifyActual(i,"actual-offset",actual);
        Check(verified.valid&&verified.queries==30,"bounded changed200-car qualified pose and native-cm recheck sweep");
    }
    std::cout<<"PASS "<<Checks<<" support/coverage assertions; synthetic200 changed two-face30-query car poses wall_ms="<<std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-started).count()<<"\n";
    const auto count=support.qualifiedPoints;const auto repeated=support.cache[0].pose;
    auto actual=PlaceVehicleBody(origin,.713,repeated.height,repeated.pitch,repeated.roll);for(auto& p:actual)p=SourceToNativeCM(p);
    Check(support.VerifyActual(0,"actual-offset",actual).valid&&support.qualifiedPoints==count,"unchanged verified actual pose reuses all source checks");
    auto edgeWindow=w;edgeWindow.prepared=false;edgeWindow.maxX=origin.x+4;
    const double edge=support.faces[0].nativeCM[1].x>support.faces[0].nativeCM[2].x?support.faces[0].nativeCM[1].x:support.faces[0].nativeCM[2].x;
    const BodyPoint outsideCM{std::nextafter(edge,INFINITY),-y,1200};
    Check(!support.Query(NativeCMToSource(outsideCM),12,edgeWindow,&outsideCM).found,"actual binary64 native-cm point beyond float32 face edge refuses without roundtrip");
    Check(VehicleBodySupport::Orientation(support.faces[0].nativeCM[0],support.faces[0].nativeCM[1],support.faces[0].nativeCM[2].x,support.faces[0].nativeCM[2].y)!=0,"native actual-offset signed triangle is nondegenerate");
    CacheBoundaryRegressions();
    PhysicalCookRegressions();
    NativeFrameRegressions();
    RoleEligibilityRegressions();
    RouteEndpointRegressions();
    Check(BodySupportCandidateCountKnown(1)&&BodySupportCandidateCountKnown(1024),"complete body candidate serialization count1..1024 accepted");
    Check(!BodySupportCandidateCountKnown(0)&&!BodySupportCandidateCountKnown(1025),"empty/1025 physical candidate windows refuse");
    Check(BodySupportCandidateCountKnown(525)&&BodySupportCandidateCountKnown(756),"actual retained first525/peak756 counts admitted without filtering");
    } catch(const std::exception& error){std::cerr<<"FAIL after "<<Checks<<" assertions: "<<error.what()<<"\n";return 1;}
}
