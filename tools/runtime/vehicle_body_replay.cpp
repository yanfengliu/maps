// Bound: actual schema2 sidecar data through the production pose/support cores.
// Local Route::At/heading-step replay is diagnostic. It does not admit boundary
// flow, Source legality, unsampled continuum, cooked UE geometry or Game motion.
#include "VehicleBodySupport.h"
#include "CitySimulation.h"
#include <fstream>
#include <iostream>
#include <iomanip>
#include <cstring>
using namespace Shibuya;
namespace {
struct Wire {
    std::ifstream f;
    explicit Wire(const char* path):f(path,std::ios::binary) {if(!f)throw std::runtime_error("Replay cannot open its pinned wire input.");char m[8];f.read(m,8);if(std::memcmp(m,"SBODY002",8))throw std::runtime_error("Replay wire needs SBODY002.");}
    template<class T>T take(){T value{};f.read(reinterpret_cast<char*>(&value),sizeof(value));if(!f)throw std::runtime_error("Replay wire ended before its declared complete data.");return value;}
    unsigned count(unsigned maximum,bool empty=false){auto n=take<std::uint32_t>();if(n>maximum||(!empty&&!n))throw std::runtime_error("Replay count exceeds its original bounded population.");return n;}
    double number(){double n=take<double>();if(!std::isfinite(n))throw std::runtime_error("Replay requires finite binary64 data.");return n;}
    bool boolean(){auto n=take<std::uint8_t>();if(n>1)throw std::runtime_error("Replay Boolean wire must be0 or1.");return n==1;}
    std::string text(){unsigned n=count(4096,true);std::string s(n,' ');f.read(s.data(),n);if(!f)throw std::runtime_error("Replay text is incomplete.");for(unsigned char c:s)if(c<32)throw std::runtime_error("Replay text contains control bytes.");return s;}
    BodyPoint point(){return {number(),number(),number()};}
    BodyPoint xy(){return {number(),number(),0};}
    void end(){if(f.peek()!=std::char_traits<char>::eof())throw std::runtime_error("Replay has unconsumed wire data.");}
};
const char* Failure(BodyPoseFailure f) {
    switch(f){case BodyPoseFailure::None:return "None";case BodyPoseFailure::InvalidInput:return "InvalidInput";case BodyPoseFailure::MissingSupport:return "MissingSupport";case BodyPoseFailure::IneligibleSupport:return "IneligibleSupport";case BodyPoseFailure::ChangedFirstHit:return "ChangedFirstHit";case BodyPoseFailure::InvalidSupport:return "InvalidSupport";case BodyPoseFailure::Normal:return "Normal";case BodyPoseFailure::Grade:return "Grade";case BodyPoseFailure::ContactGap:return "ContactGap";case BodyPoseFailure::Footprint:return "Footprint";}return "Unknown";
}
void PointJSON(const BodyPoint& p){std::cout<<'['<<p.x<<','<<p.y<<','<<p.z<<']';}
void Flag(bool v){std::cout<<(v?"true":"false");}
struct LocalRoute {Route route;};
double ReadRoute(Wire& in,VehicleBodySupport& support,Route& route) {
    route.id=in.text();route.kind=Kind::Vehicle;route.width=in.number();route.speed=in.number();
    if(route.id.empty()||route.width!=2||route.speed<=0||route.speed>25)throw std::runtime_error("Local replay needs the unchanged2m corridor width and finite original speed <=25m/s.");
    const unsigned n=in.count(100000);if(n<2)throw std::runtime_error("Replay needs actual sampled route points.");
    route.length=0;route.distances={0};
    for(unsigned i=0;i<n;++i){
        auto p=in.point();for(double a:{p.x,p.y,p.z})if(std::abs(a)>700)throw std::runtime_error("Replay point exceeds source local frame.");
        route.points.push_back({p.x,p.y,p.z});
        if(i){const auto delta=route.points[i]-route.points[i-1];double flat=CheckedHorizontalSegment(delta,route.id,i,Kind::Vehicle),length=Length(delta);if(length>2.05||std::abs(delta.z)/flat>.2)throw std::runtime_error("Replay actual sampled geometry exceeds unchanged spacing/grade bounds.");route.length+=length;route.distances.push_back(route.length);}
    }
    // Populate the actual interpolation data for this local diagnostic only.
    // Keep ordinary Route::Prepare's boundary_flow admission rule untouched.
    route.corners.assign(n,false);
    for(unsigned i=1;i+1<n;++i){
        auto a=route.points[i]-route.points[i-1],b=route.points[i+1]-route.points[i];
        const bool turn=std::abs(a.x*b.y-a.y*b.x)/(std::hypot(a.x,a.y)*std::hypot(b.x,b.y))>1e-6||a.x*b.x+a.y*b.y<0;
        route.corners[i]=turn;if(turn)route.cornerDistances.push_back(route.distances[i]);
    }
    double previous=0;unsigned nw=in.count(100000);
    auto& windows=support.routes[route.id];if(!windows.empty())throw std::runtime_error("Replay route identity repeats.");
    for(unsigned j=0;j<nw;++j){
        BodySupportWindow w;w.start=in.number();w.end=in.number();w.minX=in.number();w.minY=in.number();w.maxX=in.number();w.maxY=in.number();w.demLow=in.number();w.demHigh=in.number();
        if(w.start!=previous||w.end<=w.start||w.end>route.length+1e-6||w.minX>=w.maxX||w.minY>=w.maxY||w.maxX-w.minX>12||w.maxY-w.minY>12||w.demLow>w.demHigh)throw std::runtime_error("Replay windows omit route coverage or exceed original local/DEM bounds.");previous=w.end;
        unsigned nf=in.count(VehicleBodyWindowMaximumCandidates);std::vector<bool> seen(support.faces.size(),false);
        for(unsigned k=0;k<nf;++k){auto id=in.take<std::uint32_t>();if(id>=support.faces.size()||seen[id])throw std::runtime_error("Replay physical candidate references are missing or repeated.");seen[id]=true;w.faces.push_back(id);}
        unsigned ni=in.count(100000,true);for(unsigned k=0;k<ni;++k){auto a=in.xy(),b=in.xy();double width=in.number();if(width!=route.width)throw std::runtime_error("Replay cannot widen a directed interval.");w.intervals.push_back({a,b,width});}
        unsigned nb=in.count(100000,true);for(unsigned k=0;k<nb;++k){unsigned np=in.count(10000);if(np<3)throw std::runtime_error("Replay building polygon is incomplete.");std::vector<BodyPoint> p;for(unsigned l=0;l<np;++l)p.push_back(in.xy());w.buildings.push_back(std::move(p));}
        unsigned nd=in.count(16,true);if(nd&&nd<3)throw std::runtime_error("Replay cache polygon is incomplete.");for(unsigned k=0;k<nd;++k)w.coveragePolygonNativeCM.push_back(in.xy());
        windows.push_back(std::move(w));
    }
    support.BindRouteLength(route.id,route.length);return previous;
}
}
int main(int argc,char** argv) {
    try{
        if(argc!=2)throw std::runtime_error("Usage: vehicle-body-replay.exe <pinned-wire.bin>");
        Wire in(argv[1]);if(in.number()!=2)throw std::runtime_error("Replay requires schema2; schema1 is historical only.");
        auto frameSchema=in.number();auto frameID=in.text(),frameSeal=in.text();if(!NativeFrameKnown(frameSchema,frameID,frameSeal))throw std::runtime_error("Replay needs the current sealed ESU native frame.");
        if(in.text()!="binary64-cm-query-on-float32-esu-cm-vertices-v2")throw std::runtime_error("Replay coordinate model differs.");
        auto modelSchema=in.number();auto modelID=in.text(),modelSeal=in.text();if(!BodyCookModelKnown(modelSchema,modelID,modelSeal))throw std::runtime_error("Replay cook model differs.");
        VehicleBodySupport support;unsigned nf=in.count(150000);unsigned forbidden=0,down=0;support.faces.reserve(nf);
        for(unsigned i=0;i<nf;++i){
            BodySupportFace f;for(auto& p:f.nativeCM)p=in.point();f.road=in.boolean();f.requiresInterval=in.boolean();f.supportEligible=in.boolean();f.layerKind=in.text();f.reconstructionRole=in.text();f.sourcePath=in.text();f.meshPath=in.text();f.triangle=in.take<std::uint32_t>();f.normalZ=in.number();
            if(!BodySupportLayerPolicyKnown(f.road,f.layerKind,f.requiresInterval)||!BodySupportEligibilityKnown(f.layerKind,f.reconstructionRole,f.supportEligible))throw std::runtime_error("Replay layer kind/role/Boolean pair is unknown or mismatched.");
            if(BodyCookMembership(f.nativeCM)!=1)throw std::runtime_error("Replay physical pool contains a rejected/ambiguous/non-float32 face.");
            const auto a=f.nativeCM[0],b=f.nativeCM[1],c=f.nativeCM[2];
            double x=-((b.y-a.y)*(c.z-a.z)-(b.z-a.z)*(c.y-a.y)),y=-((b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z)),z=-((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)),normal=z/std::sqrt(x*x+y*y+z*z);
            if(!std::isfinite(normal)||std::abs(normal-f.normalZ)>1e-12)throw std::runtime_error("Replay normal differs from actual native winding.");
            if(!f.supportEligible)++forbidden;if(normal<0)++down;support.faces.push_back(std::move(f));
        }
        unsigned nr=in.count(10000);std::vector<Route> routes;std::vector<double> declaredEnds;for(unsigned i=0;i<nr;++i){Route route;declaredEnds.push_back(ReadRoute(in,support,route));routes.push_back(std::move(route));}in.end();
        std::cout<<std::setprecision(17)<<"{\"schema_version\":1,\"physical_faces\":"<<nf<<",\"ineligible_physical_faces\":"<<forbidden<<",\"down_physical_faces\":"<<down<<",\"local_route_admission\":false,\"route_endpoint_bindings\":[";
        for(unsigned i=0;i<routes.size();++i){if(i)std::cout<<',';std::cout<<"{\"route_id\":"<<std::quoted(routes[i].id)<<",\"declared_end_m\":"<<declaredEnds[i]<<",\"production_length_m\":"<<routes[i].length<<",\"normalization_delta_m\":"<<routes[i].length-declaredEnds[i]<<'}';}
        std::cout<<"],\"evaluations\":[";
        bool comma=false;unsigned count=0,refused=0,turnSteps=0;
        auto evaluate=[&](const Route& route,double distance,double heading,const char* kind){
            const auto origin=route.At(distance);const BodyPoint p{origin.x,origin.y,origin.z};auto pose=support.Fit(route.id,distance,p,heading);if(!pose.valid)++refused;++count;
            if(comma)std::cout<<',';comma=true;
            std::cout<<"{\"route_id\":"<<std::quoted(route.id)<<",\"kind\":"<<std::quoted(kind)<<",\"distance_m\":"<<distance<<",\"origin_m\":";PointJSON(p);
            std::cout<<",\"heading_rad\":"<<heading<<",\"accepted\":";Flag(pose.valid);std::cout<<",\"failure\":"<<std::quoted(Failure(pose.failure))<<",\"failed_contact\":"<<pose.failedContact<<",\"queries\":"<<pose.queries<<",\"height_m\":"<<pose.height<<",\"pitch_rad\":"<<pose.pitch<<",\"roll_rad\":"<<pose.roll<<",\"maximum_gap_m\":"<<pose.maximumGap;
            const auto contacts=PlaceVehicleBody(p,heading,pose.height,pose.pitch,pose.roll);const auto* window=support.Window(route.id,distance);
            bool footprint=false;std::string diagnosticError;
            try{footprint=window&&support.Footprint(contacts,p.z,*window);}catch(const std::exception& e){diagnosticError=e.what();}
            std::cout<<",\"footprint\":";Flag(footprint);std::cout<<",\"diagnostic_error\":"<<std::quoted(diagnosticError)<<",\"physical_candidates\":"<<(window?window->faces.size():0)<<",\"contacts\":[";
            for(unsigned k=0;k<contacts.size();++k){
                if(k)std::cout<<',';std::cout<<"{\"index\":"<<k<<",\"point_m\":";PointJSON(contacts[k]);BodyGround hit;std::string queryError;try{if(window)hit=support.Query(contacts[k],p.z,*window);}catch(const std::exception& e){queryError=e.what();}
                std::cout<<",\"query_error\":"<<std::quoted(queryError);
                std::cout<<",\"found\":";Flag(hit.found);std::cout<<",\"eligible\":";Flag(hit.eligible);std::cout<<",\"same_first_hit\":";Flag(hit.sameFirstHit);
                if(hit.found){const auto& f=support.faces[hit.face];std::cout<<",\"face_id\":"<<hit.face<<",\"source_path\":"<<std::quoted(f.sourcePath)<<",\"mesh_path\":"<<std::quoted(f.meshPath)<<",\"triangle\":"<<f.triangle<<",\"role\":"<<std::quoted(f.reconstructionRole)<<",\"support_eligible\":";Flag(f.supportEligible);std::cout<<",\"height_m\":"<<hit.height<<",\"normal_z\":"<<hit.normalZ<<",\"gap_m\":"<<std::abs(hit.height-contacts[k].z);}
                std::cout<<'}';
            }
            std::cout<<"]}";
        };
        for(const auto& route:routes){
            for(double distance:route.distances){Point tangent;route.At(distance,0,&tangent);evaluate(route,distance,std::atan2(tangent.y,tangent.x),"original_sample");}
            Point previous=route.At(0),tangent;route.At(0,0,&tangent);double heading=std::atan2(tangent.y,tangent.x),distance=0;evaluate(route,0,heading,"fixed_step");
            unsigned steps=0;
            while(distance<route.length){
                if(++steps>100000)throw std::runtime_error("Replay fixed-step count exceeds100000; refuse an unbounded run.");
                distance=std::min(route.length,distance+route.speed*StepSeconds);auto position=route.At(distance);double next=AdvanceVehicleHeading(heading,position-previous);if(next!=heading)++turnSteps;
                evaluate(route,distance,next,"fixed_step");heading=next;previous=position;
            }
        }
        std::cout<<"],\"evaluation_count\":"<<count<<",\"refused_count\":"<<refused<<",\"heading_change_steps\":"<<turnSteps<<",\"complete\":true,\"accepted\":";Flag(refused==0);
        std::cout<<",\"bound\":\"Production body pose/support and actual fixed-step interpolation/heading calls on complete supplied physical windows. No Source admission, mathematical unsampled continuum, ordinary Game, native collision, boundary flow or population claim.\"}\n";
        return refused?2:0;
    }catch(const std::exception& e){std::cerr<<"REPLAY_REFUSED: "<<e.what()<<'\n';return 1;}
}
