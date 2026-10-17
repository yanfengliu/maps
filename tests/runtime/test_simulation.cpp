#include "CitySimulation.h"
#include "RuntimePath.h"
#include "RuntimeReadLimit.h"
#include <cstdlib>
#include <iostream>
#include <functional>

using namespace Shibuya;
#include "fixtures/source_endpoint_foot_204019090.h"
#include "fixtures/source_vehicle_short_segments.h"
static int checks=0;
static void Check(bool value,const char* label)
{
    if(!value) { std::cerr<<"FAIL: "<<label<<"\n";std::exit(1); } ++checks;
}
static void Reject(const std::function<void()>& action,const char* label)
{
    bool rejected=false;try{action();}catch(const std::runtime_error&){rejected=true;}Check(rejected,label);
}
static void RejectNamed(const std::function<void()>& action,const char* cause)
{
    try { action();Check(false,"invalid segment was admitted"); }
    catch(const std::runtime_error& error)
    {
        const std::string message=error.what();
        Check(message.find(cause)!=std::string::npos,"segment rejection names its specific cause");
        Check(message.find("segment points 4->5")!=std::string::npos,"segment rejection identifies the actual point pair");
        Check(message.find("horizontal_m=")!=std::string::npos&&message.find("length_m=")!=std::string::npos&&message.find("grade=")!=std::string::npos,"segment rejection records actual distance and grade");
        Check(message.find("Require horizontal distance >=0.000001m, sampled length <=2.05m and grade <=")!=std::string::npos,"segment rejection explains the required bounds");
    }
}
static Route Walk()
{
    Route route;route.id="walk";route.width=4;
    for(int i=0;i<=200;++i) route.points.push_back({static_cast<double>(i),0,0});
    return route;
}
static Route Loop()
{
    Route route;route.id="loop";route.kind=Kind::Vehicle;route.closed=true;route.speed=8;route.width=3;
    const int count=400;
    for(int i=0;i<=count;++i)
    { const double a=i*2*3.14159265358979323846/count;route.points.push_back({100*std::cos(a),100*std::sin(a)+150,0}); }
    return route;
}
static Simulation City(size_t pedestrians=40,size_t vehicles=30,uint32_t seed=812)
{
    Simulation city;city.routes={Walk(),Loop()};city.Initialise(seed,pedestrians,vehicles);return city;
}
static Route BoundaryRoad()
{
    Route route;route.id="source-boundary-fixture";route.kind=Kind::Vehicle;route.speed=8;route.width=3;
    for(int i=-100;i<=100;++i)route.points.push_back({static_cast<double>(i),100,0});
    route.boundaryAdmitted=true;route.boundaryEntry=route.points.front();route.boundaryExit=route.points.back();
    route.boundaryEntryHeading=route.boundaryExitHeading={1,0,0};return route;
}
static bool PhysicalOverlap(const Agent& a,Kind ka,const Agent& b,Kind kb)
{
    // Independent expected envelope comes from the authored visual dimensions,
    // not the simulation's clearance constants. SAT tests the actual rectangles.
    if(ka==Kind::Pedestrian&&kb==Kind::Pedestrian)return Distance2D(a.position,b.position)<0.598;
    const double al=ka==Kind::Vehicle?2.17:0.30,aw=ka==Kind::Vehicle?0.94:0.30;
    const double bl=kb==Kind::Vehicle?2.17:0.30,bw=kb==Kind::Vehicle?0.94:0.30;
    const double ax=std::cos(a.heading),ay=std::sin(a.heading),bx=std::cos(b.heading),by=std::sin(b.heading);
    for(Point n:{Point{ax,ay,0},Point{-ay,ax,0},Point{bx,by,0},Point{-by,bx,0}})
    {
        const double ra=al*std::abs(n.x*ax+n.y*ay)+aw*std::abs(-n.x*ay+n.y*ax);
        const double rb=bl*std::abs(n.x*bx+n.y*by)+bw*std::abs(-n.x*by+n.y*bx);
        const Point d=b.position-a.position;
        if(std::abs(d.x*n.x+d.y*n.y)>=ra+rb-0.01)return false;
    }
    return true;
}
static Route BoxLane(bool reverse,double separation)
{
    Route route;route.id=reverse?"opposite":"forward";route.kind=Kind::Vehicle;route.closed=true;route.speed=8;route.width=3;
    std::vector<Point> corners=reverse?std::vector<Point>{{50,separation,0},{-50,separation,0},{-50,separation+10,0},{50,separation+10,0},{50,separation,0}}:
        std::vector<Point>{{-50,0,0},{50,0,0},{50,-10,0},{-50,-10,0},{-50,0,0}};
    route.points.push_back(corners[0]);
    for(size_t i=1;i<corners.size();++i)
    { const Point d=corners[i]-corners[i-1];const int samples=static_cast<int>(Length(d));for(int n=1;n<=samples;++n)route.points.push_back(corners[i-1]+d*(static_cast<double>(n)/samples)); }
    return route;
}
static void PedestrianSeam(int direction,double lateral)
{
    Route route=Loop();route.kind=Kind::Pedestrian;route.speed=1.35;route.width=4;
    Simulation city;city.routes={route};city.Initialise(41,1,0);
    auto& agent=city.agents[0];agent.direction=direction;agent.lateral=lateral;agent.distance=direction>0?city.routes[0].length-0.02:0.02;
    agent.position=city.routes[0].At(agent.distance,lateral);agent.speed=1;agent.travelled=0;
    const Point start=agent.position;double measured=0;
    for(int n=0;n<120;++n)
    {
        const Point old=agent.position;city.Advance(StepSeconds);const double step=Length(agent.position-old);measured+=step;
        Check(step<=agent.speed*StepSeconds+0.00001,"closed pedestrian seam physical speed is bounded");
        Check(agent.distance>=0&&agent.distance<city.routes[0].length,"both directions remain in closed route domain");
    }
    Check(Length(agent.position-start)>1,"closed reverse and forward pedestrians continue past seam");
    Check(std::abs(measured-agent.travelled)<1e-9,"travel telemetry equals actual seam displacement");
}
static void Equal(const Simulation& a,const Simulation& b,const char* label)
{
    bool same=a.Steps()==b.Steps()&&a.agents.size()==b.agents.size();
    for(size_t i=0;i<a.agents.size()&&same;++i)
    { const Agent& x=a.agents[i];const Agent& y=b.agents[i];same=x.distance==y.distance&&x.position.x==y.position.x&&x.position.y==y.position.y&&x.travelled==y.travelled&&x.heading==y.heading&&x.generation==y.generation&&x.generationTravelled==y.generationTravelled; }
    same=same&&a.BoundaryReplacements()==b.BoundaryReplacements()&&a.boundaryEvents.size()==b.boundaryEvents.size();
    Check(same,label);
}

