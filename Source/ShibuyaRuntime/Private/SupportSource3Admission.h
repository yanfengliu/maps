#pragma once

// Included after the existing JSON/record helpers in ShibuyaWorld.cpp.
// Consumed-byte admission only; the producer owns parent/patch geometry reconciliation.
inline int64 Source3Whole(const TSharedPtr<FJsonObject>& Value,const TCHAR* Field,int64 Maximum,bool Zero=false)
{
    const double N=Number(Value,Field);
    if(N<(Zero?0:1) || N>Maximum || N!=FMath::FloorToDouble(N))
        throw std::runtime_error("Source3 needs a bounded whole output index/count before admission.");
    return static_cast<int64>(N);
}
inline bool Source3Equal(const TSharedPtr<FJsonObject>& A,const TSharedPtr<FJsonObject>& B)
{return FJsonValue::CompareEqual(FJsonValueObject(A),FJsonValueObject(B));}
inline bool Source3RecordEqual(const TSharedPtr<FJsonObject>& A,const TSharedPtr<FJsonObject>& B)
{return Text(A,TEXT("path"))==Text(B,TEXT("path"))&&Text(A,TEXT("sha256"))==Text(B,TEXT("sha256"))&&Number(A,TEXT("bytes"))==Number(B,TEXT("bytes"));}

struct FSource3Metadata
{
    TSharedPtr<FJsonObject> Support,Parent,Ledger;
    FString SupportSHA;
};

