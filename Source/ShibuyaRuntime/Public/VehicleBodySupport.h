#pragma once

#include "VehicleBodyPose.h"
#include "NativeFrame.h"
#include <vector>
#include <string>
#include <map>
#include <stdexcept>
#include <utility>
#include <cstdint>
#include <memory>

#if defined(_MSC_VER)
#pragma float_control(precise, on, push)
#endif

namespace Shibuya
{
namespace BodyExact
{
// Floating expansions retain exact signs of bounded binary64 operands. FMA
// recovers each product's roundoff. No physical or area epsilon closes a hole.
using E=std::vector<double>;
inline E Add(E a,const E& b)
{
    for(double q:b)
    {
        E r;
        for(double x:a)
        {
            const double s=q+x,bv=s-q,av=s-bv,br=x-bv,ar=q-av;
            const double e=ar+br;if(e!=0)r.push_back(e);q=s;
        }
        if(q!=0)r.push_back(q);a=std::move(r);
    }
    if(a.size()>192)throw std::runtime_error("Vehicle body exact-sign budget exceeded; refuse this support window.");
    return a;
}
inline E N(E a){for(double& v:a)v=-v;return a;}
inline E Sub(E a,const E& b){return Add(std::move(a),N(b));}
inline E Mul(const E& a,const E& b)
{
    E r;for(double x:a)for(double y:b)
    {
        const double p=x*y,e=std::fma(x,y,-p);
        if(!std::isfinite(p)||!std::isfinite(e))throw std::runtime_error("Vehicle body exact product is not finite.");
        if(x!=0&&y!=0&&std::abs(p)<std::ldexp(std::numeric_limits<double>::min(),53))
            throw std::runtime_error("Vehicle body exact-sign product could underflow; refuse this window.");
        r=Add(std::move(r),E{e,p});
    }
    return r;
}
inline int Sign(const E& a){return a.empty()?0:(a.back()>0?1:-1);}
inline E D(double v){return v==0?E{}:E{v};}
struct H {E x,y,w;std::vector<std::shared_ptr<H>> boundaries;};
using Line=H;
inline H Normalise(H h)
{
    double largest=0;for(const auto* e:{&h.x,&h.y,&h.w})for(double x:*e)largest=std::max(largest,std::abs(x));
    if(largest==0)return h;
    int exponent=0;std::frexp(largest,&exponent);
    for(auto* e:{&h.x,&h.y,&h.w})for(double& x:*e)
    {
        const double scaled=std::ldexp(x,-exponent);
        if(x!=0&&scaled==0)throw std::runtime_error("Vehicle body exact-sign rescaling underflowed; refuse this window.");
        x=scaled;
    }
    return h;
}
inline H Cross(const H& a,const H& b)
{return Normalise({Sub(Mul(a.y,b.w),Mul(a.w,b.y)),Sub(Mul(a.w,b.x),Mul(a.x,b.w)),Sub(Mul(a.x,b.y),Mul(a.y,b.x))});}
inline H P(double x,double y){return {D(x),D(y),D(1)};}
inline H Positive(H p){if(Sign(p.w)<0){p.x=N(p.x);p.y=N(p.y);p.w=N(p.w);}return p;}
inline E At(const Line& l,const H& p){return Add(Add(Mul(l.x,p.x),Mul(l.y,p.y)),Mul(l.w,p.w));}
inline Line Flip(Line l){return {N(l.x),N(l.y),N(l.w)};}
using Poly=std::vector<H>;
inline std::shared_ptr<H> SharedEdge(const H& a,const H& b)
{for(const auto& x:a.boundaries)for(const auto& y:b.boundaries)if(x==y)return x;return {};}
inline Poly Bound(Poly p)
{
    // Intersections retain their two original lines. Reconstructing a line
    // from two rational intersections needlessly multiplies its degree and
    // makes clipping depend on the number of previous subtraction operations.
    Poly clean;
    for(const auto& v:p)
    {
        if(!clean.empty()) {const auto equal=Cross(clean.back(),v);if(Sign(equal.x)==0&&Sign(equal.y)==0&&Sign(equal.w)==0)continue;}
        clean.push_back(v);
    }
    if(clean.size()>1){const auto equal=Cross(clean.front(),clean.back());if(Sign(equal.x)==0&&Sign(equal.y)==0&&Sign(equal.w)==0)clean.pop_back();}
    for(std::size_t i=0;i<clean.size();++i)
    {
        auto& a=clean[i];auto& b=clean[(i+1)%clean.size()];
        if(!SharedEdge(a,b)){auto line=std::make_shared<H>(Cross(a,b));a.boundaries.push_back(line);b.boundaries.push_back(line);}
    }
    return clean;
}
inline bool Area(const Poly& p)
{
    if(p.size()<3)return false;
    for(std::size_t i=1;i+1<p.size();++i)if(Sign(At(Cross(p[0],p[i]),p[i+1]))!=0)return true;
    return false;
}
inline Poly Clip(const Poly& input,const Line& l)
{
    const auto p=Bound(input);Poly r;if(p.empty())return r;
    auto clipping=std::make_shared<H>(l);clipping->boundaries.clear();
    for(std::size_t i=0;i<p.size();++i)
    {
        const auto& a=p[i];const auto& b=p[(i+1)%p.size()];
        const int u=Sign(At(l,a)),v=Sign(At(l,b));
        if(u>=0){r.push_back(a);if(u==0)r.back().boundaries.push_back(clipping);}
        if((u<0&&v>0)||(u>0&&v<0))
        {
            const auto edge=SharedEdge(a,b);
            auto point=Positive(Cross(*edge,l));point.boundaries={edge,clipping};
            if(Sign(point.w)==0)throw std::runtime_error("Vehicle body clipping produced an unbounded intersection.");
            r.push_back(std::move(point));
        }
    }
    return Area(r)?Bound(r):Poly{};
}
inline std::vector<Line> Edges(const Poly& p)
{
    std::vector<Line> result;if(!Area(p))return result;
    int orientation=0;
    for(std::size_t i=1;i+1<p.size()&&!orientation;++i)orientation=Sign(At(Cross(p[0],p[i]),p[i+1]));
    for(std::size_t i=0;i<p.size();++i)
    {
        const auto original=SharedEdge(p[i],p[(i+1)%p.size()]);
        const auto raw=Cross(p[i],p[(i+1)%p.size()]);auto l=original?*original:raw;
        const int rawSign=Sign(raw.x)?Sign(raw.x):(Sign(raw.y)?Sign(raw.y):Sign(raw.w));
        const int lineSign=Sign(l.x)?Sign(l.x):(Sign(l.y)?Sign(l.y):Sign(l.w));
        if(rawSign!=lineSign)l=Flip(l);
        if(Sign(l.x)==0&&Sign(l.y)==0&&Sign(l.w)==0)continue;
        result.push_back(orientation>0?l:Flip(l));
    }
    return result;
}
inline Poly Intersection(Poly p,const Poly& q){for(const auto& line:Edges(q))p=Clip(p,line);return p;}
inline std::vector<Poly> Subtract(Poly p,const Poly& q)
{
    std::vector<Poly> result;if(q.empty()){if(Area(p))result.push_back(std::move(p));return result;}
    for(const auto& l:Edges(q))
    {
        auto outside=Clip(p,Flip(l));if(Area(outside))result.push_back(std::move(outside));
        p=Clip(p,l);if(p.empty())break;
    }
    return result;
}
// A plane is z=(a*x+b*y+c)/d, with d positive. XY and Z are centimetres.
struct Plane {E a,b,c,d;};
inline Plane Through(const std::array<BodyPoint,3>& t)
{
    const E ux=Sub(D(t[1].x),D(t[0].x)),uy=Sub(D(t[1].y),D(t[0].y)),uz=Sub(D(t[1].z),D(t[0].z)),
        vx=Sub(D(t[2].x),D(t[0].x)),vy=Sub(D(t[2].y),D(t[0].y)),vz=Sub(D(t[2].z),D(t[0].z));
    Plane p{Sub(Mul(uz,vy),Mul(vz,uy)),Sub(Mul(ux,vz),Mul(vx,uz)),{},Sub(Mul(ux,vy),Mul(uy,vx))};
    p.c=Sub(Sub(Mul(D(t[0].z),p.d),Mul(p.a,D(t[0].x))),Mul(p.b,D(t[0].y)));
    if(Sign(p.d)<0){p.a=N(p.a);p.b=N(p.b);p.c=N(p.c);p.d=N(p.d);}return p;
}
inline Line Above(const Plane& p,double height)
{return {p.a,p.b,Sub(p.c,Mul(D(height),p.d))};}
inline Line Difference(const Plane& p,const Plane& q,double gap=0)
{return {Sub(Mul(p.a,q.d),Mul(q.a,p.d)),Sub(Mul(p.b,q.d),Mul(q.b,p.d)),Sub(Sub(Mul(p.c,q.d),Mul(q.c,p.d)),Mul(D(gap),Mul(p.d,q.d)))};}
inline bool All(const Poly& p,const Line& line){for(const auto& v:p)if(Sign(At(line,v))<0)return false;return true;}
inline bool AnyPositive(const Poly& p,const Line& line){for(const auto& v:p)if(Sign(At(line,v))>0)return true;return false;}
inline std::pair<double,double> Enclose(const E& value)
{
    double low=0,high=0;
    for(double x:value){low=std::nextafter(low+x,-INFINITY);high=std::nextafter(high+x,INFINITY);}return {low,high};
}
struct FilterLine {Line exact;double a=0,b=0,c=0,ea=0,eb=0,ec=0;};
inline FilterLine Filter(const Line& line)
{
    FilterLine result;result.exact=line;
    auto coefficient=[](const E& e,double& value,double& error)
    {const auto bound=Enclose(e);for(double x:e)value+=x;error=std::max(std::abs(value-bound.first),std::abs(value-bound.second));};
    coefficient(line.x,result.a,result.ea);coefficient(line.y,result.b,result.eb);coefficient(line.w,result.c,result.ec);return result;
}
inline int FilteredSign(const FilterLine& line,double x,double y)
{
    const double ax=line.a*x,by=line.b*y,value=(ax+by)+line.c;
    const double error=2*(line.ea*std::abs(x)+line.eb*std::abs(y)+line.ec)+
        16*std::numeric_limits<double>::epsilon()*(std::abs(ax)+std::abs(by)+std::abs(line.c));
    if(std::abs(value)>error)return value>0?1:-1;
    return Sign(At(line.exact,P(x,y)));
}
inline std::pair<double,double> HeightBounds(const Plane& plane,const H& point)
{
    auto top=Enclose(Add(Add(Mul(plane.a,point.x),Mul(plane.b,point.y)),Mul(plane.c,point.w)));
    auto bottom=Enclose(Mul(plane.d,point.w));
    if(bottom.first<=0)throw std::runtime_error("Vehicle body height enclosure has uncertain denominator.");
    const double values[]={top.first/bottom.first,top.first/bottom.second,top.second/bottom.first,top.second/bottom.second};
    return {std::nextafter(*std::min_element(values,values+4)/100,-INFINITY),std::nextafter(*std::max_element(values,values+4)/100,INFINITY)};
}
inline bool Nearest(const Plane& chosen,const Plane& rival,const Poly& p,double demLow,double demHigh)
{
    const auto delta=Difference(rival,chosen);
    Line sum{Add(Mul(rival.a,chosen.d),Mul(chosen.a,rival.d)),Add(Mul(rival.b,chosen.d),Mul(chosen.b,rival.d)),
        Add(Mul(rival.c,chosen.d),Mul(chosen.c,rival.d))};
    const auto scale=Mul(rival.d,chosen.d);
    auto top=sum;top.w=Sub(top.w,Mul(D(2*demHigh),scale));
    auto bottom=sum;bottom.w=Sub(bottom.w,Mul(D(2*demLow),scale));
    // Interval signs are sufficient for |chosen-DEM| <= |rival-DEM| everywhere.
    // A straddling interval is refused rather than sampled into acceptance.
    return (All(p,delta)&&All(p,top))||(All(p,Flip(delta))&&All(p,Flip(bottom)));
}
}

// Conditional installed Chaos cook model. It predicts source membership;
// actual cooked geometry/native queries remain independent acceptance evidence.
inline bool BodyCookModelKnown(double schema,const std::string& id,const std::string& seal)
{
    return schema==1&&id=="ue5.8.3-cl58210709-chaos-cook-float32-cm-v1"&&
        seal=="e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428";
}
inline int BodyCookMembership(const std::array<BodyPoint,3>& triangle)
{
    for(const auto& p:triangle)for(double x:{p.x,p.y,p.z})
        if(!std::isfinite(x)||static_cast<double>(static_cast<float>(x))!=x)return -1;
    for(int a=0;a<3;++a)for(int b=a+1;b<3;++b)
        if(triangle[a].x==triangle[b].x&&triangle[a].y==triangle[b].y&&triangle[a].z==triangle[b].z)return 0;
    // Volatile stores force every installed scalar float operation to round;
    // no FMA, double area surrogate or widened physical threshold is used.
    auto round=[](float x){volatile float value=x;return value;};
    const int orders[6][3]={{0,1,2},{0,2,1},{1,0,2},{1,2,0},{2,0,1},{2,1,0}};
    int first=-2;
    for(const auto& order:orders)
    {
        const auto& a=triangle[order[0]];const auto& b=triangle[order[1]];const auto& c=triangle[order[2]];
        float u[3],v[3];const double aa[]={a.x,a.y,a.z},bb[]={b.x,b.y,b.z},cc[]={c.x,c.y,c.z};
        for(int i=0;i<3;++i){u[i]=round(static_cast<float>(aa[i])-static_cast<float>(bb[i]));v[i]=round(static_cast<float>(aa[i])-static_cast<float>(cc[i]));}
        const float x=round(round(u[1]*v[2])-round(u[2]*v[1])),
            y=round(round(u[2]*v[0])-round(u[0]*v[2])),z=round(round(u[0]*v[1])-round(u[1]*v[0]));
        const float square=round(round(round(x*x)+round(y*y))+round(z*z));
        const float length=round(std::sqrt(square));
        if(!std::isfinite(square)||!std::isfinite(length))return -1;
        const int state=square>1e-8f&&static_cast<double>(length)>1e-4?1:0;
        if(first==-2)first=state;else if(first!=state)return -1;
    }
    return first;
}

// Metadata never removes physical blockers. Consumers apply this closed pair
// only after the original/posed first-hit selection.
inline bool BodySupportEligibilityKnown(const std::string& kind,const std::string& role,bool eligible)
{
    if(kind!="road"&&kind!="derived-road"&&kind!="terrain"&&kind!="terrain-fragment"&&kind!="inferred")return false;
    if(role.empty())return eligible;
    if(kind!="inferred")return false;
    if(role=="support-top")return eligible;
    if(role=="physical-transition"||role=="physical-sidewall")return !eligible;
    return false;
}
inline bool BodySupportLayerPolicyKnown(bool road,const std::string& kind,bool requiresInterval)
{
    return (road&&kind=="road"&&!requiresInterval)||
        (road&&kind=="derived-road"&&requiresInterval)||
        (kind=="inferred"&&requiresInterval)||
        (!road&&(kind=="terrain"||kind=="terrain-fragment")&&requiresInterval);
}
inline constexpr std::size_t VehicleBodyWindowMaximumCandidates=1024;
inline bool BodySupportCandidateCountKnown(std::size_t count)
{return count>=1&&count<=VehicleBodyWindowMaximumCandidates;}
struct BodySupportFace
{
    std::array<BodyPoint,3> nativeCM;
    bool road=false,requiresInterval=false,supportEligible=false;
    std::string sourcePath,meshPath,layerKind,reconstructionRole;
    std::size_t triangle=0;
    double normalZ=0;
};
struct BodySupportInterval {BodyPoint a,b;double width=0;};
struct BodySupportWindow
{
    double start=0,end=0,minX=0,minY=0,maxX=0,maxY=0,demLow=0,demHigh=0;
    std::vector<std::size_t> faces;
    std::vector<BodySupportInterval> intervals;
    std::vector<std::vector<BodyPoint>> buildings;
    std::vector<BodyPoint> coveragePolygonNativeCM;
    mutable bool prepared=false;
    mutable std::map<std::size_t,bool> qualifiedFaces;
    mutable std::map<std::size_t,std::vector<std::vector<BodyExact::Line>>> qualifiedRegions;
    mutable std::map<std::size_t,std::vector<std::vector<BodyExact::FilterLine>>> qualifiedRegionFilters;
    mutable std::vector<std::pair<std::size_t,BodyExact::Poly>> visibleCells;
    mutable std::map<std::size_t,std::vector<std::pair<std::size_t,BodyExact::Poly>>> upperCells;
    mutable bool wholeDomain=false;
    mutable double minimumGround=0,maximumGround=0;
    mutable std::vector<BodyExact::Line> domainEdges;
    mutable std::vector<BodyExact::FilterLine> domainFilters;
};
struct BodySupportCache
{
    bool populated=false,nativeVerified=false;std::size_t route=0;std::uint64_t generation=0;
    BodyPoint origin;double distance=0,heading=0,wheelTravelled=0;BodyPose pose;
};
class VehicleBodySupport
{
public:
    std::vector<BodySupportFace> faces;
    std::map<std::string,std::vector<BodySupportWindow>> routes;
    std::vector<BodySupportCache> cache;
    std::uint64_t evaluations=0,qualifiedPoints=0,failures=0,changedFirstHits=0,ineligible=0,footprintFailures=0;
    std::uint64_t nativeContactFailures=0;
    std::string generationDigest;
    double nativeSourceToleranceCM=0;
    void BindRouteLength(const std::string& route,double length)
    {
        const auto found=routes.find(route);
        if(found==routes.end()||found->second.empty()||!std::isfinite(length)||length<=0)
            throw std::runtime_error("Vehicle body endpoint binding needs an actual positive route length and complete windows.");
        double previous=0;
        for(const auto& window:found->second)
        {
            if(!std::isfinite(window.start)||!std::isfinite(window.end)||window.start!=previous||window.end<=window.start)
                throw std::runtime_error("Vehicle body endpoint binding refuses internal window gaps, overlaps or invalid bounds.");
            previous=window.end;
        }
        if(std::abs(previous-length)>1e-6)
            throw std::runtime_error("Vehicle body declared endpoint differs from the actual route length by more than0.000001m.");
        found->second.back().end=length;
    }
    const BodySupportWindow* Window(const std::string& route,double distance) const
    {
        const auto it=routes.find(route);if(it==routes.end())return nullptr;
        const auto& windows=it->second;
        auto found=std::lower_bound(windows.begin(),windows.end(),distance,[](const auto& w,double d){return w.end<d;});
        return found!=windows.end()&&found->start<=distance?&*found:nullptr;
    }
    static BodyExact::Poly Polygon(const BodySupportFace& f)
    {BodyExact::Poly p;for(const auto& v:f.nativeCM)p.push_back(BodyExact::P(v.x,v.y));return p;}
    static BodyExact::Poly Band(const BodySupportInterval& interval)
    {
        const double dx=interval.b.x-interval.a.x,dy=interval.b.y-interval.a.y,length=std::hypot(dx,dy);
        if(length==0)return {};
        const double x=-dy/length*interval.width/2,y=dx/length*interval.width/2;
        BodyExact::Poly result;
        for(const auto& p:{BodyPoint{interval.a.x+x,interval.a.y+y,0},BodyPoint{interval.b.x+x,interval.b.y+y,0},
            BodyPoint{interval.b.x-x,interval.b.y-y,0},BodyPoint{interval.a.x-x,interval.a.y-y,0}})
        {const auto native=SourceToNativeCM(p);result.push_back(BodyExact::P(native.x,native.y));}
        return result;
    }
    bool CoveredByIntervals(const BodyExact::Poly& p,const BodySupportWindow& window) const
    {
        std::vector<BodyExact::Poly> remaining{p};
        for(const auto& interval:window.intervals)
        {
            std::vector<BodyExact::Poly> next;
            for(const auto& part:remaining){auto pieces=BodyExact::Subtract(part,Band(interval));next.insert(next.end(),pieces.begin(),pieces.end());}
            remaining=std::move(next);if(remaining.empty())return true;
            if(remaining.size()>128)return false;
        }
        return remaining.empty();
    }
    bool Eligible(std::size_t id,const BodyExact::Poly& p,const BodySupportWindow& window) const
    {
        using namespace BodyExact;const auto& face=faces[id];if(!face.supportEligible||face.normalZ<.7||!Area(p))return false;
        const auto plane=Through(face.nativeCM);if(Sign(plane.d)==0)return false;
        if((!face.road||face.requiresInterval)&&!CoveredByIntervals(p,window))return false;
        if(face.road&&(!All(p,Above(plane,window.demHigh*100-150))||!All(p,Flip(Above(plane,window.demLow*100+150)))))return false;
        for(auto other:window.faces)if(other!=id)
        {
            const auto& rival=faces[other];const auto overlap=Intersection(p,Polygon(rival));if(!Area(overlap))continue;
            const auto rp=Through(rival.nativeCM);if(Sign(rp.d)==0)continue;
            if(rival.road&&!face.road)
            {
                // Terrain is only considered when no road can be within 1.5m
                // of any admitted DEM height in this entire intersected cell.
                auto strict=[&](const auto& line){for(const auto& p:overlap)if(Sign(At(line,p))<=0)return false;return true;};
                const bool high=strict(Above(rp,window.demHigh*100+150));
                const bool low=strict(Flip(Above(rp,window.demLow*100-150)));
                if(!high&&!low)return false;
            }
            else if(rival.road==face.road&&!Nearest(plane,rp,overlap,window.demLow*100,window.demHigh*100))return false;
            // Retain Source.check's stacked-layer refusal before witness.
            auto stacked=Clip(Clip(overlap,Difference(rp,plane,20)),Flip(Difference(rp,plane,80)));
            if(Area(stacked)&&AnyPositive(stacked,Difference(rp,plane,20)))return false;
        }
        return true;
    }
    void Prepare(const BodySupportWindow& window) const
    {
        if(window.prepared)return;
        using namespace BodyExact;
        Poly bounds;
        for(const auto& p:{BodyPoint{window.minX,window.minY,0},BodyPoint{window.maxX,window.minY,0},
            BodyPoint{window.maxX,window.maxY,0},BodyPoint{window.minX,window.maxY,0}})
        {const auto native=SourceToNativeCM(p);bounds.push_back(P(native.x,native.y));}
        window.qualifiedFaces.clear();window.qualifiedRegions.clear();window.qualifiedRegionFilters.clear();window.visibleCells.clear();window.upperCells.clear();
        for(auto id:window.faces)
        {
            const auto plane=Through(faces[id].nativeCM);if(Sign(plane.d)==0)continue;
            auto cell=Intersection(Polygon(faces[id]),bounds);std::vector<Poly> candidates;
            if(!faces[id].road||faces[id].requiresInterval)
            {for(const auto& interval:window.intervals){auto part=Intersection(cell,Band(interval));if(Area(part))candidates.push_back(std::move(part));}}
            else candidates.push_back(cell);
            window.qualifiedFaces[id]=false;
            for(auto& part:candidates)if(Eligible(id,part,window))
            {
                window.qualifiedFaces[id]=true;const auto edges=Edges(part);window.qualifiedRegions[id].push_back(edges);
                std::vector<FilterLine> filtered;for(const auto& edge:edges)filtered.push_back(Filter(edge));
                window.qualifiedRegionFilters[id].push_back(std::move(filtered));window.visibleCells.push_back({id,std::move(part)});
            }
            if(!window.qualifiedFaces[id])continue;
            for(auto other:window.faces)if(other!=id)
            {
                const auto rival=Through(faces[other].nativeCM);if(Sign(rival.d)==0)continue;
                const auto upper=Clip(Intersection(Polygon(faces[other]),cell),Difference(rival,plane));
                if(!Area(upper))continue;
                // An equal-height ineligible blocker is an unresolved native
                // first-hit tie, not permission to select the eligible actor.
                if(!AnyPositive(upper,Difference(rival,plane))&&Eligible(other,upper,window))continue;
                window.upperCells[id].push_back({other,upper});
            }
        }
        Poly domain;
        for(const auto& p:window.coveragePolygonNativeCM)domain.push_back(P(p.x,p.y));
        if(domain.empty())domain=bounds;
        window.domainEdges=Edges(domain);window.wholeDomain=Area(domain);
        window.domainFilters.clear();for(const auto& edge:window.domainEdges)window.domainFilters.push_back(Filter(edge));
        window.minimumGround=INFINITY;window.maximumGround=-INFINITY;
        auto subtractAll=[&](std::vector<Poly> remaining,const auto& cells)
        {
            for(const auto& cell:cells)
            {
                std::vector<Poly> next;for(const auto& part:remaining){auto bits=Subtract(part,cell);next.insert(next.end(),bits.begin(),bits.end());}
                remaining=std::move(next);if(remaining.empty())break;
                if(remaining.size()>128)throw std::runtime_error("Vehicle body coverage-domain budget exceeded.");
            }
            return remaining.empty();
        };
        for(auto id:window.faces)
        {
            const auto part=Intersection(Polygon(faces[id]),domain);if(!Area(part))continue;
            std::vector<Poly> cells;for(const auto& row:window.visibleCells)if(row.first==id)cells.push_back(row.second);
            if(!subtractAll({part},cells))window.wholeDomain=false;
            const auto plane=Through(faces[id].nativeCM);
            for(const auto& p:part){const auto range=HeightBounds(plane,p);window.minimumGround=std::min(window.minimumGround,range.first);window.maximumGround=std::max(window.maximumGround,range.second);}
        }
        std::vector<Poly> cells;for(const auto& row:window.visibleCells)cells.push_back(row.second);
        if(!subtractAll({domain},cells))window.wholeDomain=false;
        for(const auto& building:window.buildings)
        {
            Poly poly;for(const auto& p:building){const auto packed=SourceToNativeCM(p);poly.push_back(P(packed.x,packed.y));}
            for(const auto& edge:window.domainEdges)poly=Clip(poly,edge);
            if(Area(poly))window.wholeDomain=false;
        }
        window.prepared=true;
    }
    static bool InDomain(const BodyPoint& p,const BodySupportWindow& window,const BodyPoint* native=nullptr)
    {
        using namespace BodyExact;
        for(const auto& l:window.domainFilters)if(FilteredSign(l,native?native->x:p.x*100,native?native->y:-p.y*100)<0)return false;
        return !window.domainFilters.empty();
    }
    static int Orientation(const BodyPoint& a,const BodyPoint& b,double x,double y)
    {
        const double left=(a.x-x)*(b.y-y),right=(a.y-y)*(b.x-x),det=left-right;
        constexpr double epsilon=std::numeric_limits<double>::epsilon()/2;
        if(std::abs(det)>(3+16*epsilon)*epsilon*(std::abs(left)+std::abs(right)))return det>0?1:-1;
        return BodyExact::Sign(BodyExact::At(BodyExact::Cross(BodyExact::P(a.x,a.y),BodyExact::P(b.x,b.y)),BodyExact::P(x,y)));
    }
    BodyGround Query(const BodyPoint& p,double reference,const BodySupportWindow& window,const BodyPoint* native=nullptr,const std::string& preferredMesh={}) const
    {
        Prepare(window);
        using namespace BodyExact;const double x=native?native->x:p.x*100,y=native?native->y:-p.y*100,zcm=native?native->z:p.z*100,referenceCM=reference*100;
        if(p.x<window.minX||p.x>window.maxX||p.y<window.minY||p.y>window.maxY)return {};
        std::size_t original=faces.size(),posed=faces.size();double oz=-1e300,pz=-1e300;
        for(auto id:window.faces)
        {
            const auto& f=faces[id];const auto& t=f.nativeCM;
            const int direction=Orientation(t[0],t[1],t[2].x,t[2].y);if(direction==0)continue;
            bool inside=true;for(std::size_t i=0;i<3;++i){const int side=Orientation(t[i],t[(i+1)%3],x,y);if(side!=0&&side!=direction){inside=false;break;}}if(!inside)continue;
            const auto& a=f.nativeCM[0];const auto& b=f.nativeCM[1];const auto& c=f.nativeCM[2];
            const double ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y,det=ux*vy-uy*vx;
            if(det==0)continue;
            const double s=((x-a.x)*vy-(y-a.y)*vx)/det,beta=(ux*(y-a.y)-uy*(x-a.x))/det;
            const double z=a.z+s*(b.z-a.z)+beta*(c.z-a.z);
            if(z>=referenceCM-100&&z<=referenceCM+80&&(z>oz||(z==oz&&f.meshPath==preferredMesh))){original=id;oz=z;}
            if(z>=zcm-100&&z<=zcm+80&&(z>pz||(z==pz&&f.meshPath==preferredMesh))){posed=id;pz=z;}
        }
        if(original==faces.size()||posed==faces.size())return {};
        // Coplanar edge ties can identify different triangles but their actual
        // first-hit height is identical; eligibility is required for both.
        const bool same=original==posed||(oz==pz&&faces[original].sourcePath==faces[posed].sourcePath);
        // Positive-area footprint coverage never grants closed-point eligibility
        // to a selected face touching only the cache boundary. Check that face's
        // own source-qualified region even when the footprint cache is valid.
        bool eligible=false;const auto regions=window.qualifiedRegionFilters.find(posed);
        if(regions!=window.qualifiedRegionFilters.end())for(const auto& region:regions->second)
        {
            bool inside=true;for(const auto& edge:region)if(FilteredSign(edge,x,y)<0){inside=false;break;}
            if(inside){eligible=true;break;}
        }
        return {true,eligible,same,pz/100,faces[posed].normalZ,posed};
    }
    bool Footprint(const std::array<BodyPoint,10>& points,double reference,const BodySupportWindow& window,const std::array<BodyPoint,10>* native=nullptr) const
    {
        Prepare(window);
        using namespace BodyExact;
        for(auto id:{2,3,5,4}){const auto& p=points[id];if(p.x<window.minX||p.y<window.minY||p.x>window.maxX||p.y>window.maxY)return false;}
        if(window.wholeDomain)
        {
            bool contained=true;double low=INFINITY,high=-INFINITY;
            for(auto id:{2,3,5,4}){contained=contained&&InDomain(points[id],window,native?&(*native)[id]:nullptr);low=std::min(low,points[id].z);high=std::max(high,points[id].z);}
            if(contained&&window.minimumGround>=reference-1&&window.maximumGround<=reference+.8&&window.minimumGround>=high-1&&window.maximumGround<=low+.8)return true;
        }
        Poly body;for(auto id:{2,3,5,4}){const auto& p=points[id];body.push_back(P(native?(*native)[id].x:p.x*100,native?(*native)[id].y:-p.y*100));}
        if(!Area(body))return false;
        for(const auto& building:window.buildings)
        {
            Poly poly;for(const auto& p:building){const auto packed=SourceToNativeCM(p);poly.push_back(P(packed.x,packed.y));}
            // OSM polygons can be concave; clipping against the convex body
            // preserves a conservative nonempty-area exclusion.
            for(const auto& l:Edges(body))poly=Clip(poly,l);
            if(Area(poly))return false;
        }
        std::array<BodyPoint,3> posedTriangle;for(std::size_t i=0;i<3;++i)posedTriangle[i]=native?(*native)[i+2]:SourceToNativeCM(points[i+2]);
        const auto posed=Through(posedTriangle);std::vector<Poly> uncovered{body};
        for(const auto& certified:window.visibleCells)
        {
            const auto id=certified.first;
            const auto plane=Through(faces[id].nativeCM);if(Sign(plane.d)==0)continue;
            Poly cell=Intersection(certified.second,body);
            cell=Clip(Clip(cell,Above(plane,reference*100-100)),Flip(Above(plane,reference*100+80)));
            cell=Clip(Clip(cell,Difference(plane,posed,-100)),Flip(Difference(plane,posed,80)));
            if(!Area(cell))continue;
            std::vector<Poly> visible{cell};
            const auto above=window.upperCells.find(id);
            if(above!=window.upperCells.end())for(const auto& blocker:above->second)
            {
                const auto rival=Through(faces[blocker.first].nativeCM);
                auto fixed=Clip(Clip(blocker.second,Above(rival,reference*100-100)),Flip(Above(rival,reference*100+80)));
                auto actual=Clip(Clip(blocker.second,Difference(rival,posed,-100)),Flip(Difference(rival,posed,80)));
                for(const auto& upper:{fixed,actual})
                {
                    if(!Area(upper))continue;std::vector<Poly> next;
                    for(const auto& part:visible){auto bits=Subtract(part,upper);next.insert(next.end(),bits.begin(),bits.end());}
                    visible=std::move(next);if(visible.size()>128)return false;
                }
            }
            for(const auto& piece:visible)
            {
                std::vector<Poly> next;for(const auto& part:uncovered){auto bits=Subtract(part,piece);next.insert(next.end(),bits.begin(),bits.end());}
                uncovered=std::move(next);if(uncovered.empty())return true;
                if(uncovered.size()>128)return false;
            }
        }
        return false;
    }
    BodyPose Fit(const std::string& route,double distance,const BodyPoint& origin,double heading)
    {
        ++evaluations;BodyPose result;const auto* window=Window(route,distance);
        if(window)
        {
            try
            {
                result=FitVehicleBody(origin,heading,[&](const auto& p,double ref){auto hit=Query(p,ref,*window);if(hit.found&&hit.eligible&&hit.sameFirstHit)++qualifiedPoints;return hit;},
                    [&](const auto& p){return Footprint(p,origin.z,*window);});
            }
            catch(const std::exception&){result.failure=BodyPoseFailure::Footprint;}
        }
        else result.failure=BodyPoseFailure::MissingSupport;
        if(!result.valid){++failures;if(result.failure==BodyPoseFailure::ChangedFirstHit)++changedFirstHits;if(result.failure==BodyPoseFailure::IneligibleSupport)++ineligible;if(result.failure==BodyPoseFailure::Footprint)++footprintFailures;}
        return result;
    }
    BodyPose Pose(std::size_t slot,std::size_t route,const std::string& id,double distance,std::uint64_t generation,const BodyPoint& origin,double heading,double wheelTravelled=0)
    {
        if(cache.size()<=slot)cache.resize(slot+1);
        auto& c=cache[slot];
        if(c.populated&&c.route==route&&c.generation==generation&&c.distance==distance&&c.heading==heading&&c.wheelTravelled==wheelTravelled&&
            c.origin.x==origin.x&&c.origin.y==origin.y&&c.origin.z==origin.z)return c.pose;
        c.populated=true;c.nativeVerified=false;c.route=route;c.generation=generation;c.distance=distance;c.heading=heading;c.origin=origin;c.wheelTravelled=wheelTravelled;
        c.pose=Fit(id,distance,origin,heading);return c.pose;
    }
    BodyPose VerifyActual(std::size_t slot,const std::string& id,const std::array<BodyPoint,10>& native)
    {
        auto& c=cache.at(slot);if(c.nativeVerified||!c.pose.valid)return c.pose;c.nativeVerified=true;
        auto refuse=[&](BodyPoseFailure reason,std::size_t i)
        {c.pose.valid=false;c.pose.failure=reason;c.pose.failedContact=i;++failures;if(reason==BodyPoseFailure::ChangedFirstHit)++changedFirstHits;if(reason==BodyPoseFailure::IneligibleSupport)++ineligible;if(reason==BodyPoseFailure::Footprint)++footprintFailures;return c.pose;};
        const auto* window=Window(id,c.distance);if(!window)return refuse(BodyPoseFailure::MissingSupport,10);
        std::array<BodyPoint,10> metres;
        try
        {
            for(std::size_t i=0;i<native.size();++i)
            {
                metres[i]=NativeCMToSource(native[i]);
                const auto hit=Query(metres[i],c.origin.z,*window,&native[i]);++c.pose.queries;
                if(!hit.found)return refuse(BodyPoseFailure::MissingSupport,i);
                if(!hit.sameFirstHit)return refuse(BodyPoseFailure::ChangedFirstHit,i);
                if(!hit.eligible)return refuse(BodyPoseFailure::IneligibleSupport,i);
                if(hit.normalZ<.7)return refuse(BodyPoseFailure::Normal,i);
                ++qualifiedPoints;c.pose.supportFaces[i]=hit.face;
                const double gap=std::abs(hit.height*100-native[i].z)/100;c.pose.maximumGap=std::max(c.pose.maximumGap,gap);
                if(gap>.2)return refuse(BodyPoseFailure::ContactGap,i);
            }
            if(!Footprint(metres,c.origin.z,*window,&native))return refuse(BodyPoseFailure::Footprint,10);
        }
        catch(const std::exception&){return refuse(BodyPoseFailure::Footprint,10);}
        return c.pose;
    }
};
}

#if defined(_MSC_VER)
#pragma float_control(pop)
#endif
