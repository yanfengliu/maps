#pragma once

// Included after the existing bound-input/JSON helpers. No alternate roots,
// untagged metre vertices, incomplete source identities or accepted fallback.
inline Shibuya::BodyPoint BodyXY(const TSharedPtr<FJsonValue>& Value,double Scale=1)
{
    if(!Value.IsValid()||Value->Type!=EJson::Array||Value->AsArray().Num()!=2)throw std::runtime_error("Vehicle body support needs exactly two tagged XY coordinates.");
    double X,Y;
    if(!Value->AsArray()[0]->TryGetNumber(X)||!Value->AsArray()[1]->TryGetNumber(Y)||!std::isfinite(X)||!std::isfinite(Y)||std::abs(X*Scale)>70000||std::abs(Y*Scale)>70000)
        throw std::runtime_error("Vehicle body support has nonfinite or out-of-frame XY coordinates.");
    return {X*Scale,Y*Scale,0};
}
inline void BodySame(const TSharedPtr<FJsonObject>& A,const TSharedPtr<FJsonObject>& B)
{if(!Source3Equal(A,B))throw std::runtime_error("Vehicle body support identity differs from the actual admitted movement/source/support generation.");}
inline std::vector<double> BodyNumbers(const TArray<TSharedPtr<FJsonValue>>& Values,int32 Count)
{
    if(Values.Num()!=Count)throw std::runtime_error("Vehicle body support numeric tuple has the wrong shape.");
    std::vector<double> Result;
    for(const auto& V:Values){double N;if(!V->TryGetNumber(N)||!std::isfinite(N))throw std::runtime_error("Vehicle body support tuple contains nonfinite data.");Result.push_back(N);}return Result;
}
inline std::vector<std::vector<Shibuya::BodyPoint>> BodyBuildings(const FXmlFile& OSM,double OriginHeight)
{
    if(!OSM.IsValid()||!OSM.GetRootNode())throw std::runtime_error("Vehicle body support needs the actual admitted OSM DOM for complete building exclusions.");
    const double Lat=FMath::DegreesToRadians(35.6595),Lon=FMath::DegreesToRadians(139.7005);
    const FVector East(-std::sin(Lon),std::cos(Lon),0),North(-std::sin(Lat)*std::cos(Lon),-std::sin(Lat)*std::sin(Lon),std::cos(Lat));
    const FVector Origin=ECEF(FVector(35.6595,139.7005,OriginHeight));TMap<FString,Shibuya::BodyPoint> Nodes;
    for(const auto* Node:OSM.GetRootNode()->GetChildrenNodes())if(Node->GetTag()==TEXT("node"))
    {
        double A,B;if(!LexTryParseString(A,*Node->GetAttribute(TEXT("lat")))||!LexTryParseString(B,*Node->GetAttribute(TEXT("lon"))))throw std::runtime_error("Vehicle body OSM node has invalid geographic coordinates.");
        const auto Delta=ECEF(FVector(A,B,OriginHeight))-Origin;Nodes.Add(Node->GetAttribute(TEXT("id")),{FVector::DotProduct(Delta,East),FVector::DotProduct(Delta,North),0});
    }
    std::vector<std::vector<Shibuya::BodyPoint>> Result;
    for(const auto* Way:OSM.GetRootNode()->GetChildrenNodes())if(Way->GetTag()==TEXT("way"))
    {
        bool Building=false,Complete=true;TArray<FString> IDs;
        for(const auto* Child:Way->GetChildrenNodes())
        {
            if(Child->GetTag()==TEXT("tag")&&Child->GetAttribute(TEXT("k"))==TEXT("building"))Building=Child->GetAttribute(TEXT("v"))!=TEXT("no");
            if(Child->GetTag()==TEXT("nd")){const auto ID=Child->GetAttribute(TEXT("ref"));IDs.Add(ID);Complete=Complete&&Nodes.Contains(ID);}
        }
        if(!Building||!Complete||IDs.Num()<4||IDs[0]!=IDs.Last())continue;
        std::vector<Shibuya::BodyPoint> P;for(int32 I=0;I<IDs.Num()-1;++I)P.push_back(Nodes[IDs[I]]);Result.push_back(std::move(P));
    }
    return Result;
}
template<class Admit>
std::shared_ptr<Shibuya::VehicleBodySupport> AdmitVehicleBody(const TSharedPtr<FJsonObject>& Packet,
    const TSharedPtr<FJsonObject>& Movement,const TSharedPtr<FJsonObject>& Source,const TSharedPtr<FJsonObject>& Base,
    const TSharedPtr<FJsonObject>& Support,const TSharedPtr<FJsonObject>& Network,const FXmlFile& OSM,Admit&& AdmitRecord)
{
    Shibuya::AdmitNativeFrame(Packet,TEXT("vehicle body support"));
    if(!Packet->HasTypedField<EJson::Number>(TEXT("schema_version"))||Number(Packet,TEXT("schema_version"))!=2||Text(Packet,TEXT("frame"))!=UTF8_TO_TCHAR(Shibuya::NativeFrameID)||
       Text(Packet,TEXT("coordinate_model"))!=TEXT("binary64-cm-query-on-float32-esu-cm-vertices-v2"))
        throw std::runtime_error("Vehicle body support needs schema2 with explicit per-face Boolean eligibility, binary64 queries and float32 native-centimetre vertices.");
    if(!Packet->HasField(TEXT("physical_model"))||!Support->HasField(TEXT("physical_query_model")))
        throw std::runtime_error("Vehicle body support requires the known conditional physical cook model in packet and admitted support metadata.");
    const auto Physical=ObjectField(Packet,TEXT("physical_model"));
    if(Physical->Values.Num()!=3||!Shibuya::BodyCookModelKnown(Number(Physical,TEXT("schema_version")),
       TCHAR_TO_UTF8(*Text(Physical,TEXT("id"))),TCHAR_TO_UTF8(*Text(Physical,TEXT("definition_sha256")))))
        throw std::runtime_error("Vehicle body support has an unknown physical cook model/version/definition seal.");
    BodySame(Physical,ObjectField(Support,TEXT("physical_query_model")));
    auto Result=std::make_shared<Shibuya::VehicleBodySupport>();
    const auto B=ObjectField(Packet,TEXT("bindings"));
    for(const TCHAR* Key:{TEXT("network"),TEXT("source_manifest"),TEXT("source_osm")})BodySame(ObjectField(B,Key),ObjectField(Movement,Key));
    for(const TCHAR* Key:{TEXT("support_surface"),TEXT("derived_terrain"),TEXT("dem")})BodySame(ObjectField(B,Key),ObjectField(Source,Key));
    if(!FJsonValue::CompareEqual(FJsonValueArray(Array(B,TEXT("roads"))),FJsonValueArray(Array(Source,TEXT("roads")))))throw std::runtime_error("Vehicle body support road closure differs from current source roads.");
    BodySame(ObjectField(B,TEXT("algorithm")),ObjectField(Support,TEXT("algorithm")));
    BodySame(ObjectField(B,TEXT("configurations")),ObjectField(Support,TEXT("configuration_inputs")));
    const auto Producer=ObjectField(Packet,TEXT("producer"));
    const FString ProducerHash=Text(Producer,TEXT("sha256"));
    if(!Digest(ProducerHash)||Text(Producer,TEXT("path"))!=TEXT("data/source/provenance/vehicle_body_support-")+ProducerHash+TEXT(".py"))
        throw std::runtime_error("Vehicle body support needs its exact content-addressed data-only constructor snapshot.");
    AdmitRecord(Producer,Shibuya::RuntimeInputRole::CodeSnapshot);
    const TCHAR* CodeNames[]={TEXT("vehicle_body_support"),TEXT("surface_network"),TEXT("support_source3"),TEXT("build_city"),TEXT("support_surface"),TEXT("support_topology")};
    const auto& Constructor=Array(Packet,TEXT("constructor_inputs"));if(Constructor.Num()!=6)throw std::runtime_error("Vehicle body packet needs all six exact constructor dependency snapshots.");
    for(int32 I=0;I<6;++I)
    {
        const auto Row=ObjectValue(Constructor[I]),Snapshot=ObjectField(Row,TEXT("snapshot"));const FString Hash=Text(Snapshot,TEXT("sha256"));
        if(Text(Row,TEXT("execution_path"))!=FString(TEXT("tools/data/"))+CodeNames[I]+TEXT(".py")||!Digest(Hash)||
           Text(Snapshot,TEXT("path"))!=FString(TEXT("data/source/provenance/"))+CodeNames[I]+TEXT("-")+Hash+TEXT(".py"))throw std::runtime_error("Vehicle body constructor dependency lacks its exact data-only execution identity.");
        if(I==0)BodySame(Snapshot,Producer);AdmitRecord(Snapshot,Shibuya::RuntimeInputRole::CodeSnapshot);
    }
    const auto& Configurations=Array(Packet,TEXT("constructor_configurations"));if(Configurations.Num()!=2)throw std::runtime_error("Vehicle body packet needs both actual constructor configuration snapshots.");
    for(int32 I=0;I<2;++I)
    {
        const TCHAR* Stem=I==0?TEXT("surface_network"):TEXT("shibuya");const auto Row=ObjectValue(Configurations[I]),Snapshot=ObjectField(Row,TEXT("snapshot"));const FString Hash=Text(Snapshot,TEXT("sha256"));
        if(Text(Row,TEXT("execution_path"))!=FString(TEXT("sources/"))+Stem+TEXT(".json")||!Digest(Hash)||
           Text(Snapshot,TEXT("path"))!=FString(TEXT("data/source/provenance/"))+Stem+TEXT("-")+Hash+TEXT(".json"))throw std::runtime_error("Vehicle body constructor configuration lacks its exact data-only identity.");
        AdmitRecord(Snapshot,Shibuya::RuntimeInputRole::ConfigurationSnapshot);
    }
    const auto& Rows=Array(Packet,TEXT("faces"));
    if(Rows.IsEmpty()||Rows.Num()>150000)throw std::runtime_error("Vehicle body support needs1..150000 bounded shared source faces.");
    const auto& Roads=Array(Support,TEXT("native_roads"));
    for(const auto& Value:Rows)
    {
        const auto Row=ObjectValue(Value);Shibuya::BodySupportFace Face;
        const auto& Vertices=Array(Row,TEXT("native_cm"));if(Vertices.Num()!=3)throw std::runtime_error("Vehicle body support face needs three native-centimetre vertices.");
        for(int32 I=0;I<3;++I)
        {
            const auto P=ReadPoint(Vertices[I]);
            if(std::abs(P.x)>70000||std::abs(P.y)>70000||std::abs(P.z)>20000||
               static_cast<double>(static_cast<float>(P.x))!=P.x||static_cast<double>(static_cast<float>(P.y))!=P.y||static_cast<double>(static_cast<float>(P.z))!=P.z)
                throw std::runtime_error("Vehicle body support face is not literal bounded float32 native centimetres.");
            Face.nativeCM[I]={P.x,P.y,P.z};
        }
        Face.road=Boolean(Row,TEXT("road"));Face.requiresInterval=Boolean(Row,TEXT("requires_interval"));
        Face.layerKind=TCHAR_TO_UTF8(*Text(Row,TEXT("layer_kind")));Face.meshPath=TCHAR_TO_UTF8(*Text(Row,TEXT("mesh_path")));
        Face.triangle=static_cast<size_t>(Source3Whole(Row,TEXT("triangle"),2000000,true));
        if(Number(Row,TEXT("cook_state"))!=1)throw std::runtime_error("Vehicle body support face lacks explicit physical cook-survivor state.");
        const int CookState=Shibuya::BodyCookMembership(Face.nativeCM);
        if(CookState!=1)throw std::runtime_error(std::string("Vehicle body support ")+(CookState<0?"ambiguous":"cook-rejected")+
            " physical face "+Face.meshPath+" source triangle "+std::to_string(Face.triangle)+" cannot enter the first-blocker pool.");
        const auto Ref=ObjectField(Row,TEXT("layer_ref"));if(Text(Ref,TEXT("kind"))!=Text(Row,TEXT("layer_kind")))throw std::runtime_error("Vehicle body face kind differs from its source lineage.");
        if(!Ref->HasTypedField<EJson::Boolean>(TEXT("support_eligible")))
            throw std::runtime_error("Vehicle body schema2 layer_ref.support_eligible must be a literal JSON Boolean on every physical face.");
        Face.supportEligible=Boolean(Ref,TEXT("support_eligible"));
        if(Ref->HasField(TEXT("reconstruction_role")))
        {
            if(!Ref->HasTypedField<EJson::String>(TEXT("reconstruction_role")))
                throw std::runtime_error("Vehicle body reconstruction_role must be a known literal string on kind=inferred.");
            Face.reconstructionRole=TCHAR_TO_UTF8(*Text(Ref,TEXT("reconstruction_role")));
        }
        if(!Shibuya::BodySupportEligibilityKnown(Face.layerKind,Face.reconstructionRole,Face.supportEligible))
            throw std::runtime_error("Vehicle body layer kind/reconstruction_role/support_eligible disagree; ordinary/support-top requires true, physical-transition/physical-sidewall requires false on kind=inferred.");
        if(!Shibuya::BodySupportLayerPolicyKnown(Face.road,Face.layerKind,Face.requiresInterval))
            throw std::runtime_error("Vehicle body face road/layer/interval policy disagrees with its original or inferred physical source.");
        const auto SourceRecord=ObjectField(Row,TEXT("source"));
        if(Face.road&&Face.layerKind!="inferred")
        {
            const auto Index=Source3Whole(Ref,TEXT("source"),Roads.Num()-1,true);const auto Road=ObjectValue(Roads[static_cast<int32>(Index)]);
            if((Face.layerKind!="road"&&Face.layerKind!="derived-road")||Face.requiresInterval!=(Face.layerKind=="derived-road")||
                Face.meshPath!=TCHAR_TO_UTF8(*Text(Road,TEXT("native_mesh_path")))||Face.triangle>=static_cast<size_t>(Source3Whole(Road,TEXT("triangles"),2000000)))
                throw std::runtime_error("Vehicle body road face has an unknown role, wrong native actor/mesh or widened interval policy.");
            BodySame(SourceRecord,ObjectField(Road,TEXT("source")));
        }
        else
        {
            if((Face.road&&Face.layerKind!="inferred")||(!Face.road&&Face.layerKind!="terrain"&&Face.layerKind!="terrain-fragment"&&Face.layerKind!="inferred")||!Face.requiresInterval||
               Face.meshPath!=TCHAR_TO_UTF8(*Text(ObjectField(Support,TEXT("native_assignment")),TEXT("replacement_mesh_path"))))
                throw std::runtime_error("Vehicle body terrain/inferred face needs its exact derived mesh and original directed interval.");
            BodySame(SourceRecord,ObjectField(Source,TEXT("derived_terrain")));
        }
        Face.sourcePath=TCHAR_TO_UTF8(*Text(SourceRecord,TEXT("path")));
        const auto& A=Face.nativeCM[0];const auto& C=Face.nativeCM[1];const auto& D=Face.nativeCM[2];
        const FVector Normal=-FVector::CrossProduct(FVector(C.x-A.x,C.y-A.y,C.z-A.z),FVector(D.x-A.x,D.y-A.y,D.z-A.z));
        Face.normalZ=Normal.Size()>0?Normal.Z/Normal.Size():0;
        if(std::abs(Number(Row,TEXT("normal_z"))-Face.normalZ)>1e-12)throw std::runtime_error("Vehicle body support normal differs from its signed native face winding.");
        Result->faces.push_back(std::move(Face));
    }
    // Decode exact already-admitted DEM text once. Window pixels are checked
    // against these current source bytes rather than accepted as unbound data.
    TMap<FString,TArray<double>> DEM;
    for(const auto& Pair:ObjectField(Source,TEXT("dem"))->Values)
    {
        const auto Record=ObjectValue(Pair.Value);const auto Bytes=AdmitRecord(Record);
        FString TextBytes;FFileHelper::BufferToString(TextBytes,Bytes.GetData(),Bytes.Num());TextBytes.ReplaceInline(TEXT("\r"),TEXT(""));TextBytes.ReplaceInline(TEXT("\n"),TEXT(","));
        TArray<FString> Tokens;TextBytes.ParseIntoArray(Tokens,TEXT(","),true);if(Tokens.Num()!=65536)throw std::runtime_error("Vehicle body DEM needs the exact65536 source pixels per admitted tile.");
        TArray<double> Values;Values.Reserve(65536);
        for(const auto& Token:Tokens){double V;if(!LexTryParseString(V,*Token)||!std::isfinite(V))throw std::runtime_error("Vehicle body DEM source contains a missing/invalid pixel.");Values.Add(V);}
        const FString Path=Text(Record,TEXT("path"));const FString Key=FPaths::GetCleanFilename(FPaths::GetPath(Path))+TEXT("/")+FPaths::GetBaseFilename(Path);
        if(DEM.Contains(Key))throw std::runtime_error("Vehicle body DEM tile identity repeats.");DEM.Add(Key,std::move(Values));
    }
    TMap<FString,TSharedPtr<FJsonObject>> VehicleRoutes;
    for(const auto& Value:Array(Network,TEXT("routes"))){const auto R=ObjectValue(Value);if(Text(R,TEXT("kind"))==TEXT("vehicle"))VehicleRoutes.Add(Text(R,TEXT("id")),R);}
    const double OriginHeight=Number(ObjectField(Base,TEXT("origin")),TEXT("ellipsoidal_height_m"));
    const auto Buildings=BodyBuildings(OSM,OriginHeight);
    const auto Crop=ObjectField(Base,TEXT("bounds"));
    const double Geoid=Number(ObjectField(Base,TEXT("vertical_reference")),TEXT("estimated_local_geoid_offset_m"));
    const auto& RouteRows=Array(Packet,TEXT("routes"));if(RouteRows.Num()!=VehicleRoutes.Num())throw std::runtime_error("Vehicle body packet must cover every current vehicle route exactly once.");
    for(const auto& RouteValue:RouteRows)
    {
        const auto Row=ObjectValue(RouteValue);const FString Id=Text(Row,TEXT("route_id"));const auto* Route=VehicleRoutes.Find(Id);
        const std::string Key=TCHAR_TO_UTF8(*Id);if(!Route||Result->routes.count(Key))throw std::runtime_error("Vehicle body packet repeats or substitutes a route identifier.");
        double Length=0;const auto& Points=Array(*Route,TEXT("points"));for(int32 I=1;I<Points.Num();++I)Length+=Shibuya::Length(ReadPoint(Points[I])-ReadPoint(Points[I-1]));
        const auto& Windows=Array(Row,TEXT("windows"));if(Windows.IsEmpty()||Windows.Num()>100000)throw std::runtime_error("Vehicle body route needs bounded, contiguous support windows.");
        double Previous=0;
        for(const auto& WindowValue:Windows)
        {
            const auto W=ObjectValue(WindowValue);Shibuya::BodySupportWindow Window;
            Window.start=Number(W,TEXT("start_m"));Window.end=Number(W,TEXT("end_m"));
            if(Window.start!=Previous||Window.end<=Window.start||Window.end>Length+1e-6)throw std::runtime_error("Vehicle body windows must cover actual cumulative route distances without gaps.");Previous=Window.end;
            const auto Bounds=BodyNumbers(Array(W,TEXT("xy_bounds_m")),4);
            Window.minX=Bounds[0];Window.minY=Bounds[1];Window.maxX=Bounds[2];Window.maxY=Bounds[3];
            if(Window.minX>=Window.maxX||Window.minY>=Window.maxY||Window.maxX-Window.minX>12||Window.maxY-Window.minY>12||std::max({std::abs(Window.minX),std::abs(Window.minY),std::abs(Window.maxX),std::abs(Window.maxY)})>700)
                throw std::runtime_error("Vehicle body support window exceeds its bounded route-local frame.");
            const auto& IDs=Array(W,TEXT("face_ids"));TSet<int32> Seen;
            if(!Shibuya::BodySupportCandidateCountKnown(static_cast<size_t>(IDs.Num())))throw std::runtime_error("Vehicle body window needs1..1024 complete candidate blockers.");
            for(const auto& V:IDs){double I;if(!V->TryGetNumber(I)||I<0||I>=Rows.Num()||I!=std::floor(I)||Seen.Contains(static_cast<int32>(I)))throw std::runtime_error("Vehicle body window has an invalid or duplicate face reference.");Seen.Add(static_cast<int32>(I));Window.faces.push_back(static_cast<size_t>(I));}
            for(const auto& IValue:Array(W,TEXT("intervals")))
            {
                const auto I=ObjectValue(IValue);const auto A=BodyXY(I->TryGetField(TEXT("start_m"))),C=BodyXY(I->TryGetField(TEXT("end_m")));
                const double Width=Number(I,TEXT("width_m"));if(Width!=Number(*Route,TEXT("width_m")))throw std::runtime_error("Vehicle body terrain interval cannot widen the original directed route band.");
                const auto& Edges=Array(I,TEXT("directed_edges"));if(Edges.Num()<1||Edges.Num()>2)throw std::runtime_error("Vehicle body interval needs one source lane or its legal adjacent turn.");
                const auto& Lanes=Array(*Route,TEXT("source_lane_segments"));bool Matched=false;
                for(int32 L=0;L<Lanes.Num();++L)
                {
                    auto Matches=[&](int32 N,const TSharedPtr<FJsonValue>& E)
                    {const auto Values=BodyNumbers(E->AsArray(),3);const auto Lane=ObjectValue(Lanes[N]);return Values[0]==Number(Lane,TEXT("way_id"))&&Values[1]==Number(Lane,TEXT("from_osm_node"))&&Values[2]==Number(Lane,TEXT("to_osm_node"));};
                    if(!Edges[0].IsValid()||Edges[0]->Type!=EJson::Array||!Matches(L,Edges[0]))continue;
                    const auto Lane=ObjectValue(Lanes[L]);Shibuya::BodyPoint ExpectedA,ExpectedC;
                    if(Edges.Num()==1){ExpectedA=BodyXY(Array(Lane,TEXT("lane_points"))[0]);ExpectedC=BodyXY(Array(Lane,TEXT("lane_points"))[1]);}
                    else
                    {
                        const int32 Next=(L+1)%Lanes.Num();if((L+1==Lanes.Num()&&!Boolean(*Route,TEXT("closed")))||Edges[1]->Type!=EJson::Array||!Matches(Next,Edges[1]))continue;
                        ExpectedA=BodyXY(Array(Lane,TEXT("lane_points"))[1]);ExpectedC=BodyXY(Array(ObjectValue(Lanes[Next]),TEXT("lane_points"))[0]);
                    }
                    if(std::hypot(A.x-ExpectedA.x,A.y-ExpectedA.y)<=1e-8&&std::hypot(C.x-ExpectedC.x,C.y-ExpectedC.y)<=1e-8){Matched=true;break;}
                }
                if(!Matched)throw std::runtime_error("Vehicle body interval differs from the unchanged source lane/turn traversal.");
                Window.intervals.push_back({A,C,Width});
            }
            for(const auto& Polygon:Array(W,TEXT("buildings_m")))
            {if(Polygon->Type!=EJson::Array||Polygon->AsArray().Num()<3||Polygon->AsArray().Num()>10000)throw std::runtime_error("Vehicle body building exclusion needs a bounded source polygon.");std::vector<Shibuya::BodyPoint> P;for(const auto& V:Polygon->AsArray())P.push_back(BodyXY(V));Window.buildings.push_back(std::move(P));}
            size_t BuildingIndex=0;
            for(const auto& Polygon:Buildings)
            {
                double X0=INFINITY,Y0=INFINITY,X1=-INFINITY,Y1=-INFINITY;
                for(const auto& P:Polygon){X0=std::min(X0,P.x);Y0=std::min(Y0,P.y);X1=std::max(X1,P.x);Y1=std::max(Y1,P.y);}
                if(X1<Bounds[0]||Y1<Bounds[1]||X0>Bounds[2]||Y0>Bounds[3])continue;
                if(BuildingIndex>=Window.buildings.size()||Window.buildings[BuildingIndex].size()!=Polygon.size())throw std::runtime_error("Vehicle body window omits an actual source building exclusion.");
                for(size_t I=0;I<Polygon.size();++I)if(std::hypot(Polygon[I].x-Window.buildings[BuildingIndex][I].x,Polygon[I].y-Window.buildings[BuildingIndex][I].y)>1e-6)throw std::runtime_error("Vehicle body building polygon differs from the exact admitted OSM projection.");
                ++BuildingIndex;
            }
            if(BuildingIndex!=Window.buildings.size())throw std::runtime_error("Vehicle body window adds or substitutes a building polygon.");
            if(W->HasField(TEXT("coverage_polygon_native_cm")))
            {
                const auto& Domain=Array(W,TEXT("coverage_polygon_native_cm"));if(Domain.Num()<3||Domain.Num()>16)throw std::runtime_error("Vehicle body optional cache domain needs3..16 convex tagged native-centimetre vertices.");
                for(const auto& V:Domain)Window.coveragePolygonNativeCM.push_back(BodyXY(V));
                Shibuya::BodyExact::Poly P;for(const auto& V:Window.coveragePolygonNativeCM)P.push_back(Shibuya::BodyExact::P(V.x,V.y));
                for(const auto& E:Shibuya::BodyExact::Edges(P))if(!Shibuya::BodyExact::All(P,E))throw std::runtime_error("Vehicle body cache domain must be convex before coverage certification.");
            }
            const auto D=ObjectField(W,TEXT("dem_enclosure"));if(Text(D,TEXT("method"))!=TEXT("bilinear-pixel-extrema-wgs84-sag-v1"))throw std::runtime_error("Vehicle body DEM enclosure has an unknown method.");
            const auto Geo=BodyNumbers(Array(D,TEXT("geographic_bounds")),4),Pixels=BodyNumbers(Array(D,TEXT("pixels")),4);
            const FVector Geographic=ENUGeographic({(Bounds[0]+Bounds[2])/2,(Bounds[1]+Bounds[3])/2,0},OriginHeight);
            const double Margin=std::hypot(Bounds[2]-Bounds[0],Bounds[3]-Bounds[1])/2*2e-5;
            if(Geo[0]>Geographic.X-Margin||Geo[2]<Geographic.X+Margin||Geo[1]>Geographic.Y-Margin||Geo[3]<Geographic.Y+Margin||
               Geo[0]<Number(Crop,TEXT("south"))||Geo[2]>Number(Crop,TEXT("north"))||Geo[1]<Number(Crop,TEXT("west"))||Geo[3]>Number(Crop,TEXT("east")))throw std::runtime_error("Vehicle body DEM enclosure does not conservatively cover its actual source window inside the admitted crop.");
            auto Pixel=[](double Lat,double Lon){const double R=FMath::DegreesToRadians(Lat);return FVector2D((Lon+180)/360*8388608-.5,(1-std::asinh(std::tan(R))/PI)/2*8388608-.5);};
            const auto NW=Pixel(Geo[2],Geo[1]),SE=Pixel(Geo[0],Geo[3]);
            if(Pixels[0]>std::floor(NW.X)||Pixels[1]>std::floor(NW.Y)||Pixels[2]<std::floor(SE.X)+1||Pixels[3]<std::floor(SE.Y)+1)throw std::runtime_error("Vehicle body DEM pixels omit a possible bilinear source operand.");
            for(double P:Pixels)if(P<0||P>=8388608||P!=std::floor(P))throw std::runtime_error("Vehicle body DEM global pixel ordinal is invalid.");
            const int32 Columns=static_cast<int32>(Pixels[2]-Pixels[0]+1),Count=Columns*static_cast<int32>(Pixels[3]-Pixels[1]+1);
            if(Columns<1||Count<1||Count>256)throw std::runtime_error("Vehicle body DEM window exceeds256 source operands.");
            const auto Values=BodyNumbers(Array(D,TEXT("values")),Count);double Min=INFINITY,Max=-INFINITY;
            for(int32 N=0;N<Count;++N)
            {
                const int32 X=static_cast<int32>(Pixels[0])+N%Columns,Y=static_cast<int32>(Pixels[1])+N/Columns;
                const auto* Tile=DEM.Find(FString::Printf(TEXT("%d/%d"),X/256,Y/256));
                if(!Tile||(*Tile)[(Y%256)*256+X%256]!=Values[N])throw std::runtime_error("Vehicle body DEM operand differs from its actual admitted source pixel.");Min=std::min(Min,Values[N]);Max=std::max(Max,Values[N]);
            }
            const double Angle=FMath::DegreesToRadians(std::max(std::abs(Geo[0]-35.6595),std::abs(Geo[2]-35.6595))+std::max(std::abs(Geo[1]-139.7005),std::abs(Geo[3]-139.7005)));
            const double Sag=std::pow(6400000*Angle,2)/6000000+std::max(std::abs(Min+Geoid),std::abs(Max+Geoid))*Angle*Angle+.0001;
            const auto Heights=BodyNumbers(Array(D,TEXT("height_bounds_m")),2);
            if(Heights[0]>Min+Geoid-OriginHeight-Sag||Heights[1]<Max+Geoid-OriginHeight+Sag||Heights[0]>Heights[1])throw std::runtime_error("Vehicle body DEM height bounds omit a possible current source height.");
            Window.demLow=Heights[0];Window.demHigh=Heights[1];Result->routes[Key].push_back(std::move(Window));
        }
        if(std::abs(Previous-Length)>1e-6)throw std::runtime_error("Vehicle body windows omit the current route endpoint.");
        // Source math.dist and native Length may differ by a few ulps. The
        // existing admitted endpoint tolerance now binds to the actual route.
        Result->BindRouteLength(Key,Length);
    }
    Result->nativeSourceToleranceCM=Number(ObjectField(Support,TEXT("native_assignment")),TEXT("collision_source_tolerance_cm"));
    if(Result->nativeSourceToleranceCM!=.1)throw std::runtime_error("Vehicle body support requires the unchanged0.1cm source/native geometry calibration limit.");
    return Result;
}
