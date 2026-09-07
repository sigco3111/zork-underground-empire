import { ITEMS, REST_ROOMS, ROOMS, START_ROOM, TREASURES } from './campaign.ts';
import { BALANCE } from './combat.ts';
import { hasLight } from './darkness.ts';
import { arrivalAt, districtYaw, isHouseGrounds, sceneBounds, worldPosition } from './scene-layout.ts';
import { restoreHouseGorgePosition } from './exterior-geography.ts';
import { restoreRoutePosition } from './route-surfaces.ts';
import type { ActionResult, GameState, ObjectDef, RoomDef } from './types.ts';

const SAVE_VERSION = 2;
const utilityTreasures = ['egg', 'canary', 'torch', 'sceptre'];
const cargoItems = ['coal', 'screwdriver', 'torch'];

export function createGame(): GameState {
  return {
    version: SAVE_VERSION, room: START_ROOM, position: [...ROOMS[START_ROOM].spawn], yaw: 0,
    health: 100, stamina: 100, lantern: false, inventory: [], deposited: [], flags: {},
    visited: [START_ROOM], journal: [{ id: 'arrival', title: '서쪽 — 집 앞', text: ROOMS[START_ROOM].description }],
    checkpoint: START_ROOM, enemies: {}, deaths: 0, playTime: 0,
    completed: false, settings: { volume: 0.65, sensitivity: 1, fov: 75, quality: 'high', motion: true, difficulty: 'adventurer' },
  };
}

export function retryFromCheckpoint(state: GameState): ActionResult {
  const encounter = ROOMS[state.room]?.enemy;
  if (encounter && !state.flags[`${encounter.id}_defeated`]) {
    state.enemies[encounter.id] = Math.round(encounter.health * BALANCE[state.settings.difficulty ?? 'adventurer'].enemyHealth);
  }
  const safeCheckpoint = (state.checkpoint === START_ROOM || REST_ROOMS.includes(state.checkpoint)) && state.visited.includes(state.checkpoint)
    ? state.checkpoint : START_ROOM;
  const room = ROOMS[safeCheckpoint];
  state.room = room.id; state.checkpoint = room.id;
  Object.assign(state, arrivalAt(room.id));
  state.health = 100; state.stamina = 100; state.lantern = hasItem(state, 'lantern');
  return { success: true, travel: room.id, refresh: true, title: '새로운 시도', message: `${room.name}에서 숨을 돌린다. 발견한 것들은 안전하다.`, sound: 'rest' };
}

export function hasItem(state: GameState, id: string): boolean { return state.inventory.includes(id); }
export function ownsItem(state: GameState, id: string): boolean { return hasItem(state, id) || state.deposited.includes(id); }
export function allTreasuresDeposited(state: GameState): boolean { return TREASURES.every(id => state.deposited.includes(id)); }
export function objectVisible(state: GameState, object: ObjectDef): boolean {
  return !(object.hiddenIf && state.flags[object.hiddenIf]) && (!object.requires || Boolean(state.flags[object.requires]));
}
export function visibleObjects(state: GameState): ObjectDef[] { return ROOMS[state.room].objects.filter(object => objectVisible(state, object)); }
export function getObject(state: GameState, id: string): ObjectDef | undefined { return ROOMS[state.room]?.objects.find(object => object.id === id); }

function note(state: GameState, id: string, title: string, text: string): void {
  if (!state.journal.some(entry => entry.id === id)) state.journal.push({ id, title, text });
}
function ok(message: string, title?: string, sound = 'solve'): ActionResult {
  return { success: true, message, title, sound, refresh: true };
}
function no(message: string, title?: string): ActionResult { return { success: false, message, title }; }
function menu(title: string, message: string, choices: { label: string; action: string }[]): ActionResult {
  return { success: true, title, message, choices };
}
function remove(state: GameState, id: string): void { state.inventory = state.inventory.filter(value => value !== id); }
function acquire(state: GameState, id: string): void {
  if (!hasItem(state, id) && !state.deposited.includes(id)) state.inventory.push(id);
  state.flags[`picked_${id}`] = true;
}
function requireHeld(state: GameState, id: string, reason: string): ActionResult | undefined {
  if (hasItem(state, id)) return;
  if (state.deposited.includes(id)) return no(`${ITEMS[id].name}은(는) 트로피 케이스 안에 있다. 케이스에서 잠시 빌려 사용한 뒤, 다시 반납하면 된다.`, '보물이 할 일을 마치지 못했다');
  return no(reason);
}
function useItem(state: GameState, choice: string | undefined, id: string, title: string, observation: string, refusal: string): ActionResult | undefined {
  // The choice is transient. Inventory ownership is checked again when it is
  // submitted, and merely examining the target cannot advance the puzzle.
  if (choice === `use:${id}` && hasItem(state, id)) return;
  const selected = choice?.startsWith('use:') ? choice.slice(4) : undefined;
  return {
    success: choice === undefined, title, message: observation, sound: 'ui', itemSelection: true,
    choices: state.inventory.filter(item => Object.hasOwn(ITEMS, item))
      .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name, 'en'))
      .map(item => ({ label: ITEMS[item].name, action: `use:${item}` })),
    feedback: choice === undefined ? undefined : !selected || !hasItem(state, selected)
      ? '그 물건을 가지고 있지 않다.' : refusal,
  };
}
function treasureCount(state: GameState): number { return TREASURES.filter(id => ownsItem(state, id)).length; }

function take(state: GameState, id: string): ActionResult {
  const item = ITEMS[id];
  if (!item) return no('여기서 가져갈 수 있는 것이 없다.');
  if (ownsItem(state, id)) return no(`${item.name}은(는) 이미 확보했다.`);
  acquire(state, id);
  if (id === 'lantern') {
    state.lantern = true;
    note(state, 'light', '불을 켜라', '황금 등불은 어둠에 대한 네 방어다. 들어 올리면 스스로 켜진다.');
    return ok('들어 올리자 황금 등불이 켜진다. 일정한 빛이 방 안을 채운다.', item.name, 'pickup');
  }
  if (id === 'ancient_map') {
    state.flags.map_found = true;
    state.flags.barrow_path_open = true;
    note(state, 'last_road', '돌무덤', '지도에는 흰 집 북서쪽에 숨겨진 길이 표시되어 있다. 열아홉 보물을 되돌렸고, 이제 마지막 관문이 남았다.');
    return ok('양피지에는 흰 집 북서쪽의 숨겨진 길이 그려져 있다. 그 끝에는 돌무덤이 있다. 스무 번째 보물이 마지막 목적지를 알려 주었다.', '고대 지도', 'reveal');
  }
  if (item.treasure) {
    note(state, `treasure_${id}`, item.name, item.description);
    return ok(`${item.description} 19개의 보물 중 ${treasureCount(state)}번째를 되찾았다.`, item.name, 'treasure');
  }
  return ok(item.description, item.name, 'pickup');
}

function trophyCase(state: GameState, choice?: string): ActionResult {
  const carried = state.inventory.filter(id => TREASURES.includes(id));
  if (choice === 'deposit') {
    if (!carried.length) return no('케이스에 들어갈 보물을 지니고 있지 않다.');
    for (const id of carried) {
      if (!state.deposited.includes(id)) state.deposited.push(id);
      remove(state, id);
    }
    note(state, 'case_used', '트로피 케이스', '보물은 한꺼번에 반납할 수 있다. 전시된 도구는 필요할 때 언제든 케이스에서 다시 빌릴 수 있다.');
    if (allTreasuresDeposited(state)) {
      state.flags.map_revealed = true;
      note(state, 'nineteen', '열아홉 개의 보물', '모든 보물이 케이스로 돌아왔다. 숨겨진 칸이 열리고 고대 지도가 모습을 드러낸다.');
      return ok('열아홉 보물이 한자리에 모였다. 숨겨진 서랍이 미끄러지듯 열리며 케이스 옆에 고대 지도가 나타난다. 마지막 길을 안내하니 어서 가져가라.', '마지막 보물', 'reveal');
    }
    return ok(`${carried.length === 1 ? '한 보물이' : `${carried.length}개의 보물이`} 제자리를 찾았다. 19개 중 ${state.deposited.length}개가 이제 케이스 안에 있다.`, '보물이 돌아왔다', 'treasure');
  }
  if (choice?.startsWith('borrow:')) {
    const id = choice.slice(7);
    if (!utilityTreasures.includes(id) || !state.deposited.includes(id)) return no('그 보물은 빌려갈 수 없다.');
    state.deposited = state.deposited.filter(value => value !== id);
    state.inventory.push(id);
    return ok(`${ITEMS[id].name}을(를) 제자리에서 들어 올린다. 일을 마치면 다시 돌려놓도록.`, '케이스에서 빌렸다', 'pickup');
  }
  const choices: { label: string; action: string }[] = [];
  if (carried.length) choices.push({ label: `${carried.length === 1 ? '보물 1개를 반납한다' : `들고 있는 보물 ${carried.length}개를 모두 반납한다`}`, action: 'deposit' });
  for (const id of utilityTreasures) if (state.deposited.includes(id)) choices.push({ label: `${ITEMS[id].name}을(를) 빌린다`, action: `borrow:${id}` });
  const text = allTreasuresDeposited(state)
    ? (state.flags.map_found ? '열아홉 보물이 모두 모였다. 고대 지도를 따라 돌무덤으로 향하라.' : '열아홉 보물이 모두 모였다. 케이스 옆에 고대 지도가 놓여 있다.')
    : `19개 중 ${state.deposited.length}개가 전시되어 있다. ${carried.length === 1 ? '보물 한 개가' : `보물 ${carried.length}개가`} 가방에 있다. 전시된 보물은 필요할 때 언제든 다시 빌릴 수 있다.`;
  return choices.length ? menu('트로피 케이스', text, choices) : ok(text, '트로피 케이스', 'inspect');
}

