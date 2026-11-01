/* 내장 배경음악 라이브러리 (tools/make_music.py 로 생성한 곡 — music/ 폴더) */
const MusicLib = {
 "license": "이 폴더의 음악은 HTML 프레젠테이션 스튜디오의 make_music.py 로 직접 작곡·합성한 곡으로, 자유롭게 사용할 수 있습니다. 05번은 공개 저작물(Amazing Grace, New Britain) 선율을 편곡했습니다.",
 "tags": [
  "발표",
  "병원",
  "교회",
  "영상"
 ],
 "tracks": [
  {
   "id": "01-calm-piano",
   "file": "music/01-calm-piano.mp3",
   "title": "잔잔한 피아노",
   "en": "Morning Light",
   "mood": "평온 · 따뜻함",
   "tags": [
    "발표",
    "병원",
    "교회"
   ],
   "use": "병원 안내 영상, 설교 시작 전, 일반 발표 배경",
   "bpm": 72,
   "duration": 84,
   "color": "#4dabf7"
  },
  {
   "id": "02-hopeful-acoustic",
   "file": "music/02-hopeful-acoustic.mp3",
   "title": "희망의 아침",
   "en": "Hopeful Steps",
   "mood": "희망 · 산뜻함",
   "tags": [
    "발표",
    "병원",
    "영상"
   ],
   "use": "오프닝, 홍보 영상, 새 출발 메시지",
   "bpm": 96,
   "duration": 84,
   "color": "#51cf66"
  },
  {
   "id": "03-corporate-bright",
   "file": "music/03-corporate-bright.mp3",
   "title": "비즈니스 업비트",
   "en": "Bright Business",
   "mood": "활기 · 전문적",
   "tags": [
    "발표",
    "영상"
   ],
   "use": "회사 소개, 성과 보고, 제품 발표",
   "bpm": 110,
   "duration": 82.5,
   "color": "#fcc419"
  },
  {
   "id": "04-meditation-pad",
   "file": "music/04-meditation-pad.mp3",
   "title": "고요한 묵상",
   "en": "Quiet Prayer",
   "mood": "고요 · 묵상",
   "tags": [
    "교회",
    "병원"
   ],
   "use": "기도 시간, 묵상, 설교 배경, 회복실 안내",
   "bpm": 60,
   "duration": 70,
   "color": "#845ef7"
  },
  {
   "id": "05-amazing-grace",
   "file": "music/05-amazing-grace.mp3",
   "title": "놀라운 은혜 (Amazing Grace)",
   "en": "Amazing Grace — Organ & Strings",
   "mood": "경건 · 찬양",
   "tags": [
    "교회"
   ],
   "use": "예배 전후, 찬양 묵상 (공개 저작물 찬송가 선율)",
   "bpm": 76,
   "duration": 80.8,
   "color": "#e599f7"
  },
  {
   "id": "06-clean-medical",
   "file": "music/06-clean-medical.mp3",
   "title": "맑은 케어",
   "en": "Gentle Care",
   "mood": "깨끗함 · 신뢰",
   "tags": [
    "병원",
    "발표"
   ],
   "use": "병원 홍보, 건강 정보, 검사 안내",
   "bpm": 84,
   "duration": 72.6,
   "color": "#20c997"
  },
  {
   "id": "07-tech-pulse",
   "file": "music/07-tech-pulse.mp3",
   "title": "미래 기술",
   "en": "Tech Pulse",
   "mood": "역동 · 미래",
   "tags": [
    "발표",
    "영상"
   ],
   "use": "기술·혁신 발표, 신제품 소개, 데이터 영상",
   "bpm": 118,
   "duration": 85.4,
   "color": "#339af0"
  },
  {
   "id": "08-cinematic-rise",
   "file": "music/08-cinematic-rise.mp3",
   "title": "감동의 순간",
   "en": "Cinematic Rise",
   "mood": "감동 · 웅장",
   "tags": [
    "교회",
    "영상",
    "발표"
   ],
   "use": "간증, 감동 영상, 마무리 슬라이드",
   "bpm": 70,
   "duration": 60.9,
   "color": "#ff8787"
  },
  {
   "id": "09-happy-marimba",
   "file": "music/09-happy-marimba.mp3",
   "title": "즐거운 하루",
   "en": "Happy Day",
   "mood": "밝음 · 경쾌",
   "tags": [
    "영상",
    "교회",
    "병원"
   ],
   "use": "어린이 교육, 행사 영상, 주일학교",
   "bpm": 120,
   "duration": 68,
   "color": "#ffa94d"
  },
  {
   "id": "10-lofi-chill",
   "file": "music/10-lofi-chill.mp3",
   "title": "편안한 대기실",
   "en": "Lo-fi Lounge",
   "mood": "편안 · 여유",
   "tags": [
    "병원",
    "영상"
   ],
   "use": "대기실 화면, 쉬는 시간, 카페 분위기",
   "bpm": 80,
   "duration": 76,
   "color": "#a9e34b"
  }
 ]
};

