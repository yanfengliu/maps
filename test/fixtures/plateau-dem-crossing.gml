<?xml version="1.0" encoding="UTF-8"?>
<!--
  Excerpt of PLATEAU's terrain TIN, cut from
  udx/dem/533935_dem_6697_op.gml of 13113_shibuya-ku_pref_2025_citygml_1_op.zip
  (SHA-256 f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d).

  Every triangle below is verbatim source bytes. The cut keeps triangles whose
  centroid falls within 25 m of the Shibuya Scramble Crossing at 35.6595 N,
  139.7005 E, which is what test/elevation.test.ts samples. The whole file is
  378 MB and regenerable by `npm run data:fetch`; this is the slice a gate can
  read without a network or a 378 MB checkout.

  3D City Model (Project PLATEAU), Shibuya-ku FY2025, MLIT Japan.
  PDL 1.0 / CC BY 4.0. Modified: cut to a 50 m box around the crossing.
-->
<core:CityModel xmlns:gml="http://www.opengis.net/gml" xmlns:core="http://www.opengis.net/citygml/2.0" xmlns:dem="http://www.opengis.net/citygml/relief/2.0">
	<core:cityObjectMember>
		<dem:ReliefFeature gml:id="dem-excerpt-shibuya-crossing">
			<gml:name>53393596</gml:name>
			<dem:lod>1</dem:lod>
			<dem:reliefComponent>
				<dem:TINRelief gml:id="dem-excerpt-tin">
					<dem:tin>
						<gml:TriangulatedSurface srsName="http://www.opengis.net/def/crs/EPSG/0/6697" srsDimension="3">
							<gml:trianglePatches>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659283908293 139.700216693975 15.18 35.659283969322 139.700271917504 15.18 35.659328976927 139.700216619179 15.19 35.659283908293 139.700216693975 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659283969322 139.700271917504 15.18 35.659284030326 139.700327141034 15.29 35.659329037956 139.70027184274 15.1 35.659283969322 139.700271917504 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659283969322 139.700271917504 15.18 35.659329037956 139.70027184274 15.1 35.659328976927 139.700216619179 15.19 35.659283969322 139.700271917504 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284030326 139.700327141034 15.29 35.659284091304 139.700382364564 15.33 35.65932909896 139.7003270663 15.22 35.659284030326 139.700327141034 15.29</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284030326 139.700327141034 15.29 35.65932909896 139.7003270663 15.22 35.659329037956 139.70027184274 15.1 35.659284030326 139.700327141034 15.29</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284091304 139.700382364564 15.33 35.659284152257 139.700437588094 15.33 35.659329159938 139.700382289861 15.3 35.659284091304 139.700382364564 15.33</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284091304 139.700382364564 15.33 35.659329159938 139.700382289861 15.3 35.65932909896 139.7003270663 15.22 35.659284091304 139.700382364564 15.33</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284152257 139.700437588094 15.33 35.659284213185 139.700492811624 15.25 35.659329220892 139.700437513422 15.31 35.659284152257 139.700437588094 15.33</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284152257 139.700437588094 15.33 35.659329220892 139.700437513422 15.31 35.659329159938 139.700382289861 15.3 35.659284152257 139.700437588094 15.33</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284213185 139.700492811624 15.25 35.659284274087 139.700548035155 15.14 35.659329281819 139.700492736984 15.23 35.659284213185 139.700492811624 15.25</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284213185 139.700492811624 15.25 35.659329281819 139.700492736984 15.23 35.659329220892 139.700437513422 15.31 35.659284213185 139.700492811624 15.25</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284274087 139.700548035155 15.14 35.659329403599 139.700603184106 15.02 35.659329342722 139.700547960545 15.16 35.659284274087 139.700548035155 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284274087 139.700548035155 15.14 35.659329342722 139.700547960545 15.16 35.659329281819 139.700492736984 15.23 35.659284274087 139.700548035155 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659328976927 139.700216619179 15.19 35.659329037956 139.70027184274 15.1 35.65937404556 139.700216544383 15.07 35.659328976927 139.700216619179 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329037956 139.70027184274 15.1 35.65932909896 139.7003270663 15.22 35.65937410659 139.700271767975 15.12 35.659329037956 139.70027184274 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329037956 139.70027184274 15.1 35.65937410659 139.700271767975 15.12 35.65937404556 139.700216544383 15.07 35.659329037956 139.70027184274 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65932909896 139.7003270663 15.22 35.659329159938 139.700382289861 15.3 35.659374167594 139.700326991567 15.18 35.65932909896 139.7003270663 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65932909896 139.7003270663 15.22 35.659374167594 139.700326991567 15.18 35.65937410659 139.700271767975 15.12 35.65932909896 139.7003270663 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329159938 139.700382289861 15.3 35.659329220892 139.700437513422 15.31 35.659374228572 139.700382215158 15.25 35.659329159938 139.700382289861 15.3</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329159938 139.700382289861 15.3 35.659374228572 139.700382215158 15.25 35.659374167594 139.700326991567 15.18 35.659329159938 139.700382289861 15.3</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329220892 139.700437513422 15.31 35.659329281819 139.700492736984 15.23 35.659374289525 139.700437438751 15.25 35.659329220892 139.700437513422 15.31</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329220892 139.700437513422 15.31 35.659374289525 139.700437438751 15.25 35.659374228572 139.700382215158 15.25 35.659329220892 139.700437513422 15.31</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329281819 139.700492736984 15.23 35.659329342722 139.700547960545 15.16 35.659374350453 139.700492662343 15.19 35.659329281819 139.700492736984 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329281819 139.700492736984 15.23 35.659374350453 139.700492662343 15.19 35.659374289525 139.700437438751 15.25 35.659329281819 139.700492736984 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329342722 139.700547960545 15.16 35.659374411356 139.700547885935 15.12 35.659374350453 139.700492662343 15.19 35.659329342722 139.700547960545 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65937404556 139.700216544383 15.07 35.65937410659 139.700271767975 15.12 35.659419114194 139.700216469587 15.11 35.65937404556 139.700216544383 15.07</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65937410659 139.700271767975 15.12 35.659374167594 139.700326991567 15.18 35.659419175223 139.70027169321 15.1 35.65937410659 139.700271767975 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65937410659 139.700271767975 15.12 35.659419175223 139.70027169321 15.1 35.659419114194 139.700216469587 15.11 35.65937410659 139.700271767975 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374167594 139.700326991567 15.18 35.659374228572 139.700382215158 15.25 35.659419236227 139.700326916832 15.18 35.659374167594 139.700326991567 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374167594 139.700326991567 15.18 35.659419236227 139.700326916832 15.18 35.659419175223 139.70027169321 15.1 35.659374167594 139.700326991567 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374228572 139.700382215158 15.25 35.659374289525 139.700437438751 15.25 35.659419297206 139.700382140455 15.19 35.659374228572 139.700382215158 15.25</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374228572 139.700382215158 15.25 35.659419297206 139.700382140455 15.19 35.659419236227 139.700326916832 15.18 35.659374228572 139.700382215158 15.25</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374289525 139.700437438751 15.25 35.659374350453 139.700492662343 15.19 35.659419358159 139.700437364079 15.22 35.659374289525 139.700437438751 15.25</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374289525 139.700437438751 15.25 35.659419358159 139.700437364079 15.22 35.659419297206 139.700382140455 15.19 35.659374289525 139.700437438751 15.25</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374350453 139.700492662343 15.19 35.659374411356 139.700547885935 15.12 35.659419419087 139.700492587702 15.2 35.659374350453 139.700492662343 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374350453 139.700492662343 15.19 35.659419419087 139.700492587702 15.2 35.659419358159 139.700437364079 15.22 35.659374350453 139.700492662343 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374411356 139.700547885935 15.12 35.65941947999 139.700547811325 15.15 35.659419419087 139.700492587702 15.2 35.659374411356 139.700547885935 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419114194 139.700216469587 15.11 35.659419175223 139.70027169321 15.1 35.659464182827 139.700216394791 15.06 35.659419114194 139.700216469587 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419175223 139.70027169321 15.1 35.659419236227 139.700326916832 15.18 35.659464243856 139.700271618444 15.11 35.659419175223 139.70027169321 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419175223 139.70027169321 15.1 35.659464243856 139.700271618444 15.11 35.659464182827 139.700216394791 15.06 35.659419175223 139.70027169321 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419236227 139.700326916832 15.18 35.659419297206 139.700382140455 15.19 35.65946430486 139.700326842098 15.16 35.659419236227 139.700326916832 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419236227 139.700326916832 15.18 35.65946430486 139.700326842098 15.16 35.659464243856 139.700271618444 15.11 35.659419236227 139.700326916832 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419297206 139.700382140455 15.19 35.659419358159 139.700437364079 15.22 35.659464365839 139.700382065752 15.19 35.659419297206 139.700382140455 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419297206 139.700382140455 15.19 35.659464365839 139.700382065752 15.19 35.65946430486 139.700326842098 15.16 35.659419297206 139.700382140455 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419358159 139.700437364079 15.22 35.659419419087 139.700492587702 15.2 35.659464426792 139.700437289406 15.2 35.659419358159 139.700437364079 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419358159 139.700437364079 15.22 35.659464426792 139.700437289406 15.2 35.659464365839 139.700382065752 15.19 35.659419358159 139.700437364079 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419419087 139.700492587702 15.2 35.65941947999 139.700547811325 15.15 35.659464487721 139.700492513061 15.2 35.659419419087 139.700492587702 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419419087 139.700492587702 15.2 35.659464487721 139.700492513061 15.2 35.659464426792 139.700437289406 15.2 35.659419419087 139.700492587702 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65941947999 139.700547811325 15.15 35.659464548623 139.700547736715 15.19 35.659464487721 139.700492513061 15.2 35.65941947999 139.700547811325 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464182827 139.700216394791 15.06 35.659464243856 139.700271618444 15.11 35.659509251459 139.700216319994 15.11 35.659464182827 139.700216394791 15.06</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464243856 139.700271618444 15.11 35.65946430486 139.700326842098 15.16 35.659509312489 139.700271543679 15.14 35.659464243856 139.700271618444 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464243856 139.700271618444 15.11 35.659509312489 139.700271543679 15.14 35.659509251459 139.700216319994 15.11 35.659464243856 139.700271618444 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65946430486 139.700326842098 15.16 35.659464365839 139.700382065752 15.19 35.659509373493 139.700326767364 15.15 35.65946430486 139.700326842098 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65946430486 139.700326842098 15.16 35.659509373493 139.700326767364 15.15 35.659509312489 139.700271543679 15.14 35.65946430486 139.700326842098 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464365839 139.700382065752 15.19 35.659464426792 139.700437289406 15.2 35.659509434472 139.700381991049 15.18 35.659464365839 139.700382065752 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464365839 139.700382065752 15.19 35.659509434472 139.700381991049 15.18 35.659509373493 139.700326767364 15.15 35.659464365839 139.700382065752 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464426792 139.700437289406 15.2 35.659464487721 139.700492513061 15.2 35.659509495425 139.700437214734 15.18 35.659464426792 139.700437289406 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464426792 139.700437289406 15.2 35.659509495425 139.700437214734 15.18 35.659509434472 139.700381991049 15.18 35.659464426792 139.700437289406 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464487721 139.700492513061 15.2 35.659464548623 139.700547736715 15.19 35.659509556354 139.700492438419 15.2 35.659464487721 139.700492513061 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464487721 139.700492513061 15.2 35.659509556354 139.700492438419 15.2 35.659509495425 139.700437214734 15.18 35.659464487721 139.700492513061 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464548623 139.700547736715 15.19 35.659509617257 139.700547662105 15.22 35.659509556354 139.700492438419 15.2 35.659464548623 139.700547736715 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509251459 139.700216319994 15.11 35.659509312489 139.700271543679 15.14 35.659554320091 139.700216245198 15.08 35.659509251459 139.700216319994 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509312489 139.700271543679 15.14 35.659509373493 139.700326767364 15.15 35.659554381121 139.700271468914 15.09 35.659509312489 139.700271543679 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509312489 139.700271543679 15.14 35.659554381121 139.700271468914 15.09 35.659554320091 139.700216245198 15.08 35.659509312489 139.700271543679 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509373493 139.700326767364 15.15 35.659509434472 139.700381991049 15.18 35.659554442125 139.700326692629 15.09 35.659509373493 139.700326767364 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509373493 139.700326767364 15.15 35.659554442125 139.700326692629 15.09 35.659554381121 139.700271468914 15.09 35.659509373493 139.700326767364 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509434472 139.700381991049 15.18 35.659509495425 139.700437214734 15.18 35.659554503104 139.700381916345 15.12 35.659509434472 139.700381991049 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509434472 139.700381991049 15.18 35.659554503104 139.700381916345 15.12 35.659554442125 139.700326692629 15.09 35.659509434472 139.700381991049 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509495425 139.700437214734 15.18 35.659509556354 139.700492438419 15.2 35.659554564058 139.700437140062 15.18 35.659509495425 139.700437214734 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509495425 139.700437214734 15.18 35.659554564058 139.700437140062 15.18 35.659554503104 139.700381916345 15.12 35.659509495425 139.700437214734 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509556354 139.700492438419 15.2 35.659509617257 139.700547662105 15.22 35.659554624986 139.700492363778 15.23 35.659509556354 139.700492438419 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509556354 139.700492438419 15.2 35.659554624986 139.700492363778 15.23 35.659554564058 139.700437140062 15.18 35.659509556354 139.700492438419 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509617257 139.700547662105 15.22 35.659554685889 139.700547587495 15.21 35.659554624986 139.700492363778 15.23 35.659509617257 139.700547662105 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554320091 139.700216245198 15.08 35.659554381121 139.700271468914 15.09 35.659599388723 139.700216170401 14.95 35.659554320091 139.700216245198 15.08</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554381121 139.700271468914 15.09 35.659554442125 139.700326692629 15.09 35.659599449753 139.700271394148 15.01 35.659554381121 139.700271468914 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554381121 139.700271468914 15.09 35.659599449753 139.700271394148 15.01 35.659599388723 139.700216170401 14.95 35.659554381121 139.700271468914 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554442125 139.700326692629 15.09 35.659554503104 139.700381916345 15.12 35.659599510757 139.700326617895 15.05 35.659554442125 139.700326692629 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554442125 139.700326692629 15.09 35.659599510757 139.700326617895 15.05 35.659599449753 139.700271394148 15.01 35.659554442125 139.700326692629 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554503104 139.700381916345 15.12 35.659554564058 139.700437140062 15.18 35.659599571737 139.700381841642 15 35.659554503104 139.700381916345 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554503104 139.700381916345 15.12 35.659599571737 139.700381841642 15 35.659599510757 139.700326617895 15.05 35.659554503104 139.700381916345 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554564058 139.700437140062 15.18 35.659554624986 139.700492363778 15.23 35.65959963269 139.700437065389 15.05 35.659554564058 139.700437140062 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554564058 139.700437140062 15.18 35.65959963269 139.700437065389 15.05 35.659599571737 139.700381841642 15 35.659554564058 139.700437140062 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554624986 139.700492363778 15.23 35.659554685889 139.700547587495 15.21 35.659599693619 139.700492289136 15.13 35.659554624986 139.700492363778 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554624986 139.700492363778 15.23 35.659599693619 139.700492289136 15.13 35.65959963269 139.700437065389 15.05 35.659554624986 139.700492363778 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554685889 139.700547587495 15.21 35.659599754522 139.700547512884 15.19 35.659599693619 139.700492289136 15.13 35.659554685889 139.700547587495 15.21</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599388723 139.700216170401 14.95 35.659599449753 139.700271394148 15.01 35.659644457355 139.700216095604 15.18 35.659599388723 139.700216170401 14.95</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599449753 139.700271394148 15.01 35.659599510757 139.700326617895 15.05 35.659644518385 139.700271319382 15.08 35.659599449753 139.700271394148 15.01</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599449753 139.700271394148 15.01 35.659644518385 139.700271319382 15.08 35.659644457355 139.700216095604 15.18 35.659599449753 139.700271394148 15.01</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599510757 139.700326617895 15.05 35.659599571737 139.700381841642 15 35.659644579389 139.70032654316 15.03 35.659599510757 139.700326617895 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599510757 139.700326617895 15.05 35.659644579389 139.70032654316 15.03 35.659644518385 139.700271319382 15.08 35.659599510757 139.700326617895 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599571737 139.700381841642 15 35.65959963269 139.700437065389 15.05 35.659644640368 139.700381766938 15.06 35.659599571737 139.700381841642 15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599571737 139.700381841642 15 35.659644640368 139.700381766938 15.06 35.659644579389 139.70032654316 15.03 35.659599571737 139.700381841642 15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65959963269 139.700437065389 15.05 35.659599693619 139.700492289136 15.13 35.659644701322 139.700436990716 15.11 35.65959963269 139.700437065389 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65959963269 139.700437065389 15.05 35.659644701322 139.700436990716 15.11 35.659644640368 139.700381766938 15.06 35.65959963269 139.700437065389 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599693619 139.700492289136 15.13 35.659599754522 139.700547512884 15.19 35.659644762251 139.700492214495 15.12 35.659599693619 139.700492289136 15.13</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599693619 139.700492289136 15.13 35.659644762251 139.700492214495 15.12 35.659644701322 139.700436990716 15.11 35.659599693619 139.700492289136 15.13</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599754522 139.700547512884 15.19 35.659644823154 139.700547438273 15.14 35.659644762251 139.700492214495 15.12 35.659599754522 139.700547512884 15.19</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644457355 139.700216095604 15.18 35.659644518385 139.700271319382 15.08 35.659689525986 139.700216020807 15.21 35.659644457355 139.700216095604 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644518385 139.700271319382 15.08 35.659644579389 139.70032654316 15.03 35.659689587016 139.700271244616 15.14 35.659644518385 139.700271319382 15.08</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644518385 139.700271319382 15.08 35.659689587016 139.700271244616 15.14 35.659689525986 139.700216020807 15.21 35.659644518385 139.700271319382 15.08</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644579389 139.70032654316 15.03 35.659644640368 139.700381766938 15.06 35.659689648021 139.700326468425 15.05 35.659644579389 139.70032654316 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644579389 139.70032654316 15.03 35.659689648021 139.700326468425 15.05 35.659689587016 139.700271244616 15.14 35.659644579389 139.70032654316 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644640368 139.700381766938 15.06 35.659644701322 139.700436990716 15.11 35.659689709 139.700381692234 15.13 35.659644640368 139.700381766938 15.06</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644640368 139.700381766938 15.06 35.659689709 139.700381692234 15.13 35.659689648021 139.700326468425 15.05 35.659644640368 139.700381766938 15.06</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644701322 139.700436990716 15.11 35.659644762251 139.700492214495 15.12 35.659689769954 139.700436916043 15.11 35.659644701322 139.700436990716 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644701322 139.700436990716 15.11 35.659689769954 139.700436916043 15.11 35.659689709 139.700381692234 15.13 35.659644701322 139.700436990716 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644762251 139.700492214495 15.12 35.659644823154 139.700547438273 15.14 35.659689830883 139.700492139853 15.23 35.659644762251 139.700492214495 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644762251 139.700492214495 15.12 35.659689830883 139.700492139853 15.23 35.659689769954 139.700436916043 15.11 35.659644762251 139.700492214495 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644823154 139.700547438273 15.14 35.659689891786 139.700547363662 15.16 35.659689830883 139.700492139853 15.23 35.659644823154 139.700547438273 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689525986 139.700216020807 15.21 35.659689587016 139.700271244616 15.14 35.659734594617 139.70021594601 15.22 35.659689525986 139.700216020807 15.21</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689587016 139.700271244616 15.14 35.659689648021 139.700326468425 15.05 35.659734655647 139.70027116985 15.06 35.659689587016 139.700271244616 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689587016 139.700271244616 15.14 35.659734655647 139.70027116985 15.06 35.659734594617 139.70021594601 15.22 35.659689587016 139.700271244616 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689648021 139.700326468425 15.05 35.659689709 139.700381692234 15.13 35.659734716652 139.70032639369 15.09 35.659689648021 139.700326468425 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689648021 139.700326468425 15.05 35.659734716652 139.70032639369 15.09 35.659734655647 139.70027116985 15.06 35.659689648021 139.700326468425 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689709 139.700381692234 15.13 35.659689769954 139.700436916043 15.11 35.659734777631 139.70038161753 15.12 35.659689709 139.700381692234 15.13</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689709 139.700381692234 15.13 35.659734777631 139.70038161753 15.12 35.659734716652 139.70032639369 15.09 35.659689709 139.700381692234 15.13</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689769954 139.700436916043 15.11 35.659689830883 139.700492139853 15.23 35.659734838585 139.70043684137 15.16 35.659689769954 139.700436916043 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689769954 139.700436916043 15.11 35.659734838585 139.70043684137 15.16 35.659734777631 139.70038161753 15.12 35.659689769954 139.700436916043 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689830883 139.700492139853 15.23 35.659689891786 139.700547363662 15.16 35.659734899514 139.700492065211 15.26 35.659689830883 139.700492139853 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689830883 139.700492139853 15.23 35.659734899514 139.700492065211 15.26 35.659734838585 139.70043684137 15.16 35.659689830883 139.700492139853 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689891786 139.700547363662 15.16 35.659734960417 139.700547289051 15.29 35.659734899514 139.700492065211 15.26 35.659689891786 139.700547363662 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284334964 139.700603258685 15.11 35.659284395816 139.700658482216 15.18 35.659329403599 139.700603184106 15.02 35.659284334964 139.700603258685 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284334964 139.700603258685 15.11 35.659329403599 139.700603184106 15.02 35.659284274087 139.700548035155 15.14 35.659284334964 139.700603258685 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284395816 139.700658482216 15.18 35.659284456643 139.700713705747 15.2 35.659329464451 139.700658407668 15.1 35.659284395816 139.700658482216 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284395816 139.700658482216 15.18 35.659329464451 139.700658407668 15.1 35.659329403599 139.700603184106 15.02 35.659284395816 139.700658482216 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284456643 139.700713705747 15.2 35.659284517444 139.700768929278 15.17 35.659329525278 139.70071363123 15.09 35.659284456643 139.700713705747 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284456643 139.700713705747 15.2 35.659329525278 139.70071363123 15.09 35.659329464451 139.700658407668 15.1 35.659284456643 139.700713705747 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659284517444 139.700768929278 15.17 35.659329586079 139.700768854792 15.11 35.659329525278 139.70071363123 15.09 35.659284517444 139.700768929278 15.17</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329403599 139.700603184106 15.02 35.659329464451 139.700658407668 15.1 35.659374472233 139.700603109528 15.1 35.659329403599 139.700603184106 15.02</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329403599 139.700603184106 15.02 35.659374472233 139.700603109528 15.1 35.659329342722 139.700547960545 15.16 35.659329403599 139.700603184106 15.02</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329464451 139.700658407668 15.1 35.659329525278 139.70071363123 15.09 35.659374533085 139.700658333121 15.03 35.659329464451 139.700658407668 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329464451 139.700658407668 15.1 35.659374533085 139.700658333121 15.03 35.659374472233 139.700603109528 15.1 35.659329464451 139.700658407668 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329525278 139.70071363123 15.09 35.659329586079 139.700768854792 15.11 35.659374593912 139.700713556713 15.02 35.659329525278 139.70071363123 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329525278 139.70071363123 15.09 35.659374593912 139.700713556713 15.02 35.659374533085 139.700658333121 15.03 35.659329525278 139.70071363123 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659329586079 139.700768854792 15.11 35.659374654713 139.700768780307 15 35.659374593912 139.700713556713 15.02 35.659329586079 139.700768854792 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374472233 139.700603109528 15.1 35.659419540867 139.700603034949 15.14 35.659374411356 139.700547885935 15.12 35.659374472233 139.700603109528 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374472233 139.700603109528 15.1 35.659374411356 139.700547885935 15.12 35.659329342722 139.700547960545 15.16 35.659374472233 139.700603109528 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374472233 139.700603109528 15.1 35.659374533085 139.700658333121 15.03 35.659419540867 139.700603034949 15.14 35.659374472233 139.700603109528 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374533085 139.700658333121 15.03 35.659374593912 139.700713556713 15.02 35.659419601719 139.700658258573 15.09 35.659374533085 139.700658333121 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374533085 139.700658333121 15.03 35.659419601719 139.700658258573 15.09 35.659419540867 139.700603034949 15.14 35.659374533085 139.700658333121 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374593912 139.700713556713 15.02 35.659374654713 139.700768780307 15 35.659419662546 139.700713482197 15.03 35.659374593912 139.700713556713 15.02</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374593912 139.700713556713 15.02 35.659419662546 139.700713482197 15.03 35.659419601719 139.700658258573 15.09 35.659374593912 139.700713556713 15.02</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659374654713 139.700768780307 15 35.659419723348 139.700768705821 14.96 35.659419662546 139.700713482197 15.03 35.659374654713 139.700768780307 15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419540867 139.700603034949 15.14 35.659464609501 139.70060296037 15.15 35.65941947999 139.700547811325 15.15 35.659419540867 139.700603034949 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419540867 139.700603034949 15.14 35.65941947999 139.700547811325 15.15 35.659374411356 139.700547885935 15.12 35.659419540867 139.700603034949 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419540867 139.700603034949 15.14 35.659419601719 139.700658258573 15.09 35.659464609501 139.70060296037 15.15 35.659419540867 139.700603034949 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419601719 139.700658258573 15.09 35.659419662546 139.700713482197 15.03 35.659464670353 139.700658184025 15.09 35.659419601719 139.700658258573 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419601719 139.700658258573 15.09 35.659464670353 139.700658184025 15.09 35.659464609501 139.70060296037 15.15 35.659419601719 139.700658258573 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419662546 139.700713482197 15.03 35.659419723348 139.700768705821 14.96 35.65946473118 139.70071340768 15.05 35.659419662546 139.700713482197 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419662546 139.700713482197 15.03 35.65946473118 139.70071340768 15.05 35.659464670353 139.700658184025 15.09 35.659419662546 139.700713482197 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659419723348 139.700768705821 14.96 35.659464791981 139.700768631335 15 35.65946473118 139.70071340768 15.05 35.659419723348 139.700768705821 14.96</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464609501 139.70060296037 15.15 35.659509678134 139.700602885791 15.16 35.659464548623 139.700547736715 15.19 35.659464609501 139.70060296037 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464609501 139.70060296037 15.15 35.659464548623 139.700547736715 15.19 35.65941947999 139.700547811325 15.15 35.659464609501 139.70060296037 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464609501 139.70060296037 15.15 35.659464670353 139.700658184025 15.09 35.659509678134 139.700602885791 15.16 35.659464609501 139.70060296037 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464670353 139.700658184025 15.09 35.65946473118 139.70071340768 15.05 35.659509738986 139.700658109477 15.11 35.659464670353 139.700658184025 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464670353 139.700658184025 15.09 35.659509738986 139.700658109477 15.11 35.659509678134 139.700602885791 15.16 35.659464670353 139.700658184025 15.09</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65946473118 139.70071340768 15.05 35.659464791981 139.700768631335 15 35.659509799813 139.700713333163 15.05 35.65946473118 139.70071340768 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65946473118 139.70071340768 15.05 35.659509799813 139.700713333163 15.05 35.659509738986 139.700658109477 15.11 35.65946473118 139.70071340768 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659464791981 139.700768631335 15 35.659509860615 139.700768556849 14.95 35.659509799813 139.700713333163 15.05 35.659464791981 139.700768631335 15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509678134 139.700602885791 15.16 35.659554746767 139.700602811211 15.18 35.659509617257 139.700547662105 15.22 35.659509678134 139.700602885791 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509678134 139.700602885791 15.16 35.659509617257 139.700547662105 15.22 35.659464548623 139.700547736715 15.19 35.659509678134 139.700602885791 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509678134 139.700602885791 15.16 35.659509738986 139.700658109477 15.11 35.659554746767 139.700602811211 15.18 35.659509678134 139.700602885791 15.16</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509738986 139.700658109477 15.11 35.659509799813 139.700713333163 15.05 35.65955480762 139.700658034928 15.11 35.659509738986 139.700658109477 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509738986 139.700658109477 15.11 35.65955480762 139.700658034928 15.11 35.659554746767 139.700602811211 15.18 35.659509738986 139.700658109477 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509799813 139.700713333163 15.05 35.659509860615 139.700768556849 14.95 35.659554868447 139.700713258645 15.03 35.659509799813 139.700713333163 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509799813 139.700713333163 15.05 35.659554868447 139.700713258645 15.03 35.65955480762 139.700658034928 15.11 35.659509799813 139.700713333163 15.05</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659509860615 139.700768556849 14.95 35.659554929248 139.700768482362 14.97 35.659554868447 139.700713258645 15.03 35.659509860615 139.700768556849 14.95</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554746767 139.700602811211 15.18 35.6595998154 139.700602736632 15.18 35.659554685889 139.700547587495 15.21 35.659554746767 139.700602811211 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554746767 139.700602811211 15.18 35.659554685889 139.700547587495 15.21 35.659509617257 139.700547662105 15.22 35.659554746767 139.700602811211 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554746767 139.700602811211 15.18 35.65955480762 139.700658034928 15.11 35.6595998154 139.700602736632 15.18 35.659554746767 139.700602811211 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65955480762 139.700658034928 15.11 35.659554868447 139.700713258645 15.03 35.659599876252 139.70065796038 15.12 35.65955480762 139.700658034928 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.65955480762 139.700658034928 15.11 35.659599876252 139.70065796038 15.12 35.6595998154 139.700602736632 15.18 35.65955480762 139.700658034928 15.11</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554868447 139.700713258645 15.03 35.659554929248 139.700768482362 14.97 35.659599937079 139.700713184128 14.98 35.659554868447 139.700713258645 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554868447 139.700713258645 15.03 35.659599937079 139.700713184128 14.98 35.659599876252 139.70065796038 15.12 35.659554868447 139.700713258645 15.03</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659554929248 139.700768482362 14.97 35.659599997881 139.700768407876 14.76 35.659599937079 139.700713184128 14.98 35.659554929248 139.700768482362 14.97</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.6595998154 139.700602736632 15.18 35.659644884032 139.700602662052 15.2 35.659599754522 139.700547512884 15.19 35.6595998154 139.700602736632 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.6595998154 139.700602736632 15.18 35.659599754522 139.700547512884 15.19 35.659554685889 139.700547587495 15.21 35.6595998154 139.700602736632 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.6595998154 139.700602736632 15.18 35.659599876252 139.70065796038 15.12 35.659644884032 139.700602662052 15.2 35.6595998154 139.700602736632 15.18</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599876252 139.70065796038 15.12 35.659599937079 139.700713184128 14.98 35.659644944885 139.700657885831 15.15 35.659599876252 139.70065796038 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599876252 139.70065796038 15.12 35.659644944885 139.700657885831 15.15 35.659644884032 139.700602662052 15.2 35.659599876252 139.70065796038 15.12</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599937079 139.700713184128 14.98 35.659599997881 139.700768407876 14.76 35.659645005712 139.70071310961 15.04 35.659599937079 139.700713184128 14.98</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599937079 139.700713184128 14.98 35.659645005712 139.70071310961 15.04 35.659644944885 139.700657885831 15.15 35.659599937079 139.700713184128 14.98</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659599997881 139.700768407876 14.76 35.659645066514 139.700768333389 15.14 35.659645005712 139.70071310961 15.04 35.659599997881 139.700768407876 14.76</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644884032 139.700602662052 15.2 35.659689952664 139.700602587472 15.23 35.659644823154 139.700547438273 15.14 35.659644884032 139.700602662052 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644884032 139.700602662052 15.2 35.659644823154 139.700547438273 15.14 35.659599754522 139.700547512884 15.19 35.659644884032 139.700602662052 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644884032 139.700602662052 15.2 35.659644944885 139.700657885831 15.15 35.659689952664 139.700602587472 15.23 35.659644884032 139.700602662052 15.2</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644944885 139.700657885831 15.15 35.659645005712 139.70071310961 15.04 35.659690013517 139.700657811282 15.22 35.659644944885 139.700657885831 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659644944885 139.700657885831 15.15 35.659690013517 139.700657811282 15.22 35.659689952664 139.700602587472 15.23 35.659644944885 139.700657885831 15.15</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659645005712 139.70071310961 15.04 35.659645066514 139.700768333389 15.14 35.659690074344 139.700713035092 15.1 35.659645005712 139.70071310961 15.04</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659645005712 139.70071310961 15.04 35.659690074344 139.700713035092 15.1 35.659690013517 139.700657811282 15.22 35.659645005712 139.70071310961 15.04</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659645066514 139.700768333389 15.14 35.659690135146 139.700768258903 15.21 35.659690074344 139.700713035092 15.1 35.659645066514 139.700768333389 15.14</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689952664 139.700602587472 15.23 35.659735021296 139.700602512892 15.24 35.659689891786 139.700547363662 15.16 35.659689952664 139.700602587472 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689952664 139.700602587472 15.23 35.659689891786 139.700547363662 15.16 35.659644823154 139.700547438273 15.14 35.659689952664 139.700602587472 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659689952664 139.700602587472 15.23 35.659690013517 139.700657811282 15.22 35.659735021296 139.700602512892 15.24 35.659689952664 139.700602587472 15.23</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659690013517 139.700657811282 15.22 35.659690074344 139.700713035092 15.1 35.659735082148 139.700657736733 15.29 35.659690013517 139.700657811282 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659690013517 139.700657811282 15.22 35.659735082148 139.700657736733 15.29 35.659735021296 139.700602512892 15.24 35.659690013517 139.700657811282 15.22</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659690074344 139.700713035092 15.1 35.659690135146 139.700768258903 15.21 35.659735142976 139.700712960574 15.2 35.659690074344 139.700713035092 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659690074344 139.700713035092 15.1 35.659735142976 139.700712960574 15.2 35.659735082148 139.700657736733 15.29 35.659690074344 139.700713035092 15.1</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659690135146 139.700768258903 15.21 35.659735203778 139.700768184416 15.35 35.659735142976 139.700712960574 15.2 35.659690135146 139.700768258903 15.21</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
<gml:Triangle>
									<gml:exterior>
										<gml:LinearRing>
											<gml:posList>35.659735021296 139.700602512892 15.24 35.659734960417 139.700547289051 15.29 35.659689891786 139.700547363662 15.16 35.659735021296 139.700602512892 15.24</gml:posList>
										</gml:LinearRing>
									</gml:exterior>
								</gml:Triangle>
							</gml:trianglePatches>
						</gml:TriangulatedSurface>
					</dem:tin>
				</dem:TINRelief>
			</dem:reliefComponent>
		</dem:ReliefFeature>
	</core:cityObjectMember>
</core:CityModel>