function cyclops(state: GameState, choice?: string): ActionResult {
  if (state.flags.cyclops_fled) return ok('키클로프는 사라졌다. 그가 서쪽 벽을 뚫고 나간 자리로 곧장 거실로 통한다.', '고마운 부재', 'inspect');
  if (state.flags.cyclops_passed) return ok('키클로프스는 행복하게 잠들어 있다. 아치 길은 비어 있다.', '키클로프스', 'inspect');
  if (choice?.startsWith('say:')) {
    const words = choice.slice(4).toUpperCase().replace(/[^A-Z]/g, '');
    if (words === 'ODYSSEUS' || words === 'ULYSSES') { state.flags.cyclops_name_known = true; choice = 'name'; }
    else return no('키클로프스는 네 말을 무시한다. 그의 눈이 방 안을 가로질러 너를 따라간다.', '키클로프스');
  }
  if (choice === 'name') {
    if (!state.flags.cyclops_name_known) return no('무엇이라 할 것인가?');
    state.flags.cyclops_passed = true;
    state.flags.cyclops_fled = true;
    note(state, 'cyclops', '오래된 이야기', '오디세우스라는 이름에 키클로프는 서쪽 벽을 뚫고 달아나, 거실로 통하는 지름길을 만들었다.');
    return ok('키클로프는 아버지의 숙적 이름을 듣자, 방 서쪽의 벽을 부수며 방을 빠져나간다.', '키클로프스', 'solve');
  }
  if (choice === 'feed') {
    if (state.flags.cyclops_fed) return no('키클로프스는 매운 고추를 먹은 뒤 헐떡이고 있다. 불에 덴 혀가 사람 입만 한 입 밖으로 내밀려 있다.');
    const missing = requireHeld(state, 'lunch', '키클로프스가 빈 손을 노려본다.');
    if (missing) return missing;
    remove(state, 'lunch'); state.flags.cyclops_fed = true;
    return ok('키클로프스가 말한다. 「음, 음! 매운 고추를 정말 좋아하지! 그런데 아, 한 모금 마실 것을 찾을 수 있을까. 저것의 피를 마실 수 있을지도 모르지.」 그의 눈에 비친 기미를 보건대, 그 「저것」이 바로 너라는 점을 짐작할 수 있다.', '키클로프스', 'pickup');
  }
  if (choice === 'water') {
    if (!state.flags.cyclops_fed) return no('키클로프스는 목마르지 않은 모양이고, 너의 호의를 거절한다.');
    const missing = requireHeld(state, 'water', '건넬 물이 없다.');
    if (missing) return missing;
    remove(state, 'water'); state.flags.cyclops_passed = true;
    note(state, 'cyclops', '저녁과 잠', '고추 샌드위치와 물이 키클로프스에게 잠을 청하도록 만들었다. 보물 창고의 아치가 비었다.');
    return ok('키클로프스가 병을 받아 뚜껑이 열려 있는지 확인하고는 물을 마신다. 잠시 후, 너를 거의 날려 버릴 듯한 하품과 함께 순식간에 잠이 든다 (아무튼, 대체 그 음료에 무엇을 넣은 거지?).', '키클로프스', 'solve');
  }
  const choices = [];
  if (hasItem(state, 'lunch') && !state.flags.cyclops_fed) choices.push({ label: '점심을 건넨다', action: 'feed' });
  if (hasItem(state, 'water')) choices.push({ label: '물을 건넨다', action: 'water' });
  return { ...menu('키클로프스', state.flags.cyclops_fed ? '키클로프스는 매운 고추를 먹은 뒤 헐떡이고 있다. 불에 덴 혀가 사람 입만 한 입 밖으로 내밀려 있다.' : '키클로프스로서는 꽤 배가 고픈 듯 보인다.', choices), prompt: { label: '키클로프스에게 말을 건다', action: 'say', submit: '말하기' } };
}

function eggLock(state: GameState, choice?: string): ActionResult {
  if (state.flags.egg_open) return ok('달걀의 정교한 잠금이 풀려 있다.', '열린 달걀', 'inspect');
  const missing = requireHeld(state, 'egg', '작업대 위에 정교한 잠금해제 도구 세트가 놓여 있다.');
  if (missing) return missing;
  if (!state.flags.thief_defeated && choice !== 'offer') {
    return menu('장인의 관심', '도둑이 보석 박힌 달걀을 흘끗 본다. 잠시, 그 공예품이 너보다 더 흥미롭다.', [{ label: '도둑에게 달걀을 풀게 한다', action: 'offer' }]);
  }
  if (state.flags.thief_defeated) {
    const selection = useItem(state, choice, 'fine_picks', '달걀의 잠금', '보석 박힌 달걀에는 정교하고 섬세한 잠금이 있다. 억지로 열면 공예품이 손상될 것이다.', '잠금이 버틴다. 달걀이 상하기 전에 멈춘다.');
    if (selection) return selection;
  }
  state.flags.egg_open = true;
  acquire(state, 'canary');
  state.flags.thief_distracted = !state.flags.thief_defeated;
  note(state, 'egg_open', '달걀', '달걀 안에는 금빛 카나리아가 있다. 등 쪽에는 작은 태엽 손잡이가 튀어나와 있다.');
  return ok(state.flags.thief_defeated
    ? '잠금해제 도구가 쉽게 돌아간다. 달걀이 열리고, 그 안에서 금빛 태엽 카나리아가 모습을 드러낸다. 어느 쪽 보물도 손상시키지 않고 들어 올린다.'
    : '도둑의 손가락이 잠금 위에서 흐릿하게 움직인다. 열린 달걀을 던지듯 되돌려주며, 「모욕적으로도 단순한 잠금이로군.」 안에는 금빛 태엽 카나리아가 있다. 이 한 번만큼은 그의 자존심이 쓸모가 있었다.', '달걀의 비밀', 'treasure');
}

function controls(state: GameState, choice?: string): ActionResult {
  if (!choice) return menu('관리 제어판', '패널에 네 개의 색깔 버튼이 박혀 있다.', [
    { label: '노란 버튼을 누른다', action: 'yellow' },
    { label: '갈색 버튼을 누른다', action: 'brown' },
    { label: '빨간 버튼을 누른다', action: 'red' },
    { label: '파란 버튼을 누른다', action: 'blue' },
  ]);
  if (choice === 'yellow') {
    state.flags.controls_enabled = true;
    note(state, 'dam_controls', '벽 안에서 딸깍', '노란 버튼이 벽 어딘가에서 딸깍하는 소리를 일으켰다.');
    return ok('딸깍.', '', 'switch');
  }
  if (choice === 'brown') {
    state.flags.controls_enabled = false;
    return ok('딸깍.', '', 'switch');
  }
  if (choice === 'red') return ok('방 안의 불이 일순 깜빡인다.', '', 'switch');
  if (choice === 'blue') {
    if (state.flags.dam_leak) return no('파란 버튼이 끼어 움직이지 않는 듯하다.');
    state.flags.dam_leak = true;
    return ok('으르렁거리는 소리와 함께, 물줄기가 방의 동쪽 벽에서 쏟아져 나온다 (어쩌면 배관에 누수가 생긴 모양이다).', '', 'water');
  }
  return no('그 제어는 패널에 없다.');
}

function ritual(state: GameState, choice?: string): ActionResult {
  if (state.flags.hades_open) return ok('영혼들은 이미 달아났다.', '이제 길은 열렸다', 'inspect');
  if (!choice) {
    const choices = [];
    if (hasItem(state, 'bell')) choices.push({ label: '황동 종을 울린다', action: 'bell' });
    if (hasItem(state, 'candles')) choices.push({ label: '촛불을 켠다', action: 'candles' });
    if (hasItem(state, 'black_book')) choices.push({ label: '검은 책을 큰 소리로 읽는다', action: 'book' });
    return menu('영혼들', state.flags.ritual_candles ? '불꽃이 미친 듯이 흔들리며 춤추는 듯 보인다. 영혼들이 당신의 비인간적인 힘 앞에 움츠린다.' : state.flags.ritual_bell ? '원령들의 조롱이 멈추었다. 그들이 천천히 몸을 돌려 당신을 바라본다.' : '영혼들이 크게 조롱하며 당신을 무시한다.', choices);
  }
  if (choice === 'bell') {
    const missing = requireHeld(state, 'bell', '당신에게는 종이 없다.'); if (missing) return missing;
    state.flags.ritual_bell = true; state.flags.ritual_candles = false;
    return ok('원령들이 마치 마비된 듯 조소를 멈추고 천천히 돌아서서 당신을 마주 본다. 그들의 잿빛 얼굴 위에 오래 잊혀진 공포의 표정이 서서히 드러난다.', '', 'bell');
  }
  if (choice === 'candles') {
    if (!state.flags.ritual_bell) return no('영혼들이 크게 조롱하며 당신을 무시한다.');
    const missing = requireHeld(state, 'candles', '당신에게는 촛불이 없다.') ?? requireHeld(state, 'matches', '이것을 켤 만한 것이 없다.');
    if (missing) return missing;
    state.flags.ritual_candles = true;
    return ok('불꽃이 미친 듯이 흔들리며 춤추는 듯 보인다. 발밑의 대지가 떨리고, 다리가 거의 꺾이려 한다. 영혼들이 당신의 비인간적인 힘 앞에 움츠린다.', '', 'ignite');
  }
  if (choice === 'book') {
    const missing = requireHeld(state, 'black_book', '당신에게는 책이 없다.'); if (missing) return missing;
    if (!state.flags.ritual_bell || !state.flags.ritual_candles) return no('기도의 말은 조롱 속에 묻혀버린다.');
    state.flags.hades_open = true;
    note(state, 'hades', '문이 열린다', '종, 촛불, 책. 의식이 하데스 문에서 영혼들을 몰아냈다.');
    return ok('기도의 한 마디 한 마디가 귀청이 찢어질 듯한 혼란 속에 큰 홀 전체로 울려 퍼진다. 마지막 말이 사라지자, 크고 위엄 있는 목소리가 말한다: 「물러가라, 마귀들아!」 가슴을 멎게 하는 비명이 동굴을 가득 채우고, 더 위대한 힘을 느낀 영혼들은 벽을 뚫고 도망친다.', '', 'reveal');
  }
  return no('영혼들이 크게 조롱하며 당신을 무시한다.');
}

function basket(state: GameState, choice?: string): ActionResult {
  if (state.flags.basket_retrieved) return ok('바구니는 비어 있다. 짐은 아래에서 이미 거두어졌다.', '짐 수거 완료', 'inspect');
  if (state.flags.basket_lowered) return ok('바구니는 아래 압력 분쇄기 옆에서 기다리고 있다. 짐을 회수하려면 옆 통로를 따라가라.', '짐 배송 완료', 'inspect');
  const missing = requireHeld(state, 'coal', '빈 바구니가 수갱 위에 매달려 있다.')
    ?? requireHeld(state, 'screwdriver', '아래 장치에는 좁고 홈이 난 스위치가 있다.')
    ?? requireHeld(state, 'torch', '바구니가 어두운 수갱 속으로 사라진다. 좁은 통로에는 등불이 필요하다.');
  if (missing) return missing;
  if (!choice) return menu('수갱 바구니', '바구니는 석탄, 드라이버, 상아 횃불을 분쇄기 아래로 운반할 수 있다. 당신의 랜턴은 곁에 남는다.', [{ label: '물품을 내린다', action: 'lower' }]);
  if (choice !== 'lower') return no('바구니는 그대로 제자리에 있다.', '수갱 바구니');
  for (const id of cargoItems) { remove(state, id); state.flags[`basket_${id}`] = true; }
  state.flags.basket_lowered = true;
  note(state, 'mine_freight', '짐을 위한 길', '석탄, 드라이버, 상아 횃불이 바구니를 타고 내려갔다. 분쇄기 옆에서 그것들을 회수하라.');
  return ok('석탄, 드라이버, 상아 횃불을 내린다. 불꽃이 수갱을 따라 내려가 아래 분쇄기에 불을 밝힌다. 당신의 랜턴은 좁은 옆 통로를 비춘다.', '바구니가 내려간다', 'mechanism');
}

