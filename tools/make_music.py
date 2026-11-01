#!/usr/bin/env python3
"""
HTML 프레젠테이션 스튜디오 — 배경음악 생성기
저작권 걱정 없는 배경음악 10곡을 코드로 작곡·합성해 music/ 폴더에 MP3 로 저장합니다.
(찬송가는 저작권이 끝난 공개 곡 'Amazing Grace(New Britain)' 선율만 사용)

    python tools/make_music.py            # 10곡 모두
    python tools/make_music.py 03 05      # 일부만

필요: numpy, scipy, ffmpeg(PATH)
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def midi(name):
    """'C4' → 60"""
    n = name[:-1]
    o = int(name[-1])
    return 12 * (o + 1) + NOTE[n]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


CHORD_SHAPES = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
    'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'add9': [0, 4, 7, 14], 'm9': [0, 3, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14], '6': [0, 4, 7, 9],
}


def chord(sym, octave=4):
    """'Am7' → midi 리스트 (근음은 octave 옥타브)"""
    root = sym[:2] if len(sym) > 1 and sym[1] in '#b' else sym[:1]
    kind = sym[len(root):]
    base = 12 * (octave + 1) + NOTE[root]
    return [base + i for i in CHORD_SHAPES[kind]]


def root_of(sym, octave=2):
    root = sym[:2] if len(sym) > 1 and sym[1] in '#b' else sym[:1]
    return 12 * (octave + 1) + NOTE[root]


# ---------------------------------------------------------------- 악기
def env(n, a, d, s, r, hold=None):
    """ADSR. hold: 서스테인 끝(샘플). None 이면 n - r"""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = n - r if hold is None else hold
    e = np.zeros(n)
    i = 0
    if a > 0:
        k = min(a, n)
        e[:k] = np.linspace(0, 1, a)[:k]
        i = k
    if d > 0 and i < n:
        k = min(d, n - i)
        e[i:i + k] = np.linspace(1, s, d)[:k]
        i += k
    if i < hold:
        e[i:hold] = s
        i = hold
    if i < n:
        start = e[i - 1] if i > 0 else s
        e[i:] = np.linspace(start, 0, n - i)
    return e


def tt(n):
    return np.arange(n) / SR


def piano(f, dur, vel=0.8):
    n = int((dur + 1.6) * SR)
    t = tt(n)
    y = np.zeros(n)
    B = 0.0004
    for k in range(1, 10):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2:
            break
        amp = (1 / k ** 1.25) * (1.0 if k < 3 else 0.7)
        y += amp * np.exp(-t * (0.9 + 0.55 * k)) * np.sin(2 * np.pi * fk * t + k)
    y += 0.08 * np.random.default_rng(int(f)).standard_normal(n) * np.exp(-t * 80)  # 해머 소리
    e = env(n, 0.004, 0.0, 1.0, 0.35, hold=int(dur * SR))
    return y * e * vel * 0.32


def epiano(f, dur, vel=0.8):
    n = int((dur + 1.2) * SR)
    t = tt(n)
    idx = 1.8 * np.exp(-t * 4.0) + 0.25
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += 0.22 * np.sin(2 * np.pi * 14 * f * t) * np.exp(-t * 18)  # 틴 소리
    y *= np.exp(-t * 0.9) * (1 + 0.18 * np.sin(2 * np.pi * 4.5 * t))
    return y * env(n, 0.003, 0.0, 1.0, 0.3, hold=int(dur * SR)) * vel * 0.28


def pad(f, dur, vel=0.6, attack=1.4, release=2.2, bright=1.6):
    n = int((dur + release) * SR)
    t = tt(n)
    y = np.zeros(n)
    vib = 0.0025 * np.sin(2 * np.pi * 5.0 * t)
    for det in (-0.006, 0.0, 0.0065):
        ph = 2 * np.pi * f * (1 + det) * (t + np.cumsum(vib) / SR * 0)
        for k in range(1, 9):
            if k * f > SR / 2.5:
                break
            y += (1 / k ** bright) * np.sin(k * ph + det * 100 * k)
    y /= 3
    return y * env(n, attack, 0.5, 0.85, release, hold=int(dur * SR)) * vel * 0.16


def strings(f, dur, vel=0.6):
    n = int((dur + 1.8) * SR)
    t = tt(n)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t + f) * np.clip(t / 0.6, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    y = np.zeros(n)
    for k in range(1, 12):
        if k * f > SR / 2.5:
            break
        y += (1 / k ** 1.35) * np.sin(k * ph + k * 0.7)
    return y * env(n, 0.45, 0.3, 0.9, 1.6, hold=int(dur * SR)) * vel * 0.13


def organ(f, dur, vel=0.7):
    n = int((dur + 0.35) * SR)
    t = tt(n)
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 6.2 * t)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    y = np.zeros(n)
    for mult, a in ((0.5, 0.45), (1, 1.0), (2, 0.7), (3, 0.35), (4, 0.3), (6, 0.12), (8, 0.08)):
        if mult * f < SR / 2.5:
            y += a * np.sin(mult * ph)
    return y * env(n, 0.03, 0.05, 0.9, 0.28, hold=int(dur * SR)) * vel * 0.15


def bell(f, dur, vel=0.7, marimba=False):
    n = int((dur + (0.9 if marimba else 2.5)) * SR)
    t = tt(n)
    parts = ((1, 1, 3.2), (3.93, 0.25, 9), (9.2, 0.08, 18)) if marimba else ((1, 1, 1.4), (2.76, 0.4, 2.5), (5.4, 0.25, 4), (8.93, 0.12, 7))
    y = np.zeros(n)
    for r, a, dcy in parts:
        if r * f < SR / 2.2:
            y += a * np.exp(-t * dcy) * np.sin(2 * np.pi * r * f * t)
    return y * env(n, 0.002, 0, 1, 0.05) * vel * 0.3


def pluck(f, dur, vel=0.7, damp=0.996):
    """카플러스-스트롱 기타"""
    n = int((dur + 1.0) * SR)
    N = max(2, int(round(SR / f)))
    rng = np.random.default_rng(int(f * 10))
    x = np.zeros(n)
    burst = rng.uniform(-1, 1, N)
    burst = lfilter([0.5, 0.5], [1], burst)
    x[:N] = burst
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -0.5 * damp
    a[N + 1] = -0.5 * damp
    y = lfilter([1], a, x)
    return y * env(n, 0.001, 0, 1, 0.25, hold=int((dur + 0.4) * SR)) * vel * 0.35


def bass(f, dur, vel=0.8):
    n = int((dur + 0.25) * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    y = np.tanh(1.4 * y)
    return y * env(n, 0.006, 0.25, 0.7, 0.12, hold=int(dur * SR)) * vel * 0.32


def kick(vel=0.8):
    n = int(0.45 * SR)
    t = tt(n)
    f = 48 + 90 * np.exp(-t * 28)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    return y * vel * 0.55


def snare(vel=0.6, rng=np.random.default_rng(3)):
    n = int(0.3 * SR)
    t = tt(n)
    noise = sosfilt(butter(2, [1200, 7000], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n))
    y = noise * np.exp(-t * 18) * 0.7 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5
    return y * vel * 0.32


def hat(vel=0.4, open_=False, rng=np.random.default_rng(5)):
    n = int((0.3 if open_ else 0.08) * SR)
    t = tt(n)
    y = sosfilt(butter(2, 7500, 'highpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t * (12 if open_ else 55))
    return y * vel * 0.18


def shaker(vel=0.35, rng=np.random.default_rng(9)):
    n = int(0.12 * SR)
    t = tt(n)
    e = np.sin(np.pi * np.clip(t / 0.12, 0, 1)) ** 2
    y = sosfilt(butter(2, [3500, 10000], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n)) * e
    return y * vel * 0.16


def timpani(f, vel=0.8):
    n = int(2.2 * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 4)
    y += 0.3 * sosfilt(butter(2, 400, 'lowpass', fs=SR, output='sos'), np.random.default_rng(7).standard_normal(n)) * np.exp(-t * 9)
    return y * vel * 0.4


# ---------------------------------------------------------------- 곡 조립
class Song:
    def __init__(self, bpm, bars, beats=4, tail=4.0):
        self.bpm, self.beats = bpm, beats
        self.spb = 60.0 / bpm
        self.len = int((bars * beats * self.spb + tail) * SR)
        self.buses = {}

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((self.len, 2))
        return self.buses[name]

    def add(self, name, sig, beat, pan=0.0, gain=1.0):
        b = self.bus(name)
        i = int(beat * self.spb * SR)
        if i >= self.len:
            return
        sig = sig[: self.len - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        b[i:i + len(sig), 0] += sig * l * 1.414
        b[i:i + len(sig), 1] += sig * r * 1.414

    def note(self, name, inst, m, beat, dur_beats, vel=0.8, pan=0.0, **kw):
        self.add(name, inst(hz(m), dur_beats * self.spb, vel, **kw), beat, pan)


def reverb(x, sec=2.4, seed=1, damp=4000):
    n = int(sec * SR)
    t = tt(n)
    rng = np.random.default_rng(seed)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / sec)
        ir = sosfilt(butter(1, damp, 'lowpass', fs=SR, output='sos'), ir)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return out


def master(song, sends, lp=None, target_rms=0.12, noise=0.0, fade_in=0.6, fade_out=4.0, rev_sec=2.6):
    mix = np.zeros((song.len, 2))
    wet = np.zeros((song.len, 2))
    for name, b in song.buses.items():
        mix += b
        wet += b * sends.get(name, 0.0)
    mix += reverb(wet, rev_sec) * 0.9
    if noise:
        rng = np.random.default_rng(11)
        crackle = sosfilt(butter(2, [800, 6000], 'bandpass', fs=SR, output='sos'), rng.standard_normal((song.len, 2)), axis=0) * noise
        crackle += (rng.random((song.len, 2)) > 0.99985) * rng.standard_normal((song.len, 2)) * noise * 25
        mix += crackle
    mix = sosfilt(butter(2, 32, 'highpass', fs=SR, output='sos'), mix, axis=0)
    if lp:
        mix = sosfilt(butter(2, lp, 'lowpass', fs=SR, output='sos'), mix, axis=0)
    rms = np.sqrt(np.mean(mix ** 2)) + 1e-9
    mix *= target_rms / rms
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)  # 부드러운 리미터
    n = len(mix)
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[n - fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    peak = np.max(np.abs(mix))
    if peak > 0.98:
        mix *= 0.98 / peak
    return mix


def melody_from(chords, rng, scale, rhythm, low, high, motif_every=4):
    """코드톤 중심의 단순한 선율 (모티프 반복 + 변형)"""
    notes = []
    prev = (low + high) // 2
    motif = None
    for bi, sym in enumerate(chords):
        tones = [m for m in range(low, high + 1) if (m % 12) in [c % 12 for c in chord(sym)]]
        sc = [m for m in range(low, high + 1) if (m % 12) in scale]
        if bi % motif_every == 0 or motif is None:
            seq = []
            p = prev
            for k, (pos, ln) in enumerate(rhythm):
                pool = tones if k == 0 or rng.random() < 0.6 else sc
                cand = sorted(pool, key=lambda m: abs(m - p) + rng.random() * 3)
                p = cand[0] if rng.random() < 0.6 else cand[min(1, len(cand) - 1)]
                seq.append(p - prev)
            motif = seq
            base = prev
        else:
            base = prev
        for (pos, ln), off in zip(rhythm, motif):
            m = base + off
            m = min(sc + tones, key=lambda x: abs(x - m))
            m = max(low, min(high, m))
            notes.append((bi, pos, ln, m))
        prev = notes[-1][3]
    return notes


# ---------------------------------------------------------------- 10곡
def t01_calm_piano():
    bpm, prog = 72, ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'] * 3
    s = Song(bpm, len(prog))
    rng = np.random.default_rng(1)
    for bi, c in enumerate(prog):
        b0 = bi * 4
        ch = chord(c, 3)
        pat = [ch[0], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1] + 12, ch[2]]
        for k, m in enumerate(pat):
            s.note('piano', piano, m, b0 + k * 0.5, 1.2, 0.45 + 0.1 * (k == 0), pan=-0.15)
        s.note('bass', piano, root_of(c, 2), b0, 3.5, 0.55)
        if bi >= 8:
            s.note('pad', pad, chord(c, 4)[1], b0, 4, 0.35, pan=0.3)
    mel = melody_from(prog[8:], rng, [0, 2, 4, 5, 7, 9, 11], [(0, 1.5), (1.5, 0.5), (2, 2)], midi('E5'), midi('C6'))
    for bi, pos, ln, m in mel:
        s.note('lead', piano, m, (bi + 8) * 4 + pos, ln, 0.5, pan=0.1)
    return master(s, {'piano': 0.35, 'lead': 0.45, 'pad': 0.5, 'bass': 0.1})


def t02_hopeful_acoustic():
    bpm, prog = 96, ['G', 'D', 'Em', 'C'] * 8
    s = Song(bpm, len(prog))
    for bi, c in enumerate(prog):
        b0 = bi * 4
        ch = chord(c, 3)
        order = [ch[0] - 12, ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[2], ch[0] + 12]
        for k, m in enumerate(order):
            s.note('guitar', pluck, m, b0 + k * 0.5, 0.9, 0.55 if k % 2 == 0 else 0.42, pan=-0.25)
        if bi >= 4:
            s.note('bass', bass, root_of(c, 2), b0, 1.6, 0.6)
            s.note('bass', bass, root_of(c, 2), b0 + 2.5, 1.2, 0.5)
            for k in range(8):
                s.add('perc', shaker(0.45 if k % 2 else 0.25), b0 + k * 0.5, pan=0.4)
        if bi >= 16:
            for k, m in enumerate(chord(c, 4)):
                s.note('pad', strings, m, b0, 4, 0.35, pan=0.3)
            s.add('perc', kick(0.35), b0)
            s.add('perc', kick(0.3), b0 + 2)
    rng = np.random.default_rng(2)
    mel = melody_from(prog[8:24], rng, [7, 9, 11, 0, 2, 4, 6], [(0, 1), (1, 1), (2, 1.5), (3.5, 0.5)], midi('B4'), midi('G5'))
    for bi, pos, ln, m in mel:
        s.note('lead', bell, m, (bi + 8) * 4 + pos, ln, 0.4, pan=0.2, marimba=True)
    return master(s, {'guitar': 0.3, 'lead': 0.35, 'pad': 0.4, 'perc': 0.1})


def t03_corporate_bright():
    bpm, prog = 110, ['D', 'A', 'Bm', 'G'] * 9
    s = Song(bpm, len(prog))
    for bi, c in enumerate(prog):
        b0 = bi * 4
        for k in (0.5, 1.5, 2.5, 3.5):
            for m in chord(c, 4):
                s.note('keys', epiano, m, b0 + k, 0.45, 0.42, pan=-0.2)
        if bi >= 2:
            for k in (0, 1.5, 2, 3):
                s.note('bass', bass, root_of(c, 2) + (12 if k == 1.5 else 0), b0 + k, 0.45, 0.6)
            for k in range(4):
                s.add('drums', kick(0.6), b0 + k) if k in (0, 2) else s.add('drums', snare(0.38), b0 + k)
            for k in range(8):
                s.add('drums', hat(0.45 if k % 2 else 0.3), b0 + k * 0.5, pan=0.3)
        if bi >= 10:
            for m in chord(c, 4):
                s.note('pad', pad, m, b0, 4, 0.3, pan=0.25)
    rng = np.random.default_rng(3)
    mel = melody_from(prog[10:30], rng, [2, 4, 6, 7, 9, 11, 1], [(0, 0.5), (0.5, 0.5), (1, 1), (2.5, 0.5), (3, 1)], midi('F#4'), midi('D5'))
    for bi, pos, ln, m in mel:
        s.note('lead', bell, m + 12, (bi + 10) * 4 + pos, ln, 0.33, pan=0.15, marimba=True)
    return master(s, {'keys': 0.2, 'lead': 0.3, 'pad': 0.35, 'drums': 0.06})


def t04_meditation_pad():
    bpm, prog = 60, ['Fmaj7', 'Dm9', 'Bbmaj7', 'Csus4', 'Fmaj7', 'Am7', 'Bbmaj7', 'C'] * 2
    s = Song(bpm, len(prog), tail=6)
    rng = np.random.default_rng(4)
    for bi, c in enumerate(prog):
        b0 = bi * 4
        for m in chord(c, 3):
            s.note('pad', pad, m, b0, 4.2, 0.42, attack=2.2, release=3.0, bright=2.0, pan=float(rng.uniform(-0.4, 0.4)))
        s.note('bass', pad, root_of(c, 2), b0, 4.2, 0.4, attack=2.0, release=3.0, bright=2.4)
        if bi % 2 == 1:
            tones = chord(c, 5)
            for k in range(2):
                s.note('bell', bell, int(rng.choice(tones)), b0 + 1 + k * 1.5, 1.5, 0.28, pan=float(rng.uniform(-0.5, 0.5)))
    return master(s, {'pad': 0.6, 'bell': 0.8, 'bass': 0.3}, lp=7000, target_rms=0.1, rev_sec=4.0, fade_in=2.5, fade_out=6)


def t05_amazing_grace():
    """Amazing Grace (New Britain, 1829 — 공개 저작물). 사장조, 3/4박자"""
    bpm = 76
    D4, G4, A4, B4, E4, D5 = midi('D4'), midi('G4'), midi('A4'), midi('B4'), midi('E4'), midi('D5')
    bars = [
        ([(G4, 2), (B4, .5), (G4, .5)], 'G'), ([(B4, 2), (A4, 1)], 'G'), ([(G4, 2), (E4, 1)], 'C'), ([(D4, 2), (D4, 1)], 'G'),
        ([(G4, 2), (B4, .5), (G4, .5)], 'G'), ([(B4, 2), (A4, 1)], 'D'), ([(D5, 2), (B4, 1)], 'D'),
        ([(D5, 2), (B4, .5), (G4, .5)], 'G'), ([(B4, 2), (A4, 1)], 'G'), ([(G4, 2), (E4, 1)], 'C'), ([(D4, 2), (D4, 1)], 'G'),
        ([(G4, 2), (B4, .5), (G4, .5)], 'Em'), ([(B4, 2), (A4, 1)], 'D'), ([(G4, 3)], 'G'),
    ]
    intro = 2
    total_bars = intro + 1 + len(bars) * 2 + 1
    s = Song(bpm, total_bars, beats=3, tail=5)
    for k, c in enumerate(['G', 'D']):
        for m in chord(c, 3):
            s.note('pad', pad, m, k * 3, 3.2, 0.4, attack=1.0, release=2.0)
    for rep in range(2):
        start = (intro + rep * len(bars)) * 3 + 2  # 못갖춘마디(레) 다음 박
        s.note('mel', organ if rep == 0 else strings, D4, start - 1, 1, 0.75 if rep == 0 else 0.8, pan=-0.05)
        for bi, (notes, c) in enumerate(bars):
            b0 = start + bi * 3
            pos = 0
            for m, ln in notes:
                if rep == 0:
                    s.note('mel', organ, m, b0 + pos, ln, 0.75, pan=-0.05)
                else:
                    s.note('mel', strings, m, b0 + pos, ln, 0.85, pan=-0.05)
                    s.note('mel2', organ, m - 12, b0 + pos, ln, 0.4, pan=0.15)
                pos += ln
            for m in chord(c, 3):
                s.note('pad', organ if rep == 1 else pad, m, b0, 3, 0.32 if rep == 1 else 0.36, pan=0.25)
            s.note('bass', organ, root_of(c, 2), b0, 3, 0.45)
    end = (intro + 2 * len(bars)) * 3 + 2
    for m in chord('G', 3) + [midi('G4')]:
        s.note('pad', strings, m, end, 6, 0.4)
    return master(s, {'mel': 0.45, 'mel2': 0.4, 'pad': 0.5, 'bass': 0.25}, rev_sec=3.4, target_rms=0.11)


def t06_clean_medical():
    bpm, prog = 84, ['A', 'E', 'F#m', 'D', 'A', 'C#m', 'D', 'E'] * 3
    s = Song(bpm, len(prog))
    rng = np.random.default_rng(6)
    for bi, c in enumerate(prog):
        b0 = bi * 4
        ch = chord(c, 4)
        for k in range(8):
            m = ch[[0, 1, 2, 1][k % 4]] + (12 if k >= 4 else 0)
            s.note('mar', bell, m, b0 + k * 0.5, 0.5, 0.42 if k % 2 == 0 else 0.32, pan=-0.3 if k % 2 else 0.3, marimba=True)
        for m in chord(c, 3):
            s.note('pad', pad, m, b0, 4, 0.33, bright=2.0)
        s.note('bass', bass, root_of(c, 2), b0, 3.8, 0.45)
    mel = melody_from(prog[8:], rng, [9, 11, 1, 2, 4, 6, 8], [(0, 2), (2, 1), (3, 1)], midi('C#5'), midi('A5'))
    for bi, pos, ln, m in mel:
        s.note('bell', bell, m, (bi + 8) * 4 + pos, ln, 0.3, pan=0.1)
    return master(s, {'mar': 0.3, 'pad': 0.5, 'bell': 0.6, 'bass': 0.1}, target_rms=0.11)


def t07_tech_pulse():
    bpm, prog = 118, ['Am', 'F', 'C', 'G'] * 10
    s = Song(bpm, len(prog))
    for bi, c in enumerate(prog):
        b0 = bi * 4
        ch = chord(c, 4)
        seq = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]] * 2
        for k, m in enumerate(seq):
            s.note('arp', pluck, m, b0 + k * 0.25, 0.25, 0.5 if k % 4 == 0 else 0.35, pan=0.35 if k % 2 else -0.35, damp=0.985)
        for m in chord(c, 3):
            s.note('pad', pad, m, b0, 4, 0.3, bright=1.3)
        if bi >= 4:
            for k in range(4):
                s.add('drums', kick(0.42 if k % 2 else 0.5), b0 + k)
            for k in range(8):
                s.add('drums', hat(0.5 if k % 2 else 0.25, open_=(k % 4 == 2)), b0 + k * 0.5, pan=0.2)
            s.note('bass', bass, root_of(c, 1) + 12, b0, 4, 0.36)
            for k in range(8):
                if k % 2:
                    s.note('bass', bass, root_of(c, 2), b0 + k * 0.5, 0.4, 0.32)
        if bi >= 12 and bi % 4 == 3:
            s.add('drums', snare(0.35), b0 + 3.5)
    return master(s, {'arp': 0.3, 'pad': 0.4, 'drums': 0.05}, target_rms=0.12)


def t08_cinematic_rise():
    bpm, prog = 70, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'F']
    s = Song(bpm, len(prog), tail=6)
    for bi, c in enumerate(prog):
        b0 = bi * 4
        grow = min(1.0, 0.35 + bi / len(prog))
        for m in chord(c, 3) + ([chord(c, 4)[0]] if bi >= 6 else []):
            s.note('str', strings, m, b0, 4.1, 0.55 * grow, pan=0.2)
        s.note('low', strings, root_of(c, 2), b0, 4.1, 0.6 * grow)
        ch = chord(c, 4)
        for k, m in enumerate([ch[0], ch[2], ch[1] + 12, ch[2]]):
            s.note('piano', piano, m, b0 + k, 1.5, 0.4, pan=-0.2)
        if bi >= 8 and bi % 2 == 0:
            s.add('perc', timpani(hz(root_of(c, 2)), 0.6 * grow), b0)
    hi = [(9, 'A5'), (10, 'C6'), (11, 'A5'), (12, 'F5'), (13, 'G5'), (14, 'A5')]
    for bi, n in hi:
        s.note('lead', strings, midi(n), bi * 4, 4, 0.55, pan=-0.05)
    return master(s, {'str': 0.6, 'low': 0.3, 'piano': 0.4, 'perc': 0.25, 'lead': 0.55}, rev_sec=3.6, target_rms=0.12, fade_out=6)


def t09_happy_marimba():
    bpm, prog = 120, ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'] * 4
    s = Song(bpm, len(prog))
    rng = np.random.default_rng(9)
    mel = melody_from(prog, rng, [5, 7, 9, 10, 0, 2, 4], [(0, 0.5), (0.5, 0.5), (1, 0.5), (2, 1), (3, 0.5), (3.5, 0.5)], midi('A4'), midi('F5'))
    for bi, pos, ln, m in mel:
        if bi >= 2:
            s.note('mar', bell, m + 12, bi * 4 + pos, ln, 0.5, pan=0.15, marimba=True)
    for bi, c in enumerate(prog):
        b0 = bi * 4
        for k in (0, 2):
            s.note('bass', pluck, root_of(c, 2), b0 + k, 0.9, 0.6, damp=0.99)
        for k in (1, 3):
            for m in chord(c, 4):
                s.note('chords', pluck, m, b0 + k, 0.5, 0.35, pan=-0.3, damp=0.985)
        if bi >= 4:
            s.add('perc', kick(0.45), b0)
            s.add('perc', kick(0.4), b0 + 2)
            s.add('perc', snare(0.32), b0 + 1)
            s.add('perc', snare(0.32), b0 + 3)
            for k in range(8):
                s.add('perc', shaker(0.4 if k % 2 else 0.22), b0 + k * 0.5, pan=0.4)
    return master(s, {'mar': 0.3, 'chords': 0.2, 'perc': 0.05, 'bass': 0.1}, target_rms=0.12)


def t10_lofi_chill():
    bpm, prog = 80, ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Fmaj7', 'Em7', 'Dm7', 'G7'] * 3
    s = Song(bpm, len(prog))
    rng = np.random.default_rng(10)
    sw = 0.08  # 스윙
    for bi, c in enumerate(prog):
        b0 = bi * 4
        for m in chord(c, 3):
            s.note('keys', epiano, m + 12, b0, 1.8, 0.45, pan=-0.15)
            s.note('keys', epiano, m + 12, b0 + 2.5 + sw, 1.2, 0.35, pan=-0.15)
        s.note('bass', bass, root_of(c, 2), b0, 1.6, 0.55)
        s.note('bass', bass, root_of(c, 2) + 7, b0 + 2.5 + sw, 1.0, 0.45)
        if bi >= 2:
            s.add('drums', kick(0.6), b0)
            s.add('drums', kick(0.45), b0 + 2.5 + sw)
            s.add('drums', snare(0.42), b0 + 1)
            s.add('drums', snare(0.42), b0 + 3)
            for k in range(8):
                s.add('drums', hat(0.35 if k % 2 else 0.22), b0 + k * 0.5 + (sw if k % 2 else 0), pan=0.25)
    mel = melody_from(prog[8:], rng, [0, 2, 4, 5, 7, 9, 11], [(0.5, 1), (2, 0.5), (2.5 + sw, 1.5)], midi('E5'), midi('C6'))
    for bi, pos, ln, m in mel:
        s.note('lead', bell, m, (bi + 8) * 4 + pos, ln, 0.25, pan=0.2)
    return master(s, {'keys': 0.25, 'lead': 0.4, 'drums': 0.05}, lp=5200, noise=0.0035, target_rms=0.11)


TRACKS = [
    ('01-calm-piano', '잔잔한 피아노', 'Morning Light', t01_calm_piano, '평온 · 따뜻함', ['발표', '병원', '교회'], '병원 안내 영상, 설교 시작 전, 일반 발표 배경', 72),
    ('02-hopeful-acoustic', '희망의 아침', 'Hopeful Steps', t02_hopeful_acoustic, '희망 · 산뜻함', ['발표', '병원', '영상'], '오프닝, 홍보 영상, 새 출발 메시지', 96),
    ('03-corporate-bright', '비즈니스 업비트', 'Bright Business', t03_corporate_bright, '활기 · 전문적', ['발표', '영상'], '회사 소개, 성과 보고, 제품 발표', 110),
    ('04-meditation-pad', '고요한 묵상', 'Quiet Prayer', t04_meditation_pad, '고요 · 묵상', ['교회', '병원'], '기도 시간, 묵상, 설교 배경, 회복실 안내', 60),
    ('05-amazing-grace', '놀라운 은혜 (Amazing Grace)', 'Amazing Grace — Organ & Strings', t05_amazing_grace, '경건 · 찬양', ['교회'], '예배 전후, 찬양 묵상 (공개 저작물 찬송가 선율)', 76),
    ('06-clean-medical', '맑은 케어', 'Gentle Care', t06_clean_medical, '깨끗함 · 신뢰', ['병원', '발표'], '병원 홍보, 건강 정보, 검사 안내', 84),
    ('07-tech-pulse', '미래 기술', 'Tech Pulse', t07_tech_pulse, '역동 · 미래', ['발표', '영상'], '기술·혁신 발표, 신제품 소개, 데이터 영상', 118),
    ('08-cinematic-rise', '감동의 순간', 'Cinematic Rise', t08_cinematic_rise, '감동 · 웅장', ['교회', '영상', '발표'], '간증, 감동 영상, 마무리 슬라이드', 70),
    ('09-happy-marimba', '즐거운 하루', 'Happy Day', t09_happy_marimba, '밝음 · 경쾌', ['영상', '교회', '병원'], '어린이 교육, 행사 영상, 주일학교', 120),
    ('10-lofi-chill', '편안한 대기실', 'Lo-fi Lounge', t10_lofi_chill, '편안 · 여유', ['병원', '영상'], '대기실 화면, 쉬는 시간, 카페 분위기', 80),
]


def write_mp3(path, mix):
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '160k', '-metadata', 'artist=HTML Presentation Studio', path], check=True)
    os.remove(tmp)


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    lib = []
    for tid, title, en, fn, mood, tags, use, bpm in TRACKS:
        if only and tid[:2] not in only:
            pass
        else:
            print('작곡·합성 중:', tid, title, flush=True)
            mix = fn()
            write_mp3(os.path.join(OUT, tid + '.mp3'), mix)
        p = os.path.join(OUT, tid + '.mp3')
        dur = 0.0
        if os.path.exists(p):
            r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
            dur = round(float(r.stdout.strip() or 0), 1)
        lib.append({'id': tid, 'file': 'music/' + tid + '.mp3', 'title': title, 'en': en, 'mood': mood, 'tags': tags, 'use': use, 'bpm': bpm, 'duration': dur})
    with open(os.path.join(OUT, 'library.json'), 'w', encoding='utf-8') as f:
        json.dump({'license': '이 폴더의 음악은 HTML 프레젠테이션 스튜디오의 make_music.py 로 직접 작곡·합성한 곡으로, 자유롭게 사용할 수 있습니다. 05번은 공개 저작물(Amazing Grace, New Britain) 선율을 편곡했습니다.', 'tracks': lib}, f, ensure_ascii=False, indent=1)
    print('완료:', OUT)


if __name__ == '__main__':
    main()
