import type { ExitDef, ItemDef, ObjectDef, RoomDef, RoomKind, Vec2 } from './types.ts';

// Room and object prose draws on the MIT-licensed original Zork I source at
// historicalsource/zork1 commit 97b7b3d68c075dd9af7da499c3e9690ada3471fd.
// Directions and state-dependent clauses are condensed to fit this geography.
// Source mapping: qa/source-design.md. License: licenses/ZORK-MIT.txt.
export const START_ROOM = 'west_house';

const item = (id: string, name: string, description: string, treasure = false): ItemDef => ({ id, name, description, treasure });
export const ITEMS: Record<string, ItemDef> = Object.fromEntries([
  item('lantern', '황동 랜턴', '건전지식 황동 랜턴입니다.'),
  item('sword', '엘프의 검', '고대 엘프가 만든 검입니다.'),
  item('rope', '밧줄', '삼으로 된 두꺼운 밧줄 한 줄입니다.'),
  item('lunch', '고추 샌드위치', '갈색 봉지에 담긴 매콤한 고추 샌드위치입니다.'),
  item('water', '물 병', '물이 담긴 유리 병입니다.'),
  item('garlic', '마늘 한 쪽', '마늘 한 쪽입니다. 그 냄새는 의심할 여지없이 강렬합니다.'),
  item('skeleton_key', '뼈대 열쇠', '운 없던 모험가의 유품에 끼어 있던 뼈대 열쇠입니다.'),
  item('wrench', '스패너', '사각 머리를 가진 무거운 스패너입니다.'),
  item('screwdriver', '드라이버', '납작하고 좁은 날을 가진 드라이버입니다.'),
  item('putty', '프로보즈 마법 퍼티', '「프로보즈 마법 퍼티 회사 — 만능 퍼티.」 내용은 끈적한 물질입니다.'),
  item('matches', '성냥갑', '겉면에는 「아름다운 FCD#3에 오세요」라고 적혀 있습니다. 안쪽에는 「쓰기 전에 커버를 닫으세요」.'),
  item('pump', '핸드펌프', '소형 핸드펌프입니다.'),
  item('shovel', '삽', '날에 모래가 묻어 있는 삽입니다.'),
  item('coal', '석탄 한 덩이', '작은 석탄 한 덩이입니다.'),
  item('bell', '황동 종', '작은 황동 종입니다.'),
  item('candles', '양초 한 쌍', '신전 제단의 양초 한 쌍입니다.'),
  item('black_book', '검은 책', '569쪽 옆에 또 한쪽 읽을 수 있는 페이지가 있을 뿐 대부분은 알아볼 수 없습니다. 대략 내용은 악의 추방과 관련된 듯합니다. 어찌된 영문·기도문 등이 이에 유효해 보입니다.'),
  item('fine_picks', '도둑의 정교한 픽', '도둤의 작업대 위의 매우 정교한 도구 세트입니다.'),
  item('egg', '보석 박힌 달걀', '금박 세공이 빽빽하게 박혀 있고, 청금석과 진주母로 장식되어 있습니다. 보통의 달걀과 달리, 이 달걀은 경첩으로 이어져 있으며 정교한 걸쇠가 달려 있습니다.', true),
  item('canary', '금빛 태엽 카나리아', '루비 눈과 은 부리를 가졌습니다. 왼쪽 날개 아래 수정 창 너머로 복잡한 태엽 장치가 보입니다. 태엽이 다 돌아간 모양입니다.', true),
  item('bauble', '아름다운 황동 장식구', '빛 속에서 반짝이는 아름다운 황동 장식구입니다.', true),
  item('painting', '아름다운 그림', '잘 알려지지 않은 천재가 그린 그림입니다.', true),
  item('platinum_bar', '백금 덩어리', '커다란 백금 덩어리입니다.', true),
  item('torch', '아이보리 횃불', '아이보리로 만든 불 붙은 횃불입니다.', true),
  item('coffin', '금관', '람세스 2세의 장례에 쓰인 순금의 관입니다.', true),
  item('sceptre', '이집트 왕홀', '고대 이집트의 왕이었던 것 같은 홀입니다. 왕홀은 색유리로 장식되어 있고, 끝은 날카롭게 끝이 뾰족합니다.', true),
  item('jewel_trunk', '보석 상자', '여러 보석으로 빵빵한 오래된 상자입니다.', true),
  item('trident', '수정 삼지창', '포세이돈의 수정 삼지창입니다.', true),
  item('jade', '비취 조각상', '정교한 비취 조각상입니다.', true),
  item('bracelet', '사파이어 박힌 팔찌', '사파이어가 박힌 팔찌입니다.', true),
  item('diamond', '거대한 다이아몬드', '엄청난 크기의 다이아몬드(완벽한 컷팅)입니다.', true),
  item('coins', '가죽 동전 주머니', '동전으로 빵빵한 오래된 가죽 주머니입니다.', true),
  item('skull', '수정 해골', '정교하게 조각된 수정 해골. 당신을 야리구리하게 씬고 있는 것 같습니다.', true),
  item('scarab', '보석 박히 딱정벌레', '정교하게 조각된 보석 딱정벌레입니다.', true),
  item('emerald', '거대한 에메랄드', '거대한 에메랄드입니다.', true),
  item('chalice', '은 잔', '정교하게 새겨진 은 잔입니다.', true),
  item('gold', '황금 냠', '무지개 끝에는 황금 냠이 있다.', true),
  item('ancient_map', '고대 지도', '지도에는 세 개의 벌판이 있는 숲이 그려져 있다. 가장 큰 벌판에는 집이 있다. 세 개의 길이 큰 벌판을 빠져나간다. 그 중 하나, 북서쪽으로 향하는 길은 「스톤 바로우(Stone Barrow)로」라고 표시되어 있다.'),
].map(value => [value.id, value]));

