"""Bound: literal Source3 route station publication, not physics or capacity."""
import ast
import copy
import inspect
import hashlib
import types
import json
import math
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"tools/data"))
import surface_network as surface


def samples(points):
    return [{"point":list(point),"cross_section":[{"offset_m":0,"marker":i}],
             "source":{"sha256":str(i)},"authority_marker":i}
            for i,point in enumerate(points)]


class RuntimeRouteStations(unittest.TestCase):
    def select(self,points,anchors=None,kind="vehicle"):
        raw=samples(points)
        return raw,surface.runtime_route_stations(raw,anchors or [points[0][:2],points[-1][:2]],kind)

    def test_actual_duplicate_operand_retains_literal_authority(self):
        p=[-306.38304698658237,205.45842750515098,2.3851756384924276]
        a=[p[0]-.1,p[1]-.1,p[2]];b=[p[0]+.1,p[1]+.1,p[2]]
        raw,selected=self.select([a,p,p,b])
        self.assertEqual([row["authority_marker"] for row in selected],[0,1,3])
        self.assertIs(selected[1],raw[1])
        self.assertEqual(len(raw),4)
        self.assertEqual(raw[1]["point"],raw[2]["point"])

    def test_native_horizontal_threshold_is_unchanged(self):
        for distance,kept in ((math.nextafter(1e-6,0),2),(1e-6,3),(math.nextafter(1e-6,math.inf),3)):
            with self.subTest(distance=distance):
                raw,selected=self.select([[0.,0.,0.],[distance,0.,0.],[1.,0.,0.]])
                self.assertEqual(len(selected),kept)

    def test_endpoint_anchor_replaces_nearby_optional_station(self):
        raw,selected=self.select([[0.,0.,0.],[.9999999,0.,0.],[1.,0.,0.]])
        self.assertEqual(selected,[raw[0],raw[2]])
        self.assertIs(selected[-1],raw[-1])

    def test_join_keeps_incoming_profile_and_all_raw_records(self):
        pts=[[0.,0.,0.],[1.,0.,0.],[1.,0.,0.],[1.,1.,0.]]
        raw,selected=self.select(pts,[[0.,0.],[1.,0.],[1.,0.],[1.,1.]])
        self.assertEqual([row["authority_marker"] for row in selected],[0,1,3])
        self.assertEqual(raw[2]["authority_marker"],2)

    def test_distinct_required_anchors_below_threshold_refuse(self):
        with self.assertRaisesRegex(ValueError,"mandatory anchors"):
            self.select([[0.,0.,0.],[.5e-6,0.,0.],[1.,0.,0.]],[[0.,0.],[.5e-6,0.],[1.,0.]])

    def test_missing_literal_join_refuses(self):
        with self.assertRaisesRegex(ValueError,"literal mapped join"):
            self.select([[0.,0.,0.],[1.,0.,0.]],[[0.,0.],[.5,0.],[1.,0.]])

    def test_wrong_endpoint_refuses_instead_of_snapping(self):
        with self.assertRaisesRegex(ValueError,"exact mapped source endpoints"):
            self.select([[0.,0.,0.],[1.,0.,0.]],[[1e-12,0.],[1.,0.]])

    def test_exact_closed_anchor_preserved(self):
        points=[[0.,0.,0.],[1.,0.,0.],[1.,1.,0.],[0.,0.,0.]]
        raw,selected=self.select(points,[p[:2] for p in points])
        self.assertEqual(selected,raw)
        self.assertIs(selected[-1],raw[-1])

    def test_geometric_equivalence_bound_refuses_deviation(self):
        with self.assertRaisesRegex(ValueError,"ordered mapped interval"):
            self.select([[0.,0.,0.],[.5,1.1e-5,0.],[1.,0.,0.]])

    def test_original_parameter_order_refuses_backtracking(self):
        with self.assertRaisesRegex(ValueError,"ordered mapped interval"):
            self.select([[0.,0.,0.],[.6,0.,0.],[.5,0.,0.],[1.,0.,0.]])

    def test_spacing_refuses_without_new_interpolation(self):
        with self.assertRaisesRegex(ValueError,"sampled length"):
            self.select([[0.,0.,0.],[2.051,0.,0.]])

    def test_grade_refuses_without_pruning(self):
        with self.assertRaisesRegex(ValueError,"grade"):
            self.select([[0.,0.,0.],[1.,0.,.201]])

    def test_pedestrian_uses_source_grade_limit(self):
        raw,selected=self.select([[0.,0.,0.],[1.,0.,.6]],kind="pedestrian")
        self.assertEqual(raw,selected)
        with self.assertRaisesRegex(ValueError,"grade"):
            self.select([[0.,0.,0.],[1.,0.,.60001]],kind="pedestrian")

    def test_nonfinite_refuses(self):
        with self.assertRaisesRegex(ValueError,"finite literal"):
            self.select([[0.,0.,0.],[1.,0.,float("nan")]])


