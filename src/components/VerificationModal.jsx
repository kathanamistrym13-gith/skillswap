import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Award, HelpCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from './Button';
import './VerificationModal.css';

const QUIZZES = {
  'JavaScript': [
    { q: 'What is the result of typeof NaN in JavaScript?', options: ['"number"', '"nan"', '"undefined"', '"object"'], answer: 0 },
    { q: 'Which method adds elements to the end of an array?', options: ['pop()', 'push()', 'shift()', 'unshift()'], answer: 1 },
    { q: 'What is a closure?', options: ['A function bundled with references to its surrounding state', 'A way to close a database connection', 'A DOM element listener', 'An array iteration method'], answer: 0 },
    { q: 'What does the `===` operator do?', options: ['Compares values only', 'Assigns a value', 'Compares values and types strictly', 'Checks if a variable is defined'], answer: 2 },
    { q: 'Which of these is NOT a valid variable declaration keyword?', options: ['var', 'let', 'const', 'def'], answer: 3 }
  ],
  'React': [
    { q: 'What hook is used for side effects in functional components?', options: ['useState', 'useReducer', 'useEffect', 'useMemo'], answer: 2 },
    { q: 'Why should keys be unique in React lists?', options: ['To make CSS styling work', 'To help React identify which items changed/added/removed', 'To enable fast server-side rendering', 'Keys are optional and do not matter'], answer: 1 },
    { q: 'What is the Virtual DOM?', options: ['A direct copy of the browser DOM', 'A lightweight JavaScript representation of the DOM', 'A new HTML5 element', 'A database format for UI'], answer: 1 },
    { q: 'How do you pass data from a parent to a child component?', options: ['Using state', 'Using props', 'Using Redux only', 'Using Context API only'], answer: 1 },
    { q: 'What does useState return?', options: ['An array with the current state value and a function to update it', 'Just the state value', 'A function to update state', 'An object containing the state'], answer: 0 }
  ],
  'Python': [
    { q: 'How do you define a function in Python?', options: ['function myFunc():', 'def myFunc():', 'create myFunc():', 'func myFunc():'], answer: 1 },
    { q: 'Which of the following is a mutable data type?', options: ['Tuple', 'String', 'List', 'Integer'], answer: 2 },
    { q: 'What does the `len()` function do?', options: ['Returns the length of an object', 'Converts a string to lowercase', 'Calculates the logarithm', 'Prints to the console'], answer: 0 },
    { q: 'How do you insert comments in Python code?', options: ['// comment', '/* comment */', '# comment', '<!-- comment -->'], answer: 2 }
  ],
  'Figma': [
    { q: 'What is Auto Layout used for in Figma?', options: ['Exporting CSS code automatically', 'Creating responsive, dynamically resizing frames', 'Generating random color palettes', 'Animating transitions automatically'], answer: 1 },
    { q: 'How do you create a component in Figma?', options: ['Ctrl + C', 'Ctrl + Alt + K / Cmd + Option + K', 'Right click > Group', 'Shift + A'], answer: 1 },
    { q: 'What is the shortcut to select the Frame tool?', options: ['F', 'V', 'T', 'R'], answer: 0 },
    { q: 'Which feature allows you to link frames together to simulate user flow?', options: ['Vector Networks', 'Auto Layout', 'Prototyping', 'Plugins'], answer: 2 }
  ],
  'Default': [
    { q: 'What is the core principle of effective peer skill exchange?', options: ['Clear communication and mutual respect', 'Charging high monetary fees', 'Skipping practice tasks', 'Only teaching advanced topics'], answer: 0 },
    { q: 'How do you verify learning progress during a session?', options: ['Through practical application & feedback', 'By reading text without practice', 'By completing sessions quickly', 'No verification is needed'], answer: 0 },
    { q: 'When explaining a complex concept to a beginner, you should:', options: ['Use heavy industry jargon', 'Break it down into simple analogies', 'Assume they already know the basics', 'Tell them to read the documentation'], answer: 1 }
  ]
};

