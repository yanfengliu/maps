/** Roof fields read from two independent aerial surveys. Material colors are approximations.
 * The audit ledger in tools/quality/roof-observations.tsv retains the full reviewed population. */
interface RoofAppearance { roof: string; roofShape?: 'flat' | 'hipped' | 'gabled' }
const profiles = new Map<string,RoofAppearance>();
function register(ids: string[], appearance: RoofAppearance) {
  for (const id of ids) profiles.set(id, appearance);
}

// light-deck
register([
  'relation/5713211', 'relation/5713342', 'relation/8530450', 'way/26292353', 'way/68584060',
  'way/109150501', 'way/116855068', 'way/130100412', 'way/131641541', 'way/158646524',
  'way/158646537', 'way/158646543', 'way/232715575', 'way/232715587', 'way/232715616',
  'way/232715632', 'way/232715643', 'way/232715646', 'way/232715656', 'way/232715664',
  'way/232715672', 'way/232715705', 'way/232715768', 'way/232715809', 'way/232805681',
  'way/232805682', 'way/232841888', 'way/232841903', 'way/232841905', 'way/383998358',
  'way/383998365', 'way/384207133', 'way/493811440', 'way/597085021', 'way/727171866',
  'way/753430022', 'way/753567324', 'way/887293796', 'way/887293797', 'way/905706377',
  'way/905706378', 'way/905706379', 'way/905706380', 'way/905706381', 'way/905706382',
  'way/922815501', 'way/922815502', 'way/922815503', 'way/927548450', 'way/978632013',
  'way/980496149', 'way/985734158', 'way/985734159', 'way/985734161', 'way/985743262',
  'way/1029436493', 'way/1038158806', 'way/1038160838', 'way/1508655695',
], {roof:'#d4d1c7', roofShape:'flat'});

// neutral-deck
register([
  'way/232715810', 'way/757988119', 'way/936563698', 'way/981290803',
], {roof:'#908d81', roofShape:'flat'});

// panel-rows
register([
  'way/905706383', 'way/905706384', 'way/905706385', 'way/905706386', 'way/905706387',
  'way/905706388',
], {roof:'#515f69', roofShape:'flat'});

// neutral-gable
register([
  'way/232715766', 'way/232715769', 'way/922801147', 'way/922801148', 'way/922801149',
  'way/922801150', 'way/1387116920',
], {roof:'#adb0aa', roofShape:'gabled'});

// light-surface
register([
  'relation/5713341', 'relation/5713354', 'way/31705901', 'way/158646528', 'way/232715579',
  'way/232715580', 'way/232715581', 'way/232715582', 'way/232715602', 'way/232715606',
  'way/232715608', 'way/232715650', 'way/232715671', 'way/232715679', 'way/232715692',
  'way/232715721', 'way/232715723', 'way/232715746', 'way/232715748', 'way/232715761',
  'way/232715778', 'way/232715781', 'way/232715789', 'way/232715805', 'way/232715813',
  'way/232805745', 'way/232841904', 'way/383998357', 'way/384207129', 'way/442933293',
  'way/757988111', 'way/757988124', 'way/757988125', 'way/757988133', 'way/784079435',
  'way/981628183', 'way/981628184', 'way/982390317', 'way/985734162', 'way/985744771',
  'way/1122834586', 'way/1302742360', 'way/1302742371', 'way/1547545772',
], {roof:'#d4d1c7'});

// neutral-pitched
register([
  'way/232715585', 'way/232715736', 'way/232715806', 'way/232715860', 'way/232805666',
  'way/232805691', 'way/232805720', 'way/232805721', 'way/232805728', 'way/232841881',
  'way/232841911', 'way/232841912',
], {roof:'#92928a'});

// warm-hip
register([
  'way/232715598', 'way/232715702', 'way/232805708', 'way/232805709', 'way/232805710',
  'way/232805711', 'way/232805739', 'way/232805741', 'way/232841900', 'way/232841901',
  'way/232841910', 'way/232841946', 'way/341941035', 'way/561917008', 'way/561917009',
  'way/886812786', 'way/1302742362',
], {roof:'#b3795c', roofShape:'hipped'});

register(['way/232715616','way/232715664'],{roof:'#a58970',roofShape:'flat'});
register(['way/232715672'],{roof:'#9ca68f'});

export function photographedRoof(id: string) { return profiles.get(id); }