// Exact actual boundary centres from boundary-ground-probe.json SHA4441062d3d67cc73e913df68d1b6efaae36686f6c1c7e259d8bc7d937821f0a6.
// Native reader retains PLATEAU, barycentric, full-width and OSM provenance checks.
static void BoundaryVariableStationChecks()
{
    const std::vector<Point> entry={
        {-485.75885316063824,46.032423038960125,5.8924464416500779},
        {-485.70722534118187,46.056653430754018,5.8911160168303542},
        {-485.57531039678202,46.118564834720644,5.8877166302599004},
        {-485.51520643941313,46.146773317099843,5.8861343917478592},
        {-485.47144739828167,46.167310669293002,5.8850133227754871},
        {-485.39304067349241,46.204109156638104,5.8830046099674886},
        {-485.38540502288959,46.207692782823678,5.8828089911707018},
        {-485.34798693158052,46.225254148423573,5.8818503718754114},
        {-485.34797526568269,46.225259623558458,5.8818500730051504},
        {-485.32318753764037,46.236893203447536,5.8812150327463764},
        {-485.32317841311738,46.236897485843556,5.8812147989839501},
        {-485.1162523199215,46.334013737572,5.8759135305681491},
        {-485.11624262959828,46.334018285513999,5.8759132823104085},
        {-485.11543502957045,46.334397314984805,5.8758925922927592},
        {-485.10412886190699,46.339703618351052,5.8756029380079262},
        {-485.01341749328589,46.382277022089468,5.8732789908150034},
        {-484.97109688237776,46.402139278409003,5.8721696774499295},
        {-484.97104499292288,46.402163631593673,5.8721683173167794},
        {-484.97104185765886,46.402165103061499,5.8721682351348319},
        {-484.96601339808109,46.404525100965188,5.8720364284974593},
        {-484.95231705178554,46.410953182576641,5.871677418084511},
        {-484.95216335234767,46.411025318057796,5.8716733892948261},
        {-484.91059235696946,46.430535758666814,5.8705837249496549},
        {-484.67827473920431,46.539568969024117,5.864494185295122},
        {-484.67666325879009,46.540325282233063,5.8644519449606207},
        {-484.67516446045397,46.541028710564653,5.8644126582634275},
        {-484.67486307332609,46.541170160044167,5.8644047582647776},
        {-484.67136350100367,46.542812608037835,5.8643130270192696},
        {-484.44695877055989,46.648132077198284,5.8584309009977993},
        {-484.4395640130096,46.651602645480118,5.8582370686497791},
        {-484.43906088959943,46.651838775486702,5.8582238807134237},
        {-484.43904597240891,46.651845776544938,5.8582234897020831},
        {-484.43881210748845,46.651955535948098,5.8582173596043283},
        {-484.43856408940223,46.65207193783111,5.8582108585219501},
        {-484.43114189869908,46.655555381265302,5.8580163070925524},
        {-484.42134826021373,46.660151812028531,5.8577595949650245},
        {-484.4160019090188,46.662661005434032,5.8577040667926701},
        {-484.41599710381803,46.662663260650305,5.8577040168849841},
        {-484.40376945782191,46.668402039787644,5.8575770183378406},
        {-484.39573774986758,46.672171546858785,5.8575765148923331},
        {-484.38292774902357,46.678183641551108,5.8575757119327063},
        {-484.36797490263422,46.685201434095177,5.8573899017759965},
        {-484.34985358902435,46.693706277670046,5.8571647189556861},
        {-484.23375362360849,46.748195265950116,5.8557220135198014},
        {-484.2146466087998,46.757162726898528,5.8554845819751034},
        {-484.19455208097224,46.766593655558722,5.855234879191606},
        {-484.19454888843876,46.766595153904746,5.8552348395198859},
        {-484.18704289213071,46.770117929672971,5.8551415669539848},
        {-484.17953689582669,46.773640705439327,5.8550448789186849},
        {-484.12202564549,46.800632357283,5.8543040512420621},
        {-484.01593346054693,46.850424411925431,5.8529374312082583},
        {-483.96974923723468,46.872099970516445,5.852371418031451},
        {-483.90984170563092,46.900216264744024,5.8516372181284115},
        {-483.87525162166452,46.916450366736242,5.8512132975358853},
        {-483.87518249525397,46.916482809710374,5.8512124503535272},
        {-483.87510445928211,46.916519434192907,5.8512114939795712},
        {-483.87497487732901,46.916580250658264,5.8512099058811327},
        {-483.87469813311299,46.916710134524209,5.8512065142278438},
        {-483.71379836993003,46.992224931440276,5.8492345987213046},
        {-483.65665965365611,47.019041742541276,5.8485343321801038},
        {-483.54112306747862,47.073266321055108,5.847118367474196},
        {-483.34718390022169,47.164287442154141,5.8447415358140749},
        {-483.34712557375576,47.164314816409657,5.8447408209910057},
        {-483.34711956893068,47.164317634643453,5.8447407473985562},
        {-483.28416045431493,47.193866122846124,5.843969148659486},
        {-483.28413251754262,47.193879234361304,5.8439688062789035},
        {-483.28412964139739,47.193880584217375,5.8439687710301556},
        {-483.22716043589764,47.220617839131123,5.8432705819371584},
        {-483.22708150323075,47.220654884457922,5.8432696145737104},
        {-483.22700162576456,47.220692373205694,5.8432686356312225},
        {-483.22680689038168,47.220783768013256,5.8432662490415002},
        {-483.22676708054877,47.220802451890648,5.8432657611500005},
        {-483.22653276786031,47.220912421443941,5.8432628895185283},
        {-483.22645392865365,47.220949422907211,5.8432619233004868},
        {-483.10343063675595,47.278687723572347,5.8417542048790327},
        {-483.08436849848169,47.28763412269744,5.8415205878412735},
        {-482.70193940764597,47.467118881145623,5.8368337080134083},
        {-482.41776993213801,47.600487630783476,5.8333510540669149},
        {-482.28499466731392,47.662802807389852,5.8317238198285795},
        {-482.22978947006328,47.688712163479799,5.8310472496314167},
        {-481.99781590103134,47.797583902062961,5.8282042853607914},
        {-481.95863725729981,47.815971544569756,5.8277241294328332},
        {-481.9194586135643,47.834359187078412,5.8272439735048263},
        {-481.77571937481679,47.901820065877523,5.8254823697076716},
    };
    RequireBoundaryFootprintStations(entry,{-483.76728626772751,46.967121552418824,5.8498901224647382},{0.90525767859578621,0.42486296066304491,0},84);
    Check(true,"actual entry complete variable source stations admitted");
    const std::vector<Point> exit={
        {148.78054561505459,486.90007642511279,1.1720488874079855},
        {148.81926145823206,487.14852043635358,1.1720341757507051},
        {148.83514632299378,487.25045543751889,1.1720281396510845},
        {148.84897638781834,487.33920455154401,1.1729172801452081},
        {148.85103118775478,487.35239043867983,1.1730493840690848},
        {148.8629975149978,487.42917973463921,1.1738187041158479},
        {148.87701864217723,487.5191549177344,1.1744310846606516},
        {148.87812134412738,487.5262310827668,1.1744792457829585},
        {148.89031448277865,487.60447585357684,1.1750117879098887},
        {148.90250762142992,487.68272062438689,1.1755974247519609},
        {148.93944481719438,487.9197508509439,1.1773715194539995},
        {148.95815929516638,488.03984380499179,1.1782703764336486},
        {148.97687377313838,488.15993675903968,1.17915897333398},
        {149.00637550092983,488.3492527338318,1.1805597681575994},
        {149.08715605386141,488.86763081767123,1.184395373353186},
        {149.13401766113941,489.16834713248744,1.1866204463172354},
        {149.15561524496204,489.3069413078332,1.187645938242158},
        {149.17721282879074,489.44553548321812,1.1886714301673704},
        {149.18863875618885,489.51885697132093,1.1892139536448916},
        {149.23220538680573,489.79842904255509,1.1912825752212983},
        {149.29012098245445,490.17008007002727,1.1940325113323298},
        {149.39998040151869,490.87506057683885,1.1992488331233402},
        {149.45803527268097,491.2476053512741,1.2020053822849655},
    };
    RequireBoundaryFootprintStations(exit,{149.11929044386778,489.07384088819344,1.1859211716894489},{0.15397492218781103,0.98807475594575211,0},23);
    Check(true,"actual exit complete variable source stations admitted");
    const Point endpoint{0,0,1},heading{1,0,0};
    const std::vector<Point> four={{-2.2,0,1},{-2.2+4.4/3,0,1},{-2.2+8.8/3,0,1},{2.2,0,1}};
    RequireBoundaryFootprintStations(four,endpoint,heading,4);Check(true,"old four-station footprint remains valid");
    auto bad=four;bad.front().x=-2;Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"missing first body coverage rejected");
    bad=four;bad.back().x=2;Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"missing last body coverage rejected");
    bad=four;std::reverse(bad.begin(),bad.end());Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"reversed stations rejected");
    bad=four;bad[1]=bad[0];Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"duplicate stations rejected");
    bad=four;bad[1].y=.01;Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"off-axis body station rejected");
    bad={{-2.2,0,1},{-1,0,1},{1,0,1},{2.2,0,1}};Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"longitudinal gap over1.5m rejected");
    Reject([&]{RequireBoundaryFootprintStations(four,endpoint,heading,5);},"receipt and actual count mismatch rejected");
    Reject([&]{RequireBoundaryFootprintStations(four,endpoint,heading,4.5);},"fractional station receipt rejected");
    Reject([&]{RequireBoundaryFootprintStations(four,endpoint,heading,4097);},"oversize station receipt rejected");
    Reject([&]{RequireBoundaryFootprintStations(four,endpoint,heading,std::numeric_limits<double>::quiet_NaN());},"nonfinite station receipt rejected");
    bad=four;bad[1].z=std::numeric_limits<double>::quiet_NaN();Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"nonfinite source station rejected");
    bad=four;bad[1].z=1.4;Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"adjacent vehicle grade over0.2 rejected");
    bad=four;bad[1].z=1.6;Reject([&]{RequireBoundaryFootprintStations(bad,endpoint,heading,4);},"body height over0.5m rejected");
}

