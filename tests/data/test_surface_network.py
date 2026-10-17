"""Bound: admitted photo/UV/geometry and measured source-route support.

These offline checks require the explicit fresh source/prepared outputs. They do
not download, skip missing inputs, prove native rendering or surveyed accuracy.
"""
import importlib.util
import io
import json
import math
import pathlib
import sys
import tempfile
import subprocess
import contextlib
import stat
import types
import xml.etree.ElementTree as ET
import unittest
from unittest import mock

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("surface_network",ROOT/"tools/data/surface_network.py")
surface=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=surface
spec.loader.exec_module(surface)
np=surface.np


class SourceRepairs(unittest.TestCase):
    def test_cli_conflicting_modes_fail_before_fetch_or_output(self):
        flags=("--photo-only","--network-only","--roads-only")
        combinations=[(flags[0],flags[1]),(flags[0],flags[2]),(flags[1],flags[2]),flags]
        for combination in combinations:
            with self.subTest(flags=combination),contextlib.ExitStack() as stack:
                output=io.StringIO()
                stack.enter_context(contextlib.redirect_stderr(output))
                actions=[stack.enter_context(mock.patch.object(surface,name)) for name in ("fetch_sources","verify_base","photo_ground","road_photos","movement_network","guarded_write","admit_path")]
                with self.assertRaises(SystemExit) as result:
                    surface.main(["--fetch",*combination])
                self.assertEqual(result.exception.code,2)
                self.assertIn("not allowed with argument",output.getvalue())
                for action in actions:
                    action.assert_not_called()

    def test_cli_default_and_single_modes_perform_only_requested_work(self):
        base={}
        photo=mock.call.photo(base,ROOT/"data/prepared/terrain.glb")
        support=mock.call.support(base,construction_seconds=110.,total_seconds=150.)
        cases=(([],[photo,support,mock.call.movement(base)]),
               (["--photo-only"],[photo]),
               (["--network-only"],[mock.call.movement(base)]),
               (["--roads-only"],[mock.call.roads(base)]),
               (["--support-only"],[support]),
               (["--support-only","--support-edits","data/source/fixture-edits.json"],
                [mock.call.edits(surface,base,pathlib.Path("data/source/fixture-edits.json"),total_seconds=150.)]),
               (["--reprofile-frozen"],[mock.call.reprofile(base)]),
               (["--vehicle-graph-only"],[mock.call.movement(base,vehicle_graph_only=True)]))
        for flags,expected in cases:
            with self.subTest(flags=flags),mock.patch.object(surface,"verify_base",return_value=base),mock.patch.object(surface,"guarded_write"),contextlib.redirect_stdout(io.StringIO()),contextlib.ExitStack() as stack:
                actions=mock.Mock()
                for attribute,name,result in (("photo_ground","photo",{"terrain_photo":{},"image":{},"imagery_tiles":[]}),
                                              ("road_photos","roads",{"totals":{}}),
                                              ("prepare_support_surface","support",{"evidence":{}}),
                                              ("movement_network","movement",{"totals":{}}),
                                              ("reprofile_frozen_network","reprofile",{"totals":{}})):
                    action=stack.enter_context(mock.patch.object(surface,attribute,return_value=result))
                    actions.attach_mock(action,name)
                edits=stack.enter_context(mock.patch.object(surface.support_source3,"prepare",return_value={"evidence":{}}))
                actions.attach_mock(edits,"edits")
                surface.main(flags)
                self.assertEqual(actions.mock_calls,expected)

    def test_actual_review_no_and_only_turn_witnesses_are_blocked(self):
        policy=surface.TurnRestrictions(surface.osm_tree())
        self.assertEqual(len(policy.rules),49)
        witnesses=[(12589764,213526435,1685221014,41857237),(15352574,1134562281,291758776,1134562282),(15354393,1112568718,252675828,1110356210),(17304309,968189472,356644262,1074238465)]
        for relation,from_way,via,to_way in witnesses:
            result=policy.rejection({"way_id":from_way,"from":-1,"to":via},{"way_id":to_way,"from":via,"to":-2})
            self.assertIsNotNone(result)
            self.assertEqual(result["relation_id"],relation)
        for from_way,via,to_way in ((1112568718,252675828,1106270530),(968189472,356644262,1257445135)):
            self.assertIsNone(policy.rejection({"way_id":from_way,"from":-1,"to":via},{"way_id":to_way,"from":via,"to":-2}))

    def test_unknown_conditional_via_way_and_incomplete_restrictions_fail_closed(self):
        tree=ET.fromstring('<osm><relation id="1"><member type="way" role="from" ref="10"/><member type="node" role="via" ref="20"/><member type="way" role="to" ref="30"/><tag k="type" v="restriction"/><tag k="restriction:conditional" v="only_left_turn @ (08:00-20:00)"/></relation><relation id="2"><member type="way" role="from" ref="11"/><member type="way" role="via" ref="31"/><member type="way" role="to" ref="41"/><tag k="type" v="restriction"/><tag k="restriction" v="no_right_turn"/></relation><relation id="3"><member type="node" role="via" ref="22"/><tag k="type" v="restriction"/></relation></osm>')
        policy=surface.TurnRestrictions(tree)
        for a,b in (({"way_id":10,"from":0,"to":20},{"way_id":99,"from":20,"to":1}),({"way_id":11,"from":0,"to":21},{"way_id":31,"from":21,"to":1}),({"way_id":12,"from":0,"to":22},{"way_id":32,"from":22,"to":1})):
            self.assertIsNotNone(policy.rejection(a,b))
        self.assertIsNone(policy.rejection({"way_id":11,"from":0,"to":21},{"way_id":99,"from":21,"to":1}))

    def test_no_and_only_u_turn_distinguish_same_way_continuation(self):
        for rule in ("no_u_turn","only_u_turn"):
            tree=ET.fromstring(f'<osm><relation id="1"><member type="way" role="from" ref="10"/><member type="node" role="via" ref="20"/><member type="way" role="to" ref="10"/><tag k="type" v="restriction"/><tag k="restriction" v="{rule}"/></relation></osm>')
            policy=surface.TurnRestrictions(tree)
            incoming={"way_id":10,"from":19,"to":20}
            reverse={"way_id":10,"from":20,"to":19}
            continuation={"way_id":10,"from":20,"to":21}
            self.assertEqual(policy.rejection(incoming,reverse) is not None,rule=="no_u_turn")
            self.assertEqual(policy.rejection(incoming,continuation) is not None,rule=="only_u_turn")

    @staticmethod
    def junction(link,target):
        if sys.platform=="win32":
            result=subprocess.run(["cmd","/c","mklink","/J",str(link),str(target)],capture_output=True,text=True,timeout=10,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
            if result.returncode:
                raise AssertionError(f"Owned junction fixture could not be created: {result.stderr}")
        else:
            link.symlink_to(target,target_is_directory=True)

    def test_real_parent_and_leaf_junctions_cannot_read_write_delete_external_sentinel(self):
        with tempfile.TemporaryDirectory(dir=ROOT/"data") as directory:
            fixture=pathlib.Path(directory)
            cache,outside=fixture/"fresh",fixture/"outside"
            cache.mkdir();outside.mkdir()
            sentinel=outside/"tile.bin"
            sentinel.write_bytes(b"owned external sentinel")
            link=cache/"redirect"
            self.junction(link,outside)
            try:
                redirected=link/"tile.bin"
                for operation in (lambda:surface.guarded_read(redirected,cache),lambda:surface.guarded_write(redirected,b"overwrite",cache),lambda:surface.guarded_unlink(redirected,cache),lambda:surface.guarded_mkdir(link,cache)):
                    with self.assertRaisesRegex(ValueError,"symlink or reparse point"):
                        operation()
                    self.assertEqual(sentinel.read_bytes(),b"owned external sentinel")
            finally:
                link.rmdir() if sys.platform=="win32" else link.unlink()
            # The normal path remains usable after the exact junction is removed.
            ordinary=cache/"normal.bin"
            surface.guarded_write(ordinary,b"normal",cache)
            self.assertEqual(surface.guarded_read(ordinary,cache),b"normal")
            surface.guarded_unlink(ordinary,cache)
            self.assertFalse(ordinary.exists())

    def test_file_leaf_reparse_branch_regular_size_and_inspection_errors(self):
        with tempfile.TemporaryDirectory(dir=ROOT/"data") as directory:
            root=pathlib.Path(directory)
            path=root/"ordinary.bin";path.write_bytes(b"12345678")
            real_lstat=pathlib.Path.lstat
            def synthetic_leaf(candidate,*args,**kwargs):
                if candidate==path:
                    return types.SimpleNamespace(st_mode=stat.S_IFREG,st_file_attributes=0x400)
                return real_lstat(candidate,*args,**kwargs)
            with mock.patch.object(pathlib.Path,"lstat",synthetic_leaf):
                for action in (lambda:surface.guarded_read(path,root),lambda:surface.guarded_write(path,b"bad",root),lambda:surface.guarded_unlink(path,root)):
                    with self.assertRaisesRegex(ValueError,"symlink or reparse point"):
                        action()
            self.assertEqual(path.read_bytes(),b"12345678")
            with self.assertRaisesRegex(ValueError,"before allocation"):
                surface.guarded_read(path,root,4)
            with self.assertRaisesRegex(ValueError,"regular file"):
                surface.guarded_read(root,root)
            with mock.patch.object(pathlib.Path,"lstat",side_effect=PermissionError("owned inspection control")),self.assertRaisesRegex(ValueError,"Cannot inspect"):
                surface.guarded_read(path,root)
            for escaped in (root.parent/"outside.bin",root/"file.bin:alternate-stream"):
                with self.assertRaises(ValueError):
                    surface.guarded_read(escaped,root)

    def test_fetch_guard_rejects_junction_before_network_or_cleanup(self):
        with tempfile.TemporaryDirectory(dir=ROOT/"data") as directory:
            fixture=pathlib.Path(directory)
            owned,outside=fixture/"owned",fixture/"outside"
            (owned/"data/source/osm").mkdir(parents=True);outside.mkdir()
            link=owned/"data/source/gsi"
            self.junction(link,outside)
            config=json.loads(json.dumps(surface.CONFIG));config["osm"]["path"]="data/source/osm/crop.osm"
            (owned/config["osm"]["path"]).write_bytes(b"cached")
            config["osm"]["sha256"]=surface.sha(b"cached")
            try:
                with mock.patch.object(surface,"ROOT",owned),mock.patch.object(surface,"CONFIG",config),mock.patch.object(surface.socket,"getaddrinfo",return_value=[(0,0,0,0,("127.0.0.1",443))]),mock.patch.object(surface.subprocess,"run") as download:
                    with self.assertRaisesRegex(ValueError,"symlink or reparse point"):
                        surface.fetch_sources()
                    download.assert_not_called()
            finally:
                link.rmdir() if sys.platform=="win32" else link.unlink()

    def test_failed_fetch_removes_only_owned_temporary_not_final_tile(self):
        with tempfile.TemporaryDirectory(dir=ROOT/"data") as directory:
            root=pathlib.Path(directory)
            (root/"data/source/osm").mkdir(parents=True)
            config=json.loads(json.dumps(surface.CONFIG));config["osm"]["path"]="data/source/osm/crop.osm"
            (root/config["osm"]["path"]).write_bytes(b"cached");config["osm"]["sha256"]=surface.sha(b"cached")
            with mock.patch.object(surface,"ROOT",root),mock.patch.object(surface,"CONFIG",config),mock.patch.object(surface.socket,"getaddrinfo",return_value=[(0,0,0,0,("127.0.0.1",443))]),mock.patch.object(surface.subprocess,"run",side_effect=subprocess.TimeoutExpired("owned curl control",20)):
                with self.assertRaises(subprocess.TimeoutExpired):
                    surface.fetch_sources()
            self.assertEqual(list((root/"data/source/gsi/imagery").rglob("*.download")),[])
            self.assertEqual(list((root/"data/source/gsi/imagery").rglob("*.jpg")),[])

    def test_guarded_glb_serializer_byte_identity_and_failed_promotion_cleanup(self):
        with tempfile.TemporaryDirectory(dir=ROOT/"data/prepared") as directory:
            root=pathlib.Path(directory)
            for size in (1,2,3,4):
                before=surface.city.GlbWriter();after=surface.city.GlbWriter()
                before.view(b"a"*size);after.view(b"a"*size)
                before.save(root/"base.glb")
                with mock.patch.object(surface,"OUT",root):
                    surface.save_glb(after,root/"guarded.glb")
                self.assertEqual((root/"base.glb").read_bytes(),(root/"guarded.glb").read_bytes())
            target=root/"original.bin";target.write_bytes(b"retain existing target")
            with mock.patch.object(surface.os,"replace",side_effect=OSError("controlled promotion failure")):
                with self.assertRaisesRegex(OSError,"controlled promotion failure"):
                    surface.guarded_write(target,b"new output",root)
            self.assertEqual(target.read_bytes(),b"retain existing target")
            self.assertEqual(list(root.glob("*.tmp")),[])


class PhotoGround(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base=surface.verify_base(ROOT/"data/prepared/manifest.json")
        cls.original=(ROOT/"data/prepared/terrain.glb").read_bytes()
        cls.photo=(surface.OUT/"terrain-photo.glb").read_bytes()
        cls.old_doc,cls.old_binary=surface.city.read_glb(cls.original)
        cls.doc,cls.binary=surface.city.read_glb(cls.photo)

    def test_fixed_geographic_corner_tiles_and_denominator(self):
        # Independent numeric witnesses from the official XYZ WebMercator
        # specification, preserving the AOI while correcting manual y bounds.
        bounds=self.base["bounds"]
        self.assertEqual(bounds,{"south":35.655,"north":35.664,"west":139.695,"east":139.706})
        witnesses=[(35.664,139.695,(232794.794666667,103241.991854079)),(35.664,139.706,(232802.804622222,103241.991854079)),(35.655,139.695,(232794.794666667,103250.057864972)),(35.655,139.706,(232802.804622222,103250.057864972))]
        for latitude,longitude,expected in witnesses:
            self.assertTrue(np.allclose(surface.city.tile_xy(latitude,longitude,18),expected,atol=1e-7,rtol=0))
        self.assertEqual(surface.tile_range(bounds,18),(232794,103241,232802,103250))
        files=list((ROOT/"data/source/gsi/imagery/18").glob("*/*.jpg"))
        self.assertEqual(len(files),90)
        for x,y in ((232794,103241),(232802,103241),(232794,103250),(232802,103250),(232798,103246)):
            self.assertTrue((ROOT/f"data/source/gsi/imagery/18/{x}/{y}.jpg").is_file())

    def test_original_terrain_all_accessor_bytes_preserved(self):
        self.assertEqual(surface.sha(self.original),"799d6aea4b213ee284c831d981953ab307eb469ee87e24e55d7138b7d8f1746e")
        self.assertEqual(self.doc["accessors"],self.old_doc["accessors"])
        self.assertEqual(self.doc["meshes"],self.old_doc["meshes"])
        for index in range(len(self.old_doc["accessors"])):
            self.assertEqual(surface.accessor(self.old_doc,self.old_binary,index).tobytes(),surface.accessor(self.doc,self.binary,index).tobytes())
        self.assertEqual(self.doc["nodes"],self.old_doc["nodes"])
        self.assertEqual(self.doc["scenes"],self.old_doc["scenes"])

    def test_uv_geo_orientation_and_fixed_corner_witnesses(self):
        primitive=self.doc["meshes"][0]["primitives"][0]
        uv=surface.accessor(self.doc,self.binary,primitive["attributes"]["TEXCOORD_0"])
        # Terrain vertex order starts southwest; V increases toward south.
        sw=[(232794.794666667-232794)/9,(103250.057864972-103241)/10]
        se=[(232802.804622222-232794)/9,sw[1]]
        nw=[sw[0],(103241.991854079-103241)/10]
        ne=[se[0],nw[1]]
        self.assertTrue(np.allclose(uv[[0,200,40200,40400]],[sw,se,nw,ne],atol=1e-7,rtol=0))
        self.assertTrue(np.all(uv>=0) and np.all(uv<=1))
        self.assertLess(uv[40200,1],uv[0,1])
        self.assertLess(uv[0,0],uv[200,0])

    def test_mosaic_pixels_match_every_source_tile_without_flip(self):
        from PIL import Image
        image=Image.open(surface.OUT/"terrain-aerial.png")
        self.assertEqual(image.size,(2304,2560))
        for x in range(232794,232803):
            for y in range(103241,103251):
                with Image.open(ROOT/f"data/source/gsi/imagery/18/{x}/{y}.jpg") as source:
                    a=np.asarray(image.crop(((x-232794)*256,(y-103241)*256,(x-232793)*256,(y-103240)*256)))
                    self.assertTrue(np.array_equal(a,np.asarray(source.convert("RGB"))))

    def test_native_texture_schema_and_embedded_png_digest(self):
        surface.city.validate_native_textures(self.doc,self.binary)
        image=self.doc["images"][0]
        view=self.doc["bufferViews"][image["bufferView"]]
        first=view.get("byteOffset",0)
        payload=self.binary[first:first+view["byteLength"]]
        self.assertEqual(surface.sha(payload),"b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58")
        self.assertEqual(payload,(surface.OUT/"terrain-aerial.png").read_bytes())


class SourceAdmissions(unittest.TestCase):
    def test_real_barycentric_height_and_unsupported_fallback(self):
        road=surface.RoadSupport.__new__(surface.RoadSupport)
        road.triangles=np.array([[[0,0,0],[10,0,1],[0,10,2]],[[0,0,10],[10,0,11],[0,10,12]]],dtype=float)
        road.bins={(0,0):[0,1]}
        height,index,barycentric=road.height(2,3,.8)
        self.assertAlmostEqual(height,.8)
        self.assertEqual(index,0)
        self.assertTrue(np.allclose(barycentric,[.5,.2,.3]))
        self.assertIsNone(road.height(8,8,0))
        self.assertIsNone(road.height(2,3,5))

    def test_building_interior_crossing_is_rejected(self):
        polygon=[[0,0],[10,0],[10,10],[0,10]]
        self.assertTrue(surface.point_inside([5,5],polygon))
        self.assertFalse(surface.point_inside([-1,5],polygon))
        s=surface.Surface.__new__(surface.Surface)
        s.building_bins={(0,0):[0]}
        s.buildings=[{"polygon":polygon}]
        with self.assertRaisesRegex(ValueError,"building-interior"):
            s.check([5,5],"pedestrian")

    def test_modes_deny_private_tunnels_bridges_and_motorways(self):
        for tags in ({"highway":"footway","access":"private"},{"highway":"footway","tunnel":"yes"},{"highway":"footway","bridge":"yes"},{"highway":"footway","level":"-1"}):
            self.assertFalse(surface.allowed_way(tags,"pedestrian")[0])
        self.assertFalse(surface.allowed_way({"highway":"motorway"},"pedestrian")[0])
        self.assertFalse(surface.allowed_way({"highway":"footway"},"vehicle")[0])
        self.assertFalse(surface.allowed_way({"highway":"service","motor_vehicle":"no"},"vehicle")[0])
        self.assertTrue(surface.allowed_way({"highway":"footway","footway":"crossing"},"pedestrian")[0])

    def test_connected_cycle_does_not_fabricate_u_turn(self):
        graph={2:[{"id":"reverse","to":1,"way_id":100,"length":10},{"id":"side1","to":3,"way_id":101,"length":10}],3:[{"id":"side2","to":1,"way_id":102,"length":10}]}
        self.assertEqual(surface.return_path(graph,2,1,100),["side1","side2"])
        self.assertIsNone(surface.return_path({2:graph[2][:1]},2,1,100))
        same_way_cycle={2:[{"id":"continue","to":3,"way_id":100,"length":10}],3:[{"id":"other-road","to":1,"way_id":102,"length":10}]}
        self.assertEqual(surface.return_path(same_way_cycle,2,1,100),["continue","other-road"])

    def test_source_one_way_lane_centres_and_conditional_access(self):
        self.assertEqual(surface.lane_offset({"oneway":"yes","lanes":"1"}),0)
        self.assertEqual(surface.lane_offset({"oneway":"-1","lanes":"1"}),0)
        self.assertEqual(surface.lane_offset({"oneway":"yes","lanes":"2"}),.9)
        self.assertEqual(surface.lane_offset({"oneway":"yes","lanes":"3"}),1.8)
        self.assertEqual(surface.lane_offset({"lanes":"4"}),1.8)
        self.assertFalse(surface.allowed_way({"highway":"unclassified","motor_vehicle:conditional":"no @ (15:00-05:00)"},"vehicle")[0])

    def test_lane_graph_chooses_admitted_turns_without_rejecting_whole_way(self):
        edges={key:{"length":10} for key in ("a","b","c","d")}
        # The shorter node-level route through b has no admitted closure turn.
        turns={"a":["b","c"],"b":[],"c":["d"],"d":["a"]}
        self.assertEqual(surface.lane_cycle(turns,edges,"a"),["a","c","d"])
        self.assertIsNone(surface.lane_cycle({"a":["b"],"b":["a"]},edges,"a"))

    def test_dem_requires_pinned_bytes_and_never_fetches_missing_source(self):
        base=surface.verify_base(ROOT/"data/prepared/manifest.json")
        with mock.patch.object(pathlib.Path,"is_file",return_value=False),mock.patch.object(surface.city,"fetch_url") as download:
            with self.assertRaisesRegex(ValueError,"required|Required"):
                surface.admitted_elevation(base)
            download.assert_not_called()
        changed=json.loads(json.dumps(base))
        first=next(key for key in changed["source_verification"]["additional_sources"] if "/dem5a/" in key)
        changed["source_verification"]["additional_sources"][first]["sha256"]="0"*64
        with self.assertRaisesRegex(ValueError,"differ from the admitted"):
            surface.admitted_elevation(changed)


class SharedRoadPhoto(unittest.TestCase):
    def test_all25_road_geometry_normals_indices_and_transforms_preserved(self):
        manifest=json.loads((surface.OUT/"road-photo-manifest.json").read_bytes())
        self.assertEqual(manifest["totals"],{"assets":25,"triangles":50033,"vertices":150099})
        self.assertEqual(manifest["shared_atlas"]["sha256"],"b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58")
        base=surface.verify_base(ROOT/"data/prepared/manifest.json")
        for record in manifest["outputs"]:
            original=(ROOT/record["original"]["path"]).read_bytes()
            generated=(ROOT/record["generated"]["path"]).read_bytes()
            self.assertEqual(surface.sha(original),record["original"]["sha256"])
            self.assertEqual(surface.sha(generated),record["generated"]["sha256"])
            old,old_binary=surface.city.read_glb(original)
            new,new_binary=surface.city.read_glb(generated)
            self.assertEqual(old["nodes"],new["nodes"])
            self.assertEqual(old["scenes"],new["scenes"])
            for old_mesh,new_mesh in zip(old["meshes"],new["meshes"]):
                for before,after in zip(old_mesh["primitives"],new_mesh["primitives"]):
                    self.assertEqual(before["indices"],after["indices"])
                    self.assertEqual(surface.accessor(old,old_binary,before["indices"]).tobytes(),surface.accessor(new,new_binary,after["indices"]).tobytes())
                    for key in ("POSITION","NORMAL"):
                        self.assertEqual(before["attributes"][key],after["attributes"][key])
                        self.assertEqual(surface.accessor(old,old_binary,before["attributes"][key]).tobytes(),surface.accessor(new,new_binary,after["attributes"][key]).tobytes())
                    points=surface.accessor(old,old_binary,before["attributes"]["POSITION"])
                    uv=surface.accessor(new,new_binary,after["attributes"]["TEXCOORD_0"])
                    self.assertTrue(np.allclose(uv,surface.geographic_uv(points,base),atol=5e-8,rtol=0))
                    self.assertTrue(np.all((uv>=0)&(uv<=1)))
            # Photos must not be independently copied into every road GLB.
            self.assertEqual(new.get("images",[]),[])
            self.assertEqual(new.get("textures",[]),[])

    def test_geo_road_uv_heldout_terrain_and_corner_witnesses(self):
        base=surface.verify_base(ROOT/"data/prepared/manifest.json")
        doc,binary=surface.city.read_glb((ROOT/"data/prepared/terrain.glb").read_bytes())
        primitive=doc["meshes"][0]["primitives"][0]
        points=surface.accessor(doc,binary,primitive["attributes"]["POSITION"])
        uv=surface.accessor(doc,binary,primitive["attributes"]["TEXCOORD_0"])
        # These held-out source-terrain vertices never build the road UVs.
        heldout=[0,200,40200,40400,16312,25674,20156]
        self.assertTrue(np.allclose(surface.geographic_uv(points[heldout],base),uv[heldout],atol=1e-7,rtol=0))
        origin_height=base["origin"]["ellipsoidal_height_m"]
        point=surface.city.localize([surface.city.ecef(35.6595,139.7005,origin_height)],origin_height)
        actual=surface.geographic_uv(point,base)[0]
        self.assertTrue(np.allclose(actual,[(232798.79964444446-232794)/9,(103246.02497316021-103241)/10],atol=1e-9,rtol=0))


class MeasuredMovement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base=surface.verify_base(ROOT/"data/prepared/manifest.json")
        cls.manifest=json.loads((surface.OUT/"movement-manifest.json").read_bytes())["movement"]
        cls.network=json.loads((surface.OUT/"movement-network.json").read_bytes())
        cls.nodes,cls.points,ways,buildings=surface.osm_sources(cls.base)
        cls.ways={row["id"]:row for row in ways}
        cls.support=surface.Surface(cls.base,buildings)

    def test_every_route_has_fresh_byte_bound_corridor_support(self):
        records={row["route_id"]:row for row in self.manifest["support_samples"]}
        source=(surface.OUT/"movement-source-manifest.json").read_bytes()
        self.assertEqual(surface.sha(source),self.network["source_manifest_sha256"])
        count=0
        for route in self.network["routes"]:
            payload=(ROOT/records[route["id"]]["path"]).read_bytes()
            self.assertEqual(surface.sha(payload),records[route["id"]]["sha256"])
            self.assertEqual(surface.sha(payload),route["support"]["samples_sha256"])
            samples=json.loads(payload)
            self.assertEqual(len(samples),len(route["points"]))
            self.assertEqual(len(samples),route["support"]["sample_count"])
            for point,sample in zip(route["points"],samples):
                self.assertTrue(np.allclose(point,sample["point"],atol=1e-9,rtol=0))
                self.assertEqual(len(sample["cross_section"]),3)
                for proof in sample["cross_section"]:
                    self.assertAlmostEqual(math.dist(proof["point"][:2],point[:2]),abs(proof["offset_m"]),places=6)
                    self.assertLessEqual(abs(proof["point"][2]-point[2]),.5)
                    p=proof["point"]
                    # Independent interpolation uses actual imported-source
                    # triangle bytes, rather than trusting a verified flag.
                    if proof["source"]=="PLATEAU-road":
                        actual=np.asarray(proof["barycentric"])@self.support.road.triangles[proof["triangle"]]
                        self.assertTrue(np.allclose(p,actual,atol=1e-4,rtol=0))
                    else:
                        self.assertEqual(route["kind"],"pedestrian")
                        self.assertAlmostEqual(p[2],self.support.dem_height(p[:2]),places=7)
                    # Full source population, including declared width edges,
                    # must remain outside independently admitted building ways.
                    indices=self.support.building_bins.get((math.floor(p[0]/12),math.floor(p[1]/12)),[])
                    for index in indices:
                        self.assertFalse(surface.point_inside(p[:2],self.support.buildings[index]["polygon"]))
                    count+=1
        self.assertGreater(count,30000)

    def test_all_segments_are_dense_grounded_and_vehicle_closure_is_explicit(self):
        for route in self.network["routes"]:
            self.assertTrue(route["support"]["verified"])
            for a,b in zip(route["points"],route["points"][1:]):
                self.assertLessEqual(math.dist(a,b),2)
                distance=math.dist(a[:2],b[:2])
                if distance>1e-6:
                    self.assertLessEqual(abs(a[2]-b[2])/distance,.2+1e-7 if route["kind"]=="vehicle" else .6+1e-7)
            if route["kind"]=="vehicle":
                if route["closed"]:
                    self.assertLessEqual(math.dist(route["points"][0],route["points"][-1]),1e-6)
                    self.assertEqual(route["points"][0],route["points"][-1])
                else:
                    self.assertIn("boundary_flow",route)
                    self.assertGreater(math.dist(route["points"][0],route["points"][-1]),500)

    def test_every_pedestrian_centre_remains_on_the_declared_mapped_way(self):
        for route in self.network["routes"]:
            if route["kind"]!="pedestrian":
                continue
            way=self.ways[route["source_way_ids"][0]]
            self.assertTrue(surface.allowed_way(way["tags"],"pedestrian")[0])
            geometry=np.array([self.points[id] for id in way["nodes"]])
            a,b=geometry[:-1],geometry[1:]
            delta=b-a
            lengths=(delta*delta).sum(axis=1)
            for point in route["points"]:
                t=np.divide(((np.array(point[:2])-a)*delta).sum(axis=1),lengths,out=np.zeros(len(lengths)),where=lengths>0)
                nearest=a+np.clip(t,0,1)[:,None]*delta
                distance=np.linalg.norm(nearest-point[:2],axis=1).min()
                self.assertLess(distance,1e-5)

    def test_real_directed_block_cycles_and_measured_japanese_left_lanes(self):
        for route in self.network["routes"]:
            if route["kind"]!="vehicle":
                continue
            pieces=route["source_lane_segments"]
            self.assertGreaterEqual(len(pieces),3)
            for piece,next_piece in zip(pieces,pieces[1:]+(pieces[:1] if route["closed"] else [])):
                self.assertEqual(piece["to_osm_node"],next_piece["from_osm_node"])
                self.assertNotEqual(piece["from_osm_node"],next_piece["to_osm_node"])
                way=self.ways[piece["way_id"]]
                a,b=piece["from_osm_node"],piece["to_osm_node"]
                pairs=list(zip(way["nodes"],way["nodes"][1:]))
                if way["tags"].get("oneway") in ("yes","1","true"):
                    self.assertIn((a,b),pairs)
                elif way["tags"].get("oneway")=="-1":
                    self.assertIn((b,a),pairs)
                else:
                    self.assertTrue((a,b) in pairs or (b,a) in pairs)
                delta=np.asarray(self.points[b])-self.points[a]
                left=np.array([-delta[1],delta[0]])/np.linalg.norm(delta)
                for actual,original in zip(piece["lane_points"],[self.points[a],self.points[b]]):
                    shift=np.asarray(actual)-original
                    self.assertAlmostEqual(float(shift@left),piece["left_offset_m"],places=7)
                    self.assertAlmostEqual(float(shift@delta),0,places=6)

    def test_population_capacity_crossing_visibility_and_safe_spawn(self):
        self.assertEqual(self.network["default_population"],{"pedestrian_count":3000,"vehicle_count":200})
        capacity=self.network["population_support"]
        self.assertGreater(capacity["unique_pedestrian_corridor_length_m"],6000)
        self.assertGreaterEqual(capacity["vehicle_unique_lane_static_capacity"],200)
        crossing_car=min(math.hypot(p[0],p[1]) for r in self.network["routes"] if r["kind"]=="vehicle" for p in r["points"])
        self.assertLess(crossing_car,30,"A supported directed vehicle cycle must actually approach the recognizable crossing")
        self.assertTrue(self.network["signals"])
        spawn=self.network["default_spawn"]
        self.assertLess(math.hypot(spawn[0],spawn[1]),80)
        for r in self.network["routes"]:
            if r["kind"]=="vehicle":
                self.assertGreaterEqual(min(math.dist(spawn[:2],p[:2]) for p in r["points"]),3.5)
        for degrees in range(0,360,45):
            probe=[spawn[0]+.8*math.cos(math.radians(degrees)),spawn[1]+.8*math.sin(math.radians(degrees))]
            actual,_=self.support.check(probe,"pedestrian")
            self.assertLessEqual(abs(actual[2]-spawn[2]),.3)

    def test_every_vehicle_turn_including_closure_obeys_raw_osm_relations(self):
        # Parse raw admitted XML independently of TurnRestrictions.rejection.
        raw=ET.fromstring((ROOT/surface.CONFIG["osm"]["path"]).read_bytes())
        relations=[]
        for relation in raw.findall("relation"):
            tags={tag.attrib["k"]:tag.attrib["v"] for tag in relation.findall("tag")}
            if not tags.get("type","").startswith("restriction"):
                continue
            members=[(m.attrib["role"],m.attrib["type"],int(m.attrib["ref"])) for m in relation.findall("member")]
            relations.append((int(relation.attrib["id"]),tags,members))
        self.assertEqual(len(relations),49)
        failures=[]
        for route in self.network["routes"]:
            if route["kind"]!="vehicle":
                continue
            pieces=route["source_lane_segments"]
            for a,b in zip(pieces,pieces[1:]+(pieces[:1] if route["closed"] else [])):
                via=a["to_osm_node"]
                for id,tags,members in relations:
                    source=[ref for role,kind,ref in members if role=="from" and kind=="way"]
                    destination=[ref for role,kind,ref in members if role=="to" and kind=="way"]
                    nodes=[ref for role,kind,ref in members if role=="via" and kind=="node"]
                    ways=[ref for role,kind,ref in members if role=="via" and kind=="way"]
                    rule=tags.get("restriction",tags.get("restriction:motorcar",tags.get("restriction:motor_vehicle","")))
                    simple=len(members)==3 and len(source)==len(destination)==len(nodes)==1 and not ways and not tags.get("except") and not any("conditional" in key for key in tags) and rule in {"no_left_turn","no_right_turn","no_straight_on","no_u_turn","no_entry","no_exit","only_left_turn","only_right_turn","only_straight_on","only_u_turn"}
                    if simple:
                        if a["way_id"] not in source or via not in nodes:
                            continue
                        match=b["way_id"] in destination and ("u_turn" not in rule or b["to_osm_node"]==a["from_osm_node"])
                        forbidden=(rule.startswith("no_") and match) or (rule.startswith("only_") and not match)
                    elif source:
                        forbidden=a["way_id"] in source and (b["way_id"] in ways if ways else not nodes or via in nodes)
                    else:
                        named_nodes={ref for _,kind,ref in members if kind=="node"}
                        named_ways={ref for _,kind,ref in members if kind=="way"}
                        forbidden=via in named_nodes or a["way_id"] in named_ways or b["way_id"] in named_ways
                    if forbidden:
                        failures.append((route["id"],id,a["way_id"],via,b["way_id"]))
        self.assertEqual(failures,[],f"Source-forbidden directed turns remain, including closure: {failures}")

    def test_crossing_stops_are_both_true_entries_with_explicit_direction(self):
        crossings=0
        for route in self.network["routes"]:
            tags=route["source_tags"]
            crossing=route["kind"]=="pedestrian" and (tags.get("footway")=="crossing" or tags.get("crossing") in ("traffic_signals","marked"))
            for stop in route["stops"]:
                self.assertIn(stop.get("direction"),(-1,1))
                self.assertTrue(any(signal["id"]==stop["signal_id"] for signal in self.network["signals"]))
            if crossing:
                crossings+=1
                length=sum(math.dist(a,b) for a,b in zip(route["points"],route["points"][1:]))
                self.assertEqual(len(route["stops"]),2)
                self.assertEqual(route["stops"][0]["distance_m"],0)
                self.assertEqual(route["stops"][0]["direction"],1)
                self.assertAlmostEqual(route["stops"][1]["distance_m"],length,places=7)
                self.assertEqual(route["stops"][1]["direction"],-1)
                self.assertEqual(route["stops"][0]["signal_id"],route["stops"][1]["signal_id"])
            elif route["kind"]=="vehicle":
                self.assertTrue(all(stop["direction"]==1 for stop in route["stops"]))
            else:
                self.assertEqual(route["stops"],[])
        self.assertGreater(crossings,0)

    def test_one_boundary_flow_has_original_outside_continuation_heading_and_full_body_support(self):
        flows=[route for route in self.network["routes"] if route["kind"]=="vehicle" and not route["closed"]]
        self.assertEqual(len(flows),1)
        flow=flows[0]
        contract=flow["boundary_flow"]
        bounds=self.base["bounds"]
        self.assertEqual(contract["crop_bounds"],bounds)
        self.assertEqual(contract["source_manifest_sha256"],self.network["source_manifest_sha256"])
        records={record["endpoint"]:record for record in self.manifest["boundary_support_samples"]}
        self.assertEqual(set(records),{"entry","exit"})
        def inside(point):
            return bounds["south"]<=point[0]<=bounds["north"] and bounds["west"]<=point[1]<=bounds["east"]
        for name,index in (("entry",0),("exit",-1)):
            endpoint=contract[name];point=np.asarray(endpoint["point"])
            self.assertTrue(np.array_equal(point,flow["points"][index]))
            tangent=np.asarray(endpoint["heading_enu"][:2])
            self.assertAlmostEqual(float(tangent@tangent),1,places=12)
            side=endpoint["boundary_side"]
            outward={"west":[-1,0],"east":[1,0],"south":[0,-1],"north":[0,1]}[side]
            self.assertGreater(float(tangent@outward)*(-1 if name=="entry" else 1),1e-6)
            piece=flow["source_lane_segments"][index]
            expected=np.asarray(piece["lane_points"][1])-piece["lane_points"][0]
            expected/=np.linalg.norm(expected)
            self.assertTrue(np.allclose(tangent,expected,atol=1e-12,rtol=0))
            self.assertEqual(endpoint["source_way_id"],piece["way_id"])
            self.assertEqual(endpoint["source_node_id"],piece["from_osm_node"] if name=="entry" else piece["to_osm_node"])
            continuation=endpoint["continuation"]
            way=self.ways[endpoint["source_way_id"]]
            pairs=set(zip(way["nodes"],way["nodes"][1:]))
            ids=continuation["source_node_ids"]
            self.assertEqual(ids[0],endpoint["source_node_id"])
            self.assertEqual(ids[-2:],[continuation["inside_node_id"],continuation["outside_node_id"]])
            for a,b in zip(ids,ids[1:]):
                self.assertTrue((a,b) in pairs or (b,a) in pairs)
            for role in ("inside","outside"):
                original=self.nodes[continuation[role+"_node_id"]]
                coordinate=[float(original.attrib["lat"]),float(original.attrib["lon"])]
                self.assertEqual(coordinate,continuation[role+"_wgs84"])
                self.assertEqual(inside(coordinate),role=="inside")
            a,b=map(np.asarray,(continuation["inside_wgs84"],continuation["outside_wgs84"]))
            intersection=np.asarray(continuation["boundary_wgs84"])
            t=float((intersection-a)@(b-a)/((b-a)@(b-a)))
            self.assertTrue(0<=t<=1)
            self.assertTrue(np.allclose(intersection,a+t*(b-a),atol=1e-10,rtol=0))
            self.assertAlmostEqual(intersection[0 if side in ("north","south") else 1],bounds[side],places=10)
            actual_latlon=endpoint["point_wgs84"]
            self.assertTrue(inside(actual_latlon))
            nearest=actual_latlon.copy();nearest[0 if side in ("north","south") else 1]=bounds[side]
            h=self.base["origin"]["ellipsoidal_height_m"]
            distance=math.dist(surface.city.ecef(*actual_latlon,h),surface.city.ecef(*nearest,h))
            self.assertLessEqual(distance,20)
            self.assertAlmostEqual(distance,endpoint["distance_to_crop_boundary_m"],places=4)
            body=endpoint["footprint"]
            self.assertEqual((body["length_m"],body["width_m"]),(4.4,1.8))
            payload=(ROOT/body["samples_path"]).read_bytes()
            self.assertEqual(surface.sha(payload),body["samples_sha256"])
            self.assertEqual(body["samples_sha256"],records[name]["sha256"])
            samples=json.loads(payload);self.assertEqual(len(samples),body["sample_count"])
            positions=[]
            for sample in samples:
                self.assertEqual(len(sample["cross_section"]),3)
                for proof in sample["cross_section"]:
                    self.assertEqual(proof["source"],"PLATEAU-road")
                    actual=np.asarray(proof["barycentric"])@self.support.road.triangles[proof["triangle"]]
                    self.assertTrue(np.allclose(actual,proof["point"],atol=1e-4,rtol=0))
                    positions.append(np.asarray(proof["point"][:2])-point[:2])
                    self.support.check(proof["point"][:2],"vehicle")
            positions=np.asarray(positions)
            longitudinal=positions@tangent
            lateral=positions@np.array([-tangent[1],tangent[0]])
            self.assertAlmostEqual(float(longitudinal.min()),-2.2,places=7)
            self.assertAlmostEqual(float(longitudinal.max()),2.2,places=7)
            self.assertAlmostEqual(float(lateral.min()),-.9,places=7)
            self.assertAlmostEqual(float(lateral.max()),.9,places=7)


if __name__=="__main__":
    unittest.main()
