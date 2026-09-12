import { useEffect, useState } from 'react';

const DEFAULT_PHRASES = [
  'always in sync',
  'all in one place',
  'in the loop',
  'moving as one',
];

const TYPE_MS = 70;
const DELETE_MS = 40;
const HOLD_MS = 2200;

function Typewriter({ phrases = DEFAULT_PHRASES, className = '' }) {
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(reduceMotion ? phrases[0] : '');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;

    const full = phrases[index];
    let timeout;

    if (!deleting && text === full) {
      // Pause on the completed word before starting to delete.
      timeout = setTimeout(() => setDeleting(true), HOLD_MS);
    } else if (deleting && text === '') {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    } else {
      timeout = setTimeout(
        () => setText(full.slice(0, text.length + (deleting ? -1 : 1))),
        deleting ? DELETE_MS : TYPE_MS
      );
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, index, phrases, reduceMotion]);

  if (reduceMotion) {
    return <span className={className}>{phrases[0]}</span>;
  }

  return (
    <span className={className}>
      {text}
      <span className="typewriter-caret" aria-hidden="true" />
    </span>
  );
}

export default Typewriter;
