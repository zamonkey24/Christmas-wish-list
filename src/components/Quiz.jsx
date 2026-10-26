import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { INTERESTS, STYLES } from '../utils/recommend';
import { useTheme } from '../ThemeContext';

const optionStyle = (selected) => ({
  padding: '18px',
  borderRadius: '14px',
  background: selected ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
  border: selected ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

export default function Quiz({ onCompleteQuiz, ownerName }) {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [relationship, setRelationship] = useState('friend');
  const [budget, setBudget] = useState(50);
  const [interests, setInterests] = useState([]);
  const [style, setStyle] = useState('any');
  const [strategy, setStrategy] = useState('combo');

  const totalSteps = 5;
  const MIN_BUDGET = 15;
  const MAX_BUDGET = 250;

  // Calculate percentage along track for exact alignment
  const getBudgetPercent = (val) => {
    return ((val - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 100;
  };

  const currentPercent = getBudgetPercent(budget);

  const ticks = [
    { val: 15, label: '$15' },
    { val: 50, label: '$50' },
    { val: 100, label: '$100' },
    { val: 175, label: '$175' },
    { val: 250, label: '$250+' }
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onCompleteQuiz({
        relationship,
        budget: Number(budget),
        interests,
        style,
        strategy
      });
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
      <div className="glass-card animate-fade-in" style={{ padding: '36px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Festive Banner Light Accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-bar)' }} />

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Step {step} of {totalSteps}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: totalSteps }, (_, n) => n + 1).map(s => (
              <div 
                key={s}
                style={{
                  width: '24px',
                  height: '6px',
                  borderRadius: '3px',
                  background: s <= step ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* QUESTION 1: RELATIONSHIP (Aged 13 Appropriate) */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
              How do you know {ownerName || "me"}? {theme.quizEmoji}
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '0.95rem' }}>
              Pick your relationship so the quiz recommends appropriate gift ideas!
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              {[
                { 
                  id: 'casual', 
                  title: 'School Friend, Classmate, or Distant Relative 🎒', 
                  desc: 'Looking for fun, casual, or budget-friendly gift ideas.' 
                },
                { 
                  id: 'friend', 
                  title: 'Good Friend or Cousin 🌟', 
                  desc: 'Looking for something thoughtful that matches my hobbies & tech.' 
                },
                { 
                  id: 'close', 
                  title: 'Best Friend, Sibling, or Parent / Immediate Family ❤️', 
                  desc: theme.closeDesc 
                }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setRelationship(opt.id)}
                  style={{
                    padding: '18px',
                    borderRadius: '14px',
                    background: relationship === opt.id ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: relationship === opt.id ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <strong style={{ fontSize: '1.05rem', color: relationship === opt.id ? '#fbbf24' : '#f8fafc' }}>
                    {opt.title}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{opt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUESTION 2: BUDGET (ALIGNED TICK MARKS & FLOATING THUMB BADGE) */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
              What is your target budget? 💰
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '0.95rem' }}>
              Drag the slider to set your budget. The dollar markers below are positioned precisely to match the slider knob!
            </p>

            {/* Selected Budget Display */}
            <div style={{ textAlign: 'center', margin: '10px 0 35px' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800 }} className="gold-gradient-text">
                ${budget}
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Target spending limit</span>
            </div>

            {/* Precise Slider Container */}
            <div style={{ position: 'relative', margin: '0 12px 45px' }}>
              
              {/* Floating Thumb Indicator */}
              <div 
                style={{
                  position: 'absolute',
                  top: '-32px',
                  left: `${currentPercent}%`,
                  transform: 'translateX(-50%)',
                  background: '#fbbf24',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'left 0.05s ease-out'
                }}
              >
                ${budget}
              </div>

              <input 
                type="range"
                min={MIN_BUDGET}
                max={MAX_BUDGET}
                step="5"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  appearance: 'none',
                  background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${currentPercent}%, rgba(255,255,255,0.15) ${currentPercent}%, rgba(255,255,255,0.15) 100%)`
                }}
              />

              {/* Mathematically Aligned Ticks & Labels */}
              <div style={{ position: 'relative', width: '100%', height: '30px', marginTop: '10px' }}>
                {ticks.map(t => {
                  const pct = getBudgetPercent(t.val);
                  const isSelected = Math.abs(budget - t.val) < 10;
                  return (
                    <div 
                      key={t.val}
                      onClick={() => setBudget(t.val)}
                      style={{
                        position: 'absolute',
                        left: `${pct}%`,
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ width: '2px', height: '6px', background: isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)', marginBottom: '4px' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fbbf24' : '#94a3b8' }}>
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[25, 50, 75, 125].map(b => (
                <button
                  key={b}
                  onClick={() => setBudget(b)}
                  className="glass-pill"
                  style={{
                    padding: '10px',
                    fontWeight: 600,
                    color: budget === b ? '#0f172a' : '#e2e8f0',
                    background: budget === b ? '#fbbf24' : undefined,
                    borderColor: budget === b ? '#fbbf24' : undefined,
                    cursor: 'pointer'
                  }}
                >
                  ${b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QUESTION 3: INTERESTS (multi-select) */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
              What kind of gifts sound good? ✨
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '0.95rem' }}>
              Pick as many as you like, or none to be surprised.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {INTERESTS.map(v => {
                const isSelected = interests.includes(v.id);
                return (
                  <div
                    key={v.id}
                    onClick={() => setInterests(prev => isSelected ? prev.filter(x => x !== v.id) : [...prev, v.id])}
                    style={{ ...optionStyle(isSelected), padding: '16px' }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? '#fbbf24' : '#e2e8f0' }}>
                      {isSelected ? '✅ ' : ''}{v.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUESTION 4: STYLE */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
              What kind of gift is it? 🎀
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '0.95rem' }}>
              This helps break ties between gifts at a similar price.
            </p>
            <div style={{ display: 'grid', gap: '14px' }}>
              {STYLES.map(opt => (
                <div key={opt.id} onClick={() => setStyle(opt.id)} style={optionStyle(style === opt.id)}>
                  <strong style={{ fontSize: '1.05rem', color: style === opt.id ? '#fbbf24' : '#f8fafc', display: 'block', marginBottom: '4px' }}>{opt.label}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{opt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUESTION 5: STRATEGY */}
        {step === 5 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
              How should we package your recommendation? 🎁
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '0.95rem' }}>
              Choose whether you'd like multiple smaller gifts or one big item.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              {[
                { 
                  id: 'combo', 
                  title: '🎁 The Thoughtful Bundle (2-3 smaller items)', 
                  desc: `Combines 2 or 3 items that together fit your $${budget} budget perfectly!` 
                },
                { 
                  id: 'fill', 
                  title: '🎒 Fill It Up (as many gifts as it takes)', 
                  desc: `Stacks big and small gifts until your $${budget} is used up.` 
                },
                { 
                  id: 'solo', 
                  title: '👑 The Crown Jewel (1 main flagship gift)', 
                  desc: `Highlights 1 top stand-out gift that matches your target budget!` 
                },
                { 
                  id: 'best_fit', 
                  title: theme.bestFitTitle, 
                  desc: 'Automatically calculates the highest rated match regardless of item count.' 
                }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setStrategy(opt.id)}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: strategy === opt.id ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: strategy === opt.id ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <strong style={{ fontSize: '1.1rem', color: strategy === opt.id ? '#fbbf24' : '#f8fafc', display: 'block', marginBottom: '4px' }}>
                    {opt.title}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{opt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {step > 1 ? (
            <button onClick={handleBack} className="festive-btn-secondary">
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Back
            </button>
          ) : <div />}

          <button onClick={handleNext} className="festive-btn-primary">
            {step === totalSteps ? (
              <>
                <Sparkles style={{ width: '18px', height: '18px' }} />
                Generate My Personal Gift List!
              </>
            ) : (
              <>
                Next Question
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