class NormalPublisherStations(unittest.TestCase):
    def call_route_record(self,schema):
        tree=ast.parse(inspect.getsource(surface.movement_network))
        function=next(n for n in tree.body[0].body if isinstance(n,ast.FunctionDef) and n.name=="route_record")
        raw=samples([[0.,0.,0.],[.5,0.,0.],[.5,0.,0.],[1.,0.,0.]])
        namespace=dict(surface.__dict__)
        namespace.update(surface=types.SimpleNamespace(corridor=lambda *a,**kw:raw,support_manifest={"schema_version":schema}),
                         samples_by_route={},raw_samples_by_route={})
        exec(compile(ast.Module(body=[function],type_ignores=[]),"production route_record","exec"),namespace)
        row,selected,raw_returned=namespace["route_record"]("route-1","vehicle",[[0.,0.],[1.,0.]],2.,{},[31610544])
        self.assertIs(raw_returned,raw)
        self.assertEqual(namespace["samples_by_route"],{})
        self.assertEqual(namespace["raw_samples_by_route"],{})
        return row,raw,selected

    def test_normal_source3_publisher_selects_and_retains_complete_authority(self):
        row,raw,selected=self.call_route_record(3)
        self.assertEqual(row["points"],[raw[i]["point"] for i in (0,1,3)])
        self.assertEqual(row["support"]["sample_count"],3)
        self.assertEqual(selected,[raw[i] for i in (0,1,3)])

    def test_legacy_empty_and_single_sample_keep_original_refusal(self):
        function=next(n for n in ast.parse(inspect.getsource(surface.movement_network)).body[0].body
                      if isinstance(n,ast.FunctionDef) and n.name=="route_record")
        for schema in (1,2):
            for count in (0,1):
                namespace=dict(surface.__dict__)
                namespace.update(surface=types.SimpleNamespace(corridor=lambda *a,**kw:samples([[0.,0.,0.]])*count,
                    support_manifest={"schema_version":schema}),samples_by_route={},raw_samples_by_route={})
                exec(compile(ast.Module(body=[function],type_ignores=[]),"production route_record","exec"),namespace)
                with self.subTest(schema=schema,count=count),self.assertRaisesRegex(ValueError,"^empty-supported-route$"):
                    namespace["route_record"]("legacy-empty","vehicle",[[0.,0.],[1.,0.]],2.,{},[1])

    def test_legacy_publisher_is_unchanged(self):
        row,raw,selected=self.call_route_record(2)
        self.assertEqual(row["points"],[r["point"] for r in raw])
        self.assertEqual(row["support"]["sample_count"],4)


