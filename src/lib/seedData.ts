import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── 중복 방지: 해당 유저의 프로젝트가 있으면 스킵 ──────
async function hasExistingProjects(userId: string): Promise<boolean> {
  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', userId),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// ─── 메인 시드 함수 ─────────────────────────────────────
export async function seedInitialData(userId: string): Promise<boolean> {
  // 중복 방지
  if (await hasExistingProjects(userId)) {
    return false
  }

  // ──────────────────────────────────────────────────────
  // 1. 프로젝트 생성
  // ──────────────────────────────────────────────────────
  const projectRef = await addDoc(collection(db, 'projects'), {
    title: '상상동물병원: 크리처 닥터',
    titleEn: 'Creature Doctor: Imagination Animal Hospital',
    type: 'animation',
    genre: ['감정코칭', '판타지', '힐링', '가족'],
    targetAudience: '유아/초등 저학년 + 부모 동시 시청',
    status: 'development',
    artContext: {
      style: '파스텔 톤, 3D 클레이 질감, 부드러운 빛, 둥근 형태',
      colorPalette: ['#F8E8FF', '#FFE4E1', '#E0F4FF', '#FFF0C8', '#D4F4DD', '#C0C0D0'],
      moodKeywords: ['따뜻함', '안전함', '부드러움', '치유', '판타지'],
      prohibitedElements: ['공포', '날카로운 선', '어두운 색', '폭력', '과도한 자극'],
      referenceWorks: ['코코멜론', '뽀로로', 'Bluey'],
      aspectRatio: '16:9',
      frameRate: '24fps',
    },
    productionInfo: {
      broadcaster: 'EBS',
      runtime: '5분',
      totalEpisodes: 26,
    },
    ownerId: userId,
    collaborators: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const projectId = projectRef.id

  // ──────────────────────────────────────────────────────
  // 2. 캐릭터 4명 생성
  // ──────────────────────────────────────────────────────
  const characterDefs = [
    {
      name: '도티',
      nameEn: 'Dottie',
      role: '상상동물병원 원장 의사',
      emotionalRole: '치유자 / 안내자',
      appearance: {
        base: '파란 가운을 입은 의사, 온화한 표정, 둥근 얼굴, 둥근 안경, 클레이 질감',
        styleKeywords: ['pastel', 'clay texture', 'round shapes', 'warm lighting'],
        colorScheme: '파란 가운 + 분홍 볼 + 크림색 피부',
        fixedPromptKeywords: ['round face', 'blue medical coat', 'gentle expression', 'round glasses', 'clay texture', 'soft lighting', 'pastel colors'],
      },
      emotionVariants: [
        { emotion: '기본', appearanceChange: '온화한 미소', promptAddition: 'gentle smile, warm eyes' },
        { emotion: '걱정', appearanceChange: '미간 살짝 찌푸림, 입꼬리 약간 내려감', promptAddition: 'slight frown, concerned eyes' },
        { emotion: '기쁨', appearanceChange: '활짝 웃음, 눈 초승달', promptAddition: 'big smile, crescent eyes, sparkle' },
      ],
      episodeAppearances: [],
    },
    {
      name: '루루',
      nameEn: 'Lulu',
      role: '소형 감정 도우미',
      emotionalRole: '공감 촉진자 / 감정 탐색 도구',
      appearance: {
        base: '동그란 몸의 소형 도우미들, 파스텔 색상 여러 마리, 각각 다른 색깔',
        styleKeywords: ['tiny', 'round body', 'pastel colors', 'multiple characters', 'clay texture'],
        colorScheme: '분홍, 하늘, 연두, 노랑 등 파스텔 각색',
        fixedPromptKeywords: ['small round body', 'multiple helpers', 'pastel colored', 'cute expression', 'clay texture', 'soft lighting'],
      },
      emotionVariants: [
        { emotion: '기본', appearanceChange: '반짝이는 눈, 통통한 몸', promptAddition: 'sparkle eyes, chubby round body' },
        { emotion: '슬픔 감지', appearanceChange: '눈에 물방울, 약간 파란빛', promptAddition: 'teardrop in eye, slight blue tint' },
      ],
      episodeAppearances: [],
    },
    {
      name: '다온',
      nameEn: 'Daon',
      role: '인간 어린이 방문자',
      emotionalRole: '감정 이입 대상 / 시청자 대리',
      appearance: {
        base: '가방에 파란 비구름 스티커가 붙은 호기심 많은 어린이',
        styleKeywords: ['child character', 'backpack', 'curious', 'warm colors', 'clay texture'],
        colorScheme: '노란 상의 + 청바지 + 파란 비구름 스티커 가방',
        fixedPromptKeywords: ['child character', 'blue raincloud sticker on backpack', 'curious expression', 'casual outfit', 'warm colors', 'clay texture'],
      },
      emotionVariants: [
        { emotion: '호기심', appearanceChange: '눈을 크게 뜨고 앞으로 기울임', promptAddition: 'wide curious eyes, leaning forward' },
        { emotion: '공감', appearanceChange: '살짝 슬픈 표정, 손 내밀기', promptAddition: 'slightly sad expression, reaching hand out' },
        { emotion: '기쁨', appearanceChange: '양팔 벌리고 환하게 웃음', promptAddition: 'arms spread wide, bright smile' },
      ],
      episodeAppearances: [],
    },
    {
      name: '사자야',
      nameEn: 'Sajaya',
      role: '1화 환자 - 먹구름 갈기 사자',
      emotionalRole: '감정 투사 대상 (억눌린 슬픔)',
      appearance: {
        base: '먹구름이 갈기인 사자, 슬픈 눈, 발밑에 웅덩이, 회색빛 몸',
        styleKeywords: ['lion', 'dark cloud mane', 'sad', 'grey tones', 'puddle', 'clay texture'],
        colorScheme: '회색 몸 + 먹구름 갈기 + 파란 눈물빗방울',
        fixedPromptKeywords: ['lion character', 'dark cloud mane', 'sad eyes', 'puddle at feet', 'grey storm clouds', 'clay texture', 'pastel background'],
      },
      emotionVariants: [
        { emotion: '슬픔(기본)', appearanceChange: '먹구름 갈기에서 빗방울, 고개 숙임', promptAddition: 'rain dripping from dark cloud mane, head down, puddle' },
        { emotion: '카타르시스', appearanceChange: '분홍빛 솜사탕 갈기로 변환, 환한 표정', promptAddition: 'pink cotton candy mane, bright sparkle, joyful expression, sunshine' },
        { emotion: '안도', appearanceChange: '구름 약간 걷힘, 살짝 미소', promptAddition: 'clouds slightly clearing, slight smile, softer colors' },
      ],
      episodeAppearances: [],
    },
  ]

  const characterIds: string[] = []
  for (const char of characterDefs) {
    const ref = await addDoc(collection(db, 'projects', projectId, 'characters'), {
      ...char,
      createdAt: serverTimestamp(),
    })
    characterIds.push(ref.id)
  }

  // 캐릭터 ID 매핑: [도티, 루루, 다온, 사자야]
  const [dottiId, luluId, daonId, sajayaId] = characterIds

  // ──────────────────────────────────────────────────────
  // 3. 에피소드 1화 생성
  // ──────────────────────────────────────────────────────
  const episodeRef = await addDoc(collection(db, 'projects', projectId, 'episodes'), {
    projectId,
    number: 1,
    title: '비를 뿌리는 사자야',
    targetEmotion: '슬픔 / 억눌린 감정',
    coreMessage: '슬플 때 울어도 괜찮아',
    synopsis: '다온이가 숲에서 먹구름 갈기의 사자야를 만나 상상동물병원으로 데려가고, 도티 선생님의 도움으로 사자야가 억눌린 슬픔을 표현하며 먹구름 갈기가 분홍빛 솜사탕 갈기로 변하는 이야기.',
    runtime: '4분 30초 ~ 5분',
    status: 'draft',
    sceneCount: 10,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const episodeId = episodeRef.id

  // ──────────────────────────────────────────────────────
  // 4. 씬 10개 생성
  // ──────────────────────────────────────────────────────
  const sceneDefs: Array<Omit<any, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      number: 1,
      title: '오프닝 — 상상동물병원 전경',
      timeStart: '0:00',
      timeEnd: '0:25',
      location: '상상동물병원 전경 / 정원',
      timeOfDay: 'morning',
      weather: '맑음, 부드러운 빛',
      characters: [dottiId, luluId],
      cameraMovement: 'crane',
      cameraAngle: 'birds_eye',
      lighting: '부드러운 아침 햇살, 따뜻한 골든아워',
      colorGrade: '파스텔 웜톤, 약간 블룸 효과',
      emotionKeywords: ['설레임', '따뜻함', '기대'],
      backgroundDescription: '파스텔 톤의 귀여운 병원 건물, 꽃이 핀 정원, 부드러운 구름, 아침 빛이 스며드는 동화적 풍경',
      actionDescription: '카메라가 하늘에서 내려오며 병원 전경을 보여주고, 도티가 정문에서 루루들과 함께 하루를 시작하는 모습',
      dialogues: [
        { characterId: dottiId, characterName: '도티', line: '오늘은 또 어떤 친구가 올까?', emotion: '기대', direction: '카메라를 향해 미소' },
      ],
      soundDesign: '새소리, 부드러운 오르골 BGM, 바람 소리',
      directorNote: '시리즈 시그니처 오프닝. 따뜻하고 안전한 세계관 확립.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 2,
      title: '다온이의 숲길',
      timeStart: '0:25',
      timeEnd: '0:50',
      location: '숲길',
      timeOfDay: 'morning',
      weather: '맑지만 살짝 흐림',
      characters: [daonId],
      cameraMovement: 'tracking',
      cameraAngle: 'eye_level',
      lighting: '나뭇잎 사이 빛, 약간 그늘진 곳',
      colorGrade: '자연 그린 + 파스텔',
      emotionKeywords: ['호기심', '의문'],
      backgroundDescription: '초록 숲길, 나뭇잎 사이로 빛이 비추는 길, 가방에 파란 비구름 스티커가 보임 (복선)',
      actionDescription: '다온이가 가방을 메고 숲길을 걸으며 주변을 두리번거리다가 먼 곳에서 비 내리는 소리를 듣고 의아해함',
      dialogues: [
        { characterId: daonId, characterName: '다온', line: '어? 비가 오나...? 근데 하늘은 맑은데?', emotion: '의문', direction: '하늘을 올려다보며' },
      ],
      soundDesign: '발자국 소리, 새소리, 멀리서 빗소리 점점 커짐',
      directorNote: '가방 스티커 복선 — 나중에 사자야의 비와 연결. 카메라가 스티커를 잠깐 클로즈업.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 3,
      title: '사자야 발견',
      timeStart: '0:50',
      timeEnd: '1:20',
      location: '숲 속 큰 나무 뒤',
      timeOfDay: 'morning',
      weather: '국소적 비 (사자야 주변만)',
      characters: [daonId, sajayaId],
      cameraMovement: 'zoom_in',
      cameraAngle: 'low_angle',
      lighting: '사자야 주변은 어둡고 습한 빛, 다온 쪽은 밝은 빛',
      colorGrade: '사자야 영역: 그레이블루 / 다온 영역: 웜톤',
      emotionKeywords: ['슬픔', '억눌림'],
      backgroundDescription: '큰 나무 뒤에 웅크린 사자야, 먹구름 갈기에서 비가 내리고 발밑에 웅덩이, 주변 풀이 축축함',
      actionDescription: '다온이가 나무 뒤를 들여다보고 사자야를 발견. 사자야는 고개를 숙이고 있으며 갈기 먹구름에서 비가 주룩주룩 내림',
      dialogues: [
        { characterId: daonId, characterName: '다온', line: '...너, 울고 있는 거야?', emotion: '공감', direction: '조심스럽게 다가가며' },
        { characterId: sajayaId, characterName: '사자야', line: '...나 안 울어. 그냥 비가 오는 거야.', emotion: '억눌림', direction: '고개를 돌리며, 시선 회피' },
      ],
      soundDesign: '빗소리 강조, 우울한 피아노 단선율, 물방울 떨어지는 소리',
      directorNote: '감정적 핵심 장면. 사자야의 "안 울어" 대사가 억눌림을 상징. 색온도 대비로 두 캐릭터 감정 차이 표현.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 4,
      title: '공감의 시작',
      timeStart: '1:20',
      timeEnd: '1:50',
      location: '숲길 (나무 옆)',
      timeOfDay: 'morning',
      characters: [daonId, sajayaId],
      cameraMovement: 'static',
      cameraAngle: 'eye_level',
      lighting: '따뜻한 빛이 살짝 스며드는 연출',
      colorGrade: '그레이에서 서서히 웜톤으로 전환',
      emotionKeywords: ['공감', '용기', '따뜻함'],
      backgroundDescription: '다온이가 사자야 옆에 앉아있는 모습, 비를 함께 맞고 있음',
      actionDescription: '다온이가 사자야 옆에 앉아 우산도 없이 같이 비를 맞으며 "나도 비 맞을래" 하고 미소. 사자야가 놀라서 올려다봄',
      dialogues: [
        { characterId: daonId, characterName: '다온', line: '괜찮아, 나도 같이 맞을게. 비가 올 때는 같이 맞는 게 좋아.', emotion: '따뜻함', direction: '사자야 옆에 앉으며 미소' },
        { characterId: sajayaId, characterName: '사자야', line: '...왜?', emotion: '놀람', direction: '처음으로 고개를 들어 다온을 바라봄' },
      ],
      soundDesign: '빗소리 부드러워짐, 따뜻한 스트링 시작',
      directorNote: '공감의 순간. 다온이가 "고쳐주겠다"가 아니라 "함께 있겠다"는 태도로 접근하는 것이 핵심.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 5,
      title: '병원 가는 길',
      timeStart: '1:50',
      timeEnd: '2:15',
      location: '숲길 → 병원 방향',
      timeOfDay: 'morning',
      characters: [daonId, sajayaId],
      cameraMovement: 'tracking',
      cameraAngle: 'eye_level',
      lighting: '점점 밝아지는 빛',
      colorGrade: '그레이 → 파스텔 그라데이션',
      emotionKeywords: ['안도', '동행'],
      backgroundDescription: '두 캐릭터가 나란히 걸어가는 숲길, 점점 꽃이 많아지고 밝아짐, 멀리 병원이 보임',
      actionDescription: '다온이가 사자야 손(발)을 잡고 걸어가는 모습. 사자야 갈기에서 비가 조금 줄어듦',
      dialogues: [
        { characterId: daonId, characterName: '다온', line: '나 아는 곳이 있어. 거기 가면 좀 나을 거야!', emotion: '기대', direction: '앞을 가리키며 밝은 표정' },
      ],
      soundDesign: '경쾌한 발자국, 빗소리 점점 줄어듦, 밝은 목관 멜로디',
      directorNote: '이동 장면이지만 감정 전환의 브릿지. 색감이 서서히 밝아지는 것이 사자야 마음의 변화 암시.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 6,
      title: '병원 도착 — 환영',
      timeStart: '2:15',
      timeEnd: '2:50',
      location: '상상동물병원 입구 / 로비',
      timeOfDay: 'morning',
      characters: [dottiId, luluId, daonId, sajayaId],
      cameraMovement: 'pan',
      cameraAngle: 'eye_level',
      lighting: '따뜻한 실내 조명, 안전한 빛',
      colorGrade: '풀 파스텔 웜톤',
      emotionKeywords: ['환대', '안전함', '따뜻함'],
      backgroundDescription: '파스텔 톤의 아늑한 병원 로비, 귀여운 소품들, 루루들이 둥둥 떠다니며 반기는 모습',
      actionDescription: '도티가 문을 열어주고, 루루들이 사자야 주변을 맴돌며 반기는 장면. 사자야가 처음으로 약간 놀란 듯 주변을 둘러봄',
      dialogues: [
        { characterId: dottiId, characterName: '도티', line: '어서 와, 여기는 상상동물병원이야. 어떤 마음이든 괜찮은 곳이야.', emotion: '온화', direction: '문을 열어주며 따뜻한 미소' },
      ],
      soundDesign: '문 열리는 소리, 따뜻한 차임벨, 루루들 반기는 소리 (방울 소리)',
      directorNote: '"어떤 마음이든 괜찮은 곳" — 시리즈 핵심 대사. 안전한 공간 확립.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 7,
      title: '마음 살펴보기',
      timeStart: '2:50',
      timeEnd: '3:30',
      location: '상상동물병원 진료실',
      timeOfDay: 'interior',
      characters: [dottiId, luluId, daonId, sajayaId],
      cameraMovement: 'static',
      cameraAngle: 'eye_level',
      lighting: '부드러운 간접 조명',
      colorGrade: '웜 파스텔 + 사자야 주변만 약간 블루',
      emotionKeywords: ['공감', '이해', '억눌린 슬픔'],
      backgroundDescription: '아늑한 진료실, 부드러운 쿠션과 담요, 도티의 책상에 귀여운 소품들',
      actionDescription: '도티가 사자야의 갈기를 살펴보며 "이 구름이 많이 무거웠겠다" 하고 공감. 루루 하나가 사자야 곁에 앉아 빗방울을 같이 맞는 제스처',
      dialogues: [
        { characterId: dottiId, characterName: '도티', line: '이 구름... 오래 참고 있었구나. 많이 무거웠지?', emotion: '공감', direction: '갈기를 조심스럽게 만지며' },
        { characterId: sajayaId, characterName: '사자야', line: '...다들 사자는 울면 안 된다고 했어.', emotion: '억눌림', direction: '고개를 숙이며, 갈기에서 비가 더 강해짐' },
      ],
      soundDesign: '빗소리 다시 세짐, 슬픈 피아노, 물방울 클로즈업 소리',
      directorNote: '감정 핵심 — "사자는 울면 안 된다"가 억눌린 감정의 원인. 교훈이 아닌 공감으로 접근.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 8,
      title: '마음 처방',
      timeStart: '3:30',
      timeEnd: '4:05',
      location: '상상동물병원 진료실',
      timeOfDay: 'interior',
      characters: [dottiId, luluId, daonId, sajayaId],
      cameraMovement: 'zoom_in',
      cameraAngle: 'eye_level',
      lighting: '따뜻한 빛이 점점 강해짐',
      colorGrade: '웜톤 증가, 블루 감소',
      emotionKeywords: ['위로', '허용', '안전'],
      backgroundDescription: '도티가 사자야 앞에 무릎을 꿇고 눈높이를 맞추는 장면',
      actionDescription: '도티가 눈높이를 맞추고 "울어도 돼" 처방. 다온이도 옆에서 고개를 끄덕이고, 루루들이 부드러운 빛을 내며 감싸는 연출',
      dialogues: [
        { characterId: dottiId, characterName: '도티', line: '사자야, 오늘의 처방은... 울어도 괜찮다는 거야.', emotion: '온화', direction: '사자야 눈을 바라보며, 따뜻한 미소' },
        { characterId: dottiId, characterName: '도티', line: '비가 올 때 우산이 아니라, 비를 맞아도 된다고 말해주는 게 진짜 치료야.', emotion: '진심', direction: '손을 가슴에 대며' },
      ],
      soundDesign: '빗소리 부드러워짐, 따뜻한 스트링 크레센도, 루루 방울 소리',
      directorNote: '"울어도 괜찮다" — 에피소드 핵심 처방. 억지 해결이 아닌 감정 수용의 메시지.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
    {
      number: 9,
      title: '카타르시스 — 먹구름에서 솜사탕으로',
      timeStart: '4:05',
      timeEnd: '4:40',
      location: '상상동물병원 진료실 (확장 공간)',
      timeOfDay: 'interior',
      characters: [dottiId, luluId, daonId, sajayaId],
      cameraMovement: 'crane',
      cameraAngle: 'low_angle',
      lighting: '먹구름 사이로 햇살 스며듦 → 전체가 환한 빛',
      colorGrade: '그레이블루 → 핑크 + 골든 그라데이션',
      emotionKeywords: ['카타르시스', '해방', '기쁨'],
      backgroundDescription: '사자야가 울기 시작하면서 진료실 공간이 확장되고, 먹구름 갈기에서 비가 세차게 내리다가 점점 햇살이 스며들며 분홍빛 솜사탕 갈기로 변하는 판타지 장면',
      actionDescription: '사자야가 크게 울음. 먹구름에서 비가 폭포처럼 쏟아지다가, 울음 후 서서히 구름이 걷히고 갈기가 분홍빛 솜사탕으로 변환. 반짝이는 파티클이 퍼지며 모두 감탄',
      dialogues: [
        { characterId: sajayaId, characterName: '사자야', line: '으아아앙... (크게 운다)', emotion: '해방', direction: '입을 크게 벌리고 울음, 먹구름 폭풍' },
        { characterId: daonId, characterName: '다온', line: '와...! 갈기가... 솜사탕이야!', emotion: '놀람/기쁨', direction: '눈을 크게 뜨며 환하게 웃음' },
      ],
      soundDesign: '폭풍 빗소리 → 정적 → 오르골 + 반짝임 사운드 + 따뜻한 오케스트라 스웰',
      directorNote: '에피소드 최대 클라이맥스. AI 변환 씬으로, 먹구름→솜사탕 변환이 감정 해방의 시각적 메타포. VFX 집중 구간.',
      isAITransformScene: true,
      transform: {
        triggerMoment: '사자야가 참지 않고 크게 울기 시작하는 순간',
        stateBefore: '먹구름이 낀 회색 갈기, 빗방울 떨어짐',
        stateAfter: '분홍빛 솜사탕 갈기, 파티클 반짝임',
        transitionStyle: '먹구름 사이로 햇살이 스며들며 솜사탕으로 변환',
        duration: '35초',
      },
      assets: {},
      status: 'draft',
    },
    {
      number: 10,
      title: '엔딩 — 다음에 또 만나',
      timeStart: '4:40',
      timeEnd: '5:00',
      location: '상상동물병원 전경 / 정문',
      timeOfDay: 'afternoon',
      weather: '맑음, 무지개',
      characters: [dottiId, luluId, daonId, sajayaId],
      cameraMovement: 'crane',
      cameraAngle: 'birds_eye',
      lighting: '따뜻한 오후 빛, 골든아워',
      colorGrade: '풀 파스텔 + 무지개 하이라이트',
      emotionKeywords: ['성장', '희망', '다음화 기대'],
      backgroundDescription: '병원 앞에서 솜사탕 갈기의 사자야가 활짝 웃으며 손을 흔들고, 도티와 다온이 배웅하는 장면. 하늘에 작은 무지개',
      actionDescription: '사자야가 밝은 표정으로 손(발)을 흔들며 돌아가고, 도티가 카메라를 향해 "다음엔 어떤 친구가 올까?" 하며 마무리. 카메라 올라가며 병원 전경 + 무지개',
      dialogues: [
        { characterId: dottiId, characterName: '도티', line: '다음엔 또 어떤 친구가 찾아올까?', emotion: '기대', direction: '카메라를 향해 미소, 시리즈 클로징 대사' },
      ],
      soundDesign: '밝은 오르골 테마, 새소리, 바람 소리, 엔딩 자막 음악으로 전환',
      directorNote: '시리즈 포맷 엔딩. 매화 동일한 "다음엔 어떤 친구가?" 클로징으로 다음화 기대감 형성.',
      isAITransformScene: false,
      assets: {},
      status: 'draft',
    },
  ]

  for (const scene of sceneDefs) {
    await addDoc(
      collection(db, 'projects', projectId, 'episodes', episodeId, 'scenes'),
      {
        ...scene,
        episodeId,
        projectId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    )
  }

  return true
}