export const TREASURES = Object.values(ITEMS).filter(value => value.treasure).map(value => value.id);

function prop(id: string, label: string, type: string, x: number, z: number, action: string, extra: Partial<ObjectDef> = {}): ObjectDef {
  return { id, label, type, position: [x, 0, z], action, ...extra };
}
function pickup(id: string, type: string, x: number, z: number, requires?: string, height = 0): ObjectDef {
  return prop(id, ITEMS[id].name, type, x, z, 'take', {
    position: [x, height, z],
    item: id, treasure: ITEMS[id].treasure, description: ITEMS[id].description,
    hiddenIf: `picked_${id}`, ...(requires ? { requires } : {}),
  });
}
const cluePresentation: Record<string, Pick<ObjectDef, 'type'> & Partial<Pick<ObjectDef, 'position' | 'yaw' | 'action'>>> = {
  boarded_door: { type: 'surface', position: [0, 0, -8.65], action: 'inspect' },
  forest_marks: { type: 'tree_marks' },
  attic_sketch: { type: 'sketch' },
  cellar_warning: { type: 'carved_warning' },
  troll_scratches: { type: 'axe_scars' },
  surveyor_map: { type: 'route_notes' },
  gallery_label: { type: 'museum_label' },
  cyclops_legend: { type: 'torn_note' },
  cyclops_bowl: { type: 'bowl' },
  thief_note: { type: 'torn_note', position: [-9.32, .91, 3.11] },
  dome_marks: { type: 'timber_grooves', position: [-4.7, 0, 1] },
  ritual_inscription: { type: 'altar_engraving', position: [2.12, .61, -8.5], yaw: Math.PI / 2 },
  royal_cartouche: { type: 'royal_relief' },
  hades_threshold: { type: 'gateway_engraving', position: [-3.41, 1.65, -5.26] },
  echo_inscription: { type: 'carved_warning' },
  dam_diagram: { type: 'dam_plate' },
  maintenance_label: { type: 'clipboard' },
  reservoir_mark: { type: 'north_shore_sign' },
  atlantis_tablet: { type: 'mirror_tablet' },
  bat_scrap: { type: 'torn_note' },
  mine_manifest: { type: 'manifest' },
  mill_instructions: { type: 'machine_plate', position: [1.5, 1.11, -5.335] },
  boat_label: { type: 'boat_label' },
  river_sign: { type: 'river_sign' },
  sand_scratch: { type: 'sand_marks' },
  falls_carving: { type: 'royal_relief' },
};
function inscription(id: string, label: string, x: number, z: number, text: string, action = 'read'): ObjectDef {
  const presentation = cluePresentation[id] ?? { type: 'torn_note' };
  const floorPaper = ['torn_note', 'sketch', 'route_notes'].includes(presentation.type);
  return prop(id, label, presentation.type, x, z, action, { description: text, ...(floorPaper ? { position: [x, .022, z] as [number, number, number] } : {}), ...presentation });
}
function rest(id: string, x: number, z: number, type = 'campfire'): ObjectDef {
  return prop(id, 'Rest by the fire', type, x, z, 'rest', { description: 'A warm place to rest, mend your wounds and mark a safe return.' });
}
function room(id: string, name: string, subtitle: string, kind: RoomKind, map: Vec2, size: Vec2, description: string, objects: ObjectDef[], dark = false): RoomDef {
  return { id, name, subtitle, kind, map, size, spawn: [0, size[1] / 2 - 5], yaw: 0, description, objects, exits: [], dark };
}

