#pragma once

// Platform-independent simulation. Positions, speeds and route distances are metres.
// The runtime adapter alone converts this local frame to Unreal centimetres.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <deque>
#include <limits>
#include <map>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace Shibuya
{
constexpr double StepSeconds = 1.0 / 60.0;
struct Point
{
    double x = 0, y = 0, z = 0;
    Point operator+(const Point& p) const { return {x+p.x, y+p.y, z+p.z}; }
    Point operator-(const Point& p) const { return {x-p.x, y-p.y, z-p.z}; }
    Point operator*(double a) const { return {x*a, y*a, z*a}; }
};
inline double Length(const Point& p) { return std::sqrt(p.x*p.x+p.y*p.y+p.z*p.z); }
inline double Distance2D(const Point& a, const Point& b) { return std::hypot(a.x-b.x, a.y-b.y); }
// Shared by the actual fixed-step consumer and the bounded local body replay.
inline double AdvanceVehicleHeading(double heading,const Point& displacement)
{
    const double desired=Length(displacement)>1e-9?std::atan2(displacement.y,displacement.x):heading;
    const double difference=std::remainder(desired-heading,2*3.14159265358979323846);
    return heading+std::clamp(difference,-3.0*StepSeconds,3.0*StepSeconds);
}
inline void RequireBoundaryFootprintStations(const std::vector<Point>& stations,const Point& endpoint,const Point& heading,double declaredCount)
{
    if(!std::isfinite(declaredCount)||declaredCount!=std::floor(declaredCount)||declaredCount<4||declaredCount>4096||stations.size()!=static_cast<size_t>(declaredCount))
        throw std::runtime_error("Boundary footprint needs its complete ordered4..4096 source stations matching the whole receipt count.");
    auto finite=[](const Point& p){return std::isfinite(p.x)&&std::isfinite(p.y)&&std::isfinite(p.z);};
    if(!finite(endpoint)||!finite(heading)||std::abs(std::hypot(heading.x,heading.y)-1)>1e-6||std::abs(heading.z)>1e-6)
        throw std::runtime_error("Boundary footprint needs a finite endpoint and unit horizontal heading.");
    double first=0,previous=0;
    for(size_t i=0;i<stations.size();++i)
    {
        const auto& p=stations[i];const auto delta=p-endpoint;
        const double along=delta.x*heading.x+delta.y*heading.y;
        if(!finite(p)||!std::isfinite(along)||along<-2.2001||along>2.2001||std::hypot(delta.x-heading.x*along,delta.y-heading.y*along)>1e-4||std::abs(delta.z)>0.5)
            throw std::runtime_error("Boundary footprint station is off its actual4.4m endpoint heading or body height.");
        if(i==0)first=along;
        else
        {
            const double step=along-previous,horizontal=Distance2D(p,stations[i-1]);
            if(!std::isfinite(step)||step<=0||step>1.5+1e-9||!std::isfinite(horizontal)||horizontal<1e-6||std::abs(p.z-stations[i-1].z)>0.2*horizontal)
                throw std::runtime_error("Boundary footprint source stations must be distinct, ordered, at most1.5m apart and within0.2 adjacent grade.");
        }
        previous=along;
    }
    if(std::abs(first+2.2)>1e-4||std::abs(previous-2.2)>1e-4||std::abs(previous-first-4.4)>1e-4)
        throw std::runtime_error("Boundary footprint source stations must cover the complete -2.2m..+2.2m body length.");
}
enum class Kind { Pedestrian, Vehicle };
inline double CheckedHorizontalSegment(const Point& delta,const std::string& route,size_t endPoint,Kind kind)
{
    const double horizontal=std::hypot(delta.x,delta.y);
    if(!std::isfinite(horizontal)||horizontal<1e-6)
    {
        std::ostringstream message;
        message<<std::setprecision(17)<<"Route "<<route<<" segment points "<<endPoint-1<<"->"<<endPoint
            <<": "<<(std::isfinite(horizontal)?"coincident or sub-micrometre points":"non-finite horizontal distance")
            <<"; horizontal_m="<<horizontal<<", length_m="<<Length(delta)<<", grade="
            <<(horizontal>0?std::abs(delta.z)/horizontal:std::numeric_limits<double>::infinity())
            <<". Require horizontal distance >=0.000001m, sampled length <=2.05m and grade <="<<(kind==Kind::Vehicle?0.2:1.0)<<".";
        throw std::runtime_error(message.str());
    }
    return horizontal;
}
inline void RequireDirectedEndHeading(const Point& delta,const Point& heading,const std::string& route,size_t endPoint)
{
    const double horizontal=CheckedHorizontalSegment(delta,route,endPoint,Kind::Vehicle);
    const double deviation=std::hypot(heading.x-delta.x/horizontal,heading.y-delta.y/horizontal);
    if(!std::isfinite(deviation)||deviation>0.001)
    {
        std::ostringstream message;
        message<<std::setprecision(17)<<"Boundary route "<<route<<" end segment points "<<endPoint-1<<"->"<<endPoint
            <<" has heading deviation "<<deviation<<"; require finite horizontal direction deviation <=0.001 from the actual directed segment.";
        throw std::runtime_error(message.str());
    }
}
// The rendered vehicle body/wheels occupy 4.33 x 1.795 metres. The padded
// oriented footprint leaves clearance without blocking adjacent opposite lanes.
constexpr double VehicleHalfLength = 2.30;
constexpr double VehicleHalfWidth = 1.05;
inline bool FootprintsOverlap(Kind a,const Point& pa,double ha,Kind b,const Point& pb,double hb)
{
    if(std::abs(pa.z-pb.z)>=2.0) return false;
    if(a==Kind::Pedestrian && b==Kind::Pedestrian) return Distance2D(pa,pb)<0.6-0.001;
    if(a!=b)
    {
        const Point& car=a==Kind::Vehicle?pa:pb;
        const Point& person=a==Kind::Pedestrian?pa:pb;
        const double angle=a==Kind::Vehicle?ha:hb;
        const double dx=person.x-car.x,dy=person.y-car.y;
        const double along=dx*std::cos(angle)+dy*std::sin(angle);
        const double across=-dx*std::sin(angle)+dy*std::cos(angle);
        const double outsideX=std::max(0.0,std::abs(along)-VehicleHalfLength);
        const double outsideY=std::max(0.0,std::abs(across)-VehicleHalfWidth);
        return std::hypot(outsideX,outsideY)<0.3-0.001;
    }
    const Point delta=pb-pa;
    const double ax=std::cos(ha),ay=std::sin(ha),bx=std::cos(hb),by=std::sin(hb);
    for(const Point& axis:{Point{ax,ay,0},Point{-ay,ax,0},Point{bx,by,0},Point{-by,bx,0}})
    {
        const double first=VehicleHalfLength*std::abs(axis.x*ax+axis.y*ay)+VehicleHalfWidth*std::abs(-axis.x*ay+axis.y*ax);
        const double second=VehicleHalfLength*std::abs(axis.x*bx+axis.y*by)+VehicleHalfWidth*std::abs(-axis.x*by+axis.y*bx);
        if(std::abs(delta.x*axis.x+delta.y*axis.y)>=first+second-0.001) return false;
    }
    return true;
}
struct Signal
{
    std::string id;
    double period = 60, pedestrianStart = 0, pedestrianEnd = 20;
    bool Green(Kind kind, double time) const
    {
        const double phase = std::fmod(time, period);
        const bool pedestrian = phase >= pedestrianStart && phase < pedestrianEnd;
        return kind == Kind::Pedestrian ? pedestrian : !pedestrian;
    }
};
struct Stop { double distance = 0; size_t signal = 0; int direction = 1; };
struct SurfaceProfile { double rightZ = 0, centreZ = 0, leftZ = 0; };
struct Route
{
    std::string id;
    Kind kind = Kind::Pedestrian;
    bool closed = false;
    double speed = 1.35, width = 1.5, length = 0;
    std::vector<Point> points;
    std::vector<double> distances;
    std::vector<SurfaceProfile> profiles;
    std::vector<bool> corners;
    std::vector<double> cornerDistances;
    std::vector<Stop> stops;
    // The adapter sets admission only after reading the pinned source boundary
    // continuation and both actual endpoint footprint-support files.
    bool boundaryAdmitted = false;
    Point boundaryEntry, boundaryExit, boundaryEntryHeading, boundaryExitHeading;
    void Prepare()
    {
        if (points.size() < 2 || !std::isfinite(speed) || speed <= 0 || speed > 25 ||
            !std::isfinite(width) || width < 0.6 || width > 30)
            throw std::runtime_error("Route " + id + " needs finite positive speed, safe width and at least two points.");
        distances = {0}; length = 0;
        for (size_t i=0; i<points.size(); ++i)
        {
            const Point p = points[i];
            if (!std::isfinite(p.x) || !std::isfinite(p.y) || !std::isfinite(p.z) ||
                std::abs(p.x)>700 || std::abs(p.y)>700 || std::abs(p.z)>200)
                throw std::runtime_error("Route " + id + " has a non-finite or non-local point.");
            if (i == 0) continue;
            const Point delta = p-points[i-1];
            // Native profile and boundary-heading consumers use this same
            // finite, distinct-horizontal guard before any division.
            const double horizontal = CheckedHorizontalSegment(delta,id,i,kind), segment = Length(delta);
            const double grade = horizontal>0 ? std::abs(delta.z)/horizontal : std::numeric_limits<double>::infinity();
            const double maximumGrade = kind==Kind::Vehicle ? 0.2 : 1.0;
            auto rejectSegment = [&](const char* cause)
            {
                std::ostringstream message;
                message<<std::setprecision(17)<<"Route "<<id<<" segment points "<<i-1<<"->"<<i<<": "<<cause
                    <<"; horizontal_m="<<horizontal<<", length_m="<<segment<<", grade="<<grade
                    <<". Require horizontal distance >=0.000001m, sampled length <=2.05m and grade <="<<maximumGrade<<".";
                throw std::runtime_error(message.str());
            };
            // The shared horizontal guard preserves source-measured connectors;
            // source sampling merges only centres closer than one micrometre.
            if(segment>2.05)rejectSegment("sampled segment exceeds the distance limit");
            if(grade>maximumGrade)rejectSegment("segment exceeds the grade limit");
            length += segment; distances.push_back(length);
        }
        if (length < (kind==Kind::Vehicle?10:2))
            throw std::runtime_error("Route " + id + " needs a usable supported length.");
        if(closed && Length(points.back()-points.front())>1e-6)
            throw std::runtime_error("Closed route " + id + " endpoints differ by more than0.000001m; provide coincident supported endpoints instead of an implicit seam jump.");
        if (kind==Kind::Vehicle && !closed)
        {
            if(!boundaryAdmitted || Length(boundaryEntry-points.front())>1e-6 || Length(boundaryExit-points.back())>1e-6 ||
               !std::isfinite(Length(boundaryEntryHeading)) || !std::isfinite(Length(boundaryExitHeading)) ||
               std::abs(Length(boundaryEntryHeading)-1)>1e-6 || std::abs(Length(boundaryExitHeading)-1)>1e-6 ||
               std::abs(boundaryEntryHeading.z)>1e-6 || std::abs(boundaryExitHeading.z)>1e-6)
                throw std::runtime_error("Open vehicle route " + id + " needs admitted source continuation and supported entry/exit endpoints with unit headings.");
        }
        else if(boundaryAdmitted)throw std::runtime_error("Boundary flow is only valid for an open vehicle route.");
        for (Stop& stop : stops)
        {
            // Source endpoint distances and this geometric sum can differ by an
            // ulp. Admit only the existing one-micrometre endpoint tolerance,
            // then use the exact geometric endpoint for stopping and re-entry.
            if (!std::isfinite(stop.distance) || stop.distance < -1e-6 || stop.distance > length+1e-6 || (stop.direction!=1&&stop.direction!=-1))
                throw std::runtime_error("Route " + id + " needs a finite signal stop within its supported length (endpoint tolerance0.000001m) and direction+1 or-1.");
            if(std::abs(stop.distance)<=1e-6)stop.distance=0;
            else if(std::abs(stop.distance-length)<=1e-6)stop.distance=length;
        }
        if(!profiles.empty() && profiles.size()!=points.size())throw std::runtime_error("Route "+id+" lacks a measured cross-section for each point.");
        for(size_t i=0;i<profiles.size();++i)
        {
            const auto& profile=profiles[i];
            if(!std::isfinite(profile.rightZ) || !std::isfinite(profile.leftZ) || !std::isfinite(profile.centreZ) ||
                std::abs(profile.centreZ-points[i].z)>0.0001 || std::abs(profile.rightZ-profile.centreZ)>0.5 || std::abs(profile.leftZ-profile.centreZ)>0.5)
                throw std::runtime_error("Route "+id+" has an invalid measured support height profile.");
        }
        corners.assign(points.size(),false);cornerDistances.clear();
        for(size_t i=0;i<points.size();++i)
        {
            if(!closed && (i==0 || i+1==points.size()))continue;
            const size_t before=i==0?points.size()-2:i-1;
            const size_t after=i+1==points.size()?1:i+1;
            const Point incoming=points[i]-points[before],outgoing=points[after]-points[i];
            const double normaliser=std::hypot(incoming.x,incoming.y)*std::hypot(outgoing.x,outgoing.y);
            const bool turn=std::abs(incoming.x*outgoing.y-incoming.y*outgoing.x)/normaliser>1e-6 || incoming.x*outgoing.x+incoming.y*outgoing.y<0;
            corners[i]=turn;if(turn)cornerDistances.push_back(distances[i]);
        }
    }
    Point At(double distance, double lateral=0, Point* tangent=nullptr) const
    {
        distance = std::clamp(distance,0.0,length);
        const auto upper = std::upper_bound(distances.begin(),distances.end(),distance);
        const size_t i = std::min<size_t>(std::max<size_t>(1,upper-distances.begin()),points.size()-1);
        const Point delta=points[i]-points[i-1];
        const double part=(distance-distances[i-1])/(distances[i]-distances[i-1]);
        const double flat=std::hypot(delta.x,delta.y);
        double nearest=std::numeric_limits<double>::infinity();
        const auto corner=std::lower_bound(cornerDistances.begin(),cornerDistances.end(),distance);
        if(corner!=cornerDistances.end())nearest=std::min(nearest,std::abs(*corner-distance));
        if(corner!=cornerDistances.begin())nearest=std::min(nearest,std::abs(*(corner-1)-distance));
        // Join an actual turn at its checked centre. Collinear sampling points
        // are not turns and do not produce repeated lateral weaving.
        const double offset=lateral*std::min(1.0,nearest/1.5);
        if (tangent) *tangent = delta*(1.0/Length(delta));
        Point result=points[i-1]+delta*part+Point{-delta.y/flat*offset,delta.x/flat*offset,0};
        if(!profiles.empty())
        {
            // A corner's stored cross-section belongs to the incoming segment.
            // Its outgoing height slope uses the following measured section;
            // the corner itself has offset zero and its exact checked centre Z.
            const size_t start=corners[i-1]?i:i-1;
            auto slope=[&](size_t sample)
            { const auto& p=profiles[sample];return offset>=0?(p.leftZ-p.centreZ)/(width/2):(p.centreZ-p.rightZ)/(width/2); };
            result.z+=offset*(slope(start)*(1-part)+slope(i)*part);
        }
        return result;
    }
    double CrossSlope(double distance) const
    {
        if(profiles.empty())return 0;
        const auto upper=std::upper_bound(distances.begin(),distances.end(),std::clamp(distance,0.0,length));
        const size_t i=std::min<size_t>(std::max<size_t>(1,upper-distances.begin()),points.size()-1);
        const double t=std::clamp((distance-distances[i-1])/(distances[i]-distances[i-1]),0.0,1.0);
        const size_t start=corners[i-1]?i:i-1;
        return ((profiles[start].leftZ-profiles[start].rightZ)*(1-t)+(profiles[i].leftZ-profiles[i].rightZ)*t)/width;
    }
};
struct Agent
{
    size_t route = 0;
    double distance = 0, lateral = 0, speed = 0, desiredSpeed = 0;
    double travelled = 0, heading = 0;
    int direction = 1;
    uint32_t appearance = 0;
    uint64_t generation = 0;
    double generationTravelled = 0;
    Point position;
};
struct BoundaryEvent
{
    uint64_t step=0,generation=0;
    size_t agent=0,route=0;
    Point exit,entry;
};
struct Cell
{
    int x, y;
    bool operator==(const Cell& c) const { return x==c.x && y==c.y; }
};
struct CellHash
{
    size_t operator()(const Cell& c) const
    { return static_cast<size_t>(static_cast<uint32_t>(c.x))*73856093u ^ static_cast<size_t>(static_cast<uint32_t>(c.y))*19349663u; }
};
class Grid
{
    double size;
    std::unordered_map<Cell,std::vector<size_t>,CellHash> cells;
public:
    explicit Grid(double cellSize) : size(cellSize) {}
    Cell Key(const Point& p) const { return {static_cast<int>(std::floor(p.x/size)),static_cast<int>(std::floor(p.y/size))}; }
    void Insert(const Point& p, size_t id) { cells[Key(p)].push_back(id); }
    template<typename Function> void Neighbours(const Point& p, Function function, double radius=0) const
    {
        const Cell cell=Key(p);
        const int range=std::max(1,static_cast<int>(std::ceil(radius/size)));
        for(int x=-range;x<=range;++x) for(int y=-range;y<=range;++y)
        {
            const auto found=cells.find({cell.x+x,cell.y+y});
            if(found!=cells.end()) for(size_t i:found->second) function(i);
        }
    }
};
class Simulation
{
    uint32_t state = 1, initialSeed = 1;
    double accumulator = 0;
    uint64_t steps = 0, redViolations = 0;
    uint64_t boundaryReplacements = 0;
    size_t pedestrianCount = 0, vehicleCount = 0;
    uint32_t Next() { state ^= state<<13; state ^= state>>17; state ^= state<<5; return state; }
    double Random() { return static_cast<double>(Next())/4294967296.0; }
    static double Radius(Kind kind) { return kind==Kind::Pedestrian ? 0.3 : 2.25; }
    double GapToRedStop(const Agent& agent, double time) const
    {
        const Route& route=routes[agent.route];
        double result=std::numeric_limits<double>::infinity();
        for(const Stop& stop:route.stops)
        {
            if(stop.direction!=agent.direction)continue;
            if(signals[stop.signal].Green(route.kind,time)) continue;
            double gap=(stop.distance-agent.distance)*agent.direction;
            if(route.closed && gap<0) gap+=route.length;
            if(gap>=0) result=std::min(result,gap);
        }
        return result;
    }
    void FixedStep()
    {
        const double time=(steps+1)*StepSeconds;
        // Route-order following prevents vehicles accelerating through their leader.
        std::vector<double> leaderGap(agents.size(),std::numeric_limits<double>::infinity());
        std::map<size_t,std::vector<size_t>> lanes;
        for(size_t i=0;i<agents.size();++i)
            if(routes[agents[i].route].kind==Kind::Vehicle) lanes[agents[i].route].push_back(i);
        for(auto& lane:lanes)
        {
            auto& ids=lane.second;
            std::sort(ids.begin(),ids.end(),[&](size_t a,size_t b){return agents[a].distance<agents[b].distance;});
            if(ids.size()<2) continue;
            for(size_t i=0;i<ids.size();++i)
            {
                const size_t current=ids[i],next=ids[(i+1)%ids.size()];
                double gap=agents[next].distance-agents[current].distance;
                if(gap<0)
                {
                    if(routes[lane.first].closed)gap+=routes[lane.first].length;
                    else continue; // Last open-route car has no interior wrap leader.
                }
                leaderGap[current]=gap;
            }
        }
        // Reserve original and then accepted positions. Moving agents cannot cut
        // through a stationary neighbour, including agents on a different route.
        Grid pedGrid(1.0),vehicleGrid(5.0);
        for(size_t i=0;i<agents.size();++i)
            (routes[agents[i].route].kind==Kind::Pedestrian ? pedGrid : vehicleGrid).Insert(agents[i].position,i);
        for(size_t i=0;i<agents.size();++i)
        {
            Agent& agent=agents[i]; const Route& route=routes[agent.route];
            const double radius=Radius(route.kind);
            double target=agent.desiredSpeed;
            if(route.kind==Kind::Vehicle)
                target=std::min(target,std::max(0.0,(leaderGap[i]-5.0)/1.4));
            const double stopGap=GapToRedStop(agent,time);
            target=std::min(target,std::sqrt(2.0*(route.kind==Kind::Vehicle?3.0:2.0)*std::max(0.0,stopGap-radius)));
            const double acceleration=route.kind==Kind::Vehicle?2.0:1.5;
            const double deceleration=route.kind==Kind::Vehicle?5.0:3.0;
            agent.speed += std::clamp(target-agent.speed,-deceleration*StepSeconds,acceleration*StepSeconds);
            double movement=std::min(agent.speed*StepSeconds,std::max(0.0,stopGap-radius));
            double nextDistance=0;int nextDirection=agent.direction;
            auto positionAfter=[&](double progress)
            {
                nextDistance=agent.distance+progress*agent.direction;nextDirection=agent.direction;
                if(route.closed){nextDistance=std::fmod(nextDistance,route.length);if(nextDistance<0)nextDistance+=route.length;}
                else if(route.kind==Kind::Vehicle)nextDistance=std::min(nextDistance,route.length);
                else if(nextDistance>route.length)
                {
                    nextDistance=2*route.length-nextDistance;nextDirection=-1;
                    for(const Stop& stop:route.stops)
                        if(stop.direction==-1&&std::abs(stop.distance-route.length)<1e-6&&!signals[stop.signal].Green(route.kind,time))nextDistance=route.length;
                }
                else if(nextDistance<0)
                {
                    nextDistance=-nextDistance;nextDirection=1;
                    for(const Stop& stop:route.stops)
                        if(stop.direction==1&&std::abs(stop.distance)<1e-6&&!signals[stop.signal].Green(route.kind,time))nextDistance=0;
                }
                return route.At(nextDistance,agent.lateral);
            };
            Point candidate=positionAfter(movement);
            if(Length(candidate-agent.position)>agent.speed*StepSeconds+1e-8)
            {
                // Integrate physical motion along the continuous supported
                // offset trajectory. Reduce parameter progress, not an invalid
                // jump or its telemetry, so the agent still traverses the turn.
                double low=0,high=movement;
                for(int iteration=0;iteration<18;++iteration)
                { const double middle=(low+high)/2;if(Length(positionAfter(middle)-agent.position)>agent.speed*StepSeconds)high=middle;else low=middle; }
                movement=low;candidate=positionAfter(movement);
            }
            const Point displacement=candidate-agent.position;
            const double physicalMovement=Length(displacement);
            const double nextHeading=AdvanceVehicleHeading(agent.heading,displacement);
            bool occupied=false;
            auto collision=[&](size_t other)
            {
                if(i==other) return;
                const Kind otherKind=routes[agents[other].route].kind;
                if(FootprintsOverlap(route.kind,candidate,nextHeading,otherKind,agents[other].position,agents[other].heading)) occupied=true;
            };
            if(route.kind==Kind::Pedestrian) pedGrid.Neighbours(candidate,collision);
            vehicleGrid.Neighbours(candidate,collision,6.0);
            if(route.kind==Kind::Vehicle) pedGrid.Neighbours(candidate,collision,3.0);
            if(occupied) { agent.speed=0;continue; }
            // Count actual stop-line passage from the accepted movement separately
            // from the braking target and clamp, so a guard regression is visible.
            for(const Stop& stop:route.stops)
            {
                if(stop.direction!=agent.direction)continue;
                double lineGap=(stop.distance-agent.distance)*agent.direction;
                if(route.closed && lineGap<0) lineGap+=route.length;
                if(lineGap>=0 && movement>lineGap && !signals[stop.signal].Green(route.kind,time)) ++redViolations;
            }
            agent.distance=nextDistance; agent.direction=nextDirection;
            agent.position=candidate; agent.travelled+=physicalMovement;agent.generationTravelled+=physicalMovement;
            agent.heading=nextHeading;
            (route.kind==Kind::Pedestrian ? pedGrid : vehicleGrid).Insert(candidate,i);
            if(route.kind==Kind::Vehicle && !route.closed && agent.distance==route.length)
            {
                const double entryHeading=std::atan2(route.boundaryEntryHeading.y,route.boundaryEntryHeading.x);
                bool entryOccupied=false;
                auto entryCollision=[&](size_t other)
                {
                    if(other!=i && FootprintsOverlap(Kind::Vehicle,route.boundaryEntry,entryHeading,
                       routes[agents[other].route].kind,agents[other].position,agents[other].heading))entryOccupied=true;
                };
                vehicleGrid.Neighbours(route.boundaryEntry,entryCollision,6.0);
                pedGrid.Neighbours(route.boundaryEntry,entryCollision,3.0);
                if(entryOccupied)agent.speed=0;
                else
                {
                    // End the exit generation and begin its replacement at the
                    // source boundary. This is a lifecycle event, never motion.
                    ++agent.generation;++boundaryReplacements;
                    boundaryEvents.push_back({steps+1,agent.generation,i,agent.route,agent.position,route.boundaryEntry});
                    if(boundaryEvents.size()>1024)boundaryEvents.pop_front();
                    agent.distance=0;agent.position=route.boundaryEntry;agent.heading=entryHeading;
                    agent.direction=1;agent.speed=0;agent.generationTravelled=0;
                    agent.appearance=Next();agent.desiredSpeed=route.speed*(0.85+Random()*0.3);
                    vehicleGrid.Insert(agent.position,i);
                }
            }
        }
        ++steps;
    }
public:
    std::vector<Route> routes;
    std::vector<Signal> signals;
    std::vector<Agent> agents;
    std::deque<BoundaryEvent> boundaryEvents;
    bool paused = false;
    void Initialise(uint32_t seed,size_t pedestrians,size_t vehicles)
    {
        if(seed==0 || pedestrians>10000 || vehicles>1000) throw std::runtime_error("Population needs a non-zero seed and counts within 10000 pedestrians / 1000 vehicles.");
        for(Route& route:routes) route.Prepare();
        for(const Signal& signal:signals)
            if(!std::isfinite(signal.period) || signal.period<=0 || signal.pedestrianStart<0 ||
                signal.pedestrianEnd<=signal.pedestrianStart || signal.pedestrianEnd>signal.period)
                throw std::runtime_error("Signal "+signal.id+" needs finite ordered phases within its period.");
        for(const Route& route:routes) for(const Stop& stop:route.stops)
            if(stop.signal>=signals.size()) throw std::runtime_error("Route "+route.id+" references a missing signal.");
        state=initialSeed=seed;pedestrianCount=pedestrians;vehicleCount=vehicles;
        accumulator=0;steps=0;redViolations=0;boundaryReplacements=0;boundaryEvents.clear();paused=false;agents.clear();
        Grid pedGrid(1.0),vehicleGrid(5.0);
        for(Kind kind:{Kind::Vehicle,Kind::Pedestrian})
        {
            std::vector<size_t> available; double total=0;
            for(size_t r=0;r<routes.size();++r) if(routes[r].kind==kind) { available.push_back(r);total+=routes[r].length; }
            const size_t count=kind==Kind::Pedestrian?pedestrians:vehicles;
            if(count>0 && available.empty()) throw std::runtime_error("Population has no supported routes for an agent kind.");
            for(size_t n=0;n<count;++n)
            {
                bool placed=false;Agent agent;
                for(size_t attempt=0;attempt<512 && !placed;++attempt)
                {
                    double select=Random()*total; size_t r=available.back();
                    for(size_t candidate:available) { select-=routes[candidate].length;if(select<=0){r=candidate;break;} }
                    const Route& route=routes[r];
                    agent.route=r;agent.distance=Random()*route.length;
                    agent.direction=kind==Kind::Pedestrian && (Next()&1)?-1:1;
                    agent.lateral=kind==Kind::Pedestrian?(Random()-0.5)*std::max(0.0,route.width-0.8):0;
                    agent.desiredSpeed=route.speed*(0.85+Random()*0.3);agent.appearance=Next();
                    Point tangent;agent.position=route.At(agent.distance,agent.lateral,&tangent);
                    agent.heading=std::atan2(tangent.y*agent.direction,tangent.x*agent.direction);
                    placed=true;
                    auto collision=[&](size_t other)
                    {
                        if(FootprintsOverlap(kind,agent.position,agent.heading,routes[agents[other].route].kind,agents[other].position,agents[other].heading)) placed=false;
                    };
                    pedGrid.Neighbours(agent.position,collision);vehicleGrid.Neighbours(agent.position,collision,6.0);
                }
                if(!placed) throw std::runtime_error("Supported routes cannot admit the requested population without overlap; reduce population or provide more verified corridors.");
                const size_t index=agents.size(); agents.push_back(agent);
                (kind==Kind::Pedestrian?pedGrid:vehicleGrid).Insert(agent.position,index);
            }
        }
    }
    void Reset() { Initialise(initialSeed,pedestrianCount,vehicleCount); }
    void Advance(double elapsed)
    {
        if(!std::isfinite(elapsed) || elapsed<0) throw std::runtime_error("Simulation elapsed time must be finite and non-negative.");
        if(paused) return;
        // Preserve elapsed time rather than silently dropping slow-machine steps.
        accumulator+=elapsed;
        while(accumulator+1e-12>=StepSeconds) { FixedStep();accumulator-=StepSeconds; }
    }
    uint64_t Steps() const { return steps; }
    uint64_t RedViolations() const { return redViolations; }
    uint64_t BoundaryReplacements() const { return boundaryReplacements; }
    double Time() const { return steps*StepSeconds; }
};
}
