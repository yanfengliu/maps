/**
 * Promoted OSM source fixture for review findings F0-F3. ODbL 1.0, © OpenStreetMap contributors.
 * Extract timestamp 2026-09-07T03:23:56Z; source SHA-256 9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671.
 * Fourteen named surface ways and their referenced nodes, preserving original tags.
 * Source: data/osm/shibuya-aoi.osm.json, fetched by tools/data/overpass-query.ts.
 */
import type { OsmDocument } from "../tools/network/osm.ts";
export const NETWORK_SOURCE_FIXTURE: OsmDocument = {
  "osm3s": {
    "timestamp_osm_base": "2026-09-07T03:23:56Z",
    "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
  },
  "elements": [
    {
      "type": "node",
      "id": 353660488,
      "lat": 35.6597013,
      "lon": 139.7002945,
      "tags": {
        "crossing": "unmarked",
        "crossing:island": "no",
        "crossing:markings": "no",
        "highway": "crossing"
      }
    },
    {
      "type": "node",
      "id": 728435743,
      "lat": 35.6570423,
      "lon": 139.704171,
      "tags": {
        "highway": "traffic_signals",
        "traffic_signals": "signal"
      }
    },
    {
      "type": "node",
      "id": 1496233582,
      "lat": 35.6573107,
      "lon": 139.6958352,
      "tags": {
        "direction": "forward",
        "highway": "stop",
        "note": "8時から20時左折のみ"
      }
    },
    {
      "type": "node",
      "id": 1517482490,
      "lat": 35.6637376,
      "lon": 139.6957042,
      "tags": {
        "button_operated": "yes",
        "crossing": "traffic_signals",
        "crossing:island": "no",
        "highway": "crossing",
        "tactile_paving": "yes",
        "traffic_signals:sound": "yes",
        "traffic_signals:vibration": "yes"
      }
    },
    {
      "type": "node",
      "id": 2253572964,
      "lat": 35.6595266,
      "lon": 139.6995209,
      "tags": {
        "crossing": "traffic_signals",
        "crossing:island": "no",
        "crossing:markings": "zebra",
        "highway": "crossing",
        "source": "Bing",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "node",
      "id": 2879100419,
      "lat": 35.6578261,
      "lon": 139.7032977,
      "tags": {
        "highway": "traffic_signals",
        "traffic_signals": "signal",
        "traffic_signals:direction": "forward"
      }
    },
    {
      "type": "node",
      "id": 5133172807,
      "lat": 35.6598909,
      "lon": 139.7038314,
      "tags": {
        "direction": "forward",
        "highway": "stop"
      }
    },
    {
      "type": "node",
      "id": 5244745709,
      "lat": 35.6596029,
      "lon": 139.7003382,
      "tags": {
        "crossing": "unmarked",
        "crossing:markings": "no",
        "crossing_ref": "pedestrian_scramble",
        "highway": "crossing",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "node",
      "id": 5925771435,
      "lat": 35.6573171,
      "lon": 139.6959015,
      "tags": {
        "crossing": "marked",
        "crossing:markings": "yes",
        "highway": "crossing",
        "source": "GSImaps/std",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "node",
      "id": 7234698633,
      "lat": 35.6557085,
      "lon": 139.6952793,
      "tags": {
        "highway": "traffic_signals",
        "traffic_signals": "signal",
        "traffic_signals:direction": "forward"
      }
    },
    {
      "type": "node",
      "id": 9522025514,
      "lat": 35.655751,
      "lon": 139.6952332,
      "tags": {
        "crossing": "traffic_signals",
        "highway": "crossing"
      }
    },
    {
      "type": "node",
      "id": 9790667170,
      "lat": 35.6637627,
      "lon": 139.6957472,
      "tags": {
        "highway": "traffic_signals",
        "note": "右折のみ(自転車を除く)",
        "traffic_signals:direction": "backward"
      }
    },
    {
      "type": "node",
      "id": 10577113262,
      "lat": 35.6595383,
      "lon": 139.6995861,
      "tags": {
        "highway": "traffic_signals",
        "traffic_signals": "signal",
        "traffic_signals:direction": "backward"
      }
    },
    {
      "type": "node",
      "id": 12352271655,
      "lat": 35.6597271,
      "lon": 139.7002653,
      "tags": {
        "crossing": "unmarked",
        "crossing:island": "no",
        "crossing:markings": "no",
        "highway": "crossing"
      }
    },
    {
      "type": "node",
      "id": 258037424,
      "lat": 35.6558953,
      "lon": 139.6918539
    },
    {
      "type": "node",
      "id": 330384175,
      "lat": 35.6557919,
      "lon": 139.6934907
    },
    {
      "type": "node",
      "id": 330384176,
      "lat": 35.6558821,
      "lon": 139.6936846
    },
    {
      "type": "node",
      "id": 330384177,
      "lat": 35.656002,
      "lon": 139.6938463
    },
    {
      "type": "node",
      "id": 330384179,
      "lat": 35.6567149,
      "lon": 139.6942345
    },
    {
      "type": "node",
      "id": 381063833,
      "lat": 35.6558551,
      "lon": 139.6951214
    },
    {
      "type": "node",
      "id": 694150801,
      "lat": 35.6568338,
      "lon": 139.6943226
    },
    {
      "type": "node",
      "id": 694150802,
      "lat": 35.6569461,
      "lon": 139.6944374
    },
    {
      "type": "node",
      "id": 694150803,
      "lat": 35.6570763,
      "lon": 139.6946466
    },
    {
      "type": "node",
      "id": 694150804,
      "lat": 35.6571073,
      "lon": 139.694732
    },
    {
      "type": "node",
      "id": 694150810,
      "lat": 35.6573324,
      "lon": 139.6960331
    },
    {
      "type": "node",
      "id": 705959095,
      "lat": 35.6559039,
      "lon": 139.6921834
    },
    {
      "type": "node",
      "id": 1014529451,
      "lat": 35.6570145,
      "lon": 139.6945146
    },
    {
      "type": "node",
      "id": 1014529619,
      "lat": 35.657216,
      "lon": 139.6953117
    },
    {
      "type": "node",
      "id": 1496233060,
      "lat": 35.6557081,
      "lon": 139.693149
    },
    {
      "type": "node",
      "id": 1496233082,
      "lat": 35.6557712,
      "lon": 139.6925785
    },
    {
      "type": "node",
      "id": 1496233093,
      "lat": 35.6558339,
      "lon": 139.693593
    },
    {
      "type": "node",
      "id": 1496233111,
      "lat": 35.6559663,
      "lon": 139.6938047
    },
    {
      "type": "node",
      "id": 1496233128,
      "lat": 35.6560401,
      "lon": 139.6938851
    },
    {
      "type": "node",
      "id": 1496233134,
      "lat": 35.6560731,
      "lon": 139.6939142
    },
    {
      "type": "node",
      "id": 1496233142,
      "lat": 35.6561091,
      "lon": 139.6939378
    },
    {
      "type": "node",
      "id": 1496233158,
      "lat": 35.6561549,
      "lon": 139.693964
    },
    {
      "type": "node",
      "id": 1496233184,
      "lat": 35.6562197,
      "lon": 139.6939939
    },
    {
      "type": "node",
      "id": 1496233268,
      "lat": 35.6564303,
      "lon": 139.6940627
    },
    {
      "type": "node",
      "id": 1496233408,
      "lat": 35.656639,
      "lon": 139.6941797
    },
    {
      "type": "node",
      "id": 1496233505,
      "lat": 35.6568605,
      "lon": 139.6943479
    },
    {
      "type": "node",
      "id": 1496233513,
      "lat": 35.656894,
      "lon": 139.6943796
    },
    {
      "type": "node",
      "id": 1496365144,
      "lat": 35.6557387,
      "lon": 139.692763
    },
    {
      "type": "node",
      "id": 2866946989,
      "lat": 35.6561991,
      "lon": 139.6939844
    },
    {
      "type": "node",
      "id": 10578455174,
      "lat": 35.6559084,
      "lon": 139.6919622
    },
    {
      "type": "node",
      "id": 11407687534,
      "lat": 35.6559104,
      "lon": 139.6919791
    },
    {
      "type": "node",
      "id": 12142447642,
      "lat": 35.6559334,
      "lon": 139.6937626
    },
    {
      "type": "node",
      "id": 12142447643,
      "lat": 35.6564599,
      "lon": 139.6940737
    },
    {
      "type": "node",
      "id": 12142447644,
      "lat": 35.6564815,
      "lon": 139.6940827
    },
    {
      "type": "node",
      "id": 12142447645,
      "lat": 35.6570906,
      "lon": 139.6946846
    },
    {
      "type": "node",
      "id": 12142447646,
      "lat": 35.6571779,
      "lon": 139.6950513
    },
    {
      "type": "node",
      "id": 12142447647,
      "lat": 35.6572706,
      "lon": 139.6956686
    },
    {
      "type": "node",
      "id": 12142447648,
      "lat": 35.657255,
      "lon": 139.6955812
    },
    {
      "type": "node",
      "id": 12142447649,
      "lat": 35.6572326,
      "lon": 139.6954428
    },
    {
      "type": "node",
      "id": 12142447650,
      "lat": 35.6571713,
      "lon": 139.695006
    },
    {
      "type": "node",
      "id": 12142447651,
      "lat": 35.6570282,
      "lon": 139.6945454
    },
    {
      "type": "node",
      "id": 12142447652,
      "lat": 35.655818,
      "lon": 139.6935542
    },
    {
      "type": "node",
      "id": 12142447653,
      "lat": 35.6557272,
      "lon": 139.6932268
    },
    {
      "type": "node",
      "id": 12142447654,
      "lat": 35.6557039,
      "lon": 139.6929565
    },
    {
      "type": "node",
      "id": 12142447655,
      "lat": 35.6558253,
      "lon": 139.6924238
    },
    {
      "type": "node",
      "id": 12142447656,
      "lat": 35.6559154,
      "lon": 139.6920262
    },
    {
      "type": "node",
      "id": 12142447657,
      "lat": 35.655916,
      "lon": 139.6920545
    },
    {
      "type": "node",
      "id": 12142447658,
      "lat": 35.6559163,
      "lon": 139.6920812
    },
    {
      "type": "node",
      "id": 12142447659,
      "lat": 35.6559149,
      "lon": 139.6921132
    },
    {
      "type": "node",
      "id": 12142447660,
      "lat": 35.6559119,
      "lon": 139.6921456
    },
    {
      "type": "node",
      "id": 13433859587,
      "lat": 35.6559457,
      "lon": 139.6937784
    },
    {
      "type": "node",
      "id": 252674360,
      "lat": 35.6636091,
      "lon": 139.6954918
    },
    {
      "type": "node",
      "id": 508449297,
      "lat": 35.6631762,
      "lon": 139.6959362
    },
    {
      "type": "node",
      "id": 508450677,
      "lat": 35.6633838,
      "lon": 139.6962497
    },
    {
      "type": "node",
      "id": 508450686,
      "lat": 35.6638367,
      "lon": 139.6958742
    },
    {
      "type": "node",
      "id": 1517396344,
      "lat": 35.6635016,
      "lon": 139.6960752
    },
    {
      "type": "node",
      "id": 1517396347,
      "lat": 35.6635692,
      "lon": 139.6961638
    },
    {
      "type": "node",
      "id": 1517396354,
      "lat": 35.6636615,
      "lon": 139.6960647
    },
    {
      "type": "node",
      "id": 1517396355,
      "lat": 35.6636921,
      "lon": 139.6959893
    },
    {
      "type": "node",
      "id": 6227331930,
      "lat": 35.6637809,
      "lon": 139.695918
    },
    {
      "type": "node",
      "id": 9794130809,
      "lat": 35.6641077,
      "lon": 139.6963014
    },
    {
      "type": "node",
      "id": 13903743448,
      "lat": 35.6632022,
      "lon": 139.6959715
    },
    {
      "type": "node",
      "id": 1519733512,
      "lat": 35.6600183,
      "lon": 139.7030535
    },
    {
      "type": "node",
      "id": 2223657334,
      "lat": 35.6596031,
      "lon": 139.7003822
    },
    {
      "type": "node",
      "id": 3608568701,
      "lat": 35.6593116,
      "lon": 139.7006057
    },
    {
      "type": "node",
      "id": 3608568732,
      "lat": 35.6596031,
      "lon": 139.7002431
    },
    {
      "type": "node",
      "id": 3608568753,
      "lat": 35.6596898,
      "lon": 139.7002705
    },
    {
      "type": "node",
      "id": 5091218464,
      "lat": 35.6588971,
      "lon": 139.7004945
    },
    {
      "type": "node",
      "id": 6219729368,
      "lat": 35.6592106,
      "lon": 139.7009763
    },
    {
      "type": "node",
      "id": 6219729369,
      "lat": 35.6592813,
      "lon": 139.7007359
    },
    {
      "type": "node",
      "id": 12352271621,
      "lat": 35.6597293,
      "lon": 139.7002985
    },
    {
      "type": "node",
      "id": 12352271627,
      "lat": 35.6597247,
      "lon": 139.7002294
    },
    {
      "type": "node",
      "id": 12352271647,
      "lat": 35.6593436,
      "lon": 139.7009921
    },
    {
      "type": "node",
      "id": 12352271651,
      "lat": 35.6593674,
      "lon": 139.7006637
    },
    {
      "type": "node",
      "id": 12352271652,
      "lat": 35.6593081,
      "lon": 139.7006208
    },
    {
      "type": "node",
      "id": 12352271653,
      "lat": 35.6589534,
      "lon": 139.7004974
    },
    {
      "type": "node",
      "id": 12352271654,
      "lat": 35.6597131,
      "lon": 139.7003191
    },
    {
      "type": "node",
      "id": 13278216963,
      "lat": 35.659376,
      "lon": 139.7007519
    },
    {
      "type": "node",
      "id": 13278216964,
      "lat": 35.6593802,
      "lon": 139.7007121
    },
    {
      "type": "node",
      "id": 13278216965,
      "lat": 35.659378,
      "lon": 139.700698
    },
    {
      "type": "node",
      "id": 13278216966,
      "lat": 35.6593731,
      "lon": 139.7006799
    },
    {
      "type": "node",
      "id": 13278216967,
      "lat": 35.6593568,
      "lon": 139.7006471
    },
    {
      "type": "node",
      "id": 13278216968,
      "lat": 35.6593377,
      "lon": 139.7006323
    },
    {
      "type": "node",
      "id": 253890308,
      "lat": 35.657964,
      "lon": 139.703173
    },
    {
      "type": "node",
      "id": 1519733425,
      "lat": 35.6597879,
      "lon": 139.7038893
    },
    {
      "type": "node",
      "id": 1519733675,
      "lat": 35.660193,
      "lon": 139.7036578
    },
    {
      "type": "node",
      "id": 2223657363,
      "lat": 35.6598567,
      "lon": 139.703851
    },
    {
      "type": "node",
      "id": 295413618,
      "lat": 35.664265,
      "lon": 139.6965494
    },
    {
      "type": "node",
      "id": 1517396357,
      "lat": 35.6636008,
      "lon": 139.696866
    },
    {
      "type": "node",
      "id": 6227331929,
      "lat": 35.6641872,
      "lon": 139.6965863
    },
    {
      "type": "way",
      "id": 1071659161,
      "nodes": [
        7234698633,
        9522025514,
        381063833
      ],
      "tags": {
        "destination": "道玄坂",
        "highway": "trunk_link",
        "lanes": "2",
        "name": "(道玄坂上)",
        "oneway": "yes",
        "source": "bing 2014,survey;GSImaps/std",
        "surface": "paved",
        "turn:lanes": "slight_right|right"
      }
    },
    {
      "type": "way",
      "id": 1087233628,
      "nodes": [
        728435743,
        2879100419,
        253890308
      ],
      "tags": {
        "highway": "primary",
        "int_name": "Meiji-dori",
        "lanes": "4",
        "lit": "yes",
        "maxspeed": "50",
        "name": "明治通り",
        "name:en": "Meiji Avenue",
        "name:es": "Calle Meiji",
        "name:fr": "Rue Meiji",
        "name:ja": "明治通り",
        "name:ja-Hira": "めいじどおり",
        "name:ja-Latn": "Meiji-dōri",
        "oneway": "yes",
        "ref": "305",
        "source": "Bing 2007-04",
        "surface": "asphalt",
        "turn:lanes": "left;slight_left;through|through|right|right",
        "wikidata": "Q8011176"
      }
    },
    {
      "type": "way",
      "id": 1377702569,
      "nodes": [
        9790667170,
        508450686,
        9794130809
      ],
      "tags": {
        "foot": "no",
        "highway": "tertiary",
        "maxspeed": "40",
        "surface": "asphalt",
        "turn:lanes:backward": "right|right"
      }
    },
    {
      "type": "way",
      "id": 41522094,
      "nodes": [
        508449297,
        13903743448,
        508450677,
        1517396344,
        1517396347,
        1517396354,
        1517396355,
        6227331930,
        508450686
      ],
      "tags": {
        "highway": "service",
        "service": "alley",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1298036687,
      "nodes": [
        2253572964,
        10577113262
      ],
      "tags": {
        "foot": "no",
        "highway": "tertiary",
        "lanes": "4",
        "lit": "yes",
        "name": "道玄坂",
        "name:en": "Dogen-zaka Street",
        "surface": "asphalt",
        "turn:lanes:backward": "through|right"
      }
    },
    {
      "type": "way",
      "id": 664532520,
      "nodes": [
        3608568701,
        12352271652,
        6219729369,
        6219729368,
        12352271647
      ],
      "tags": {
        "highway": "footway",
        "lit": "yes",
        "note": "Before moving, note the path is following the yellow tactile paving, which assists people with reduced eyesight.",
        "surface": "paving_stones",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "way",
      "id": 1335178880,
      "nodes": [
        13278216963,
        13278216964,
        13278216965,
        13278216966,
        12352271651,
        13278216967,
        13278216968,
        12352271652,
        12352271653,
        5091218464
      ],
      "tags": {
        "footway": "sidewalk",
        "highway": "footway",
        "lit": "yes",
        "note": "Before moving, note the path is following the yellow tactile paving, which assists people with reduced eyesight.",
        "surface": "paving_stones",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "way",
      "id": 1335178883,
      "nodes": [
        3608568753,
        353660488,
        12352271654
      ],
      "tags": {
        "crossing": "unmarked",
        "crossing:island": "no",
        "crossing:markings": "no",
        "crossing:scramble": "yes",
        "footway": "crossing",
        "highway": "footway",
        "lit": "yes",
        "surface": "asphalt",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "way",
      "id": 977916824,
      "nodes": [
        2223657334,
        5244745709,
        3608568732
      ],
      "tags": {
        "crossing": "unmarked",
        "crossing:markings": "no",
        "crossing:scramble": "yes",
        "footway": "crossing",
        "highway": "footway",
        "lit": "yes",
        "surface": "asphalt",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "way",
      "id": 1335178868,
      "nodes": [
        12352271627,
        12352271655,
        12352271621
      ],
      "tags": {
        "crossing": "unmarked",
        "crossing:island": "no",
        "crossing:markings": "no",
        "crossing:scramble": "yes",
        "footway": "crossing",
        "highway": "footway",
        "lit": "yes",
        "surface": "asphalt",
        "tactile_paving": "yes"
      }
    },
    {
      "type": "way",
      "id": 30012066,
      "nodes": [
        258037424,
        10578455174,
        11407687534,
        12142447656,
        12142447657,
        12142447658,
        12142447659,
        12142447660,
        705959095,
        12142447655,
        1496233082,
        1496365144,
        12142447654,
        1496233060,
        12142447653,
        330384175,
        12142447652,
        1496233093,
        330384176,
        12142447642,
        13433859587,
        1496233111,
        330384177,
        1496233128,
        1496233134,
        1496233142,
        1496233158,
        2866946989,
        1496233184,
        1496233268,
        12142447643,
        12142447644,
        1496233408,
        330384179,
        694150801,
        1496233505,
        1496233513,
        694150802,
        1014529451,
        12142447651,
        694150803,
        12142447645,
        694150804,
        12142447650,
        12142447646,
        1014529619,
        12142447649,
        12142447648,
        12142447647,
        1496233582,
        5925771435,
        694150810
      ],
      "tags": {
        "alt_name": "特別区道第389号路線",
        "highway": "unclassified",
        "lanes": "1",
        "name": "裏渋谷通り",
        "official_ref": "389",
        "oneway": "yes",
        "sidewalk": "both",
        "source": "GSImaps/std",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 138594011,
      "nodes": [
        1519733512,
        1519733675,
        5133172807,
        2223657363,
        1519733425
      ],
      "tags": {
        "highway": "service",
        "service": "alley",
        "source": "Bing,2007-04"
      }
    },
    {
      "type": "way",
      "id": 1134321670,
      "nodes": [
        252674360,
        1517482490,
        9790667170
      ],
      "tags": {
        "foot": "no",
        "highway": "tertiary",
        "maxspeed": "40",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 138385061,
      "nodes": [
        295413618,
        6227331929,
        1517396357
      ],
      "tags": {
        "highway": "residential",
        "source": "Bing,2007-04"
      }
    }
  ]
};