const locations: RoomDef[] = [
  room('west_house', '서쪽 — 집 앞', '제국의 가장자리', 'forest', [0, 0], [38, 36],
      '당신은 하얀 집 서쪽의 열린 벌판에 서 있다. 정문은 판자로 막혀 있다. 작은 우편함이 여기 있다.', [
        prop('mailbox', '작은 우편함', 'mailbox', -5, -4, 'mailbox'),
        inscription('boarded_door', '판자로 막힌 정문', 4, -8, '문은 판자로 막혀 있어 벗길 수 없다.'),
      ]),
    room('behind_house', '집 뒤쪽', '하얀 집', 'house', [1, 0], [24, 26],
      '당신은 하얀 집 뒤쪽에 있다. 집 한쪽 구석에는 작은 창문이 있다.', [
        prop('kitchen_window', '부엌 창문', 'window', 0, -6, 'window'),
      ]),
    room('forest', '숲길', '가지 사이의 무언가', 'forest', [0, -1], [42, 38],
      '어둡게 깔린 숲을 따라 굽이쳐 내려가는 길이다. 길 가장자리에는 낮은 가지를 뼘은 특별히 큰 나무 한 그루가 서 있다.', [
        pickup('egg', 'egg', -7, -5),
        prop('songbird_perch', '참새', 'bird', 7, -5, 'songbird', { hiddenIf: 'bauble_revealed' }),
        pickup('bauble', 'bauble', 6, -1, 'bauble_revealed'),
        prop('forest_grate', '쇠 격자', 'grate', -7, 5, 'grate'),
        inscription('forest_marks', '오래된 나무의 자국', 8, 6, '작은 새 둥지 곁의 나무껍질에 몇 개의 스크래치가 남아 있다. 더 멀리 숲 사이로 참새의 지저겅임이 들려온다.'),
      ]),
    room('kitchen', '부엌', '마지막 평범한 방', 'house', [2, 0], [12, 12],
      '당신은 하얀 집 부엌에 있다. 테이블은 최근에 음식 준비에 쓰인 모양이다. 서쪽으로 통하는 통로가 있고, 위쪽으로 어두운 계단이 보인다. 동쪽으로는 작은 창문이 있다.', [
        pickup('lunch', 'food', -2, -1.4, undefined, 0.88), pickup('water', 'bottle', 0, -2.3, undefined, 0.88), pickup('garlic', 'garlic', 2, -1.4, undefined, 0.88),
        prop('kitchen_note', '요리사의 쪽지', 'scroll', -3, 2.2, 'read', { position: [-3, 0.88, 2.2], description: '「고추.」 물컵 자국 때문에 대부분 내용은 씻겨나가 알아볼 수 없다.' }),
      ]),
    room('living_room', '거실', '당신이 찾은 것들을 위한 장소', 'house', [3, 0], [14, 14],
      '당신은 거실에 있다. 동쪽으로 출입구가 있으며, 트로피장(트로피 케이스)이 보인다.', [
        pickup('lantern', 'resting_lantern', -3.3, -2.5, undefined, 0.86), pickup('sword', 'resting_sword', 3.3, -2.5, undefined, 0.86),
        prop('carpet', '동양풍 큰 양탄자', 'rug', 0, 0, 'rug', { hiddenIf: 'trapdoor_open' }),
        prop('cellar_hatch', '열린 다락문', 'hatch', 0, 0, 'cellar_hatch', { requires: 'trapdoor_open' }),
        prop('trophy_case', '트로피 케이스', 'trophy_case', 0, -5.5, 'case'),
        pickup('ancient_map', 'scroll', 2.5, -5, 'map_revealed'),
        // 세계는 이미의 난로를 제공; 그럼 빈 온열점이 둘째 모닥불을 피하지 않는다.
        rest('house_hearth', -5, 2.6, 'hatch'),
        prop('case_inscription', '케이스의 황동 명판', 'case_plate', 1.78, -5.025, 'read', { position: [1.78, 1.48, -5.025], description: '「위대한 지하 제국(GREAT UNDERGROUND EMPIRE).」 선반에는 19개의 번호가 매겨진 자리가 있다. 각각은 서로 다른 보물을 위한 것으로 보인다.' }),
      ]),
    room('attic', '다락방', '서까래 아래', 'house', [2, -1], [12, 12],
      '여기는 다락방이다. 유일한 출구는 아래로 내려가는 계단이다.', [
        pickup('rope', 'rope', 0, -2),
        inscription('attic_sketch', '숯으로 그려진 스케치', 3, 1.5, '나무 기둥들이 빈 공간을 둘러싸고 있다. 스케치의 아랫부분은 찢어져 없다.'),
      ]),
    room('cellar', '지하실', '위대한 지하 제국', 'cellar', [3, 1], [30, 30],
      '당신은 어둡고 습한 지하실에 있다. 북쪽으로 좁은 통로가 있다. 집으로 다시 올라가는 계단이 보인다.', [
        inscription('cellar_warning', '긁힌 경고', -8, -4, '「그루(grue)는 대지의 어둠 속에 도사리고 있는 사악한 존재다. 그의 단골 식사는 모험가이지만, 빛에 대한 두려움이 그 무한한 식욕을 억제한다.」'),
      ], true),
    room('troll_bridge', '트롤 통로', '첫 번째 수호자', 'bridge', [3, 2], [36, 36],
      '피 얼룩과 깊은 할퀴 자국(아마 도끼에 의한 것)이 벽에 남아 있다. 돌로 된 다리가 균열 너머로 이어진다.', [
        inscription('troll_scratches', '이쪽 돌 위의 경고', -10, 8, '「어깨를 노려라. 손이 돌을 치도록. 기진맥진한 트롤은 완벽한 틈을 만든다.」 뒤쪽 통로는 여전히 비어 있으니 위쪽 모닥불이 필요하면 돌아가도 좋다.'),
      ], true),
    room('round_room', '원형 방', '세계 아래의 길', 'rotunda', [3, 3], [38, 38],
      '여기는 둥근 돌 방으로 사방으로 통하는 길이 있다. 그 중 몇 개는 무너져 막혀 있다.', [
        rest('surveyor_fire', -9, 6),
        inscription('surveyor_map', '측량사의 경로 메모', 8, 5, '「동쪽 — 갤러리. 북동쪽 — 돔. 서쪽 — 홍수 조절 댐 #3(FCD#3).」 경로 곁에는 캠프파이어 모양의 작은 표시가 네 개 있다.'),
      ]),
    room('gallery', '갤러리', '잘 알려지지 않은 천재', 'gallery', [4, 3], [32, 26],
      '여기는 미술관이다. 대부분의 그림은 탁월한 안목을 가진 훔치이들에게 빼앗겼다.', [
        pickup('painting', 'painting', 0, -7),
        inscription('gallery_label', '작은 미술관 라벨', 7, 4, '「잘 알려지지 않은 천재의 그림.」 작가 이름은 적혀 있지 않다.'),
      ]),
    room('maze', '뒤틀린 미로', '마지막 탐험가', 'maze', [2, 3], [38, 38],
      '여기는 모두 비슷해 보이는 뒤틀린 작은 통로의 미로다. 한 골격이 여기 있다 — 아마 운 없던 모험가의 잔해일 것이다.', [
        pickup('coins', 'coin', -8, -6), pickup('skeleton_key', 'key', 6, -6),
        prop('maze_grate', '격자 자물쇠', 'grate', -9, 8, 'grate'),
        inscription('cyclops_legend', '탐험가의 마지막 메모', 7, 7, '「눈이 하나. 그는 자신을 아무개라고 부른 뱃사람을 기억하고 있다. 그자의 이름이 뭐였지? 이타카까지의 긴 항해와 관련된 무언가.」', 'cyclops_legend'),
      ], true),
    room('cyclops', '사이클롭스 방', '엄청난 식욕', 'cyclops', [1, 3], [38, 34],
      '이 방에는 한쪽에 출구가 있고, 반대쪽에는 아치형 출입구가 있다. 벽에 피 얼룩이 있다.', [
        prop('cyclops', '사이클롭스와 대화', 'cyclops', 0, -5, 'cyclops'),
        inscription('cyclops_bool', '빈 돌 그릇', -9, 6, '그릇은 핥아 깨끗하다. 가장자리 잇은 자국이 당신의 엄지손가락보다 크다.'),
      ]),
    room('treasure_room', '보물 방', '도둑의 마지막 주장', 'treasury', [1, 4], [38, 36],
      '여기는 큰 방으로, 동쪽 벽은 단단한 화강암이다. 주인(도둑)의 짐이 쌓여 있는 가운데 작업대가 놓여 있다.', [
        prop('locksmith_table', '도둑의 작업대', 'worktable', -10, 3, 'egg_lock'),
        pickup('fine_picks', 'pick', -9, -6, 'thief_defeated'),
        pickup('chalice', 'chalice', 9, -7, 'thief_defeated'),
        inscription('thief_note', '작업대의 메모', 10, 5, '「정교한 작업 의뢰 받습니다.」 글 아래에는 정교한 자물쇠 그림이 있다. 글은 요금 주변부터 상당히 알아보기 힘들어진다.'),
      ]),
    room('dome', '돔 방', '아래의 빛', 'dome', [4, 4], [38, 38],
      '당신은 거대한 돔의 가장자리에 있다. 돔은 아래쪽 다른 방의 천장이다. 위험한 낙하로부터 당신을 보호하는 것은 돔을 따라 둘러린 나무 난간이다.', [
        prop('dome_railing', '나무 난간', 'rope', -7, 4, 'dome_rope', { hiddenIf: 'dome_secured' }),
        prop('secured_dome_rope', '밧줄을 타고 내려가기', 'hatch', -7, 4, 'dome_rope', { requires: 'dome_secured' }),
        pickup('torch', 'torch', 6, -6, 'dome_secured'),
        inscription('dome_marks', '난간의 자국', 9, 6, '나무를 가로지르는 두 개의 자국이 있다. 가장 깊은 곳에는 오래된 삼섬유가 조금 남아 있다.'),
      ], true),
    room('temple', '고대 신전', '고대 조커(Zorker)들의 신념', 'temple', [4, 5], [40, 38],
      '여기는 큰 신전의 북쪽 끝이다. 당신 앞에는 제단으로 보이는 것이 있다. 오래된 석각이 있는데, 아마도 잊혀진 언어로 쓰여진 기도문일 것이다.', [
        pickup('bell', 'bell', -1.3, -8.3, undefined, 1.115), pickup('candles', 'candles', 0, -8.35, undefined, 1.115), pickup('black_book', 'book', 1.3, -8.3, undefined, 1.115),
        inscription('ritual_inscription', '고대 석각', 3.5, -6.3, '기도문은 오늘날 보기 드문 고대 문자로 새겨져 있다. 마치 작은 곤충, 건망증, 작은 물건의 줍기/놓기에 대한 긴 논설처럼 보인다. 마지막 구절은 침입자를 죽은 자의 세계로 추방한다. 모든 흔적은 고대 조커(Zorker)들의 신념이 난해했음을 가리킨다.'),
        prop('temple_mirror', '고대 거울', 'mirror', -12, -1, 'mirror', { yaw: Math.PI / 2 }),
        prop('temple_rope', '밧줄을 타고 오르기', 'hatch', 0, 16, 'dome_ascent', { requires: 'dome_secured' }),
        rest('temple_fire', -9, 7),
      ]),
    room('egypt', '이집트 방', '왕의 짐', 'altar', [5, 5], [34, 30],
      '이집트 무덤처럼 보이는 방이다. 서쪽으로 통하는 길이 있다.', [
        prop('gold_coffin', '금관', 'coffin', 0, -5, 'coffin', { hiddenIf: 'picked_coffin' }),
        pickup('sceptre', 'sceptre', 7, -4, 'coffin_open'),
        inscription('royal_cartouche', '그려진 카르투슈', -8, 5, '왕의 인물이 좁은 지팡이를 들고 있다. 빨강, 주황, 노랑, 초록, 파랑, 남색, 보라가 벗겨져 가는 유약에 남아 있다. 그의 뒤 풍경 대부분은 닳아 사라졌다.'),
      ]),
    room('hades', '명계 입구', '죽은 자의 세계', 'underworld', [4, 6], [40, 38],
      '당신은 큰 입구 앞에 있다. 입구에는 「여기 들어오는 자, 모든 희망을 버려라!」라고 새겨져 있다. 수천 명의 목소리가 끔찍한 운명을 한탄하는 소리가 들린다.', [
        prop('hades_lectern', '돌 강단', 'altar', 0, 3, 'ritual'),
        pickup('skull', 'skull', 0, -10, 'hades_open'),
        inscription('hades_threshold', '입구의 글귀', -10, 7, '여기 들어오는 자, 모든 희망을 버려라.'),
      ]),
    room('loud_room', '울림 방', '돌아오는 말', 'cellar', [3, 4], [34, 32],
      '이곳은 큰 방으로, 바닥에서 천장을 감지할 수 없다. 소리가 모든 벽에서 반사되는 것 같다.', [
        prop('echo_stone', '동굴에 소리치기', 'pedestal', 0, 3, 'echo'),
        pickup('platinum_bar', 'bar', 0, -7, 'echo_solved'),
        inscription('echo_inscription', '석공의 농담', -9, 5, '「마지막 말은 항상 당신의 것이다.」 같은 문장이 조금 더 작게 그 아래에 새겨져 있다.'),
      ], true),
    room('dam', '홍수 조절 댐 #3', '제국의 위대한 장치', 'dam', [3, 5], [46, 42],
      '당신은 홍수 조절 댐 #3(FCD#3) 꼭대기에 서 있다. 이곳은 먼 옛날에는 꽤 유명한 관광 명소였다. 여기에 컨트롤 패널이 있고, 큰 금속 볼트가 달려 있다. 볼트 바로 위에는 작은 초록색 플라스틱 풍선이 있다.', [
        prop('dam_bolt', '수문 조절 볼트', 'dam_control', 0, -7, 'dam_bolt'),
        inscription('dam_diagram', '홍수 조절 댐 #3', 12, 7, 'FCD#3는 위대한 지하 제국 783년에 위대한 냉랭강(Frigid River)을 이용하기 위해 건설되었다. 이 사업은 당신의 전능한 지역 폭군, 과도한 정치꾼 남작 디민위트 플랫헤드의 3,700만 조크미드(zorkmid) 보조금으로 지원되었다.'),
        rest('dam_fire', -12, 7),
      ]),
    room('maintenance', '정비실', '몇 개의 중요한 버튼', 'machine', [2, 5], [38, 34],
      '이곳은 홍수 조절 댐 #3(FCD#3)의 정비실로 보인다. 명백히, 이 방은 최근에 약탈당해 대부분의 값비싼 장비가 사라졌다. 당신 앞 벽에 파랑, 노랑, 갈색, 빨강의 버튼이 한 그룹으로 있다.', [
        pickup('wrench', 'wrench', -9, -6), pickup('screwdriver', 'screwdriver', -3, -7),
        pickup('putty', 'bottle', 3, -7), pickup('matches', 'book', 9, -6),
        prop('control_buttons', '색깔 있는 컨트롤 버튼', 'maintenance_controls', 0, 1, 'controls'),
        prop('leaking_pipe', '새는 파이프', 'surface', 11, 4, 'patch', { requires: 'dam_leak' }),
        inscription('maintenance_label', '정비 메모', -10, 6, '「볼트를 돌리기 전에 컨트롤 패널의 변경 사항을 보고하라.」 누군가가 「변경」」에 밑줄을 긋고 작은 초록 동그라미를 그렸다.'),
      ]),
    room('reservoir', '저수지 분지', '물이 지키던 것', 'reservoir', [2, 6], [46, 42],
      '당신은 큰 호수였던 곳, 이제는 큰 진흙 더미 위에 있다. 북쪽과 남쪽에 「기슭」이 있다.', [
        pickup('jewel_trunk', 'chest', -9, -6), pickup('pump', 'pump', 9, -5),
        inscription('reservoir_mark', '북쪽 착지 표시', 11, 7, '「북쪽 기슭(NORTH SHORE).」 글자 아래에는 희미한 배 그림이 있다. 대부분의 물은 스스로 빠져나갔다.'),
      ]),
    room('atlantis', '아틀란티스 방', '물에 기억된 도시', 'reservoir', [1, 6], [42, 36],
      '이곳은 오래된 방으로, 오랫동안 물 아래에 있었다. 기슭 주변으로 창백한 기둥이 솟아 있다.', [
        pickup('trident', 'trident', 0, -7, 'reservoir_drained'),
        prop('atlantis_mirror', '고대 거울', 'mirror', -10, 4, 'mirror', { yaw: Math.PI / 2 }),
        inscription('atlantis_tablet', '관리인의 비석', 10, 5, '비석에는 하나의 은빛 선으로 연결된, 똑같은 두 방이 묘사되어 있다.'),
      ]),
    room('bat_cavern', '박쥐 방', '불청객', 'bat', [2, 7], [38, 36],
      '당신은 천장이 그림자 속으로 사라지는 작은 방에 있다. 공기가 답답하고 눅눅하다.', [
        prop('bat_roost', '흡혈 박쥐', 'bat', 0, -4, 'bat'),
        pickup('jade', 'jade', 8, -6, 'bat_quiet'),
        inscription('bat_scrap', '광부의 종이 조각', -9, 6, '「흡혈 박쥐. 그것은 남을 보지 못한 채 어둠 속에서도 그를 찾아낼 수 있다. 어쩌면 내가 그것이 맡는 냄새에 더 주의를 기울였어야 했을지도 모른다.」'),
      ], true),
    room('coal_mine', '석탄 광산', '화물은 다른 길로', 'gas', [2, 8], [42, 40],
      '이곳은 큰 방으로, 한가운데에 바닥 아래 어둠 속으로 내려가는 작은 사다리가 있다. 사다리 위에는 무거운 쇠사슬이 매달려 있는 금속 프레임이 설치되어 있다. 공기에는 석탄 가속 냄새가 강하게 난다.', [
        pickup('coal', 'coal', -10, -7),
        // 세계는 경고와 보조 통로를 제공한다; 느슨한 랜턴 마커는 없다.
        prop('gas_notice', '가스로 채워진 보조 통로', 'hatch', 10, 6, 'gas'),
        pickup('bracelet', 'bracelet', 10, -6, 'gas_safe'),
        prop('lift_basket', '사다리 바구니', 'basket', 0, -3, 'basket'),
        inscription('mine_manifest', '제분소의 화물 목록표', -11, 7, '「제분소 배송: 탄소 산소; 좁은 스위치용 서비스 도구; 작업등. 화물은 체인으로. 인원은 보조 통로로.」 별도의 경고: 「석탄 가스 — 노출된 불꽃 금지.」'),
      ], true),
    room('machine_room', '기계실', '압력 속의 탄소', 'machine', [3, 8], [38, 36],
      '이곳은 넓고 차가운 방이다. 빨래 건조기를 연상시키는 기계가 있다. 그 앞면에는 「시작(START)」이라고 적힌 스위치가 있다. 그 스위치는 어떤 사람의 손으로도 조작 가능해 보이지 않는다 (손가락이 약 1.6x6.4mm 정도가 아니라면).', [
        prop('lowered_basket', '내려진 바구니', 'basket', -10, 5, 'basket_retrieve', { hiddenIf: 'basket_retrieved' }),
        prop('pressure_mill', '기계', 'machine', 0, -5, 'machine'),
        pickup('diamond', 'diamond', 10, -5, 'diamond_created'),
        inscription('mill_instructions', '기계의 명판', 10, 6, '「압력 챔버 — 탄소 산소 전용. 시작 전에 인터록이 맞물려야 한다.」 단면 다이어그램이 무거운 뚜껑 주변의 밀봉을 보여준다.'),
      ]),
    room('dam_base', '댐 기슭', '냉랭강', 'river', [3, 6], [42, 38],
      '당신은 홍수 조절 댐 #3(FCD#3)의 기슭에 있다. 댐은 위와 북쪽으로 우뚝 솟아 있다. 냉랭강(Frigid River)이 이곳을 흐른다. 강변에는 백색 절벽이 있다 — 강이 하류로 굽이쳐 흐르는 동안 기하을 따라 북쪽에서 남쪽으로 거대한 벽을 형성하는 것처럼 보인다.\n', [
        prop('folded_boat', '접힌 플라스틱 더미', 'boat', 1.1, -15.7, 'boat'),
        inscription('boat_label', '황갈색 라벨', -1.2, -14.1, '「프로보즈 마법 보트 회사. 안녕, 뱃사공 여러분! 이 보트는 구매일로부터 76밀리초간, 혹은 처음 사용 시까지 — 어느 쪽이 먼저 도래하든 — 모든 결함에 대해 보증을 보장합니다. 이 보트는 얇은 플라스틱으로 만들어졌습니다. 행운을 빕니다!」'),
      ]),
    room('river', '냉랭강', '기슭에 머물라', 'river', [4, 7], [46, 40],
      '강이 여기서 더 빠르게 흐르고, 앞쪽 소리는 물살이 내는 소리인 것 같다. 동쪽 기슭에는 모래 해변이 있다.', [
        prop('river_buoy', '빨강 부표', 'buoy', -9, -4, 'buoy', { hiddenIf: 'picked_emerald' }),
        prop('river_landing', '보호된 기슭', 'boat', 8, 3, 'land'),
        inscription('river_sign', '물 위의 경고', -11, 7, '「모래 기슭 — 동쪽. 폭포가 앞에.」 보호된 수로는 기슭 쪽으로 굽이쳐 있다. 강의 한가운데는 그렇지 못하다.'),
      ]),
    room('sandy_cave', '모래 동굴', '표류 아래', 'sand', [5, 7], [38, 34],
      '이곳은 모래로 채워진 동굴이다. 바람이 모래를 벽 쪽으로 불어 모았다.', [
        pickup('shovel', 'shovel', -9, 4),
        prop('sand_drift', '모래 더미', 'surface', 0, -5, 'dig'),
        pickup('scarab', 'scarab', 7, -6, 'scarab_revealed'),
        inscription('sand_scratch', '동굴 벽의 긁힌 자국', 9, 6, '짧은 자국이 표류 아래로 사라진다. 모래 속에서 무언가가 빛을 받아 빛난다.'),
      ]),
    room('falls', '아라긴 폭포', '냉랭강 위', 'falls', [5, 8], [48, 44],
      '당신은 아라긴 폭포 꼭대기에 있다. 약 450피트 낙차의 거대한 폭포이다. 폭포 너머 서쪽으로는 아름다운 무지개가 보인다.', [
        prop('rainbow_ledge', '무지개', 'surface', 0, 4, 'rainbow'),
        pickup('gold', 'gold', -22.5, -2.6, 'rainbow_solid'),
        inscription('falls_carving', '닳아해진 조각', -12, 7, '일곱 개의 띠가 왕의 인물 위로 굽이쳐 있다. 들어 올린 손과 좁은 지팡이의 일부만이 또렷하게 남아 있다.'),
      ]),
    room('barrow', '스톤 바로우', '마지막 길', 'barrow', [-1, 0], [38, 38],
      '당신은 거대한 돌 바로우 앞에 서 있다. 동쪽 면에는 거대한 돌문이 열려 있다. 무덤의 어둠 속은 보이지 않는다.', [
        prop('barrow_threshold', '스톤 바로우로 들어가기', 'altar', 0, -8, 'ending'),
      ]),
];

