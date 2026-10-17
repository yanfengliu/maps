#include "ShibuyaWorld.h"
#include "RuntimeFiles.h"
#include "RuntimePath.h"
#include "RuntimeReadLimit.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "CollisionShape.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/InputComponent.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/FloatingPawnMovement.h"
#include "Materials/MaterialInterface.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/PlatformMisc.h"
#include "XmlFile.h"
#include "Windows/WindowsHWrapper.h"
#include <bcrypt.h>

namespace
{
FString HashBytes(const TArray<uint8>& Bytes)
{
    // UE's inherited Windows GetSHA256Signature is an asserting generic stub.
    // Use the installed Windows CNG provider and close it on every result.
    BCRYPT_ALG_HANDLE Algorithm=nullptr;
    const NTSTATUS Open=::BCryptOpenAlgorithmProvider(&Algorithm,BCRYPT_SHA256_ALGORITHM,nullptr,0);
    if(Open<0)throw std::runtime_error("Windows CNG could not open SHA-256 for the runtime source input.");
    uint8 Hash[32],Empty=0;
    const NTSTATUS Hashed=::BCryptHash(Algorithm,nullptr,0,Bytes.IsEmpty()?&Empty:const_cast<uint8*>(Bytes.GetData()),static_cast<ULONG>(Bytes.Num()),Hash,sizeof(Hash));
    const NTSTATUS Closed=::BCryptCloseAlgorithmProvider(Algorithm,0);
    if(Hashed<0 || Closed<0)throw std::runtime_error("Windows CNG could not hash the runtime source input or release its SHA-256 provider.");
    return BytesToHex(Hash,32).ToLower();
}
TArray<uint8> ReadBoundInput(const FString& Relative,const FString& Expected,TMap<FString,FString>& Digests,TMap<FString,int64>& Sizes,TMap<FString,Shibuya::RuntimeInputRole>& Roles,int64 ExpectedSize=-1,Shibuya::RuntimeInputRole Role=Shibuya::RuntimeInputRole::Source)
{
    if(const auto* Prior=Roles.Find(Relative);Prior && *Prior!=Role)
        throw std::runtime_error("Runtime input "+std::string(TCHAR_TO_UTF8(*Relative))+" has conflicting fixed admission roles; restore consistent source records.");
    TArray<uint8> Bytes=Shibuya::ReadBoundedProjectInput(Relative,ExpectedSize,Role);
    const FString Actual=HashBytes(Bytes);
    if((!Expected.IsEmpty() && Actual!=Expected.ToLower()) || (Digests.Contains(Relative) && Digests[Relative]!=Actual))
        throw std::runtime_error("Runtime input "+std::string(TCHAR_TO_UTF8(*Relative))+" differs from its admitted SHA-256; restore the pinned bytes.");
    Digests.Add(Relative,Actual);Sizes.Add(Relative,Bytes.Num());Roles.Add(Relative,Role);return Bytes;
}
TSharedPtr<FJsonValue> ParseJSON(const TArray<uint8>& Bytes)
{
    FString JSON;FFileHelper::BufferToString(JSON,Bytes.GetData(),Bytes.Num());
    TSharedPtr<FJsonValue> Value;
    if(!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(JSON),Value))throw std::runtime_error("Runtime source input is not valid JSON.");
    return Value;
}
FString Text(const TSharedPtr<FJsonObject>& Object,const TCHAR* Name)
{
    FString Result;
    if(!Object.IsValid() || !Object->TryGetStringField(Name,Result) || Result.IsEmpty() || Result.Len()>4096)
        throw std::runtime_error(TCHAR_TO_UTF8(*FString::Printf(TEXT("Runtime source needs text field %s."),Name)));
    return Result;
}
double Number(const TSharedPtr<FJsonObject>& Object,const TCHAR* Name)
{
    double Result;
    if(!Object.IsValid() || !Object->TryGetNumberField(Name,Result) || !FMath::IsFinite(Result))
        throw std::runtime_error(TCHAR_TO_UTF8(*FString::Printf(TEXT("Runtime source needs finite numeric field %s."),Name)));
    return Result;
}
bool Boolean(const TSharedPtr<FJsonObject>& Object,const TCHAR* Name)
{
    bool Result;
    if(!Object.IsValid() || !Object->TryGetBoolField(Name,Result))
        throw std::runtime_error(TCHAR_TO_UTF8(*FString::Printf(TEXT("Runtime source needs boolean field %s."),Name)));
    return Result;
}
const TArray<TSharedPtr<FJsonValue>>& Array(const TSharedPtr<FJsonObject>& Object,const TCHAR* Name)
{
    const TArray<TSharedPtr<FJsonValue>>* Result;
    if(!Object.IsValid() || !Object->TryGetArrayField(Name,Result))
        throw std::runtime_error(TCHAR_TO_UTF8(*FString::Printf(TEXT("Runtime source needs array field %s."),Name)));
    return *Result;
}
TSharedPtr<FJsonObject> ObjectValue(const TSharedPtr<FJsonValue>& Value)
{
    if(!Value.IsValid() || Value->Type!=EJson::Object) throw std::runtime_error("Runtime source contains a non-object record.");
    return Value->AsObject();
}
TSharedPtr<FJsonObject> ObjectField(const TSharedPtr<FJsonObject>& Object,const TCHAR* Name)
{
    const TSharedPtr<FJsonObject>* Result;
    if(!Object.IsValid() || !Object->TryGetObjectField(Name,Result)) throw std::runtime_error("Runtime source lacks a required object record.");
    return *Result;
}
Shibuya::Point ReadPoint(const TSharedPtr<FJsonValue>& Value)
{
    if(!Value.IsValid() || Value->Type!=EJson::Array || Value->AsArray().Num()!=3)
        throw std::runtime_error("Runtime source point needs exactly three local metre coordinates.");
    double Coordinates[3];
    for(int i=0;i<3;++i)
        if(!Value->AsArray()[i]->TryGetNumber(Coordinates[i]) || !FMath::IsFinite(Coordinates[i]))
            throw std::runtime_error("Runtime source point contains a non-finite coordinate.");
    return {Coordinates[0],Coordinates[1],Coordinates[2]};
}
bool Digest(const FString& Value)
{
    if(Value.Len()!=64) return false;
    for(TCHAR C:Value) if(!FChar::IsHexDigit(C)) return false;
    return true;
}
FVector Native(const Shibuya::Point& Point) { return FVector(Point.x*100,Point.y*100,Point.z*100); }
TSharedPtr<FJsonValue> VectorJSON(const FVector& Value)
{
    return MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>{MakeShared<FJsonValueNumber>(Value.X),MakeShared<FJsonValueNumber>(Value.Y),MakeShared<FJsonValueNumber>(Value.Z)});
}
AShibuyaWorld* FindCity(UWorld* World)
{
    for(TActorIterator<AShibuyaWorld> It(World);It;++It) return *It;
    return nullptr;
}
// Admit the same native support and walking slope/height bounds used by
// Explorer movement, then require room for its complete collision capsule.
bool ExplorerStart(AShibuyaWorld* City,const AActor* Ignore,FVector& Position,TSharedPtr<FJsonObject>& Evidence)
{
    Evidence=MakeShared<FJsonObject>();Evidence->SetBoolField(TEXT("admitted"),false);
    auto Refuse=[&](const TCHAR* Reason){Evidence->SetStringField(TEXT("reason"),Reason);return false;};
    if(!City || !City->Ready)return Refuse(TEXT("city_not_ready"));
    Evidence->SetField(TEXT("source_spawn_feet_cm"),VectorJSON(City->SpawnFeet));
    FCollisionQueryParams Query(SCENE_QUERY_STAT(ShibuyaExplorerStart),true,Ignore);
    FHitResult Ground;
    if(!City->GetWorld()->LineTraceSingleByChannel(Ground,City->SpawnFeet+FVector(0,0,120),City->SpawnFeet-FVector(0,0,130),ECC_Visibility,Query))
        return Refuse(TEXT("source_spawn_has_no_native_ground"));
    Evidence->SetStringField(TEXT("support_actor"),GetPathNameSafe(Ground.GetActor()));
    Evidence->SetField(TEXT("support_impact_cm"),VectorJSON(Ground.ImpactPoint));
    Evidence->SetNumberField(TEXT("support_normal_z"),Ground.ImpactNormal.Z);
    Evidence->SetNumberField(TEXT("source_height_residual_cm"),Ground.ImpactPoint.Z-City->SpawnFeet.Z);
    if(Ground.ImpactNormal.Z<0.65 || FMath::Abs(Ground.ImpactPoint.Z-City->SpawnFeet.Z)>45)
        return Refuse(TEXT("source_spawn_ground_outside_walking_bounds"));
    Position=Ground.ImpactPoint+FVector(0,0,90);
    const bool Blocked=City->GetWorld()->OverlapBlockingTestByProfile(Position,FQuat::Identity,TEXT("Pawn"),FCollisionShape::MakeCapsule(28,88),Query);
    Evidence->SetBoolField(TEXT("capsule_clear"),!Blocked);
    Evidence->SetField(TEXT("capsule_position_cm"),VectorJSON(Position));
    if(Blocked)return Refuse(TEXT("source_spawn_capsule_blocked"));
    Evidence->SetBoolField(TEXT("admitted"),true);Evidence->SetStringField(TEXT("reason"),TEXT("native_ground_and_capsule_admitted"));return true;
}
#include "BoundaryAdmission.h"
#include "SupportSource3Admission.h"
}