export default function VerificationModal({ isOpen, onClose, skill, onVerified }) {
  if (!isOpen || !skill) return null;

  // Case-insensitive lookup: 'python' matches 'Python' key
  const skillDisplayName = skill.name
    ? skill.name.charAt(0).toUpperCase() + skill.name.slice(1)
    : 'Skill';
  const quizKey = Object.keys(QUIZZES).find(
    k => k.toLowerCase() === skill.name?.toLowerCase()
  ) || 'Default';
  const questions = QUIZZES[quizKey];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);

  const handleNext = () => {
    if (selectedOpt === null) return;
    
    const isCorrect = selectedOpt === questions[currentIdx].answer;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOpt(null);
    } else {
      setFinished(true);
      const isPassed = newScore >= Math.ceil(questions.length * 0.6);
      setPassed(isPassed);
      if (isPassed && onVerified) {
        onVerified(skill.id || skill.name, skill);
      }
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setFinished(false);
    setPassed(false);
  };

  return createPortal(
    <div className="verification-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="verification-modal">
        <button className="btn-close-modal" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {/* ── Header ── */}
        <div className="verification-header">
          <span className="vm-skill-chip">
            <ShieldCheck size={12} />
            Skill Certification
          </span>
          <div className="vm-icon-wrap">
            <ShieldCheck size={34} color="#10B981" />
          </div>
          <h2>Verify: {skillDisplayName}</h2>
          <p>Answer correctly to earn a <strong>Verified Badge</strong> on your profile.</p>
        </div>

        {!finished ? (
          <>
            {/* ── Progress Bar ── */}
            <div className="quiz-progress-bar-wrap">
              <div className="quiz-progress-meta">
                <span className="quiz-progress-label">Question {currentIdx + 1} of {questions.length}</span>
                <span className="quiz-progress-pct">{Math.round((currentIdx / questions.length) * 100)}% done</span>
              </div>
              <div className="quiz-progress-track">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${(currentIdx / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* ── Question + Options ── */}
            <div className="quiz-body">
              <div className="quiz-question-num">
                <span>{currentIdx + 1}</span>
                Question
              </div>
              <h4 className="quiz-question">{questions[currentIdx].q}</h4>

              <div className="quiz-options">
                {questions[currentIdx].options.map((opt, idx) => (
                  <button
                    key={idx}
                    className={`quiz-option-btn ${selectedOpt === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedOpt(idx)}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="opt-text">{opt}</span>
                  </button>
                ))}
              </div>

              <div className="quiz-footer">
                <button
                  className="quiz-submit-btn"
                  onClick={handleNext}
                  disabled={selectedOpt === null}
                >
                  {currentIdx + 1 === questions.length ? '✓  Submit Assessment' : 'Next Question →'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Result Screen ── */
          <div className="quiz-result">
            <div className={`quiz-result-icon-wrap ${passed ? 'pass' : 'fail'}`}>
              {passed
                ? <Award size={44} color="#10B981" />
                : <AlertCircle size={44} color="#EF4444" />
              }
            </div>

            <h3>{passed ? 'Verification Passed! 🎉' : 'Not Quite Yet'}</h3>

            <div className="quiz-score-pill">
              🎯 {score} / {questions.length} correct &nbsp;·&nbsp; {Math.round((score / questions.length) * 100)}%
            </div>

            <p>
              {passed
                ? <>A <strong>Verified Badge</strong> has been added to <strong>{skillDisplayName}</strong> on your profile. Keep learning!</>
                : <>You need at least <strong>60%</strong> to pass. Review the topic and give it another try!</>
              }
            </p>

            <div className="result-actions">
              {!passed && <Button variant="secondary" onClick={handleReset}>↩ Try Again</Button>}
              <Button onClick={onClose}>{passed ? '🎉 Awesome!' : 'Close'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