export const ROOMS: Record<string, RoomDef> = Object.fromEntries(locations.map(value => [value.id, value]));
ROOMS.kitchen.spawn = [0, 4.4];
ROOMS.living_room.spawn = [0, 5.2];
ROOMS.attic.spawn = [0, 4.3];
ROOMS.troll_bridge.enemy = { id: 'troll', name: '트롤', kind: 'troll', position: [0, -5], health: 165, damage: 26, speed: 2.4 };
ROOMS.treasure_room.enemy = { id: 'thief', name: '도둑', kind: 'thief', position: [2, -5], health: 205, damage: 20, speed: 3.1 };

function link(from: string, to: string, label: string, at: Vec2, requires?: string, blocked?: string): void {
  const exit: ExitDef = { id: `${from}_to_${to}`, to, label, position: at };
  if (requires) exit.requires = requires;
  if (blocked) exit.blocked = blocked;
  ROOMS[from].exits.push(exit);
}
function passage(a: string, b: string, labelA: string, labelB: string, aPos: Vec2, bPos: Vec2, requires?: string, blocked?: string): void {
  link(a, b, labelA, aPos, requires, blocked);
  link(b, a, labelB, bPos, requires, blocked);
}

passage('west_house', 'behind_house', '집 주위', '서쪽 — 집 앞', [18, 3], [-11, 3]);
passage('west_house', 'forest', '숲길', '하얀 집', [-18, 0], [0, 18]);
passage('west_house', 'barrow', '숲길', '하얀 집', [-10, 17], [0, 18], 'barrow_path_open', '그쪽으로는 갈 수 없다.');
link('behind_house', 'kitchen', '부엌 창문으로', [0, -6], 'window_open', '부엌 창문이 살짝 열려 있다. 먼저 창문을 열어라.');
link('kitchen', 'behind_house', '부엌 창문', [5.4, 2.5]);
passage('kitchen', 'living_room', '거실', '부엌', [-5.4, 1], [6.4, 2]);
passage('kitchen', 'attic', '다락방으로 가는 계단', '부엌 계단', [0, -5.4], [0, 5.4]);
passage('living_room', 'cellar', '지하실 계단', '집으로 돌아가기', [0, 0], [0, 14], 'trapdoor_open', '여기서 내려갈 길은 없다.');
passage('cellar', 'troll_bridge', '트롤 통로', '지하실', [0, -14], [0, 17]);
link('troll_bridge', 'round_room', '지하 홀', [0, -17], 'troll_defeated', '트롤이 길을 막고 있다.');
link('round_room', 'troll_bridge', '트롤 통로', [0, 18]);
link('troll_bridge', 'maze', '뒤틀린 통로', [-17, 0], 'troll_defeated', '트롤이 그 통로를 지키고 있다.');
link('maze', 'troll_bridge', '트롤 통로', [18, 0]);
passage('maze', 'forest', '지상으로 가는 격자', '쇠 격자', [-18, 0], [-20, 8], 'grate_open', '격자는 잠겨 있다.');
passage('maze', 'cyclops', '한 눈의 수호자', '미로 안으로', [0, -18], [0, 16]);
link('cyclops', 'treasure_room', '아치형 입구', [0, -16], 'cyclops_passed', '사이클롭스가 길을 막고 있다.');
link('treasure_room', 'cyclops', '사이클롭스 방', [0, 17]);
passage('cyclops', 'living_room', '부서진 벽', '서쪽으로 가는 출입구', [-18, 0], [-6.4, -1], 'cyclops_fled', '나무 문은 못으로 박혀 있다.');
passage('round_room', 'gallery', '갤러리', '원형 방', [18, 0], [-15, 0]);
passage('round_room', 'dome', '거대한 돔', '원형 방', [10, -18], [-18, 5]);
passage('gallery', 'dome', '돔 갤러리', '그림 갤러리', [15, 0], [0, 18]);
link('dome', 'temple', '아래쪽 방', [0, -18], 'dome_secured', '아래쪽 방은 손이 닿지 않는다.');
link('temple', 'dome', '밧줄을 타고 오르기', [0, 18], 'dome_secured', '밧줄이 고정되어 있지 않으면 돔은 닿지 않는다.');
passage('temple', 'egypt', '이집트 방', '고대 신전', [19, 0], [-16, 0]);
passage('temple', 'hades', '명계의 문', '신전으로 돌아가기', [0, -18], [0, 18]);
passage('temple', 'atlantis', '은빛 통로', '은빛 통로', [-19, 0], [-20, 0], 'mirror_awakened', '벽이 통로를 막고 있다.');
passage('round_room', 'loud_room', '메아리 동굴', '원형 방', [0, -18], [0, 15]);
passage('round_room', 'dam', '홍수 조절 댐 #3', '원형 방', [-18, -6], [0, 20]);
passage('loud_room', 'dam', '흐르는 물소리', '울림 방', [-16, 0], [22, 8]);
passage('dam', 'maintenance', '정비동', '댐 컨트롤', [-22, 0], [18, 0]);
link('dam', 'reservoir', '저수지 기슭', [0, -20], 'reservoir_drained', '깊은 물이 길을 덮고 있다.');
link('reservoir', 'dam', '댐으로 돌아가기', [0, 20]);
link('reservoir', 'atlantis', '아틀란티스 신역', [-22, 0]);
link('atlantis', 'reservoir', '저수지 분지', [20, 0], 'reservoir_drained', '물이 저수지 바닥을 덮고 있다.');
passage('reservoir', 'bat_cavern', '석탄이 있는 언덕', '저수지', [0, -20], [0, 17]);
link('bat_cavern', 'coal_mine', '석탄 광산', [0, -17], 'bat_quiet', '당신이 통로에 접근하자 박쥐가 내려온다.');
link('coal_mine', 'bat_cavern', '박쥐 동굴', [0, 19]);
link('coal_mine', 'machine_room', '아래쪽 제분소', [0, -19], 'basket_lowered', '아래 제분소에는 아직 배송이 도착하지 않았다.');
link('machine_room', 'coal_mine', '광산 통로', [0, 17]);
passage('dam', 'dam_base', '댐 아래 계단', '댐 계단', [22, -6], [0, 18]);
link('dam_base', 'river', '냉랭강', [0, -18], 'boat_ready', '접힌 플라스틱은 이 상태로는 뜨지 않는다.');
link('river', 'dam_base', '댐 기슭으로 돌아가기', [0, 19]);
link('river', 'sandy_cave', '모래 기슭', [22, 0], 'river_moored', '먼저 보호된 기슭에 정박하라.');
link('sandy_cave', 'river', '강 기슭', [-18, 0]);
link('river', 'falls', '아라긴 폭포로 가는 길', [0, -19], 'river_moored', '먼저 배를 육지에 올려라. 강의 한가운데는 폭포로 이어진다.');
link('falls', 'river', '보호된 강 기슭', [0, 21]);
passage('sandy_cave', 'falls', '폭포 길', '모래 동굴', [0, -16], [23, 2]);
passage('falls', 'forest', '무지개', '무지개', [-23, 0], [20, 0], 'rainbow_solid', '무지개는 단단하지 않다.');

