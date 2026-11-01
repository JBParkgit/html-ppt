/*
 * PlayerCore — 슬라이드 렌더러, 애니메이션/전환 정의, 발표 플레이어.
 * 이 함수는 외부 의존성이 없어야 한다: HTML 내보내기 시 PlayerCore.toString() 으로 그대로 포함된다.
 */
function PlayerCore() {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 애니메이션 정의                                                     */
  /* ------------------------------------------------------------------ */
  // kf(el, deck) => keyframes. cat: in | emph | loop | out
  const offL = (el) => `translateX(${-(el.x + el.w + 40)}px)`;
  const offR = (el, d) => `translateX(${d.width - el.x + 40}px)`;
  const offT = (el) => `translateY(${-(el.y + el.h + 40)}px)`;
  const offB = (el, d) => `translateY(${d.height - el.y + 40}px)`;

  const ANIMS = {
    // 나타내기
    'fade-in':     { cat: 'in', label: '페이드 인', kf: () => [{ opacity: 0 }, { opacity: 1 }] },
    'fly-left':    { cat: 'in', label: '왼쪽에서 날아오기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: (e) => [{ transform: offL(e) }, { transform: 'none' }] },
    'fly-right':   { cat: 'in', label: '오른쪽에서 날아오기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: (e, d) => [{ transform: offR(e, d) }, { transform: 'none' }] },
    'fly-top':     { cat: 'in', label: '위에서 날아오기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: (e) => [{ transform: offT(e) }, { transform: 'none' }] },
    'fly-bottom':  { cat: 'in', label: '아래에서 날아오기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: (e, d) => [{ transform: offB(e, d) }, { transform: 'none' }] },
    'rise':        { cat: 'in', label: '떠오르기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0, transform: 'translateY(60px)' }, { opacity: 1, transform: 'none' }] },
    'sink':        { cat: 'in', label: '내려앉기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0, transform: 'translateY(-60px)' }, { opacity: 1, transform: 'none' }] },
    'slide-in-left': { cat: 'in', label: '살짝 밀려오기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0, transform: 'translateX(-80px)' }, { opacity: 1, transform: 'none' }] },
    'zoom-in':     { cat: 'in', label: '확대', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }] },
    'zoom-down':   { cat: 'in', label: '축소하며 나타내기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'none' }] },
    'bounce-in':   { cat: 'in', label: '바운스', kf: () => [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.08)', offset: .5 }, { transform: 'scale(.95)', offset: .75 }, { transform: 'none' }] },
    'drop-in':     { cat: 'in', label: '떨어지기', kf: (e) => [{ transform: offT(e), easing: 'cubic-bezier(.5,0,1,1)' }, { transform: 'none', offset: .6, easing: 'ease-out' }, { transform: 'translateY(-30px)', offset: .8, easing: 'ease-in' }, { transform: 'none' }] },
    'spin-in':     { cat: 'in', label: '회전하며 나타내기', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0, transform: 'rotate(-200deg) scale(0)' }, { opacity: 1, transform: 'none' }] },
    'flip-x':      { cat: 'in', label: '가로 뒤집기', kf: () => [{ opacity: 0, transform: 'perspective(1200px) rotateX(90deg)' }, { opacity: 1, transform: 'perspective(1200px) rotateX(0)' }] },
    'flip-y':      { cat: 'in', label: '세로 뒤집기', kf: () => [{ opacity: 0, transform: 'perspective(1200px) rotateY(90deg)' }, { opacity: 1, transform: 'perspective(1200px) rotateY(0)' }] },
    'swing-in':    { cat: 'in', label: '흔들며 나타내기', kf: () => [{ opacity: 0, transform: 'rotate(-25deg)', transformOrigin: 'top center' }, { opacity: 1, transform: 'rotate(12deg)', offset: .5, transformOrigin: 'top center' }, { transform: 'rotate(-5deg)', offset: .8, transformOrigin: 'top center' }, { transform: 'none', transformOrigin: 'top center' }] },
    'blur-in':     { cat: 'in', label: '흐림 해제', kf: () => [{ opacity: 0, filter: 'blur(24px)' }, { opacity: 1, filter: 'blur(0)' }] },
    'wipe-right':  { cat: 'in', label: '닦아내기 (→)', kf: () => [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
    'wipe-down':   { cat: 'in', label: '닦아내기 (↓)', kf: () => [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
    'circle-reveal': { cat: 'in', label: '원형 드러내기', kf: () => [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }] },
    'typewriter':  { cat: 'in', label: '타자기', easing: 'steps(24, end)', kf: () => [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
    'count-up':    { cat: 'in', label: '숫자 카운트업', special: 'count', easing: 'linear', kf: () => [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1 }] },
    'chart-draw':  { cat: 'in', label: '차트 그리기', special: 'chart', easing: 'linear', kf: () => [{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1 }] },
    'draw-line':   { cat: 'in', label: '선 그리기 (펜 선)', special: 'draw', easing: 'ease-in-out', kf: () => [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
    // 표: 행 하나씩 (표가 아닌 요소에 쓰면 페이드 인)
    'rows-prism':  { cat: 'in', label: '표: 행 하나씩 · 삼각기둥 회전', special: 'rows', row: 'prism', easing: 'cubic-bezier(.3,1.2,.45,1)', kf: () => [{ opacity: 0 }, { opacity: 1 }] },
    'rows-rise':   { cat: 'in', label: '표: 행 하나씩 · 떠오르기', special: 'rows', row: 'rise', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0 }, { opacity: 1 }] },
    'rows-slide':  { cat: 'in', label: '표: 행 하나씩 · 왼쪽에서', special: 'rows', row: 'slide', easing: 'cubic-bezier(.2,.8,.2,1)', kf: () => [{ opacity: 0 }, { opacity: 1 }] },
    'rows-fade':   { cat: 'in', label: '표: 행 하나씩 · 페이드', special: 'rows', row: 'fade', kf: () => [{ opacity: 0 }, { opacity: 1 }] },
    // 강조
    'pulse':       { cat: 'emph', label: '맥박', kf: () => [{ transform: 'none' }, { transform: 'scale(1.12)' }, { transform: 'none' }] },
    'grow':        { cat: 'emph', label: '커졌다 작아지기', kf: () => [{ transform: 'none' }, { transform: 'scale(1.3)', offset: .4 }, { transform: 'none' }] },
    'shake':       { cat: 'emph', label: '흔들기', kf: () => [0, -18, 18, -14, 14, -8, 8, 0].map((x) => ({ transform: `translateX(${x}px)` })) },
    'wobble':      { cat: 'emph', label: '비틀기', kf: () => [0, -6, 5, -4, 3, 0].map((r, i) => ({ transform: `translateX(${[0, -25, 20, -15, 10, 0][i]}px) rotate(${r}deg)` })) },
    'tada':        { cat: 'emph', label: '짜잔', kf: () => [{ transform: 'none' }, { transform: 'scale(.9) rotate(-3deg)' }, { transform: 'scale(1.1) rotate(3deg)' }, { transform: 'scale(1.1) rotate(-3deg)' }, { transform: 'scale(1.1) rotate(3deg)' }, { transform: 'none' }] },
    'flash':       { cat: 'emph', label: '깜빡이기', kf: () => [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }] },
    'spin':        { cat: 'emph', label: '360° 회전', kf: () => [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }] },
    'heartbeat':   { cat: 'emph', label: '두근두근', kf: () => [{ transform: 'none' }, { transform: 'scale(1.15)', offset: .14 }, { transform: 'none', offset: .28 }, { transform: 'scale(1.15)', offset: .42 }, { transform: 'none', offset: .7 }, { transform: 'none' }] },
    'jelly':       { cat: 'emph', label: '젤리', kf: () => [{ transform: 'none' }, { transform: 'scale(1.25,.75)', offset: .3 }, { transform: 'scale(.75,1.25)', offset: .4 }, { transform: 'scale(1.15,.85)', offset: .5 }, { transform: 'scale(.95,1.05)', offset: .65 }, { transform: 'scale(1.05,.95)', offset: .75 }, { transform: 'none' }] },
    'color-pop':   { cat: 'emph', label: '반짝 강조', kf: () => [{ filter: 'brightness(1)' }, { filter: 'brightness(1.8) saturate(1.6)' }, { filter: 'brightness(1)' }] },
    // 반복
    'float':       { cat: 'loop', label: '둥둥 떠다니기', loop: true, easing: 'ease-in-out', kf: () => [{ transform: 'translateY(0)' }, { transform: 'translateY(-20px)' }, { transform: 'translateY(0)' }] },
    'rotate-loop': { cat: 'loop', label: '계속 회전', loop: true, easing: 'linear', kf: () => [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }] },
    'breathe':     { cat: 'loop', label: '숨쉬기', loop: true, easing: 'ease-in-out', kf: () => [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }] },
    'blink':       { cat: 'loop', label: '깜빡임 반복', loop: true, kf: () => [{ opacity: 1 }, { opacity: .25 }, { opacity: 1 }] },
    // 끝내기
    'fade-out':    { cat: 'out', label: '페이드 아웃', kf: () => [{ opacity: 1 }, { opacity: 0 }] },
    'fly-out-left':  { cat: 'out', label: '왼쪽으로 날아가기', easing: 'cubic-bezier(.8,0,.8,.2)', kf: (e) => [{ transform: 'none' }, { transform: offL(e) }] },
    'fly-out-right': { cat: 'out', label: '오른쪽으로 날아가기', easing: 'cubic-bezier(.8,0,.8,.2)', kf: (e, d) => [{ transform: 'none' }, { transform: offR(e, d) }] },
    'zoom-out':    { cat: 'out', label: '축소하며 사라지기', kf: () => [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.2)' }] },
    'blow-out':    { cat: 'out', label: '확대하며 사라지기', kf: () => [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(2)' }] },
    'blur-out':    { cat: 'out', label: '흐려지며 사라지기', kf: () => [{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(24px)' }] },
    'fall-out':    { cat: 'out', label: '떨어지며 사라지기', easing: 'ease-in', kf: (e, d) => [{ transform: 'none', opacity: 1 }, { transform: offB(e, d) + ' rotate(25deg)', opacity: .6 }] },
  };
  const ANIM_CATS = { in: '나타내기', emph: '강조', loop: '반복', out: '끝내기' };

  /* ------------------------------------------------------------------ */
  /* 화면 전환                                                            */
  /* ------------------------------------------------------------------ */
  // f(dir) => { in: keyframes, out: keyframes }  dir: 1 다음, -1 이전
  const TRANSITIONS = {
    'none':       { label: '없음' },
    'morph':      { label: '🔀 모핑 (같은 요소가 이어서 변형)', morph: true },
    'fade':       { label: '페이드', f: () => ({ in: [{ opacity: 0 }, { opacity: 1 }], out: [{ opacity: 1 }, { opacity: 1 }] }) },
    'fade-black': { label: '검은 화면 통과', f: () => ({ in: [{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], out: [{ opacity: 1 }, { opacity: 0, offset: .5 }, { opacity: 0 }] }), black: true },
    'push-left':  { label: '밀어내기 (←)', f: (d) => ({ in: [{ transform: `translateX(${100 * d}%)` }, { transform: 'none' }], out: [{ transform: 'none' }, { transform: `translateX(${-100 * d}%)` }] }) },
    'push-up':    { label: '밀어내기 (↑)', f: (d) => ({ in: [{ transform: `translateY(${100 * d}%)` }, { transform: 'none' }], out: [{ transform: 'none' }, { transform: `translateY(${-100 * d}%)` }] }) },
    'cover-left': { label: '덮기 (←)', f: (d) => ({ in: [{ transform: `translateX(${100 * d}%)` }, { transform: 'none' }], out: [{ filter: 'brightness(1)' }, { filter: 'brightness(.5)' }] }) },
    'cover-up':   { label: '덮기 (↑)', f: (d) => ({ in: [{ transform: `translateY(${100 * d}%)` }, { transform: 'none' }], out: [{ filter: 'brightness(1)' }, { filter: 'brightness(.5)' }] }) },
    'zoom-in':    { label: '확대', f: () => ({ in: [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], out: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.3)' }] }) },
    'zoom-out':   { label: '축소', f: () => ({ in: [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'none' }], out: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.7)' }] }) },
    'flip':       { label: '뒤집기', f: (d) => ({ in: [{ transform: `perspective(2400px) rotateY(${-90 * d}deg)`, opacity: 0 }, { transform: `perspective(2400px) rotateY(${-90 * d}deg)`, opacity: 0, offset: .5 }, { transform: 'perspective(2400px) rotateY(0)', opacity: 1 }], out: [{ transform: 'perspective(2400px) rotateY(0)' }, { transform: `perspective(2400px) rotateY(${90 * d}deg)`, offset: .5 }, { transform: `perspective(2400px) rotateY(${90 * d}deg)`, opacity: 0 }] }) },
    'cube':       { label: '큐브', f: (d) => ({ in: [{ transformOrigin: d > 0 ? 'left center' : 'right center', transform: `perspective(2400px) translateX(${100 * d}%) rotateY(${90 * d}deg)` }, { transformOrigin: d > 0 ? 'left center' : 'right center', transform: 'perspective(2400px) translateX(0) rotateY(0)' }], out: [{ transformOrigin: d > 0 ? 'right center' : 'left center', transform: 'perspective(2400px) translateX(0) rotateY(0)' }, { transformOrigin: d > 0 ? 'right center' : 'left center', transform: `perspective(2400px) translateX(${-100 * d}%) rotateY(${-90 * d}deg)` }] }) },
    'wipe':       { label: '닦아내기', f: (d) => ({ in: [{ clipPath: d > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], out: [{ opacity: 1 }, { opacity: 1 }] }) },
    'circle':     { label: '원형', f: () => ({ in: [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], out: [{ opacity: 1 }, { opacity: 1 }] }) },
    'blinds':     { label: '수직 분할', f: () => ({ in: [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0 0 0)' }], out: [{ opacity: 1 }, { opacity: 1 }] }) },
    'blur':       { label: '블러 디졸브', f: () => ({ in: [{ opacity: 0, filter: 'blur(30px)' }, { opacity: 1, filter: 'blur(0)' }], out: [{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(30px)' }] }) },
    'rotate':     { label: '회전', f: (d) => ({ in: [{ opacity: 0, transform: `rotate(${-15 * d}deg) scale(.7)` }, { opacity: 1, transform: 'none' }], out: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `rotate(${15 * d}deg) scale(1.2)` }] }) },
  };

  /* ------------------------------------------------------------------ */
  /* 도형                                                                 */
  /* ------------------------------------------------------------------ */
  const SHAPES = {
    rect: { label: '사각형' },
    rounded: { label: '둥근 사각형', radius: 32 },
    ellipse: { label: '원/타원', radius: '50%' },
    pill: { label: '알약', radius: 9999 },
    triangle: { label: '삼각형', clip: 'polygon(50% 0,100% 100%,0 100%)' },
    'right-triangle': { label: '직각삼각형', clip: 'polygon(0 0,100% 100%,0 100%)' },
    diamond: { label: '마름모', clip: 'polygon(50% 0,100% 50%,50% 100%,0 50%)' },
    pentagon: { label: '오각형', clip: 'polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)' },
    hexagon: { label: '육각형', clip: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' },
    octagon: { label: '팔각형', clip: 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)' },
    star: { label: '별', clip: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' },
    'arrow-right': { label: '오른쪽 화살표', clip: 'polygon(0 30%,62% 30%,62% 0,100% 50%,62% 100%,62% 70%,0 70%)' },
    'arrow-left': { label: '왼쪽 화살표', clip: 'polygon(100% 30%,38% 30%,38% 0,0 50%,38% 100%,38% 70%,100% 70%)' },
    chevron: { label: '갈매기형', clip: 'polygon(0 0,75% 0,100% 50%,75% 100%,0 100%,25% 50%)' },
    parallelogram: { label: '평행사변형', clip: 'polygon(20% 0,100% 0,80% 100%,0 100%)' },
    cross: { label: '십자', clip: 'polygon(35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%,35% 35%)' },
    speech: { label: '말풍선', clip: 'polygon(0 0,100% 0,100% 75%,40% 75%,20% 100%,22% 75%,0 75%)' },
    line: { label: '선' },
  };

  /* ------------------------------------------------------------------ */
  /* 움직이는 배경 / 상호작용 / 차트 정의                                  */
  /* ------------------------------------------------------------------ */
  const BG_FX = {
    none: '없음',
    flow: '그라데이션 흐름',
    aurora: '오로라',
    particles: '연결된 입자',
    stars: '반짝이는 별',
    snow: '눈 내리기',
    bubbles: '떠오르는 방울',
    waves: '물결',
    grid: '사이버 그리드',
    shapes: '떠다니는 도형',
    petals: '꽃잎 흩날림',
    leaves: '낙엽',
    rain: '비',
    clouds: '흐르는 구름',
    fireflies: '반딧불',
    bokeh: '보케 빛망울',
    glow: '은은한 빛',
    dust: '떠오르는 빛가루',
    heartbeat: '심전도',
    dna: 'DNA 나선',
    hex: '육각 파동',
    ripple: '잔물결',
    confetti: '축하 색종이',
    fireworks: '불꽃놀이',
    matrix: '디지털 비',
    lines: '흐르는 곡선',
    dotwave: '점 물결',
  };
  // 효과 분류 (선택 목록·갤러리)
  const BG_FX_CATS = [
    ['기본', ['flow', 'aurora', 'waves', 'shapes', 'bubbles']],
    ['빛 · 예배', ['glow', 'bokeh', 'dust', 'stars']],
    ['자연 · 계절', ['snow', 'petals', 'leaves', 'rain', 'clouds', 'fireflies']],
    ['의료 · 과학', ['heartbeat', 'dna', 'hex', 'ripple', 'particles']],
    ['비즈니스 · 기술', ['lines', 'dotwave', 'grid', 'matrix']],
    ['축하 · 행사', ['confetti', 'fireworks']],
  ];
  // 고르면 함께 넣는 추천 색 [색1, 색2] (자연 효과처럼 색이 정해진 것만)
  const BG_FX_COLORS = {
    petals: ['#ffc9de', '#ffa8c5'], leaves: ['#f59f00', '#d9480f'], rain: ['#a5d8ff', '#74c0fc'], clouds: ['#ffffff', '#e7f5ff'],
    fireflies: ['#ffe066', '#fab005'], dust: ['#ffe8a3', '#ffd43b'], heartbeat: ['#51cf66', '#b2f2bb'],
    dna: ['#4dabf7', '#63e6be'], hex: ['#3bc9db', '#4dabf7'], matrix: ['#40c057', '#8ce99a'], confetti: ['#ff6b6b', '#4dabf7'], fireworks: ['#ffd43b', '#ff6b6b'],
  };
  // 없앤 효과 → 대신 쓸 효과. 'rays'(빛줄기)는 한 점에서 뻗는 방사형 빛살이 욱일기를 연상시켜 삭제함.
  // 방사형 빛살(선버스트) 배경은 다시 추가하지 않는다. 예전 파일의 값은 그릴 때 대체 효과로 바뀐다.
  const BG_FX_RETIRED = { rays: 'dust' };

  const ACTIONS = {
    none: '없음',
    next: '다음으로',
    prev: '이전으로',
    first: '첫 슬라이드',
    last: '마지막 슬라이드',
    goto: '특정 슬라이드로 이동',
    url: '웹 링크 열기',
    toggle: '요소 보이기/숨기기 전환',
    show: '요소 보이기',
    hide: '요소 숨기기',
    play: '동영상 재생/일시정지',
    answer: '퀴즈 답 (정답/오답 표시)',
  };

  const HOVERS = { none: '없음', grow: '커지기', lift: '떠오르기', glow: '밝아지기', pulse: '두근거리기', tilt: '기울기' };

  const CHART_TYPES = {
    bar: '세로 막대', hbar: '가로 막대', stacked: '누적 막대', stacked100: '100% 누적 막대', combo: '막대 + 선 혼합',
    line: '꺾은선', area: '영역', pie: '원형', donut: '도넛', radar: '방사형', gauge: '게이지', funnel: '깔때기',
  };
  const CHART_PALETTE = '#4dabf7,#ff6b6b,#51cf66,#fcc419,#845ef7,#ff922b,#20c997,#f06595';

  function chartNumbers(rows) {
    const series = rows[0].slice(1);
    const labels = rows.slice(1).map((r) => r[0]);
    const vals = rows.slice(1).map((r) => series.map((_, i) => parseFloat(String(r[i + 1] == null ? '' : r[i + 1]).replace(/[,%\s원$₩]/g, '')) || 0));
    return { series, labels, vals };
  }

  function niceNum(range, round) {
    if (range <= 0) return 1;
    const exp = Math.floor(Math.log10(range)), f = range / Math.pow(10, exp);
    let nf;
    if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * Math.pow(10, exp);
  }

  function fmtNum(v) {
    const a = Math.abs(v);
    if (a >= 1e9) return +(v / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return +(v / 1e6).toFixed(1) + 'M';
    if (a >= 1e4) return +(v / 1e3).toFixed(1) + 'K';
    return String(Math.round(v * 100) / 100);
  }

  // 점들을 지나는 부드러운 곡선 (Catmull-Rom → 베지어)
  function smoothPath(pts) {
    if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }
  const linePath = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  /*
   * 차트 렌더링 (SVG). 주요 옵션:
   *  chartType, data(CSV), fontSize, color, colors, showValues, showLegend, legendPos(top|bottom|right),
   *  showGrid, smooth, prefix, unit, yMin, yMax, xTitle, yTitle, target, targetLabel, highlight,
   *  barRadius, centerText, gaugeMax, chartAnim, chartDur
   * 막대·점·조각에는 data-k(계열|항목)를 붙여 차트 모핑에서 값 변화를 이어서 보여 준다.
   */
  function renderChart(el) {
    const W = Math.max(50, el.w), H = Math.max(50, el.h);
    const rows = csvRows(el.data);
    const fs = el.fontSize || 24, tc = el.color || '#333';
    const colors = String(el.colors || CHART_PALETTE).split(',').map((c) => c.trim()).filter(Boolean);
    const col = (i) => colors[i % colors.length];
    const type = CHART_TYPES[el.chartType] ? el.chartType : 'bar';
    const pre = el.prefix || '', unit = el.unit || '';
    const fmt = (v) => pre + fmtNum(v) + unit;
    let out = '';
    const txt = (x, y, s, o) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${((o && o.fs) || fs).toFixed ? ((o && o.fs) || fs).toFixed(1) : fs}" fill="${(o && o.fill) || tc}" text-anchor="${(o && o.anchor) || 'middle'}" dominant-baseline="${(o && o.base) || 'middle'}"${o && o.anim ? ` data-anim="label" data-i="${o.i || 0}"` : ''}${o && o.bold ? ' font-weight="700"' : ''}${o && o.op != null ? ` opacity="${o.op}"` : ''}${o && o.rot ? ` transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${esc(s)}</text>`;
    const wrap = (inner) => `<svg class="hp-chart" viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="overflow:visible">${inner}</svg>`;
    if (rows.length < 2 || rows[0].length < 2) return wrap(txt(W / 2, H / 2, '데이터를 입력하세요 (첫 행: 항목,계열1,계열2…)'));
    let { series, labels, vals } = chartNumbers(rows);
    // 강조 항목 (1부터 번호 또는 항목 이름)
    let hl = -1;
    if (el.highlight != null && el.highlight !== '') {
      const h = String(el.highlight).trim();
      hl = /^\d+$/.test(h) ? +h - 1 : labels.findIndex((l) => String(l) === h);
    }
    const dimOp = (i) => (hl >= 0 && i !== hl ? 0.28 : 1);

    const pieLike = type === 'pie' || type === 'donut' || type === 'funnel';
    const legendItems = pieLike ? labels : series;
    const legendPos = el.showLegend === false || el.legendPos === 'none' ? 'none' : (el.legendPos || 'top');
    const showLegend = legendPos !== 'none' && type !== 'gauge' && (pieLike ? type !== 'funnel' : series.length > 1);
    let top = fs * 0.6, bottomPad = 0, rightPad = 0;
    if (showLegend) {
      if (legendPos === 'right') {
        const lw = fs * 1.6 + Math.max(...legendItems.map((s) => String(s).length)) * fs * 0.62;
        rightPad = lw + fs;
        legendItems.forEach((s, i) => {
          const y = H / 2 - (legendItems.length * fs * 1.5) / 2 + i * fs * 1.5;
          out += `<rect x="${(W - lw).toFixed(1)}" y="${y.toFixed(1)}" width="${fs * 0.9}" height="${fs * 0.9}" rx="${fs * 0.2}" fill="${col(i)}"/>`;
          out += txt(W - lw + fs * 1.3, y + fs * 0.45, s, { anchor: 'start', fs: fs * 0.85 });
        });
      } else {
        let lx = 0;
        const items = legendItems.map((s, i) => { const w = fs * 1.4 + String(s).length * fs * 0.62 + fs; const it = { s, i, x: lx }; lx += w; return it; });
        const sx = Math.max(0, (W - rightPad - lx) / 2);
        const ly = legendPos === 'bottom' ? H - fs * 1.2 : fs * 0.3;
        items.forEach((it) => {
          out += `<rect x="${(sx + it.x).toFixed(1)}" y="${ly.toFixed(1)}" width="${fs * 0.9}" height="${fs * 0.9}" rx="${fs * 0.2}" fill="${col(it.i)}"/>`;
          out += txt(sx + it.x + fs * 1.3, ly + fs * 0.45, it.s, { anchor: 'start', fs: fs * 0.85 });
        });
        if (legendPos === 'bottom') bottomPad = fs * 1.8; else top = fs * 2.2;
      }
    }
    const areaW = W - rightPad, areaH = H - bottomPad;

    /* ---------- 원형 / 도넛 ---------- */
    if (type === 'pie' || type === 'donut') {
      const data = vals.map((v) => Math.max(0, v[0]));
      const total = data.reduce((a, b) => a + b, 0) || 1;
      const cx = areaW / 2, cy = top + (areaH - top) / 2, r = Math.max(10, Math.min(areaW, areaH - top) / 2 - fs * 0.6);
      const ir = type === 'donut' ? r * 0.58 : 0;
      let a0 = -Math.PI / 2;
      data.forEach((v, i) => {
        const a1 = a0 + (v / total) * Math.PI * 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const p = (a, rr) => `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
        const off = i === hl ? fs * 0.6 : 0; // 강조 조각은 살짝 빼냄
        const ox = Math.cos((a0 + a1) / 2) * off, oy = Math.sin((a0 + a1) / 2) * off;
        let d;
        if (v / total >= 0.9999) d = ir ? `M${p(0, r)} A${r} ${r} 0 1 1 ${p(Math.PI, r)} A${r} ${r} 0 1 1 ${p(0, r)} M${p(0, ir)} A${ir} ${ir} 0 1 0 ${p(Math.PI, ir)} A${ir} ${ir} 0 1 0 ${p(0, ir)}Z` : `M${p(0, r)} A${r} ${r} 0 1 1 ${p(Math.PI, r)} A${r} ${r} 0 1 1 ${p(0, r)}Z`;
        else if (ir) d = `M${p(a0, r)} A${r} ${r} 0 ${large} 1 ${p(a1, r)} L${p(a1, ir)} A${ir} ${ir} 0 ${large} 0 ${p(a0, ir)}Z`;
        else d = `M${cx} ${cy} L${p(a0, r)} A${r} ${r} 0 ${large} 1 ${p(a1, r)}Z`;
        out += `<path d="${d}" fill="${col(i)}" stroke="${el.sliceStroke || 'rgba(255,255,255,.9)'}" stroke-width="${Math.max(1, fs * 0.08)}" data-anim="slice" data-i="${i}" data-k="s|${esc(labels[i])}" data-cx="${cx}" data-cy="${cy}"${off ? ` transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)})"` : ''} opacity="${dimOp(i)}"/>`;
        if (el.showValues !== false && v / total > 0.035) {
          const am = (a0 + a1) / 2, lr = ir ? (r + ir) / 2 : r * 0.62;
          out += txt(cx + ox + Math.cos(am) * lr, cy + oy + Math.sin(am) * lr, Math.round((v / total) * 100) + '%', { fill: '#fff', bold: true, fs: fs * 0.9, anim: true, i });
        }
        a0 = a1;
      });
      if (ir && el.centerText) out += txt(cx, cy, el.centerText, { fs: fs * 1.6, bold: true });
      return wrap(out);
    }

    /* ---------- 게이지 (첫 값 / 최댓값) ---------- */
    if (type === 'gauge') {
      const v = vals[0][0], max = +el.gaugeMax || 100;
      const frac = Math.max(0, Math.min(1, v / max));
      const cx = areaW / 2, r = Math.max(10, Math.min(areaW / 2, (areaH - top) * 0.85) - fs);
      const cy = top + r + fs * 0.5;
      const sw = Math.max(8, r * 0.22);
      const arc = `M${(cx - r).toFixed(1)} ${cy.toFixed(1)} A${r} ${r} 0 0 1 ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`;
      out += `<path d="${arc}" fill="none" stroke="${tc}" stroke-opacity=".12" stroke-width="${sw}" stroke-linecap="round"/>`;
      out += `<path d="${arc}" fill="none" stroke="${col(0)}" stroke-width="${sw}" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - frac).toFixed(4)}" data-anim="gauge" data-off="${(1 - frac).toFixed(4)}" data-k="g|0"/>`;
      if (el.target != null && el.target !== '') {
        const ta = Math.PI * (1 - Math.max(0, Math.min(1, +el.target / max)));
        const x1 = cx + Math.cos(ta) * (r - sw * 0.75), y1 = cy - Math.sin(ta) * (r - sw * 0.75), x2 = cx + Math.cos(ta) * (r + sw * 0.75), y2 = cy - Math.sin(ta) * (r + sw * 0.75);
        out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${tc}" stroke-width="${Math.max(2, fs / 8)}"/>`;
      }
      out += txt(cx, cy - r * 0.28, el.centerText || fmt(v), { fs: Math.min(fs * 2.6, r * 0.55), bold: true, anim: true, i: 0 });
      out += txt(cx, cy + fs * 0.3, labels[0] || '', { fs: fs * 0.95, op: 0.8 });
      out += txt(cx - r, cy + fs * 1.1, fmt(0), { fs: fs * 0.75, op: 0.6 });
      out += txt(cx + r, cy + fs * 1.1, fmt(max), { fs: fs * 0.75, op: 0.6 });
      return wrap(out);
    }

    /* ---------- 깔때기 ---------- */
    if (type === 'funnel') {
      const data = vals.map((v) => Math.max(0, v[0]));
      const max = Math.max(...data) || 1;
      const n = data.length, gap = fs * 0.3;
      const bh = (areaH - top - gap * (n - 1)) / n;
      const cx = areaW / 2, maxW = areaW * 0.9;
      data.forEach((v, i) => {
        const w0 = maxW * (v / max), w1 = maxW * ((i < n - 1 ? data[i + 1] : v * 0.8) / max);
        const y = top + i * (bh + gap);
        const pts = `${(cx - w0 / 2).toFixed(1)},${y.toFixed(1)} ${(cx + w0 / 2).toFixed(1)},${y.toFixed(1)} ${(cx + Math.max(w1, w0 * 0.5) / 2).toFixed(1)},${(y + bh).toFixed(1)} ${(cx - Math.max(w1, w0 * 0.5) / 2).toFixed(1)},${(y + bh).toFixed(1)}`;
        out += `<polygon points="${pts}" fill="${col(i)}" data-anim="funnel" data-i="${i}" data-k="f|${esc(labels[i])}" opacity="${dimOp(i)}"/>`;
        out += txt(cx, y + bh / 2, labels[i] + (el.showValues !== false ? '  ' + fmt(vals[i][0]) : ''), { fs: Math.min(fs, bh * 0.5), fill: '#fff', bold: true, anim: true, i });
      });
      return wrap(out);
    }

    /* ---------- 방사형 ---------- */
    if (type === 'radar') {
      const n = labels.length;
      const cx = areaW / 2, cy = top + (areaH - top) / 2, r = Math.max(10, Math.min(areaW, areaH - top) / 2 - fs * 2.2);
      const max = el.yMax !== '' && el.yMax != null ? +el.yMax : niceNum(Math.max(1, ...[].concat(...vals)), true) * (Math.max(1, ...[].concat(...vals)) > niceNum(Math.max(1, ...[].concat(...vals)), true) ? 2 : 1);
      const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
      const pt = (i, f) => [cx + Math.cos(ang(i)) * r * f, cy + Math.sin(ang(i)) * r * f];
      for (let k = 1; k <= 4; k++) out += `<polygon points="${labels.map((_, i) => pt(i, k / 4).map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${tc}" stroke-opacity=".15" stroke-width="${Math.max(1, fs / 16)}"/>`;
      labels.forEach((lab, i) => {
        const [x, y] = pt(i, 1);
        out += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${tc}" stroke-opacity=".15"/>`;
        const [lx, ly] = pt(i, 1.13);
        out += txt(lx, ly, lab, { fs: fs * 0.85, anchor: Math.abs(lx - cx) < fs ? 'middle' : lx > cx ? 'start' : 'end', op: dimOp(i) === 1 ? 1 : 0.5, bold: i === hl });
      });
      series.forEach((s, si) => {
        const pts = labels.map((_, i) => pt(i, Math.max(0, vals[i][si]) / (max || 1)));
        out += `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${col(si)}" fill-opacity=".22" stroke="${col(si)}" stroke-width="${Math.max(2, fs * 0.14)}" stroke-linejoin="round" data-anim="radar" data-i="${si}" data-cx="${cx}" data-cy="${cy}" data-k="r|${si}"/>`;
        pts.forEach((p, i) => { out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${Math.max(3, fs * 0.22)}" fill="${col(si)}" data-anim="dot" data-i="${i}" data-n="${pts.length}" data-k="d|${si}|${esc(labels[i])}"/>`; });
      });
      return wrap(out);
    }

    /* ---------- 축이 있는 차트: 막대 / 가로 막대 / 누적 / 100% 누적 / 꺾은선 / 영역 / 혼합 ---------- */
    const horiz = type === 'hbar';
    const stacked = type === 'stacked' || type === 'stacked100';
    if (type === 'stacked100') {
      vals = vals.map((r) => { const t = r.reduce((a, b) => a + Math.max(0, b), 0) || 1; return r.map((v) => (Math.max(0, v) / t) * 100); });
    }
    const fmtV = type === 'stacked100' ? (v) => Math.round(v) + '%' : fmt;
    const flat = [].concat(...vals);
    let maxV = stacked ? Math.max(0, ...vals.map((r) => r.reduce((a, b) => a + Math.max(0, b), 0))) : Math.max(0, ...flat);
    let minV = Math.min(0, ...flat);
    if (el.target != null && el.target !== '' && !isNaN(+el.target)) maxV = Math.max(maxV, +el.target);
    const step = niceNum(niceNum(maxV - minV, false) / 5, true);
    maxV = Math.ceil(maxV / step) * step || step;
    minV = Math.floor(minV / step) * step;
    if (type === 'stacked100') { maxV = 100; minV = 0; }
    if (el.yMax !== '' && el.yMax != null && !isNaN(+el.yMax)) maxV = +el.yMax;
    if (el.yMin !== '' && el.yMin != null && !isNaN(+el.yMin)) minV = +el.yMin;
    const tickStep = type === 'stacked100' ? 20 : step;
    const tickLabels = [];
    for (let v = minV; v <= maxV + tickStep / 2; v += tickStep) tickLabels.push(v);
    const yTitleW = el.yTitle ? fs * 1.4 : 0;
    const xTitleH = el.xTitle ? fs * 1.5 : 0;
    const labW = horiz
      ? Math.min(areaW * 0.3, fs * 0.62 * Math.max(...labels.map((l) => String(l).length)) + fs)
      : fs * 0.62 * Math.max(...tickLabels.map((v) => fmtV(v).length)) + fs * 0.8;
    const left = labW + yTitleW, right = fs * 0.8 + (el.target != null && el.target !== '' && !horiz ? fs * 3 : 0), bottom = (horiz ? fs * 1.6 : fs * 2.0) + xTitleH;
    const pw = areaW - left - right, ph = areaH - top - bottom;
    const scale = (v) => (Math.max(minV, Math.min(maxV, v)) - minV) / (maxV - minV || 1);
    const grid = el.showGrid !== false;
    tickLabels.forEach((v) => {
      if (horiz) {
        const x = left + scale(v) * pw;
        if (grid) out += `<line x1="${x.toFixed(1)}" y1="${top}" x2="${x.toFixed(1)}" y2="${top + ph}" stroke="${tc}" stroke-opacity=".15" stroke-width="${Math.max(1, fs / 16)}"/>`;
        out += txt(x, top + ph + fs * 0.9, fmtV(v), { fs: fs * 0.8 });
      } else {
        const y = top + ph - scale(v) * ph;
        if (grid) out += `<line x1="${left}" y1="${y.toFixed(1)}" x2="${left + pw}" y2="${y.toFixed(1)}" stroke="${tc}" stroke-opacity=".15" stroke-width="${Math.max(1, fs / 16)}"/>`;
        out += txt(left - fs * 0.4, y, fmtV(v), { anchor: 'end', fs: fs * 0.8 });
      }
    });
    if (el.yTitle) out += txt(fs * 0.6, top + ph / 2, el.yTitle, { fs: fs * 0.85, rot: -90, op: 0.8 });
    if (el.xTitle) out += txt(left + pw / 2, areaH - fs * 0.6, el.xTitle, { fs: fs * 0.85, op: 0.8 });
    const n = labels.length, gw = (horiz ? ph : pw) / n;
    const zero = horiz ? left + scale(0) * pw : top + ph - scale(0) * ph;
    const rad = el.barRadius != null && el.barRadius !== '' ? +el.barRadius : Math.round(fs * 0.25);
    labels.forEach((lab, i) => {
      const o = { fs: fs * 0.85, op: dimOp(i) === 1 ? 1 : 0.55, bold: i === hl };
      if (horiz) out += txt(left - fs * 0.4, top + gw * (i + 0.5), lab, Object.assign({ anchor: 'end' }, o));
      else out += txt(left + gw * (i + 0.5), top + ph + fs * 0.9, lab, o);
    });
    const barSeries = type === 'combo' ? [0] : (type === 'line' || type === 'area') ? [] : series.map((_, i) => i);
    const lineSeries = type === 'combo' ? series.map((_, i) => i).slice(1) : (type === 'line' || type === 'area') ? series.map((_, i) => i) : [];
    // 막대
    labels.forEach((lab, i) => {
      let acc = 0;
      barSeries.forEach((si, bi) => {
        const v = vals[i][si];
        const nb = barSeries.length;
        const bw = stacked ? gw * 0.6 : (gw * 0.72) / nb;
        const off = stacked ? gw * 0.2 : gw * 0.14 + bw * bi;
        let a, b;
        if (stacked) { a = scale(acc); acc += Math.max(0, v); b = scale(acc); } else { a = scale(0); b = scale(v); }
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const neg = !stacked && v < 0;
        const k = `b|${si}|${esc(lab)}`;
        if (horiz) {
          const x = left + lo * pw, w = (hi - lo) * pw, y = top + gw * i + off;
          out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${bw.toFixed(1)}" rx="${Math.min(rad, bw / 2)}" fill="${col(si)}" data-anim="hbar" data-i="${i}" data-k="${k}"${neg ? ' data-neg="1"' : ''} opacity="${dimOp(i)}"/>`;
          if (el.showValues !== false) out += txt(neg ? x - fs * 0.3 : x + w + fs * 0.3, y + bw / 2, fmtV(v), { anchor: neg ? 'end' : 'start', fs: fs * 0.8, anim: true, i, bold: true, op: dimOp(i) });
        } else {
          const x = left + gw * i + off, y = top + ph - hi * ph, h = (hi - lo) * ph;
          out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${Math.min(rad, bw / 2)}" fill="${col(si)}" data-anim="bar" data-i="${i}" data-k="${k}"${neg ? ' data-neg="1"' : ''} opacity="${dimOp(i)}"/>`;
          if (el.showValues !== false) {
            if (stacked) { if (h > fs * 1.1) out += txt(x + bw / 2, y + h / 2, fmtV(v), { fs: fs * 0.75, anim: true, i, fill: '#fff', bold: true }); }
            else out += txt(x + bw / 2, neg ? y + h + fs * 0.7 : y - fs * 0.6, fmtV(v), { fs: fs * 0.8, anim: true, i, bold: true, op: dimOp(i) });
          }
        }
      });
    });
    // 선 / 영역
    lineSeries.forEach((si) => {
      const pts = vals.map((r, i) => [left + gw * (i + 0.5), top + ph - scale(r[si]) * ph]);
      const d = el.smooth ? smoothPath(pts) : linePath(pts);
      const c = col(si);
      if (type === 'area') out += `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${zero.toFixed(1)} L${pts[0][0].toFixed(1)} ${zero.toFixed(1)}Z" fill="${c}" fill-opacity=".25" data-anim="area" data-i="${si}" data-k="a|${si}"/>`;
      out += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${Math.max(2, fs * 0.18)}" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" data-anim="line" data-i="${si}" data-k="l|${si}"/>`;
      pts.forEach((p, i) => {
        out += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${Math.max(3, fs * (i === hl ? 0.42 : 0.28))}" fill="#fff" stroke="${c}" stroke-width="${Math.max(2, fs * 0.14)}" data-anim="dot" data-i="${i}" data-n="${pts.length}" data-k="d|${si}|${esc(labels[i])}" opacity="${dimOp(i) === 1 ? 1 : 0.5}"/>`;
        if (el.showValues !== false) out += txt(p[0], p[1] - fs * 0.85, fmtV(vals[i][si]), { fs: fs * 0.8, bold: true, fill: c, op: dimOp(i) }).replace('<text ', `<text data-anim="plabel" data-i="${i}" data-n="${pts.length}" `);
      });
    });
    // 기준선
    out += horiz
      ? `<line x1="${zero.toFixed(1)}" y1="${top}" x2="${zero.toFixed(1)}" y2="${top + ph}" stroke="${tc}" stroke-opacity=".5" stroke-width="${Math.max(1, fs / 12)}"/>`
      : `<line x1="${left}" y1="${zero.toFixed(1)}" x2="${left + pw}" y2="${zero.toFixed(1)}" stroke="${tc}" stroke-opacity=".5" stroke-width="${Math.max(1, fs / 12)}"/>`;
    // 목표선
    if (el.target != null && el.target !== '' && !isNaN(+el.target)) {
      const tv = +el.target, lab = (el.targetLabel || '목표') + ' ' + fmtV(tv);
      const tcol = el.targetColor || '#e03131';
      if (horiz) {
        const x = left + scale(tv) * pw;
        out += `<line x1="${x.toFixed(1)}" y1="${top - fs * 0.3}" x2="${x.toFixed(1)}" y2="${top + ph}" stroke="${tcol}" stroke-width="${Math.max(2, fs / 9)}" stroke-dasharray="${fs * 0.5} ${fs * 0.35}" data-anim="label" data-i="0"/>`;
        out += txt(x, top - fs * 0.7, lab, { fs: fs * 0.8, fill: tcol, bold: true, anim: true, i: 0 });
      } else {
        const y = top + ph - scale(tv) * ph;
        out += `<line x1="${left}" y1="${y.toFixed(1)}" x2="${(left + pw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${tcol}" stroke-width="${Math.max(2, fs / 9)}" stroke-dasharray="${fs * 0.5} ${fs * 0.35}" data-anim="label" data-i="0"/>`;
        out += txt(left + pw + fs * 0.3, y, lab, { fs: fs * 0.75, fill: tcol, bold: true, anchor: 'start', anim: true, i: 0 });
      }
    }
    return wrap(out);
  }

  // 차트 그리기 애니메이션 (wrapper: .hp-el)
  function animateChart(w, delay, dur) {
    const svg = w && w.querySelector('svg.hp-chart');
    if (!svg) return;
    delay = delay || 0;
    const D = dur || 1400;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    svg.querySelectorAll('[data-anim]').forEach((n) => {
      n.getAnimations().forEach((a) => a.cancel());
      const k = n.dataset.anim, i = +n.dataset.i || 0;
      let kf, o = { duration: D * 0.55, delay: delay + i * D * 0.07, easing: ease, fill: 'backwards' };
      if (k === 'bar' || k === 'hbar') {
        n.style.transformBox = 'fill-box';
        n.style.transformOrigin = k === 'bar' ? (n.dataset.neg ? '50% 0%' : '50% 100%') : (n.dataset.neg ? '100% 50%' : '0% 50%');
        kf = k === 'bar' ? [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }];
      } else if (k === 'line') { kf = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }]; o = { duration: D, delay, easing: 'linear', fill: 'backwards' }; }
      else if (k === 'gauge') { kf = [{ strokeDashoffset: 1 }, { strokeDashoffset: +n.dataset.off }]; o = { duration: D, delay, easing: ease, fill: 'backwards' }; }
      else if (k === 'area') { kf = [{ opacity: 0 }, { opacity: 1 }]; o = { duration: D * 0.6, delay: delay + D * 0.5, fill: 'backwards' }; }
      else if (k === 'dot' || k === 'plabel') { const at = delay + (i / Math.max(1, (+n.dataset.n || 1) - 1)) * D * 0.92 + (k === 'plabel' ? 150 : 0); if (k === 'dot') { n.style.transformBox = 'fill-box'; n.style.transformOrigin = '50% 50%'; kf = [{ transform: 'scale(0)' }, { transform: 'scale(1.4)', offset: 0.7 }, { transform: 'scale(1)' }]; } else kf = [{ opacity: 0 }, { opacity: 1 }]; o = { duration: 350, delay: at, fill: 'backwards' }; }
      else if (k === 'slice' || k === 'radar') { n.style.transformOrigin = `${n.dataset.cx}px ${n.dataset.cy}px`; kf = k === 'slice' ? [{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: n.getAttribute('transform') ? 'scale(1) rotate(0)' : 'scale(1) rotate(0)', opacity: +(n.getAttribute('opacity') || 1) }] : [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]; o = { duration: D * 0.55, delay: delay + i * D * 0.12, easing: ease, fill: 'backwards' }; }
      else if (k === 'funnel') { n.style.transformBox = 'fill-box'; n.style.transformOrigin = '50% 50%'; kf = [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: +(n.getAttribute('opacity') || 1) }]; o = { duration: D * 0.45, delay: delay + i * D * 0.1, easing: ease, fill: 'backwards' }; }
      else if (k === 'label') { kf = [{ opacity: 0 }, { opacity: +(n.getAttribute('opacity') || 1) }]; o = { duration: 300, delay: delay + D * 0.55 + i * D * 0.07, fill: 'backwards' }; }
      if (kf) n.animate(kf, o);
    });
  }

  // 차트 모핑: 같은 차트(같은 키)의 값이 바뀌면 막대·점·선·조각을 새 값으로 이어서 움직인다
  function morphChartMarks(oSvg, nSvg, opt, anims) {
    const olds = new Map(Array.from(oSvg.querySelectorAll('[data-k]')).map((x) => [x.dataset.k, x]));
    nSvg.querySelectorAll('[data-k]').forEach((n) => {
      const o = olds.get(n.dataset.k);
      if (!o || o.tagName !== n.tagName) {
        anims.push(n.animate([{ opacity: 0 }, { opacity: +(n.getAttribute('opacity') || 1) }], { duration: opt.duration * 0.5, delay: opt.duration * 0.5, fill: 'backwards' }));
        return;
      }
      const tag = n.tagName.toLowerCase();
      const px = (el, a) => (parseFloat(el.getAttribute(a)) || 0) + 'px';
      let from, to;
      if (tag === 'rect') { from = { x: px(o, 'x'), y: px(o, 'y'), width: px(o, 'width'), height: px(o, 'height') }; to = { x: px(n, 'x'), y: px(n, 'y'), width: px(n, 'width'), height: px(n, 'height') }; }
      else if (tag === 'circle') { from = { cx: px(o, 'cx'), cy: px(o, 'cy'), r: px(o, 'r') }; to = { cx: px(n, 'cx'), cy: px(n, 'cy'), r: px(n, 'r') }; }
      else if (tag === 'path') { from = { d: `path("${o.getAttribute('d')}")` }; to = { d: `path("${n.getAttribute('d')}")` }; if (n.dataset.anim === 'gauge') { from.strokeDashoffset = o.dataset.off; to.strokeDashoffset = n.dataset.off; } }
      else if (tag === 'polygon') { anims.push(n.animate([{ opacity: 0.2 }, { opacity: +(n.getAttribute('opacity') || 1) }], opt)); return; }
      if (!from) return;
      from.fill = o.getAttribute('fill'); to.fill = n.getAttribute('fill');
      from.opacity = +(o.getAttribute('opacity') || 1); to.opacity = +(n.getAttribute('opacity') || 1);
      try { anims.push(n.animate([from, to], opt)); } catch (e) { /* 보간 불가 → 그대로 */ }
    });
    // 값 글자는 새 위치에서 나타남
    nSvg.querySelectorAll('text[data-anim]').forEach((t) => anims.push(t.animate([{ opacity: 0 }, { opacity: +(t.getAttribute('opacity') || 1) }], { duration: opt.duration * 0.4, delay: opt.duration * 0.6, fill: 'backwards' })));
  }

  // 숫자 카운트업 (node: .hp-anim)
  function countUp(node, dur, delay) {
    const tc = node.querySelector('.hp-tc');
    if (!tc) return;
    if (node._countStop) node._countStop();
    const walker = document.createTreeWalker(tc, NodeFilter.SHOW_TEXT);
    const items = [];
    let t;
    while ((t = walker.nextNode())) if (/\d/.test(t.nodeValue)) items.push({ t, orig: t.nodeValue });
    if (!items.length) return;
    const re = /\d[\d,]*(?:\.\d+)?/g;
    const t0 = performance.now() + (delay || 0);
    let raf, done = false;
    const render = (e) => items.forEach((it) => {
      it.t.nodeValue = it.orig.replace(re, (m) => {
        const dec = (m.split('.')[1] || '').length;
        const v = parseFloat(m.replace(/,/g, '')) * e;
        return m.includes(',') ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
      });
    });
    const stop = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      items.forEach((it) => { it.t.nodeValue = it.orig; });
      node._countStop = null;
    };
    const frame = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      render(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(frame); else stop();
    };
    node._countStop = stop;
    render(0);
    raf = requestAnimationFrame(frame);
  }

  /* 움직이는 배경 렌더링 */
  function renderFx(bg, deck, mode, slideEl) {
    const fx = bg.fx;
    const c1 = bg.fxColor || '#ffffff', c2 = bg.fxColor2 || '#ff6ec7';
    const speed = +bg.fxSpeed || 1;
    const W = deck.width, H = deck.height;
    slideEl.style.setProperty('--fxs', speed);
    if (fx === 'flow') {
      slideEl.classList.add('hp-fx-flow');
      const base = bg.color || '#1b2a4a';
      slideEl.style.background = bg.fxColor || bg.fxColor2 || bg.type !== 'gradient' ? `linear-gradient(-45deg, ${base}, ${c2}, ${c1}, ${base})` : bg.gradient;
      return null;
    }
    const d = document.createElement('div');
    d.className = 'hp-bgfx hp-fx-' + fx;
    d.style.setProperty('--fxc', c1);
    d.style.setProperty('--fxc2', c2);
    const rnd = mulberry(bg.fxSeed || 7);
    if (fx === 'aurora') {
      [[c1, '-10%', '-20%', 1], [c2, '50%', '10%', 2], [c1, '20%', '50%', 3], [c2, '70%', '-30%', 1]].forEach(([c, l, t2, k]) => {
        const b = document.createElement('i');
        b.className = 'hp-blob hp-drift' + k;
        Object.assign(b.style, { left: l, top: t2, width: W * 0.7 + 'px', height: W * 0.7 + 'px', background: `radial-gradient(circle, ${c} 0%, transparent 65%)` });
        d.appendChild(b);
      });
    } else if (fx === 'bubbles') {
      for (let i = 0; i < 22; i++) {
        const b = document.createElement('i');
        const s = 20 + rnd() * 90;
        b.className = 'hp-bubble';
        Object.assign(b.style, { left: rnd() * 100 + '%', width: s + 'px', height: s + 'px', animationDuration: `${(8 + rnd() * 10) / speed}s, ${2 + rnd() * 3}s`, animationDelay: `${-rnd() * 18}s, ${-rnd() * 3}s` });
        d.appendChild(b);
      }
    } else if (fx === 'waves') {
      [[0.35, 14, 0], [0.25, 10, 1], [0.18, 20, 2]].forEach(([op, s, i]) => {
        d.insertAdjacentHTML('beforeend', `<svg class="hp-wave" viewBox="0 0 1440 200" preserveAspectRatio="none" style="height:${18 + i * 7}%;opacity:${op};animation-duration:${s / speed}s;bottom:${-i * 2}%"><path d="M0 100 C 180 30, 540 170, 720 100 C 900 30, 1260 170, 1440 100 L1440 200 L0 200 Z" fill="${i === 1 ? c2 : c1}"/></svg>`);
      });
    } else if (fx === 'grid') {
      d.innerHTML = '<i class="hp-gridfloor"></i><i class="hp-gridglow"></i>';
    } else if (fx === 'shapes') {
      const kinds = ['circle', 'square', 'triangle', 'ring', 'plus'];
      for (let i = 0; i < 14; i++) {
        const b = document.createElement('i');
        const s = 30 + rnd() * 90;
        b.className = 'hp-floaty hp-sh-' + kinds[i % kinds.length];
        Object.assign(b.style, { left: rnd() * 95 + '%', top: rnd() * 90 + '%', width: s + 'px', height: s + 'px', color: i % 2 ? c2 : c1, animationDuration: (10 + rnd() * 14) / speed + 's', animationDelay: -rnd() * 20 + 's' });
        d.appendChild(b);
      }
    } else if (fx === 'particles' || fx === 'stars' || fx === 'snow') {
      d.appendChild(canvasFx(fx, W, H, c1, speed, mode !== 'thumb', mode === 'present' ? 1 : mode === 'edit' ? 0.5 : 0.15, rnd));
    } else if (FX2[fx]) {
      d.appendChild(canvasFx2(fx, W, H, c1, c2, speed, mode !== 'thumb', mode === 'present' ? 1 : mode === 'edit' ? 0.5 : mode === 'gallery' ? 0.2 : 0.15, rnd));
    }
    return d;
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvasFx(kind, W, H, color, speed, animate, q, rnd) {
    const c = document.createElement('canvas');
    c.className = 'hp-fxcanvas';
    c.width = Math.max(1, Math.round(W * q));
    c.height = Math.max(1, Math.round(H * q));
    const ctx = c.getContext('2d');
    ctx.scale(q, q);
    const N = kind === 'particles' ? Math.round((W * H) / 24000) : kind === 'snow' ? Math.round((W * H) / 9000) : Math.round((W * H) / 6000);
    const ps = Array.from({ length: N }, () => ({
      x: rnd() * W, y: rnd() * H,
      vx: (rnd() - 0.5) * 0.7, vy: kind === 'snow' ? 0.6 + rnd() * 1.4 : (rnd() - 0.5) * 0.7,
      r: kind === 'snow' ? 1.5 + rnd() * 4.5 : kind === 'stars' ? 0.6 + rnd() * 2.4 : 2 + rnd() * 2.5,
      p: rnd() * Math.PI * 2,
    }));
    const link = 170;
    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      if (kind === 'particles') {
        ps.forEach((p) => {
          if (animate) { p.x += p.vx * speed; p.y += p.vy * speed; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
        });
        ctx.lineWidth = 1.2;
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y, dd = dx * dx + dy * dy;
            if (dd < link * link) {
              ctx.globalAlpha = (1 - Math.sqrt(dd) / link) * 0.5;
              ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y); ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 0.85;
        ps.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
      } else if (kind === 'snow') {
        ps.forEach((p) => {
          if (animate) { p.y += p.vy * speed; p.x += Math.sin(t / 900 + p.p) * 0.5 * speed; if (p.y > H + 10) { p.y = -10; p.x = rnd() * W; } }
          ctx.globalAlpha = 0.35 + (p.r / 6) * 0.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
        });
      } else {
        ps.forEach((p) => {
          ctx.globalAlpha = 0.2 + 0.8 * Math.abs(Math.sin((t / 800) * speed + p.p));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
          if (p.r > 2.2) { ctx.globalAlpha *= 0.35; ctx.fillRect(p.x - p.r * 3, p.y - 0.5, p.r * 6, 1); ctx.fillRect(p.x - 0.5, p.y - p.r * 3, 1, p.r * 6); }
        });
      }
      ctx.globalAlpha = 1;
    };
    draw(1000);
    if (animate) {
      const born = performance.now();
      const loop = (t) => {
        if (!c.isConnected) { if (c._started || t - born > 3000) return; }
        else c._started = true;
        if (c.isConnected) draw(t);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    return c;
  }


  /* 추가 배경 효과 (캔버스) — 시간 t 만으로 그려서 썸네일도 같은 모습 */
  const FX_PALETTE = ['#ffd43b', '#69db7c', '#4dabf7', '#f783ac', '#ff922b', '#b197fc'];
  function fxRgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return 'rgba(255,255,255,' + a + ')';
    const n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  const wrapN = (v, m) => ((v % m) + m) % m;
  const hash1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const FX2 = {
    petals: {
      init: (W, H, r) => Array.from({ length: Math.round(W * H / 52000) }, () => ({ x: r() * W, y: r() * H, s: 10 + r() * 14, v: 45 + r() * 50, a: 50 + r() * 110, p: r() * 6.3, rs: 0.6 + r() * 1.6, c: r() < 0.5 })),
      draw(ctx, W, H, T, ps, c1, c2) {
        ps.forEach((p) => {
          const y = wrapN(p.y + p.v * T, H + 80) - 40;
          const x = wrapN(p.x + Math.sin(T * 0.7 + p.p) * p.a + T * 25, W + 80) - 40;
          ctx.save(); ctx.translate(x, y); ctx.rotate(T * p.rs * 0.6 + p.p); ctx.scale(Math.cos(T * p.rs + p.p), 1);
          ctx.globalAlpha = 0.85; ctx.fillStyle = p.c ? c1 : c2;
          ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.6, p.s * 0.7, 0, p.s); ctx.bezierCurveTo(-p.s * 0.6, p.s * 0.7, -p.s * 0.9, -p.s * 0.6, 0, -p.s); ctx.fill();
          ctx.restore();
        });
      },
    },
    leaves: {
      init: (W, H, r) => Array.from({ length: Math.round(W * H / 80000) }, () => ({ x: r() * W, y: r() * H, s: 18 + r() * 18, v: 40 + r() * 40, a: 60 + r() * 120, p: r() * 6.3, rs: 0.5 + r() * 1.2, c: r() })),
      draw(ctx, W, H, T, ps, c1, c2) {
        ps.forEach((p) => {
          const y = wrapN(p.y + p.v * T, H + 100) - 50;
          const x = wrapN(p.x + Math.sin(T * 0.6 + p.p) * p.a - T * 20, W + 100) - 50;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * p.rs + p.p) * 1.2 + p.p); ctx.scale(1, Math.cos(T * p.rs * 0.8 + p.p) * 0.6 + 0.4);
          ctx.globalAlpha = 0.85; ctx.fillStyle = p.c < 0.45 ? c1 : p.c < 0.85 ? c2 : '#e8590c';
          ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.quadraticCurveTo(0, -p.s * 0.75, p.s, 0); ctx.quadraticCurveTo(0, p.s * 0.75, -p.s, 0); ctx.fill();
          ctx.globalAlpha = 0.35; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-p.s * 1.15, 0); ctx.lineTo(p.s * 0.85, 0); ctx.stroke();
          ctx.restore();
        });
      },
    },
    rain: {
      init: (W, H, r) => Array.from({ length: Math.round(W * H / 7000) }, () => ({ x: r() * W, y: r() * H, l: 18 + r() * 30, v: 900 + r() * 600, a: 0.15 + r() * 0.3 })),
      draw(ctx, W, H, T, ps, c1) {
        ctx.strokeStyle = c1; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ps.forEach((p) => {
          const y = wrapN(p.y + p.v * T, H + 60) - 30, x = wrapN(p.x - y * 0.18, W);
          ctx.globalAlpha = p.a; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.l * 0.18, y + p.l); ctx.stroke();
        });
      },
    },
    clouds: {
      init: (W, H, r) => Array.from({ length: 7 }, (_, i) => ({ x: r() * W, y: H * (0.05 + r() * 0.6), s: 90 + r() * 110, v: 12 + r() * 22, a: 0.25 + r() * 0.35, puffs: Array.from({ length: 6 }, () => [(r() - 0.5) * 2.6, (r() - 0.5) * 0.6, 0.55 + r() * 0.6]) })),
      draw(ctx, W, H, T, ps, c1) {
        ps.forEach((c) => {
          const x = wrapN(c.x + c.v * T, W + c.s * 5) - c.s * 2.5;
          c.puffs.forEach(([dx, dy, k]) => {
            const px = x + dx * c.s, py = c.y + dy * c.s, rr = c.s * k;
            const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
            g.addColorStop(0, fxRgba(c1, c.a)); g.addColorStop(0.6, fxRgba(c1, c.a * 0.6)); g.addColorStop(1, fxRgba(c1, 0));
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill();
          });
        });
      },
    },
    fireflies: {
      init: (W, H, r) => Array.from({ length: Math.round(W * H / 45000) }, () => ({ x: r() * W, y: r() * H, a: 40 + r() * 120, b: 30 + r() * 90, f1: 0.1 + r() * 0.25, f2: 0.1 + r() * 0.3, p: r() * 6.3, fl: 0.6 + r() * 1.4 })),
      draw(ctx, W, H, T, ps, c1) {
        ctx.globalCompositeOperation = 'lighter';
        ps.forEach((p) => {
          const x = p.x + Math.sin(T * p.f1 + p.p) * p.a, y = p.y + Math.cos(T * p.f2 + p.p * 1.3) * p.b;
          const k = Math.pow(Math.max(0, Math.sin(T * p.fl + p.p)), 2);
          const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
          g.addColorStop(0, fxRgba(c1, 0.25 + 0.75 * k)); g.addColorStop(0.15, fxRgba(c1, 0.35 * k + 0.08)); g.addColorStop(1, fxRgba(c1, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    bokeh: {
      init: (W, H, r) => Array.from({ length: 28 }, () => ({ x: r() * W, y: r() * H, s: 30 + r() * 120, v: 8 + r() * 22, a: 0.1 + r() * 0.22, p: r() * 6.3, c: r() < 0.5 })),
      draw(ctx, W, H, T, ps, c1, c2) {
        ctx.globalCompositeOperation = 'lighter';
        ps.forEach((p) => {
          const x = p.x + Math.sin(T * 0.12 + p.p) * 70, y = wrapN(p.y - p.v * T, H + p.s * 2) - p.s;
          const al = p.a * (0.7 + 0.3 * Math.sin(T * 0.5 + p.p)), col = p.c ? c1 : c2;
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.s);
          g.addColorStop(0, fxRgba(col, al * 0.7)); g.addColorStop(0.85, fxRgba(col, al)); g.addColorStop(1, fxRgba(col, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    glow: {
      init: (W, H, r) => [0, 1, 2].map((i) => ({ p: r() * 6.3, f: 0.12 + r() * 0.1, rx: W * (0.15 + r() * 0.2), ry: H * (0.1 + r() * 0.15), cx: W * (0.3 + i * 0.2), cy: H * (0.35 + r() * 0.3) })),
      draw(ctx, W, H, T, ps, c1, c2) {
        ctx.globalCompositeOperation = 'lighter';
        ps.forEach((p, i) => {
          const x = p.cx + Math.cos(T * p.f + p.p) * p.rx, y = p.cy + Math.sin(T * p.f * 1.3 + p.p) * p.ry;
          const s = Math.max(W, H) * (0.32 + 0.08 * Math.sin(T * 0.6 + p.p));
          const g = ctx.createRadialGradient(x, y, 0, x, y, s);
          g.addColorStop(0, fxRgba(i === 1 ? c2 : c1, 0.22 + 0.1 * Math.sin(T * 0.8 + p.p))); g.addColorStop(1, fxRgba(c1, 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        });
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    dust: {
      init: (W, H, r) => Array.from({ length: Math.round(W * H / 10000) }, () => ({ x: r() * W, y: r() * H, s: 1.3 + r() * 3.2, v: 10 + r() * 35, p: r() * 6.3, f: 0.5 + r() * 2 })),
      draw(ctx, W, H, T, ps, c1) {
        ctx.fillStyle = c1;
        ps.forEach((p) => {
          const y = wrapN(p.y - p.v * T, H + 20) - 10, x = p.x + Math.sin(T * 0.4 + p.p) * 30;
          ctx.globalAlpha = (0.2 + 0.8 * Math.abs(Math.sin(T * p.f + p.p))) * (0.3 + 0.7 * (y / H));
          ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill();
        });
      },
    },
    heartbeat: {
      init: () => [],
      draw(ctx, W, H, T, ps, c1, c2) {
        // 모니터 격자
        ctx.strokeStyle = c1; ctx.lineWidth = 1; ctx.globalAlpha = 0.06;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let y = 0; y <= H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
        const cy = H * 0.6, A = H * 0.2, per = Math.min(560, W * 0.4);
        const gs = (u, c, w, a) => a * Math.exp(-((u - c) / w) * ((u - c) / w));
        const ecg = (x) => { const u = wrapN(x, per) / per; return gs(u, 0.15, 0.03, 0.12) + gs(u, 0.28, 0.008, -0.12) + gs(u, 0.3, 0.011, 1) + gs(u, 0.325, 0.01, -0.3) + gs(u, 0.52, 0.045, 0.26); };
        const sweep = W * 1.25, hx = wrapN(T * W / 4.5, sweep);
        const g = ctx.createLinearGradient(hx - W * 0.85, 0, hx, 0);
        g.addColorStop(0, fxRgba(c1, 0)); g.addColorStop(1, fxRgba(c1, 0.9));
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.lineJoin = 'round';
        ctx.beginPath();
        const x0 = Math.max(0, hx - W * 0.85), x1 = Math.min(W, hx);
        for (let x = x0; x <= x1; x += 3) { const y = cy - ecg(x) * A; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        if (hx <= W) {
          const y = cy - ecg(hx) * A;
          const rg = ctx.createRadialGradient(hx, y, 0, hx, y, 34);
          rg.addColorStop(0, fxRgba(c2, 0.95)); rg.addColorStop(0.25, fxRgba(c2, 0.5)); rg.addColorStop(1, fxRgba(c2, 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, y, 34, 0, 7); ctx.fill();
        }
      },
    },
    dna: {
      init: () => [],
      draw(ctx, W, H, T, ps, c1, c2) {
        const cy = H * 0.5, A = H * 0.16, k = (Math.PI * 2) / 560, step = 34;
        for (let x = -step; x <= W + step; x += step) {
          const ph = x * k + T * 1.1, s = Math.sin(ph), z = Math.cos(ph);
          const y1 = cy + A * s, y2 = cy - A * s;
          ctx.globalAlpha = 0.18; ctx.strokeStyle = c1; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
          ctx.globalAlpha = 0.35 + 0.35 * (z + 1) / 2; ctx.fillStyle = c1;
          ctx.beginPath(); ctx.arc(x, y1, 7 + 5 * (z + 1) / 2, 0, 7); ctx.fill();
          ctx.globalAlpha = 0.35 + 0.35 * (1 - z) / 2; ctx.fillStyle = c2;
          ctx.beginPath(); ctx.arc(x, y2, 7 + 5 * (1 - z) / 2, 0, 7); ctx.fill();
        }
      },
    },
    hex: {
      init: () => [],
      draw(ctx, W, H, T, ps, c1, c2) {
        const s = 46, hw = Math.sqrt(3) * s, D = Math.hypot(W, H);
        const cx = W * (0.5 + 0.3 * Math.sin(T * 0.13)), cy = H * (0.5 + 0.3 * Math.cos(T * 0.17));
        const R = wrapN(T * 380, D * 1.1);
        ctx.lineWidth = 2;
        for (let row = -1, y = 0; y < H + s * 2; row++, y = row * s * 1.5) {
          for (let col = -1; col * hw < W + hw; col++) {
            const x = col * hw + (row % 2 ? hw / 2 : 0);
            const d = Math.hypot(x - cx, y - cy), k = Math.exp(-((d - R) / 140) * ((d - R) / 140));
            ctx.beginPath();
            for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, px = x + Math.cos(a) * (s - 3), py = y + Math.sin(a) * (s - 3); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
            ctx.closePath();
            if (k > 0.05) { ctx.globalAlpha = k * 0.22; ctx.fillStyle = c2; ctx.fill(); }
            ctx.globalAlpha = 0.07 + k * 0.5; ctx.strokeStyle = c1; ctx.stroke();
          }
        }
      },
    },
    ripple: {
      init: (W, H, r) => [[0.25, 0.35], [0.72, 0.62], [0.5, 0.15]].map(([x, y], i) => ({ x: W * x, y: H * y, o: i * 1.7 })),
      draw(ctx, W, H, T, ps, c1, c2) {
        const M = Math.max(W, H) * 0.55, gap = 130;
        ps.forEach((p, i) => {
          ctx.strokeStyle = i === 1 ? c2 : c1;
          for (let j = 0; j < 6; j++) {
            const r = wrapN(T * 70 + p.o * 100 + j * gap, gap * 6);
            if (r > M) continue;
            ctx.globalAlpha = (1 - r / M) * 0.45; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
          }
        });
      },
    },
    confetti: {
      init: (W, H, r) => Array.from({ length: Math.round(W * H / 22000) }, () => ({ x: r() * W, y: r() * H, w: 9 + r() * 8, h: 14 + r() * 10, v: 70 + r() * 90, p: r() * 6.3, rs: 1 + r() * 3, fs: 2 + r() * 5, c: Math.floor(r() * 8) })),
      draw(ctx, W, H, T, ps, c1, c2) {
        const pal = [c1, c2].concat(FX_PALETTE);
        ps.forEach((p) => {
          const y = wrapN(p.y + p.v * T, H + 40) - 20, x = p.x + Math.sin(T * 1.3 + p.p) * 40;
          ctx.save(); ctx.translate(x, y); ctx.rotate(T * p.rs + p.p); ctx.scale(1, Math.cos(T * p.fs + p.p));
          ctx.globalAlpha = 0.9; ctx.fillStyle = pal[p.c % pal.length]; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        });
      },
    },
    fireworks: {
      init: () => [],
      draw(ctx, W, H, T, ps, c1, c2) {
        const per = 0.55, life = 2.4, rise = 0.7, pal = [c1, c2].concat(FX_PALETTE);
        ctx.globalCompositeOperation = 'lighter';
        const n = Math.floor(T / per);
        for (let i = n - 6; i <= n + 1; i++) {
          const t0 = i * per, age = T - t0 - rise;
          const cx = W * (0.12 + hash1(i) * 0.76), cy = H * (0.15 + hash1(i + 0.5) * 0.4), col = pal[Math.floor(hash1(i + 0.3) * pal.length)];
          if (age < -rise || age > life) continue;
          if (age < 0) { // 올라가는 불꽃
            const k = 1 + age / rise, y = H + (cy - H) * (1 - (1 - k) * (1 - k));
            ctx.globalAlpha = 0.8; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, y, 3, 0, 7); ctx.fill();
            ctx.globalAlpha = 0.25; ctx.fillRect(cx - 1, y, 2, 60);
            continue;
          }
          const N = 72, sp = 300 + hash1(i + 0.7) * 200, fade = 1 - age / life;
          for (let j = 0; j < N; j++) {
            const a = (j / N) * Math.PI * 2 + hash1(i + j) * 0.1, v = sp * (0.6 + 0.4 * hash1(i * 3 + j));
            const d = v * (1 - Math.exp(-age * 1.6)) / 1.6;
            const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + 60 * age * age;
            ctx.globalAlpha = fade * fade * 0.9; ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
            ctx.globalAlpha = fade * 0.25; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    matrix: {
      init: (W, H, r) => Array.from({ length: Math.ceil(W / 28) }, (_, i) => ({ x: i * 28 + 4, y: r() * H, v: 120 + r() * 240, n: 10 + Math.floor(r() * 16), o: Math.floor(r() * 1000) })),
      draw(ctx, W, H, T, ps, c1) {
        const CH = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후그느드르므브스으즈츠크트프흐기니디리미비시이지치키티피히한글빛사랑소망믿음생명평안0123456789';
        ctx.font = "600 22px 'Noto Sans KR', 'Malgun Gothic', sans-serif"; ctx.textBaseline = 'top';
        ps.forEach((c) => {
          const head = wrapN(c.y + c.v * T, H + c.n * 28 + 200);
          const hr = Math.floor(head / 28);
          for (let k = 0; k < c.n; k++) {
            const y = (hr - k) * 28;
            if (y < -28 || y > H) continue;
            const ch = CH[Math.floor(hash1(c.o + (hr - k) * 7 + Math.floor(T * 6 + k)) * CH.length)];
            ctx.globalAlpha = k === 0 ? 0.9 : 0.55 * (1 - k / c.n);
            ctx.fillStyle = k === 0 ? '#ffffff' : c1;
            ctx.fillText(ch, c.x, y);
          }
        });
      },
    },
    lines: {
      init: (W, H, r) => Array.from({ length: 7 }, (_, i) => ({ y: H * (0.25 + i * 0.08), a: 30 + r() * 70, k1: 0.002 + r() * 0.003, k2: 0.004 + r() * 0.004, w: 0.3 + r() * 0.5, p: r() * 6.3 })),
      draw(ctx, W, H, T, ps, c1, c2) {
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, fxRgba(c1, 0)); g.addColorStop(0.3, fxRgba(c1, 0.6)); g.addColorStop(0.7, fxRgba(c2, 0.6)); g.addColorStop(1, fxRgba(c2, 0));
        ctx.strokeStyle = g; ctx.lineWidth = 2.5;
        ps.forEach((p) => {
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          for (let x = 0; x <= W; x += 12) {
            const y = p.y + Math.sin(x * p.k1 + T * p.w + p.p) * p.a + Math.sin(x * p.k2 - T * p.w * 0.7) * p.a * 0.5;
            if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        });
      },
    },
    dotwave: {
      init: () => [],
      draw(ctx, W, H, T, ps, c1, c2) {
        const g = 46;
        for (let y = g / 2; y < H; y += g) {
          for (let x = g / 2; x < W; x += g) {
            const k = 0.5 + 0.5 * Math.sin(x * 0.008 + y * 0.006 - T * 1.8) * Math.cos(y * 0.004 - T * 0.6);
            ctx.globalAlpha = 0.12 + 0.55 * k; ctx.fillStyle = k > 0.75 ? c2 : c1;
            ctx.beginPath(); ctx.arc(x, y, 1.6 + 3.4 * k, 0, 7); ctx.fill();
          }
        }
      },
    },
  };

  function canvasFx2(kind, W, H, c1, c2, speed, animate, q, rnd) {
    const def = FX2[kind];
    const c = document.createElement('canvas');
    c.className = 'hp-fxcanvas';
    c.width = Math.max(1, Math.round(W * q));
    c.height = Math.max(1, Math.round(H * q));
    const ctx = c.getContext('2d');
    const ps = def.init(W, H, rnd);
    const draw = (sec) => {
      ctx.setTransform(q, 0, 0, q, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      def.draw(ctx, W, H, sec * speed, ps, c1, c2);
      ctx.globalAlpha = 1;
    };
    draw(6.2);
    if (animate) {
      const born = performance.now();
      const loop = (t) => {
        if (!c.isConnected) { if (c._started || t - born > 3000) return; } else c._started = true;
        if (c.isConnected) draw(6.2 + (t - born) / 1000);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* 코드 요소: 간단한 문법 강조 + Magic Move 용 토큰                       */
  /* ------------------------------------------------------------------ */
  const CODE_LANGS = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', html: 'HTML', css: 'CSS', json: 'JSON', sql: 'SQL', bash: 'Shell', java: 'Java / C / C#', text: '일반 텍스트' };
  const CODE_KW = {
    js: 'const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of this super null undefined true false yield delete void static get set',
    py: 'def return if elif else for while in not and or is import from as class try except finally raise with lambda yield None True False pass break continue global nonlocal async await self',
    sql: 'select from where insert into values update set delete create table drop alter join left right inner outer on group by order having limit as and or not null is in like distinct count sum avg max min case when then else end primary key desc asc union',
    bash: 'echo cd ls if then else fi for do done while case esac function export sudo npm npx node git cat grep curl mkdir rm cp mv source',
    java: 'int float double char void long short bool boolean byte if else for while do return struct class interface public private protected static final const new true false null include import package using namespace try catch throw throws this var string auto',
  };
  CODE_KW.ts = CODE_KW.js + ' interface type enum implements private public protected readonly as declare namespace abstract keyof';
  const kwSets = {};
  const kwSet = (lang) => kwSets[lang] || (kwSets[lang] = new Set((CODE_KW[lang] || '').split(' ').filter(Boolean)));

  function tokenizeCode(code, lang) {
    const src = String(code == null ? '' : code).replace(/\r/g, '').replace(/\t/g, '  ');
    const out = [];
    if (lang === 'text') {
      src.split(/(\n|[ ]+)/).forEach((t) => { if (!t) return; out.push({ t, c: t === '\n' ? 'nl' : /^ +$/.test(t) ? 'ws' : 'id' }); });
      return out;
    }
    if (lang === 'html') {
      const re = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w-]*)|(\/?>)|("[^"\n]*"|'[^'\n]*')|([A-Za-z_:@][\w:.-]*(?=\s*=))|(=)|(\n)|([ \t]+)|([^<>"'=\s]+)|(.)/g;
      let m;
      while ((m = re.exec(src))) {
        const c = m[1] ? 'com' : m[2] ? 'tag' : m[3] ? 'tag' : m[4] ? 'str' : m[5] ? 'attr' : m[6] ? 'punc' : m[7] ? 'nl' : m[8] ? 'ws' : 'id';
        out.push({ t: m[0], c });
      }
      return out;
    }
    const comment = lang === 'py' || lang === 'bash' ? '#[^\\n]*' : lang === 'sql' ? '--[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
    const re = new RegExp(`(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b0x[0-9a-fA-F]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?(?:px|em|rem|vh|vw|ms|s|%)?)|([A-Za-z_$\\u00C0-\\uFFFF][\\w$\\u00C0-\\uFFFF]*)|(\\n)|([ ]+)|([+\\-*/%=!<>&|^~?:]+)|(.)`, 'g');
    const kw = kwSet(lang);
    let m;
    while ((m = re.exec(src))) {
      let c;
      if (m[1]) c = 'com';
      else if (m[2]) c = 'str';
      else if (m[3]) c = 'num';
      else if (m[4]) {
        const w = m[4];
        const rest = src.slice(re.lastIndex);
        if (kw.has(lang === 'sql' ? w.toLowerCase() : w)) c = 'kw';
        else if (lang === 'css' && /^\s*:/.test(rest) && !/^\s*:\s*[^;{}]*\{/.test(rest)) c = 'attr';
        else if (/^\s*\(/.test(rest)) c = 'fn';
        else if (/^[A-Z]/.test(w)) c = 'type';
        else c = 'id';
      } else if (m[5]) c = 'nl';
      else if (m[6]) c = 'ws';
      else if (m[7]) c = 'op';
      else c = 'punc';
      if (c === 'str' && lang === 'json' && /^\s*:/.test(src.slice(re.lastIndex))) c = 'attr';
      out.push({ t: m[0], c });
    }
    return out;
  }

  function parseLineSet(s) {
    const set = new Set();
    String(s || '').split(',').forEach((p) => {
      const m = p.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (m) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) set.add(i);
    });
    return set;
  }

  function renderCodeHtml(el) {
    const toks = tokenizeCode(el.code, el.lang || 'js');
    const hl = parseLineSet(el.highlightLines);
    const lines = [[]];
    toks.forEach((t) => { if (t.c === 'nl') lines.push([]); else lines[lines.length - 1].push(t); });
    const ln = el.lineNumbers !== false;
    const digits = String(lines.length).length;
    let h = '';
    lines.forEach((ts, i) => {
      const dim = hl.size && !hl.has(i + 1) ? ' dim' : hl.has(i + 1) ? ' hl' : '';
      h += `<div class="hp-cl${dim}">${ln ? `<span class="hp-ln" style="min-width:${digits + 1}ch">${i + 1}</span>` : ''}`;
      ts.forEach((t) => { h += t.c === 'ws' ? t.t : `<span class="hp-tk tk-${t.c}">${esc(t.t)}</span>`; });
      h += ts.length ? '</div>' : '&#8203;</div>';
    });
    return h;
  }

  // 일반 텍스트를 단어 단위 토큰으로 감싼다 (Magic Move 용, 전환할 때만 사용)
  function wrapWords(root) {
    if (!root || root.dataset.tokenized) return;
    root.dataset.tokenized = '1';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let t;
    while ((t = walker.nextNode())) if (t.nodeValue.trim()) nodes.push(t);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else { const s = document.createElement('span'); s.className = 'hp-tk'; s.textContent = part; frag.appendChild(s); }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  // 토큰 짝 찾기: 최장 공통 부분수열(LCS) + 남은 같은 글자 토큰끼리 가까운 것부터
  function matchTokens(a, b) {
    const n = a.length, m = b.length;
    const pairs = [];
    const usedA = new Uint8Array(n), usedB = new Uint8Array(m);
    if (n && m && n * m <= 360000) {
      const dp = new Uint16Array((n + 1) * (m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
        dp[i * (m + 1) + j] = a[i] === b[j] ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
      }
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (a[i] === b[j]) { pairs.push([i, j]); usedA[i] = 1; usedB[j] = 1; i++; j++; }
        else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) i++; else j++;
      }
    }
    for (let j = 0; j < m; j++) {
      if (usedB[j]) continue;
      let best = -1, bd = Infinity;
      for (let i = 0; i < n; i++) if (!usedA[i] && a[i] === b[j] && Math.abs(i - j) < bd) { best = i; bd = Math.abs(i - j); }
      if (best >= 0) { usedA[best] = 1; usedB[j] = 1; pairs.push([best, j]); }
    }
    return pairs;
  }

  /*
   * Magic Move: 짝지어진 텍스트/코드 요소의 내용이 바뀌었을 때 단어(토큰) 단위로 이어서 움직인다.
   * 같은 토큰은 새 위치로 날아가고(크기·색 보간), 없어진 토큰은 사라지고, 새 토큰은 나타난다.
   * 성공하면 true (호출한 쪽은 기본 모핑 대신 이 결과를 사용)
   */
  function magicMove(o, n, D, ease, anims) {
    const isCode = o.classList.contains('hp-type-code') && n.classList.contains('hp-type-code');
    const oTc = o.querySelector('.hp-tc'), nTc = n.querySelector('.hp-tc');
    if (!isCode && !(oTc && nTc)) return false;
    if (!isCode && o.dataset.msig === n.dataset.msig) return false; // 내용이 같으면 기본 모핑
    if (!isCode) { wrapWords(oTc); wrapWords(nTc); }
    const ot = Array.from(o.querySelectorAll('.hp-tk')), nt = Array.from(n.querySelectorAll('.hp-tk'));
    if (!ot.length && !nt.length) return false;
    const opt = { duration: D, easing: ease };
    // 위치: 요소 자체는 위치만 이동(크기 고정 → 글자 재배치 없음), 배경 상자는 별도 유령 상자가 크기를 보간
    const sc = (n.getBoundingClientRect().width / (n.offsetWidth || 1)) || 1;
    const oW = o.getBoundingClientRect(), nW = n.getBoundingClientRect();
    const oR = ot.map((t) => t.getBoundingClientRect()), nR = nt.map((t) => t.getBoundingClientRect());
    const oC = ot.map((t) => getComputedStyle(t).color), nC = nt.map((t) => getComputedStyle(t).color);
    const pairs = matchTokens(ot.map((t) => t.textContent), nt.map((t) => t.textContent));
    const geoPos = (e) => ({ left: e.style.left, top: e.style.top, transform: e.style.transform || 'rotate(0deg)', opacity: getComputedStyle(e).opacity });
    anims.push(n.animate([geoPos(o), geoPos(n)], opt));
    // 배경 상자 유령
    const oB = o.querySelector('.hp-box'), nB = n.querySelector('.hp-box');
    const nbs = getComputedStyle(nB), obs = getComputedStyle(oB);
    if (nbs.backgroundColor !== 'rgba(0, 0, 0, 0)' || obs.backgroundColor !== 'rgba(0, 0, 0, 0)' || nbs.backgroundImage !== 'none') {
      const g = document.createElement('div');
      g.className = 'hp-mm-ghost';
      g.style.zIndex = n.style.zIndex;
      g.style.background = nB.style.background || nbs.backgroundColor;
      g.style.borderRadius = nbs.borderRadius;
      n.parentNode.insertBefore(g, n);
      const G = (e) => ({ left: e.style.left, top: e.style.top, width: e.style.width, height: e.style.height, backgroundColor: getComputedStyle(e.querySelector('.hp-box')).backgroundColor, borderRadius: getComputedStyle(e.querySelector('.hp-box')).borderRadius });
      const ga = g.animate([G(o), G(n)], opt);
      ga.onfinish = ga.oncancel = () => g.remove();
      anims.push(ga);
      const saved = nB.style.background;
      nB.style.background = 'transparent';
      const back = () => { nB.style.background = saved; };
      ga.finished.then(back, back);
    }
    // 이전 요소: 상자·줄 번호는 숨기고, 짝 없는 토큰만 사라지게
    o.style.visibility = '';
    oB.style.background = 'transparent';
    oB.style.border = 'none';
    o.querySelectorAll('.hp-ln, .hp-codebar').forEach((x) => { x.style.visibility = 'hidden'; });
    const matchedO = new Set(pairs.map((p) => p[0])), matchedN = new Set(pairs.map((p) => p[1]));
    ot.forEach((t, i) => {
      if (matchedO.has(i)) t.style.visibility = 'hidden';
      else anims.push(t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.35, easing: 'ease-in', fill: 'forwards' }));
    });
    pairs.forEach(([i, j]) => {
      const dx = ((oR[i].left - oW.left) - (nR[j].left - nW.left)) / sc;
      const dy = ((oR[i].top - oW.top) - (nR[j].top - nW.top)) / sc;
      const s = nR[j].height ? oR[i].height / nR[j].height : 1;
      const t = nt[j];
      t.style.transformOrigin = '0 0';
      anims.push(t.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, color: oC[i] },
        { transform: 'translate(0, 0) scale(1)', color: nC[j] },
      ], opt));
    });
    nt.forEach((t, j) => {
      if (!matchedN.has(j)) anims.push(t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D * 0.5, delay: D * 0.45, easing: 'ease-out', fill: 'backwards' }));
    });
    n.querySelectorAll('.hp-ln, .hp-codebar').forEach((x) => anims.push(x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D * 0.3, delay: D * 0.7, fill: 'backwards' })));
    return true;
  }

  // 요소 내용 서명 (모핑 짝 찾기용). DOM 없이 계산 → 편집기·플레이어·CLI 가 같은 결과
  function elSig(el) {
    if (el.html) {
      const t = String(el.html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ').trim();
      if (t) return el.type + ':' + t;
    }
    if (el.type === 'code' && el.code) return 'code:' + String(el.code).replace(/\s+/g, ' ').trim();
    if (el.src) return el.type + ':' + el.src;
    if (el.url) return el.type + ':' + el.url;
    if (el.data) return el.type + ':' + el.data;
    return '';
  }

  /* ------------------------------------------------------------------ */
  /* 유틸                                                                 */
  /* ------------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function parseEmbed(url) {
    url = String(url || '').trim();
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return { kind: 'youtube', id: m[1] };
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { kind: 'vimeo', id: m[1] };
    return { kind: 'url', url };
  }

  // 동영상 구간(트림): 원본은 그대로 두고 재생할 때 시작·끝만 지킨다
  function applyTrim(v, el) {
    const ts = Math.max(0, +el.trimStart || 0), te = +el.trimEnd || 0;
    if (!ts && !te) return;
    const loop = !!el.loop;
    v.loop = false;
    v.dataset.trim = '1';
    const toStart = () => { try { v.currentTime = ts; } catch (e) { /* noop */ } };
    v.addEventListener('loadedmetadata', () => { if (ts && v.currentTime < ts) toStart(); });
    v.addEventListener('play', () => { if (v.currentTime < ts - 0.3 || (te && v.currentTime >= te - 0.05)) toStart(); });
    const atEnd = () => {
      if (loop) { toStart(); v.play().catch(() => {}); } else { v.pause(); v.dispatchEvent(new Event('trimend')); }
    };
    v.addEventListener('timeupdate', () => { if (te && v.currentTime >= te && !v.paused) atEnd(); });
    v.addEventListener('ended', () => { if (loop) atEnd(); });
  }

  function embedSrc(el, force) {
    force = force || {};
    const p = parseEmbed(el.url);
    const ap = el.autoplay || force.autoplay ? 1 : 0, mu = el.muted && !force.sound ? 1 : 0, lp = el.loop ? 1 : 0;
    const ts = Math.floor(+el.trimStart || 0), te = Math.ceil(+el.trimEnd || 0);
    const tr = (ts ? '&start=' + ts : '') + (te ? '&end=' + te : '');
    if (p.kind === 'youtube') return `https://www.youtube.com/embed/${p.id}?autoplay=${ap}&mute=${mu}&loop=${lp}&playlist=${p.id}&rel=0&controls=${el.controls === false && !force.sound ? 0 : 1}${tr}`;
    if (p.kind === 'vimeo') return `https://player.vimeo.com/video/${p.id}?autoplay=${ap}&muted=${mu}&loop=${lp}${ts ? '#t=' + ts + 's' : ''}`;
    return p.url;
  }

  function embedThumb(el) {
    const p = parseEmbed(el.url);
    if (p.kind === 'youtube') return `https://img.youtube.com/vi/${p.id}/hqdefault.jpg`;
    return '';
  }

  function bgCss(bg, resolve) {
    bg = bg || {};
    if (bg.type === 'gradient' && bg.gradient) return bg.gradient;
    if (bg.type === 'image' && bg.src) return `${bg.color || '#000'} url("${resolve(bg.src)}") center/${bg.fit || 'cover'} no-repeat`;
    return bg.color || '#ffffff';
  }

  function csvRows(text) {
    return String(text || '').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => l.split(/\t|,/).map((c) => c.trim()));
  }

  /* ------------------------------------------------------------------ */
  /* 렌더링                                                               */
  /* ------------------------------------------------------------------ */
  function renderSlide(deck, slide, opts) {
    opts = opts || {};
    const mode = opts.mode || 'present';
    const resolve = opts.resolve || ((s) => s);
    const s = document.createElement('div');
    s.className = 'hp-slide hp-mode-' + mode;
    s.dataset.slideId = slide.id;
    s.style.width = deck.width + 'px';
    s.style.height = deck.height + 'px';
    s.style.background = bgCss(slide.bg, resolve);
    if (deck.theme && deck.theme.fontBody) s.style.fontFamily = deck.theme.fontBody;

    const bg = slide.bg || {};
    if (bg.type === 'video' && bg.src) {
      // 배경 동영상: fit(cover|contain) · speed(재생 속도) · blur(px) · sound/volume · start/end(초, 이 구간만 반복)
      const v = document.createElement('video');
      v.className = 'hp-bgvideo';
      v.dataset.src = bg.src;
      const t0 = Math.max(0, +bg.start || 0), t1 = +bg.end > t0 ? +bg.end : 0;
      v.src = resolve(bg.src) + (mode === 'present' ? '' : '#t=' + (t0 || 0.5));
      v.muted = !(mode === 'present' && bg.sound); v.playsInline = true;
      v.loop = !t0 && !t1;
      if (!v.muted) v.volume = bg.volume != null ? Math.max(0, Math.min(1, +bg.volume)) : 0.6;
      if (bg.sound) v.dataset.sound = '1';
      v.preload = mode === 'present' ? 'auto' : 'metadata';
      if (mode === 'present') v.autoplay = true;
      if (bg.fit === 'contain') v.style.objectFit = 'contain';
      if (+bg.blur > 0) { v.style.filter = `blur(${+bg.blur}px)`; v.style.transform = 'scale(1.06)'; }
      const rate = +bg.speed > 0 ? +bg.speed : 1;
      v.defaultPlaybackRate = rate;
      v.addEventListener('loadedmetadata', () => {
        v.playbackRate = rate;
        // 앞 슬라이드와 같은 영상이면 이어서 재생 (data-resume), 아니면 시작 지점부터
        const r = v.dataset.resume != null ? +v.dataset.resume : t0;
        if (r && mode === 'present') try { v.currentTime = t1 && r >= t1 ? t0 : r; } catch (e) { /* ignore */ }
      }, { once: true });
      if (t0 || t1) {
        v.addEventListener('timeupdate', () => { if (t1 && v.currentTime >= t1) v.currentTime = t0; });
        v.addEventListener('ended', () => { v.currentTime = t0; v.play().catch(() => {}); });
      }
      s.appendChild(v);
    }
    if ((bg.type === 'image' || bg.type === 'video') && bg.overlay) {
      const o = document.createElement('div');
      o.className = 'hp-bgoverlay';
      o.style.background = `rgba(0,0,0,${bg.overlay})`;
      s.appendChild(o);
    }
    if (BG_FX_RETIRED[bg.fx]) bg.fx = BG_FX_RETIRED[bg.fx];
    if (bg.fx && bg.fx !== 'none' && BG_FX[bg.fx]) {
      const fxEl = renderFx(bg, deck, mode, s);
      if (fxEl) s.appendChild(fxEl);
    }
    (slide.elements || []).forEach((el, i) => s.appendChild(renderElement(deck, el, i, mode, resolve)));
    return s;
  }

  /* ---------- 3D 모델 (glTF/GLB) — Google <model-viewer> 를 처음 쓸 때 한 번 불러온다 ---------- */
  const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  let live3d = false;          // 미리보기(thumb)에서도 실제 3D 로 그리기 (CLI 렌더용)
  const hooks = {};            // onModelPoster(id, dataURL): 편집 화면에서 모델을 불러오면 호출
  const setLive3d = (v) => { live3d = !!v; };
  const mvCache = new Map();   // 편집 화면: 다시 그려도 같은 모델은 다시 불러오지 않게
  const MODEL_VIEWER_LOCAL = 'vendor/model-viewer.min.js';   // 앱에 들어 있는 사본 (인터넷 없이 동작)
  function ensureModelViewer() {
    if (window.customElements && window.customElements.get('model-viewer')) return;
    if (document.querySelector('script[data-hp-mv]')) return;   // 내보낸 HTML 은 라이브러리를 직접 품고 있다
    const add = (src, fallback) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = src;
      s.dataset.hpMv = '1';
      if (fallback) s.onerror = () => { s.remove(); add(fallback); };
      (document.head || document.documentElement).appendChild(s);
    };
    add(MODEL_VIEWER_LOCAL, MODEL_VIEWER_SRC);
  }
  // 3D 그리기 장치(WebGL)를 잃으면(다른 모니터로 전체화면 이동, 그래픽 드라이버 재시작 등) model-viewer 는
  // 스스로 다시 그리지 않아 빈 화면이 된다. 장치가 돌아오길 잠시 기다렸다가 안 오면 새로 만들고,
  // 재사용하던 뷰어를 버린 뒤 화면을 다시 그리게 한다(hooks.onModelReset · 'hp-3d-reset' 이벤트).
  let gpuRecovering = false;
  function mvRenderer(mv) {
    for (let p = Object.getPrototypeOf(mv); p; p = Object.getPrototypeOf(p)) {
      const sym = Object.getOwnPropertySymbols(p).find((s) => s.description === 'renderer');
      if (sym) return mv[sym];
    }
    return null;
  }
  function onModelError(e) {
    if (!e.detail || e.detail.type !== 'webglcontextlost' || gpuRecovering) return;
    gpuRecovering = true;
    const R = mvRenderer(e.target);
    const lost = () => { try { return R.threeRenderer.getContext().isContextLost(); } catch (err) { return true; } };
    let n = 0;
    const check = () => {
      if (R && lost() && ++n < 8) { setTimeout(check, 250); return; }
      try { if (R && lost()) R.constructor.resetSingleton(); } catch (err) { /* ignore */ }
      // 잃은 장치에 올라가 있던 모델 캐시도 비운다 (남아 있으면 새 뷰어도 빈 화면)
      try { const MV = customElements.get('model-viewer'), size = MV.modelCacheSize; MV.modelCacheSize = 0; MV.modelCacheSize = size; } catch (err) { /* ignore */ }
      mvCache.clear();
      gpuRecovering = false;
      if (hooks.onModelReset) hooks.onModelReset();
      document.dispatchEvent(new CustomEvent('hp-3d-reset'));
    };
    setTimeout(check, 250);
  }
  function modelViewer(el, mode, resolve, wrap) {
    ensureModelViewer();
    const src = resolve(el.src) || '';
    const key = el.id + '|' + src;
    // 화면에 붙어 있는 뷰어만 다시 쓴다(같은 슬라이드를 다시 그릴 때 깜빡임 방지).
    // 한 번 떼어졌다가 다른 뷰어가 그리는 동안 쉬었던 뷰어는 다시 붙여도 빈 화면이 되므로 새로 만든다
    let mv = mode === 'edit' && mvCache.get(key);
    if (mv && !mv.isConnected) { mvCache.delete(key); mv = null; }
    if (!mv) {
      mv = document.createElement('model-viewer');
      mv.className = 'hp-model';
      mv.setAttribute('loading', 'eager');
      mv.setAttribute('interaction-prompt', 'none');
      mv.setAttribute('auto-rotate-delay', mode === 'present' ? '2500' : '0'); // 발표 중 손으로 돌린 뒤 잠시 멈춤
      mv.style.cssText = 'width:100%;height:100%;display:block;background:transparent;--poster-color:transparent;--progress-bar-color:transparent';
      mv.addEventListener('error', onModelError);
      if (src) mv.setAttribute('src', src);
      if (mode === 'edit') {
        mvCache.set(key, mv);
        if (mvCache.size > 40) mvCache.delete(mvCache.keys().next().value);
        // 처음 불러오면 모습을 찍어 미리보기(썸네일)에 쓴다
        mv.addEventListener('load', () => setTimeout(() => {
          try { if (hooks.onModelPoster) hooks.onModelPoster(el.id, mv.toDataURL('image/webp', 0.75)); } catch (e) { /* ignore */ }
        }, 600));
      }
    }
    const set = (k, v) => { if (v == null || v === false) mv.removeAttribute(k); else mv.setAttribute(k, v === true ? '' : String(v)); };
    set('alt', el.alt || '3D 모델');
    set('auto-rotate', el.autoRotate !== false);
    set('rotation-per-second', (el.rotateSpeed != null ? el.rotateSpeed : 30) + 'deg');
    set('camera-orbit', el.orbit || null);
    set('field-of-view', el.fov ? el.fov + 'deg' : null);
    set('exposure', el.exposure != null ? el.exposure : 1);
    set('shadow-intensity', el.shadowIntensity != null ? el.shadowIntensity : 1);
    set('environment-image', el.envLight === 'legacy' ? 'legacy' : 'neutral');
    set('autoplay', el.animation !== false);
    set('animation-name', el.animationName || null);
    // 발표 중에만 마우스로 돌리기 (편집 화면에서는 선택·이동이 먼저)
    const ctl = mode === 'present' && el.controls !== false;
    set('camera-controls', ctl);
    set('disable-zoom', ctl && !el.zoom);
    set('disable-pan', ctl);
    if (ctl && wrap) wrap.dataset.model3d = '1';
    return mv;
  }

  function applyBoxStyle(box, el) {
    const st = box.style;
    if (el.fill && el.fill !== 'transparent') st.background = el.fill;
    if (el.borderWidth) st.border = `${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#000'}`;
    const shp = SHAPES[el.shape];
    if (el.type === 'shape' && shp) {
      if (shp.clip) st.clipPath = shp.clip;
      if (shp.radius != null) st.borderRadius = typeof shp.radius === 'number' ? shp.radius + 'px' : shp.radius;
    }
    if (el.radius != null && el.radius !== '' && !(shp && shp.radius === '50%')) st.borderRadius = el.radius + 'px';
  }

  function applyTextStyle(t, el) {
    const st = t.style;
    st.fontFamily = el.fontFamily || '';
    st.fontSize = (el.fontSize || 32) + 'px';
    st.color = el.color || '#222';
    st.fontWeight = el.bold ? '700' : '400';
    st.fontStyle = el.italic ? 'italic' : 'normal';
    st.textDecoration = el.underline ? 'underline' : 'none';
    st.textAlign = el.align || 'left';
    st.lineHeight = el.lineHeight || 1.3;
    st.letterSpacing = (el.letterSpacing || 0) + 'px';
    st.padding = (el.padding != null ? el.padding : 8) + 'px';
    st.justifyContent = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[el.valign || 'top'];
    if (el.textShadow) st.textShadow = '0 4px 18px rgba(0,0,0,.45)';
  }

  /* ---------- 펜 선 (path) ----------
     el.pts = [{ x, y, ix, iy, ox, oy, s }] — 요소 안 좌표(px, 기준 크기 pw×ph). ix/iy = 들어오는 핸들, ox/oy = 나가는 핸들(없으면 모서리점), s = 부드러운 점
     el.closed, stroke, strokeWidth, fill, dash(solid|dash|dot|longdash), cap(round|butt|square), join(round|miter|bevel), arrowStart, arrowEnd */
  const hx = (p, k) => (p[k] == null ? p[k === 'ix' || k === 'ox' ? 'x' : 'y'] : p[k]);
  function pathSegs(pts, closed) {
    const out = [];
    const n = (pts || []).length;
    for (let i = 1; i < n + (closed && n > 2 ? 1 : 0); i++) {
      const a = pts[i - 1], b = pts[i % n];
      out.push([{ x: a.x, y: a.y }, { x: hx(a, 'ox'), y: hx(a, 'oy') }, { x: hx(b, 'ix'), y: hx(b, 'iy') }, { x: b.x, y: b.y }, i - 1]);
    }
    return out;
  }
  function bez(s, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y };
  }
  function pathD(pts, closed, sx, sy) {
    sx = sx || 1; sy = sy || 1;
    if (!pts || !pts.length) return '';
    const P = (x, y) => `${(x * sx).toFixed(2)} ${(y * sy).toFixed(2)}`;
    let d = 'M' + P(pts[0].x, pts[0].y);
    pathSegs(pts, closed).forEach((s) => {
      const straight = s[1].x === s[0].x && s[1].y === s[0].y && s[2].x === s[3].x && s[2].y === s[3].y;
      d += straight ? ' L' + P(s[3].x, s[3].y) : ` C${P(s[1].x, s[1].y)} ${P(s[2].x, s[2].y)} ${P(s[3].x, s[3].y)}`;
    });
    if (closed && pts.length > 2) d += ' Z';
    return d;
  }
  // 곡선 위 점들 (경계 계산·가장 가까운 점 찾기용)
  function samplePath(pts, closed, steps) {
    const out = [];
    steps = steps || 24;
    if (pts && pts.length === 1) out.push({ x: pts[0].x, y: pts[0].y, seg: 0, t: 0 });
    pathSegs(pts, closed).forEach((s) => { for (let k = 0; k <= steps; k++) { const p = bez(s, k / steps); p.seg = s[4]; p.t = k / steps; out.push(p); } });
    return out;
  }
  const DASHES = { dash: [3, 2], longdash: [6, 3], dot: [0.01, 2] };
  function renderPath(el, mode) {
    const sx = el.pw ? el.w / el.pw : 1, sy = el.ph ? el.h / el.ph : 1;
    const sw = el.strokeWidth != null ? +el.strokeWidth : 6;
    const stroke = el.stroke || '#222222';
    const noFill = !el.fill || el.fill === 'transparent' || el.fill === 'none';
    const d = pathD(el.pts, el.closed, sx, sy);
    const da = DASHES[el.dash] ? DASHES[el.dash].map((v) => (v * Math.max(1, sw)).toFixed(2)).join(' ') : '';
    const cap = el.dash === 'dot' ? 'round' : (el.cap || 'round');
    const mid = 'hpm-' + el.id;
    const mk = (id, rev) => `<marker id="${id}" viewBox="0 0 10 10" refX="${rev ? 3 : 7}" refY="5" markerWidth="4.2" markerHeight="4.2" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${stroke}"/></marker>`;
    const defs = el.arrowStart || el.arrowEnd ? `<defs>${el.arrowStart ? mk(mid + 's', true) : ''}${el.arrowEnd ? mk(mid + 'e') : ''}</defs>` : '';
    const markers = (el.arrowStart ? ` marker-start="url(#${mid}s)"` : '') + (el.arrowEnd ? ` marker-end="url(#${mid}e)"` : '');
    const hit = mode === 'edit' ? `<path class="hp-hit" d="${d}" fill="${noFill || !el.closed ? 'none' : 'transparent'}" stroke="transparent" stroke-width="${Math.max(sw, 18)}" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `<svg class="hp-pathsvg" width="100%" height="100%" overflow="visible">${defs}<path class="hp-stroke" d="${d}" fill="${noFill ? 'none' : el.fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${el.join || 'round'}"${da ? ` stroke-dasharray="${da}"` : ''}${markers}/>${hit}</svg>`;
  }

  function renderElement(deck, el, index, mode, resolve) {
    const w = document.createElement('div');
    w.className = 'hp-el hp-type-' + el.type;
    w.dataset.id = el.id;
    const st = w.style;
    st.left = el.x + 'px'; st.top = el.y + 'px';
    st.width = el.w + 'px'; st.height = el.h + 'px';
    st.zIndex = index + 1;
    if (el.rotation) st.transform = `rotate(${el.rotation}deg)`;
    if (el.opacity != null && el.opacity < 1) st.opacity = el.opacity;
    if (el.shadow) st.filter = `drop-shadow(0 ${el.shadow}px ${el.shadow * 2}px rgba(0,0,0,.35))`;
    w.dataset.mkey = el.mkey || el.id;
    const sig = elSig(el);
    if (sig) w.dataset.msig = sig;
    const hasAction = (el.action && el.action.type && el.action.type !== 'none') || el.link;
    if (hasAction) {
      w.dataset.hasaction = '1';
      if (mode === 'present') w.dataset.action = '1';
    }
    if (el.hover && el.hover !== 'none') w.classList.add('hp-hover-' + el.hover);
    if (el.startHidden) w.dataset.starthidden = '1';

    const a = document.createElement('div');
    a.className = 'hp-anim';
    w.appendChild(a);

    if (el.type === 'path') {
      a.innerHTML = renderPath(el, mode);
    } else if (el.type === 'text' || el.type === 'shape') {
      const box = document.createElement('div');
      box.className = 'hp-box';
      applyBoxStyle(box, el);
      if (el.type === 'shape' && el.shape === 'line') {
        box.style.background = 'transparent';
        box.style.border = 'none';
        box.innerHTML = `<div class="hp-line" style="background:${el.fill || '#333'};height:${Math.max(1, el.lineWidth || 6)}px"></div>`;
      } else {
        const t = document.createElement('div');
        t.className = 'hp-text';
        applyTextStyle(t, el);
        const c = document.createElement('div');
        c.className = 'hp-tc';
        c.innerHTML = el.html || '';
        t.appendChild(c);
        box.appendChild(t);
      }
      a.appendChild(box);
    } else if (el.type === 'image') {
      const box = document.createElement('div');
      box.className = 'hp-box';
      applyBoxStyle(box, el);
      const img = document.createElement('img');
      img.className = 'hp-img';
      img.draggable = false;
      img.alt = el.alt || '';
      img.src = resolve(el.src);
      img.style.objectFit = el.fit || 'cover';
      const f = [];
      if (el.grayscale) f.push(`grayscale(${el.grayscale})`);
      if (el.brightness != null && el.brightness !== 1) f.push(`brightness(${el.brightness})`);
      if (el.contrast != null && el.contrast !== 1) f.push(`contrast(${el.contrast})`);
      if (el.blur) f.push(`blur(${el.blur}px)`);
      if (el.sepia) f.push(`sepia(${el.sepia})`);
      if (f.length) img.style.filter = f.join(' ');
      if (el.flipH) img.style.transform = 'scaleX(-1)';
      box.appendChild(img);
      a.appendChild(box);
    } else if (el.type === 'video') {
      const box = document.createElement('div');
      box.className = 'hp-box';
      applyBoxStyle(box, el);
      const v = document.createElement('video');
      v.className = 'hp-video';
      v.style.objectFit = el.fit || 'contain';
      v.playsInline = true;
      if (mode === 'present') {
        v.src = resolve(el.src);
        v.loop = !!el.loop;
        v.muted = !!el.muted;
        v.controls = el.controls !== false && !el.clickFull;
        v.preload = 'auto';
        if (el.autoplay) v.dataset.autoplay = '1';
        applyTrim(v, el);
        if (el.clickFull) {
          w.dataset.clickfull = '1';
          const pb = document.createElement('div');
          pb.className = 'hp-fv-play';
          pb.innerHTML = '<span>▶</span>';
          box.appendChild(pb);
        }
      } else {
        v.src = resolve(el.src) ? resolve(el.src) + '#t=' + ((+el.trimStart || 0) > 0 ? +el.trimStart : 0.5) : '';
        v.muted = true;
        v.preload = 'metadata';
        const badge = document.createElement('div');
        badge.className = 'hp-media-badge';
        badge.textContent = '▶ 동영상';
        box.appendChild(badge);
      }
      box.insertBefore(v, box.firstChild);
      a.appendChild(box);
    } else if (el.type === 'embed') {
      const box = document.createElement('div');
      box.className = 'hp-box';
      applyBoxStyle(box, el);
      if (mode === 'present' && el.clickFull) {
        // 클릭하면 전체 화면: 펼칠 때 소리와 함께 불러온다
        w.dataset.clickfull = '1';
        const th = embedThumb(el);
        box.style.background = '#000';
        box.innerHTML = (th ? `<img class="hp-img" style="object-fit:cover" src="${esc(th)}" draggable="false">` : '') + '<div class="hp-fv-play"><span>▶</span></div>';
      } else if (mode === 'present') {
        const f = document.createElement('iframe');
        f.className = 'hp-iframe';
        f.src = embedSrc(el);
        f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        if (!el.fill || el.fill === 'transparent') box.style.background = '#000';
        box.appendChild(f);
      } else {
        const th = embedThumb(el);
        box.style.background = '#111';
        box.innerHTML = (th ? `<img class="hp-img" style="object-fit:cover" src="${esc(th)}" draggable="false">` : '') +
          `<div class="hp-media-badge big">▶ 웹 동영상<br><small>${esc((el.url || '').slice(0, 60))}</small></div>`;
      }
      a.appendChild(box);
    } else if (el.type === 'model') {
      const box = document.createElement('div');
      box.className = 'hp-box hp-modelbox';
      applyBoxStyle(box, el);
      if (mode === 'thumb' && !live3d) {
        // 미리보기 그림: 편집 화면에서 찍어 둔 모습(poster)이 있으면 그것, 없으면 표시만
        box.innerHTML = el.poster
          ? `<img class="hp-img" style="object-fit:contain" src="${esc(el.poster)}" draggable="false">`
          : '<div class="hp-media-badge big">🧊 3D 모델</div>';
      } else {
        box.appendChild(modelViewer(el, mode, resolve, w));
      }
      a.appendChild(box);
    } else if (el.type === 'chart') {
      const box = document.createElement('div');
      box.className = 'hp-box hp-chartbox';
      applyBoxStyle(box, el);
      box.style.overflow = 'visible';
      box.innerHTML = renderChart(el);
      a.appendChild(box);
    } else if (el.type === 'code') {
      const box = document.createElement('div');
      const theme = el.codeTheme || 'dark';
      box.className = 'hp-box hp-codebox hp-code-' + theme;
      applyBoxStyle(box, el);
      if (!el.fill) box.style.background = theme === 'light' ? '#fafafa' : '#1e2230';
      if (el.radius == null) box.style.borderRadius = '18px';
      const fsz = el.fontSize || 30;
      box.innerHTML = (el.title ? `<div class="hp-codebar" style="font-size:${Math.round(fsz * 0.7)}px"><i></i><i></i><i></i><span>${esc(el.title)}</span></div>` : '') +
        `<pre class="hp-code" style="font-size:${fsz}px;line-height:${el.lineHeight || 1.5};padding:${el.padding != null ? el.padding : Math.round(fsz * 0.9)}px">${renderCodeHtml(el)}</pre>`;
      a.appendChild(box);
    } else if (el.type === 'table') {
      const box = document.createElement('div');
      box.className = 'hp-box hp-tablebox';
      applyBoxStyle(box, el);
      const rows = csvRows(el.data);
      const hc = el.headerColor || '#3b5bdb', bc = el.borderColor || '#cfd6e4';
      let h = `<table class="hp-table" style="font-size:${el.fontSize || 24}px;color:${el.color || '#222'};font-family:${el.fontFamily || 'inherit'}">`;
      // colWidths: "15,42.5,42.5" — 열별 너비 비율(합계 기준 %). 비우면 균등 분할
      const cw = String(el.colWidths || '').split(/[,\s]+/).map(Number).filter((v) => v > 0);
      if (cw.length) {
        const sum = cw.reduce((a, b) => a + b, 0);
        h += '<colgroup>' + cw.map((v) => `<col style="width:${(v / sum * 100).toFixed(2)}%">`).join('') + '</colgroup>';
      }
      // rowHeights: "20,40,40" — 행별 높이 비율. 비우면 균등 (글자가 더 크면 그만큼 늘어남)
      const rh = String(el.rowHeights || '').split(/[,\s]+/).map(Number).filter((v) => v > 0);
      const rhSum = rh.length === rows.length ? rh.reduce((a, b) => a + b, 0) : 0;
      rows.forEach((r, ri) => {
        h += rhSum ? `<tr style="height:${(rh[ri] / rhSum * Math.max(0, (el.h || 0) - 2 * (+el.borderWidth || 0))).toFixed(1)}px">` : '<tr>';
        r.forEach((c) => {
          const head = ri === 0 && el.headerRow !== false;
          h += head
            ? `<th style="background:${hc};color:${el.headerText || '#fff'};border:1px solid ${bc}">${esc(c)}</th>`
            : `<td style="border:1px solid ${bc};background:${ri % 2 === 0 && el.striped !== false ? (el.stripeColor || '#f3f5fa') : (el.cellColor || '#fff')}">${esc(c)}</td>`;
        });
        h += '</tr>';
      });
      box.innerHTML = h + '</table>';
      a.appendChild(box);
    }
    return w;
  }

  /* ------------------------------------------------------------------ */
  /* 애니메이션 실행                                                      */
  /* ------------------------------------------------------------------ */
  // 표의 내용 행 수 (머리글 제외)
  function tableHasHeader(el) { return el.headerRow !== false; }
  function tableDataRows(el) {
    const n = csvRows(el.data).length;
    return Math.max(0, n - (tableHasHeader(el) && n ? 1 : 0));
  }
  // "표: 행 하나씩" 효과는 행마다 한 단계로 펼친다 (첫 행 = 효과의 trigger, 다음 행 = rowTrigger, 기본 클릭)
  function expandAnims(slide) {
    const out = [];
    (slide.anims || []).forEach((a) => {
      const def = ANIMS[a.effect];
      const el = def && def.special === 'rows' ? (slide.elements || []).find((e) => e.id === a.elId) : null;
      if (el && el.type === 'table') {
        const n = tableDataRows(el);
        for (let k = 0; k < n; k++) out.push(Object.assign({}, a, { _row: k, trigger: k ? (a.rowTrigger || 'click') : a.trigger, delay: k ? (+a.rowDelay || 0) : a.delay }));
        return;
      }
      out.push(a);
    });
    return out;
  }

  function buildGroups(slide) {
    const groups = [];
    const ids = new Set((slide.elements || []).map((e) => e.id));
    let cur = null, prevStart = 0, prevEnd = 0;
    expandAnims(slide).forEach((a) => {
      const def = ANIMS[a.effect];
      if (!def || !ids.has(a.elId)) return;
      const dur = +a.duration || 600, delay = +a.delay || 0;
      const reps = def.loop ? Infinity : Math.max(1, +a.repeat || 1);
      let start;
      if (a.trigger === 'click' || !cur) {
        cur = { items: [], auto: a.trigger !== 'click' && groups.length === 0, total: 0 };
        groups.push(cur);
        start = delay;
      } else if (a.trigger === 'with') start = prevStart + delay;
      else start = prevEnd + delay;
      const end = start + (reps === Infinity ? dur : dur * reps);
      cur.items.push({ a, def, start, end, dur, reps });
      cur.total = Math.max(cur.total, end);
      prevStart = start; prevEnd = end;
    });
    return groups;
  }

  function initiallyHidden(slide) {
    const first = {};
    (slide.anims || []).forEach((a) => {
      const d = ANIMS[a.effect];
      if (a.elId in first || !d) return;
      const el = d.special === 'rows' && (slide.elements || []).find((e) => e.id === a.elId);
      first[a.elId] = el && el.type === 'table' ? 'rows' : d.cat;
    });
    const set = new Set(Object.keys(first).filter((k) => first[k] === 'in'));
    (slide.elements || []).forEach((e) => { if (e.startHidden) set.add(e.id); });
    return set;
  }

  // 처음부터 보이는 차트는 슬라이드가 나타날 때 그린다
  function animateVisibleCharts(slideEl, slide, delay, skipKeys) {
    const animated = new Set((slide.anims || []).filter((a) => ANIMS[a.effect] && ANIMS[a.effect].cat === 'in').map((a) => a.elId));
    (slide.elements || []).forEach((e) => {
      if (e.type !== 'chart' || e.chartAnim === false || animated.has(e.id) || e.startHidden) return;
      if (skipKeys && skipKeys.has(e.mkey || e.id)) return; // 모핑으로 이어지는 차트는 다시 그리지 않음
      animateChart(slideEl.querySelector(`.hp-el[data-id="${e.id}"]`), delay || 0, e.chartDur);
    });
  }

  function animNode(slideEl, id) {
    const w = slideEl.querySelector(`.hp-el[data-id="${id}"]`);
    return w ? w.querySelector('.hp-anim') : null;
  }

  function cancelAll(slideEl) {
    slideEl.querySelectorAll('.hp-anim').forEach((n) => {
      n.getAnimations().forEach((x) => x.cancel());
      if (n._countStop) n._countStop();
    });
    slideEl.querySelectorAll('svg.hp-chart [data-anim]').forEach((n) => n.getAnimations().forEach((x) => x.cancel()));
    slideEl.querySelectorAll('.hp-table td, .hp-table th').forEach((n) => { n.getAnimations().forEach((x) => x.cancel()); n.style.backfaceVisibility = ''; });
    slideEl.querySelectorAll('.hp-prism-face').forEach((n) => n.remove());
    slideEl.querySelectorAll('path.hp-stroke').forEach((n) => { n.getAnimations().forEach((x) => x.cancel()); n.style.filter = ''; });
    slideEl.querySelectorAll('.hp-drawfx').forEach((n) => n.remove());
  }

  // 표의 k번째 내용 행(<tr>)
  function rowTr(slideEl, el, k) {
    const w = slideEl.querySelector(`.hp-el[data-id="${el.id}"]`);
    const t = w && w.querySelector('table.hp-table');
    return t ? t.rows[k + (tableHasHeader(el) ? 1 : 0)] : null;
  }

  // step 개의 그룹이 이미 실행된 상태를 즉시 적용
  function applyState(slideEl, slide, deck, step) {
    cancelAll(slideEl);
    const groups = buildGroups(slide);
    const hidden = initiallyHidden(slide);
    const loops = [];
    groups.slice(0, step).forEach((g) => g.items.forEach((it) => {
      if (it.def.cat === 'in') hidden.delete(it.a.elId);
      else if (it.def.cat === 'out') hidden.add(it.a.elId);
      else if (it.def.cat === 'loop') loops.push(it);
    }));
    slideEl.querySelectorAll('.hp-el').forEach((w) => {
      w.querySelector('.hp-anim').style.visibility = hidden.has(w.dataset.id) ? 'hidden' : '';
    });
    // 표 행: 아직 차례가 안 된 행은 숨김 (삼각기둥은 빈 면만 보임)
    groups.forEach((g, gi) => g.items.forEach((it) => {
      if (it.a._row == null) return;
      const el = slide.elements.find((e) => e.id === it.a.elId);
      const tr = el && rowTr(slideEl, el, it.a._row);
      if (!tr) return;
      const off = gi >= step;
      tr.classList.toggle(it.def.row === 'prism' ? 'hp-row-blank' : 'hp-row-off', off);
    }));
    loops.forEach((it) => {
      const n = animNode(slideEl, it.a.elId);
      const el = slide.elements.find((e) => e.id === it.a.elId);
      if (n && el) n.animate(it.def.kf(el, deck), { duration: it.dur, iterations: Infinity, easing: it.def.easing || 'ease' });
    });
    applyDim(slideEl, slide, step, groups);
  }

  // "지난 항목 흐리게": 다음 클릭 묶음이 나오면 앞서 나온 항목을 흐리게 한다
  // anim.dim = true 인 항목, 또는 slide.dimPrev = true 이면 클릭으로 나온 모든 항목 (처음 자동으로 나오는 제목 등은 제외)
  function dimmedIds(slide, step, groups) {
    groups = groups || buildGroups(slide);
    const out = new Set(), rows = [];
    for (let gi = 0; gi < Math.min(step, groups.length) - 1; gi++) {
      const g = groups[gi];
      g.items.forEach((it) => {
        if (it.def.cat !== 'in' || !(it.a.dim || (slide.dimPrev && !g.auto))) return;
        if (it.a._row != null) rows.push([it.a.elId, it.a._row]); // 표는 지난 행만 흐리게
        else out.add(it.a.elId);
      });
    }
    // 나중 묶음에서 다시 강조되면 그 순간에는 밝게
    const last = groups[Math.min(step, groups.length) - 1];
    if (last) last.items.forEach((it) => { if (it.a._row == null) out.delete(it.a.elId); });
    out.rows = rows;
    return out;
  }
  function applyDim(slideEl, slide, step, groups) {
    const ids = dimmedIds(slide, step, groups);
    slideEl.querySelectorAll(':scope > .hp-el').forEach((w) => w.classList.toggle('hp-dim', ids.has(w.dataset.id)));
    slideEl.querySelectorAll('.hp-table tr.hp-row-dim').forEach((tr) => tr.classList.remove('hp-row-dim'));
    ids.rows.forEach(([id, k]) => {
      const el = slide.elements.find((e) => e.id === id);
      const tr = el && rowTr(slideEl, el, k);
      if (tr) tr.classList.add('hp-row-dim');
    });
  }

  // 펜 선을 그려 나간다
  //  dir: forward(처음→끝) | reverse(끝→처음) | center(가운데→양쪽)
  //  fx : none | glow(빛나는 선) | tip(펜 끝 빛) | sparkle(불꽃 튀기) | neon(빛+펜 끝+불꽃+끝날 때 번쩍)
  //  화살표는 다 그린 뒤, 채우기는 끝 무렵 나타난다
  const DRAW_FX = { none: '보통', glow: '빛나는 선', tip: '펜 끝 빛', sparkle: '불꽃 튀기', neon: '네온 (전부 + 끝에 번쩍)' };
  const DRAW_DIRS = { forward: '처음 → 끝', reverse: '끝 → 처음', center: '가운데 → 양쪽' };
  function drawPath(n, dur, delay, easing, opt) {
    opt = opt || {};
    const p = n.querySelector('path.hp-stroke');
    if (!p) return;
    const svg = p.ownerSVGElement;
    let L = 0;
    try { L = p.getTotalLength(); } catch (e) { /* 그려지지 않은 상태 */ }
    if (!L) return;
    const dir = DRAW_DIRS[opt.dir] ? opt.dir : 'forward';
    const fx = DRAW_FX[opt.fx] ? opt.fx : 'none';
    const color = p.getAttribute('stroke') || '#fff';
    const sw = +p.getAttribute('stroke-width') || 6;
    const keep = { da: p.getAttribute('stroke-dasharray'), ms: p.getAttribute('marker-start'), me: p.getAttribute('marker-end') };
    p.removeAttribute('marker-start'); p.removeAttribute('marker-end');
    let kf;
    if (dir === 'center') {
      p.removeAttribute('stroke-dasharray');
      // 보이는 구간 [L/2·(1-p), L/2·(1+p)] — 길이 0 조각의 둥근 끝이 점으로 보이지 않게 처음엔 투명
      kf = [{ strokeDasharray: `0 ${L * 2}`, strokeDashoffset: -L / 2, strokeOpacity: 0, fillOpacity: 0 }, { strokeOpacity: 1, offset: 0.02 }, { strokeDasharray: `${L * 0.75} ${L * 2}`, strokeDashoffset: -L * 0.125, fillOpacity: 0, offset: 0.75 }, { strokeDasharray: `${L} ${L * 2}`, strokeDashoffset: 0, strokeOpacity: 1, fillOpacity: 1 }];
    } else {
      p.setAttribute('stroke-dasharray', `${L} ${L}`);
      const s = dir === 'reverse' ? -1 : 1;
      kf = [{ strokeDashoffset: s * L, fillOpacity: 0 }, { strokeDashoffset: s * L * 0.25, fillOpacity: 0, offset: 0.75 }, { strokeDashoffset: 0, fillOpacity: 1 }];
    }
    const a = p.animate(kf, { duration: dur, delay, easing: easing || 'ease-in-out', fill: 'backwards' });
    // 꾸밈 (빛 · 펜 끝 · 불꽃)
    const fxNodes = [];
    const glowF = `drop-shadow(0 0 ${Math.max(3, sw * 1.2)}px ${color}) drop-shadow(0 0 ${Math.max(6, sw * 3)}px ${color})`;
    const wantGlow = fx === 'glow' || fx === 'neon';
    const wantTip = fx === 'tip' || fx === 'sparkle' || fx === 'neon';
    const wantSpark = fx === 'sparkle' || fx === 'neon';
    const NSV = 'http://www.w3.org/2000/svg';
    const mkTip = () => {
      const g = document.createElementNS(NSV, 'g');
      g.setAttribute('class', 'hp-drawfx');
      g.style.opacity = '0';
      g.innerHTML = `<circle r="${Math.max(6, sw * 2.2)}" fill="${color}" opacity=".45" style="filter:blur(${Math.max(3, sw)}px)"/><circle r="${Math.max(3, sw * 0.9)}" fill="#fff"/>`;
      svg.appendChild(g); fxNodes.push(g);
      return g;
    };
    const tips = wantTip ? (dir === 'center' ? [mkTip(), mkTip()] : [mkTip()]) : [];
    let raf = 0, lastSpark = 0, sparks = 0;
    const at = (len) => p.getPointAtLength(Math.max(0, Math.min(L, len)));
    const spark = (pt, now) => {
      if (sparks > 220 || now - lastSpark < 22) return;
      lastSpark = now;
      for (let k = 0; k < 3; k++) {
        const c = document.createElementNS(NSV, 'circle');
        const r = Math.max(2, sw * (0.3 + Math.random() * 0.5));
        c.setAttribute('r', r); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
        c.setAttribute('fill', Math.random() < 0.45 ? '#fff' : color);
        c.style.filter = `drop-shadow(0 0 ${Math.max(2, sw * 0.6)}px ${color})`;
        c.setAttribute('class', 'hp-drawfx');
        c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
        svg.appendChild(c); fxNodes.push(c); sparks++;
        const ang = Math.random() * Math.PI * 2, d = sw * (4 + Math.random() * 10);
        const an = c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d + sw * 2}px) scale(.2)`, opacity: 0 }], { duration: 600 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' });
        an.onfinish = () => { c.remove(); sparks--; };
      }
    };
    const frame = () => {
      if (a.playState === 'idle') return; // 취소됨
      const pr = a.effect.getComputedTiming().progress;
      const now = performance.now();
      if (pr != null && a.playState !== 'finished') {
        const pos = dir === 'reverse' ? [L * (1 - pr)] : dir === 'center' ? [L / 2 * (1 - pr), L / 2 * (1 + pr)] : [L * pr];
        pos.forEach((len, k) => {
          const pt = at(len);
          if (tips[k]) { tips[k].setAttribute('transform', `translate(${pt.x} ${pt.y})`); tips[k].style.opacity = '1'; }
          if (wantSpark) spark(pt, now);
        });
      }
      if (a.playState !== 'finished') raf = requestAnimationFrame(frame);
    };
    if (wantGlow) p.style.filter = glowF;
    if (wantTip || wantSpark) raf = requestAnimationFrame(frame);
    const cleanup = (instant) => {
      cancelAnimationFrame(raf);
      tips.forEach((t) => { if (instant) t.remove(); else t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = () => t.remove(); });
      if (instant) { fxNodes.forEach((x) => x.remove()); p.style.filter = ''; }
    };
    const restore = () => {
      if (keep.da) p.setAttribute('stroke-dasharray', keep.da); else p.removeAttribute('stroke-dasharray');
      if (keep.ms) p.setAttribute('marker-start', keep.ms);
      if (keep.me) p.setAttribute('marker-end', keep.me);
    };
    a.onfinish = () => {
      restore();
      cleanup(false);
      if (fx === 'neon') {
        // 끝날 때 번쩍 → 은은하게
        p.animate([{ filter: glowF + ' brightness(1)' }, { filter: `drop-shadow(0 0 ${sw * 2.5}px ${color}) drop-shadow(0 0 ${sw * 6}px ${color}) brightness(1.7)`, offset: 0.25 }, { filter: 'none' }], { duration: 1100, easing: 'ease-out' }).onfinish = () => { p.style.filter = ''; };
        p.style.filter = '';
      } else if (wantGlow) {
        p.animate([{ filter: glowF }, { filter: 'none' }], { duration: 800, easing: 'ease-out' }).onfinish = () => { p.style.filter = ''; };
        p.style.filter = '';
      }
    };
    a.oncancel = () => { restore(); cleanup(true); };
  }

  // 표 한 행 나타내기. prism: 칸마다 삼각기둥이 위로 120° 돌며 빈 면이 넘어가고 내용 면이 올라온다
  function playRow(tr, style, dur, delay, easing) {
    const cells = Array.from(tr.cells);
    tr.classList.remove('hp-row-off', 'hp-row-blank');
    if (style !== 'prism') {
      const kf = style === 'rise' ? [{ opacity: 0, transform: 'translateY(32px)' }, { opacity: 1, transform: 'none' }]
        : style === 'slide' ? [{ opacity: 0, transform: 'translateX(-70px)' }, { opacity: 1, transform: 'none' }]
          : [{ opacity: 0 }, { opacity: 1 }];
      cells.forEach((c, i) => c.animate(kf, { duration: dur, delay: delay + (style === 'fade' ? 0 : i * 40), easing, fill: 'backwards' }));
      return;
    }
    const table = tr.closest('table');
    const box = table.parentNode;
    const h = tr.offsetHeight || 40;
    const r = h * 0.2887; // 정삼각기둥의 중심 → 면 거리 (h / 2√3)
    const P = `perspective(${Math.max(700, h * 9)}px) translateZ(${-r}px)`;
    const face = (deg) => `${P} rotateX(${deg}deg) translateZ(${r}px)`;
    const stagger = Math.min(90, dur * 0.12);
    cells.forEach((c, i) => {
      const cs = getComputedStyle(c);
      // 넘어가는 빈 면 (칸 배경과 테두리만)
      const f = document.createElement('div');
      f.className = 'hp-prism-face';
      Object.assign(f.style, {
        left: (table.offsetLeft + c.offsetLeft) + 'px', top: (table.offsetTop + c.offsetTop) + 'px',
        width: c.offsetWidth + 'px', height: c.offsetHeight + 'px',
        background: cs.backgroundColor, border: cs.border,
      });
      box.appendChild(f);
      const d = delay + i * stagger;
      c.style.backfaceVisibility = 'hidden';
      c.animate([{ transform: face(-120) }, { transform: face(0) }], { duration: dur, delay: d, easing, fill: 'backwards' });
      const out = f.animate([{ transform: face(0) }, { transform: face(120) }], { duration: dur, delay: d, easing, fill: 'both' });
      out.onfinish = () => f.remove();
      out.oncancel = () => f.remove();
      setTimeout(() => f.remove(), d + dur + 300);
    });
  }

  function playGroup(slideEl, slide, deck, group, speed) {
    speed = speed || 1;
    group.items.forEach((it) => {
      const n = animNode(slideEl, it.a.elId);
      const el = slide.elements.find((e) => e.id === it.a.elId);
      if (!n || !el) return;
      const cat = it.def.cat;
      if (cat === 'in') n.style.visibility = '';
      if (it.def.special === 'draw' && el.type === 'path') {
        drawPath(n, it.dur / speed, it.start / speed, it.def.easing, { dir: it.a.drawDir, fx: it.a.drawFx });
        return;
      }
      if (it.a._row != null) {
        const tr = rowTr(slideEl, el, it.a._row);
        if (tr) playRow(tr, it.def.row, it.dur / speed, it.start / speed, it.def.easing || 'ease-out');
        return;
      }
      const anim = n.animate(it.def.kf(el, deck), {
        duration: it.dur / speed,
        delay: it.start / speed,
        iterations: it.reps,
        easing: it.def.easing || 'ease-out',
        fill: cat === 'in' ? 'backwards' : cat === 'out' ? 'forwards' : 'none',
      });
      if (cat === 'out') anim.onfinish = () => { n.style.visibility = 'hidden'; anim.cancel(); };
      if (it.def.special === 'count') countUp(n, it.dur / speed, it.start / speed);
      if (cat === 'in' && el.type === 'chart' && (it.def.special === 'chart' || el.chartAnim !== false)) {
        animateChart(n.parentNode, it.start / speed + (it.def.special === 'chart' ? 0 : it.dur / speed * 0.3), it.def.special === 'chart' ? it.dur / speed : el.chartDur);
      }
    });
    return group.total / speed;
  }

  // 편집기 미리보기: 모든 그룹을 순서대로 실행
  function previewAll(slideEl, slide, deck, onDone) {
    const groups = buildGroups(slide);
    applyState(slideEl, slide, deck, 0);
    animateVisibleCharts(slideEl, slide);
    let i = 0, timer = null, stopped = false;
    const run = () => {
      if (stopped) return;
      if (i >= groups.length) { if (onDone) onDone(); return; }
      const t = playGroup(slideEl, slide, deck, groups[i++]);
      applyDim(slideEl, slide, i, groups);
      timer = setTimeout(run, (t === Infinity ? 1200 : t) + 350);
    };
    run();
    return () => { stopped = true; clearTimeout(timer); };
  }

  // 모핑: 같은 3D 모델은 새로 불러오지 않고 앞 장의 것을 옮겨 쓰며, 보는 각도를 이어서 돌린다
  const DEFAULT_ORBIT = '0deg 75deg 105%';
  // CSS cubic-bezier 와 같은 값을 내는 함수 (JS 로 그리는 움직임을 CSS 애니메이션과 맞출 때)
  function cubicBezier(x1, y1, x2, y2) {
    const bz = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bz(t, x1, x2) < x) lo = t; else hi = t; }
      return bz(t, y1, y2);
    };
  }
  function carryModel(o, n, D) {
    const oM = o.querySelector('model-viewer.hp-model'), nM = n.querySelector('model-viewer.hp-model');
    if (!oM || !nM || oM === nM || oM.getAttribute('src') !== nM.getAttribute('src')) return null;
    const goal = nM.getAttribute('camera-orbit') || DEFAULT_ORBIT;
    const spin = nM.hasAttribute('auto-rotate');
    const keep = { class: 1, style: 1, src: 1, 'camera-orbit': 1, 'auto-rotate': 1, 'interpolation-decay': 1 };
    Array.from(oM.attributes).forEach((a) => { if (!keep[a.name] && !nM.hasAttribute(a.name)) oM.removeAttribute(a.name); });
    Array.from(nM.attributes).forEach((a) => { if (!keep[a.name]) oM.setAttribute(a.name, a.value); });
    nM.replaceWith(oM);
    // 카메라 각도와 자동 회전으로 돌아간 만큼(turntable)을 전환 시간에 맞춰 직접 이어서 돌린다
    oM.removeAttribute('auto-rotate');
    const wrapPi = (v) => Math.atan2(Math.sin(v), Math.cos(v));
    const r0 = wrapPi(oM.turntableRotation || 0);
    const from = oM.loaded && oM.getCameraOrbit ? oM.getCameraOrbit() : null;
    oM.setAttribute('camera-orbit', goal);
    const ease = cubicBezier(0.45, 0.05, 0.25, 1);   // 상자 모핑과 같은 곡선
    let raf = 0, live = true;
    const t0 = performance.now();   // 상자 애니메이션과 같은 시각에서 출발
    const done = Promise.resolve(oM.updateComplete).catch(() => {}).then(() => new Promise((res) => {
      const to = from && live ? oM.getCameraOrbit() : null;
      const dT = to ? wrapPi(to.theta - from.theta) : 0;   // 짧은 쪽으로 돈다
      // 목표 각도를 읽으려고 바꿔 둔 카메라를 그려지기 전에 출발 각도로 되돌린다
      if (to) { oM.cameraOrbit = `${from.theta}rad ${from.phi}rad ${from.radius}m`; if (oM.jumpCameraToGoal) oM.jumpCameraToGoal(); }
      const step = (now) => {
        if (!live) return res();
        const k = Math.min(1, (now - t0) / D), e = ease(k);
        if (r0 && oM.resetTurntableRotation) oM.resetTurntableRotation(r0 * (1 - e));
        if (to) {
          oM.cameraOrbit = `${from.theta + dT * e}rad ${from.phi + (to.phi - from.phi) * e}rad ${from.radius + (to.radius - from.radius) * e}m`;
          if (oM.jumpCameraToGoal) oM.jumpCameraToGoal();
        }
        if (k < 1) { raf = requestAnimationFrame(step); return; }
        if (to) oM.setAttribute('camera-orbit', goal);
        res();
      };
      raf = requestAnimationFrame(step);
    }));
    const finish = () => {
      live = false;
      cancelAnimationFrame(raf);
      if (spin) oM.setAttribute('auto-rotate', '');
    };
    return { finished: done, cancel: finish, mv: oM, cw: canvasW(oM) };
  }
  // model-viewer 가 실제로 그리는 캔버스의 CSS 폭 (새 크기로 다시 그렸는지 알아보는 데 씀)
  function canvasW(mv) {
    const r = mv.shadowRoot;
    const c = r && (r.querySelector('canvas.show') || r.querySelector('canvas'));
    return c ? c.style.width : '';
  }
  // 옮긴 직후 몇 프레임은 이전 크기의 그림이 상자 왼쪽 위에 그대로 남아 작게 보인다.
  // 새 크기로 다시 그려질 때까지 그 그림을 앞 장과 같은 크기·위치로 맞춰 둔다
  function holdModel(carry, nw, nh, ow, oh, sc) {
    const mv = carry.mv, w0 = carry.cw;
    if (!w0) return;
    mv.style.transformOrigin = '0 0';
    mv.style.transform = `translate(${(nw - ow / sc) / 2}px,${(nh - oh / sc) / 2}px) scale(${1 / sc})`;
    let n = 0;
    const tick = () => {
      if (canvasW(mv) !== w0 || ++n >= 30) { mv.style.transform = ''; mv.style.transformOrigin = ''; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // 모핑: 두 슬라이드에서 같은 요소(같은 키 또는 같은 내용)를 찾아 위치·크기·색을 보간
  function morphTransition(oldEl, newEl, duration) {
    const D = duration || 1000;
    const ease = 'cubic-bezier(.45,.05,.25,1)';
    const olds = Array.from(oldEl.querySelectorAll(':scope > .hp-el'));
    const news = Array.from(newEl.querySelectorAll(':scope > .hp-el'));
    const used = new Set();
    const pairs = [];
    const pick = (fn) => olds.find((o) => !used.has(o) && fn(o));
    news.forEach((n) => {
      let o = pick((x) => x.dataset.mkey === n.dataset.mkey);
      if (!o && n.dataset.msig) o = pick((x) => x.dataset.msig === n.dataset.msig);
      if (o) { used.add(o); pairs.push([o, n]); }
    });
    // 이어질 요소가 하나도 없으면(슬라이드 순서가 바뀌어 체인이 끊긴 경우 등) 깔끔한 페이드로 대체
    if (!pairs.length) {
      const kf = TRANSITIONS.fade.f(1);
      const a = newEl.animate(kf.in, { duration: Math.min(D, 800), easing: 'ease', fill: 'both' });
      return a.finished.catch(() => {}).then(() => a.cancel());
    }
    const anims = [];
    const opt = { duration: D, easing: ease };
    const geo = (e) => ({ left: e.style.left, top: e.style.top, width: e.style.width, height: e.style.height, transform: e.style.transform || 'rotate(0deg)', opacity: getComputedStyle(e).opacity });
    pairs.forEach(([o, n]) => {
      // 내용이 바뀐 텍스트/코드 → Magic Move (단어 단위)
      if (magicMove(o, n, D, ease, anims)) return;
      o.style.visibility = 'hidden';
      const carry = carryModel(o, n, D);
      if (carry) {
        // 3D 모델: 크기를 바꾸면 매 프레임 캔버스를 다시 만들어 끊기므로, 최종 크기로 두고 이동·확대(transform)만 보간
        const px = (v) => parseFloat(v) || 0;
        const ow = px(o.style.width), oh = px(o.style.height), nw = px(n.style.width) || 1, nh = px(n.style.height) || 1;
        const dx = px(o.style.left) + ow / 2 - px(n.style.left) - nw / 2, dy = px(o.style.top) + oh / 2 - px(n.style.top) - nh / 2;
        const sc = Math.min(ow, oh) / Math.min(nw, nh) || 1;   // 모델은 상자의 짧은 변에 맞춰 그려진다
        if (ow !== nw || oh !== nh) holdModel(carry, nw, nh, ow, oh, sc);
        const rot = (e) => ((e.style.transform || '').match(/rotate\(([-\d.]+)deg\)/) || [0, 0])[1];
        anims.push(n.animate([
          { transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(${rot(o)}deg)`, opacity: getComputedStyle(o).opacity },
          { transform: `translate(0px,0px) scale(1) rotate(${rot(n)}deg)`, opacity: getComputedStyle(n).opacity },
        ], opt));
        anims.push(carry);
        return;
      }
      anims.push(n.animate([geo(o), geo(n)], opt));
      // 같은 차트의 값이 바뀌면 막대·점·선이 새 값으로 이어서 움직임
      const oS = o.querySelector('svg.hp-chart'), nS = n.querySelector('svg.hp-chart');
      if (oS && nS) morphChartMarks(oS, nS, opt, anims);
      const oT = o.querySelector('.hp-text'), nT = n.querySelector('.hp-text');
      if (oT && nT) {
        const a = getComputedStyle(oT), b = getComputedStyle(nT);
        anims.push(nT.animate([{ fontSize: a.fontSize, color: a.color, letterSpacing: a.letterSpacing }, { fontSize: b.fontSize, color: b.color, letterSpacing: b.letterSpacing }], opt));
      }
      const oB = o.querySelector('.hp-box'), nB = n.querySelector('.hp-box');
      if (oB && nB) {
        const a = getComputedStyle(oB), b = getComputedStyle(nB);
        anims.push(nB.animate([{ backgroundColor: a.backgroundColor, borderRadius: a.borderRadius }, { backgroundColor: b.backgroundColor, borderRadius: b.borderRadius }], opt));
      }
    });
    const matched = new Set(pairs.map((p) => p[1]));
    news.filter((n) => !matched.has(n)).forEach((n) => anims.push(n.animate([{ opacity: 0 }, { opacity: getComputedStyle(n).opacity }], { duration: D * 0.6, delay: D * 0.4, easing: 'ease-out', fill: 'backwards' })));
    olds.filter((o) => !used.has(o)).forEach((o) => anims.push(o.animate([{ opacity: getComputedStyle(o).opacity }, { opacity: 0 }], { duration: D * 0.5, easing: 'ease-in', fill: 'forwards' })));
    // 배경 교차 페이드
    const bgSaved = newEl.style.background;
    const bgLayer = document.createElement('div');
    bgLayer.className = 'hp-morphbg';
    bgLayer.style.background = bgSaved;
    newEl.style.background = 'transparent';
    newEl.insertBefore(bgLayer, newEl.firstChild);
    anims.push(bgLayer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D, easing: 'ease' }));
    newEl.querySelectorAll(':scope > .hp-bgvideo, :scope > .hp-bgoverlay, :scope > .hp-bgfx').forEach((x) => anims.push(x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D })));
    return Promise.all(anims.map((x) => x.finished.catch(() => {}))).then(() => {
      bgLayer.remove();
      newEl.style.background = bgSaved;
      anims.forEach((x) => x.cancel());
    });
  }

  function playTransition(oldEl, newEl, type, dir, duration) {
    if (type === 'morph' && oldEl) return morphTransition(oldEl, newEl, duration);
    const def = TRANSITIONS[type];
    if (!def || !def.f || !oldEl) return Promise.resolve();
    const kf = def.f(dir);
    const opt = { duration: duration || 700, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'both' };
    const anims = [newEl.animate(kf.in, opt)];
    if (kf.out) anims.push(oldEl.animate(kf.out, opt));
    return Promise.all(anims.map((x) => x.finished.catch(() => {}))).then(() => anims.forEach((x) => x.cancel()));
  }

  /* ------------------------------------------------------------------ */
  /* 발표 플레이어                                                        */
  /* ------------------------------------------------------------------ */
  class Presenter {
    constructor(root, deck, options) {
      this.root = root;
      this.deck = deck;
      this.o = Object.assign({ start: 0, resolve: (s) => s, editable: false, standalone: false }, options || {});
      // 내보낸 HTML: 주소 끝 #18 이면 18번 슬라이드부터 (새로고침해도 그 장 유지)
      if (this.o.standalone) { const m = String(location.hash).match(/^#(\d+)$/); if (m) this.o.start = Math.max(0, Math.min(deck.slides.length - 1, +m[1] - 1)); }
      this.idx = -1;
      this.step = 0;
      this.groups = [];
      this.cur = null;
      this.busy = false;
      this.auto = false;
      this.autoTimer = null;
      this.startedAt = Date.now();
      this.editMode = false;
      this.laser = false;
      this.recorder = null;
      this._bgmPlayers = [];
      this.bgmMuted = false;
      this._ducked = false;
      this._build();
      this._onKey = this._onKey.bind(this);
      this._onResize = this._fit.bind(this);
      // 3D 그리기 장치를 다시 만들었으면 지금 슬라이드를 새로 그린다 (빈 3D 화면 복구)
      this._on3dReset = () => { if (this.cur && this.cur.querySelector('model-viewer')) this.go(this.idx, this.step, true); };
      document.addEventListener('hp-3d-reset', this._on3dReset);
      this._watchScreens();
      document.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      // 슬라이드에 넣은 웹페이지(embed)가 발표를 넘길 수 있게 한다: postMessage({ type: 'hppt-nav', action: 'next' | 'prev' })
      // 지금 보이는 슬라이드 안의 iframe 이 보낸 메시지만 받는다
      this._onMsg = (e) => {
        const d = e.data;
        if (!d || d.type !== 'hppt-nav' || !this.cur) return;
        const fromHere = [...this.cur.querySelectorAll('iframe')].some((f) => f.contentWindow === e.source);
        if (!fromHere) return;
        if (d.action === 'next') this.next();
        else if (d.action === 'prev') this.prev();
      };
      window.addEventListener('message', this._onMsg);
      this._onHash = () => { const m = String(location.hash).match(/^#(\d+)$/); if (m && +m[1] - 1 !== this.idx) this.go(Math.max(0, Math.min(this.deck.slides.length - 1, +m[1] - 1)), 0); };
      if (this.o.standalone) window.addEventListener('hashchange', this._onHash);
      this._fit();
      this.go(this.o.start, 0, true);
      this._clock = setInterval(() => this._tick(), 1000);
      if (this.o.loop) this.startLoop(this.o.loop);
      else if (this.o.autoplay) this.toggleAuto(true);
    }

    /* ---------- 서브 모니터 실시간 감지 ----------
       모니터를 꽂거나 빼면 바로 알아채서, 발표 화면을 서브 모니터 전체화면으로 옮긴다.
       브라우저가 클릭 없이 옮기는 것을 막으면 '서브 모니터로 옮기기' 버튼(또는 F 키) 한 번으로 옮긴다. */
    _watchScreens() {
      this._extended = !!window.screen.isExtended;
      this._onScreens = () => this._screensChanged();
      if (window.screen.addEventListener) window.screen.addEventListener('change', this._onScreens);
      // 창 관리 권한이 이미 있으면 모니터 목록 변화도 직접 듣는다 (권한 요청 창은 띄우지 않음)
      if (window.getScreenDetails && navigator.permissions) {
        navigator.permissions.query({ name: 'window-management' }).then((st) => {
          if (st.state !== 'granted' || this._exited) return;
          return window.getScreenDetails().then((sd) => { if (this._sd || this._exited) return; this._sd = sd; sd.addEventListener('screenschange', this._onScreens); });
        }).catch(() => {});
      }
    }
    _unwatchScreens() {
      if (window.screen.removeEventListener) window.screen.removeEventListener('change', this._onScreens);
      if (this._sd) this._sd.removeEventListener('screenschange', this._onScreens);
    }
    _screensChanged() {
      clearTimeout(this._scrT);
      // 연결 직후에는 화면 정보가 여러 번 바뀌므로 잠시 기다렸다가 판단
      this._scrT = setTimeout(async () => {
        if (this._exited) return;
        const ext = !!window.screen.isExtended;
        const was = this._extended;
        this._extended = ext;
        const mv = this.el.querySelector('.hp-move');
        if (ext && (!was || !this._onSub())) {
          // 창 관리 권한이 아직 없으면 자동으로 옮길 수 없다(권한 창은 클릭으로만) → 버튼을 바로 보여 준다
          let granted = false;
          try { granted = (await navigator.permissions.query({ name: 'window-management' })).state === 'granted'; } catch (e) { /* 미지원 */ }
          const moved = granted && await Promise.race([this.enterFullscreen({ quiet: true }), new Promise((r) => setTimeout(() => r(false), 2500))]);
          if (moved) { mv.hidden = true; this._toast('서브 모니터로 발표 화면을 옮겼습니다'); }
          else mv.hidden = false;
        } else if (!ext && was) {
          mv.hidden = true;
          this._fsScreen = null;
          this._toast('서브 모니터 연결이 끊겼습니다 — F 키를 누르면 이 화면에서 전체화면으로 발표합니다');
        }
      }, 700);
    }
    // 지금 발표 화면이 서브 모니터 전체화면인지
    _onSub() { return !!(document.fullscreenElement && this._fsScreen && !this._fsScreen.isPrimary); }

    /* ---------- 반복 재생 (광고·대기 화면) ---------- */
    // opts: { range: '1-5' | [시작, 끝](0부터), seconds }
    startLoop(opts) {
      opts = opts === true ? {} : (opts || {});
      const n = this.deck.slides.length;
      let a = 0, b = n - 1;
      if (Array.isArray(opts.range)) { a = opts.range[0]; b = opts.range[1]; }
      else if (opts.range) { const m = String(opts.range).match(/(\d+)\s*(?:[-~]\s*(\d+))?/); if (m) { a = +m[1] - 1; b = m[2] ? +m[2] - 1 : n - 1; } }
      a = Math.max(0, Math.min(n - 1, a)); b = Math.max(a, Math.min(n - 1, b));
      this.loopRange = [a, b];
      if (opts.seconds) this.o.autoDuration = +opts.seconds;
      this.el.classList.add('hp-looping');
      if (this.idx !== a) this.go(a, 0, true);
      this.auto = true;
      this._toast(`반복 재생: ${a + 1}–${b + 1}번 슬라이드 (Esc 종료)`);
      this._updateUI();
      this._scheduleAuto();
    }

    /* ---------- 돋보기 ---------- */
    toggleZoom(on) {
      this._zoomOn = on == null ? !this._zoomOn : on;
      if (!this._zoomOn) this._unzoom();
      this.el.classList.toggle('hp-zoom-armed', !!this._zoomOn);
      if (this._zoomOn) this._toast('확대할 곳을 클릭하세요 (휠: 배율, 다시 클릭: 원래대로)');
      this._updateUI();
    }
    _zoomClick(e) {
      if (this._zoomed) { this.toggleZoom(false); return; }
      this._zoomed = true;
      this._zoomLevel = this._zoomLevel || 2.5;
      this.viewport.style.transformOrigin = `${e.clientX}px ${e.clientY}px`;
      this.viewport.classList.add('hp-zooming');
      this.viewport.style.transform = `scale(${this._zoomLevel})`;
      this.el.classList.add('hp-zoomed');
    }
    _zoomBy(f) {
      this._zoomLevel = Math.max(1.5, Math.min(6, (this._zoomLevel || 2.5) * f));
      this.viewport.style.transform = `scale(${this._zoomLevel})`;
    }
    _unzoom() {
      if (!this._zoomed) return;
      this._zoomed = false;
      this.viewport.style.transform = '';
      this.el.classList.remove('hp-zoomed');
      setTimeout(() => { if (!this._zoomed) { this.viewport.classList.remove('hp-zooming'); this.viewport.style.transformOrigin = ''; } }, 400);
    }

    /* ---------- 전체 보기 (모든 슬라이드 격자) ---------- */
    toggleOverview(on) {
      on = on == null ? !this._ov : on;
      if (!on) {
        if (this._ov) { this._ov.remove(); this._ov = null; this._updateUI(); }
        return;
      }
      if (this._ov || !this.el) return;
      if (this._zoomOn) this.toggleZoom(false);
      const deck = this.deck, n = deck.slides.length;
      const ov = document.createElement('div');
      ov.className = 'hp-ov';
      const vw = window.innerWidth;
      const cols = n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : n <= 30 ? 5 : 6;
      const tw = Math.max(150, Math.min(360, Math.floor((vw - 80 - (cols - 1) * 18) / cols)));
      const sc = tw / deck.width, th = Math.round(deck.height * sc);
      ov.innerHTML = `<div class="hp-ov-head"><b>전체 보기</b><span>${n}장 · 클릭 또는 방향키+Enter 로 이동 · Esc/G 닫기</span></div><div class="hp-ov-grid" style="grid-template-columns:repeat(${cols},${tw}px)"></div>`;
      const grid = ov.querySelector('.hp-ov-grid');
      deck.slides.forEach((s, i) => {
        const c = document.createElement('div');
        c.className = 'hp-ov-cell' + (i === this.idx ? ' cur sel' : '');
        c.dataset.i = i;
        c.style.width = tw + 'px'; c.style.height = th + 'px';
        const r = renderSlide(deck, s, { mode: 'thumb', resolve: this.o.resolve });
        r.style.transform = `scale(${sc})`; r.style.transformOrigin = '0 0';
        c.appendChild(r);
        const t = s.elements.find((e) => e.role === 'title' && e.html);
        const lab = document.createElement('span');
        lab.className = 'hp-ov-num';
        lab.textContent = (i + 1) + (t ? '  ' + t.html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) : '');
        c.appendChild(lab);
        grid.appendChild(c);
      });
      ov.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = e.target.closest('.hp-ov-cell');
        if (c) this._ovGo(+c.dataset.i);
        else if (!e.target.closest('.hp-ov-grid')) this.toggleOverview(false);
      });
      ov.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
      this.el.appendChild(ov);
      this._ov = ov;
      this._ovSel = this.idx;
      this._ovCols = cols;
      const cur = ov.querySelector('.hp-ov-cell.cur');
      if (cur) cur.scrollIntoView({ block: 'center' });
      this._updateUI();
    }
    _ovGo(i) {
      this.toggleOverview(false);
      if (i !== this.idx) this.go(i, 0); else this._toast('지금 슬라이드입니다');
    }
    _ovKey(e) {
      const k = e.key, n = this.deck.slides.length;
      let s = this._ovSel;
      if (k === 'Escape' || k === 'g' || k === 'G' || k === 'o' || k === 'O') { e.preventDefault(); this.toggleOverview(false); return; }
      if (k === 'Enter' || k === ' ') { e.preventDefault(); this._ovGo(s); return; }
      if (k === 'ArrowRight') s++; else if (k === 'ArrowLeft') s--;
      else if (k === 'ArrowDown') s += this._ovCols; else if (k === 'ArrowUp') s -= this._ovCols;
      else if (k === 'Home') s = 0; else if (k === 'End') s = n - 1;
      else return;
      e.preventDefault();
      this._ovSel = Math.max(0, Math.min(n - 1, s));
      this._ov.querySelectorAll('.hp-ov-cell').forEach((c) => c.classList.toggle('sel', +c.dataset.i === this._ovSel));
      const c = this._ov.querySelector('.hp-ov-cell.sel');
      if (c) c.scrollIntoView({ block: 'nearest' });
    }

    _build() {
      const r = document.createElement('div');
      r.className = 'hp-pres';
      r.innerHTML = `
        <div class="hp-viewport"><div class="hp-frame"></div></div>
        <div class="hp-blank"></div>
        <div class="hp-laser"></div>
        <div class="hp-notes" hidden></div>
        <div class="hp-goto" hidden></div>
        <div class="hp-toast"></div>
        <div class="hp-move" hidden><span>서브 모니터가 연결되었습니다</span><button>🖥 서브 모니터로 옮기기</button><button data-x>✕</button></div>
        <div class="hp-controls">
          <button data-a="prev" title="이전 (←)">◀</button>
          <span class="hp-count"></span>
          <button data-a="next" title="다음 (→, Space)">▶</button>
          <span class="hp-sep"></span>
          <button data-a="auto" title="자동 재생 (A)">⏵ 자동</button>
          <button data-a="rec" title="화면 녹화 → 동영상 저장 (R)">● 녹화</button>
          <button data-a="bgm" title="배경음악 켜기/끄기 (M)" hidden>🎵 음악</button>
          <button data-a="pv" title="발표자 보기 창 (P) — 현재·다음 슬라이드, 노트, 타이머">🖥 발표자 보기</button>
          <button data-a="notes" title="발표자 노트 (N)">노트</button>
          <button data-a="laser" title="레이저 포인터 (L)">레이저</button>
          <button data-a="ov" title="전체 보기 (G) — 모든 슬라이드를 한눈에 보고 골라서 이동">▦ 전체</button>
          <button data-a="zoom" title="돋보기 (Z) — 누른 뒤 확대할 곳을 클릭, 휠로 배율, 다시 클릭하면 원래대로">🔍 확대</button>
          ${this.o.editable ? '<button data-a="edit" title="화면에서 텍스트 바로 수정 (E)">✎ 편집</button>' : ''}
          <button data-a="full" title="전체화면 (F)">⛶</button>
          <span class="hp-timer">00:00</span>
          ${this.o.standalone ? '' : '<button data-a="exit" title="종료 (Esc)">✕ 종료</button>'}
          <div class="hp-progress"><div></div></div>
        </div>`;
      this.root.appendChild(r);
      this.el = r;
      this.viewport = r.querySelector('.hp-viewport');
      this.frame = r.querySelector('.hp-frame');
      this.frame.style.width = this.deck.width + 'px';
      this.frame.style.height = this.deck.height + 'px';
      r.querySelector('.hp-controls').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        e.stopPropagation();
        if (!b) {
          const p = e.target.closest('.hp-progress');
          if (p) { const rc = p.getBoundingClientRect(); this.go(Math.floor((e.clientX - rc.left) / rc.width * this.deck.slides.length), 0); }
          return;
        }
        const a = b.dataset.a;
        if (a === 'prev') this.prev();
        else if (a === 'next') this.next();
        else if (a === 'auto') this.toggleAuto();
        else if (a === 'rec') this.toggleRecord();
        else if (a === 'notes') this.toggleNotes();
        else if (a === 'pv') this.openPresenterView();
        else if (a === 'bgm') this.toggleMusic();
        else if (a === 'laser') this.toggleLaser();
        else if (a === 'zoom') this.toggleZoom();
        else if (a === 'ov') this.toggleOverview();
        else if (a === 'edit') this.toggleEdit();
        else if (a === 'full') this.toggleFull();
        else if (a === 'exit') this.exit();
      });
      this.viewport.addEventListener('click', (e) => {
        this._bgmRetry();
        if (this.editMode) return;
        if (this._zoomOn) { this._zoomClick(e); return; }
        const act = e.target.closest('.hp-el[data-action]');
        if (act && act.querySelector('.hp-anim').style.visibility !== 'hidden') { this._runAction(act); return; }
        if (e.target.closest('.hp-fv-close, .hp-fv-back')) return;
        const cf = e.target.closest('.hp-el[data-clickfull]');
        if (cf && !cf.classList.contains('hp-fv-open') && cf.querySelector('.hp-anim').style.visibility !== 'hidden') { this._openFullVideo(cf); return; }
        if (cf) return;
        if (e.target.closest('video[controls], iframe, a, [data-model3d]')) return;
        this.next();
      });
      this.viewport.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!this.editMode) this.prev(); });
      let wheelLock = 0;
      this.viewport.addEventListener('wheel', (e) => {
        if (this._zoomed) { this._zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); return; }
        if (this.editMode || Date.now() < wheelLock) return;
        if (e.target.closest && e.target.closest('model-viewer:not([disable-zoom])')) return; // 3D 모델 확대/축소
        wheelLock = Date.now() + 450;
        if (e.deltaY > 0) this.next(); else if (e.deltaY < 0) this.prev();
      }, { passive: true });
      const laser = r.querySelector('.hp-laser');
      let hideT;
      r.addEventListener('mousemove', (e) => {
        if (this.laser) { laser.style.left = e.clientX + 'px'; laser.style.top = e.clientY + 'px'; }
        if (this._zoomed) this.viewport.style.transformOrigin = `${e.clientX}px ${e.clientY}px`;
        r.classList.add('hp-show-ui');
        clearTimeout(hideT);
        hideT = setTimeout(() => r.classList.remove('hp-show-ui'), 2200);
      });
      const mv = r.querySelector('.hp-move');
      mv.addEventListener('click', (e) => {
        e.stopPropagation();
        mv.hidden = true;
        if (!e.target.closest('[data-x]') && e.target.closest('button')) this.enterFullscreen();
      });
      this.frame.addEventListener('focusout', (e) => {
        const t = e.target.closest && e.target.closest('.hp-tc');
        if (!t || !this.editMode) return;
        const id = t.closest('.hp-el').dataset.id;
        const slide = this.deck.slides[this.idx];
        const el = slide.elements.find((x) => x.id === id);
        if (el && el.html !== t.innerHTML) {
          el.html = t.innerHTML;
          if (this.o.onEdit) this.o.onEdit(slide.id, id, t.innerHTML);
          this._toast('수정 내용이 저장되었습니다');
        }
      });
    }

    _fit() {
      const vw = this.viewport.clientWidth || window.innerWidth, vh = this.viewport.clientHeight || window.innerHeight;
      const s = Math.min(vw / this.deck.width, vh / this.deck.height);
      this.scale = s;
      this.frame.style.transform = `translate(${(vw - this.deck.width * s) / 2}px, ${(vh - this.deck.height * s) / 2}px) scale(${s})`;
    }

    _toast(msg) {
      const t = this.el.querySelector('.hp-toast');
      t.textContent = msg;
      t.classList.add('on');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove('on'), 1800);
    }

    /* ---------- 발표자 보기 (별도 창) ---------- */
    openPresenterView() {
      if (this.pv && !this.pv.closed) { this.pv.focus(); return; }
      const sc = this._pvScreen; // 서브 모니터로 발표 중이면 원래 모니터를 가득 채운다
      const w = window.open('', 'hp-presenter-view', sc
        ? `popup,left=${sc.availLeft},top=${sc.availTop},width=${sc.availWidth},height=${sc.availHeight}`
        : 'width=1280,height=800');
      if (!w) { this._toast('팝업이 차단되었습니다 — 주소창 오른쪽에서 팝업을 허용하세요 (P 키로 다시 열기)'); return; }
      if (sc) { try { w.moveTo(sc.availLeft, sc.availTop); w.resizeTo(sc.availWidth, sc.availHeight); } catch (e) {} }
      this.pv = w;
      const d = w.document;
      d.open();
      d.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>발표자 보기</title></head><body></body></html>');
      d.close();
      document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => { if (/fonts\.googleapis/.test(l.href)) { const c = d.createElement('link'); c.rel = 'stylesheet'; c.href = l.href; d.head.appendChild(c); } });
      const st = d.createElement('style');
      st.textContent = CSS + PV_CSS;
      d.head.appendChild(st);
      d.body.innerHTML = `
        <div class="pv">
          <header class="pv-top"><b class="pv-title"></b><span class="pv-count"></span><span class="pv-step"></span><span class="pv-sp"></span>
            <button data-a="music" class="pv-music" title="배경음악 켜기/끄기 (M)" hidden></button><span class="pv-timer" title="경과 시간">00:00</span><button data-a="reset" title="타이머 초기화">⟲</button><span class="pv-clock" title="현재 시각"></span></header>
          <main class="pv-main">
            <section class="pv-cur"><div class="pv-label">현재 화면</div><div class="pv-view" data-v="cur"></div></section>
            <aside class="pv-side">
              <div class="pv-label pv-next-label">다음</div><div class="pv-view" data-v="next"></div>
              <div class="pv-notes-head"><span>발표자 노트</span><span class="pv-sp"></span><button data-a="fminus" title="노트 글자 작게">A−</button><button data-a="fplus" title="노트 글자 크게">A+</button></div>
              <div class="pv-notes"></div>
            </aside>
          </main>
          <footer class="pv-bottom">
            <button data-a="prev">◀ 이전</button><button data-a="next" class="primary">다음 ▶</button>
            <button data-a="black" title="B">검은 화면</button><button data-a="end">발표 종료</button>
            <div class="pv-strip"></div>
          </footer>
        </div>`;
      let fsz = 22;
      try { fsz = +localStorage.getItem('hppt.pvFont') || 22; } catch (e) { /* ignore */ }
      this._pvFont = fsz;
      d.body.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-a]');
        if (b) {
          const a = b.dataset.a;
          if (a === 'next') this.next();
          else if (a === 'prev') this.prev();
          else if (a === 'black') this._blank('#000');
          else if (a === 'end') this.exit();
          else if (a === 'music') this.toggleMusic();
          else if (a === 'reset') { this.startedAt = Date.now(); this._tick(); }
          else if (a === 'fplus' || a === 'fminus') {
            this._pvFont = Math.max(12, Math.min(48, this._pvFont + (a === 'fplus' ? 2 : -2)));
            try { localStorage.setItem('hppt.pvFont', this._pvFont); } catch (er) { /* ignore */ }
            d.querySelector('.pv-notes').style.fontSize = this._pvFont + 'px';
          }
          return;
        }
        const t = e.target.closest('.pv-thumb');
        if (t) this.go(+t.dataset.i, 0);
      });
      d.addEventListener('keydown', (e) => this._onKey(e));
      w.addEventListener('resize', () => this._pvRender(true));
      w.addEventListener('beforeunload', () => { this.pv = null; });
      this._pvStrip();
      this._pvRender(true);
      this._tick();
    }

    _pvView(container, slide, step) {
      const deck = this.deck;
      const w = container.clientWidth || 400;
      const sc = w / deck.width;
      container.innerHTML = '';
      container.style.height = Math.round(deck.height * sc) + 'px';
      const el = renderSlide(deck, slide, { mode: 'thumb', resolve: this.o.resolve });
      el.style.transform = `scale(${sc})`;
      el.style.transformOrigin = '0 0';
      container.appendChild(el);
      applyState(el, slide, deck, step);
      el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    }

    _pvStrip() {
      const d = this.pv && !this.pv.closed && this.pv.document;
      if (!d) return;
      const strip = d.querySelector('.pv-strip');
      strip.innerHTML = '';
      const deck = this.deck, tw = 112, sc = tw / deck.width;
      deck.slides.forEach((s, i) => {
        const b = d.createElement('div');
        b.className = 'pv-thumb';
        b.dataset.i = i;
        b.style.width = tw + 'px';
        b.style.height = Math.round(deck.height * sc) + 'px';
        const r = renderSlide(deck, s, { mode: 'thumb', resolve: this.o.resolve });
        r.style.transform = `scale(${sc})`;
        r.style.transformOrigin = '0 0';
        b.appendChild(r);
        const n = d.createElement('span');
        n.textContent = i + 1;
        b.appendChild(n);
        strip.appendChild(b);
      });
    }

    _pvRender() {
      const w = this.pv;
      if (!w || w.closed) return;
      const d = w.document;
      const deck = this.deck, slide = deck.slides[this.idx];
      if (!slide || !d.querySelector('.pv')) return;
      d.title = '발표자 보기 — ' + (deck.title || '');
      d.querySelector('.pv-title').textContent = deck.title || '';
      d.querySelector('.pv-count').textContent = `슬라이드 ${this.idx + 1} / ${deck.slides.length}`;
      const mu = d.querySelector('.pv-music');
      if (mu) {
        const curP = this._bgmPlayers.find((x) => !x.leaving);
        mu.hidden = !(deck.bgm && deck.bgm.tracks && deck.bgm.tracks.length);
        mu.textContent = (this.bgmMuted ? '🔇 ' : '🎵 ') + (curP ? curP.track.title || '배경음악' : '음악 없음');
      }
      const min = this.groups[0] && this.groups[0].auto ? 1 : 0;
      const clicks = this.groups.length - min, done = Math.max(0, this.step - min);
      d.querySelector('.pv-step').textContent = clicks > 0 ? `애니메이션 ${done} / ${clicks}` : '';
      this._pvView(d.querySelector('[data-v="cur"]'), slide, this.step);
      const nextBox = d.querySelector('[data-v="next"]'), nl = d.querySelector('.pv-next-label');
      if (this.step < this.groups.length) {
        nl.textContent = `다음: 이 슬라이드의 애니메이션 (${done + 1}/${clicks})`;
        this._pvView(nextBox, slide, this.step + 1);
      } else if (this.idx < deck.slides.length - 1) {
        const ns = deck.slides[this.idx + 1];
        const g = buildGroups(ns);
        const tr = ns.transition && ns.transition.type && ns.transition.type !== 'none' ? ' · ' + (TRANSITIONS[ns.transition.type] || {}).label : '';
        nl.textContent = `다음 슬라이드 #${this.idx + 2}${tr}`;
        this._pvView(nextBox, ns, g[0] && g[0].auto ? 1 : 0);
      } else {
        nl.textContent = '마지막 슬라이드입니다';
        nextBox.innerHTML = '<div class="pv-end">끝</div>';
        nextBox.style.height = '';
      }
      const notes = d.querySelector('.pv-notes');
      notes.style.fontSize = (this._pvFont || 22) + 'px';
      notes.innerHTML = slide.notes ? esc(slide.notes).replace(/\n/g, '<br>') : '<i class="pv-none">이 슬라이드에는 노트가 없습니다</i>';
      d.querySelectorAll('.pv-thumb').forEach((t) => t.classList.toggle('on', +t.dataset.i === this.idx));
      const on = d.querySelector('.pv-thumb.on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    _pvTick(s) {
      const w = this.pv;
      if (!w || w.closed) return;
      const d = w.document;
      const t = d.querySelector('.pv-timer'), c = d.querySelector('.pv-clock');
      if (t) t.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      if (c) c.textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }

    // 발표 중 덱이 바뀌었을 때 (실시간 연동)
    setDeck(deck) {
      this.deck = deck;
      this.frame.style.width = deck.width + 'px';
      this.frame.style.height = deck.height + 'px';
      this._fit();
      this.busy = false;
      this.go(Math.min(Math.max(0, this.idx), deck.slides.length - 1), 'end', true);
      this._pvStrip();
      this._pvRender();
      this._bgmSync();
    }

    /* ---------- 배경음악 ---------- */
    // 슬라이드마다 slide.music = 곡 id. 같은 곡이 이어지면 계속 재생, 바뀌면 크로스페이드, 없으면 페이드아웃
    _bgmTrackFor(i) {
      const b = this.deck.bgm;
      if (!b || !b.tracks || !b.tracks.length) return null;
      const s = this.deck.slides[i];
      if (!s || !s.music) return null;
      return b.tracks.find((t) => t.id === s.music) || null;
    }

    _bgmLevel(tr) {
      const v = tr && tr.volume != null ? +tr.volume : 0.7;
      return this.bgmMuted ? 0 : Math.max(0, Math.min(1, v)) * (this._ducked ? 0.22 : 1);
    }

    // 볼륨 페이드 (타이머 사용 → 발표 창이 가려져 있어도 진행)
    _fade(p, to, ms, done) {
      clearTimeout(p.tm);
      const from = p.audio.volume, t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
        p.audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) p.tm = setTimeout(step, 40);
        else if (done) done();
      };
      step();
    }

    _bgmSync() {
      const tr = this._bgmTrackFor(this.idx);
      const cur = this._bgmPlayers.find((x) => !x.leaving);
      if (cur && tr && cur.track.id === tr.id) { cur.track = tr; this._fade(cur, this._bgmLevel(tr), 500); this._updateBgmUI(); return; }
      const b = this.deck.bgm || {};
      const fo = (b.fadeOut != null ? +b.fadeOut : 2) * 1000, fi = (b.fadeIn != null ? +b.fadeIn : 1.5) * 1000;
      this._bgmPlayers.forEach((x) => { if (!x.leaving) { x.leaving = true; this._fade(x, 0, fo, () => this._bgmDrop(x)); } });
      if (!tr) { this._updateBgmUI(); return; }
      const src = this.o.resolve(tr.src);
      if (!src) return;
      const a = new Audio();
      a.src = src;
      a.loop = tr.loop !== false;
      a.preload = 'auto';
      a.volume = 0;
      if (tr.start) { try { a.currentTime = +tr.start; } catch (e) { /* ignore */ } }
      const pl = { audio: a, track: tr };
      this._bgmPlayers.push(pl);
      if (this._recMix) this._recConnect(a);
      const pr = a.play();
      if (pr && pr.catch) pr.catch(() => { if (!this._bgmBlocked) this._toast('🎵 배경음악을 들으려면 화면을 한 번 클릭하세요'); this._bgmBlocked = true; });
      this._fade(pl, this._bgmLevel(tr), fi);
      this._updateBgmUI();
    }

    _bgmDrop(x) {
      try { x.audio.pause(); } catch (e) { /* ignore */ }
      x.audio.removeAttribute('src');
      try { x.audio.load(); } catch (e) { /* ignore */ }
      this._bgmPlayers = this._bgmPlayers.filter((y) => y !== x);
    }

    _bgmRetry() {
      if (!this._bgmBlocked) return;
      this._bgmBlocked = false;
      this._bgmPlayers.forEach((x) => { if (!x.leaving) x.audio.play().catch(() => { this._bgmBlocked = true; }); });
    }

    _bgmStopAll(ms) {
      this._bgmPlayers.forEach((x) => { x.leaving = true; this._fade(x, 0, ms || 400, () => this._bgmDrop(x)); });
    }

    _recomputeDuck() {
      const b = this.deck.bgm;
      const vids = this.cur ? Array.from(this.cur.querySelectorAll('video:not(.hp-bgvideo)')) : [];
      const on = !!(b && b.duck !== false) && vids.some((v) => !v.paused && !v.muted && v.volume > 0);
      if (on === this._ducked) return;
      this._ducked = on;
      this._bgmPlayers.forEach((x) => { if (!x.leaving) this._fade(x, this._bgmLevel(x.track), 600); });
    }

    toggleMusic() {
      if (!(this.deck.bgm && this.deck.bgm.tracks && this.deck.bgm.tracks.length)) { this._toast('배경음악이 설정되지 않았습니다'); return; }
      this.bgmMuted = !this.bgmMuted;
      this._bgmRetry();
      this._bgmPlayers.forEach((x) => { if (!x.leaving) this._fade(x, this._bgmLevel(x.track), 500); });
      this._toast(this.bgmMuted ? '🔇 배경음악 끔' : '🎵 배경음악 켬');
      this._updateBgmUI();
    }

    _updateBgmUI() {
      this._updateUI();
    }

    // 녹화: 화면 공유에 소리가 없으면 배경음악·동영상 소리를 직접 섞어 넣는다
    _recConnect(el) {
      if (!this._recMix || !el) return;
      try {
        if (!el._hpSrc) {
          el._hpSrc = this._recMix.ctx.createMediaElementSource(el);
          el._hpSrc.connect(this._recMix.ctx.destination);
        }
        el._hpSrc.connect(this._recMix.dest);
      } catch (e) { /* 다른 출처 미디어 등 */ }
    }

    _runAction(w) {
      const slide = this.deck.slides[this.idx];
      const el = slide.elements.find((x) => x.id === w.dataset.id);
      if (!el) return;
      let a = el.action;
      if ((!a || !a.type || a.type === 'none') && el.link) {
        const m = String(el.link).match(/^#slide-(\d+)$/);
        a = m ? { type: 'goto', slide: +m[1] } : { type: 'url', url: el.link };
      }
      if (!a) return;
      const target = a.target && this.cur.querySelector(`.hp-el[data-id="${a.target}"]`);
      const tNode = target && target.querySelector('.hp-anim');
      switch (a.type) {
        case 'next': this.next(); break;
        case 'prev': this.prev(); break;
        case 'first': this.go(0, 0); break;
        case 'last': this.go(this.deck.slides.length - 1, 0); break;
        case 'goto': this.go(Math.max(0, Math.min(this.deck.slides.length - 1, (+a.slide || 1) - 1)), 0); break;
        case 'url': if (a.url || el.link) window.open(a.url || el.link, '_blank', 'noopener'); break;
        case 'show': if (tNode) this._reveal(tNode); break;
        case 'hide': if (tNode) this._conceal(tNode); break;
        case 'toggle': if (tNode) { if (tNode.style.visibility === 'hidden') this._reveal(tNode); else this._conceal(tNode); } break;
        case 'play': {
          const v = (target || w).querySelector('video');
          if (v) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
          break;
        }
        case 'answer': {
          this._feedback(w, !!a.correct);
          if (tNode && a.correct) setTimeout(() => this._reveal(tNode), 500);
          break;
        }
        default: break;
      }
    }

    _reveal(n) {
      if (n.style.visibility !== 'hidden') return;
      n.style.visibility = '';
      n.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      if (n.parentNode.classList.contains('hp-type-chart')) animateChart(n.parentNode, 100);
      if (n.parentNode.classList.contains('hp-type-text') && /\d/.test(n.textContent) && n.parentNode.dataset.countup) countUp(n, 1200, 0);
    }

    _conceal(n) {
      if (n.style.visibility === 'hidden') return;
      const an = n.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.92)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
      an.onfinish = () => { n.style.visibility = 'hidden'; an.cancel(); };
    }

    _feedback(w, ok) {
      const n = w.querySelector('.hp-anim');
      const badge = document.createElement('div');
      badge.className = 'hp-fb ' + (ok ? 'ok' : 'no');
      badge.textContent = ok ? '✓ 정답!' : '✕ 다시 생각해 보세요';
      w.appendChild(badge);
      badge.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.5)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1)', offset: 0.6 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 420, easing: 'ease-out' });
      setTimeout(() => { const f = badge.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); f.onfinish = () => badge.remove(); }, 1500);
      if (ok) {
        n.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.4) saturate(1.4)' }, { filter: 'brightness(1)' }], { duration: 700 });
        const sl = this.deck.slides[this.idx].elements.find((x) => x.id === w.dataset.id);
        if (sl) this.confetti(sl.x + sl.w / 2, sl.y + sl.h / 2);
      } else {
        n.animate([0, -16, 16, -12, 12, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 500 });
      }
    }

    confetti(x, y) {
      if (!this.cur) return;
      const colors = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#845ef7', '#f783ac', '#ff922b'];
      const layer = document.createElement('div');
      layer.className = 'hp-confetti';
      this.cur.appendChild(layer);
      const H = this.deck.height;
      for (let i = 0; i < 90; i++) {
        const p = document.createElement('i');
        const s = 10 + Math.random() * 14;
        Object.assign(p.style, { left: x + 'px', top: y + 'px', width: s + 'px', height: s * (Math.random() < 0.5 ? 0.45 : 1) + 'px', background: colors[i % colors.length], borderRadius: Math.random() < 0.3 ? '50%' : '2px' });
        layer.appendChild(p);
        const ang = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 550;
        const dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp - 300;
        p.animate([
          { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${dx * 1.3}px, ${dy + H * 0.9}px) rotate(${Math.random() * 1440}deg)`, opacity: 0 },
        ], { duration: 1800 + Math.random() * 900, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
      }
      setTimeout(() => layer.remove(), 3000);
    }

    _tick() {
      const s = Math.floor((Date.now() - this.startedAt) / 1000);
      this.el.querySelector('.hp-timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      this._pvTick(s);
    }

    _updateUI() {
      const n = this.deck.slides.length;
      this.el.querySelector('.hp-count').textContent = `${this.idx + 1} / ${n}`;
      this.el.querySelector('.hp-progress div').style.width = ((this.idx + 1) / n * 100) + '%';
      const notes = this.el.querySelector('.hp-notes');
      const slide = this.deck.slides[this.idx];
      notes.innerHTML = slide && slide.notes ? esc(slide.notes).replace(/\n/g, '<br>') : '<i>노트 없음</i>';
      this.el.querySelector('[data-a="auto"]').classList.toggle('on', this.auto);
      this.el.querySelector('[data-a="rec"]').classList.toggle('on', !!this.recorder);
      this.el.querySelector('[data-a="laser"]').classList.toggle('on', this.laser);
      this.el.querySelector('[data-a="zoom"]').classList.toggle('on', !!this._zoomOn);
      this.el.querySelector('[data-a="ov"]').classList.toggle('on', !!this._ov);
      const eb = this.el.querySelector('[data-a="edit"]');
      if (eb) eb.classList.toggle('on', this.editMode);
      const mb = this.el.querySelector('[data-a="bgm"]');
      if (mb) {
        const has = !!(this.deck.bgm && this.deck.bgm.tracks && this.deck.bgm.tracks.length);
        mb.hidden = !has;
        const cur = this._bgmPlayers.find((x) => !x.leaving);
        mb.classList.toggle('on', !!cur && !this.bgmMuted);
        mb.textContent = this.bgmMuted ? '🔇 음악' : '🎵 음악';
        mb.title = (cur ? '지금: ' + (cur.track.title || '배경음악') + ' — ' : '') + '배경음악 켜기/끄기 (M)';
      }
      const pb = this.el.querySelector('[data-a="pv"]');
      if (pb) pb.classList.toggle('on', !!(this.pv && !this.pv.closed));
      this._pvRender();
    }

    _startMedia(slideEl) {
      slideEl.querySelectorAll('video:not(.hp-bgvideo)').forEach((v) => {
        ['play', 'pause', 'ended', 'volumechange'].forEach((ev) => v.addEventListener(ev, () => this._recomputeDuck()));
        if (this._recMix) this._recConnect(v);
      });
      setTimeout(() => this._recomputeDuck(), 50);
      slideEl.querySelectorAll('video').forEach((v) => {
        if (v.classList.contains('hp-bgvideo') || v.dataset.autoplay) {
          const p = v.play();
          if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
        }
      });
    }

    // 동영상 요소를 슬라이드 전체로 펼쳐 소리와 함께 재생
    _openFullVideo(w) {
      if (this._fv) this._closeFullVideo(true);
      const slideEl = w.parentElement;
      const id = w.dataset.id;
      const el = (this.deck.slides[this.idx].elements || []).find((x) => x.id === id) || {};
      const W = this.deck.width, H = this.deck.height;
      const st = w.style;
      const saved = { left: st.left, top: st.top, width: st.width, height: st.height, transform: st.transform, zIndex: st.zIndex, filter: st.filter, opacity: st.opacity };
      const back = document.createElement('div');
      back.className = 'hp-fv-back';
      slideEl.appendChild(back);
      const close = document.createElement('button');
      close.className = 'hp-fv-close';
      close.title = '닫기 (Esc)';
      close.textContent = '✕';
      close.addEventListener('click', (e) => { e.stopPropagation(); this._closeFullVideo(); });
      back.addEventListener('click', (e) => { e.stopPropagation(); });
      st.transition = 'left .45s cubic-bezier(.2,.8,.2,1), top .45s cubic-bezier(.2,.8,.2,1), width .45s cubic-bezier(.2,.8,.2,1), height .45s cubic-bezier(.2,.8,.2,1), transform .45s';
      st.zIndex = 9990;
      st.filter = 'none';
      st.opacity = 1;
      w.classList.add('hp-fv-open');
      void w.offsetWidth;
      requestAnimationFrame(() => {
        back.classList.add('on');
        st.left = '0px'; st.top = '0px'; st.width = W + 'px'; st.height = H + 'px'; st.transform = 'none';
      });
      slideEl.appendChild(close);
      const v = w.querySelector('video');
      if (v) {
        v.style.objectFit = 'contain';
        v.controls = true;
        v.muted = false;
        if (v.dataset.trim !== '1' && v.ended) v.currentTime = 0;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
        this._fvEnd = () => setTimeout(() => { if (this._fv && this._fv.w === w && v.paused) this._closeFullVideo(); }, 700);
        v.addEventListener('trimend', this._fvEnd);
        v.addEventListener('ended', this._fvEnd);
      } else {
        const box = w.querySelector('.hp-box');
        const f = document.createElement('iframe');
        f.className = 'hp-iframe';
        f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        f.src = embedSrc(el, { autoplay: true, sound: true });
        box.dataset.cover = box.innerHTML;
        box.innerHTML = '';
        box.appendChild(f);
      }
      this._fv = { w, saved, back, close, el };
      this._recomputeDuck && this._recomputeDuck();
    }

    _closeFullVideo(instant) {
      const fv = this._fv;
      if (!fv) return;
      this._fv = null;
      const { w, saved, back, close, el } = fv;
      const v = w.querySelector('video');
      if (v) {
        v.pause();
        v.controls = false;
        v.style.objectFit = el.fit || 'contain';
        v.muted = !!el.muted;
        if (this._fvEnd) { v.removeEventListener('trimend', this._fvEnd); v.removeEventListener('ended', this._fvEnd); }
      } else {
        const box = w.querySelector('.hp-box');
        if (box && box.dataset.cover != null) { box.innerHTML = box.dataset.cover; delete box.dataset.cover; }
      }
      close.remove();
      back.classList.remove('on');
      const st = w.style;
      if (instant) st.transition = 'none';
      Object.assign(st, { left: saved.left, top: saved.top, width: saved.width, height: saved.height, transform: saved.transform });
      const done = () => {
        st.transition = '';
        st.zIndex = saved.zIndex; st.filter = saved.filter; st.opacity = saved.opacity;
        w.classList.remove('hp-fv-open');
        back.remove();
      };
      if (instant) done(); else setTimeout(done, 460);
      this._recomputeDuck && this._recomputeDuck();
    }

    _stopMedia(slideEl) {
      if (this._fv && slideEl.contains(this._fv.w)) this._closeFullVideo(true);
      slideEl.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch (e) { /* noop */ } });
      slideEl.querySelectorAll('iframe').forEach((f) => { f.src = 'about:blank'; });
    }

    go(i, step, instant) {
      const slides = this.deck.slides;
      if (i < 0 || i >= slides.length || this.busy) return;
      const dir = i >= this.idx ? 1 : -1;
      const slide = slides[i];
      const newEl = renderSlide(this.deck, slide, { mode: 'present', resolve: this.o.resolve });
      newEl.classList.add('hp-layer');
      const oldEl = this.cur;
      // 같은 배경 동영상이 이어지면 처음부터 다시 틀지 않고 이어서 재생
      const ov = oldEl && oldEl.querySelector(':scope > .hp-bgvideo'), nv = newEl.querySelector(':scope > .hp-bgvideo');
      if (ov && nv && ov.dataset.src === nv.dataset.src && (slide.bg || {}).continue !== false && ov.currentTime > 0) nv.dataset.resume = ov.currentTime + (instant ? 0 : 0.15);
      if (this.o.standalone && !this.loopRange && !/loop/.test(location.hash)) { try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) { /* file:// 등 */ } }
      this.frame.appendChild(newEl);
      this.groups = buildGroups(slide);
      const target = step === 'end' ? this.groups.length : (step || 0);
      applyState(newEl, slide, this.deck, target);
      this.idx = i;
      this.step = target;
      this.cur = newEl;
      if (this.editMode) this._setEditable(true);
      this._updateUI();
      this._startMedia(newEl);
      this._bgmSync();
      const tr = slide.transition || {};
      const withTr = !instant && oldEl && tr.type && tr.type !== 'none';
      const skip = withTr && tr.type === 'morph' && oldEl ? new Set(Array.from(oldEl.querySelectorAll(':scope > .hp-el')).map((x) => x.dataset.mkey)) : null;
      if (target === 0) animateVisibleCharts(newEl, slide, withTr ? (tr.duration || 700) * 0.6 : 0, skip);
      const finish = () => {
        if (oldEl && oldEl.parentNode) { this._stopMedia(oldEl); oldEl.remove(); }
        this.busy = false;
        if (this.step === 0 && this.groups[0] && this.groups[0].auto) {
          playGroup(newEl, slide, this.deck, this.groups[0]);
          this.step = 1;
          this._updateUI();
        }
        this._scheduleAuto();
      };
      if (!instant && oldEl && tr.type && tr.type !== 'none') {
        this.busy = true;
        this.frame.classList.toggle('hp-black', !!(TRANSITIONS[tr.type] || {}).black);
        playTransition(oldEl, newEl, tr.type, dir, tr.duration).then(finish);
      } else finish();
    }

    next() {
      if (this.busy) return;
      if (this._zoomOn) this.toggleZoom(false);
      if (this.step < this.groups.length) {
        const g = this.groups[this.step++];
        const t = playGroup(this.cur, this.deck.slides[this.idx], this.deck, g);
        applyDim(this.cur, this.deck.slides[this.idx], this.step, this.groups);
        this._scheduleAuto(t);
        this._updateUI();
      } else if (this.loopRange && this.auto && this.idx >= this.loopRange[1]) this.go(this.loopRange[0], 0);
      else if (this.idx < this.deck.slides.length - 1) this.go(this.idx + 1, 0);
      else this._toast('마지막 슬라이드입니다');
    }

    prev() {
      if (this.busy) return;
      if (this._zoomOn) this.toggleZoom(false);
      const min = this.groups[0] && this.groups[0].auto ? 1 : 0;
      if (this.step > min) {
        this.step--;
        applyState(this.cur, this.deck.slides[this.idx], this.deck, this.step);
        this._updateUI();
      } else if (this.idx > 0) this.go(this.idx - 1, 'end');
    }

    _scheduleAuto(extra) {
      clearTimeout(this.autoTimer);
      if (!this.auto) return;
      const slide = this.deck.slides[this.idx];
      let wait;
      if (this.step < this.groups.length) wait = (extra && extra !== Infinity ? extra : 0) + 900;
      else {
        // 반복 재생은 정한 '장당 시간'을 모든 장에 쓴다 (슬라이드마다 기본 5초가 들어 있어 구분이 안 되므로)
        const per = this.loopRange && this.o.autoDuration ? this.o.autoDuration : (slide.duration || this.o.autoDuration || this.deck.autoDuration || 5);
        wait = Math.max(extra && extra !== Infinity ? extra : 0, 0) + per * 1000;
      }
      this.autoTimer = setTimeout(() => {
        if (!this.auto) return;
        if (!this.loopRange && this.step >= this.groups.length && this.idx >= this.deck.slides.length - 1) {
          if (this.recorder) this.toggleRecord();
          this.auto = false;
          this._updateUI();
          this._toast('자동 재생이 끝났습니다');
          return;
        }
        this.next();
      }, wait);
    }

    toggleAuto(on) {
      this.auto = on == null ? !this.auto : on;
      if (!this.auto && this.loopRange) { this.loopRange = null; this.el.classList.remove('hp-looping'); }
      this._toast(this.auto ? '자동 재생 시작' : '자동 재생 정지');
      this._updateUI();
      this._scheduleAuto();
    }

    toggleNotes() { const n = this.el.querySelector('.hp-notes'); n.hidden = !n.hidden; }

    toggleLaser() { this.laser = !this.laser; this.el.classList.toggle('hp-laser-on', this.laser); this._updateUI(); }

    _setEditable(on) {
      if (!this.cur) return;
      this.cur.querySelectorAll('.hp-tc').forEach((t) => { t.contentEditable = on ? 'true' : 'false'; });
      this.cur.classList.toggle('hp-editing', on);
    }

    toggleEdit() {
      if (!this.o.editable) return;
      this.editMode = !this.editMode;
      if (!this.editMode && document.activeElement) document.activeElement.blur();
      this._setEditable(this.editMode);
      this.el.classList.toggle('hp-edit-on', this.editMode);
      this._toast(this.editMode ? '편집 모드: 텍스트를 클릭해 수정하세요 (E 로 종료)' : '편집 모드 종료');
      this._updateUI();
    }

    toggleFull() {
      // 서브 모니터가 있는데 지금 화면에서 전체화면 중이면 → 서브 모니터로 옮긴다
      if (document.fullscreenElement && window.screen.isExtended && !this._onSub()) { this.enterFullscreen(); return; }
      if (document.fullscreenElement) document.exitFullscreen();
      else this.enterFullscreen();
    }

    /* 전체화면 시작. 모니터가 여러 대면 발표 화면은 다른 모니터(서브)에, 발표자 보기는 지금 모니터에 연다.
       (Chrome/Edge 의 창 관리 권한 — 처음 한 번 허용 요청) */
    async enterFullscreen(opts) {
      opts = opts || {};
      const el = this.o.fullscreenTarget || document.documentElement;
      let target = null;
      if (window.screen.isExtended && window.getScreenDetails) {
        try {
          const sd = await window.getScreenDetails();
          if (!this._sd && !this._exited) { this._sd = sd; sd.addEventListener('screenschange', this._onScreens); }
          // 발표자 보기는 편집기 창이 있던 모니터(처음 기억한 곳)에, 발표 화면은 그 밖의 모니터에
          let cur = (this._pvScreen && sd.screens.includes(this._pvScreen)) ? this._pvScreen : sd.currentScreen;
          if (document.fullscreenElement && !this._pvScreen) cur = sd.screens.find((s) => s.isPrimary) || cur;
          target = sd.screens.find((s) => s !== cur && !s.isPrimary) || sd.screens.find((s) => s !== cur) || null;
          if (target) this._pvScreen = cur;
        } catch (e) { /* 권한 거부 — 지금 모니터에서 발표 */ }
      }
      try {
        try {
          await el.requestFullscreen(target ? { screen: target } : undefined);
        } catch (e) {
          // 이미 다른 화면에서 전체화면이면 풀었다가 다시 요청
          if (!document.fullscreenElement) throw e;
          await document.exitFullscreen();
          await el.requestFullscreen(target ? { screen: target } : undefined);
        }
        this._fsScreen = target || (this._sd && this._sd.currentScreen) || null;
      } catch (e) {
        // 권한 요청 창을 누르는 사이 클릭 유효 시간이 지나면 전체화면이 거부된다
        if (!opts.quiet) this._toast(target ? 'F 키를 누르면 서브 모니터에서 전체화면으로 발표합니다' : 'F 키를 누르면 전체화면으로 발표합니다');
        return false;
      }
      if (target && this.pv && !this.pv.closed && this._pvScreen) {
        // 발표자 보기 창이 이미 있으면 기존 모니터로 다시 맞춘다
        try { const sc = this._pvScreen; this.pv.moveTo(sc.availLeft, sc.availTop); this.pv.resizeTo(sc.availWidth, sc.availHeight); } catch (e) { /* ignore */ }
      }
      if (target && opts.presenterView !== false && !(this.pv && !this.pv.closed)) {
        this.openPresenterView();
        // 발표자 보기 창이 뜨면서 전체화면이 풀리는 브라우저 대비
        setTimeout(() => { if (!document.fullscreenElement) this._toast('발표 화면을 클릭한 뒤 F 키를 누르면 서브 모니터 전체화면이 됩니다'); }, 800);
      }
      return true;
    }

    async toggleRecord() {
      if (this.recorder) { this.recorder.stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { this._toast('이 브라우저는 화면 녹화를 지원하지 않습니다'); return; }
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30, displaySurface: 'browser' }, audio: true,
          preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude',
        });
        let recStream = stream;
        const hasBgm = !!(this.deck.bgm && this.deck.bgm.tracks && this.deck.bgm.tracks.length);
        if (!stream.getAudioTracks().length && (hasBgm || (this.cur && this.cur.querySelector('video:not(.hp-bgvideo)')))) {
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = this._recCtx || (this._recCtx = new AC());
            if (ctx.state === 'suspended') ctx.resume();
            this._recMix = { ctx, dest: ctx.createMediaStreamDestination() };
            this._bgmPlayers.forEach((x) => this._recConnect(x.audio));
            if (this.cur) this.cur.querySelectorAll('video:not(.hp-bgvideo)').forEach((v) => this._recConnect(v));
            recStream = new MediaStream([...stream.getVideoTracks(), ...this._recMix.dest.stream.getAudioTracks()]);
          } catch (e) { this._recMix = null; }
        }
        const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
        const rec = new MediaRecorder(recStream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : undefined);
        const chunks = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          this._recMix = null;
          this.recorder = null;
          this._updateUI();
          const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = (this.deck.title || 'presentation') + (blob.type.includes('mp4') ? '.mp4' : '.webm');
          document.body.appendChild(a); a.click(); a.remove();
          this._toast('동영상이 저장되었습니다');
        };
        stream.getVideoTracks()[0].addEventListener('ended', () => { if (this.recorder) this.recorder.stop(); });
        rec.start(500);
        this.recorder = rec;
        this._updateUI();
        this._toast('녹화 중… (R 또는 ● 버튼으로 정지)');
      } catch (e) {
        this._toast('녹화가 취소되었습니다');
      }
    }

    _onKey(e) {
      this._bgmRetry();
      const t = e.target;
      if (this.editMode && t && t.isContentEditable) {
        if (e.key === 'Escape') { t.blur(); e.preventDefault(); }
        return;
      }
      const k = e.key;
      if (this.editMode && !['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageDown', 'PageUp', 'Home', 'End', 'Escape', 'e', 'E', 'F5'].includes(k)) {
        if (k.length === 1 || k === 'Enter' || k === 'Backspace' || k === 'Process') { e.preventDefault(); this._toast('편집 모드입니다 — 고칠 글자를 먼저 클릭하세요 (E: 편집 종료)'); }
        return;
      }
      if (this._fv) {
        const fv = this._fv;
        if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); this._closeFullVideo(); return; }
        if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); const v = fv.w.querySelector('video'); if (v) { if (v.paused) v.play().catch(() => {}); else v.pause(); } return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
          const v = fv.w.querySelector('video');
          if (v && !e.shiftKey) { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime + (k === 'ArrowLeft' ? -5 : 5)); return; }
        }
        this._closeFullVideo(true);
      }
      if (this._ov) { this._ovKey(e); return; }
      // F5 는 새로고침 대신 무시 (발표가 끊기지 않게). 새로고침은 Ctrl+R
      if (k === 'F5' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this._toast('발표 중입니다 — 새로고침은 Ctrl+R, 종료는 Esc'); return; }
      if (this._gotoBuf != null && /^[0-9]$/.test(k)) { this._gotoBuf += k; this._showGoto(); return; }
      if (/^[0-9]$/.test(k)) { this._gotoBuf = k; this._showGoto(); return; }
      if (k === 'Enter' && this._gotoBuf) { this.go(+this._gotoBuf - 1, 0); this._gotoBuf = null; this._showGoto(); return; }
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); this.next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); this.prev(); }
      else if (k === 'Home') this.go(0, 0);
      else if (k === 'End') this.go(this.deck.slides.length - 1, 0);
      else if (k === 'Escape') { if (this._gotoBuf) { this._gotoBuf = null; this._showGoto(); } else if (this._zoomOn) this.toggleZoom(false); else if (!document.fullscreenElement && !this.o.standalone) this.exit(); }
      else if (k === 'z' || k === 'Z') this.toggleZoom();
      else if (k === 'g' || k === 'G' || k === 'o' || k === 'O') this.toggleOverview();
      else if (k === 'b' || k === 'B' || k === '.') this._blank('#000');
      else if (k === 'w' || k === 'W' || k === ',') this._blank('#fff');
      else if (k === 'n' || k === 'N') this.toggleNotes();
      else if (k === 'p' || k === 'P') this.openPresenterView();
      else if (k === 'm' || k === 'M') this.toggleMusic();
      else if (k === 'l' || k === 'L') this.toggleLaser();
      else if (k === 'a' || k === 'A') this.toggleAuto();
      else if (k === 'r' || k === 'R') this.toggleRecord();
      else if (k === 'f' || k === 'F') this.toggleFull();
      else if (k === 'e' || k === 'E') this.toggleEdit();
    }

    _showGoto() {
      const g = this.el.querySelector('.hp-goto');
      g.hidden = !this._gotoBuf;
      g.textContent = this._gotoBuf ? `슬라이드 ${this._gotoBuf} 로 이동 (Enter)` : '';
    }

    _blank(color) {
      const b = this.el.querySelector('.hp-blank');
      const on = !(b.classList.contains('on') && b.style.background === (color === '#000' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'));
      b.style.background = color;
      b.classList.toggle('on', on);
    }

    exit() {
      clearTimeout(this.autoTimer);
      clearInterval(this._clock);
      if (this.recorder) this.recorder.stop();
      if (this.pv && !this.pv.closed) this.pv.close();
      this._bgmStopAll(500);
      document.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('message', this._onMsg);
      window.removeEventListener('hashchange', this._onHash);
      this.toggleOverview(false);
      document.removeEventListener('hp-3d-reset', this._on3dReset);
      this._exited = true;
      clearTimeout(this._scrT);
      this._unwatchScreens();
      if (this.cur) this._stopMedia(this.cur);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      this.el.remove();
      if (this.o.onExit) this.o.onExit(this.idx);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 공용 CSS                                                             */
  /* ------------------------------------------------------------------ */
  const CSS = `
.hp-slide{position:relative;overflow:hidden;box-sizing:border-box;font-synthesis-weight:none;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#222;flex:none}
.hp-slide *{box-sizing:border-box}
.hp-bgvideo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}
.hp-bgoverlay{position:absolute;inset:0;z-index:0;pointer-events:none}
.hp-el{position:absolute;transform-origin:50% 50%}
.hp-anim{position:absolute;inset:0;transform-origin:50% 50%}
.hp-box{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column}
.hp-text{flex:1;display:flex;flex-direction:column;min-height:100%}
.hp-tc{word-break:keep-all;overflow-wrap:anywhere;white-space:pre-wrap;outline:none;min-height:1em}
.hp-text ul,.hp-text ol{margin:0 0 0 1.1em;padding:0}
.hp-text li{margin:.15em 0}
.hp-text p{margin:0}
.hp-line{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);border-radius:99px}
.hp-img,.hp-video,.hp-iframe{width:100%;height:100%;display:block;border:0}
.hp-media-badge{position:absolute;left:12px;top:12px;background:rgba(0,0,0,.65);color:#fff;font:600 22px/1.3 sans-serif;padding:6px 14px;border-radius:8px;pointer-events:none}
.hp-media-badge.big{left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;font-size:30px;padding:16px 26px}
.hp-media-badge small{font-size:16px;opacity:.8;font-weight:400}
.hp-el[data-clickfull]{cursor:pointer}
.hp-fv-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;transition:opacity .3s}
.hp-fv-play span{width:120px;height:120px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font:64px/120px sans-serif;text-align:center;padding-left:10px;box-sizing:border-box;box-shadow:0 6px 30px rgba(0,0,0,.4);transition:transform .2s}
.hp-el[data-clickfull]:hover .hp-fv-play span{transform:scale(1.1);background:rgba(0,0,0,.75)}
.hp-fv-open{cursor:default}
.hp-fv-open .hp-fv-play{opacity:0}
.hp-fv-open .hp-box{border-radius:0 !important;background:#000 !important;border:0 !important}
.hp-fv-back{position:absolute;inset:0;background:#000;opacity:0;z-index:9989;transition:opacity .45s}
.hp-fv-back.on{opacity:1}
.hp-fv-close{position:absolute;right:28px;top:28px;z-index:9995;width:72px;height:72px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;font:36px/72px sans-serif;cursor:pointer;opacity:.75}
.hp-fv-close:hover{opacity:1;background:rgba(255,255,255,.3)}
.hp-tablebox{overflow:hidden}
.hp-table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed}
.hp-table th,.hp-table td{padding:.35em .6em;text-align:left;vertical-align:middle;overflow:hidden}
.hp-mode-edit .hp-video,.hp-mode-edit .hp-iframe,.hp-mode-edit .hp-model,.hp-mode-thumb *{pointer-events:none}
.hp-modelbox{overflow:hidden}.hp-el[data-model3d]{cursor:grab}.hp-el[data-model3d]:active{cursor:grabbing}
.hp-pres{position:fixed;inset:0;background:#000;z-index:9000;user-select:none;font-family:'Noto Sans KR',sans-serif}
.hp-viewport{position:absolute;inset:0;overflow:hidden}
.hp-frame{position:absolute;left:0;top:0;transform-origin:0 0}
.hp-frame.hp-black{background:#000}
.hp-layer{position:absolute;left:0;top:0}
.hp-blank{position:absolute;inset:0;display:none;z-index:5}
.hp-blank.on{display:block}
.hp-controls{position:absolute;left:50%;bottom:18px;transform:translateX(-50%) translateY(20px);display:flex;align-items:center;gap:6px;padding:8px 12px 12px;background:rgba(20,22,30,.82);backdrop-filter:blur(8px);border-radius:14px;color:#fff;opacity:0;transition:.25s;z-index:10;font-size:13px;white-space:nowrap}
.hp-show-ui .hp-controls,.hp-controls:hover{opacity:1;transform:translateX(-50%)}
.hp-controls button{background:rgba(255,255,255,.08);color:#fff;border:0;border-radius:8px;padding:6px 10px;font:inherit;cursor:pointer}
.hp-controls button:hover{background:rgba(255,255,255,.2)}
.hp-controls button.on{background:#e8590c}
.hp-count,.hp-timer{min-width:56px;text-align:center;font-variant-numeric:tabular-nums}
.hp-sep{width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 4px}
.hp-progress{position:absolute;left:12px;right:12px;bottom:4px;height:4px;background:rgba(255,255,255,.15);border-radius:4px;cursor:pointer}
.hp-progress div{height:100%;background:#4dabf7;border-radius:4px;transition:width .3s}
.hp-notes{position:absolute;right:16px;top:16px;width:min(420px,40vw);max-height:50vh;overflow:auto;background:rgba(20,22,30,.9);color:#eee;padding:16px 18px;border-radius:12px;font-size:16px;line-height:1.6;z-index:11}
.hp-goto{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);background:rgba(20,22,30,.9);color:#fff;padding:14px 22px;border-radius:12px;font-size:20px;z-index:12}
.hp-toast{position:absolute;left:50%;top:24px;transform:translate(-50%,-10px);background:rgba(20,22,30,.9);color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;opacity:0;transition:.25s;z-index:12;pointer-events:none}
.hp-toast.on{opacity:1;transform:translate(-50%,0)}
.hp-move{position:absolute;right:24px;top:24px;display:flex;align-items:center;gap:10px;background:rgba(20,22,30,.92);color:#fff;padding:10px 12px 10px 18px;border-radius:12px;font-size:15px;z-index:13;box-shadow:0 6px 24px rgba(0,0,0,.4)}
.hp-move[hidden]{display:none}.hp-move button{font:inherit;border:0;border-radius:8px;padding:8px 14px;background:#4dabf7;color:#fff;cursor:pointer}.hp-move button[data-x]{background:transparent;padding:8px}
.hp-viewport.hp-zooming{transition:transform .35s cubic-bezier(.3,.7,.3,1)}
.hp-zoom-armed .hp-viewport,.hp-zoom-armed .hp-viewport *{cursor:zoom-in!important}.hp-zoomed .hp-viewport,.hp-zoomed .hp-viewport *{cursor:zoom-out!important}
.hp-looping .hp-controls{display:none}.hp-looping .hp-viewport,.hp-looping .hp-viewport *{cursor:none!important}
.hp-laser{position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:radial-gradient(circle,#ff2a2a 0 35%,rgba(255,40,40,.35) 60%,transparent 70%);pointer-events:none;display:none;z-index:13}
.hp-laser-on .hp-laser{display:block}.hp-laser-on .hp-viewport{cursor:none}
.hp-pres:not(.hp-show-ui):not(.hp-edit-on) .hp-viewport,.hp-pres:not(.hp-show-ui):not(.hp-edit-on) .hp-viewport *,.hp-pres:not(.hp-show-ui) .hp-blank{cursor:none}
.hp-edit-on .hp-tc{cursor:text}
.hp-editing .hp-el[data-starthidden] .hp-anim,.hp-editing .hp-anim[style*="visibility: hidden"]{visibility:visible!important;opacity:.6!important;transform:none!important;clip-path:none!important;filter:none!important;outline:3px dashed #f59f00;outline-offset:-3px}
.hp-editing .hp-tc[contenteditable=true]:hover{outline:3px dashed rgba(77,171,247,.8);outline-offset:-3px}
.hp-editing .hp-tc[contenteditable=true]:focus{outline:3px solid #4dabf7;outline-offset:-3px;background:rgba(255,255,255,.06)}
.hp-morphbg{position:absolute;inset:0;z-index:0;pointer-events:none}
.hp-chartbox svg{display:block}
.hp-bgfx{position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.hp-fxcanvas{position:absolute;inset:0;width:100%;height:100%}
.hp-fx-flow{background-size:300% 300%!important;animation:hp-flow calc(16s / var(--fxs,1)) ease-in-out infinite}
@keyframes hp-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
.hp-blob{position:absolute;border-radius:50%;opacity:.55;mix-blend-mode:screen;filter:blur(40px)}
.hp-drift1{animation:hp-drift1 calc(18s / var(--fxs,1)) ease-in-out infinite alternate}
.hp-drift2{animation:hp-drift2 calc(22s / var(--fxs,1)) ease-in-out infinite alternate}
.hp-drift3{animation:hp-drift3 calc(26s / var(--fxs,1)) ease-in-out infinite alternate}
@keyframes hp-drift1{to{transform:translate(35%,25%) scale(1.2)}}
@keyframes hp-drift2{to{transform:translate(-40%,30%) scale(.85)}}
@keyframes hp-drift3{to{transform:translate(25%,-35%) scale(1.15)}}
.hp-bubble{position:absolute;top:110%;border-radius:50%;border:2px solid var(--fxc);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.45),transparent 60%);opacity:.45;animation-name:hp-rise,hp-sway;animation-timing-function:linear,ease-in-out;animation-iteration-count:infinite,infinite;animation-direction:normal,alternate}
@keyframes hp-rise{from{top:110%}to{top:-15%}}
@keyframes hp-sway{from{transform:translateX(-25px)}to{transform:translateX(25px)}}
.hp-wave{position:absolute;left:0;width:200%;animation:hp-wave linear infinite}
@keyframes hp-wave{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.hp-gridfloor{position:absolute;left:-60%;right:-60%;bottom:-8%;height:85%;background-image:linear-gradient(var(--fxc) 2px,transparent 2px),linear-gradient(90deg,var(--fxc) 2px,transparent 2px);background-size:90px 90px;transform:perspective(1100px) rotateX(58deg);transform-origin:50% 100%;opacity:.55;animation:hp-gridmove calc(1.6s / var(--fxs,1)) linear infinite;-webkit-mask-image:linear-gradient(to top,#000 35%,transparent);mask-image:linear-gradient(to top,#000 35%,transparent)}
.hp-gridglow{position:absolute;left:0;right:0;top:20%;height:40%;background:radial-gradient(ellipse at 50% 100%,var(--fxc2),transparent 70%);opacity:.5}
@keyframes hp-gridmove{to{background-position:0 90px,0 0}}
.hp-floaty{position:absolute;opacity:.28;animation:hp-floaty linear infinite}
.hp-sh-circle{border-radius:50%;background:currentColor}
.hp-sh-square{border:6px solid currentColor;border-radius:8px}
.hp-sh-triangle{background:currentColor;clip-path:polygon(50% 0,100% 100%,0 100%)}
.hp-sh-ring{border:7px solid currentColor;border-radius:50%}
.hp-sh-plus{background:currentColor;clip-path:polygon(38% 0,62% 0,62% 38%,100% 38%,100% 62%,62% 62%,62% 100%,38% 100%,38% 62%,0 62%,0 38%,38% 38%)}
@keyframes hp-floaty{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(40px,-60px) rotate(90deg)}50%{transform:translate(-20px,-110px) rotate(180deg)}75%{transform:translate(-50px,-40px) rotate(270deg)}100%{transform:translate(0,0) rotate(360deg)}}
.hp-mode-thumb.hp-fx-flow,.hp-mode-thumb .hp-bgfx *{animation-play-state:paused!important}
.hp-mode-present .hp-el[data-action]{cursor:pointer}
.hp-mode-present .hp-el[class*=hp-hover-] .hp-box{transition:transform .22s cubic-bezier(.2,.8,.2,1),filter .22s}
.hp-mode-present .hp-hover-grow:hover .hp-box{transform:scale(1.06)}
.hp-mode-present .hp-hover-lift:hover .hp-box{transform:translateY(-10px);filter:brightness(1.06)}
.hp-mode-present .hp-hover-glow:hover .hp-box{filter:brightness(1.22) saturate(1.25)}
.hp-mode-present .hp-hover-tilt:hover .hp-box{transform:perspective(800px) rotateX(6deg) rotateY(-8deg) scale(1.03)}
.hp-mode-present .hp-hover-pulse:hover .hp-box{animation:hp-hpulse .8s ease-in-out infinite}
@keyframes hp-hpulse{50%{transform:scale(1.07)}}
.hp-mode-edit .hp-el[data-starthidden] .hp-anim{opacity:.45;outline:3px dashed #f59f00;outline-offset:-3px}
.hp-mode-edit .hp-el[data-hasaction]::after{content:'⚡';position:absolute;right:-14px;top:-14px;width:30px;height:30px;border-radius:50%;background:#f59f00;color:#fff;font:700 18px/30px sans-serif;text-align:center;z-index:5;pointer-events:none}
.hp-fb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:.4em .9em;border-radius:999px;font:700 34px/1.2 'Noto Sans KR',sans-serif;color:#fff;white-space:nowrap;z-index:9;pointer-events:none;box-shadow:0 8px 30px rgba(0,0,0,.3)}
.hp-fb.ok{background:#2f9e44}.hp-fb.no{background:#e03131}
.hp-confetti{position:absolute;inset:0;pointer-events:none;z-index:9999;overflow:hidden}
.hp-codebox{overflow:hidden}
.hp-codebar{display:flex;align-items:center;gap:.5em;padding:.6em 1em;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.08);font-family:'Noto Sans KR',sans-serif;color:#9aa4bd;flex:none}
.hp-code-light .hp-codebar{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.08);color:#6b7280}
.hp-codebar i{width:.8em;height:.8em;border-radius:50%;background:#ff5f57;display:inline-block}.hp-codebar i:nth-child(2){background:#febc2e}.hp-codebar i:nth-child(3){background:#28c840}
.hp-codebar span{margin-left:.6em}
.hp-code{margin:0;flex:1;overflow:hidden;white-space:pre;font-family:'Roboto Mono','D2Coding','Consolas',monospace;tab-size:2}
.hp-cl{min-height:1.5em}.hp-cl.dim{opacity:.32}.hp-cl.hl{background:rgba(255,212,59,.10);border-radius:4px}
.hp-ln{display:inline-block;text-align:right;padding-right:1.2ch;opacity:.35;user-select:none}
.hp-tk{display:inline-block;white-space:pre}
.hp-code-dark{color:#abb2bf}.hp-code-dark .tk-kw{color:#c678dd}.hp-code-dark .tk-str{color:#98c379}.hp-code-dark .tk-num{color:#d19a66}.hp-code-dark .tk-com{color:#7f848e;font-style:italic}.hp-code-dark .tk-fn{color:#61afef}.hp-code-dark .tk-type{color:#e5c07b}.hp-code-dark .tk-op{color:#56b6c2}.hp-code-dark .tk-id{color:#e6e9ef}.hp-code-dark .tk-tag{color:#e06c75}.hp-code-dark .tk-attr{color:#d19a66}.hp-code-dark .tk-punc{color:#abb2bf}
.hp-code-light{color:#383a42}.hp-code-light .tk-kw{color:#a626a4}.hp-code-light .tk-str{color:#50a14f}.hp-code-light .tk-num{color:#986801}.hp-code-light .tk-com{color:#a0a1a7;font-style:italic}.hp-code-light .tk-fn{color:#4078f2}.hp-code-light .tk-type{color:#c18401}.hp-code-light .tk-op{color:#0184bc}.hp-code-light .tk-id{color:#383a42}.hp-code-light .tk-tag{color:#e45649}.hp-code-light .tk-attr{color:#986801}.hp-code-light .tk-punc{color:#383a42}
.hp-mm-ghost{position:absolute;pointer-events:none}
.hp-mode-present>.hp-el{transition:opacity .5s ease}
.hp-el.hp-dim{opacity:.3!important}
.hp-table tr.hp-row-off>*{visibility:hidden}
.hp-table tr.hp-row-blank>*{color:transparent!important}
.hp-table tr.hp-row-dim>*{color:color-mix(in srgb,currentColor 30%,transparent)!important;transition:color .5s ease}
.hp-type-path{pointer-events:none}.hp-drawfx{pointer-events:none}.hp-pathsvg{display:block;overflow:visible}
.hp-mode-edit .hp-type-path .hp-hit{pointer-events:visiblePainted;cursor:move}
.hp-prism-face{position:absolute;box-sizing:border-box;pointer-events:none;z-index:2;backface-visibility:hidden}
.hp-ov{position:absolute;inset:0;z-index:20;background:rgba(10,12,18,.94);overflow:auto;padding:24px 40px 60px;box-sizing:border-box;cursor:default}
.hp-ov *{cursor:default}
.hp-ov-head{display:flex;align-items:baseline;gap:16px;color:#fff;margin:0 0 18px}.hp-ov-head b{font-size:22px}.hp-ov-head span{font-size:14px;opacity:.65}
.hp-ov-grid{display:grid;gap:18px;justify-content:center}
.hp-ov-cell{position:relative;overflow:hidden;border-radius:8px;box-shadow:0 0 0 1px rgba(255,255,255,.15);opacity:.82;transition:transform .15s,opacity .15s,box-shadow .15s;cursor:pointer!important}
.hp-ov-cell *{pointer-events:none}
.hp-ov-cell:hover{opacity:1;transform:translateY(-3px)}
.hp-ov-cell.cur{box-shadow:0 0 0 3px #4dabf7}
.hp-ov-cell.sel{opacity:1;box-shadow:0 0 0 4px #ffd43b;transform:scale(1.03)}
.hp-ov-num{position:absolute;left:0;right:0;bottom:0;padding:18px 10px 6px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;font:600 13px/1.3 'Noto Sans KR',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hp-confetti i{position:absolute}
`;

  const PV_CSS = `
html,body{margin:0;height:100%;background:#12141c;color:#e9ecf3;font-family:'Noto Sans KR',sans-serif;overflow:hidden}
.pv{display:flex;flex-direction:column;height:100vh}
.pv-top{display:flex;align-items:center;gap:14px;padding:10px 16px;background:#1b1e29;border-bottom:1px solid #2b2f3d;font-size:14px}
.pv-title{font-size:15px;max-width:30vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pv-count{color:#9aa4bd}.pv-step{color:#b197fc}.pv-sp{flex:1}
.pv-timer{font:700 28px/1 'Roboto Mono',monospace;color:#ffd43b}.pv-clock{font:600 18px/1 'Roboto Mono',monospace;color:#9aa4bd}
.pv button{background:#2b2f3d;border:1px solid #3a3f51;color:#e9ecf3;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.pv button:hover{background:#3b4157}.pv button.primary{background:#4c6ef5;border-color:#4c6ef5;font-weight:700}
.pv-main{flex:1;display:flex;gap:16px;padding:16px;min-height:0}
.pv-cur{flex:1.7;min-width:0;display:flex;flex-direction:column}
.pv-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.pv-label{font-size:13px;color:#9aa4bd;margin-bottom:6px;font-weight:600}
.pv-view{position:relative;overflow:hidden;border-radius:8px;background:#000;box-shadow:0 0 0 1px #2b2f3d;flex:none}
.pv-cur .pv-view{box-shadow:0 0 0 2px #4c6ef5}
.pv-end{display:flex;align-items:center;justify-content:center;height:120px;color:#6b7280;font-size:20px}
.pv-notes-head{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:13px;color:#9aa4bd;font-weight:600}
.pv-notes{flex:1;overflow-y:auto;background:#1b1e29;border-radius:8px;padding:14px 16px;line-height:1.6;white-space:normal}
.pv-none{color:#6b7280}
.pv-bottom{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#1b1e29;border-top:1px solid #2b2f3d}
.pv-strip{flex:1;display:flex;gap:8px;overflow-x:auto;padding:2px 2px 4px}
.pv-thumb{position:relative;flex:none;overflow:hidden;border-radius:4px;cursor:pointer;opacity:.6;box-shadow:0 0 0 1px #3a3f51}
.pv-thumb:hover{opacity:.9}.pv-thumb.on{opacity:1;box-shadow:0 0 0 2px #ffd43b}
.pv-thumb span{position:absolute;left:3px;bottom:2px;font-size:11px;background:rgba(0,0,0,.6);padding:0 4px;border-radius:3px}
.pv-music{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;

  function injectCSS(doc) {
    doc = doc || document;
    if (doc.getElementById('hp-core-css')) return;
    const st = doc.createElement('style');
    st.id = 'hp-core-css';
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  return { hooks, setLive3d, elSig, tokenizeCode, matchTokens, CODE_LANGS, ANIMS, ANIM_CATS, TRANSITIONS, SHAPES, BG_FX, BG_FX_CATS, BG_FX_COLORS, BG_FX_RETIRED, ACTIONS, HOVERS, CHART_TYPES, CHART_PALETTE, renderChart, animateChart, countUp, DRAW_FX, DRAW_DIRS, pathD, pathSegs, samplePath, bez, animateVisibleCharts, renderSlide, renderElement, buildGroups, applyState, playGroup, previewAll, playTransition, Presenter, CSS, injectCSS, parseEmbed, embedSrc, esc, csvRows };
}
