import { useEffect, useRef } from 'react';
// Font riêng của màn Đăng nhập (CLAUDE.md mục 9) — bundle local, không CDN.
import '@fontsource/newsreader/400.css';
import '@fontsource/newsreader/500.css';
import '@fontsource/newsreader/400-italic.css';
import '@fontsource/newsreader/500-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './login.css';

import phinSuaDa from '../../assets/quan/phin-sua-da.jpg';
import gocPhoQuen from '../../assets/quan/goc-pho-quen.jpg';
import gocLamViec from '../../assets/quan/goc-lam-viec.jpg';
import sauQuayPhaChe from '../../assets/quan/sau-quay-pha-che.jpg';
import hoaMoiCam from '../../assets/quan/hoa-moi-cam.jpg';
import gocCayTrongQuan from '../../assets/quan/goc-cay-trong-quan.jpg';
import latteArt from '../../assets/quan/latte-art.jpg';
import moominSen from '../../assets/quan/moomin-sen.jpg';
import chuyenTro from '../../assets/quan/chuyen-tro.jpg';
import gheGoViaHe from '../../assets/quan/ghe-go-via-he.jpg';
import banNho from '../../assets/quan/ban-nho.jpg';
import meoHayGhe from '../../assets/quan/meo-hay-ghe.jpg';

const SHIFTS = [
  ['ca sáng', '7:30', '13:00'],
  ['ca chiều', '13:00', '18:00'],
  ['ca tối', '18:00', '21:00'],
];

const TILES = [
  { cls: 't-a', photo: phinSuaDa, cap: 'ame đá' },
  { cls: 't-b', photo: chuyenTro, cap: 'chuyện trò' },
  { cls: 't-c', photo: gocPhoQuen, cap: 'góc phố quen' },
  { cls: 't-d', photo: gocLamViec, cap: 'góc làm việc' },
  { cls: 't-e', photo: gheGoViaHe, cap: 'ghế gỗ vỉa hè' },
  { cls: 't-f', photo: sauQuayPhaChe, cap: 'sau quầy pha chế' },
  { cls: 't-g', photo: meoHayGhe, cap: 'mèo hay ghé' },
  { cls: 't-h', photo: banNho, cap: 'bàn nhỏ, chiều muộn' },
  { cls: 't-i', photo: hoaMoiCam, cap: 'hoa mới cắm' },
  { cls: 't-j', photo: moominSen, cap: 'moomin ghé chơi' },
  { cls: 't-k', photo: gocCayTrongQuan, cap: 'góc cây trong quán' },
  { cls: 't-l', photo: latteArt, cap: 'một tách, một sáng' },
];

/** Khung trang dùng chung cho màn đăng nhập và màn đổi mật khẩu lần đầu. */
export default function LoginShell({ children }) {
  const stageRef = useRef(null);
  const rigRef = useRef(null);
  const glowRef = useRef(null);
  const mosaicRef = useRef(null);

  // Thẻ nghiêng nhẹ theo chuột
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      if (rigRef.current) {
        rigRef.current.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 9}deg)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
      }
    };
    const onLeave = () => {
      if (rigRef.current) rigRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
      if (glowRef.current) glowRef.current.style.transform = 'translate(0,0)';
    };

    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);
    return () => {
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Ảnh hiện dần khi cuộn tới
  useEffect(() => {
    const root = mosaicRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('in'), i * 25);
          }
        });
      },
      { threshold: 0.1 },
    );
    root.querySelectorAll('.tile').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="login-shell">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="filmgrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      <div className="grain" style={{ filter: 'url(#filmgrain)' }} aria-hidden="true" />

      <section className="hero">
        <div className="brand">
          <div className="handle">
            <div className="dot" />
            nhahaisaus
          </div>
          <p>
            Hệ thống quản lý vận hành nội bộ của quán — đăng nhập để bắt đầu ca làm
            việc hôm nay.
          </p>
          <div className="meta-line">
            {SHIFTS.map(([name, from, to]) => (
              <div key={name}>
                {name} <b>{from}</b> – <b>{to}</b>
              </div>
            ))}
          </div>
          <div className="scroll-note">
            <div className="ln" />
            kéo xuống xem nhật ký quán
          </div>
        </div>

        <div className="stage" ref={stageRef}>
          <div className="glow" ref={glowRef} />
          <div className="rig" ref={rigRef}>
            <div className="phin" aria-hidden="true">
              <svg viewBox="0 0 120 70" fill="none">
                <ellipse cx="60" cy="8" rx="40" ry="6" fill="#C9955F" />
                <path d="M22 8 L36 48 Q60 55 84 48 L98 8" stroke="#C9955F" strokeWidth="3" fill="#1A140E" />
                <ellipse cx="60" cy="48" rx="22" ry="4.5" fill="#12100C" />
                <rect x="56" y="2" width="8" height="9" rx="2" fill="#D9A56C" />
              </svg>
              <div className="drop d1" />
              <div className="drop d2" />
              <div className="ripple r1" />
              <div className="ripple r2" />
            </div>
            <div className="card">{children}</div>
          </div>
        </div>
      </section>

      <div className="tear">
        <svg viewBox="0 0 1440 46" preserveAspectRatio="none">
          <path
            d="M0,10 L60,18 L130,6 L210,20 L290,4 L370,16 L450,8 L540,22 L620,6 L700,18 L780,10 L860,20 L940,4 L1020,16 L1100,8 L1180,20 L1260,6 L1340,18 L1440,10 L1440,46 L0,46 Z"
            fill="#ECDFC4"
          />
        </svg>
      </div>

      <section className="diary">
        <div className="diary-head">
          <div className="eyebrow">nhật ký</div>
          <h3>những sáng, những khách quen</h3>
        </div>

        <div className="mosaic" ref={mosaicRef}>
          {TILES.map((tile) => (
            <div key={tile.cls} className={`tile ${tile.cls} has-photo`}>
              <img src={tile.photo} alt={tile.cap} loading="lazy" />
              <div className="cap">{tile.cap}</div>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div className="voice">nhahaisaus</div>
        <div>38 Phan Huy Ích, Ba Đình, Hà Nội · @nhahaisaus</div>
      </footer>
    </div>
  );
}