function machine(state: GameState, choice?: string): ActionResult {
  if (state.flags.diamond_created) return ok(ownsItem(state, 'diamond') ? '분쇄기는 조용하다. 받침 접시가 비어 있다.' : '분쇄기는 일을 끝냈다. 다이아몬드가 받침 접시에 놓여 있다.', '압력이 해제되었다', 'inspect');
  if (choice === 'load') {
    if (state.flags.machine_loaded) return no('석탄은 이미 챔버 안에 있다.');
    if (state.flags.machine_closed) return no('뚜껑이 닫혀 있다.');
    const missing = requireHeld(state, 'coal', state.flags.basket_coal ? '당신의 석탄은 여전히 내려간 바구니 안에 있다.' : '챔버에 넣을 것이 없다.');
    if (missing) return missing;
    remove(state, 'coal'); state.flags.machine_loaded = true;
    return ok('석탄이 압력 챔버에 자리 잡는다.', '탄소 장전 완료', 'mechanism');
  }
  if (choice === 'close') {
    state.flags.machine_closed = true;
    return ok('무거운 뚜껑이 닫힌다.', '챔버 밀봉', 'mechanism');
  }
  if (choice === 'open') {
    state.flags.machine_closed = false;
    return ok('무거운 뚜껑이 열린다.', '', 'mechanism');
  }
  if (choice === 'turn' || choice?.startsWith('use:')) {
    if (!state.flags.machine_closed) return no('기계는 아무것도 하지 않으려는 듯하다.');
    const selection = useItem(state, choice === 'turn' ? undefined : choice, 'screwdriver', '분쇄기의 스위치', '좁고 홈이 난 스위치에 「START」라는 표시가 새겨져 있다.', '그것은 스위치 홈에 맞지 않는다.');
    if (selection) return selection;
    if (!state.flags.machine_loaded) return ok('기계가 윙윙거리며 번쩍이고, 다시 조용해진다. 챔버는 여전히 비어 있다.', '', 'mechanism');
    state.flags.diamond_created = true;
    note(state, 'diamond_made', '한 단계 더 고급진 탄소', '석탄, 밀봉된 챔버, 그리고 홈이 난 스위치. 오래된 분쇄기가 다이아몬드를 만들었다.');
    return ok('기계가 (비유적으로) 살아나 눈부신 색채의 빛과 기묘한 소란을 쏟아낸다. 잠시 후 흥분이 가라앉는다. 거대한 다이아몬드가 받침 접시에 놓여 있다.', '탄소가 변하다', 'reveal');
  }
  const choices = [
    { label: state.flags.machine_closed ? '압력 뚜껑을 연다' : '압력 뚜껑을 닫는다', action: state.flags.machine_closed ? 'open' : 'close' },
    { label: '스위치를 돌린다', action: 'turn' },
  ];
  if (hasItem(state, 'coal') && !state.flags.machine_loaded) choices.push({ label: '석탄을 챔버에 넣는다', action: 'load' });
  const contents = state.flags.machine_loaded ? '챔버에는 석탄이 들어 있다.' : '챔버는 비어 있다.';
  return menu('압력 분쇄기', `${contents} ${state.flags.machine_closed ? '뚜껑이 닫혀 있다.' : '뚜껑이 열려 있다.'} 좁은 스위치에 「START」라는 표시가 있다.`, choices);
}

export function interact(state: GameState, objectId: string, choice?: string): ActionResult {
  const object = getObject(state, objectId);
  if (!object) return no('그런 이름의 것은 여기 없다.');
  if (!objectVisible(state, object)) return no(object.hiddenIf && state.flags[object.hiddenIf] ? '그것은 이미 처리되었다.' : '그것에 손 닿지 않는다.');
  switch (object.action) {
    case 'take': return take(state, object.item ?? object.id);
    case 'read':
      note(state, object.id, object.label, object.description ?? '문자가 닳아서 읽을 수 없다.');
      return ok(object.description ?? '문자가 닳아서 읽을 수 없다.', object.label, 'inspect');
    case 'mailbox':
      state.flags.mailbox_read = true;
      note(state, 'invitation', '전단지', '「ZORK에 오신 것을 환영합니다! ZORK는 모험과 위험, 그리고 잔머리의 게임입니다. 이 게임에서 당신은 죽은 자도 보지 못한 가장 놀라운 땅을 탐험하게 될 것입니다. 어떤 컴퓨터도 이것 없이는 안 될 것입니다!」');
      return ok('「ZORK에 오신 것을 환영합니다! ZORK는 모험과 위험, 그리고 잔머리의 게임입니다. 이 게임에서 당신은 죽은 자도 보지 못한 가장 놀라운 땅을 탐험하게 될 것입니다. 어떤 컴퓨터도 이것 없이는 안 될 것입니다!」', '전단지', 'paper');
    case 'window':
      if (state.flags.window_open) return travel(state, 'behind_house_to_kitchen');
      state.flags.window_open = true;
      return ok('큰 힘을 들여, 들어갈 수 있을 만큼 창문을 연다.', '', 'door');
    case 'rug':
      state.flags.trapdoor_open = true;
      note(state, 'descent', '카펫 아래', '거실의 카펫이 다락문을 숨기고 있었다. 그 아래로 돌계단이 대 지하 제국으로 이어진다.');
      return ok('큰 힘을 들여 카펫을 방 한쪽으로 밀어내자, 닫힌 다락문의 먼지 덮인 덮개가 드러난다. 덮개를 들어올린다. 돌계단이 어둠 속으로 내려간다.', '', 'door');
    case 'cellar_hatch': return travel(state, 'living_room_to_cellar');
    case 'case': return trophyCase(state, choice);
    case 'rest':
      if (ROOMS[state.room].enemy && !state.flags[`${ROOMS[state.room].enemy!.id}_defeated`]) return no('휴식을 취하기 전에 조용한 곳을 찾으라.');
      state.health = 100; state.stamina = 100; state.checkpoint = state.room;
      state.flags[`rest_${state.room}`] = true;
      if (hasItem(state, 'lantern')) state.lantern = true;
      note(state, `rest_${state.room}`, `휴식: ${ROOMS[state.room].name}`, '안전한 모닥불, 나중의 귀환을 위해 표시함.');
      return ok('모닥불 곁에서 쉬었다. 상처가 아물고, 손이 다시 단단해지며, 이 장소가 당신의 안전한 귀환 지점이 된다.', '휴식 끝', 'rest');
    case 'grate': {
      if (state.flags.grate_open) return choice === undefined
        ? travel(state, state.room === 'forest' ? 'forest_to_maze' : 'maze_to_forest')
        : ok('철창은 이미 열려 있다.', '철창', 'inspect');
      const selection = useItem(state, choice, 'skeleton_key', object.label, '철창은 잠겨 있다.', '그것은 자물쇠에 맞지 않는다.');
      if (selection) return selection;
      state.flags.grate_open = true;
      note(state, 'grate', '미로 위의 햇빛', '해골 열쇠가 미로와 숲 사이의 철창을 열었다.');
      return ok('해골 열쇠가 돌아간다. 당신이 철창을 들어올리면, 미로와 숲 사이의 통로가 열린다.', '햇빛으로 돌아가는 길', 'door');
    }
    case 'cyclops_legend':
      state.flags.cyclops_name_known = true;
      note(state, object.id, object.label, object.description!);
      return ok(object.description!, object.label, 'paper');
    case 'cyclops': return cyclops(state, choice);
    case 'egg_lock': return eggLock(state, choice);
    case 'songbird': {
      if (state.flags.bauble_revealed) return ok('노래새는 카나리아에 응답했다. 황금 구슬은 횡목 아래에 있다.', '공정한 교환', 'inspect');
      const selection = useItem(state, choice, 'canary', object.label, '노래새의 지저귐이 들린다.', '노래새는 조금도 감동하지 않은 채 여전히 지저귀고 있다.');
      if (selection) return selection;
      state.flags.bauble_revealed = true;
      note(state, 'song', '응답된 노래', '숲에서 태엽 카나리아를 감자 노래새가 응답했고, 그 부리에서 황금 구슬이 떨어졌다.');
      return ok('카나리아가 약간 음이 빗나간 채로 잊혀진 오페라의 아리아를 지저귄다. 푸른 잎사귀 사이에서 사랑스러운 노래새가 날아와 당신 머리 바로 위 가지에 앉아 부리를 벌려 노래하기 시작한다. 그러자 아름다운 황금 구슬이 그 입에서 떨어져 당신 머리 꼭대기를 한 번 튕기고 풀숲에서 반짝인다. 카나리아가 감자기 멈추자, 노래새는 날아가 버린다.', '', 'bird');
    }
    case 'dome_rope': {
      if (state.flags.dome_secured) return choice === undefined
        ? travel(state, 'dome_to_temple')
        : ok('줄은 이미 난간에 묶여 있다.', '안전한 하강', 'inspect');
      const selection = useItem(state, choice, 'rope', object.label, '아래는 너무 멀어 뛰어내릴 수 없다. 견고한 나무 난간이 돔 주변을 감싸고 있다.', '그것만으로는 안전한 하강이 되지 않는다.');
      if (selection) return selection;
      state.flags.dome_secured = true;
      note(state, 'dome', '안전한 하강', '줄이 돔의 나무 난간에 고정되었다.');
      return ok('줄이 난간에 묶인다.', '', 'mechanism');
    }
    case 'dome_ascent': return travel(state, 'temple_to_dome');
    case 'coffin':
      if (!state.flags.coffin_open) {
        state.flags.coffin_open = true;
        return ok('뚜껑이 뒤로 밀려난다. 안에는 에나멜이 무지개 색으로 배열된 왕의 홀이 놓여 있다. 관을 옮기기 전에 그것을 들어올려라.', '왕의 홀', 'reveal');
      }
      if (!ownsItem(state, 'sceptre')) return no('먼저 열린 관 안에서 왕의 홀을 꺼내라. 뚜껑에 부딪혀 덜컹거리는 운명은 홀에게 어울리지 않는다.');
      return take(state, 'coffin');
    case 'mirror':
      if (state.flags.mirror_awakened) {
        const passage = ROOMS[state.room].exits.find(exit => exit.via === object.id);
        if (passage) return travel(state, passage.id);
      }
      state.flags.mirror_awakened = true;
      note(state, 'mirrors', '은빛의 통로', '거울의 표면이 손끝 아래에서 길을 내어주었다. 그 너머에 다른 방이 있다.');
      return ok('표면이 손끝 아래에서 길을 내어준다. 반대편 방은 거울에 비친 것이 아니다.', '', 'reveal');
    case 'ritual': return ritual(state, choice);
    case 'echo':
      if (state.flags.echo_solved) return ok('방의 음향이 변했다.', '', 'inspect');
      if (choice === 'echo' || choice?.startsWith('say:') && choice.slice(4).toUpperCase().replace(/[^A-Z]/g, '') === 'ECHO') {
        state.flags.echo_solved = true;
        note(state, 'echo', '돌아온 말', '메아리의 이름을 부르자 시끄러운 방이 잠잠해지고 백금 막대로 가는 길이 드러났다.');
        return ok('방의 음향이 미묘하게 변한다.', '', 'reveal');
      }
      if (choice) {
        const word = (choice.startsWith('say:') ? choice.slice(4) : choice).slice(0, 60);
        return { ...menu('시끄러운 방', `「${word.toUpperCase()} ... ${word} ... ${word.toLowerCase()} ...」`, []), prompt: { label: '동굴에 소리친다', action: 'say', submit: '외침' } };
      }
      return { ...menu('시끄러운 방', '모든 소리가 당신 자신의 목소리로 돌아온다.', []), prompt: { label: '동굴에 소리친다', action: 'say', submit: '외침' } };
    case 'controls': return controls(state, choice);
    case 'patch': {
      const selection = useItem(state, choice, 'putty', object.label, '관의 열린 이음새에서 물이 분사된다.', '그것은 새는 이음새를 막을 수 없다.');
      if (selection) return selection;
      state.flags.dam_leak = false;
      return ok('퍼티를 이음새 위에 누른다. 물줄기가 줄어들다가 멈춘다. 튜브에는 여전히 충분한 양이 남았다.', '관 봉인', 'solve');
    }
    case 'dam_bolt': {
      if (state.flags.reservoir_drained) return ok('수문은 열린 채로 고정되어 있다. 저수지 계단은 비어 있고, 강은 아래에서 안전하게 흐른다.', '댐이 작동 중', 'inspect');
      const selection = useItem(state, choice, 'wrench', object.label, '컨트롤 패널에 큰 사각 볼트가 장착되어 있다. 그 위에 작은 녹색 거품이 있다.', '그것만으로는 사각 볼트를 잡을 수 없다.');
      if (selection) return selection;
      if (!state.flags.controls_enabled) return no('볼트가 움직이지 않는다. 녹색 표시등이 꺼져 있다.');
      if (state.flags.dam_leak) return no('볼트가 흔들리다 멈춘다. 압력 게이지가 비어 있다.');
      state.flags.reservoir_drained = true;
      note(state, 'dam_open', '수문', '수문이 열리고, 저수지가 비기 시작했다.');
      return ok('렌치가 큰 볼트를 돌린다. 댐 깊은 곳에서 수문이 솟아오른다. 물이 천둥처럼 쏟아져 나가 저수지 바닥과 북안으로 내려가는 계단이 드러난다.', '홍수 조절 댐 3호', 'water');
    }
    case 'bat': {
      if (state.flags.bat_quiet) return ok(ownsItem(state, 'jade') ? '박쥐는 매우 점잖게 거리를 유지한다. 광산 통로는 비어 있다.' : '박쥐는 매우 점잖게 거리를 유지한다. 옥 조각상과 광산 통로가 모두 비어 있다.', '단념은 계속된다', 'inspect');
      const selection = useItem(state, choice, 'garlic', object.label, '큰 흡혈 박쥐가 천장에 매달려 있다. 당신이 다가가자 그것이 으르렁거린다.', '박쥐는 이빨을 드러내고 제자리에 머문다.');
      if (selection) return selection;
      state.flags.bat_quiet = true;
      note(state, 'bat', '자그마한 방어', '마늘이 흡혈 박쥐를 광산 통로와 옥 조각상에서 몰아냈다.');
      return ok('마늘을 들어올린다. 흡혈 박쥐는 매우 분한 비명을 지르며 동굴 가장 높은 곳으로 물러난다.', '부엌의 지혜', 'solve');
    }
    case 'gas': {
      if (state.flags.gas_safe) return ok('맑은 공기가 옆갱의 벽을 따라 흐른다. 그 길을 따라 가는 길은 비어 있다.', object.label, 'inspect');
      const selection = useItem(state, choice, 'lantern', object.label, '공기에서 석탄 가스의 강한 냄새가 난다. 경고문이 노출된 불꽃을 금지한다. 나무로 보강된 갱도는 어둠 속으로 사라진다.', ['use:torch', 'use:candles', 'use:matches'].includes(choice ?? '') ? '불꽃을 가스에서 멀리 둔다. 그것은 매우 어리석은 일이다.' : '그것은 가스를 안전하게 통과하는 길을 찾는 데 도움이 되지 않는다.');
      if (selection) return selection;
      if (!state.lantern) return no('랜턴이 꺼져 있다. 옆갱을 시도하기 전에 먼저 켜라.', object.label);
      state.flags.gas_safe = true;
      return ok('랜턴의 봉인된 셔터를 확인한다. 맑은 공기가 벽을 따라 흐르고, 갱도 멀리에서 무언가 반짝인다.', '더 안전한 빛', 'solve');
    }
    case 'basket': return basket(state, choice);
    case 'basket_retrieve':
      if (!state.flags.basket_lowered) return no('바구니는 내려가지 않았다. 위쪽 탄광에서 짐을 싣고 오라.');
      for (const id of cargoItems) if (state.flags[`basket_${id}`]) { acquire(state, id); state.flags[`basket_${id}`] = false; }
      state.flags.basket_retrieved = true;
      return ok('석탄, 드라이버, 상아 횃불을 회수한다. 열린 분쇄기의 압력 챔버가 곁에서 기다린다.', '짐 회수', 'pickup');
    case 'machine': return machine(state, choice);
    case 'boat': {
      if (state.flags.boat_ready) return ok('보트는 부풀려져 부두에 준비되어 있다. 강으로 나가는 길이 열려 있다.', '출항 준비', 'inspect');
      const selection = useItem(state, choice, 'pump', object.label, '접힌 플라스틱은 inflatable 보트다. 밸브가 닫혀 있다.', '그것은 보트를 부풀리지 않는다.');
      if (selection) return selection;
      state.flags.boat_ready = true;
      note(state, 'boat', 'inflatable 보트', '보트가 부풀려졌다.');
      return ok('보트가 부풀어 항해에 적합해 보인다.', '', 'water');
    }
    case 'buoy':
      if (!state.flags.boat_ready) return no('부표는 강 한가운데 있다. 보트로 도달하라.');
      return take(state, 'emerald');
    case 'land':
      if (state.flags.river_moored) return ok('보트는 안전한 소용돌이에 묶여 있다. 해변과 폭포 길이 열려 있다.', '안전한 상륙', 'inspect');
      if (choice === 'current') return no('중앙 수로는 하얀 폭포로 끝난다. 당신은 소용돌이 안쪽으로 노를 젓는다. 표지판이 안전한 부두 쪽을 가리키고 있다.');
      if (choice !== 'shore') return menu('강 부두', '보호된 수로가 모래 해안 쪽으로 휘어진다. 주류는 폭포를 향해 빨라진다.', [{ label: '보호된 해안으로 노를 젓는다', action: 'shore' }, { label: '중앙류를 살핀다', action: 'current' }]);
      state.flags.river_moored = true;
      return ok('소용돌이로 들어가 보트를 안전하게 묶는다. 모래 동굴과 폭포로 가는 길이 부둣가 너머에 있다.', '현명한 도착', 'water');
    case 'dig': {
      if (state.flags.scarab_revealed) return ok(ownsItem(state, 'scarab') ? '구멍만 남았다. 더 파는 것은 필요 이상의 모험이다.' : '스카라베가 드러났다. 모래가 스스로 의견을 갖기 전에 파기를 멈춘다.', '발굴 충분', 'inspect');
      const selection = useItem(state, choice, 'shovel', object.label, '바람이 모래를 여기 깊은 더미로 불어 모았다.', '모래를 약간 흩뜨릴 뿐, 더 진전되지 않는다.');
      if (selection) return selection;
      state.flags.scarab_revealed = true;
      return ok('흔들린 더미 사이를 신중히 파헤친다. 보석 박힌 스카라베가 빛 속으로 미끄러져 나온다. 더 파는 것은 필요 이상의 모험이다.', '모래의 비밀', 'reveal');
    }
    case 'rainbow': {
      if (state.flags.rainbow_solid) return ok(ownsItem(state, 'gold') ? '무지개는 견고하다. 먼 길은 숲으로 돌아간다.' : '무지개는 견고하다. 금화 주머니가 건너편에서 기다리고, 먼 길은 숲으로 돌아간다.', '빛으로 만든 길', 'inspect');
      const selection = useItem(state, choice, 'sceptre', object.label, '무지개는 아름답지만, 걷기에는 너무 막연하다.', '무지개는 여전히 이전처럼 막연하다.');
      if (selection) return selection;
      state.flags.rainbow_solid = true;
      note(state, 'rainbow', '빛으로 만든 길', '아라겐 폭포에서 이집트 홀을 들어올리자 무지개가 견고해졌다. 건너편으로 가는 길은 금과 숲으로 돌아가는 길로 이어진다.');
      return ok('갑자기 무지개가 견고해지고, 감히 말하건대, 걸을 수 있게 된다.', '', 'reveal');
    }
    case 'ending':
      if (!allTreasuresDeposited(state)) return no('최후의 문은 열아홉 보물이 모두 트로피 케이스 안에 함께 모이기를 기다린다. 빌려간 것을 모두 돌려놓아라.');
      if (!state.flags.map_found) return no('트로피 케이스에서 오래된 지도를 가져가라. 그것이 마지막 초대장이다.');
      state.flags.barrow_entered = true; state.completed = true;
      note(state, 'master', '대모험가', '열아홉 보물을 되찾았다. 오래된 지도를 손에 넣었다. 돌무덤에 들어섰다.');
      return { ...ok('당신이 돌무덤에 들어서자, 문이 뒤에서 되돌릴 수 없이 닫힌다.', '대모험가', 'win'), ending: true };
    default: return ok(object.description ?? '세월의 흔적이 여기 남았다.', object.label, 'inspect');
  }
}

