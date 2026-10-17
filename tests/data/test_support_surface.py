"""Prototype source-height/UV preservation and exact footprint precedence."""
import json,pathlib,sys,unittest

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'tools/data'))
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'data/runtime'))
import support_surface as support


def eager_band_reference(terrain, roads, context):
    """Pre-optimization reconciliation, including labels on discarded bands."""
    footprints=[support.conflicting_road_footprint(terrain,road,context=context) for road in roads]
    footprints=[polygon for polygon in footprints if polygon]
    pieces=support.subtract_road_footprints(terrain,roads,conflicts_only=True,context=context)
    boundary=support.union_exterior(footprints)
    area=0.
    positive=support.signed_area(terrain)>0
    for band in support.exterior_bands(boundary):
        context.seed(band,'source-union-exterior-band-edge')
        polygon=[support.interpolate_row(terrain,point) for point in band]
        for point,row in zip(band,polygon):
            context.interpolation_event(point,row)
        for a,b in zip(terrain,terrain[1:]+terrain[:1]):
            if not polygon:
                break
            polygon=support._half_plane(polygon,a,b,positive,context=context)
        if polygon:
            area+=abs(support.signed_area(polygon))
            pieces.extend(support.triangulate(polygon))
    return pieces,{'union_exterior_segments':len(boundary),'restored_band_area_upper_bound_m2':area}