template<class Admit>
FSource3Metadata AdmitSource3Closure(const TSharedPtr<FJsonObject>& Support,const TSharedPtr<FJsonObject>& Source,const TSharedPtr<FJsonObject>& Movement,
    const TSharedPtr<FJsonObject>& Preservation,TMap<FString,TSharedPtr<FJsonObject>>& HistoricalExecution,Admit&& AdmitRecord)
{
    auto Metadata=[&](const TSharedPtr<FJsonObject>& Record)
    {Source3Whole(Record,TEXT("bytes"),16*1024*1024);return ObjectValue(ParseJSON(AdmitRecord(Record)));};
    if(Text(Support,TEXT("coordinate_model"))!=TEXT("native-esu-float32-centimetres-v2") || Support->HasField(TEXT("topology_provenance")) || Support->HasField(TEXT("terrain_source_triangle_indices")))
        throw std::runtime_error("Runtime Source3 needs its native coordinate model and new ledger ancestry, not relabeled Source2 topology.");
    if(!Source3Equal(ObjectField(Source,TEXT("support_surface")),ObjectField(Movement,TEXT("support_surface"))) || !Source3Equal(ObjectField(Source,TEXT("derived_terrain")),ObjectField(Movement,TEXT("derived_terrain"))))
        throw std::runtime_error("Runtime Source3 movement/source manifests must bind the same published support and derived-terrain records.");
    const auto ParentRecord=ObjectField(Support,TEXT("parent_support_surface"));
    const auto Parent=Metadata(ParentRecord),Ledger=Metadata(ObjectField(Support,TEXT("surface_edits")));
    Shibuya::AdmitNativeFrame(Parent,TEXT("Source3 parent support"));Shibuya::AdmitNativeFrame(Ledger,TEXT("Source3 edit ledger"));
    if(Number(Parent,TEXT("schema_version"))!=2 || Text(ParentRecord,TEXT("path"))==TEXT("data/prepared/surface/support-surface-manifest.json") ||
       Number(Ledger,TEXT("schema_version"))!=1 || Text(Ledger,TEXT("coordinate_model"))!=TEXT("native-esu-float32-centimetres-v2") ||
       Text(Ledger,TEXT("output_order"))!=TEXT("parent-triangles-minus-deletions-then-patch-faces") ||
       !Source3Equal(ObjectField(Ledger,TEXT("parent_support_surface")),ParentRecord) || !Source3Equal(ObjectField(Ledger,TEXT("parent_derived_terrain")),ObjectField(Parent,TEXT("derived_terrain"))))
        throw std::runtime_error("Runtime Source3 edit ledger does not identify its immutable schema2 parent and exact output order.");
    if(Text(ObjectField(Support,TEXT("derived_terrain")),TEXT("path"))==Text(ObjectField(Parent,TEXT("derived_terrain")),TEXT("path")))
        throw std::runtime_error("Runtime Source3 current terrain cannot reuse its producer-only parent geometry role.");
    for(const TCHAR* Field:{TEXT("frame"),TEXT("origin"),TEXT("vertical_reference"),TEXT("inputs"),TEXT("atlas"),TEXT("native_assignment")})
        if(!Source3Equal(ObjectField(Support,Field),ObjectField(Parent,Field)))throw std::runtime_error("Runtime Source3 changed an inherited source/actor/material identity.");
    const auto& Roads=Array(Support,TEXT("native_roads"));const auto& ParentRoads=Array(Parent,TEXT("native_roads"));const auto& SourceRoads=Array(Source,TEXT("roads"));
    if(Roads.Num()!=25 || ParentRoads.Num()!=25 || SourceRoads.Num()!=25 ||
       !FJsonValue::CompareEqual(FJsonValueArray(Array(Source,TEXT("raw_roads"))),FJsonValueArray(Array(ObjectField(Support,TEXT("inputs")),TEXT("roads")))))
        throw std::runtime_error("Runtime Source3 requires all25 actual road roles and unchanged original-road provenance.");
    TSet<FString> ActorLabels,MeshPaths;
    for(int32 I=0;I<25;++I)
    {
        const auto Road=ObjectValue(Roads[I]),Previous=ObjectValue(ParentRoads[I]);
        const FString Label=Text(Road,TEXT("actor_label")),Mesh=Text(Road,TEXT("native_mesh_path"));
        if(ActorLabels.Contains(Label)||MeshPaths.Contains(Mesh)||Label!=Text(Previous,TEXT("actor_label"))||Mesh!=Text(Previous,TEXT("native_mesh_path"))||
           Source3Whole(Road,TEXT("road_index"),24,true)!=I || Number(Road,TEXT("source_index"))!=Number(Previous,TEXT("source_index")) ||
           !Source3RecordEqual(ObjectField(Road,TEXT("original_source")),ObjectField(Previous,TEXT("original_source"))) ||
           !Source3RecordEqual(ObjectField(Road,TEXT("source")),ObjectValue(SourceRoads[I])) || Text(Road,TEXT("source_path"))!=Text(ObjectField(Road,TEXT("source")),TEXT("path")))
            throw std::runtime_error("Runtime Source3 road role changed an actor or does not bind its actual consumed full GLB.");
        ActorLabels.Add(Label);MeshPaths.Add(Mesh);Source3Whole(Road,TEXT("triangles"),2000000);AdmitRecord(ObjectField(Road,TEXT("source")));
    }
    TSet<int32> Replaced;
    for(const auto& Value:Array(Support,TEXT("derived_roads")))
    {
        const auto Row=ObjectValue(Value);const int32 I=static_cast<int32>(Source3Whole(Row,TEXT("source"),24,true));const auto Road=ObjectValue(Roads[I]);
        if(Replaced.Contains(I)||!Source3RecordEqual(ObjectField(Row,TEXT("record")),ObjectField(Road,TEXT("source")))||Array(Row,TEXT("face_map")).Num()!=Source3Whole(Road,TEXT("triangles"),2000000))
            throw std::runtime_error("Runtime Source3 derived road lineage differs from the actual selected road role.");
        const auto& Faces=Array(Row,TEXT("face_map"));
        for(int32 Flat=0;Flat<Faces.Num();++Flat)
        {
            const auto Face=ObjectValue(Faces[Flat]);const FString Kind=Text(Face,TEXT("kind"));
            if(Source3Whole(Face,TEXT("source"),24,true)!=I || Source3Whole(Face,TEXT("source_triangle_index"),2000000,true)!=Flat || (Kind!=TEXT("road")&&Kind!=TEXT("derived-road")))
                throw std::runtime_error("Runtime Source3 road face map must enumerate exact flattened consumed-GLB ordinals.");
            for(const TCHAR* Field:{TEXT("mesh"),TEXT("primitive"),TEXT("triangle"),TEXT("original_triangle")})Source3Whole(Face,Field,2000000,true);
        }
        Replaced.Add(I);
    }
    for(int32 I=0;I<25;++I)if(!Replaced.Contains(I)&&!Source3RecordEqual(ObjectField(ObjectValue(Roads[I]),TEXT("source")),ObjectField(ObjectValue(ParentRoads[I]),TEXT("source"))))
        throw std::runtime_error("Runtime Source3 changed an undeclared road geometry role.");
    const auto Writer=ObjectField(ObjectField(Support,TEXT("algorithm")),TEXT("edits"));
    if(!Source3RecordEqual(Writer,ObjectField(Preservation,TEXT("source3_writer"))) || !Text(Writer,TEXT("path")).StartsWith(TEXT("data/source/provenance/")))
        throw std::runtime_error("Runtime Source3 writer lacks its exact data-only preservation snapshot.");
    AdmitRecord(Writer,Shibuya::RuntimeInputRole::CodeSnapshot);HistoricalExecution.Add(TEXT("tools/data/support_source3.py"),Writer);
    TMap<FString,TSharedPtr<FJsonObject>> Inventory;
    const FString ParentGeometry=Text(ObjectField(Ledger,TEXT("parent_derived_terrain")),TEXT("path"));
    for(const auto& Value:Array(Preservation,TEXT("inputs_before")))
    {
        const auto Row=ObjectValue(Value);const FString Path=Text(Row,TEXT("path"));
        if(Inventory.Contains(Path)||!Digest(Text(Row,TEXT("sha256")))||!Shibuya::SafeRelativePath(TCHAR_TO_UTF8(*Path)))throw std::runtime_error("Runtime Source3 historical inventory has an invalid or repeated identity.");
        Source3Whole(Row,TEXT("bytes"),Path==ParentGeometry?64*1024*1024:32*1024*1024);Inventory.Add(Path,Row);
    }
    TArray<TSharedPtr<FJsonObject>> Producer{ObjectField(Ledger,TEXT("parent_derived_terrain")),ObjectField(Ledger,TEXT("terrain_patch"))};
    for(const auto& Value:Array(Ledger,TEXT("road_overrides")))Producer.Add(ObjectField(ObjectValue(Value),TEXT("replacement")));
    const auto Recipe=ObjectField(Ledger,TEXT("recipe"));Producer.Add(ObjectField(Recipe,TEXT("algorithm")));
    for(const TCHAR* Field:{TEXT("source_inputs"),TEXT("candidate_inputs")})for(const auto& Value:Array(Recipe,Field))Producer.Add(ObjectValue(Value));
    for(const auto& Row:Producer)
    {
        const auto* Found=Inventory.Find(Text(Row,TEXT("path")));
        if(!Found||!Source3RecordEqual(Row,*Found))throw std::runtime_error("Runtime Source3 historical inventory omits an exact declared producer dependency.");
    }
    // Deliberately no AdmitRecord on Producer: parent/patch GLBs are not runtime geometry.
    const int64 ParentCount=Source3Whole(ObjectField(Parent,TEXT("derived_terrain")),TEXT("triangles"),2000000);
    const auto& Deleted=Array(Ledger,TEXT("deleted_parent_triangles"));int64 Prior=-1;
    for(const auto& Value:Deleted){double N;if(!Value->TryGetNumber(N)||N<0||N>=ParentCount||N!=FMath::FloorToDouble(N)||N<=Prior)throw std::runtime_error("Runtime Source3 deletion indices must be sorted unique parent faces.");Prior=static_cast<int64>(N);}
    if(Source3Whole(ObjectField(Support,TEXT("derived_terrain")),TEXT("triangles"),2000000)!=ParentCount-Deleted.Num()+Array(Ledger,TEXT("patch_faces")).Num())
        throw std::runtime_error("Runtime Source3 ledger output population differs from the consumed terrain record.");
    return {Support,Parent,Ledger,Text(ObjectField(Source,TEXT("support_surface")),TEXT("sha256"))};
}