export function travel(state: GameState, exitId: string): ActionResult {
  const exit = ROOMS[state.room]?.exits.find(value => value.id === exitId);
  if (!exit) return no('그 쪽으로 가는 통로가 없다.');
  if (exit.requires && !state.flags[exit.requires]) return no(exit.blocked ?? '아직 길이 열리지 않았다.');
  const destination = ROOMS[exit.to];
  if (!destination) return no('통로가 막혀 있다.');
  const arrival = arrivalAt(destination.id, state.room);
  state.room = destination.id;
  state.position = arrival.position; state.yaw = arrival.yaw;
  if (!state.visited.includes(destination.id)) {
    state.visited.push(destination.id);
    note(state, `place_${destination.id}`, destination.name, destination.description);
  }
  return { success: true, travel: destination.id, refresh: true, title: destination.name, message: destination.description, sound: 'travel' };
}

export function defeatEnemy(state: GameState, id: string): ActionResult {
  const enemy = ROOMS[state.room]?.enemy;
  if (!enemy || enemy.id !== id) return no('그런 상대는 여기에 없다.');
  if (state.flags[`${id}_defeated`]) return ok('통로는 이미 비어 있다.', undefined, 'inspect');
  state.flags[`${id}_defeated`] = true; state.enemies[id] = 0;
  state.health = Math.min(100, state.health + 20); state.stamina = 100;
  if (id === 'troll') {
    note(state, 'troll_defeated', '첫 번째 수호자', '트롤이 쓰러졌다. 둥근 방과 미로가 열렸다.');
    return ok('도끼가 마지막으로 돌을 내리친다. 둥근 방과 미로를 향해 길이 열린다. 당신은 숨을 돌린다.', '트롤이 쓰러졌다', 'victory');
  }
  note(state, 'thief_defeated', '마지막 요구', '도둑이 쓰러졌다. 그의 은잔과 정교한 픽들이 작업대 곁에 남았다.');
  return ok('도둑의 스틸레토가 바닥을 가로질러 딸깍거린다.', '도둑이 쓰러졌다', 'victory');
}