class SourceGradeAuthority(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data_root=pathlib.Path(surface.__file__).absolute().parents[2]
        raw=(data_root/"tests/data/fixtures/source3-span-grade.json").read_bytes()
        if hashlib.sha256(raw).hexdigest()!="ec42b69872589dac0025cd6b421cb5e57371b4100985a624227ae2bd113a6981":
            raise AssertionError("Reviewed actual Source3 grade operands changed; restore/review the pinned fixture")
        cls.arms=json.loads(raw)["arms"]
        sys.path.insert(0,str(data_root/"tests/data"))
        from test_source3_span_grade import witness_model,exact_height
        cls.witness_model=staticmethod(witness_model)
        cls.exact_height=staticmethod(exact_height)

    def publish_after_source_gate(self,arm,*,wrong_authority=False):
        model,records,unused,positions=self.witness_model(arm["native_SourceENU_cm_triangles"],arm.get("selected_layer_refs"))
        p,q=arm["previous"],arm["current"]
        length=math.dist(p[:2],q[:2]);dx=(q[0]-p[0])/length;dy=(q[1]-p[1])/length
        a=[p[0]-dx*.1,p[1]-dy*.1,0.];b=[q[0]+dx*.1,q[1]+dy*.1,0.]
        a[2]=float(self.exact_height(arm["native_SourceENU_cm_triangles"][0],a))
        b[2]=float(self.exact_height(arm["native_SourceENU_cm_triangles"][1],b))
        raw=[{"point":point,**copy.deepcopy(record)} for point,record in zip((a,p,q,b),(records[0],records[0],records[1],records[1]))]
        if wrong_authority:raw[2]["support_surface_sha256"]="changed"
        source_grades=[]
        def corridor(*args,**kwargs):
            # The same existing production authority that Surface._corridor
            # applies before route_record is allowed to select stations.
            for left,right in zip(raw,raw[1:]):
                source_grades.append(surface.support_source3.span_grade(left["point"],right["point"],.2,
                    surface=model,previous_record=left,current_record=right))
            return raw
        function=next(n for n in ast.parse(inspect.getsource(surface.movement_network)).body[0].body
                      if isinstance(n,ast.FunctionDef) and n.name=="route_record")
        namespace=dict(surface.__dict__)
        namespace.update(surface=types.SimpleNamespace(corridor=corridor,support_manifest={"schema_version":3}),
                         samples_by_route={},raw_samples_by_route={})
        exec(compile(ast.Module(body=[function],type_ignores=[]),"production route_record","exec"),namespace)
        with mock.patch.dict(namespace,{"runtime_route_stations":mock.Mock(wraps=surface.runtime_route_stations)}) as unused:
            selector=namespace["runtime_route_stations"]
            try:row,selected,raw_returned=namespace["route_record"]("actual-grade-arm","vehicle",[a[:2],b[:2]],2.,{},[534157302])
            except ValueError:
                self.assertEqual(selector.call_count,0,"Strict Source refusal must stop before transport selection")
                raise
        self.assertEqual(selector.call_count,1)
        self.assertIs(raw_returned,raw)
        self.assertEqual(namespace["samples_by_route"],{})
        self.assertEqual(namespace["raw_samples_by_route"],{})
        self.assertEqual(row["points"],[r["point"] for r in selected])
        self.assertEqual(len(raw),4)
        return row,raw,source_grades

    def test_pinned_interval54_crossface_false_reds_publish_after_exact_source_grade(self):
        for arm in self.arms[:2]:
            with self.subTest(arm=arm["name"]):
                p,q=arm["previous"],arm["current"]
                self.assertGreater(abs(q[2]-p[2])/math.dist(p[:2],q[:2]),.2)
                row,raw,grades=self.publish_after_source_gate(arm)
                self.assertAlmostEqual(grades[1],arm["exact_grade"],places=15)
                self.assertEqual(row["points"],[raw[i]["point"] for i in (0,1,3)])
                self.assertEqual(row["support"]["sample_count"],3)

    def test_genuine_v6_physical_grade_refuses_before_selection(self):
        with self.assertRaisesRegex(ValueError,"exceeds"):
            self.publish_after_source_gate(self.arms[3])

    def test_real_selected_face_step_refuses_before_selection(self):
        arm={"previous":[.1,0.,0.],"current":[.10000001,0.,.1],
             "native_SourceENU_cm_triangles":[[[0,0,0],[100,0,0],[0,100,0]],[[0,0,10],[100,0,10],[0,100,10]]]}
        with self.assertRaisesRegex(ValueError,"exceeds"):
            self.publish_after_source_gate(arm)

    def test_missing_source_authority_refuses_before_selection(self):
        with self.assertRaisesRegex(ValueError,"authority"):
            self.publish_after_source_gate(self.arms[0],wrong_authority=True)


class PublishRouteProfiles(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=pathlib.Path(self.temp.name)
        self.raw=samples([[0.,0.,0.],[0.,0.,0.],[1.,0.,0.]])
        self.selected=[self.raw[0],self.raw[2]]
        self.routes=[{"id":"route-1","points":[r["point"] for r in self.selected],
            "support":{"sample_count":2,"samples_sha256":surface.sha(surface.encoded(self.selected))}}]
        self.root_patch=mock.patch.object(surface,"ROOT",self.root)
        self.out_patch=mock.patch.object(surface,"OUT",self.root/"data/prepared/surface")
        self.root_patch.start();self.out_patch.start()
        self.addCleanup(self.root_patch.stop);self.addCleanup(self.out_patch.stop)

    def publish(self,raw=None,selected=None,routes=None):
        return surface.publish_route_profiles(self.routes if routes is None else routes,
            {"route-1":self.selected if selected is None else selected},
            {"route-1":self.raw} if raw is None else raw)

    def test_complete_raw_immutable_hash_and_runtime_cardinality(self):
        support,raw=self.publish()
        self.assertEqual(raw[0]["sample_count"],3)
        self.assertEqual(raw[0]["runtime_sample_count"],2)
        self.assertEqual(json.loads((self.root/raw[0]["path"]).read_bytes()),self.raw)
        self.assertEqual(json.loads((self.root/support[0]["path"]).read_bytes()),self.selected)
        self.assertEqual(raw[0]["sha256"],surface.sha(surface.encoded(self.raw)))
        self.assertEqual(self.publish(),(support,raw))

    def test_route_omission_or_extra_refuses(self):
        for raw in ({},{"wrong-route":self.raw},{"route-1":self.raw,"extra":self.raw}):
            with self.subTest(raw=list(raw)),self.assertRaisesRegex(ValueError,"route IDs"):
                self.publish(raw=raw)

    def test_duplicate_route_refuses(self):
        with self.assertRaisesRegex(ValueError,"route IDs"):
            self.publish(routes=self.routes*2)

    def test_count_points_and_digest_mismatches_refuse(self):
        for mutation in ("count","point","digest"):
            routes=copy.deepcopy(self.routes)
            if mutation=="count":routes[0]["support"]["sample_count"]=3
            elif mutation=="point":routes[0]["points"][0][2]=1.
            else:routes[0]["support"]["samples_sha256"]="0"*64
            with self.subTest(mutation=mutation),self.assertRaisesRegex(ValueError,"points/count/digest"):
                self.publish(routes=routes)

    def test_literal_authority_change_refuses(self):
        self.raw=samples([[0.,0.,0.],[0.,0.,0.],[.5,0.,0.],[1.,0.,0.]])
        changed=copy.deepcopy([self.raw[0],self.raw[2],self.raw[3]])
        changed[1]["source"]["sha256"]="changed"
        routes=copy.deepcopy(self.routes);routes[0]["points"]=[r["point"] for r in changed]
        routes[0]["support"]={"sample_count":3,"samples_sha256":surface.sha(surface.encoded(changed))}
        with self.assertRaisesRegex(ValueError,"ordered literal selection"):
            self.publish(selected=changed,routes=routes)

    def test_changed_existing_raw_path_refuses(self):
        unused,records=self.publish()
        path=self.root/records[0]["path"];path.write_bytes(b"[]\n")
        with self.assertRaisesRegex(ValueError,"different bytes"):
            self.publish()

    def test_missing_after_write_refuses_before_source_publication(self):
        original=surface.guarded_write
        def lose(path,payload,root=None):
            original(path,payload,root)
            if path.name.startswith("corridor-profile-"):path.unlink()
        with mock.patch.object(surface,"guarded_write",side_effect=lose),self.assertRaisesRegex(ValueError,"missing or unreadable"):
            self.publish()
        self.assertFalse((surface.OUT/"movement-source-manifest.json").exists())

    def test_legacy_profile_format_adds_no_provenance(self):
        support,raw=surface.publish_route_profiles(self.routes,{"route-1":self.selected})
        self.assertEqual(raw,[])
        self.assertEqual(len(support),1)
        self.assertFalse((self.root/"data/source/provenance").exists())


class MovementAcceptedProfiles(unittest.TestCase):
    """Normal caller filters + real publisher, with synthetic admitted corridors.

    This unit boundary replaces only external OSM/Surface/endpoint admission and
    graph diagnostic I/O. Route graph/search, acceptance, station selection,
    publisher equality and profile/source/network writes execute production code.
    It qualifies no real-city geometry, endpoint legality or physical capacity.
    """
    def call_movement(self, declined):
        with tempfile.TemporaryDirectory() as temporary:
            root=pathlib.Path(temporary)
            producer=root/"tools/data/surface_network.py"
            producer.parent.mkdir(parents=True)
            producer.write_bytes(pathlib.Path(surface.__file__).read_bytes())
            config=root/"sources/surface_network.json"
            config.parent.mkdir(parents=True)
            config.write_bytes(surface.encoded(surface.CONFIG))
            points={1:[0.,0.],2:[10.,0.],100:[20.,40.],101:[60.,40.],102:[60.,80.],103:[20.,80.]}
            ways=[{"id":10,"nodes":[1,2],"tags":{"highway":"footway"}},
                  {"id":20,"nodes":[100,101,102,103,100],"tags":{"highway":"residential","oneway":"yes"}}]
            if declined=="pedestrian":
                points.update({3:[0.,10.],4:[3.,10.]})
                ways.append({"id":11,"nodes":[3,4],"tags":{"highway":"footway"}})
            elif declined=="cycle":
                points.update({200:[80.,40.],201:[90.,40.],202:[90.,50.]})
                ways.append({"id":30,"nodes":[200,201,202,200],"tags":{"highway":"residential","oneway":"yes"}})
            elif declined in ("boundary","boundary-positive"):
                points.update({300:[0.,20.],301:[5.,20.],302:[10.,20.]})
                ways.append({"id":40,"nodes":[300,301,302],"tags":{"highway":"residential","oneway":"yes"}})
            else:raise AssertionError("Unknown fixture arm")
            class AdmittedSurface:
                support_manifest={"schema_version":3,"native_frame":surface.native_frame_record()}
                road=types.SimpleNamespace(sources=[])
                dem_records=[];support_record={"fixture":"synthetic-admission"};derived_record={}
                def corridor(self,polyline,kind,width,**kwargs):
                    result=[]
                    for a,b in zip(polyline,polyline[1:]):
                        distance=math.dist(a[:2],b[:2])
                        if distance==0:continue
                        count=math.ceil(distance/1.5)
                        for i in range(count+1):
                            point=[a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count,0.]
                            result.append({"point":point,"cross_section":[{"offset_m":0,"marker":len(result)}],
                                           "source":{"fixture":"synthetic-admitted-corridor"}})
                    return result
                def check(self,point,kind,**kwargs):return [float(point[0]),float(point[1]),0.],{}
            admitted=AdmittedSurface()
            def endpoint(piece,entry,point,*args):
                if piece["way_id"]!=40 or (piece["from"]!=300 if entry else piece["to"]!=302):
                    raise ValueError("fixture-original-way-not-crop-boundary")
                # Both endpoint records are admitted at this test boundary. A
                # distinct height makes the normal route/endpoint binding refuse.
                payload=surface.encoded(admitted.corridor(piece["points"],"vehicle",1.8))
                path=root/"data/prepared/surface/support"/("entry.json" if entry else "exit.json")
                return {"point":[*point[:2],.01 if entry and declined=="boundary" else 0.]},(path,payload)
            restrictions=types.SimpleNamespace(rejection=lambda *a:None,rules=[],unsupported=[])
            admitted.vehicle_source=(points,{way["id"]:way for way in ways},restrictions)
            admitted.vehicle_interval=types.MethodType(surface.Surface.vehicle_interval,admitted)
            admitted.vehicle_subspan=types.MethodType(surface.Surface.vehicle_subspan,admitted)
            patches=(mock.patch.object(surface,"ROOT",root),mock.patch.object(surface,"OUT",root/"data/prepared/surface"),
                     mock.patch.object(surface,"__file__",str(producer)),
                     mock.patch.object(surface,"osm_sources",return_value=({},points,ways,[])),
                     mock.patch.object(surface,"osm_tree",return_value=None),
                     mock.patch.object(surface,"TurnRestrictions",return_value=restrictions),
                     mock.patch.object(surface,"Surface",return_value=admitted),
                     mock.patch.object(surface,"boundary_endpoint",side_effect=endpoint),
                     mock.patch.object(surface,"write_vehicle_graph_diagnostic",return_value=None))
            import contextlib
            with contextlib.ExitStack() as stack:
                for patch in patches:stack.enter_context(patch)
                result=surface.movement_network({"bounds":{},"vertical_reference":"synthetic-unit-fixture"})
                network=json.loads((root/result["network"]["path"]).read_bytes())
                source=json.loads((root/result["source_manifest"]["path"]).read_bytes())
                route_ids={row["id"] for row in network["routes"]}
                self.assertEqual(route_ids,{"foot-10-0","vehicle-loop-0"}|({"vehicle-boundary-flow-0"} if declined=="boundary-positive" else set()),result["rejections"])
                self.assertEqual(route_ids,{row["route_id"] for row in result["support_samples"]})
                self.assertEqual(route_ids,{row["route_id"] for row in source["source_corridor_profiles"]})
                for record in result["support_samples"]+source["source_corridor_profiles"]:
                    payload=(root/record["path"]).read_bytes()
                    self.assertEqual(len(payload),record["bytes"])
                    self.assertEqual(surface.sha(payload),record["sha256"])
                self.assertEqual(result["totals"]["pedestrian_routes"],1)
                self.assertEqual(result["totals"]["vehicle_closed_routes"],1)
                self.assertEqual(result["totals"]["vehicle_boundary_flows"],int(declined=="boundary-positive"))
                self.last_network=network
                return result

    def test_normal_caller_declined_short_pedestrian_keeps_only_accepted_profiles(self):
        result=self.call_movement("pedestrian")
        self.assertEqual(result["rejections"]["pedestrian-short-route"],1)
        self.assertEqual(result["pedestrian_route_refusals"][0]["route_id"],"foot-11-0")

    def test_normal_caller_declined_short_cycle_keeps_only_accepted_profiles(self):
        result=self.call_movement("cycle")
        self.assertGreaterEqual(result["rejections"]["vehicle-cycle-too-short"],1)

    def test_normal_caller_declined_boundary_height_keeps_only_accepted_profiles(self):
        result=self.call_movement("boundary")
        self.assertGreaterEqual(result["rejections"]["vehicle-boundary-flow:boundary-flow-endpoint-height-does-not-match-route"],1)

    def test_normal_caller_publishes_trimmed_boundary_with_whole_source_authorities(self):
        result=self.call_movement("boundary-positive")
        row=next(r for r in self.last_network["routes"] if "boundary_flow" in r)
        self.assertEqual(row["points"][0],[2.21,20.,0.]);self.assertEqual(row["points"][-1],[7.79,20.,0.])
        self.assertEqual(row["source_lane_segments"][0]["lane_points"],[[0.,20.],[5.,20.]])
        self.assertEqual(row["source_lane_segments"][-1]["lane_points"],[[5.,20.],[10.,20.]])
        self.assertAlmostEqual(result["totals"]["unique_vehicle_lane_length_m"],165.58)


if __name__=="__main__":unittest.main()