inline void AdmitSource3Profile(const TSharedPtr<FJsonObject>& Edge,const FSource3Metadata& Meta,const Shibuya::Route& Route,const FString& OSM)
{
    const FString Provider=Text(Edge,TEXT("source"));const auto Ref=ObjectField(Edge,TEXT("layer_ref"));const FString Kind=Text(Ref,TEXT("kind"));
    const int64 Triangle=Source3Whole(Edge,TEXT("triangle"),2000000,true);
    if(Text(Edge,TEXT("support_geometry"))!=TEXT("exact-derived-triangle-native-cm") || Text(Edge,TEXT("support_surface_sha256"))!=Meta.SupportSHA || Text(Edge,TEXT("derived_terrain_sha256"))!=Text(ObjectField(Meta.Support,TEXT("derived_terrain")),TEXT("sha256")))
        throw std::runtime_error("Runtime Source3 profile does not bind the actual output triangle and derived hash.");
    const auto Bary=ReadPoint(Edge->TryGetField(TEXT("barycentric"))),Normal=ReadPoint(Edge->TryGetField(TEXT("normal_enu")));
    if(Bary.x<-1e-6||Bary.y<-1e-6||Bary.z<-1e-6||Bary.x>1.000001||Bary.y>1.000001||Bary.z>1.000001||FMath::Abs(Bary.x+Bary.y+Bary.z-1)>1e-5||FMath::Abs(Shibuya::Length(Normal)-1)>1e-5||Normal.z<=0)
        throw std::runtime_error("Runtime Source3 profile lacks finite source-triangle barycentrics and upward unit normal.");
    const bool Terrain=Provider==TEXT("GSI-DEM5A"),Inferred=Provider==TEXT("inferred-ground-road"),DerivedRoad=Provider==TEXT("derived-ground-road"),Road=Provider==TEXT("PLATEAU-road");
    if((Terrain&&(Kind!=TEXT("terrain")&&Kind!=TEXT("terrain-fragment"))) || (Inferred&&Kind!=TEXT("inferred")) || (DerivedRoad&&Kind!=TEXT("derived-road")) || (Road&&Kind!=TEXT("road")) || (!Terrain&&!Inferred&&!DerivedRoad&&!Road))
        throw std::runtime_error("Runtime Source3 inferred/edited geometry cannot claim original GSI/PLATEAU lineage.");
    if(Terrain||Inferred)
    {
        if(Source3Whole(Ref,TEXT("triangle"),2000000,true)!=Triangle)throw std::runtime_error("Runtime Source3 terrain profile differs from its actual output face.");
        const int64 Count=Source3Whole(ObjectField(Meta.Support,TEXT("derived_terrain")),TEXT("triangles"),2000000);
        if(Triangle>=Count)throw std::runtime_error("Runtime Source3 terrain profile exceeds the current consumed output.");
        if(Kind==TEXT("terrain"))
        {
            const int64 ParentCount=Source3Whole(ObjectField(Meta.Parent,TEXT("derived_terrain")),TEXT("triangles"),2000000);
            const int64 ParentFace=Source3Whole(Ref,TEXT("parent_triangle"),ParentCount-1,true);int64 Earlier=0;
            for(const auto& Deleted:Array(Meta.Ledger,TEXT("deleted_parent_triangles"))){const double I=Deleted->AsNumber();if(I==ParentFace)throw std::runtime_error("Runtime Source3 retained profile names a deleted parent.");if(I<ParentFace)++Earlier;}
            const auto& Original=Array(Meta.Parent,TEXT("terrain_source_triangle_indices"));
            if(Original.Num()!=ParentCount || Triangle!=ParentFace-Earlier || Number(Ref,TEXT("original_triangle"))!=Original[static_cast<int32>(ParentFace)]->AsNumber())throw std::runtime_error("Runtime Source3 retained terrain changed its original GSI parent mapping.");
        }
        else
        {
            const auto& Patch=Array(Meta.Ledger,TEXT("patch_faces"));const int64 P=Source3Whole(Ref,TEXT("patch_triangle"),Patch.Num()-1,true);const auto Face=ObjectValue(Patch[static_cast<int32>(P)]);
            const int64 Retained=Source3Whole(ObjectField(Meta.Parent,TEXT("derived_terrain")),TEXT("triangles"),2000000)-Array(Meta.Ledger,TEXT("deleted_parent_triangles")).Num();
            if(Triangle!=Retained+P || Text(Ref,TEXT("region_id"))!=Text(Face,TEXT("region_id")) || Text(Face,TEXT("kind"))!=(Inferred?TEXT("inferred-ground-road"):TEXT("retained-parent-fragment")))throw std::runtime_error("Runtime Source3 terrain patch lineage differs from its declared output face.");
            if(Terrain&&(Number(Ref,TEXT("parent_triangle"))!=Number(Face,TEXT("parent_triangle"))||Number(Ref,TEXT("original_terrain_parent"))!=Number(Face,TEXT("original_terrain_parent"))))throw std::runtime_error("Runtime Source3 fragment changed its original terrain lineage.");
        }
    }
    else
    {
        const int32 SourceIndex=static_cast<int32>(Source3Whole(Ref,TEXT("source"),24,true));const auto Native=ObjectValue(Array(Meta.Support,TEXT("native_roads"))[SourceIndex]);
        if(Source3Whole(Ref,TEXT("source_triangle_index"),2000000,true)!=Triangle)throw std::runtime_error("Runtime Source3 road profile differs from its flattened consumed-GLB output face.");
        Source3Whole(Ref,TEXT("mesh"),2000000,true);Source3Whole(Ref,TEXT("primitive"),2000000,true);
        const int64 LocalTriangle=Source3Whole(Ref,TEXT("triangle"),2000000,true);
        if(Text(Edge,TEXT("support_road_sha256"))!=Text(ObjectField(Native,TEXT("source")),TEXT("sha256")))
            throw std::runtime_error("Runtime Source3 road profile belongs to a different consumed full road GLB.");
        if(Triangle>=Source3Whole(Native,TEXT("triangles"),2000000))throw std::runtime_error("Runtime Source3 road profile exceeds its actual consumed road.");
        TSharedPtr<FJsonObject> Map;
        for(const auto& Value:Array(Meta.Support,TEXT("derived_roads"))){const auto Row=ObjectValue(Value);if(Number(Row,TEXT("source"))==SourceIndex)Map=Row;}
        if(Map.IsValid())
        {
            if(!Source3Equal(Ref,ObjectValue(Array(Map,TEXT("face_map"))[static_cast<int32>(Triangle)])))throw std::runtime_error("Runtime Source3 road lacks its exact output/source face map.");
        }
        else if(DerivedRoad || Number(Ref,TEXT("original_triangle"))!=LocalTriangle)
            throw std::runtime_error("Runtime Source3 unchanged road relabels original source lineage.");
    }
    if((Inferred||DerivedRoad)&&Route.kind==Shibuya::Kind::Vehicle)
    {
        const auto Interval=ObjectField(Edge,TEXT("vehicle_source_interval"));
        if(Text(Interval,TEXT("osm_sha256"))!=OSM || Number(Interval,TEXT("width_m"))!=Route.width || Array(Interval,TEXT("directed_edges")).IsEmpty() || Array(Interval,TEXT("points")).Num()!=2)
            throw std::runtime_error("Runtime Source3 vehicle inferred support lacks its bound directed-source interval and full width.");
        for(const auto& Value:Array(Interval,TEXT("points"))){if(Value->Type!=EJson::Array||Value->AsArray().Num()!=2)throw std::runtime_error("Runtime Source3 vehicle interval needs finite XY endpoints.");for(const auto& Coordinate:Value->AsArray()){double N;if(!Coordinate->TryGetNumber(N)||!FMath::IsFinite(N))throw std::runtime_error("Runtime Source3 vehicle interval has a nonfinite endpoint.");}}
    }
}