export function objective(state: GameState): { title: string; text: string } {
  if (ROOMS[state.room].dark && !hasLight(state)) return { title: '어둠', text: '칠흑 같은 어둠이 내리깔렸다. 그루에게 잡아먹힐 가능성이 매우 높다.' };
  if (state.completed) return { title: '위대한 모험가', text: '열아홉 가지 보물이 모두 제자리를 찾았다. 당신은 돌무덤 입구에 들어섰다.' };
  if (allTreasuresDeposited(state)) return state.flags.map_found
    ? { title: '돌무덤으로', text: '지도에는 흰집 북서쪽의 길이 표시되어 있다.' }
    : { title: '트로피 상자', text: '열아홉 가지 보물 사이에 무언가가 달라졌다.' };
  const r = state.room;
  if (r === 'behind_house') return { title: '집 뒤편', text: state.flags.window_open ? '작은 창문이 열려 있다.' : '작은 창문이 살짝 열린 듯하다.' };
  if (r === 'west_house') {
    if (!state.visited.includes('kitchen')) return { title: '흰집', text: state.flags.window_open ? '집이 그다지 접근 불가능하지는 않게 되었다.' : '끝없이 펼쳐진 들판과 흰집, 그리고 판자로 막힌 정문.' };
    if (!state.flags.trapdoor_open) return { title: '흰집', text: '들어갈 길을 찾았다. 그 안에는 아직 살펴볼 것이 남아 있다.' };
  }
  if (r === 'kitchen') return { title: '흰집 안쪽', text: '서쪽으로 통하는 복도가 있고, 위로는 계단으로 이어진다.' };
  if (r === 'attic') return { title: '처마 밑', text: hasItem(state, 'rope') ? '출구는 아래로 내려가는 계단뿐이다.' : '서까래 사이에 무언가가 남아 있다.' };
  if (r === 'living_room') {
    if (!hasItem(state, 'lantern')) return { title: '거실', text: '버려진 집 안에 몇 가지 쓸 만한 물건이 남아 있다.' };
    if (!state.flags.trapdoor_open) return { title: '거실', text: '가구가 한 번 더 살펴볼 만하다.' };
    if (!state.flags.troll_defeated) return { title: '집 아래', text: '열린 뚜껑문이 어둠 속으로 이어진다.' };
    return { title: '트로피 상자', text: `${state.deposited.length}개 보물 진열 · 회수 ${treasureCount(state)}개.` };
  }
  if (r === 'cellar') return { title: '지하실', text: '좁은 통로가 북쪽 어둠 속으로 이어진다.' };
  if (r === 'troll_bridge' && !state.flags.troll_defeated) return { title: '트롤', text: '험상궂은 트롤이 피 묻은 도끼를 휘두르며 통로를 막고 있다.' };
  if (r === 'forest') {
    if (state.flags.bauble_revealed && !ownsItem(state, 'bauble')) return { title: '풀숲의 빛', text: '노래새의 부리에서 무언가가 떨어졌다.' };
    if (ownsItem(state, 'egg') && !ownsItem(state, 'canary')) return { title: '정교한 금박 장식', text: '보통의 달걀과는 달리, 이 달걀에는 경첩이 달려 있다.' };
    return { title: '숲의 소리', text: '멀리서 노래새가 지저귀는 소리가 들려온다.' };
  }
  if (r === 'maze') return { title: '구불구불한 미로', text: '운 없던 모험가는 뼈만 남긴 채 더 많은 것을 두고 갔다.' };
  if (r === 'cyclops' && !state.flags.cyclops_passed) return { title: '사이클롭스', text: state.flags.cyclops_fed ? '매운 고추를 먹은 사이클롭스가 헐떡이고 있다.' : '그의 눈빛은 (하찮은 모험가는 물론) 말 따위까지도 먹을 준비가 된 듯하다.' };
  if (r === 'treasure_room' && !state.flags.thief_defeated) return { title: '라이벌 수집가', text: '수상쩍은 인물이 죽음의 단도로 무장하고 있다.' };
  if (r === 'dome') return { title: state.flags.dome_secured ? '아래층 방' : '가파른 낭떠러지', text: state.flags.dome_secured ? '나무 난간에서 밧줄이 매달려 있다.' : '이 돔은 아래층 방의 천장을 이루고 있다.' };
  if (r === 'temple' && !state.flags.hades_open) return { title: '고대의 비문', text: '고대 조커들의 신앙은 알기 어렵다.' };
  if (r === 'hades' && !state.flags.hades_open) return { title: '모든 희망을 버려라', text: state.flags.ritual_candles ? '영혼들이 너의 기이한 힘 앞에 움츠린다.' : state.flags.ritual_bell ? '혼령들의 조롱이 멈추고, 그들이 천천히 너를 향해 돌아본다.' : '문 너머의 길은 사악한 영혼들에 의해 막혀 있다.' };
  if (r === 'loud_room') return { title: '시끄러운 방', text: state.flags.echo_solved ? '방의 음향이 미묘하게 달라졌다.' : '방 안은 정체 모를 물 흐르는 소리로 귀가 먹먹할 정도로 시끄럽다.' };
  if (['dam', 'maintenance'].includes(r)) return { title: state.flags.reservoir_drained ? '물이 감춘 것' : state.flags.dam_leak ? '누수' : '홍수 조절 댐 #3', text: state.flags.reservoir_drained ? '댐 뒤의 수위가 낮아졌다.' : state.flags.dam_leak ? '손상된 파이프에서 물이 새어 나오고 있다.' : state.flags.controls_enabled ? '녹색 플라스틱 풍선장식이 고요하게 빛나고 있다.' : '버려진 기계와, 아직 쓸 만해 보이는 제어 장치.' };
  if (r === 'bat_cavern' && !state.flags.bat_quiet) return { title: '달갑지 않은 손님', text: '큰 박쥐 한 마리가 천장에 매달려 있다.' };
  if (r === 'coal_mine') {
    if (!state.flags.gas_safe) return { title: '석탄 가스', text: '공기 속에서 석탄 가스가 강하게 풍긴다. 동쪽으로 목재로 보강된 측갱도가 있다.' };
    return { title: state.flags.basket_lowered ? '아래층 화물' : '갱도 수갱', text: state.flags.basket_lowered ? '사슬이 아래쪽 작업장으로 사라진다.' : '철 사슬이 화물을 수갱 아래로 내린다. 북쪽에는 별도의 통로가 제분소로 이어진다.' };
  }
  if (r === 'machine_room') return { title: '기계', text: state.flags.diamond_created ? ownsItem(state, 'diamond') ? '기계가 멈췄다. 트레이는 비어 있다.' : '기계가 멈췄다. 트레이에 무언가가 남아 있다.' : !state.flags.basket_retrieved ? '화물 바구니가 기계 옆에 도착해 있다.' : !state.flags.machine_loaded ? state.flags.machine_closed ? '챔버는 비어 있다. 뚜껑은 닫혀 있다.' : '챔버는 비어 있다.' : !state.flags.machine_closed ? '챔버에는 석탄이 들어 있다. 뚜껑은 여전히 열려 있다.' : '뚜껑은 닫혀 있다. 매우 좁은 스위치에 「START」라고 적혀 있다.' };
  if (r === 'dam_base') return { title: '한강(寒江)', text: state.flags.boat_ready ? '보트가 부풀려졌다. 강이 고요하게 흐른다.' : '작은 밸브가 달린, 접힌 플라스틱 뭉치가 놓여 있다.' };
  if (r === 'river') return { title: '폭포 앞', text: state.flags.river_moored ? '보호되는 둑에 도착했다.' : '물이 더욱 빠르게 흐른다. 앞쪽에서 들리는 소리는 쏟아지는 물소리다.' };
  if (r === 'falls') return { title: '아라간 폭포', text: state.flags.rainbow_solid ? '단단한 무지개가 폭포를 가로지른다.' : '아름다운 무지개가 폭포와 그 서쪽 하늘에 걸려 있다.' };
  if (treasureCount(state) === TREASURES.length) return { title: '컬렉션', text: '열아홉 가지 보물을 되찾았다. 트로피 상자가 그들을 기다린다.' };
  return { title: '위대한 지하 제국', text: `${state.deposited.length}개 보물 진열 · 회수 ${treasureCount(state)}개.` };
}