/* 내 음악 보관함: 직접 받은 음악(Pixabay, YouTube 오디오 보관함 등)을 모든 문서에서 다시 쓰도록 보관 */
const MusicBox = (() => {
  const KEY = 'hppt.musicbox.v1';
  const B = {};
  B.list = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  B.save = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { /* ignore */ } };
  B.add = (m) => { const l = B.list(); l.unshift(m); B.save(l); return m; };
  B.update = (id, patch) => { const l = B.list(); const m = l.find((x) => x.id === id); if (m) Object.assign(m, patch); B.save(l); return m; };
  B.remove = (id) => B.save(B.list().filter((x) => x.id !== id));
  B.srcs = () => B.list().map((x) => x.src);
  return B;
})();

const MUSIC_LICENSES = {
  free: { label: '출처 표기 필요 없음', note: '', needCredit: false },
  ccby: { label: 'CC BY (출처 표기 필수)', note: '영상 설명란이나 마지막 화면에 출처를 적어야 합니다', needCredit: true },
  youtube: { label: 'YouTube 오디오 보관함 (일반)', note: '유튜브 영상 안에서만 쓰는 것이 안전합니다', needCredit: false, ytOnly: true },
  own: { label: '직접 만들었거나 권리 보유', note: '', needCredit: false },
  other: { label: '기타 / 확인 필요', note: '사용 조건을 꼭 확인하세요', needCredit: false },
};

const MUSIC_SOURCES = [
  { name: 'Pixabay Music', url: 'https://pixabay.com/music/', license: 'free', summary: '무료·상업적 이용 가능, 출처 표기 필요 없음. 유튜브 저작권 신고(Content ID)가 나중에 걸리는 경우가 있어 받은 곡의 라이선스 화면을 캡처해 두면 좋습니다.' },
  { name: 'YouTube 오디오 보관함', url: 'https://studio.youtube.com/', license: 'youtube', summary: 'YouTube 스튜디오 ▸ 오디오 보관함. 일반 곡은 유튜브 영상에 쓰기 좋고, CC 표시 곡은 출처 표기가 필요합니다. 유튜브 밖(파일 배포 등)에서는 조건을 확인하세요.' },
  { name: 'Incompetech (Kevin MacLeod)', url: 'https://incompetech.com/music/royalty-free/music.html', license: 'ccby', summary: 'CC BY 4.0 — 출처 표기 필수. 예: "곡명" Kevin MacLeod (incompetech.com), CC BY 4.0' },
  { name: 'Free Music Archive', url: 'https://freemusicarchive.org/', license: 'other', summary: '곡마다 라이선스가 다릅니다 (CC0, CC BY, 비상업 등). 곡 페이지의 라이선스를 확인하세요.' },
];

const MUSIC_KEYWORDS = {
  병원: ['calm piano', 'gentle corporate', 'healing ambient', 'soft acoustic', 'medical', 'lofi chill'],
  교회: ['worship piano', 'hymn instrumental', 'prayer ambient', 'peaceful strings', 'meditation', 'inspirational'],
  발표: ['corporate inspiring', 'presentation background', 'upbeat motivational', 'technology', 'cinematic emotional'],
};

