// Included inside the loader's private namespace after its checked JSON readers.
// No XML file is opened here: the XML DOM is constructed from admitted bytes.
FVector WGS(const TSharedPtr<FJsonValue>& Value)
{
    if(!Value || Value->Type!=EJson::Array || Value->AsArray().Num()!=2)throw std::runtime_error("Boundary WGS84 coordinate needs exactly[latitude,longitude].");
    double Latitude,Longitude;
    if(!Value->AsArray()[0]->TryGetNumber(Latitude) || !Value->AsArray()[1]->TryGetNumber(Longitude) || !FMath::IsFinite(Latitude) || !FMath::IsFinite(Longitude) || std::abs(Latitude)>90 || std::abs(Longitude)>180)
        throw std::runtime_error("Boundary WGS84 coordinate is non-finite or out of geographic range.");
    return FVector(Latitude,Longitude,0);
}
FVector ECEF(const FVector& Geographic)
{
    const double Lat=FMath::DegreesToRadians(Geographic.X),Lon=FMath::DegreesToRadians(Geographic.Y);
    constexpr double E2=6.6943799901413165e-3;
    const double N=6378137/std::sqrt(1-E2*std::sin(Lat)*std::sin(Lat));
    return FVector((N+Geographic.Z)*std::cos(Lat)*std::cos(Lon),(N+Geographic.Z)*std::cos(Lat)*std::sin(Lon),(N*(1-E2)+Geographic.Z)*std::sin(Lat));
}
FVector ENUGeographic(const Shibuya::Point& Point,double OriginHeight)
{
    const double Lat=FMath::DegreesToRadians(35.6595),Lon=FMath::DegreesToRadians(139.7005);
    const FVector East(-std::sin(Lon),std::cos(Lon),0),North(-std::sin(Lat)*std::cos(Lon),-std::sin(Lat)*std::sin(Lon),std::cos(Lat));
    const FVector Up(std::cos(Lat)*std::cos(Lon),std::cos(Lat)*std::sin(Lon),std::sin(Lat));
    const FVector World=ECEF(FVector(35.6595,139.7005,OriginHeight))+East*Point.x+North*Point.y+Up*Point.z;
    constexpr double A=6378137,B=6356752.314245179,E2=1-B*B/(A*A),EP2=A*A/(B*B)-1;
    const double Rho=std::hypot(World.X,World.Y),Theta=std::atan2(World.Z*A,Rho*B);
    const double Phi=std::atan2(World.Z+EP2*B*std::pow(std::sin(Theta),3),Rho-E2*A*std::pow(std::cos(Theta),3));
    const double N=A/std::sqrt(1-E2*std::sin(Phi)*std::sin(Phi));
    return FVector(FMath::RadiansToDegrees(Phi),FMath::RadiansToDegrees(std::atan2(World.Y,World.X)),Rho/std::cos(Phi)-N);
}
int64 SourceId(const TSharedPtr<FJsonObject>& Object,const TCHAR* Field)
{
    const double Value=Number(Object,Field);
    if(Value<1 || Value>9007199254740991.0 || Value!=std::floor(Value))throw std::runtime_error("Boundary source identifiers need positive exact JSON integers.");
    return static_cast<int64>(Value);
}
void AdmitBoundaryRoute(Shibuya::Route& Route,const TSharedPtr<FJsonObject>& Flow,const FString& Manifest,
    const TSharedPtr<FJsonObject>& Base,const FXmlFile& OSM,
    const TMap<FString,TSharedPtr<FJsonObject>>& Records,TFunctionRef<TArray<uint8>(const TSharedPtr<FJsonObject>&)> AdmitRecord)
{
    if(Route.closed || Route.kind!=Shibuya::Kind::Vehicle || Route.points.size()<2 || Text(Flow,TEXT("source_manifest_sha256"))!=Manifest)
        throw std::runtime_error("Boundary flow needs an open vehicle route and its actual pinned source manifest.");
    const auto Bounds=ObjectField(Flow,TEXT("crop_bounds")),BaseBounds=ObjectField(Base,TEXT("bounds"));
    for(const TCHAR* Side:{TEXT("south"),TEXT("north"),TEXT("west"),TEXT("east")})
        if(Number(Bounds,Side)!=Number(BaseBounds,Side))throw std::runtime_error("Boundary flow crop differs from the pinned source crop.");
    const double South=Number(Bounds,TEXT("south")),North=Number(Bounds,TEXT("north")),West=Number(Bounds,TEXT("west")),East=Number(Bounds,TEXT("east"));
    if(South>=North || West>=East || South<35.65 || North>35.67 || West<139.69 || East>139.71)throw std::runtime_error("Boundary crop needs finite ordered Shibuya geographic bounds.");
    auto Inside=[&](const FVector& P){return P.X>=South&&P.X<=North&&P.Y>=West&&P.Y<=East;};
    const double OriginHeight=Number(ObjectField(Base,TEXT("origin")),TEXT("ellipsoidal_height_m"));
    if(std::abs(OriginHeight)>1000 || !OSM.IsValid() || !OSM.GetRootNode() || OSM.GetRootNode()->GetTag()!=TEXT("osm"))throw std::runtime_error("Boundary admission needs bounded source origin height and the actual OSM DOM.");
    for(bool Entry:{true,false})
    {
        const FString Name=Entry?TEXT("entry"):TEXT("exit");const auto Endpoint=ObjectField(Flow,*Name);
        const auto Point=ReadPoint(Endpoint->TryGetField(TEXT("point"))),Heading=ReadPoint(Endpoint->TryGetField(TEXT("heading_enu")));
        if(Shibuya::Length(Point-(Entry?Route.points.front():Route.points.back()))>1e-6 || std::abs(Shibuya::Length(Heading)-1)>1e-6 || std::abs(Heading.z)>1e-6)
            throw std::runtime_error("Boundary endpoint differs from its route end or lacks a unit horizontal heading.");
        const auto Delta=Entry?Route.points[1]-Route.points[0]:Route.points.back()-Route.points[Route.points.size()-2];
        Shibuya::RequireDirectedEndHeading(Delta,Heading,Route.id,Entry?1:Route.points.size()-1);
        const FVector Geographic=ENUGeographic(Point,OriginHeight),Declared=WGS(Endpoint->TryGetField(TEXT("point_wgs84")));
        if(!Inside(Declared) || FVector::Dist2D(Geographic,Declared)>1e-8)throw std::runtime_error("Boundary ENU endpoint and its WGS84 coordinates disagree or lie outside the crop.");
        const FString Side=Text(Endpoint,TEXT("boundary_side"));FVector Nearest=Geographic,Outward=FVector::ZeroVector;
        if(Side==TEXT("west")){Nearest.Y=West;Outward.X=-1;}else if(Side==TEXT("east")){Nearest.Y=East;Outward.X=1;}
        else if(Side==TEXT("south")){Nearest.X=South;Outward.Y=-1;}else if(Side==TEXT("north")){Nearest.X=North;Outward.Y=1;}
        else throw std::runtime_error("Boundary side must name south,north,west or east.");
        const double Distance=FVector::Distance(ECEF(Geographic),ECEF(Nearest));
        if(Distance>20 || Number(Endpoint,TEXT("distance_to_crop_boundary_m"))<0 || std::abs(Distance-Number(Endpoint,TEXT("distance_to_crop_boundary_m")))>0.005 ||
           (Heading.x*Outward.X+Heading.y*Outward.Y)*(Entry?-1:1)<=1e-6)
            throw std::runtime_error("Boundary endpoint needs a source-consistent distance within20m and an inward entry/outward exit heading.");
        const auto Continuation=ObjectField(Endpoint,TEXT("continuation"));
        if(Text(Continuation,TEXT("source_direction"))!=(Entry?TEXT("outside-to-entry"):TEXT("exit-to-outside")))throw std::runtime_error("Boundary continuation declares the wrong lifecycle direction.");
        const int64 WayId=SourceId(Endpoint,TEXT("source_way_id")),NodeId=SourceId(Endpoint,TEXT("source_node_id"));
        const int64 InsideId=SourceId(Continuation,TEXT("inside_node_id")),OutsideId=SourceId(Continuation,TEXT("outside_node_id"));
        const auto& NodeValues=Array(Continuation,TEXT("source_node_ids"));TArray<int64> Chain;
        if(NodeValues.Num()<2 || NodeValues.Num()>1000)throw std::runtime_error("Boundary original-way continuation needs2–1000 ordered source nodes.");
        for(const auto& Value:NodeValues)
        {double Id;if(!Value->TryGetNumber(Id)||!FMath::IsFinite(Id)||Id<1||Id>9007199254740991.0||Id!=std::floor(Id))throw std::runtime_error("Boundary continuation has an invalid source node id.");Chain.Add(static_cast<int64>(Id));}
        if(Chain[0]!=NodeId || Chain[Chain.Num()-2]!=InsideId || Chain.Last()!=OutsideId)throw std::runtime_error("Boundary continuation endpoints disagree with their ordered original nodes.");
        const FXmlNode* Way=nullptr;TMap<int64,FVector> Coordinates;
        for(const FXmlNode* Node:OSM.GetRootNode()->GetChildrenNodes())
        {
            const int64 Id=FCString::Atoi64(*Node->GetAttribute(TEXT("id")));
            if(Node->GetTag()==TEXT("way")&&Id==WayId)Way=Node;
            if(Node->GetTag()==TEXT("node")&&Chain.Contains(Id))
            {
                double Latitude,Longitude;
                if(!LexTryParseString(Latitude,*Node->GetAttribute(TEXT("lat"))) || !LexTryParseString(Longitude,*Node->GetAttribute(TEXT("lon"))) || !FMath::IsFinite(Latitude) || !FMath::IsFinite(Longitude))throw std::runtime_error("Actual OSM boundary node has invalid coordinates.");
                Coordinates.Add(Id,FVector(Latitude,Longitude,0));
            }
        }
        if(!Way || Coordinates.Num()!=Chain.Num() || !Inside(Coordinates.FindRef(Chain[0])))throw std::runtime_error("Boundary continuation references a way or nodes absent from the actual pinned OSM XML.");
        TArray<int64> Ordered;FString OneWay,Junction;
        for(const FXmlNode* Child:Way->GetChildrenNodes())
        {if(Child->GetTag()==TEXT("nd"))Ordered.Add(FCString::Atoi64(*Child->GetAttribute(TEXT("ref"))));else if(Child->GetTag()==TEXT("tag")){if(Child->GetAttribute(TEXT("k"))==TEXT("oneway"))OneWay=Child->GetAttribute(TEXT("v"));if(Child->GetAttribute(TEXT("k"))==TEXT("junction"))Junction=Child->GetAttribute(TEXT("v"));}}
        int TravelSign=0;
        for(int32 i=1;i<Chain.Num();++i)
        {
            int Sign=0;for(int32 j=1;j<Ordered.Num();++j){if(Ordered[j-1]==Chain[i-1]&&Ordered[j]==Chain[i])Sign=1;if(Ordered[j]==Chain[i-1]&&Ordered[j-1]==Chain[i])Sign=-1;}
            Sign*=Entry?-1:1;
            if(Sign==0 || (TravelSign!=0&&TravelSign!=Sign))throw std::runtime_error("Boundary source nodes are not a consistently directed adjacent chain in their original OSM way.");
            TravelSign=Sign;
            if(i+1<Chain.Num()&&!Inside(Coordinates[Chain[i]]))throw std::runtime_error("Boundary continuation leaves the crop before its declared final node.");
        }
        const int Allowed=OneWay==TEXT("-1")?-1:(OneWay==TEXT("yes")||OneWay==TEXT("1")||OneWay==TEXT("true")||(OneWay.IsEmpty()&&Junction==TEXT("roundabout")))?1:0;
        if((Allowed!=0&&Allowed!=TravelSign)||(!OneWay.IsEmpty()&&Allowed==0&&OneWay!=TEXT("no")&&OneWay!=TEXT("0")&&OneWay!=TEXT("false")))throw std::runtime_error("Boundary continuation conflicts with the actual OSM one-way direction.");
        const FVector In=Coordinates[InsideId],Out=Coordinates[OutsideId],Boundary=WGS(Continuation->TryGetField(TEXT("boundary_wgs84")));
        if(!Inside(In)||Inside(Out)||FVector::Dist2D(In,WGS(Continuation->TryGetField(TEXT("inside_wgs84"))))>1e-10||FVector::Dist2D(Out,WGS(Continuation->TryGetField(TEXT("outside_wgs84"))))>1e-10)
            throw std::runtime_error("Boundary inside/outside coordinates differ from their actual OSM source nodes or crop membership.");
        const bool LatitudeSide=Side==TEXT("south")||Side==TEXT("north");const double Plane=Number(Bounds,*Side),Denominator=LatitudeSide?Out.X-In.X:Out.Y-In.Y;
        if(std::abs(Denominator)<1e-15)throw std::runtime_error("Original OSM continuation does not cross the declared boundary plane.");
        const double T=(Plane-(LatitudeSide?In.X:In.Y))/Denominator;
        if(T<0||T>1||!Inside(Boundary)||FVector::Dist2D(Boundary,In+(Out-In)*T)>1e-10)throw std::runtime_error("Boundary crossing is not on the original inside-to-outside OSM segment.");
        const auto Footprint=ObjectField(Endpoint,TEXT("footprint"));const FString Path=Text(Footprint,TEXT("samples_path")),Hash=Text(Footprint,TEXT("samples_sha256"));
        const auto SampleCountValue=Footprint->TryGetField(TEXT("sample_count"));
        if(!SampleCountValue.IsValid() || SampleCountValue->Type!=EJson::Number)throw std::runtime_error("Boundary footprint sample_count must be a JSON number before whole-count admission.");
        const double SampleCount=Number(Footprint,TEXT("sample_count"));
        const auto* Receipt=Records.Find(FString(UTF8_TO_TCHAR(Route.id.c_str()))+TEXT(":")+Name);
        if(!Receipt || Text(*Receipt,TEXT("path"))!=Path || Text(*Receipt,TEXT("sha256"))!=Hash || !Digest(Hash) || !Boolean(Footprint,TEXT("verified")) || Number(Footprint,TEXT("length_m"))!=4.4 || Number(Footprint,TEXT("width_m"))!=1.8 || !std::isfinite(SampleCount) || SampleCount!=std::floor(SampleCount) || SampleCount<4 || SampleCount>4096)
            throw std::runtime_error("Boundary endpoint needs its actual movement-bound4.4x1.8m support footprint receipt.");
        const auto Samples=ParseJSON(AdmitRecord(*Receipt));
        if(Samples->Type!=EJson::Array||Samples->AsArray().Num()!=static_cast<int32>(SampleCount))throw std::runtime_error("Boundary footprint file must contain every source station declared by its bounded whole receipt count.");
        auto Witness=[&](const TSharedPtr<FJsonObject>& Sample)
        {
            const auto P=ReadPoint(Sample->TryGetField(TEXT("point")));const double Triangle=Number(Sample,TEXT("triangle"));
            if(Text(Sample,TEXT("source"))!=TEXT("PLATEAU-road")||Triangle<0||Triangle!=std::floor(Triangle)||std::abs(Number(Sample,TEXT("dem_nearest_m")))>200||std::abs(P.x)>700||std::abs(P.y)>700||std::abs(P.z)>200)
                throw std::runtime_error("Boundary footprint needs finite admitted PLATEAU triangle support within the local crop.");
            const auto Bary=ReadPoint(Sample->TryGetField(TEXT("barycentric")));
            if(Bary.x<-1e-6||Bary.y<-1e-6||Bary.z<-1e-6||Bary.x>1.000001||Bary.y>1.000001||Bary.z>1.000001||std::abs(Bary.x+Bary.y+Bary.z-1)>1e-5)throw std::runtime_error("Boundary support has invalid measured triangle barycentric coordinates.");
            return P;
        };
        std::vector<Shibuya::Point> Stations;Stations.reserve(static_cast<size_t>(SampleCount));
        for(int32 i=0;i<Samples->AsArray().Num();++i)
        {
            const auto Sample=ObjectValue(Samples->AsArray()[i]);const auto Centre=Witness(Sample);Stations.push_back(Centre);
            const auto& Cross=Array(Sample,TEXT("cross_section"));if(Cross.Num()!=3)throw std::runtime_error("Boundary footprint needs all measured right/centre/left sections.");
            for(int32 c=0;c<3;++c)
            {
                const auto Edge=ObjectValue(Cross[c]);const auto P=Witness(Edge);const double Offset=(c-1)*0.9;
                if(std::abs(Number(Edge,TEXT("offset_m"))-Offset)>1e-6||std::hypot(P.x-Centre.x+Heading.y*Offset,P.y-Centre.y-Heading.x*Offset)>1e-4||std::abs(P.z-Centre.z)>0.5)
                    throw std::runtime_error("Boundary footprint cross-section differs from its measured width/orientation/height.");
            }
        }
        Shibuya::RequireBoundaryFootprintStations(Stations,Point,Heading,SampleCount);
        if(Entry){Route.boundaryEntry=Point;Route.boundaryEntryHeading=Heading;}else{Route.boundaryExit=Point;Route.boundaryExitHeading=Heading;}
    }
    Route.boundaryAdmitted=true;
}