export function hints(state: GameState): string[] {
  const r = state.room;
  if (ROOMS[r].dark && !hasLight(state)) return hasItem(state, 'lantern')
    ? ['칠흑 같은 어둠이 내리깔렸다. 그루에게 잡아먹힐 가능성이 매우 높다.', '끝없는 식욕도 빛에 대한 두려움 앞에서는 누그러진다. 손에 든 등불에는 켜는 스위치가 있다.', 'L 키를 눌러 황동 등불을 켜라.']
    : ['칠흑 같은 어둠이 내리깔렸다. 그루에게 잡아먹힐 가능성이 매우 높다.', '그 집 안에는 빛을 꺼낼 물건이 있었다. 그것 없이 여기서 계속하는 것은 위험하다.', '거실로 돌아가 트로피 상자 왼쪽의 황동 등불을 집어라. 들어 올리면 자동으로 켜진다.'];
  if (state.completed) return ['원정이 끝났다. 돌무덤이 당신을 받아들였다.', '여행 일지에 지나간 길과 푼 수수께끼가 기록되어 있다.', '여행을 계속하거나, 타이틀 화면에서 새로운 원정을 시작하라.'];
  if (r === 'barrow') return allTreasuresDeposited(state)
    ? ['지도가 무덤의 문 앞으로 당신을 이끌었다.', '문이 열려 있다. 그 너머 어둠 속에 무엇이 있는지는 보이지 않는다.', '돌무덤 입구로 다가가 E 키를 눌러 진입하라.']
    : ['마지막 여정은 상자 안에 들어 있는 열아홉 가지 보물로 시작되었다.', '빌려 온 보물이 아직 당신 곁에 함께하고 있다.', '빌린 보물을 거실 트로피 상자에 돌려놓고, 다시 돌무덤으로 돌아와라.'];
  if (allTreasuresDeposited(state)) return state.flags.map_found
    ? ['지도에는 흰집 근처의 작은 공터가 표시되어 있다.', '그 길들 중 하나에는 「돌무덤으로」라고 적혀 있다.', '집 서쪽으로 돌아가 북서쪽 길을 따라가 돌무덤 입구로 들어가라.']
    : ['마지막 보물이 상자에 들어갔을 때, 무언가가 달라지지 않았는가?', '완성된 컬렉션 옆을 살펴보라.', '트로피 상자 옆에 나타난 고대 지도를 집어라.'];
  switch (r) {
    case 'west_house':
    case 'behind_house': {
      if (!state.flags.mailbox_read && r === 'west_house') return ['정문 옆의 작은 물건을 살펴보았는가?', '우편함은 무엇인가를 담아 두도록 만들어진 것이다.', '작은 우편함으로 다가가 E 키를 눌러 열고 그 안의 전단을 읽어라.'];
      if (!state.visited.includes('kitchen')) return state.flags.window_open
        ? ['이제 창문이 열려 있다.', '내부를 들여다보는 것 이상의 일도 할 수 있을 만큼 충분히 크다.', '열린 주방 창문 앞에서 E 키를 한 번 더 눌러 안으로 기어 들어가라.']
        : r === 'behind_house'
          ? ['집의 모든 개구부가 똑같이 잘 잠겨 있는가?', '어떤 창문은 아주 살짝 열려 있다.', '주방 창문에서 E 키를 눌러 열고, 다시 E 키를 눌러 안으로 들어서라.']
          : ['정문이 집의 전부가 아니다.', '벽을 따라 돌아 다른 개구부도 살펴보라.', '흰집 뒤로 돌아가 작은 창문에서 E 키를 눌러 열고, 다시 E 키를 눌러 안으로 들어가라.'];
      if (!state.visited.includes('living_room')) return ['주방 너머의 방도 탐험해 보았는가?', '주방 식탁에서 서쪽으로 통하는 복도가 이어진다.', '주방으로 들어가 서쪽 출입문으로 거실로 향하라.'];
      if (!state.flags.trapdoor_open) return ['이 집은 비밀이 아직 조금 남았다.', '거실의 가구들이 다시 한 번 살펴볼 가치가 있다.', '거실로 돌아가 큰 동양식 융단 앞에서 E 키를 눌러 살펴보라.'];
      return ['판자로 막힌 집이 약속했던 것 이상의 것을 품고 있었던 셈이다.', '트로피 상자는 당신이 발견한 보물들에 목적을 부여한다.', '들고 있는 보물을 거실 상자에 돌려놓아라. 열린 뚜껑문은 지하 통로로 이어진다.'];
    }
    case 'forest': {
      if (!ownsItem(state, 'egg')) return ['나무의 낮은 가지를 살펴보았는가?', '둥지 안의 무언가가 빛을 받는다.', '둥지로 다가가 E 키를 눌러 보석 박힌 달걀을 집어라.'];
      if (!ownsItem(state, 'canary')) return ['보통의 달걀과는 달리, 이 달걀에는 경첩이 달려 있다.', '정교한 걸쇠에는 손재주가 필요하다. 보통의 힘으로는 어림없다.', '보물 방의 도적 작업대로 달걀을 가져가라. 필요하면 상자에서 빌려도 된다. 도적이 쓰러졌다면, 정교한 송곳을 거두어 작업대에서 선택하라.'];
      if (!state.flags.bauble_revealed) return ['노래새는 어떤 소리에 다른 소리보다 더 관심을 보인다.', '당신의 태엽 카나리아는 노래하도록 만들어졌다.', '노래새를 살펴보며 배낭에서 태엽 카나리아를 골라라. 상자에 진열했다면 먼저 상자에서 빌려오라.'];
      if (!ownsItem(state, 'bauble')) return ['노래새가 부리를 열자 무언가가 떨어졌다.', '앉은 가지 아래의 풀숲을 살펴보라.', '노래새의 나무 아래에서 황동 장식구를 집어라.'];
      if (!state.flags.grate_open) return ['낙엽 아래에 오래된 쇠가 있다.', '그 철창에는 들어 올리는 손잡이가 아닌 자물쇠가 달려 있다.', '미로에서 얻은 해골 열쇠를 철창에 사용하라. 그러면 양방향으로 그 길을 쓸 수 있다.'];
      return ['오솔길과 철창 모두 이 공터에서 멀어진다.', '한 곳은 집 쪽으로, 다른 곳은 지하로 이어진다.', '철창을 통해 미로로 돌아가거나, 흰집까지 걸어가 보물을 진열하라.'];
    }
    case 'kitchen':
      if (['lunch', 'water', 'garlic'].some(id => !state.flags[`picked_${id}`])) return ['식탁이 얼마 전에 음식 준비에 쓰인 흔적이 있다.', '그 위에 남은 몇 가지 식료품은 가지고 갈 수 있다.', '식탁에서 매운 고추 샌드위치, 물병, 마늘을 챙겨라.'];
      if (!state.visited.includes('attic')) return ['계단을 따라 올라가 보았는가?', '그 위는 집의 지붕 쪽으로 이어진다.', '주방의 위층 출구로 다락방으로 올라가 그곳에 남은 것을 살펴보라.'];
      return ['서쪽 출입문 너머에 또 하나의 방이 있다.', '그 가구는 주방의 것과는 결이 좀 다르다.', '서쪽 출입문으로 거실로 들어가라.'];
    case 'attic': return hasItem(state, 'rope')
      ? ['서까래 아래에 남아 있던 것을 모두 가져갔다.', '출구는 아래로 내려가는 계단뿐이다.', '주방 계단으로 내려가 다시 서쪽 출입문으로 거실로 가라.']
      : ['서까래 아래에 무언가가 동그랗게 말려 있다.', '삼밧줄은 원정에 쓸 만한 장비다.', '큰 밧줄 뭉치로 다가가 E 키를 눌러 집어라.'];
    case 'living_room': {
      if (!hasItem(state, 'lantern')) return ['이 방 안에서 빛을 내줄 만한 것이 있는가?', '황동 등불은 전지로 작동한다.', '트로피 상자 왼쪽의 황동 등불을 집어라. 들어 올리면 자동으로 켜진다.'];
      if (!hasItem(state, 'sword') && !state.flags.troll_defeated) return ['이 집이 줄 수 있는 보호를 생각해 보았는가?', '묵은 검은 그저 장식이 아니다.', '트로피 상자 오른쪽 찬장에서 엘프의 검을 집어라.'];
      if (!state.flags.trapdoor_open) return ['바닥의 어느 정도까지 실제로 볼 수 있는가?', '큰 융단은 다른 것들이 가리지 않는 바닥의 일부를 덮고 있다.', '큰 동양식 융단 앞에서 E 키를 눌러 치우고, 드러난 뚜껑문 앞에서 E 키를 눌러 내려가라.'];
      if (!state.flags.troll_defeated) return ['뚜껑문이 열려 있다.', '계단은 집 아래, 북쪽으로 이어지는 통로 쪽으로 내려간다.', '열린 뚜껑문에서 E 키를 눌러 지하실로 들어간 뒤 북쪽 통로를 탐험하라.'];
      if (treasureCount(state) === TREASURES.length) return ['컬렉션은 완성되었지만, 전부 진열되어 있는가?', '배낭에 든 보물 중 아직 상자에 없는 것이 있다.', '트로피 상자를 살펴 들고 있는 모든 보물, 빌린 것을 포함하여 진열하라.'];
      return ['트로피 상자가 보통 비어 두는 곳은 아니다.', '당신이 발견한 것들 중 어느 것이 컬렉션에 어울리는지 생각하라.', '트로피 상자를 살펴 들고 있는 보물을 진열하라. 진열된 보물은 필요할 때 다시 빌릴 수 있다.'];
    }
    case 'cellar': return ['북쪽으로 좁은 통로가 이어진다.', '그 근처의 긁힌 자국은 보통 도구로 남긴 흔적보다 크다.', '북쪽 통로로 나아가라. 검이나 등불을 두고 왔다면 먼저 거실에서 회수하라.'];
    case 'troll_bridge': return state.flags.troll_defeated
      ? ['트롤은 더 이상 통로를 막지 않는다.', '서쪽 통로는 구불구불 멀어지고, 북쪽 홀은 더 넓다.', '서쪽 통로들을 따라 미로로 가거나, 북쪽 홀로 둥근 방으로 가라.']
      : ['트롤이 다음 한 번을 휘두르기까지 얼마나 걸리는가?', '그는 무거운 일격을 단단히 준비하고, 잠시 숨을 고르며 회복한다.', hasItem(state, 'sword') ? '일격이 떨어지기 직전에 Q로 회피 또는 R로 받아쳐라. 회복하는 동안 F로 베라. 필요하면 뒤쪽 통로가 열려 있다.' : '거실로 돌아가 엘프의 검이나 정교한 송곳을 챙겨라. 그다음 도끼를 회피 또는 받아치고 트롤이 회복하는 동안 베라.'];
    case 'round_room': {
      const exit = ROOMS[r].exits.find(e => (!e.requires || state.flags[e.requires]) && !state.visited.includes(e.to));
      return ['통로들이 모두 같은 종류의 장소로 이어지는 것은 아니다.', '측량 기록에는 다듬어진 돌과 물소리를 구분해 적어 두었다.', exit ? `「${exit.label}」이라 적힌 통로로 가라. 그곳은 아직 당신이 가보지 않은 곳이다.` : '갤러리, 돔, 댐은 모두 이 방에서 닿을 수 있다. 아직 살펴볼 것을 남긴 갈래를 골라라.'];
    }
    case 'gallery': return ownsItem(state, 'painting')
      ? ['등받이 없이 내버려 둔 천재의 작품이 이제 더 안전한 손에 닿았다.', '갤러리는 훨씬 더 큰 방 쪽으로 이어진다.', '돔 갤러리 출구로 나아가 돔을 살펴보거나 둥근 방으로 돌아가라.']
      : ['훔친 자들이 모든 것을 가져가지는 않았다.', '한 액자에는 비교할 수 없을 만큼 아름다운 그림이 남아 있다.', '남아 있는 그림 앞으로 다가가 E 키를 눌러 집어라.'];
    case 'maze':
      if (!state.flags.cyclops_name_known) return ['운 없던 모험가가 적은 글이 남아 있다.', '그것은 미로 너머에서 누군가를 기다리고 있을지도 모른다는 내용이다.', '동전과 해골 열쇠를 거두어, 남은 시체 곁의 마지막 메모를 읽어라.'];
      if (!state.flags.grate_open) return ['약간의 햇빛이 미로의 이 구역까지 닿는다.', '해골 열쇠와 철창은 같은 오래된 자물쇠에 맞는다.', '철창에서 해골 열쇠를 써서 숲으로 가는 길을 열어라.'];
      return ['메모에는 이 통로들 너머의 생물이 적혀 있다.', '통로 하나는 미로에서 더 큰 방 쪽으로 이어진다.', '외눈의 수호자 쪽으로 통로를 따라가라. 탐험가의 메모에 적힌 선원은 「오디세우스」다. 사이클롭스에게 그 이름을 말하라.'];
    case 'cyclops': {
      if (state.flags.cyclops_passed) return ['사이클롭스는 더 이상 당신의 길을 막지 않는다.', '그 너머의 아치 길이 이제 갈 수 있다.', '아치 길로 보물 방으로 지나가라.'];
      if (state.flags.cyclops_fed) return ['매운 고추를 먹은 사이클롭스가 헐떡이고 있다.', '불에 덴 혀가 사람 크기 입에서 삐져나와 있다.',
      '물병을 내밀어라. 두고 왔다면 주방 식탁 위에 있다.'];
      return ['그는 말 따위는커녕 하찮은 모험가 정도는 거리낌 없이 먹을 준비가 된 듯하다.', '어쩌면 당신이 들고 있는 것 중 그가 당신보다 더 먹고 싶어하는 것이 있을지 모른다.', state.flags.cyclops_name_known ? '매운 고추 샌드위치를 건넨 뒤 물을 줘라. 혹은 탐험가의 메모에 적힌 선원의 이름인 「오디세우스」라 말하라.' : '주방의 매운 고추 샌드위치를 건넨 뒤 물병을 줘라. 미로의 탐험가 메모에 또 다른 방법이 적혀 있다.'];
    }
    case 'treasure_room':
      if (ownsItem(state, 'egg') && !ownsItem(state, 'canary')) return ['도적의 작업대를 살펴보았는가?', '그의 도구는 당신이 가진 보석 박힌 달걀의 걸쇠에 어울리는 종류다.', '달걀을 배낭에 넣은 채 작업대를 사용하라. 필요하면 상자에서 빌려도 된다. 도적이 쓰러졌다면 작업대 옆의 정교한 송곳을 거두어 그걸 걸쇠에 골라라.'];
      if (!state.flags.thief_defeated) return ['단도는 트롤의 도끼보다 빠르다.', '도적은 반격할 시간이 더 짧지만, 찌른 뒤에는 여전히 회복이 필요하다.', '찌르기를 회피하거나 받아치고, 그가 회복하는 동안 베라. 지키고 있는 잔을 가져오기 전에 그를 먼저 쓰러뜨려라.'];
      if (!ownsItem(state, 'chalice')) return ['도적이 쓰러진 뒤에도 값진 것이 남아 있다.', '그의 정교하게 새겨진 잔은 이제 지키는 사람이 없다.', '은잔을 집어라.'];
      return ['주인이 없어도 작업대는 여전히 쓸모가 있다.', '정교한 자물쇠와 보통 무기는 서로 다른 기술이 필요하다.', '정교한 잠금이 있는 물건을 찾았다면 이 작업대로 가져와라. 그렇지 않다면 사이클롭스 방을 지나 돌아가라.'];
    case 'dome': return state.flags.dome_secured
      ? ['밧줄이 아래층 방으로 매달려 있다.', ownsItem(state, 'torch') ? '고정된 밧줄이 신전으로 이어진다.' : '이제 상아 횃불을 손에 넣을 수 있다.', ownsItem(state, 'torch') ? '고정된 밧줄을 살펴 신전으로 내려가라.' : '상아 횃불을 거두어 든 다음, 고정된 밧줄을 살펴 신전으로 내려가라.']
      : ['나무 난간의 두 줄 홈은 무엇이 만든 것인가?', '오래된 섬유는 삼이다. 난간은 상당한 무게를 견딜 수 있다.', '다락방의 밧줄 뭉치를 가져와 나무 난간에 사용해라.'];
    case 'egypt':
      if (!state.flags.coffin_open) return ['관은 얼마나 단단히 밀봉되어 있는가?', '관은 값진 물건인 동시에 그 자체로 그릇이기도 하다.', '금관 뚜껑을 열어 안을 살펴라. 안의 것을 꺼낸 다음, 다시 살펴 관 자체를 들어 올려라.'];
      if (!ownsItem(state, 'sceptre')) return ['열린 관 안에 장식된 무언가가 놓여 있다.', '색을 입힌 에나멜은 무덤의 그림들보다 더 잘 보존되어 있다.', '관 안에서 이집트의 왕홀을 집어라.'];
      if (!ownsItem(state, 'coffin')) return ['빈 관은 여전히 단단한 금으로 만들어졌다.', '안의 내용물만이 이 곳의 보물만은 아니다.', '열린 관을 다시 살펴 들어 올려라.'];
      return ['무덤은 보물을 내어주었다.', '그 서쪽 통로는 신전으로 돌아간다.', '서쪽으로 돌아 신전으로 가라. 왕홀의 색 에나멜을 잊지 마라.'];
    case 'temple':
      if (['bell', 'candles', 'black_book'].some(id => !hasItem(state, id))) return ['제단 위에 무엇이 남아 있는가?', '그 책에는 악을 쫓아내는 의식에 관한 읽을 수 있는 페이지가 있다.', '황동 종, 초 한 쌍, 검은 책을 챙겨라. 배낭에서 책 설명을 읽고, 하데스의 문을 살펴보라.'];
      if (!state.flags.hades_open) return ['책에는 소리, 빛, 기도에 관해 적혀 있다.', '신전의 물건들은 어떤 의식에 쓰였던 것으로 보인다.', '종, 초, 책을 가지고 하데스의 문으로 가라. 의식이 막히면 그곳에서 다시 단서를 요청하라.'];
      if (!state.flags.mirror_awakened) return ['이 신전에 거울이 있다.', '그 안의 반영이 주위의 방과 완전히 들어맞지는 않는다.', 'E 키를 눌러 고대 거울을 살펴 그 통로를 드러내라.'];
      return ['영혼들이 굴복했고 은빛 통로가 열렸다.', '이제 이 신전은 지하의 두 갈래를 잇는다.', state.flags.dome_secured ? '거울을 지나 아틀란티스로 가거나 밧줄을 타고 돔으로 올라가라.' : '거울을 지나 아틀란티스로 가라.'];
    case 'hades':
      if (state.flags.hades_open) return ownsItem(state, 'skull')
        ? ['문이 비었고 해골은 당신의 것이다.', '신전이 살아 있는 세계로 돌아가는 길이다.', '신전으로 돌아가라. 아직 살펴보지 않았다면 거울과 동쪽 방도 가볼 만하다.']
        : ['이제 영들이 들어오는 것을 막지 않는다.', '먼 구석 어딘가가 당신을 향해 씩 웃고 있는 것처럼 보인다.', '문을 지나 수정 해골을 집어라.'];
      if (state.flags.ritual_candles) return ['영혼들이 너의 기이한 힘 앞에서 움츠린다.', '의식은 아직 말로 옮기는 부분이 남아 있다.', '돌로 된 낭독대에서 검은 책을 읽어라.'];
      if (state.flags.ritual_bell) return ['혼령들의 조롱이 멈추고 당신을 향해 돌아섰다.', '이제 그들이 귀를 기울이고 있으니, 무언가가 그들의 시선을 사로잡아야 한다.', '관리실의 성냥갑을 사용해 낭독대에서 초에 불을 붙이고, 검은 책을 읽어라.'];
      return ['문은 열렸지만 길이 막혀 있다.', '신전의 책에는 사악함에 대항하는 의식이 적혀 있다. 보통의 힘만으로는 이 영혼들을 움직이지 못한다.', '신전의 종과 초, 검은 책, 그리고 관리실의 성냥갑을 가져와라. 낭독대에서 종을 울리고 초에 불을 붙인 다음 책을 읽어라.'];
    case 'loud_room': return state.flags.echo_solved
      ? ['방의 음향이 미묘하게 달라졌다.', ownsItem(state, 'platinum_bar') ? '같은 말을 되풀이해도 더 얻을 것은 없다.' : '고요 속에서 백금 막대도 손에 닿는다.', ownsItem(state, 'platinum_bar') ? '흐르는 물 쪽 통로로 나아가 댐으로 가거나 둥근 방으로 돌아가라.' : '동굴 바닥에서 백금 막대를 집어라.']
      : ['네가 부를 때 누구의 목소리가 대답하는가?', '방은 네가 준 것을 그대로 돌려준다. 그 현상을 일컫는 단어를 떠올려 보라.', '메아리 돌을 살펴 입력 칸에 「Echo」라 입력하고 동굴에 불러라. 그다음 백금 막대를 집어라.'];
    case 'dam':
    case 'maintenance':
      if (state.flags.reservoir_drained) return ['수위가 내려갔다.', '저수지 아래에 가려 있던 땅이 드러났다.', '댐에서 저수지 둑 출구로 가서 드러난 분지를 살펴라.'];
      if (state.flags.dam_leak) return ['손상된 파이프 사이로 물이 새어 나오고 있다.', '끈적한 재질은 물이 흘러도 제자리에 남을 수 있다.', '관리실에서 프로보즈 마법 잼을 가져와 새는 파이프에 발라라.'];
      if (!state.flags.controls_enabled) return r === 'maintenance'
        ? ['딸깍 소리가 들리는 방에서만 항상 효과가 나타나는가?', '유색 버튼을 누른 뒤 댐의 녹색 풍선을 살펴보라.', '노란 버튼을 눌러라. 렌치를 챙겨 댐으로 돌아가 큰 볼트에 사용하라.']
        : ['볼트만이 제어판의 전부가 아니다.', '녹색 풍선은 지시등인 듯하다. 다른 제어가 그에 영향을 줄 수 있다.', '관리실로 가 노란 버튼을 누르고 렌치를 챙겨라. 댐으로 돌아와 큰 볼트를 돌려라.'];
      return ['녹색 플라스틱 풍선장식이 고요하게 빛나고 있다.', '제어 장치는 준비가 되었다. 볼트는 그 모양에 맞는 도구가 아직 필요하다.', hasItem(state, 'wrench') ? '큰 볼트를 살펴 배낭에서 렌치를 골라라.' : '관리실에서 렌치를 챙긴 다음, 댐의 큰 볼트에 사용하라.'];
    case 'reservoir':
      if (!ownsItem(state, 'jewel_trunk')) return ['물러난 물이 진흙 속에 무엇을 남겼는가?', '오래된 트렁크의 일부가 드러나 있다.', '분지에서 보물 트렁크를 집어라.'];
      if (!hasItem(state, 'pump')) return ['북쪽 둑에 장비가 있다.', '그 작은 손 펌프는 물에 휩쓸려 가지 않았다.', '북쪽 선착장 옆에서 손 펌프를 거두어라.'];
      return ['분지는 서로 다른 두 통로로 이어진다.', '하나는 오래된 기둥들 사이로, 다른 하나는 석탄을 품은 산 아래로 흐른다.', !ownsItem(state, 'trident') ? '서쪽 통로로 아틀란티스로 가 둑을 살펴라.' : '석탄을 품은 산 아래로 북쪽 통로로 가라.'];
    case 'atlantis':
      if (!state.flags.reservoir_drained) return ['물이 여전히 신전 일부와 당신을 가로막고 있다.', '이 폐허의 수위는 저수지와 함께 한다.', '홍수 조절 댐 #3으로 돌아가라. 관리실의 노란 버튼으로 제어를 켜고 렌치로 댐 볼트를 돌려라.'];
      if (!ownsItem(state, 'trident')) return ['투명한 무언가가 둑에서 빛을 받아 보인다.', '그 물건은 세 끝을 가졌고 고대 바다 신의 것이다.', '둥지에서 포세이돈의 수정 삼지창을 집어라.'];
      if (!state.flags.mirror_awakened) return ['거울을 가까이 살펴보았는가?', '비석이 은빛 선으로 두 동일한 방을 잇는다.', '고대 거울을 살펴 신전으로 가는 길을 열어라.'];
      return ['신전의 보물은 되찾았다.', '거울은 저수지를 피하는 더 짧은 길을 제공한다.', '은빛 통로로 신전으로 가거나, 저수지를 지나 광산 쪽으로 돌아가라.'];
    case 'bat_cavern':
      if (!state.flags.bat_quiet) return ['박쥐가 어두운 가운데에서도 어떻게 당신을 찾는가?', '광부의 메모는 그 박쥐의 후각을 이용하라고 제안한다.', '주방의 마늘을 가져와 박쥐의 보금자리를 살펴 배낭에서 마늘을 골라라.'];
      return ownsItem(state, 'jade')
        ? ['박쥐는 더 이상 통로에 신경을 쓰지 않는다.', '그 보금자리 아래 길은 석탄광으로 이어진다.', '북쪽 통로로 광산으로 들어가라.']
        : ['박쥐의 보금자리 아래에 무언가가 남아 있다.', '작은 인물상은 옥으로 깎여 있다.', '옥 인형을 집어 들고 석탄광으로 들어가라.'];
    case 'coal_mine':
      if (!state.flags.gas_safe) return ['공기 속에서 석탄 가스가 강하게 풍긴다.', '경고는 노출된 불씨에 특별히 주의를 줘라.', '황동 등불을 켠 채로 동쪽 가스가 가득한 측갱도를 살펴와 배낭에서 등불을 골라라.'];
      if (!ownsItem(state, 'bracelet')) return ['측갱도 더 먼 곳에 빛나는 것이 있다.', '어둠 속에서 푸른 보석이 드러난다.', '목재로 보강된 측갱도를 따라 사파이어 박힌 팔찌로 가라.'];
      if (!state.flags.basket_lowered) return ['사슬과 좁은 통로는 서로 다른 종류의 통행을 위해 만들어졌다.', '화물 목록은 제분소의 장비와 그 운용자를 구분한다.', '석탄, 스크루드라이버, 상아 횃불을 수갱 바구니에 넣어라. 석탄은 여기에, 스크루드라이버는 관리실에, 횃불은 돔 아래에 있다. 상자에 진열했다면 횃불을 빌려오라.'];
      if (!state.flags.basket_retrieved) return ['짐을 실은 바구니가 시야 아래로 내려갔다.', '당신의 화물은 배낭이 아니라 아래에 있다.', '하부 제분소 통로로 내려가 내린 바구니에서 화물을 회수하라.'];
      return state.flags.diamond_created
        ? ['제분소는 일을 끝냈다.', '박쥐 방을 지나던 길이 댐 쪽으로 돌아간다.', '박쥐 방과 저수지를 지나 댐으로 돌아가라. 그곳의 불이 집으로 안전히 돌아가는 길을 제공한다.']
        : ['화물이 아래 작업장에 닿았다.', '제분소는 수갱 옆 통로로 닿을 수 있다.', '기계실로 들어가 기계와 그 명판을 살펴라.'];
    case 'machine_room':
      if (!state.flags.basket_retrieved) return ['바구니가 기계 옆에 도착했다.', '그 안에는 아직 짐이 그대로 있다.', '내려온 바구니를 살펴 짐을 회수하라.'];
      if (!state.flags.machine_loaded && state.flags.machine_closed) return ['닫힌 챔버는 비어 있다.', '샘플은 챔버가 밀봉되기 전에 안에 있어야 한다.', '압력 뚜껑을 열고 석탄을 넣은 다음, START 스위치를 돌리기 전에 뚜껑을 닫아라.'];
      if (!state.flags.machine_loaded) return ['이 기계가 다루도록 만들어진 물질은 어떤 종류일까?', '명판은 탄소를 명시한다. 광산이 무엇을 내는지 떠올려라.', '기계를 살펴 챔버에 석탄을 넣어라.'];
      if (!state.flags.machine_closed) return ['석탄이 챔버에 있지만 뚜껑이 열려 있다.', '압력에는 밀봉이 필요하다.', '기계를 살펴 압력 뚜껑을 닫아라.'];
      if (!state.flags.diamond_created) return ['스위치에는 손가락보다 훨씬 좁은 틈이 있다.', '평평한 도구라면 인간의 손이 못 닿는 곳에도 들어간다.', '기계의 START 스위치를 돌리는 데 스크루드라이버를 사용하라.'];
      return ownsItem(state, 'diamond')
        ? ['실험은 결과를 내놓았다.', '다이아몬드를 다시 넣을 필요는 없다.', '광산을 지나 다이아몬드를 가지고 돌아가라. 그것은 트로피 상자에 들어갈 보물이다.']
        : ['기계가 멈추고 트레에서 무언가가 빛난다.', '결과물이 넣은 석탄과는 사뭇 다르다.', '받는 트레에서 거대한 다이아몬드를 집어라.'];
    case 'dam_base': return state.flags.boat_ready
      ? ['보트가 부풀려졌다.', '댐 부근에서 강이 고요하게 흐른다.', '한강 출구로 나가 보트를 띄워라.']
      : ['접힌 플라스틱에는 작은 밸브가 달려 있다.', '공기만 빠진 보트다.', hasItem(state, 'pump') ? '손 펌프를 접힌 플라스틱에 사용해라.' : '저수지 북쪽 둑의 손 펌프를 챙긴 다음 여기서 접힌 플라스틱에 사용하라.'];
    case 'river':
      if (!ownsItem(state, 'emerald')) return ['여기에 아마도 경고용 붉은 부표가 있다.', '대부분의 부표는 속이 비어 있다.', '붉은 부표를 열어 그 안의 것을 거두어라.'];
      if (!state.flags.river_moored) return ['물이 쏟아지는 소리가 점점 더 커진다.', '보호된 수로가 모래 둑에 닿는다.', '보호된 정지리를 살펴 모래 둑 쪽으로 배를 몰라라.'];
      return ['정지리에 도착했다.', '동굴과 폭포 모두 여기서 닿을 수 있다.', !state.visited.includes('sandy_cave') ? '모래 둑 통로로 동굴로 가라.' : '아라간 폭포 쪽 길로 가라.'];
    case 'sandy_cave':
      if (!state.flags.scarab_revealed) return ['벽의 자국이 모래 아래로 사라진다.', '모래 더미에는 벽 밑보다 더 많은 것이 묻혀 있을 수 있다.', '동굴 어귀의 삽을 챙긴 다음 모래 더미에 사용하라.'];
      return ownsItem(state, 'scarab')
        ? ['모래 더미는 보물을 내어주었다.', '폭포 오솔길이 동굴에서 멀어진다.', '폭포 오솔길로 아라간 폭포로 가거나, 강 정지리로 돌아가라.']
        : ['파낸 모래 속에서 무언가가 반짝인다.', '보통의 돌이 아니라 곤충 모양이다.', '모래에서 보석 박힌 풍뎅이를 집어라.'];
    case 'falls':
      if (!state.flags.rainbow_solid) return ['무지개가 손 닿을 듯 가깝다.', '일곱 색이 한데 모인 것을 다른 곳에서도 본 적이 있는가?', '금관 속 이집트 왕홀을 가져와 무지개에 사용하라. 트로피 상자에 있다면 먼저 빌려라.'];
      return ownsItem(state, 'gold')
        ? ['무지개가 당신의 무게를 받아주었다.', '그 먼 끝이 숲 쪽으로 돌아간다.', '무지개 다리를 이용해 숲으로 돌아가 금을 트로피 상자에 갖다 놓아라.']
        : ['단단한 무지개가 폭포를 가로지른다.', '그 먼 끝을 살펴보라.', '건너가 금 항아리를 거두어라.'];
    default: return ['이 방을 떠나기 전에 남아 있는 것을 살펴라.', '일지에는 이미 읽은 비문이 적혀 있다.', '아직 가지 않은 갈 수 있는 통로로 가거나, 들고 있는 보물을 거실 상자에 돌려놓아라.'];
  }
}