int main()
{
    BoundaryVariableStationChecks();
    for(int selection:{0,1})
    {
        Route measured=SourceVehicleConnectorSection(selection);const auto originalPoints=measured.points;
        try {measured.Prepare();}
        catch(const std::runtime_error&) {Check(false,"source-pinned distinct short connectors are admitted without coordinate changes");}
        Check(measured.points.size()==19&&measured.profiles.size()==19,"both actual short-connector excerpts retain every support sample");
        for(size_t i=0;i<originalPoints.size();++i)
            Check(Length(measured.points[i]-originalPoints[i])==0,"source short connectors are neither merged nor snapped");
        const double expectedLength=selection==0?0.00023825389393367528:0.000020639509956320403;
        const double parameterLength=measured.distances[9]-measured.distances[8];
        Check(std::abs(parameterLength-expectedLength)<1e-14,"tiny source segment contributes its actual measured 3D length");
        Point tangent;const Point midpoint=measured.At(measured.distances[8]+parameterLength/2,0,&tangent);
        const Point expectedMidpoint=(originalPoints[8]+originalPoints[9])*0.5;
        Check(Length(midpoint-expectedMidpoint)<1e-11,"tiny-segment interpolation reaches the independent source midpoint");
        Check(std::isfinite(tangent.x)&&std::isfinite(tangent.y)&&std::isfinite(tangent.z)&&std::abs(Length(tangent)-1)<1e-12,"tiny-segment tangent is finite and normalized");
        const Point shortDelta=originalPoints[9]-originalPoints[8];
        const double measuredHorizontal=CheckedHorizontalSegment(shortDelta,measured.id,9,Kind::Vehicle);
        Check(measuredHorizontal>0.000001&&measuredHorizontal<0.02,"native pre-division guard admits distinct measured sub-centimetre segments");
        for(int direction:{1,-1})
        {
            const Point delta=shortDelta*direction,heading={delta.x/measuredHorizontal,delta.y/measuredHorizontal,0};
            RequireDirectedEndHeading(delta,heading,measured.id,9);
            Reject([&]{RequireDirectedEndHeading(delta,heading*(-1),measured.id,9);},"actual native end-heading validator retains both source direction signs and rejects opposition");
            Simulation motion;motion.routes={measured};motion.Initialise(71,1,0);
            Agent& agent=motion.agents[0];agent.direction=direction;agent.lateral=0;agent.speed=1;agent.desiredSpeed=1;
            agent.distance=measured.distances[direction>0?8:9]-direction*0.05;agent.position=motion.routes[0].At(agent.distance);agent.travelled=0;
            const Point start=agent.position;double observedTravel=0;
            for(int step=0;step<120;++step)
            {
                const Point before=agent.position;motion.Advance(StepSeconds);const double displacement=Length(agent.position-before);observedTravel+=displacement;
                Check(std::isfinite(displacement)&&displacement<=agent.speed*StepSeconds+1e-8,"both directions traverse tiny segments with finite bounded physical displacement");
            }
            Check(direction>0?agent.distance>measured.distances[9]:agent.distance<measured.distances[8],"both signs actually pass the source tiny segment");
            Check(Length(agent.position-start)>1&&std::abs(observedTravel-agent.travelled)<1e-12,"tiny-segment telemetry agrees with actual movement rather than a connector jump");
        }
    }
    for(double horizontal:{0.0,0.0000005})
    {
        Route coincident=Walk();coincident.points[5]=coincident.points[4]+Point{horizontal,0,0};
        RejectNamed([&]{coincident.Prepare();},"coincident or sub-micrometre points");
        RejectNamed([&]{CheckedHorizontalSegment({horizontal,0,0},"profile-guard",5,Kind::Vehicle);},"coincident or sub-micrometre points");
        RejectNamed([&]{RequireDirectedEndHeading({horizontal,0,0},{1,0,0},"boundary-guard",5);},"coincident or sub-micrometre points");
    }
    for(double nonfinite:{std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()})
    {
        RejectNamed([&]{CheckedHorizontalSegment({nonfinite,0,0},"profile-guard",5,Kind::Vehicle);},"non-finite horizontal distance");
        RejectNamed([&]{RequireDirectedEndHeading({nonfinite,0,0},{1,0,0},"boundary-guard",5);},"non-finite horizontal distance");
        Reject([&]{RequireDirectedEndHeading({1,0,0},{nonfinite,0,0},"boundary-heading",5);},"actual native heading validator rejects nonfinite direction");
    }
    Route tooLong=Walk();tooLong.points[5]=tooLong.points[4]+Point{2.050001,0,0};
    RejectNamed([&]{tooLong.Prepare();},"sampled segment exceeds the distance limit");
    Route steepVehicle=Loop();steepVehicle.points[5]=steepVehicle.points[4]+Point{0.000002,0,0.000001};
    RejectNamed([&]{steepVehicle.Prepare();},"segment exceeds the grade limit");
    Route sourceEndpoint=SourceEndpointCrossing();
    try {sourceEndpoint.Prepare();}
    catch(const std::runtime_error&) {Check(false,"source-pinned endpoint double roundoff is admitted");}
    Check(sourceEndpoint.stops[0].distance==0&&sourceEndpoint.stops[1].distance==sourceEndpoint.length,"source endpoint stops snap to exact supported geometric endpoints");
    Route roundedEndpoint=sourceEndpoint;roundedEndpoint.stops={{-1e-8,0,1},{std::nextafter(sourceEndpoint.length,std::numeric_limits<double>::infinity()),0,-1}};
    roundedEndpoint.Prepare();
    Check(roundedEndpoint.stops[0].distance==0&&roundedEndpoint.stops[1].distance==roundedEndpoint.length,"both endpoint roundoff signs normalize without interior signal lines");
    for(double outside:{-0.000002,sourceEndpoint.length+0.000002,std::numeric_limits<double>::quiet_NaN()})
    {
        Route invalidStop=sourceEndpoint;invalidStop.stops={{outside,0,1}};
        Reject([&]{invalidStop.Prepare();},"signal stops beyond one-micrometre endpoint tolerance or nonfinite remain rejected");
    }
    Route invalidDirection=sourceEndpoint;invalidDirection.stops[0].direction=0;
    Reject([&]{invalidDirection.Prepare();},"endpoint tolerance does not admit invalid signal direction");
    for(int direction:{1,-1})
    {
        Simulation endpointSignal;endpointSignal.routes={sourceEndpoint};endpointSignal.signals={{"scramble",70,50,70}};endpointSignal.Initialise(17,1,0);
        Agent& walker=endpointSignal.agents[0];walker.distance=direction==1?0:endpointSignal.routes[0].length;walker.direction=direction;walker.lateral=0;walker.position=endpointSignal.routes[0].At(walker.distance);walker.speed=0;
        const Point held=walker.position;endpointSignal.Advance(1);
        Check(Length(walker.position-held)<1e-9,"source-pinned normalized forward and reverse signal entries hold at exact supported endpoints");
    }
    Simulation fast=City(),slow=City();
    for(int i=0;i<600;++i) fast.Advance(1.0/60);
    for(int i=0;i<100;++i) slow.Advance(0.1);
    Equal(fast,slow,"fixed-step results match independent frame schedules");
    Check(fast.Steps()==600,"no fixed steps dropped on slow render schedule");
    double pedTravel=0,vehicleTravel=0;
    for(const Agent& agent:fast.agents)
    { if(fast.routes[agent.route].kind==Kind::Pedestrian)pedTravel+=agent.travelled;else vehicleTravel+=agent.travelled; }
    Check(pedTravel>100&&vehicleTravel>500,"both populations actually move over time");
    for(size_t i=0;i<fast.agents.size();++i) for(size_t j=i+1;j<fast.agents.size();++j)
    {
        const Agent& a=fast.agents[i];const Agent& b=fast.agents[j];
        Check(!PhysicalOverlap(a,fast.routes[a.route].kind,b,fast.routes[b.route].kind),"accepted positions preserve rendered agent footprint separation");
    }
    Simulation paused=fast;paused.paused=true;paused.Advance(2);Equal(fast,paused,"pause preserves exact simulation state");
    paused.paused=false;paused.Advance(1.0/60);Check(paused.Steps()==fast.Steps()+1,"resume advances fixed clock");
    fast.Reset();Equal(fast,City(),"reset recreates seeded population positions");
    Simulation otherSeed=City(40,30,813);Check(fast.agents[0].position.x!=otherSeed.agents[0].position.x,"different seed changes placement");
    Route invalid=Walk();invalid.points[5].z=20;Reject([&]{invalid.Prepare();},"steep ungrounded segment rejected");
    invalid=Walk();invalid.points[5].x=std::numeric_limits<double>::quiet_NaN();Reject([&]{invalid.Prepare();},"non-finite local geometry rejected");
    invalid=Loop();invalid.points.pop_back();Reject([&]{invalid.Prepare();},"fabricated loop closure rejected");
    for(int direction:{1,-1})
    {
        invalid=Loop();invalid.kind=Kind::Pedestrian;invalid.points.back()=invalid.points.front()+Point{0.04,0,0};
        if(direction<0)std::reverse(invalid.points.begin(),invalid.points.end());
        Reject([&]{invalid.Prepare();},"nonzero closed seam rejects former 0.04m gap in both directions");
    }
    invalid=Loop();invalid.closed=false;Reject([&]{invalid.Prepare();},"open vehicle teleport route rejected");
    invalid=Walk();invalid.points.erase(invalid.points.begin()+1,invalid.points.begin()+10);Reject([&]{invalid.Prepare();},"under-sampled route rejected");
    Reject([&]{Simulation city;city.routes={Walk()};city.Initialise(1,10000,0);},"overcapacity population fails rather than overlapping");
    Reject([&]{fast.Advance(-1);},"negative elapsed time rejected");
    Reject([&]{fast.Advance(std::numeric_limits<double>::infinity());},"infinite elapsed time rejected");
    Simulation signal;Route crossing=Walk();crossing.stops={{100,0}};crossing.Prepare();signal.routes={crossing};signal.signals={{"scramble",60,20,40}};signal.Initialise(5,1,0);
    signal.agents[0].distance=99;signal.agents[0].direction=1;signal.agents[0].lateral=0;signal.agents[0].position=crossing.At(99);signal.agents[0].speed=1;
    for(int i=0;i<600;++i) signal.Advance(StepSeconds);
    Check(signal.agents[0].distance<100&&signal.agents[0].distance>=99,"pedestrian holds before red stop line");
    Check(signal.RedViolations()==0,"no actual red-line passage recorded");
    for(int i=0;i<900;++i) signal.Advance(StepSeconds);
    Check(signal.agents[0].distance>100,"pedestrian crosses after green phase begins");
    Simulation vehicleSignal;Route road=Loop();road.Prepare();road.stops={{100,0}};vehicleSignal.routes={road};vehicleSignal.signals={{"scramble",60,0,30}};vehicleSignal.Initialise(3,0,1);
    vehicleSignal.agents[0].distance=90;vehicleSignal.agents[0].position=road.At(90);vehicleSignal.agents[0].speed=8;
    for(int i=0;i<600;++i) vehicleSignal.Advance(StepSeconds);
    Check(vehicleSignal.agents[0].distance<100,"vehicle brakes before pedestrian green");
    Check(vehicleSignal.RedViolations()==0,"vehicle does not cross a red line");
    Simulation bounce;bounce.routes={Walk()};bounce.Initialise(9,1,0);bounce.agents[0].distance=199.99;bounce.agents[0].direction=1;bounce.agents[0].lateral=0;bounce.agents[0].position=bounce.routes[0].At(199.99);bounce.agents[0].speed=1;
    bounce.Advance(StepSeconds);Check(bounce.agents[0].direction==-1&&bounce.agents[0].distance<=200,"open pedestrian endpoint reverses continuously");
    Simulation wrap;wrap.routes={Loop()};wrap.Initialise(9,0,1);wrap.agents[0].distance=wrap.routes[0].length-0.01;wrap.agents[0].position=wrap.routes[0].At(wrap.agents[0].distance);wrap.agents[0].speed=2;
    const Point old=wrap.agents[0].position;wrap.Advance(StepSeconds);Check(Distance2D(old,wrap.agents[0].position)<0.1,"closed vehicle seam has no position jump");
    PedestrianSeam(-1,0);PedestrianSeam(1,0);PedestrianSeam(-1,0.8);PedestrianSeam(1,0.8);
    Route corner;corner.id="right-angle-profile";corner.width=4;
    for(int i=0;i<=10;++i)corner.points.push_back({static_cast<double>(i)-5,0,0});
    for(int i=1;i<=10;++i)corner.points.push_back({5,static_cast<double>(i),0});
    for(const Point& p:corner.points)corner.profiles.push_back({p.z-0.1,p.z,p.z+0.1});
    corner.Prepare();
    Check(Length(corner.At(9.999,1)-corner.At(10.001,1))<0.004,"nonzero lateral right-angle trajectory is continuous");
    Check(std::abs(corner.At(9.5,1).z-1.0/60)<1e-9,"lateral height uses checked cross-section slope");
    Check(std::abs(corner.CrossSlope(9.5)-0.05)<1e-9,"car roll consumes measured right-to-left source grade");
    Check(std::abs(corner.At(3.5,1).y-1)<1e-9,"collinear metre samples do not produce weaving");
    Simulation turn;turn.routes={corner};turn.Initialise(19,1,0);auto& person=turn.agents[0];person.distance=8;person.lateral=1;person.direction=1;person.position=turn.routes[0].At(8,1);person.speed=1.35;person.travelled=0;
    double cornerMeasured=0;
    for(int i=0;i<360;++i)
    {
        const Point previous=person.position;turn.Advance(StepSeconds);const double displacement=Length(person.position-previous);cornerMeasured+=displacement;
        Check(displacement<=person.speed*StepSeconds+1e-5,"corner actual displacement obeys physical speed");
        Check((person.position.x<=5.000001&&person.position.y>=-0.000001&&person.position.y<=2.000001) ||
              (person.position.x>=3&&person.position.x<=5.000001&&person.position.y>=-0.000001),"transition stays in individually checked segment corridors");
    }
    Check(person.distance>12,"offset transition traverses the corner without stranding");
    Check(std::abs(cornerMeasured-person.travelled)<1e-9,"corner telemetry binds actual position displacement");
    for(double separation:{3.0,3.5})
    {
        Simulation opposing;opposing.routes={BoxLane(false,separation),BoxLane(true,separation)};opposing.Initialise(11,0,2);
        for(size_t i=0;i<2;++i){auto& car=opposing.agents[i];car.route=i;car.distance=40;car.direction=1;car.position=opposing.routes[i].At(40);car.heading=i?3.14159265358979323846:0;car.speed=5;car.desiredSpeed=8;car.travelled=0;}
        for(int i=0;i<300;++i)
        {opposing.Advance(StepSeconds);Check(!PhysicalOverlap(opposing.agents[0],Kind::Vehicle,opposing.agents[1],Kind::Vehicle),"opposing adjacent vehicles preserve real body clearance");}
        Check(opposing.agents[0].position.x>10&&opposing.agents[1].position.x<-10,"vehicles actually pass in adjacent opposing lanes");
        Check(opposing.agents[0].travelled>30&&opposing.agents[1].travelled>30,"opposing traffic does not permanently deadlock");
    }
    for(const std::string& invalidPath:{"C:/escape.json","C:escape.json","/absolute.json","data\\escape.json","data/a:ads","data/../escape.json","data/./escape.json","data//escape.json","data/NUL.json","data/COM1.txt","data/file. ","data/invalid?.json","data/trailing/"})
        Check(!SafeRelativePath(invalidPath),"whole Windows escape/ADS/reserved/path class rejected");
    Check(SafeRelativePath("data/prepared/surface/movement-network.json"),"ordinary project-relative source path admitted");
    Check(SafeIdentifier("foot-41857250-0")&&!SafeIdentifier("../route")&&!SafeIdentifier("bad:route"),"route ids cannot construct Windows path escapes");
    for(int64_t size:{-1LL,0LL,33554433LL,9223372036854775807LL})
        Reject([&]{AdmitRuntimeInputSize(size,-1,"oversized fixture");},"bounded input size rejects oversize before allocation");
    Reject([&]{AdmitRuntimeInputSize(10,9,"replaced fixture");},"opened/revalidated size must match its prior admitted size");
    AdmitRuntimeInputSize(1,-1,"small fixture");AdmitRuntimeInputSize(33554432,33554432,"largest admitted fixture");
    Check(RuntimeInputLimit(RuntimeInputRole::Source)==33554432,"ordinary source cap remains32 MiB");
    Check(RuntimeInputLimit(RuntimeInputRole::DerivedTerrain)==67108864,"derived terrain has the producer's fixed64 MiB role");
    AdmitRuntimeInputSize(40800172,40800172,"published derived terrain",RuntimeInputRole::DerivedTerrain);
    Reject([&]{AdmitRuntimeInputSize(40800172,40800172,"ordinary input");},"large mesh cannot widen an ordinary source role");
    Reject([&]{AdmitRuntimeInputSize(67108865,67108865,"oversized derived terrain",RuntimeInputRole::DerivedTerrain);},"derived role cannot exceed64 MiB");
    Reject([&]{AdmitRuntimeInputSize(40800172,40800171,"changed derived terrain",RuntimeInputRole::DerivedTerrain);},"derived terminal read keeps its exact admitted size");
    Reject([&]{AdmitRuntimeInputSize(16777217,-1,"support manifest",RuntimeInputRole::SupportManifest);},"support manifest cap remains16 MiB");
    Reject([&]{AdmitRuntimeInputSize(2097153,-1,"code snapshot",RuntimeInputRole::CodeSnapshot);},"producer code snapshot cap remains2 MiB");
    Reject([&]{AdmitRuntimeInputSize(100001,-1,"config snapshot",RuntimeInputRole::ConfigurationSnapshot);},"producer config snapshot cap remains100000 bytes");
    Reject([&]{AdmitRuntimeInputSize(1,-1,"unknown role",static_cast<RuntimeInputRole>(255));},"unknown role cannot choose an allocation bound");
    Route badBoundary=BoundaryRoad();badBoundary.boundaryEntry.x+=0.01;Reject([&]{badBoundary.Prepare();},"open boundary entry must be the actual supported route endpoint");
    badBoundary=BoundaryRoad();badBoundary.boundaryAdmitted=false;Reject([&]{badBoundary.Prepare();},"open vehicle route cannot use an unadmitted boundary flag");
    Simulation flow;flow.routes={BoundaryRoad()};flow.Initialise(61,0,2);
    for(size_t i=0;i<2;++i)
    {
        auto& car=flow.agents[i];car.route=0;car.distance=i?199.99:0;car.position=flow.routes[0].At(car.distance);car.heading=0;car.speed=i?5:0;car.desiredSpeed=8;car.travelled=0;car.generationTravelled=0;
    }
    flow.Advance(StepSeconds);
    Check(flow.agents[1].distance==200&&flow.agents[1].generation==0&&flow.BoundaryReplacements()==0,"occupied entry keeps terminal generation at supported exit");
    Check(flow.agents[1].position.x==100&&flow.agents[1].speed==0,"terminal waiting car stays rendered at exit without interior wrap");
    Check(std::abs(flow.agents[1].travelled-0.01)<1e-8,"exit arrival travel records only actual displacement");
    Simulation flowOther=flow;const Point terminal=flow.agents[1].position;
    for(int i=0;i<240;++i)
    {
        const auto before=flow.agents;flow.Advance(StepSeconds);flowOther.Advance(StepSeconds);
        Check(flow.agents.size()==2,"boundary replacement preserves actual population slots");
        Check(!PhysicalOverlap(flow.agents[0],Kind::Vehicle,flow.agents[1],Kind::Vehicle),"boundary replacement and following preserve incoming car clearance");
        for(size_t car=0;car<2;++car)
        {
            if(flow.agents[car].generation==before[car].generation)
                Check(std::abs(flow.agents[car].travelled-before[car].travelled-Length(flow.agents[car].position-before[car].position))<1e-8,"nonreplacement vehicle travel binds physical world displacement");
            else
            {
                Check(flow.agents[car].position.x==-100&&flow.agents[car].distance==0&&flow.agents[car].generationTravelled==0,"new generation starts only at admitted free entry endpoint");
                Check(flow.agents[car].travelled-before[car].travelled<0.001,"boundary lifecycle jump contributes no travel");
            }
        }
    }
    Check(flow.agents[1].generation==1&&flow.agents[1].position.x<0&&flow.BoundaryReplacements()==1,"waiting exit car replaces and resumes once ordinary entry traffic clears");
    Check(flow.boundaryEvents.size()==1&&Length(flow.boundaryEvents[0].exit-terminal)<1e-9&&flow.boundaryEvents[0].entry.x==-100,"boundary event exposes actual exit and entry positions");
    Equal(flow,flowOther,"boundary lifecycle is deterministic for fixed seed and clock");
    Simulation boundaryPaused=flow;boundaryPaused.paused=true;boundaryPaused.Advance(10);Equal(flow,boundaryPaused,"pause retains boundary generations and events");
    flow.Reset();Simulation flowFresh;flowFresh.routes={BoundaryRoad()};flowFresh.Initialise(61,0,2);Equal(flow,flowFresh,"reset restores initial boundary generation state");
    Simulation personBlocks;Route nearEntry=Walk();for(auto& p:nearEntry.points){p.x-=100;p.y=100;}
    personBlocks.routes={BoundaryRoad(),nearEntry};personBlocks.Initialise(73,1,1);
    auto& arriving=personBlocks.agents[0];arriving.route=0;arriving.distance=200;arriving.position={100,100,0};arriving.heading=0;arriving.speed=0;
    auto& blockPerson=personBlocks.agents[1];blockPerson.route=1;blockPerson.distance=0;blockPerson.lateral=0;blockPerson.position={-100,100,0};blockPerson.speed=0;blockPerson.desiredSpeed=0;
    personBlocks.Advance(1);Check(arriving.generation==0&&arriving.position.x==100,"global pedestrian occupancy prevents incoming replacement overlap");
    for(int direction:{1,-1})
    {
        Route crossingEntry;crossingEntry.id="directional-crossing";crossingEntry.width=1.2;
        for(int p=0;p<=20;++p)crossingEntry.points.push_back({static_cast<double>(p),0,0});
        crossingEntry.stops={{0,0,1},{20,0,-1}};
        Simulation inside;inside.routes={crossingEntry};inside.signals={{"scramble",60,30,50}};inside.Initialise(17,1,0);
        auto& walker=inside.agents[0];walker.distance=direction==1?15:5;walker.direction=direction;walker.lateral=0;walker.position=inside.routes[0].At(walker.distance);walker.speed=1;walker.travelled=0;
        inside.Advance(10);
        Check(std::abs(walker.distance-(direction==1?20:0))<1e-9,"inside crossing agent finishes to exit despite red phase");
        Check(walker.direction==-direction,"finished crossing turns at source endpoint for next entry");
        const Point waiting=walker.position;inside.Advance(10);
        Check(Length(walker.position-waiting)<1e-9,"red re-entry holds exactly at endpoint without interior stranding");
        inside.Advance(15);Check(walker.distance>2&&walker.distance<18,"both directed entries proceed after green");
        Check(inside.RedViolations()==0,"both crossing directions obey their actual entry lines");
        Simulation entry;entry.routes={crossingEntry};entry.signals={{"scramble",60,30,50}};entry.Initialise(17,1,0);
        auto& waitingWalker=entry.agents[0];waitingWalker.distance=direction==1?0:20;waitingWalker.direction=direction;waitingWalker.lateral=0;waitingWalker.position=entry.routes[0].At(waitingWalker.distance);waitingWalker.speed=0;
        const Point startEntry=waitingWalker.position;entry.Advance(10);Check(Length(waitingWalker.position-startEntry)<1e-9,"forward and reverse red entry begin outside crossing motion");
    }
    std::cout<<"PASS: "<<checks<<" actual-core assertions\n";
}