AShibuyaWorld::AShibuyaWorld()
{
    PrimaryActorTick.bCanEverTick=true;
    SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("RuntimeRoot")));
}
bool AShibuyaWorld::LoadNetwork()
{
    try
    {
        const TArray<uint8> Empty,ABC{'a','b','c'};
        if(HashBytes(Empty)!=TEXT("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") ||
           HashBytes(ABC)!=TEXT("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"))
            throw std::runtime_error("Windows CNG SHA-256 failed the empty and abc known vectors; runtime source admission is disabled.");
        UE_LOG(LogTemp,Display,TEXT("SHIBUYA_NATIVE_SHA256_KNOWN_VECTORS_PASS provider=WindowsCNG"));
        FString Relative(TEXT("data/prepared/surface/movement-network.json"));
        FParse::Value(FCommandLine::Get(),TEXT("ShibuyaNetwork="),Relative);
        if(!Relative.StartsWith(TEXT("data/")) || !Shibuya::SafeRelativePath(TCHAR_TO_UTF8(*Relative)))
            throw std::runtime_error("ShibuyaNetwork must name a project-relative forward-slash data path without parent traversal or a drive.");
        InputDigests.Empty();InputSizes.Empty();InputRoles.Empty();SourceManifestPath.Empty();
        const TArray<uint8> Bytes=ReadBoundInput(Relative,FString(),InputDigests,InputSizes,InputRoles);
        NetworkSHA256=HashBytes(Bytes);
        const auto Data=ObjectValue(ParseJSON(Bytes));
        const FString MovementPath=FPaths::Combine(FPaths::GetPath(Relative),TEXT("movement-manifest.json"));
        const auto MovementBytes=ReadBoundInput(MovementPath,FString(),InputDigests,InputSizes,InputRoles);
        MovementManifestSHA256=HashBytes(MovementBytes);
        const auto Movement=ObjectField(ObjectValue(ParseJSON(MovementBytes)),TEXT("movement"));
        auto AdmitRecord=[&](const TSharedPtr<FJsonObject>& Record,Shibuya::RuntimeInputRole InputRole=Shibuya::RuntimeInputRole::Source)
        {
            const FString InputPath=Text(Record,TEXT("path")),Hash=Text(Record,TEXT("sha256"));
            if(!InputPath.StartsWith(TEXT("data/")) || !Digest(Hash))throw std::runtime_error("Runtime source receipt must name a confined data file with SHA-256.");
            const TCHAR* SizeField=Record->HasField(TEXT("bytes"))?TEXT("bytes"):TEXT("size");
            const auto SizeValue=Record->TryGetField(SizeField);
            const double Size=Number(Record,SizeField);
            if(!SizeValue.IsValid() || SizeValue->Type!=EJson::Number || Size<1 || Size>Shibuya::RuntimeInputLimit(InputRole) || Size!=FMath::FloorToDouble(Size))
                throw std::runtime_error("Runtime source receipt "+std::string(TCHAR_TO_UTF8(*InputPath))+" needs a whole byte count within its fixed role limit before allocation.");
            auto Raw=ReadBoundInput(InputPath,Hash,InputDigests,InputSizes,InputRoles,static_cast<int64>(Size),InputRole);
            return Raw;
        };
        const auto NetworkRecord=ObjectField(Movement,TEXT("network"));
        if(Text(NetworkRecord,TEXT("path"))!=Relative || Text(NetworkRecord,TEXT("sha256"))!=NetworkSHA256 || Number(NetworkRecord,TEXT("bytes"))!=Bytes.Num())
            throw std::runtime_error("Actual runtime network differs from the admitted movement manifest.");
        if(Number(Data,TEXT("schema_version"))!=1 || Text(Data,TEXT("frame"))!=TEXT("local-east-north-up") || Text(Data,TEXT("units"))!=TEXT("metres"))
            throw std::runtime_error("Runtime route input must use schema1 local-east-north-up in metres.");
        const TSharedPtr<FJsonObject> Origin=ObjectField(Data,TEXT("origin"));
        if(FMath::Abs(Number(Origin,TEXT("latitude"))-35.6595)>1e-9 || FMath::Abs(Number(Origin,TEXT("longitude"))-139.7005)>1e-9)
            throw std::runtime_error("Runtime route input origin differs from the Shibuya crossing.");
        SourceManifestSHA256=Text(Data,TEXT("source_manifest_sha256"));
        const auto SourceRecord=ObjectField(Movement,TEXT("source_manifest"));
        if(!Digest(SourceManifestSHA256) || Text(SourceRecord,TEXT("sha256"))!=SourceManifestSHA256)
            throw std::runtime_error("Runtime network source manifest differs from its actual movement receipt.");
        SourceManifestPath=Text(SourceRecord,TEXT("path"));
        const auto Source=ObjectValue(ParseJSON(AdmitRecord(SourceRecord)));
        FSource3Metadata Source3;int32 SupportSchema=0;
        const bool HasSupport=Source->HasField(TEXT("support_surface")),HasDerived=Source->HasField(TEXT("derived_terrain"));
        if(HasSupport!=HasDerived)throw std::runtime_error("Runtime Source2 manifest needs both support_surface and derived_terrain records; regenerate the complete source pair.");
        if(HasSupport)
        {
            // Admit the published closure, not the offline 80,000-parent proof again.
            const auto Support=ObjectValue(ParseJSON(AdmitRecord(ObjectField(Source,TEXT("support_surface")),Shibuya::RuntimeInputRole::SupportManifest)));
            const auto Schema=Support->TryGetField(TEXT("schema_version"));
            if(!Schema.IsValid() || Schema->Type!=EJson::Number || (Schema->AsNumber()!=2&&Schema->AsNumber()!=3))
                throw std::runtime_error("Runtime support_surface needs published schema2 or schema3; rebuild support before importing this source.");
            SupportSchema=static_cast<int32>(Schema->AsNumber());
            const auto Derived=ObjectField(Source,TEXT("derived_terrain"));
            if(!FJsonValue::CompareEqual(FJsonValueObject(Derived),FJsonValueObject(ObjectField(Support,TEXT("derived_terrain")))))
                throw std::runtime_error("Runtime Source2 derived_terrain differs from the support manifest record; restore the admitted source pair.");
            AdmitRecord(Derived,Shibuya::RuntimeInputRole::DerivedTerrain);
            if(SupportSchema==2)AdmitRecord(ObjectField(ObjectField(Support,TEXT("topology_provenance")),TEXT("record")));
            AdmitRecord(ObjectField(Support,TEXT("native_ray_samples")));
            const auto Preservation=ObjectValue(ParseJSON(AdmitRecord(ObjectField(Support,TEXT("source_preservation")))));
            const auto& Before=Array(Preservation,TEXT("inputs_before"));const auto& After=Array(Preservation,TEXT("inputs_after"));
            if(!Boolean(Preservation,TEXT("unchanged")) || Before.IsEmpty() ||
               !FJsonValue::CompareEqual(FJsonValueArray(Before),FJsonValueArray(After)))
                throw std::runtime_error("Runtime Source2 source_preservation needs identical nonempty before/after inventories and unchanged:true.");
            const auto Algorithm=ObjectField(Support,TEXT("algorithm")),Configurations=ObjectField(Support,TEXT("configuration_inputs"));
            struct SnapshotRole { const TCHAR* Name;const TCHAR* Execution;const TCHAR* Field;bool Configuration; };
            const SnapshotRole SnapshotRoles[]={
                {TEXT("geometry"),TEXT("tools/data/support_surface.py"),nullptr,false},
                {TEXT("integration"),TEXT("tools/data/surface_network.py"),TEXT("integration"),false},
                {TEXT("topology"),TEXT("tools/data/support_topology.py"),TEXT("topology"),false},
                {TEXT("build_city"),TEXT("tools/data/build_city.py"),TEXT("build_city"),false},
                {TEXT("surface_configuration"),TEXT("sources/surface_network.json"),TEXT("surface_network"),true},
                {TEXT("city_configuration"),TEXT("sources/shibuya.json"),TEXT("city"),true}};
            const auto& Bindings=Array(Preservation,TEXT("data_bindings"));
            if(Bindings.Num()!=6)throw std::runtime_error("Runtime Source2 preservation needs the six published code/config snapshot bindings.");
            TMap<FString,TSharedPtr<FJsonObject>> HistoricalExecution;TSet<FString> SnapshotPaths;
            auto SameRecord=[&](const TSharedPtr<FJsonObject>& A,const TSharedPtr<FJsonObject>& B)
            {return Text(A,TEXT("path"))==Text(B,TEXT("path")) && Text(A,TEXT("sha256"))==Text(B,TEXT("sha256")) && Number(A,TEXT("bytes"))==Number(B,TEXT("bytes"));};
            for(int32 i=0;i<6;++i)
            {
                const auto& InputRole=SnapshotRoles[i];
                const auto Record=InputRole.Configuration?ObjectField(Configurations,InputRole.Field):(InputRole.Field?ObjectField(Algorithm,InputRole.Field):Algorithm);
                const FString SnapshotPath=Text(Record,TEXT("path"));
                if(!SnapshotPath.StartsWith(TEXT("data/source/provenance/")) || SnapshotPaths.Contains(SnapshotPath))
                    throw std::runtime_error("Runtime Source2 snapshots need six unique data/source/provenance paths.");
                SnapshotPaths.Add(SnapshotPath);
                AdmitRecord(Record,InputRole.Configuration?Shibuya::RuntimeInputRole::ConfigurationSnapshot:Shibuya::RuntimeInputRole::CodeSnapshot);
                const auto Binding=ObjectValue(Bindings[i]);
                if(Text(Binding,TEXT("role"))!=InputRole.Name || Text(Binding,TEXT("execution_path"))!=InputRole.Execution || !SameRecord(ObjectField(Binding,TEXT("snapshot")),Record))
                    throw std::runtime_error("Runtime Source2 snapshot binding differs from its published role, execution identity or exact snapshot record.");
                HistoricalExecution.Add(InputRole.Execution,Record);
            }
            if(SupportSchema==3)Source3=AdmitSource3Closure(Support,Source,Movement,Preservation,HistoricalExecution,AdmitRecord);
            TSet<FString> Seen;
            for(const auto& Value:Before)
            {
                const auto Record=ObjectValue(Value);const FString Path=Text(Record,TEXT("path"));
                if(Seen.Contains(Path))throw std::runtime_error("Runtime Source2 preservation repeats an input path; restore its complete unique inventory.");
                Seen.Add(Path);
                if(Path.StartsWith(TEXT("data/")))
                {
                    if(SupportSchema==2)AdmitRecord(Record);
                    // Source3 producer-only identities were validated as ledger metadata;
                    // only the explicit current consumed closure is allocated/read.
                }
                else
                {
                    // These name historical producer inputs. Never execute or
                    // require current Game project scripts to equal snapshots.
                    const auto* Snapshot=HistoricalExecution.Find(Path);
                    if(!Snapshot || Text(Record,TEXT("sha256"))!=Text(*Snapshot,TEXT("sha256")) || Number(Record,TEXT("bytes"))!=Number(*Snapshot,TEXT("bytes")))
                        throw std::runtime_error("Runtime Source2 preserved producer input lacks its exact data-only code/config snapshot counterpart.");
                }
            }
            for(const auto& Pair:HistoricalExecution)if(!Seen.Contains(Pair.Key))
                throw std::runtime_error("Runtime Source2 preservation omits a published producer code/config input identity.");
        }
        const auto Base=ObjectValue(ParseJSON(ReadBoundInput(TEXT("data/prepared/manifest.json"),Text(Source,TEXT("base")),InputDigests,InputSizes,InputRoles)));
        const auto OSM=ObjectField(Movement,TEXT("source_osm"));
        if(Text(OSM,TEXT("sha256"))!=Text(Source,TEXT("osm")))throw std::runtime_error("Runtime OSM source receipt differs from the source manifest.");
        const auto OSMBytes=AdmitRecord(OSM);FXmlFile SourceOSM;
        for(const auto& Value:Array(Data,TEXT("routes")))
        {
            const auto Route=ObjectValue(Value);
            if(Text(Route,TEXT("kind"))==TEXT("vehicle")&&!Boolean(Route,TEXT("closed")))
            {
                FString XML;FFileHelper::BufferToString(XML,OSMBytes.GetData(),OSMBytes.Num());
                if(!SourceOSM.LoadFile(XML,EConstructMethod::ConstructFromBuffer))throw std::runtime_error("Actual pinned OSM input cannot be parsed for boundary continuation admission.");
                break;
            }
        }
        for(const auto& Road:Array(Source,TEXT("roads")))AdmitRecord(ObjectValue(Road));
        for(const auto& Pair:ObjectField(Source,TEXT("dem"))->Values)AdmitRecord(ObjectValue(Pair.Value));
        TMap<FString,TSharedPtr<FJsonObject>> SupportRecords;
        for(const auto& SupportValue:Array(Movement,TEXT("support_samples")))
        {const auto Record=ObjectValue(SupportValue);const FString Id=Text(Record,TEXT("route_id"));if(SupportRecords.Contains(Id))throw std::runtime_error("Movement manifest repeats a route support record.");SupportRecords.Add(Id,Record);}
        TMap<FString,TSharedPtr<FJsonObject>> BoundaryRecords;
        if(Movement->HasField(TEXT("boundary_support_samples")))for(const auto& Value:Array(Movement,TEXT("boundary_support_samples")))
        {
            const auto Record=ObjectValue(Value);const FString Key=Text(Record,TEXT("route_id"))+TEXT(":")+Text(Record,TEXT("endpoint"));
            if(BoundaryRecords.Contains(Key))throw std::runtime_error("Movement manifest repeats a boundary endpoint support receipt.");
            BoundaryRecords.Add(Key,Record);
        }
        const double Seed=Number(Data,TEXT("seed"));
        if(Seed<1 || Seed>4294967295.0 || Seed!=FMath::FloorToDouble(Seed)) throw std::runtime_error("Runtime seed must be a non-zero uint32.");
        Simulation.routes.clear();Simulation.signals.clear();
        TMap<FString,size_t> SignalIds;
        for(const TSharedPtr<FJsonValue>& Value:Array(Data,TEXT("signals")))
        {
            const TSharedPtr<FJsonObject> Signal=ObjectValue(Value);
            const FString Id=Text(Signal,TEXT("id"));
            if(SignalIds.Contains(Id)) throw std::runtime_error("Runtime source has a duplicate signal identifier.");
            SignalIds.Add(Id,Simulation.signals.size());
            Simulation.signals.push_back({TCHAR_TO_UTF8(*Id),Number(Signal,TEXT("period_s")),Number(Signal,TEXT("pedestrian_green_start_s")),Number(Signal,TEXT("pedestrian_green_end_s"))});
        }
        TSet<FString> RouteIds;
        SupportSampleCount=0;
        for(const TSharedPtr<FJsonValue>& Value:Array(Data,TEXT("routes")))
        {
            const TSharedPtr<FJsonObject> Record=ObjectValue(Value);
            Shibuya::Route Route;
            const FString Id=Text(Record,TEXT("id"));
            if(!Shibuya::SafeIdentifier(TCHAR_TO_UTF8(*Id)))throw std::runtime_error("Runtime route id needs a bounded safe alphanumeric identifier.");
            if(RouteIds.Contains(Id)) throw std::runtime_error("Runtime source has a duplicate route identifier.");
            RouteIds.Add(Id);Route.id=TCHAR_TO_UTF8(*Id);
            const FString Kind=Text(Record,TEXT("kind"));
            if(Kind!=TEXT("pedestrian") && Kind!=TEXT("vehicle")) throw std::runtime_error("Runtime source route kind must be pedestrian or vehicle.");
            Route.kind=Kind==TEXT("pedestrian")?Shibuya::Kind::Pedestrian:Shibuya::Kind::Vehicle;
            Route.closed=Boolean(Record,TEXT("closed"));Route.speed=Number(Record,TEXT("speed_m_s"));Route.width=Number(Record,TEXT("width_m"));
            const TSharedPtr<FJsonObject> Support=ObjectField(Record,TEXT("support"));
            const double Samples=Number(Support,TEXT("sample_count"));
            if(SupportSchema==3&&Text(Support,TEXT("support_surface_sha256"))!=Text(ObjectField(Source,TEXT("support_surface")),TEXT("sha256")))
                throw std::runtime_error("Runtime Source3 route profile belongs to a different published support generation.");
            if(!Boolean(Support,TEXT("verified")) || Samples<2 || Samples>1000000 || Samples!=FMath::FloorToDouble(Samples) || !Digest(Text(Support,TEXT("samples_sha256"))))
                throw std::runtime_error("Runtime route has no verified finite source-support sampling receipt.");
            Text(Support,TEXT("source"));SupportSampleCount+=static_cast<int32>(Samples);
            const auto& Points=Array(Record,TEXT("points"));
            if(Points.Num()<2 || Points.Num()>100000 || Samples<Points.Num()) throw std::runtime_error("Runtime route points exceed the checked support sample count.");
            for(const auto& Point:Points) Route.points.push_back(ReadPoint(Point));
            if(Route.closed&&Shibuya::Length(Route.points.back()-Route.points.front())>1e-6)
                throw std::runtime_error("Closed route "+Route.id+" has noncoincident endpoints beyond0.000001m; supply a supported coincident closure.");
            const auto* SupportRecord=SupportRecords.Find(Id);
            if(!SupportRecord || Text(*SupportRecord,TEXT("sha256"))!=Text(Support,TEXT("samples_sha256")))throw std::runtime_error("Runtime route lacks its actual pinned support file.");
            const auto SupportJSON=ParseJSON(AdmitRecord(*SupportRecord));
            if(SupportJSON->Type!=EJson::Array || SupportJSON->AsArray().Num()!=Points.Num() || Samples!=Points.Num())throw std::runtime_error("Actual support profile count differs from the admitted route points.");
            for(int32 i=0;i<SupportJSON->AsArray().Num();++i)
            {
                const auto Sample=ObjectValue(SupportJSON->AsArray()[i]);const auto Centre=ReadPoint(Sample->TryGetField(TEXT("point")));
                if(Shibuya::Length(Centre-Route.points[i])>1e-6)throw std::runtime_error("Measured support centre differs from the actual route point.");
                const auto& Cross=Array(Sample,TEXT("cross_section"));
                if(Cross.Num()!=3)throw std::runtime_error("Measured support needs right, centre and left cross-section points.");
                Shibuya::SurfaceProfile Profile;
                Shibuya::Point Tangent=Route.points[i==0?1:i]-Route.points[i==0?0:i-1];const double Flat=Shibuya::CheckedHorizontalSegment(Tangent,Route.id,i==0?1:i,Route.kind);
                for(int32 c=0;c<3;++c)
                {
                    const auto Edge=ObjectValue(Cross[c]);const double Offset=Number(Edge,TEXT("offset_m"));const auto Point=ReadPoint(Edge->TryGetField(TEXT("point")));
                    const double Expected=(c-1)*Route.width/2;
                    if(std::abs(Offset-Expected)>1e-6 || std::hypot(Point.x-Centre.x+Tangent.y/Flat*Offset,Point.y-Centre.y-Tangent.x/Flat*Offset)>1e-4)
                        throw std::runtime_error("Support cross-section orientation or declared corridor width differs from the measured route segment.");
                    const FString Provider=Text(Edge,TEXT("source"));
                    if(SupportSchema==3)AdmitSource3Profile(Edge,Source3,Route,Text(Source,TEXT("osm")));
                    else if(Provider!=TEXT("PLATEAU-road") && Provider!=TEXT("GSI-DEM5A"))throw std::runtime_error("Support profile has an unknown admitted surface provider.");
                    if(c==0)Profile.rightZ=Point.z;else if(c==1)Profile.centreZ=Point.z;else Profile.leftZ=Point.z;
                }
                Route.profiles.push_back(Profile);
            }
            if(Record->HasField(TEXT("stops"))) for(const auto& StopValue:Array(Record,TEXT("stops")))
            {
                const auto Stop=ObjectValue(StopValue);const FString SignalId=Text(Stop,TEXT("signal_id"));
                const size_t* Index=SignalIds.Find(SignalId);
                if(!Index) throw std::runtime_error("Runtime route stop names a missing signal.");
                const double Direction=Stop->HasField(TEXT("direction"))?Number(Stop,TEXT("direction")):1;
                if(Direction!=1&&Direction!=-1)throw std::runtime_error("Runtime signal stop direction must be exactly+1 or-1.");
                const double Distance=Number(Stop,TEXT("distance_m"));
                if(Route.kind==Shibuya::Kind::Pedestrian)
                {
                    double Length=0;for(size_t p=1;p<Route.points.size();++p)Length+=Shibuya::Length(Route.points[p]-Route.points[p-1]);
                    if((Direction==1&&std::abs(Distance)>1e-6)||(Direction==-1&&std::abs(Distance-Length)>1e-6))
                        throw std::runtime_error("Pedestrian crossing entry stop must match its directed source endpoint.");
                }
                Route.stops.push_back({Distance,*Index,static_cast<int>(Direction)});
            }
            if(Record->HasField(TEXT("boundary_flow")))AdmitBoundaryRoute(Route,ObjectField(Record,TEXT("boundary_flow")),SourceManifestSHA256,Base,SourceOSM,BoundaryRecords,AdmitRecord);
            if(Route.kind==Shibuya::Kind::Vehicle&&!Route.closed&&!Route.boundaryAdmitted)throw std::runtime_error("Open vehicle route "+Route.id+" lacks admitted original-way boundary flow support.");
            Simulation.routes.push_back(std::move(Route));
        }
        const auto Population=ObjectField(Data,TEXT("default_population"));
        const double Pedestrians=Number(Population,TEXT("pedestrian_count")),Vehicles=Number(Population,TEXT("vehicle_count"));
        if(Pedestrians!=FMath::FloorToDouble(Pedestrians) || Vehicles!=FMath::FloorToDouble(Vehicles) || Pedestrians<0 || Vehicles<0 || Pedestrians>10000 || Vehicles>1000)
            throw std::runtime_error("Runtime population counts must be whole numbers within10000 pedestrians and1000 vehicles.");
        PedestrianCount=static_cast<int32>(Pedestrians);VehicleCount=static_cast<int32>(Vehicles);
        FParse::Value(FCommandLine::Get(),TEXT("ShibuyaPedestrians="),PedestrianCount);FParse::Value(FCommandLine::Get(),TEXT("ShibuyaVehicles="),VehicleCount);
        if(PedestrianCount<0 || VehicleCount<0) throw std::runtime_error("Runtime command-line population counts cannot be negative.");
        SpawnFeet=Native(ReadPoint(Data->TryGetField(TEXT("default_spawn"))));
        if(FMath::Abs(SpawnFeet.X)>60000 || FMath::Abs(SpawnFeet.Y)>60000 || FMath::Abs(SpawnFeet.Z)>20000)
            throw std::runtime_error("Default spawn is outside the bounded Shibuya local frame.");
        SpawnYaw=static_cast<float>(Number(Data,TEXT("spawn_yaw_degrees")));
        Attribution=TEXT("Processed PLATEAU MLIT 2025; GSI elevation/aerial; OpenStreetMap contributors.\nCC BY4.0 / GSI Terms / ODbL.  plateau.gov.jp | maps.gsi.go.jp | openstreetmap.org/copyright");
        Simulation.Initialise(static_cast<uint32_t>(Seed),PedestrianCount,VehicleCount);
        CreateGeometry();UpdateGeometry();Ready=true;Error.Empty();
        return true;
    }
    catch(const std::exception& Failure)
    {
        Error=UTF8_TO_TCHAR(Failure.what());Ready=false;
        UE_LOG(LogTemp,Error,TEXT("Shibuya runtime cannot start: %s"),*Error);
        return false;
    }
}
bool AShibuyaWorld::InputsUnchanged() const
{
    try
    {
        if(InputDigests.Num()!=InputSizes.Num() || InputDigests.Num()!=InputRoles.Num())return false;
        for(const auto& Pair:InputDigests)
        {
            const int64* Size=InputSizes.Find(Pair.Key);const auto* InputRole=InputRoles.Find(Pair.Key);if(!Size || !InputRole)return false;
            const auto Bytes=Shibuya::ReadBoundedProjectInput(Pair.Key,*Size,*InputRole);
            if(HashBytes(Bytes)!=Pair.Value)return false;
        }
        return !InputDigests.IsEmpty();
    }
    catch(const std::exception&) { return false; }
}
void AShibuyaWorld::ResetPopulation()
{
    if(!Ready) return;
    Simulation.Reset();NativeBoundaryEvents.Empty();NativeBoundaryEventCount=0;UpdateGeometry();
}
void AShibuyaWorld::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if(!Ready) return;
    const double Start=FPlatformTime::Seconds();
    std::vector<uint64_t> Before;for(const auto& Agent:Simulation.agents)Before.push_back(Agent.generation);
    Simulation.Advance(DeltaSeconds);
    TArray<TSharedPtr<FJsonObject>> Replacements;int32 CarIndex=0;
    for(size_t i=0;i<Simulation.agents.size();++i)
    {
        const auto& Agent=Simulation.agents[i];if(Simulation.routes[Agent.route].kind!=Shibuya::Kind::Vehicle)continue;
        if(Agent.generation!=Before[i])
        {
            auto Event=MakeShared<FJsonObject>();FTransform Body;
            const bool Read=VehicleParts.Num()>0&&VehicleParts[0]->GetInstanceTransform(CarIndex,Body,true);
            Event->SetBoolField(TEXT("before_transform_read"),Read);Event->SetNumberField(TEXT("instance_index"),CarIndex);Event->SetNumberField(TEXT("before_generation"),Before[i]);Event->SetNumberField(TEXT("after_generation"),Agent.generation);
            Event->SetField(TEXT("before_foot_origin_cm"),VectorJSON(Read?Body.GetTranslation()-Body.GetRotation().RotateVector(FVector(0,0,68)):FVector::ZeroVector));Event->SetField(TEXT("before_body_position_cm"),VectorJSON(Read?Body.GetTranslation():FVector::ZeroVector));Event->SetNumberField(TEXT("fixed_step"),Simulation.Steps());
            Event->SetField(TEXT("source_exit_position_cm"),VectorJSON(Native(Simulation.routes[Agent.route].boundaryExit)));Event->SetField(TEXT("source_entry_position_cm"),VectorJSON(Native(Simulation.routes[Agent.route].boundaryEntry)));
            Replacements.Add(Event);
        }
        ++CarIndex;
    }
    UpdateGeometry();
    for(const auto& Event:Replacements)
    {
        FTransform Body;const int32 Index=static_cast<int32>(Event->GetNumberField(TEXT("instance_index")));
        const bool Read=VehicleParts.Num()>0&&VehicleParts[0]->GetInstanceTransform(Index,Body,true);
        Event->SetBoolField(TEXT("after_transform_read"),Read);Event->SetField(TEXT("after_foot_origin_cm"),VectorJSON(Read?Body.GetTranslation()-Body.GetRotation().RotateVector(FVector(0,0,68)):FVector::ZeroVector));Event->SetField(TEXT("after_body_position_cm"),VectorJSON(Read?Body.GetTranslation():FVector::ZeroVector));
        Event->SetNumberField(TEXT("actual_body_instance_count"),VehicleParts.Num()>0?VehicleParts[0]->GetInstanceCount():0);
        NativeBoundaryEvents.Add(MakeShared<FJsonValueObject>(Event));++NativeBoundaryEventCount;if(NativeBoundaryEvents.Num()>1024)NativeBoundaryEvents.RemoveAt(0);
    }
    TickMilliseconds=(FPlatformTime::Seconds()-Start)*1000;
}
TSharedPtr<FJsonObject> AShibuyaWorld::Snapshot() const
{
    auto Result=MakeShared<FJsonObject>();
    Result->SetBoolField(TEXT("ready"),Ready);Result->SetStringField(TEXT("error"),Error);
    Result->SetStringField(TEXT("network_sha256"),NetworkSHA256);Result->SetStringField(TEXT("source_manifest_sha256"),SourceManifestSHA256);
    Result->SetStringField(TEXT("movement_manifest_sha256"),MovementManifestSHA256);
    Result->SetStringField(TEXT("source_manifest_path"),SourceManifestPath);
    auto Bindings=MakeShared<FJsonObject>();for(const auto& Pair:InputDigests)Bindings->SetStringField(Pair.Key,Pair.Value);Result->SetObjectField(TEXT("actual_input_sha256"),Bindings);
    auto Roles=MakeShared<FJsonObject>();for(const auto& Pair:InputRoles)Roles->SetStringField(Pair.Key,UTF8_TO_TCHAR(Shibuya::RuntimeInputRoleName(Pair.Value)));Result->SetObjectField(TEXT("actual_input_roles"),Roles);
    Result->SetNumberField(TEXT("pedestrian_count"),PedestrianCount);Result->SetNumberField(TEXT("vehicle_count"),VehicleCount);
    Result->SetNumberField(TEXT("route_count"),Simulation.routes.size());Result->SetNumberField(TEXT("fixed_steps"),Simulation.Steps());
    Result->SetNumberField(TEXT("simulation_time_s"),Simulation.Time());Result->SetBoolField(TEXT("paused"),Simulation.paused);
    Result->SetNumberField(TEXT("red_signal_violations"),Simulation.RedViolations());Result->SetNumberField(TEXT("support_sample_count"),SupportSampleCount);
    Result->SetNumberField(TEXT("tick_ms"),TickMilliseconds);
    Result->SetNumberField(TEXT("boundary_replacements"),Simulation.BoundaryReplacements());
    TArray<TSharedPtr<FJsonValue>> Events,Generations;
    for(const auto& Agent:Simulation.agents)if(Simulation.routes[Agent.route].kind==Shibuya::Kind::Vehicle)Generations.Add(MakeShared<FJsonValueNumber>(Agent.generation));
    for(const auto& Event:Simulation.boundaryEvents)
    {
        auto Value=MakeShared<FJsonObject>();Value->SetNumberField(TEXT("fixed_step"),Event.step);Value->SetNumberField(TEXT("agent_slot"),Event.agent);Value->SetNumberField(TEXT("generation"),Event.generation);
        Value->SetStringField(TEXT("route"),UTF8_TO_TCHAR(Simulation.routes[Event.route].id.c_str()));Value->SetField(TEXT("exit_position_cm"),VectorJSON(Native(Event.exit)));Value->SetField(TEXT("entry_position_cm"),VectorJSON(Native(Event.entry)));
        Events.Add(MakeShared<FJsonValueObject>(Value));
    }
    Result->SetArrayField(TEXT("vehicle_generations"),Generations);Result->SetArrayField(TEXT("boundary_events"),Events);
    Result->SetArrayField(TEXT("native_boundary_events"),NativeBoundaryEvents);Result->SetNumberField(TEXT("native_boundary_event_count"),NativeBoundaryEventCount);
    Result->SetStringField(TEXT("boundary_event_bound"),TEXT("Last1024 explicit source exit/entry generation events; total replacements is cumulative; lifecycle position changes contribute zero travel."));
    double PedestrianTravel=0,VehicleTravel=0;
    int32 MovingPedestrians=0,MovingVehicles=0;
    TArray<TSharedPtr<FJsonValue>> Sample;
    for(size_t i=0;i<Simulation.agents.size();++i)
    {
        const auto& Agent=Simulation.agents[i];const bool Pedestrian=Simulation.routes[Agent.route].kind==Shibuya::Kind::Pedestrian;
        if(Pedestrian){PedestrianTravel+=Agent.travelled;if(Agent.travelled>0.1)++MovingPedestrians;}
        else {VehicleTravel+=Agent.travelled;if(Agent.travelled>0.1)++MovingVehicles;}
        if(i<4 || (Pedestrian && Sample.Num()<8))
        {
            auto Record=MakeShared<FJsonObject>();Record->SetNumberField(TEXT("id"),i);Record->SetStringField(TEXT("route"),UTF8_TO_TCHAR(Simulation.routes[Agent.route].id.c_str()));
            Record->SetStringField(TEXT("kind"),Pedestrian?TEXT("pedestrian"):TEXT("vehicle"));Record->SetField(TEXT("position_cm"),VectorJSON(Native(Agent.position)));
            Record->SetNumberField(TEXT("generation"),Agent.generation);Record->SetNumberField(TEXT("generation_travel_m"),Agent.generationTravelled);
            Record->SetNumberField(TEXT("travel_m"),Agent.travelled);Record->SetNumberField(TEXT("heading_rad"),Agent.heading);Record->SetNumberField(TEXT("speed_m_s"),Agent.speed);
            Record->SetNumberField(TEXT("gait_phase_rad"),Agent.travelled*4.0);Record->SetNumberField(TEXT("wheel_rotation_rad"),Agent.travelled/0.32);
            Sample.Add(MakeShared<FJsonValueObject>(Record));
        }
    }
    Result->SetArrayField(TEXT("agent_sample"),Sample);Result->SetNumberField(TEXT("pedestrian_travel_m"),PedestrianTravel);Result->SetNumberField(TEXT("vehicle_travel_m"),VehicleTravel);
    Result->SetNumberField(TEXT("moving_pedestrians"),MovingPedestrians);Result->SetNumberField(TEXT("moving_vehicles"),MovingVehicles);
    Result->SetObjectField(TEXT("vehicle_diagnostics"),VehicleDiagnostics());
    return Result;
}