// Travel, the visible threshold, and the return arrival describe the same route.
// Ordinary passages use a wall opening; exceptional routes supply their own form.
const routeDetails: Record<string, Partial<ExitDef>> = {
  west_house_to_behind_house: { role: 'trail' }, behind_house_to_west_house: { role: 'trail' },
  west_house_to_forest: { role: 'trail' }, forest_to_west_house: { role: 'trail' },
  west_house_to_barrow: { role: 'trail' }, barrow_to_west_house: { role: 'trail' },
  behind_house_to_kitchen: { role: 'window', via: 'kitchen_window', barrier: 'nailed-door' },
  kitchen_to_behind_house: { role: 'window', arrival: { position: [3.8, 2.5], yaw: Math.PI / 2 } },
  kitchen_to_attic: { role: 'stairs', arrival: { position: [0, -3.5], yaw: Math.PI } }, attic_to_kitchen: { role: 'stairs' },
  living_room_to_cellar: { role: 'hatch', via: 'cellar_hatch', barrier: 'drop', arrival: { position: [0, 2.7], yaw: Math.PI } },
  cellar_to_living_room: { role: 'stairs' },
  troll_bridge_to_maze: { barrier: 'creature' }, troll_bridge_to_round_room: { barrier: 'creature' },
  maze_to_forest: { role: 'grating', via: 'maze_grate', barrier: 'gate', arrival: { position: [-6.6, 8], yaw: -Math.PI / 4 } },
  forest_to_maze: { role: 'grating', via: 'forest_grate', barrier: 'gate' },
  cyclops_to_treasure_room: { barrier: 'creature' },
  cyclops_to_living_room: { barrier: 'nailed-door' }, living_room_to_cyclops: { barrier: 'nailed-door' },
  dome_to_temple: { role: 'rope', via: 'secured_dome_rope', barrier: 'drop', yaw: 0, arrival: { position: [-7, 6.8], yaw: Math.PI } },
  temple_to_dome: { role: 'rope', via: 'temple_rope', barrier: 'drop', yaw: Math.PI, arrival: { position: [0, 13.2], yaw: 0 } },
  temple_to_atlantis: { role: 'mirror', via: 'temple_mirror', barrier: 'sealed-wall', yaw: Math.PI / 2, arrival: { position: [-8.8, -1], yaw: -Math.PI / 2 } },
  atlantis_to_temple: { role: 'mirror', via: 'atlantis_mirror', barrier: 'sealed-wall', yaw: Math.PI / 2, arrival: { position: [-6.8, 4], yaw: -Math.PI / 2 } },
  dam_to_reservoir: { role: 'stairs', barrier: 'water' }, reservoir_to_dam: { role: 'stairs' },
  atlantis_to_reservoir: { role: 'stairs', barrier: 'water' }, reservoir_to_atlantis: { role: 'stairs' },
  reservoir_to_bat_cavern: { role: 'trail' }, bat_cavern_to_reservoir: { role: 'trail' },
  bat_cavern_to_coal_mine: { barrier: 'creature' },
  coal_mine_to_machine_room: { role: 'stairs', barrier: 'gate' }, machine_room_to_coal_mine: { role: 'stairs' },
  dam_to_dam_base: { role: 'stairs' }, dam_base_to_dam: { role: 'stairs' },
  dam_base_to_river: { role: 'water', barrier: 'water' }, river_to_dam_base: { role: 'water' },
  river_to_sandy_cave: { role: 'landing', barrier: 'water' }, sandy_cave_to_river: { role: 'landing' },
  river_to_falls: { role: 'landing', barrier: 'water' }, falls_to_river: { role: 'landing' },
  sandy_cave_to_falls: { role: 'trail' }, falls_to_sandy_cave: { role: 'trail' },
  falls_to_forest: { role: 'rainbow', barrier: 'drop', yaw: Math.atan2(23, 4) },
  forest_to_falls: { role: 'rainbow', barrier: 'drop' },
};
for (const room of Object.values(ROOMS)) for (const exit of room.exits) {
  Object.assign(exit, routeDetails[exit.id]);
  exit.role ??= 'passage';
  if (exit.via) {
    const object = room.objects.find(value => value.id === exit.via);
    if (!object) throw new Error(`Missing travel object for ${exit.id}`);
    exit.position = [object.position[0], object.position[2]];
  }
  exit.yaw ??= Math.abs(exit.position[0] / (room.size[0] / 2)) > Math.abs(exit.position[1] / (room.size[1] / 2))
    ? exit.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2
    : exit.position[1] < 0 ? 0 : Math.PI;
}

export const REST_ROOMS = ['living_room', 'round_room', 'temple', 'dam'];
export function getRoom(id: string): RoomDef { return ROOMS[id] ?? ROOMS[START_ROOM]; }
