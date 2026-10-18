#include "ShibuyaWorld.h"
#include "NativeFrame.h"
#include "NativeFrameJson.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Dom/JsonObject.h"

namespace
{
TSharedPtr<FJsonValue> Coordinates(const FVector& Position)
{
    return MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(Position.X),MakeShared<FJsonValueNumber>(Position.Y),MakeShared<FJsonValueNumber>(Position.Z)});
}
FVector Centimetres(const Shibuya::Point& Position) { const auto P=Shibuya::SourceToNativeCM(Position);return FVector(P.x,P.y,P.z); }
}
TSharedPtr<FJsonObject> AShibuyaWorld::AgentDiagnostic(size_t Slot) const
{
    auto Result=MakeShared<FJsonObject>();Result->SetObjectField(TEXT("native_frame"),Shibuya::NativeFrameJSON());Result->SetNumberField(TEXT("agent_slot"),Slot);
    if(Slot>=Simulation.agents.size()){Result->SetStringField(TEXT("error"),TEXT("Missing runtime agent slot."));return Result;}
    const auto& Agent=Simulation.agents[Slot];const auto& Route=Simulation.routes[Agent.route];
    Result->SetStringField(TEXT("route"),UTF8_TO_TCHAR(Route.id.c_str()));Result->SetStringField(TEXT("kind"),Route.kind==Shibuya::Kind::Vehicle?TEXT("vehicle"):TEXT("pedestrian"));
    Result->SetNumberField(TEXT("route_index"),Agent.route);Result->SetNumberField(TEXT("distance_m"),Agent.distance);
    Result->SetNumberField(TEXT("route_length_m"),Route.length);Result->SetNumberField(TEXT("distance_to_end_m"),Route.length-Agent.distance);
    Result->SetNumberField(TEXT("lateral_m"),Agent.lateral);Result->SetNumberField(TEXT("direction"),Agent.direction);
    Result->SetNumberField(TEXT("heading_rad"),Agent.heading);Result->SetNumberField(TEXT("speed_m_s"),Agent.speed);
    Result->SetNumberField(TEXT("desired_speed_m_s"),Agent.desiredSpeed);Result->SetNumberField(TEXT("travel_m"),Agent.travelled);
    Result->SetNumberField(TEXT("generation"),Agent.generation);Result->SetNumberField(TEXT("generation_travel_m"),Agent.generationTravelled);
    Result->SetBoolField(TEXT("closed"),Route.closed);Result->SetBoolField(TEXT("boundary_admitted"),Route.boundaryAdmitted);
    Result->SetField(TEXT("source_position_cm"),Coordinates(Centimetres(Agent.position)));
    Result->SetField(TEXT("source_position_enu_m"),Coordinates(FVector(Agent.position.x,Agent.position.y,Agent.position.z)));
    Shibuya::Point Tangent;const auto Centre=Route.At(Agent.distance,0,&Tangent);
    Result->SetField(TEXT("route_centre_cm"),Coordinates(Centimetres(Centre)));
    Result->SetField(TEXT("route_tangent_enu"),Coordinates(FVector(Tangent.x,Tangent.y,Tangent.z)));
    Result->SetNumberField(TEXT("cross_slope"),Route.CrossSlope(Agent.distance));
    const auto Upper=std::upper_bound(Route.distances.begin(),Route.distances.end(),Agent.distance);
    const size_t SegmentEnd=std::min<size_t>(std::max<size_t>(1,Upper-Route.distances.begin()),Route.points.size()-1);
    Result->SetNumberField(TEXT("segment_start"),SegmentEnd-1);Result->SetNumberField(TEXT("segment_end"),SegmentEnd);
    TArray<TSharedPtr<FJsonValue>> Profiles;
    for(size_t Point:{SegmentEnd-1,SegmentEnd})
    {
        auto Profile=MakeShared<FJsonObject>();Profile->SetNumberField(TEXT("point_index"),Point);
        Profile->SetField(TEXT("point_cm"),Coordinates(Centimetres(Route.points[Point])));
        if(Point<Route.profiles.size())
        {
            Profile->SetNumberField(TEXT("right_z_m"),Route.profiles[Point].rightZ);
            Profile->SetNumberField(TEXT("centre_z_m"),Route.profiles[Point].centreZ);
            Profile->SetNumberField(TEXT("left_z_m"),Route.profiles[Point].leftZ);
        }
        Profiles.Add(MakeShared<FJsonValueObject>(Profile));
    }
    Result->SetArrayField(TEXT("source_segment_profiles"),Profiles);return Result;
}
TSharedPtr<FJsonObject> AShibuyaWorld::VehicleDiagnostics() const
{
    auto Result=MakeShared<FJsonObject>();TArray<TSharedPtr<FJsonValue>> Cars;int32 Instance=0;
    for(size_t Slot=0;Slot<Simulation.agents.size();++Slot)
    {
        const auto& Agent=Simulation.agents[Slot];const auto& Route=Simulation.routes[Agent.route];
        if(Route.kind!=Shibuya::Kind::Vehicle)continue;
        if(Cars.Num()==200)break;
        auto Record=AgentDiagnostic(Slot);Record->SetNumberField(TEXT("instance_index"),Instance++);
        // Readonly observations, not the private integrator's past decision.
        // The 0.1m test describes an explicit proposed pose with current heading.
        const auto Ahead=Route.At(std::min(Agent.distance+0.1,Route.length));
        TArray<TSharedPtr<FJsonValue>> Blockers;double LeaderGap=std::numeric_limits<double>::infinity();size_t Leader=0;
        for(size_t Other=0;Other<Simulation.agents.size();++Other)
        {
            if(Other==Slot)continue;const auto& Neighbour=Simulation.agents[Other];
            if(Neighbour.route==Agent.route)
            {
                double Gap=Neighbour.distance-Agent.distance;if(Route.closed&&Gap<0)Gap+=Route.length;
                if(Gap>=0&&Gap<LeaderGap){LeaderGap=Gap;Leader=Other;}
            }
            if(Blockers.Num()<16&&Shibuya::FootprintsOverlap(Shibuya::Kind::Vehicle,Ahead,Agent.heading,Simulation.routes[Neighbour.route].kind,Neighbour.position,Neighbour.heading))
                Blockers.Add(MakeShared<FJsonValueNumber>(Other));
        }
        if(std::isfinite(LeaderGap)){Record->SetNumberField(TEXT("same_route_leader_gap_m"),LeaderGap);Record->SetNumberField(TEXT("same_route_leader_slot"),Leader);}
        Record->SetArrayField(TEXT("ahead_0_1m_current_heading_overlap_slots"),Blockers);
        TArray<TSharedPtr<FJsonValue>> Stops;
        for(const auto& Stop:Route.stops)
        {
            if(Stop.direction!=Agent.direction)continue;double Gap=(Stop.distance-Agent.distance)*Agent.direction;
            if(Route.closed&&Gap<0)Gap+=Route.length;if(Gap<0)continue;
            auto Value=MakeShared<FJsonObject>();Value->SetNumberField(TEXT("gap_m"),Gap);
            Value->SetBoolField(TEXT("green"),Simulation.signals[Stop.signal].Green(Route.kind,Simulation.Time()));
            Value->SetStringField(TEXT("signal"),UTF8_TO_TCHAR(Simulation.signals[Stop.signal].id.c_str()));Stops.Add(MakeShared<FJsonValueObject>(Value));
        }
        Record->SetArrayField(TEXT("upcoming_signal_stops"),Stops);Cars.Add(MakeShared<FJsonValueObject>(Record));
    }
    Result->SetArrayField(TEXT("vehicles"),Cars);Result->SetNumberField(TEXT("actual_vehicle_count"),VehicleCount);
    Result->SetBoolField(TEXT("truncated"),VehicleCount>200);
    Result->SetStringField(TEXT("bound"),TEXT("Readonly first200 current vehicle states, measured route profiles, same-route leaders, signal phase and explicit0.1m ahead/current-heading footprint overlaps. These observations do not assert the integrator's previous blocked reason."));return Result;
}
TSharedPtr<FJsonObject> AShibuyaWorld::SupportContactExample(const FString& Kind,const FString& Contact,
    size_t Slot,int32 Instance,int32 Part,const FVector& Position,const FHitResult* Hit,double Rise,double Drop,bool CheckNormal) const
{
    auto Result=AgentDiagnostic(Slot);Result->SetStringField(TEXT("contact_kind"),Kind);Result->SetStringField(TEXT("contact"),Contact);
    Result->SetNumberField(TEXT("instance_index"),Instance);Result->SetNumberField(TEXT("part_index"),Part);
    Result->SetField(TEXT("contact_position_cm"),Coordinates(Position));Result->SetField(TEXT("ray_start_cm"),Coordinates(Position+FVector(0,0,Rise)));
    Result->SetField(TEXT("ray_end_cm"),Coordinates(Position-FVector(0,0,Drop)));Result->SetBoolField(TEXT("hit"),Hit!=nullptr);
    FString Reason=TEXT("miss");
    if(Hit)
    {
        const double Gap=FMath::Abs(Hit->ImpactPoint.Z-Position.Z);
        Reason=Gap>20?TEXT("gap"):CheckNormal&&Hit->ImpactNormal.Z<0.7?TEXT("normal"):TEXT("pass");
        Result->SetBoolField(TEXT("gap_exceeds_limit"),Gap>20);Result->SetBoolField(TEXT("normal_below_limit"),Hit->ImpactNormal.Z<0.7);
        Result->SetNumberField(TEXT("absolute_gap_cm"),Gap);Result->SetNumberField(TEXT("signed_ground_minus_contact_cm"),Hit->ImpactPoint.Z-Position.Z);
        Result->SetField(TEXT("impact_position_cm"),Coordinates(Hit->ImpactPoint));Result->SetField(TEXT("impact_normal"),Coordinates(Hit->ImpactNormal));
        Result->SetStringField(TEXT("hit_actor"),Hit->GetActor()?Hit->GetActor()->GetPathName():TEXT("missing"));
        Result->SetStringField(TEXT("hit_component"),Hit->GetComponent()?Hit->GetComponent()->GetPathName():TEXT("missing"));
        const auto* Mesh=Cast<UStaticMeshComponent>(Hit->GetComponent());
        Result->SetStringField(TEXT("hit_static_mesh"),Mesh&&Mesh->GetStaticMesh()?Mesh->GetStaticMesh()->GetPathName():TEXT("none"));
        Result->SetNumberField(TEXT("hit_face_index"),Hit->FaceIndex);Result->SetBoolField(TEXT("start_penetrating"),Hit->bStartPenetrating);
    }
    Result->SetBoolField(TEXT("normal_is_acceptance_requirement"),CheckNormal);Result->SetStringField(TEXT("reason"),Reason);return Result;
}