/* Pixabay 추천 곡 (Pixabay 검색 결과에서 확인, 2026-10). ⬇ 받기 → Pixabay 페이지에서 Download → 받은 파일을 보관함에 넣으면 자동 인식 */
const PIXABAY_CATS = { hymn: '⛪ 찬송가', worship: '🙏 예배·묵상', hospital: '🏥 병원 안내', waiting: '🛋 대기실', present: '📊 발표', video: '🎬 영상·어린이' };
const PIXABAY_PICKS = [
 {
  "cat": "hymn",
  "id": 324912,
  "title": "Amazing Grace",
  "ko": "나 같은 죄인 살리신",
  "artist": "musicissacred",
  "dur": "2:56",
  "url": "https://pixabay.com/music/religious-theme-amazing-grace-324912/",
  "use": "예배 전후, 찬양 묵상"
 },
 {
  "cat": "hymn",
  "id": 146074,
  "title": "It is Well with My Soul",
  "ko": "내 평생에 가는 길",
  "artist": "Music_For_Videos",
  "dur": "2:30",
  "url": "https://pixabay.com/music/modern-classical-it-is-well-with-my-soul-146074/",
  "use": "위로·평안 메시지"
 },
 {
  "cat": "hymn",
  "id": 146072,
  "title": "Great Is Thy Faithfulness",
  "ko": "오 신실하신 주",
  "artist": "Music_For_Videos",
  "dur": "3:08",
  "url": "https://pixabay.com/music/solo-piano-great-is-thy-faithfulness-146072/",
  "use": "감사·간증"
 },
 {
  "cat": "hymn",
  "id": 146076,
  "title": "What a Friend We Have in Jesus",
  "ko": "죄짐 맡은 우리 구주",
  "artist": "Music_For_Videos",
  "dur": "2:19",
  "url": "https://pixabay.com/music/solo-piano-what-a-friend-we-have-in-jesus-146076/",
  "use": "기도 시간"
 },
 {
  "cat": "hymn",
  "id": 146073,
  "title": "I Surrender All",
  "ko": "내게 있는 모든 것을",
  "artist": "Music_For_Videos",
  "dur": "2:30",
  "url": "https://pixabay.com/music/solo-piano-i-surrender-all-146073/",
  "use": "결단·헌신"
 },
 {
  "cat": "hymn",
  "id": 150827,
  "title": "The Old Rugged Cross",
  "ko": "갈보리산 위에",
  "artist": "BlenderTimer",
  "dur": "5:11",
  "url": "https://pixabay.com/music/religious-theme-the-old-rugged-cross-150827/",
  "use": "고난주간, 십자가 메시지"
 },
 {
  "cat": "hymn",
  "id": 524404,
  "title": "A Mighty Fortress Is Our God",
  "ko": "내 주는 강한 성이요",
  "artist": "musicissacred",
  "dur": "3:39",
  "url": "https://pixabay.com/music/religious-theme-a-mighty-fortress-is-our-god-524404/",
  "use": "종교개혁, 힘찬 마무리"
 },
 {
  "cat": "hymn",
  "id": 164236,
  "title": "Come Thou Fount of Every Blessing",
  "ko": "복의 근원 강림하사",
  "artist": "Music_For_Videos",
  "dur": "1:20",
  "url": "https://pixabay.com/music/modern-classical-come-thou-fount-of-every-blessing-164236/",
  "use": "짧은 오프닝"
 },
 {
  "cat": "hymn",
  "id": 247207,
  "title": "Be Still, My Soul (Piano Improvisation)",
  "ko": "",
  "artist": "smccleery",
  "dur": "5:53",
  "url": "https://pixabay.com/music/modern-classical-be-still-my-soul-piano-improvisation-247207/",
  "use": "묵상, 설교 배경"
 },
 {
  "cat": "hymn",
  "id": 598031,
  "title": "Joy To The World",
  "ko": "기쁘다 구주 오셨네",
  "artist": "musicissacred",
  "dur": "2:23",
  "url": "https://pixabay.com/music/religious-theme-joy-to-the-world-598031/",
  "use": "성탄절"
 },
 {
  "cat": "worship",
  "id": 240319,
  "title": "Beautiful Worship Piano Peaceful Music",
  "ko": "",
  "artist": "Denis-Pavlov-Music",
  "dur": "8:30",
  "url": "https://pixabay.com/music/modern-classical-beautiful-worship-piano-peaceful-music-240319/",
  "use": "긴 설교 배경 (8분)"
 },
 {
  "cat": "worship",
  "id": 249459,
  "title": "Christian Instrumental Piano Worship (Soaking Prayer)",
  "ko": "",
  "artist": "JesseQuinnMedia",
  "dur": "3:49",
  "url": "https://pixabay.com/music/ambient-christian-instrumental-piano-worship-calm-emotional-soaking-prayer-249459/",
  "use": "기도회, 묵상"
 },
 {
  "cat": "worship",
  "id": 589289,
  "title": "Worship Spiritual Sacred Prayer Music",
  "ko": "",
  "artist": "echoes_of_lumen",
  "dur": "4:14",
  "url": "https://pixabay.com/music/religious-theme-worship-spiritual-sacred-prayer-music-589289/",
  "use": "기도, 성경 읽기"
 },
 {
  "cat": "worship",
  "id": 590363,
  "title": "Worship - Worship Music",
  "ko": "",
  "artist": "leberch",
  "dur": "3:52",
  "url": "https://pixabay.com/music/religious-theme-worship-worship-music-590363/",
  "use": "예배 영상 배경"
 },
 {
  "cat": "worship",
  "id": 375361,
  "title": "Meditation Ambient",
  "ko": "",
  "artist": "leberch",
  "dur": "5:06",
  "url": "https://pixabay.com/music/meditationspiritual-meditation-ambient-375361/",
  "use": "고요한 묵상 (회복실 안내에도)"
 },
 {
  "cat": "hospital",
  "id": 522434,
  "title": "Medical",
  "ko": "",
  "artist": "AtlasAudio",
  "dur": "3:02",
  "url": "https://pixabay.com/music/corporate-medical-522434/",
  "use": "병원 소개·홍보 영상"
 },
 {
  "cat": "hospital",
  "id": 617589,
  "title": "Medical Video",
  "ko": "",
  "artist": "AtlasAudio",
  "dur": "2:45",
  "url": "https://pixabay.com/music/corporate-medical-video-617589/",
  "use": "진료 안내, 시설 소개"
 },
 {
  "cat": "hospital",
  "id": 612841,
  "title": "Medical - Medical Background Music",
  "ko": "",
  "artist": "lNPLUSMUSIC",
  "dur": "2:01",
  "url": "https://pixabay.com/music/orchestral-medical-medical-background-music-612841/",
  "use": "건강 정보 영상"
 },
 {
  "cat": "hospital",
  "id": 570704,
  "title": "Medical",
  "ko": "",
  "artist": "Monume",
  "dur": "2:56",
  "url": "https://pixabay.com/music/modern-classical-medical-570704/",
  "use": "차분한 환자 안내"
 },
 {
  "cat": "hospital",
  "id": 590156,
  "title": "Calm Piano",
  "ko": "",
  "artist": "AtlasAudio",
  "dur": "2:19",
  "url": "https://pixabay.com/music/modern-classical-calm-piano-590156/",
  "use": "검사 전 안내, 편안한 설명"
 },
 {
  "cat": "waiting",
  "id": 112191,
  "title": "Lofi Study - Calm Peaceful Chill Hop",
  "ko": "",
  "artist": "FASSounds",
  "dur": "2:27",
  "url": "https://pixabay.com/music/beats-lofi-study-calm-peaceful-chill-hop-112191/",
  "use": "대기실 화면"
 },
 {
  "cat": "waiting",
  "id": 553405,
  "title": "Chill — Lamp Light",
  "ko": "",
  "artist": "Ornave",
  "dur": "3:37",
  "url": "https://pixabay.com/music/lofi-chill-lamp-light-553405/",
  "use": "대기실, 휴게 공간"
 },
 {
  "cat": "waiting",
  "id": 160166,
  "title": "Good Night - Lofi Cozy Chill Music",
  "ko": "",
  "artist": "FASSounds",
  "dur": "2:27",
  "url": "https://pixabay.com/music/beats-good-night-lofi-cozy-chill-music-160166/",
  "use": "저녁 시간 대기실"
 },
 {
  "cat": "waiting",
  "id": 552792,
  "title": "Chillhop Jazz Coffee Shop",
  "ko": "",
  "artist": "alex-morgan",
  "dur": "2:53",
  "url": "https://pixabay.com/music/lofi-chillhop-jazz-coffee-shop-552792/",
  "use": "카페 분위기 대기실"
 },
 {
  "cat": "present",
  "id": 275619,
  "title": "Corporate Inspiring",
  "ko": "",
  "artist": "Kulakovka",
  "dur": "2:02",
  "url": "https://pixabay.com/music/upbeat-corporate-inspiring-275619/",
  "use": "발표 오프닝"
 },
 {
  "cat": "present",
  "id": 613526,
  "title": "Inspiring Business",
  "ko": "",
  "artist": "AtlasAudio",
  "dur": "3:08",
  "url": "https://pixabay.com/music/corporate-inspiring-business-613526/",
  "use": "성과 보고, 회사 소개"
 },
 {
  "cat": "present",
  "id": 568147,
  "title": "Corporate Presentation",
  "ko": "",
  "artist": "alex-morgan",
  "dur": "1:48",
  "url": "https://pixabay.com/music/corporate-corporate-presentation-568147/",
  "use": "프레젠테이션 배경"
 },
 {
  "cat": "present",
  "id": 164808,
  "title": "Inspiring Corporate",
  "ko": "",
  "artist": "PaulYudin",
  "dur": "1:57",
  "url": "https://pixabay.com/music/corporate-inspiring-corporate-164808/",
  "use": "제품·서비스 소개"
 },
 {
  "cat": "present",
  "id": 609167,
  "title": "Corporate Background",
  "ko": "",
  "artist": "Kulakovka",
  "dur": "2:17",
  "url": "https://pixabay.com/music/corporate-corporate-background-609167/",
  "use": "잔잔한 업무 발표"
 },
 {
  "cat": "video",
  "id": 409347,
  "title": "Inspiring Cinematic Music",
  "ko": "",
  "artist": "Tunetank",
  "dur": "2:12",
  "url": "https://pixabay.com/music/main-title-inspiring-cinematic-music-409347/",
  "use": "감동 영상, 간증"
 },
 {
  "cat": "video",
  "id": 427250,
  "title": "Epic Cinematic Inspirational Music",
  "ko": "",
  "artist": "ViacheslavStarostin",
  "dur": "4:15",
  "url": "https://pixabay.com/music/main-title-epic-cinematic-inspirational-music-427250/",
  "use": "웅장한 마무리"
 },
 {
  "cat": "video",
  "id": 593047,
  "title": "Happy Kids",
  "ko": "",
  "artist": "AtlasAudio",
  "dur": "1:03",
  "url": "https://pixabay.com/music/happy-childrens-tunes-happy-kids-593047/",
  "use": "주일학교, 어린이 영상"
 },
 {
  "cat": "video",
  "id": 545506,
  "title": "Kids - Kids Happy Music",
  "ko": "",
  "artist": "alex-morgan",
  "dur": "1:47",
  "url": "https://pixabay.com/music/happy-childrens-tunes-kids-kids-happy-music-545506/",
  "use": "어린이 교육, 행사"
 }
];
// 받은 파일 이름(예: calm-piano-590156.mp3)에서 Pixabay 곡 번호 찾기
function pixabayIdFromName(name) {
  const m = String(name || '').replace(/\s*\(\d+\)(?=\.\w+$)/, '').match(/(\d{5,7})(?:\D*)\.(mp3|wav|m4a|ogg)$/i);
  return m ? +m[1] : 0;
}