export function hintKey(state: GameState): string { return JSON.stringify([state.room, hints(state)]); }

export function serialize(state: GameState): string { return JSON.stringify(state); }

function bounded(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(entry => typeof entry === 'string'); }
function plain(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export function deserialize(raw: string): GameState | null {
  try {
    if (typeof raw !== 'string' || raw.length > 1_000_000) return null;
    const data: unknown = JSON.parse(raw);
    if (!plain(data) || ![1, SAVE_VERSION].includes(data.version as number) || typeof data.room !== 'string' || !Object.hasOwn(ROOMS, data.room)) return null;
    if (!strings(data.inventory) || !strings(data.deposited) || !strings(data.visited) || !plain(data.flags)) return null;
    if (data.inventory.some(id => !Object.hasOwn(ITEMS, id)) || data.deposited.some(id => !TREASURES.includes(id))) return null;
    const deposits = data.deposited;
    if (new Set(data.inventory).size !== data.inventory.length || new Set(deposits).size !== deposits.length || data.inventory.some(id => deposits.includes(id))) return null;
    if (!Array.isArray(data.position) || data.position.length !== 2 || data.position.some(value => typeof value !== 'number' || !Number.isFinite(value))) return null;
    const state = createGame();
    if (plain(data.settings) && ['explorer', 'adventurer', 'veteran'].includes(String(data.settings.difficulty))) {
      state.settings.difficulty = data.settings.difficulty as 'explorer' | 'adventurer' | 'veteran';
    }
    const bounds = sceneBounds(data.room), arrival = arrivalAt(data.room);
    const position = data.version === 1 ? worldPosition(data.room, data.position as [number, number]) : data.position as [number, number];
    state.room = data.room;
    state.position = [bounded(position[0], bounds.minX + 0.4, bounds.maxX - 0.4, arrival.position[0]), bounded(position[1], bounds.minZ + 0.4, bounds.maxZ - 0.4, arrival.position[1])];
    state.yaw = bounded(data.yaw, -1e9, 1e9, 0) + (data.version === 1 ? districtYaw(data.room) : 0);
    state.health = bounded(data.health, 0, 100, 100); state.stamina = bounded(data.stamina, 0, 100, 100);
    state.inventory = [...data.inventory]; state.deposited = [...data.deposited];
    state.flags = {};
    for (const [key, value] of Object.entries(data.flags)) {
      if (!/^[a-z][a-z0-9_]{0,80}$/.test(key) || ['constructor', 'prototype', '__proto__'].includes(key) || typeof value !== 'boolean') return null;
      state.flags[key] = value;
    }
    for (const id of [...state.inventory, ...state.deposited]) state.flags[`picked_${id}`] = true;
    state.position = restoreRoutePosition(state.room, state.position, state.flags);
    if (isHouseGrounds(state.room)) state.position = restoreHouseGorgePosition(state.position);
    state.lantern = Boolean(data.lantern) && hasItem(state, 'lantern');
    state.visited = [...new Set(data.visited.filter(id => Object.hasOwn(ROOMS, id)))];
    if (!state.visited.includes(state.room)) state.visited.push(state.room);
    state.checkpoint = typeof data.checkpoint === 'string' && (data.checkpoint === START_ROOM || REST_ROOMS.includes(data.checkpoint)) && state.visited.includes(data.checkpoint) ? data.checkpoint : START_ROOM;
    state.journal = Array.isArray(data.journal) ? data.journal.filter((entry): entry is { id: string; title: string; text: string } => plain(entry) && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.text === 'string').slice(0, 300).map(entry => ({ id: entry.id.slice(0, 100), title: entry.title.slice(0, 200), text: entry.text.slice(0, 2000) })) : state.journal;
    if (plain(data.enemies)) for (const id of ['troll', 'thief']) {
      if (!Object.hasOwn(data.enemies, id)) continue;
      const definition = Object.values(ROOMS).find(room => room.enemy?.id === id)?.enemy;
      if (!definition) continue;
      const maximum = Math.round(definition.health * BALANCE[state.settings.difficulty ?? 'adventurer'].enemyHealth);
      state.enemies[id] = state.flags[`${id}_defeated`] ? 0 : bounded(data.enemies[id], 0, maximum, maximum);
    }
    state.deaths = Math.floor(bounded(data.deaths, 0, 1e6, 0)); state.playTime = bounded(data.playTime, 0, 1e12, 0);
    if (plain(data.settings)) {
      state.settings.volume = bounded(data.settings.volume, 0, 1, state.settings.volume);
      state.settings.sensitivity = bounded(data.settings.sensitivity, 0.1, 5, state.settings.sensitivity);
      state.settings.fov = bounded(data.settings.fov, 50, 110, state.settings.fov);
      state.settings.quality = data.settings.quality === 'high' ? 'high' : 'balanced';
      state.settings.motion = typeof data.settings.motion === 'boolean' ? data.settings.motion : true;
    }
    state.completed = data.completed === true && TREASURES.every(id => ownsItem(state, id)) && state.flags.map_found === true && state.flags.barrow_entered === true;
    return state;
  } catch { return null; }
}

export function roomHasLivingEnemy(state: GameState, room: RoomDef = ROOMS[state.room]): boolean {
  return Boolean(room.enemy && !state.flags[`${room.enemy.id}_defeated`]);
}