class SupportSurfaceTests(unittest.TestCase):
    def test_discarded_clearance_bands_need_no_exact_creating_operators(self):
        import support_topology
        terrain=[[0.,0.,2.],[4.,0.,2.],[0.,4.,2.]]
        road=[[-100.,-100.,0.],[100.,-100.,0.],[0.,100.,0.]]
        context=support_topology.CreatingLines(0,terrain)
        pieces,stats=support.reconciled_face(terrain,[road],context=context)
        self.assertEqual(pieces,[])
        self.assertEqual(stats['restored_band_area_upper_bound_m2'],0)
        self.assertFalse(any(line['kind']=='source-union-exterior-band-edge'
                             for line in context.lines.values()))

    def test_surviving_clearance_bands_keep_numeric_geometry_and_exact_events(self):
        import numpy as np
        import support_topology
        terrain=[[0.,0.,2.,0.,0.],[4.,0.,2.,1.,0.],[0.,4.,2.,0.,1.]]
        road=[[1.,-1.,0.],[1.,3.,0.],[3.,1.,0.]]
        old_context=support_topology.CreatingLines(0,terrain)
        expected,expected_stats=eager_band_reference(terrain,[road],old_context)
        context=support_topology.CreatingLines(0,terrain)
        actual,actual_stats=support.reconciled_face(terrain,[road],context=context)
        self.assertEqual(actual,expected)
        self.assertEqual(actual_stats,expected_stats)
        discarded,surviving=[],[]
        footprint=support.conflicting_road_footprint(terrain,road)
        for band in support.exterior_bands(support.union_exterior([footprint])):
            polygon=[support.interpolate_row(terrain,point) for point in band]
            for a,b in zip(terrain,terrain[1:]+terrain[:1]):
                if not polygon:
                    break
                polygon=support._half_plane(polygon,a,b,True)
            (surviving if polygon else discarded).append(band)
        self.assertTrue(discarded)
        self.assertTrue(surviving)
        shared={tuple(point) for band in discarded for point in band}&{tuple(point) for band in surviving for point in band}
        self.assertTrue(shared)
        self.assertTrue(any(old_context.labels[point]-context.labels[point] for point in shared))
        def retained_events(owner,pieces):
            return {tuple(row[:2]):owner.event(row)[0] for triangle in pieces for row in triangle
                    if owner.road_lines&owner.labels[tuple(row[:2])]}
        old_events=retained_events(old_context,expected)
        self.assertTrue(old_events)
        self.assertEqual(retained_events(context,actual),old_events)
        old_rows,old_ids,old_stats=old_context.refine(expected,np.zeros(2))
        rows,ids,stats=context.refine(actual,np.zeros(2))
        np.testing.assert_array_equal(rows,old_rows)
        np.testing.assert_array_equal(ids,old_ids)
        for field in ('input_faces','output_faces','registered_source_lines','shared_events',
                      'incident_creating_line_uses','refined_input_faces','introduced_subdivision_uses'):
            self.assertEqual(stats.get(field,0),old_stats.get(field,0),field)

    def test_union_exterior_does_not_restore_internal_triangle_fence(self):
        import numpy as np
        faces=[[[0,0],[1,0],[0,1]],[[1,1],[0,1],[1,0]]]
        boundary=support.union_exterior(faces)
        self.assertEqual(len(boundary),4)
        def covers_centre(edges):
            return any(support.triangle_height([p+[0] for p in tri],.5,.5) is not None
                       for band in support.exterior_bands(edges) for tri in support.triangulate(band))
        self.assertFalse(covers_centre(boundary))
        old=[edge for face in faces for edge in support.union_exterior([face])]
        self.assertTrue(covers_centre(old),"Old per-triangle bands must reproduce the internal fence")
        self.assertAlmostEqual(sum(np.linalg.norm(np.asarray(b)-a) for a,b in boundary),4)

    def test_union_exterior_duplicate_and_overlapping_sources(self):
        first=[[0,0],[2,0],[0,2]];second=[[1,0],[3,0],[1,2]]
        self.assertEqual(support.union_exterior([first]),support.union_exterior([first,first,list(reversed(first))]))
        for band in support.exterior_bands(support.union_exterior([first,second])):
            self.assertFalse(any(support.triangle_height([p+[0] for p in tri],1.25,.5) is not None
                                 for tri in support.triangulate(band)))

    def test_union_clearance_is_bounded_to250micrometres(self):
        import numpy as np
        boundary=support.union_exterior([[[0,0],[1,0],[0,1]]])
        for band in support.exterior_bands(boundary):
            for point in band:
                distances=[]
                for a,b in boundary:
                    a,b=np.asarray(a),np.asarray(b);edge=b-a
                    t=min(1,max(0,float((np.asarray(point)-a)@edge/(edge@edge))))
                    distances.append(float(np.linalg.norm(np.asarray(point)-a-t*edge)))
                self.assertLessEqual(min(distances),.000250000000001)

    def test_global_source_edge_split_is_promoted_to_adjacent_face(self):
        import numpy as np
        vertices=np.asarray([[0,0,2,0,0],[1,0,3,1,0],[0,1,4,0,1],[1,1,5,1,1]],dtype=float)
        indices=np.asarray([[0,1,2],[1,3,2]])
        source=vertices[indices];mid=(vertices[1]+vertices[2])/2
        pieces=np.asarray([[vertices[0],vertices[1],mid],[vertices[0],mid,vertices[2]],source[1]])
        rows,parents,stats=support.conform_source_edges(pieces,[0,0,1],source,indices,vertices)
        self.assertGreater(stats['source_edge_subdivision_events'],0)
        self.assertTrue(any(np.array_equal(row,mid.astype(np.float32)) for triangle in rows[parents==1] for row in triangle))
        self.assertEqual({tuple(row) for tri in rows for row in tri if np.array_equal(row[:2],mid[:2])},{tuple(mid)})
        # The old independent packing leaves the second face without the split.
        self.assertFalse(any(np.array_equal(row[:2],mid[:2]) for row in pieces[2]))

    def test_unchanged_source_triangle_is_not_centroid_fanned(self):
        import numpy as np
        source=np.asarray([[[0,0,2,0,0],[1,0,3,1,0],[0,1,4,0,1]]],dtype=float)
        rows,parents,stats=support.conform_source_edges(source,[0],source,np.asarray([[0,1,2]]),source[0])
        self.assertEqual(len(rows),1)
        self.assertTrue(np.array_equal(rows[0],source[0].astype(np.float32)))
        self.assertEqual(stats['unfanned_triangles'],1)

    def test_tiny_nonzero_packed_projected_triangle_is_retained(self):
        import numpy as np
        # Its projected area is below the analytical clipping-area bound.
        # Packing must not silently turn that bound into a deletion epsilon.
        source=np.asarray([[[0,0,2],[.000001,0,2],[0,.000001,2]]],dtype=float)
        rows,parents,stats=support.conform_source_edges(source,[0],source,np.asarray([[0,1,2]]),source[0])
        self.assertEqual(len(rows),1)
        u=rows[0,1,:2].astype(float)-rows[0,0,:2]
        v=rows[0,2,:2].astype(float)-rows[0,0,:2]
        determinant=float(u[0]*v[1]-u[1]*v[0])
        self.assertGreater(abs(determinant),0)
        self.assertLess(abs(determinant),support.MIN_AREA_M2)
        self.assertEqual(stats.get('exact_zero_projected_xy_triangles',0),0)

    def test_exact_zero_projected_packed_remnant_is_explicitly_excluded(self):
        import numpy as np
        source=np.asarray([[[0,0,2],[1,0,3],[0,1,4]]],dtype=float)
        # A float32 near-collinear remnant can have nonzero3D area while its
        # packed XY is exactly collinear; it covers no open ground region.
        piece=np.asarray([[[.1,.1,2.3],[.8,.1,3],[.5,.1,2.700000238418579]]])
        rows,parents,stats=support.conform_source_edges(piece,[0],source,np.asarray([[0,1,2]]),source[0])
        self.assertEqual(len(rows),0)
        self.assertEqual(stats.get('exact_zero_projected_xy_triangles',0),1)

    def test_known_union_area_preserves_sloped_height_and_uv(self):
        # Right triangle area8; remove unit square represented by two triangles.
        terrain=[[0,0,2,0,0],[4,0,6,1,0],[0,4,10,0,1]]
        roads=[[[0,0,0],[1,0,0],[0,1,0]],[[1,0,0],[1,1,0],[0,1,0]]]
        result=support.subtract_road_footprints(terrain,roads)
        self.assertAlmostEqual(sum(abs(support.signed_area(row)) for row in result),7,places=9)
        for row in result:
            for x,y,z,u,v in row:
                self.assertAlmostEqual(z,2+x+2*y,places=10)
                self.assertAlmostEqual(u,x/4,places=10)
                self.assertAlmostEqual(v,y/4,places=10)
        self.assertFalse(any(support.triangle_height(row,.3,.3) is not None for row in result))
        self.assertAlmostEqual(next(support.triangle_height(row,2,.3) for row in result if support.triangle_height(row,2,.3) is not None),4.6)

    def test_road_union_overlap_is_not_double_subtracted(self):
        terrain=[[0,0,0],[4,0,0],[0,4,0]]
        clip=[[0,0,1],[2,0,1],[0,2,1]]
        result=support.subtract_road_footprints(terrain,[clip,clip,list(reversed(clip))])
        self.assertAlmostEqual(sum(abs(support.signed_area(row)) for row in result),6,places=9)

    def test_disjoint_or_edge_touch_preserves_surface(self):
        terrain=[[0,0,0],[4,0,0],[0,4,0]]
        for clip in [[[4,0,1],[5,0,1],[4,1,1]],[[10,10,1],[11,10,1],[10,11,1]]]:
            result=support.subtract_road_footprints(terrain,[clip])
            self.assertAlmostEqual(sum(abs(support.signed_area(row)) for row in result),8,places=9)
            self.assertEqual({tuple(v) for row in result for v in row},{tuple(v) for v in terrain})

    def test_covering_footprint_removes_all_overlapping_terrain(self):
        terrain=[[0,0,0],[4,0,0],[0,4,0]]
        result=support.subtract_road_footprints(terrain,[[[-1,-1,1],[10,-1,1],[-1,10,1]]])
        self.assertEqual(result,[])

    def test_original_winding_is_preserved(self):
        terrain=[[0,4,0],[4,0,0],[0,0,0]]
        result=support.subtract_road_footprints(terrain,[[[0,0,1],[1,0,1],[0,1,1]]])
        self.assertTrue(all(support.signed_area(row)<0 for row in result))

    def test_refuses_unbounded_fragmentation(self):
        with self.assertRaisesRegex(ValueError,'terrain fragments'):
            support.subtract_road_footprints([[0,0,0],[4,0,0],[0,4,0]],[[[1,1,1],[2,1,1],[1,2,1]]],max_fragments=1)

    def test_disjoint_footprints_inside_overlapping_bounds_do_not_multiply_fragments(self):
        terrain=[[0,0,0],[4,0,0],[0,4,0]]
        disjoint=[[3.5,3.5,1],[3.6,3.5,1],[3.5,3.6,1]]
        result=support.subtract_road_footprints(terrain,[disjoint]*30,max_fragments=1)
        self.assertEqual(result,[terrain])

    def test_elevated_road_keeps_real_terrain_underneath(self):
        terrain=[[0,0,0,0,0],[4,0,0,1,0],[0,4,0,0,1]]
        bridge=[[0,0,5],[4,0,5],[0,4,5]]
        result=support.subtract_road_footprints(terrain,[bridge],conflicts_only=True)
        self.assertEqual(result,[terrain])
        self.assertAlmostEqual(support.triangle_height(result[0],1,1),0)
        self.assertAlmostEqual(support.triangle_height(bridge,1,1),5)

    def test_sloped_road_cuts_only_terrain_above_road_plane(self):
        terrain=[[0,0,0,0,0],[4,0,0,1,0],[0,4,0,0,1]]
        road=[[0,0,-2],[4,0,2],[0,4,-2]]
        result=support.subtract_road_footprints(terrain,[road],conflicts_only=True)
        self.assertAlmostEqual(sum(abs(support.signed_area(row)) for row in result),2,places=9)
        self.assertFalse(any(support.triangle_height(row,1,1) is not None for row in result))
        self.assertTrue(any(support.triangle_height(row,3,.2) is not None for row in result))
        for row in result:
            for x,y,z,u,v in row:
                self.assertEqual(z,0)
                self.assertAlmostEqual(u,x/4)
                self.assertAlmostEqual(v,y/4)

    def test_stacked_roads_remain_at_source_heights_without_lowering_bridge(self):
        terrain=[[0,0,1],[4,0,1],[0,4,1]]
        ground=[[0,0,0],[4,0,0],[0,4,0]]
        bridge=[[0,0,5],[4,0,5],[0,4,5]]
        original=[list(row) for row in bridge]
        self.assertEqual(support.subtract_road_footprints(terrain,[bridge],conflicts_only=True),[terrain])
        self.assertEqual(support.subtract_road_footprints(terrain,[bridge,ground],conflicts_only=True),[])
        self.assertEqual(bridge,original)
        self.assertEqual(support.triangle_height(ground,1,1),0)
        self.assertEqual(support.triangle_height(bridge,1,1),5)

    def test_actual_above_road_red_coordinates_become_source_consistent(self):
        fixtures=json.loads((pathlib.Path(__file__).parent/'fixtures/support_red_coordinates.json').read_text())['fixtures']
        for fixture in [r for r in fixtures if r['kind']=='vehicle_centre']:
            with self.subTest(slot=fixture['agent_slot']):
                x,y,z=[v/100 for v in fixture['contact_cm']]
                terrain=fixture['terrain_xyz_uv_enu_m'];roads=fixture['road_source_triangles_enu_m']
                # This actual defect control fails the unchanged20cm predicate.
                old_ground=max(support.triangle_height(row,x,y) for row in [terrain,*roads])
                self.assertGreater(abs(old_ground-z),.20)
                repaired=support.subtract_road_footprints(terrain,roads,conflicts_only=True)
                hits=[h for row in repaired+roads if (h:=support.triangle_height(row,x,y)) is not None]
                self.assertLess(abs(max(hits)-z),.001)

    def test_actual_terrain_route_binds_drawn_triangle_instead_of_raw_dem(self):
        fixtures=json.loads((pathlib.Path(__file__).parent/'fixtures/support_red_coordinates.json').read_text())['fixtures']
        fixture=next(r for r in fixtures if r['kind']=='pedestrian_centre')
        x,y,z=[v/100 for v in fixture['contact_cm']]
        terrain=fixture['terrain_xyz_uv_enu_m']
        drawn=support.triangle_height(terrain,x,y)
        self.assertGreater(abs(drawn-fixture['raw_dem_cm']/100),.20)
        self.assertGreater(abs(drawn-z),.20)
        retained=support.subtract_road_footprints(terrain,[],conflicts_only=True)
        exact_route=support.triangle_height(retained[0],x,y)
        self.assertEqual(exact_route,drawn)

    def test_actual_below_road_terrain_is_not_removed_to_hide_native_collision_error(self):
        fixtures=json.loads((pathlib.Path(__file__).parent/'fixtures/support_red_coordinates.json').read_text())['fixtures']
        fixture=next(r for r in fixtures if r['kind']=='tyre')
        x,y,z=[v/100 for v in fixture['contact_cm']]
        terrain=fixture['terrain_xyz_uv_enu_m'];roads=fixture['road_source_triangles_enu_m']
        original=support.triangle_height(terrain,x,y)
        self.assertLess(abs(original-z),.20)
        self.assertGreater(fixture['native_signed_gap_cm'],20)
        repaired=support.subtract_road_footprints(terrain,roads,conflicts_only=True)
        self.assertTrue(any((h:=support.triangle_height(row,x,y)) is not None and abs(h-original)<1e-9 for row in repaired))

    def test_actual_mesh_edges_are_subdivided_when_uniform_spacing_misses_ridge(self):
        # Both old endpoints are z0; the actual source ridge at x.5 is z.3.
        triangles=[[[0,0,0],[.5,0,.3],[0,1,0]],[[.5,0,.3],[.5,1,.3],[0,1,0]],
                   [[.5,0,.3],[1,0,0],[1,1,0]],[[.5,0,.3],[1,1,0],[.5,1,.3]]]
        mesh=support.TriangleIndex(triangles)
        self.assertIn(.5,mesh.segment_breakpoints([0,.2],[1,.2]))
        actual=mesh.hits(.5,.2)[0]['height']
        old_interpolation=(mesh.hits(0,.2)[0]['height']+mesh.hits(1,.2)[0]['height'])/2
        self.assertGreater(abs(old_interpolation-actual),.2)
        self.assertAlmostEqual(actual,.3)

    def test_triangle_hit_proof_reconstructs_exact_height_normal_and_layer(self):
        mesh=support.TriangleIndex([[[0,0,0],[10,0,1],[0,10,2]]])
        hit=mesh.hits(2,3)[0]
        self.assertAlmostEqual(hit['height'],.8)
        self.assertEqual(hit['triangle'],0)
        for actual,expected in zip(hit['barycentric'],[.5,.2,.3]):self.assertAlmostEqual(actual,expected)
        for actual,expected in zip(hit['gradient_enu'],[.1,.2]):self.assertAlmostEqual(actual,expected)
        self.assertGreater(hit['normal_up_z'],.7)


if __name__=='__main__':
    unittest.main()