AShibuyaExplorer::AShibuyaExplorer()
{
    PrimaryActorTick.bCanEverTick=true;
    Collision=CreateDefaultSubobject<UCapsuleComponent>(TEXT("ExplorerCapsule"));Collision->InitCapsuleSize(28,88);
    Collision->SetCollisionProfileName(TEXT("Pawn"));SetRootComponent(Collision);
    // Match the actual city triangles used by walking and landing traces.
    Collision->bTraceComplexOnMove=true;
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("ExplorerCamera"));Camera->SetupAttachment(Collision);
    Camera->SetRelativeLocation(FVector(0,0,77));Camera->bUsePawnControlRotation=true;Camera->FieldOfView=80;
    Movement=CreateDefaultSubobject<UFloatingPawnMovement>(TEXT("FlightMovement"));Movement->UpdatedComponent=Collision;
    Movement->MaxSpeed=1400;Movement->Acceleration=4000;Movement->Deceleration=6000;
    bUseControllerRotationYaw=false;
}
UPawnMovementComponent* AShibuyaExplorer::GetMovementComponent() const { return Movement; }
AShibuyaWorld* AShibuyaExplorer::City() const { return FindCity(GetWorld()); }
void AShibuyaExplorer::BeginPlay() { Super::BeginPlay();ResetView(); }
void AShibuyaExplorer::ResetView()
{
    AShibuyaWorld* World=City();FVector Position;
    if(!ExplorerStart(World,this,Position,ResetAdmission))
    {MovementNotice=TEXT("Reset needs clear native ground at the source start; restore the imported scene.");return;}
    Movement->StopMovementImmediately();Forward=Right=Vertical=0;Fast=false;
    SetActorLocation(Position,false);MovementNotice.Empty();
    ResetAdmission->SetNumberField(TEXT("source_spawn_yaw_degrees"),World->SpawnYaw);
    ResetAdmission->SetBoolField(TEXT("controller_rotation_applied"),Controller!=nullptr);
    if(Controller)
    {
        Controller->SetControlRotation(FRotator(0,World->SpawnYaw,0));
        ResetAdmission->SetNumberField(TEXT("actual_control_yaw_degrees"),Controller->GetControlRotation().Yaw);
    }
    else ResetAdmission->SetStringField(TEXT("reason"),TEXT("native_start_admitted_waiting_for_possession"));
}
void AShibuyaExplorer::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("MoveForward"),this,&AShibuyaExplorer::MoveForward);
    Input->BindAxis(TEXT("MoveRight"),this,&AShibuyaExplorer::MoveRight);
    Input->BindAxis(TEXT("MoveVertical"),this,&AShibuyaExplorer::MoveVertical);
    Input->BindAxis(TEXT("LookHorizontal"),this,&AShibuyaExplorer::LookHorizontal);
    Input->BindAxis(TEXT("LookVertical"),this,&AShibuyaExplorer::LookVertical);
    Input->BindAction(TEXT("Fast"),IE_Pressed,this,&AShibuyaExplorer::FastPressed);
    Input->BindAction(TEXT("Fast"),IE_Released,this,&AShibuyaExplorer::FastReleased);
    Input->BindAction(TEXT("Mode"),IE_Pressed,this,&AShibuyaExplorer::ToggleMode);
    Input->BindAction(TEXT("PauseSimulation"),IE_Pressed,this,&AShibuyaExplorer::Pause);
    Input->BindAction(TEXT("ResetCity"),IE_Pressed,this,&AShibuyaExplorer::Reset);
}
void AShibuyaExplorer::MoveForward(float Value) { Forward=Value;if(!FMath::IsNearlyZero(Value))++ForwardEvents; }
void AShibuyaExplorer::MoveRight(float Value) { Right=Value; }
void AShibuyaExplorer::MoveVertical(float Value) { Vertical=Value; }
void AShibuyaExplorer::LookHorizontal(float Value) { if(!FMath::IsNearlyZero(Value)){++LookEvents;AddControllerYawInput(Value*1.5f);} }
void AShibuyaExplorer::LookVertical(float Value) { if(!FMath::IsNearlyZero(Value)){++LookEvents;AddControllerPitchInput(-Value*1.5f);} }
bool AShibuyaExplorer::ReachableGround(FHitResult& Ground) const
{
    const FVector Current=GetActorLocation();
    FCollisionQueryParams Query(SCENE_QUERY_STAT(ShibuyaLanding),true,this);
    return GetWorld()->LineTraceSingleByChannel(Ground,Current+FVector(0,0,30),Current-FVector(0,0,220),ECC_Visibility,Query)
        && Ground.ImpactNormal.Z>=0.65 && FMath::Abs((Ground.ImpactPoint.Z+90)-Current.Z)<=45;
}
void AShibuyaExplorer::ToggleMode()
{
    ++ModeEvents;
    if(Flying)
    {
        FHitResult Ground;
        if(!ReachableGround(Ground))
        {
            MovementNotice=TEXT("Walking needs ground beneath you. Stay in flight, descend with Q, then press Tab.");
            return;
        }
    }
    Flying=!Flying;MovementNotice.Empty();Movement->StopMovementImmediately();
}
void AShibuyaExplorer::Pause() { if(AShibuyaWorld* World=City())World->TogglePaused();++PauseEvents; }
void AShibuyaExplorer::Reset() { if(AShibuyaWorld* World=City())World->ResetPopulation();ResetView();++ResetEvents; }
void AShibuyaExplorer::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if(!Controller || !City() || !City()->Ready) return;
    const FRotator View=Controller->GetControlRotation();
    if(Flying)
    {
        Movement->MaxSpeed=Fast?5000:1400;
        AddMovementInput(View.Vector(),Forward);AddMovementInput(FRotationMatrix(View).GetUnitAxis(EAxis::Y),Right);AddMovementInput(FVector::UpVector,Vertical);
        return;
    }
    // Walking uses the actual imported city's query collision. No invisible
    // proxy floor or baked route height can cover a hole in native geometry.
    Movement->StopMovementImmediately();
    const FRotator Horizontal(0,View.Yaw,0);
    FVector Direction=Horizontal.Vector()*Forward+FRotationMatrix(Horizontal).GetUnitAxis(EAxis::Y)*Right;
    Direction=Direction.GetClampedToMaxSize(1);
    const FVector Current=GetActorLocation();
    const FVector Proposed=Current+Direction*(Fast?450:220)*DeltaSeconds;
    FCollisionQueryParams Query(SCENE_QUERY_STAT(ShibuyaWalking),true,this);
    FHitResult Ground;
    const bool Supported=GetWorld()->LineTraceSingleByChannel(Ground,Proposed+FVector(0,0,30),Proposed-FVector(0,0,220),ECC_Visibility,Query);
    if(!Supported || Ground.ImpactNormal.Z<0.65 || FMath::Abs((Ground.ImpactPoint.Z+90)-Current.Z)>45)
    { if(!Direction.IsNearlyZero())++BlockedWalkSteps;return; }
    const FVector Target(Proposed.X,Proposed.Y,Ground.ImpactPoint.Z+90);
    FHitResult Obstacle;SetActorLocation(Target,true,&Obstacle);
    if(Obstacle.bBlockingHit && !Direction.IsNearlyZero())++BlockedWalkSteps;
}
TSharedPtr<FJsonObject> AShibuyaExplorer::Snapshot() const
{
    auto Result=MakeShared<FJsonObject>();Result->SetField(TEXT("position_cm"),VectorJSON(GetActorLocation()));
    const FRotator Rotation=Controller?Controller->GetControlRotation():FRotator::ZeroRotator;
    Result->SetField(TEXT("control_rotation_degrees"),VectorJSON(FVector(Rotation.Pitch,Rotation.Yaw,Rotation.Roll)));
    Result->SetBoolField(TEXT("flying"),Flying);Result->SetBoolField(TEXT("fast"),Fast);
    Result->SetBoolField(TEXT("capsule_trace_complex_on_move"),Collision->bTraceComplexOnMove);
    Result->SetStringField(TEXT("movement_notice"),MovementNotice);
    Result->SetNumberField(TEXT("forward_input_events"),ForwardEvents);Result->SetNumberField(TEXT("look_input_events"),LookEvents);
    Result->SetNumberField(TEXT("mode_input_events"),ModeEvents);Result->SetNumberField(TEXT("pause_input_events"),PauseEvents);Result->SetNumberField(TEXT("reset_input_events"),ResetEvents);
    if(ResetAdmission.IsValid())Result->SetObjectField(TEXT("reset_start_admission"),ResetAdmission);
    Result->SetNumberField(TEXT("blocked_walk_steps"),BlockedWalkSteps);return Result;
}
AShibuyaGameMode::AShibuyaGameMode()
{
    DefaultPawnClass=AShibuyaExplorer::StaticClass();PlayerControllerClass=AShibuyaController::StaticClass();HUDClass=AShibuyaHUD::StaticClass();
}
void AShibuyaGameMode::HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer)
{
    // Login precedes StartPlay. Do not try the map's absent PlayerStart at
    // world zero, where native ground can prevent a pawn from spawning.
    if(AShibuyaWorld* World=FindCity(GetWorld());World && World->Ready)
    {
        Super::HandleStartingNewPlayer_Implementation(NewPlayer);
        // FinishRestartPlayer applies the fallback StartSpot rotation after
        // spawning. Restore the source view through the possessed pawn.
        if(NewPlayer)
            if(AShibuyaExplorer* Pawn=Cast<AShibuyaExplorer>(NewPlayer->GetPawn()))Pawn->ResetView();
    }
}
APawn* AShibuyaGameMode::SpawnDefaultPawnAtTransform_Implementation(AController* NewPlayer,const FTransform& SpawnTransform)
{
    AShibuyaWorld* World=FindCity(GetWorld());FVector Position;
    if(!ExplorerStart(World,nullptr,Position,PlayerStartAdmission))return nullptr;
    APawn* Pawn=Super::SpawnDefaultPawnAtTransform_Implementation(NewPlayer,FTransform(FRotator(0,World->SpawnYaw,0),Position));
    PlayerStartAdmission->SetBoolField(TEXT("spawn_created"),Pawn!=nullptr);
    return Pawn;
}
void AShibuyaGameMode::StartPlay()
{
    AShibuyaWorld* World=GetWorld()->SpawnActor<AShibuyaWorld>();World->LoadNetwork();
    Super::StartPlay();
    for(FConstPlayerControllerIterator It=GetWorld()->GetPlayerControllerIterator();It;++It)
        if(APlayerController* Player=It->Get())
        {
            if(!Player->GetPawn())HandleStartingNewPlayer(Player);
            else if(AShibuyaExplorer* Pawn=Cast<AShibuyaExplorer>(Player->GetPawn()))Pawn->ResetView();
        }
}
void AShibuyaHUD::DrawHUD()
{
    Super::DrawHUD();if(!Canvas)return;
    AShibuyaWorld* World=FindCity(GetWorld());AShibuyaExplorer* Pawn=PlayerOwner?Cast<AShibuyaExplorer>(PlayerOwner->GetPawn()):nullptr;
    DrawRect(FLinearColor(0.015f,0.02f,0.025f,0.8f),12,12,740,120);
    DrawText(TEXT("SHIBUYA  |  W A S D move  |  Mouse look  |  Shift faster  |  Tab walk/fly  |  P pause  |  R reset"),FLinearColor::White,24,22,nullptr,1);
    if(World && World->Ready)
    {
        DrawText(FString::Printf(TEXT("%s  |  %d pedestrians  |  %d vehicles  |  %s"),Pawn&&Pawn->IsFlying()?TEXT("Flying - Q/E down/up"):TEXT("Walking"),World->PedestrianCount,World->VehicleCount,World->Simulation.paused?TEXT("Simulation paused"):TEXT("Simulation running")),FLinearColor(0.7f,0.85f,1),24,44,nullptr,1);
        DrawText(World->Attribution,FLinearColor(0.8f,0.8f,0.8f),24,66,nullptr,0.85f);
        if(Pawn && !Pawn->MovementNotice.IsEmpty())DrawText(Pawn->MovementNotice,FLinearColor(1,0.8f,0.35f),24,110,nullptr,0.9f);
    }
    else DrawText(World?World->Error:TEXT("Loading fresh city network..."),FLinearColor(1,0.4f,0.3f),24,46,nullptr,0.9f);
}
