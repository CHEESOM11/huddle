const BUBBLES = [
  { size: 64, left: '6%', top: '72%', duration: '9s', delay: '0s', opacity: 0.55 },
  { size: 22, left: '20%', top: '86%', duration: '12s', delay: '-3s', opacity: 0.45 },
  { size: 40, left: '30%', top: '62%', duration: '11s', delay: '-6s', opacity: 0.4 },
  { size: 16, left: '42%', top: '90%', duration: '8s', delay: '-1s', opacity: 0.5 },
  { size: 56, left: '52%', top: '70%', duration: '14s', delay: '-8s', opacity: 0.35 },
  { size: 26, left: '64%', top: '84%', duration: '10s', delay: '-4s', opacity: 0.5 },
  { size: 48, left: '74%', top: '60%', duration: '13s', delay: '-2s', opacity: 0.4 },
  { size: 18, left: '84%', top: '88%', duration: '9s', delay: '-7s', opacity: 0.5 },
  { size: 34, left: '90%', top: '72%', duration: '11s', delay: '-5s', opacity: 0.4 },
  { size: 14, left: '12%', top: '56%', duration: '10s', delay: '-9s', opacity: 0.4 },
];

function AuthBubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className={i % 3 === 0 ? 'auth-bubble auth-bubble--lime' : 'auth-bubble'}
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            top: b.top,
            opacity: b.opacity,
            '--bubble-duration': b.duration,
            '--bubble-delay': b.delay,
          }}
        />
      ))}
    </div>
  );
}

export default AuthBubbles;
