# 크레딧과 라이선스

## 본 어댑테이션

새 어댑테이션의 코드, 문서, 원본 프로젝트 자산은 [MIT 라이선스](LICENSE) 하에 배포됩니다 — Copyright 2026 Ethan Mollick. 아래 별도 안내는 원작 Zork 자료와 외부 구성 요소에 계속 적용되며, 프로젝트 라이선스는 이를 대체하지 않습니다.

3D 환경, 캐릭터, 객체, 인터페이스, 합성음은 본 프로젝트를 위해 만들어졌습니다. `public/textures/beech-foliage.png`의 너도밤나무 잎과 `public/social/`의 표지 일러스트는 AI로 생성된 프로젝트 자산입니다. 표지는 일러스트이며 게임플레이 스크린샷이 아닙니다. 물, 거품, 먼지 등 절차적 효과는 게임 안에서 생성됩니다. 후속 상용 Zork 게임의 아트나 오디오는 포함되지 않았습니다.

## 원작 Zork

**Zork**는 Marc Blank, Dave Lebling, Bruce Daniels, Tim Anderson가 만들었습니다. 본 버전은 Microsoft가 2025년 11월 [historicalsource/zork1 저장소](https://github.com/historicalsource/zork1)를 통해 공개한 Zork I 소스를 토대로 합니다. 자세한 안내는 [Microsoft의 오픈소스 블로그](https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/)를 참조하세요.

방 묘사, 객체 묘사, 대화, 일부 응답은 개정 [`97b7b3d68c075dd9af7da499c3e9690ada3471fd`](https://github.com/historicalsource/zork1/tree/97b7b3d68c075dd9af7da499c3e9690ada3471fd) — 특히 `1dungeon.zil`, `1actions.zil`, `gverbs.zil`, `gglobals.zil` — 에서 가져왔습니다. 방향과 상황 의존 절은 응축된 3D 지형에 맞춰 조정했습니다. 추가 산문은 현대적 상호작용을 지원하기 위해 작성되었습니다.

업스트림 라이선스 전문은 [licenses/ZORK-MIT.txt](licenses/ZORK-MIT.txt)에 보존되어 있으며, **Copyright (c) 2025 Microsoft** 표기를 포함합니다. 원본 ZIL 파일에는 **(c) Copyright 1983 Infocom, Inc. All Rights Reserved.** 표기도 함께 남아 있습니다. [인용된 개정의 MIT 라이선스](https://github.com/historicalsource/zork1/blob/97b7b3d68c075dd9af7da499c3e9690ada3471fd/LICENSE)가 오픈소스 사용 허가를 부여합니다.

Microsoft의 소스 공개에는 상용 패키징, 마케팅 자료, 상표권이 포함되지 않습니다. Zork 및 관련 명칭은 각 소유자의 자산입니다. 본 독립 어댑테이션은 Microsoft, Activision, Infocom의 엔도르스먼트를 받지 않았습니다.

## 텍스처, 폰트, 소프트웨어

| 구성 요소 | 라이선스와 표기 |
| --- | --- |
| Poly Haven의 1K 표면 맵 18종 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). [텍스처 크레딧](licenses/textures.md)에 작가 목록이 있으며, [자산 매니페스트](public/textures/manifest.json)에 원본 URL과 해시가 기록되어 있습니다. [Poly Haven의 자산 라이선스](https://polyhaven.com/license)가 재배포를 허용합니다. |
| Three.js 0.180.0 | MIT; copyright 2010–2025 three.js authors. [전문 안내](licenses/THREE-MIT.txt). |
| DM Sans | SIL Open Font License 1.1; copyright 2014 The DM Sans Project Authors. [전문 안내](licenses/DM-SANS-OFL.txt). |
| Cormorant Garamond | SIL Open Font License 1.1; copyright 2015 The Cormorant Project Authors. [전문 안내](licenses/CORMORANT-GARAMOND-OFL.txt). |
| 별도 Windows 패키지의 Node.js v24.18.0 | Node.js와 번들 구성 요소는 [NODE-LICENSE.txt](licenses/NODE-LICENSE.txt)에 재현된 라이선스를 유지합니다. Node 실행 파일은 본 소스 저장소에 포함되지 않습니다. |

폰트 파일은 OFL을 그대로 유지하며 MIT로 재라이선스되지 않습니다. npm은 빌드 의존성을 각 패키지 라이선스로 설치하며, `package-lock.json`이 버전을 고정합니다. `public/licenses/` 사본은 웹 빌드와 함께 배포되며, Windows 패키지는 전체 런타임 알림을 보존합니다.

## 한글화에 대한 안내

본 저장소의 모든 인게임 텍스트, 메뉴, 메시지는 sigco3111 한글화 포크 기여자가 자연스러운 한국어로 옮겼습니다. 원작 Zork의 산문은 Microsoft의 원본 Zork I 소스(MIT 라이선스)에 기반하며, 본 어댑테이션의 한국어 번역은 동일한 MIT 라이선스 하에 배포됩니다.