import React, { useState } from 'react';

const FAQDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 1. The Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: 'white',
          fontSize: '24px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}
      >
        ?
      </button>

      {/* 2. The Slide-out Drawer Overlay */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'flex-end'
        }} onClick={() => setIsOpen(false)}>
          
          {/* 3. The Drawer Content */}
          <div style={{
            width: 'min(400px, 80%)',
            height: '100%',
            backgroundColor: '#1a1a1a', // Matches your theme
            color: 'white',
            padding: '20px',
            overflowY: 'auto',
            boxShadow: '-5px 0 15px rgba(0,0,0,0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            
            <button onClick={() => setIsOpen(false)} style={{ float: 'right', background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            
            <h2>Guide & FAQ</h2>
            <hr />

            {/* Video First */}
            <div style={{ marginBottom: '20px' }}>
              <h4>📺 Video Overview</h4>
              <a href="https://youtu.be/f1wgNZ_Krtc" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
                Watch: Memorize Scripture in 5 Minutes
              </a>
            </div>

            {/* Written Guide Content */}
            <h4>🌊 The Waterfall System</h4>
            <p>This system moves verses through Daily, Odd/Even, Weekly, and Monthly boxes based on your mastery.</p>
            
            <h4>🔑 Syncing</h4>
            <p>Use your 6-digit code to access your vault on any device.</p>
            
            <h4>📖 Seed Verses</h4>
            <ul>
                <li>Provision: [2 Peter 1:2-3], [2 Corinthians 9:8]</li>
                <li>Faith: [Mark 9:23], [Mark 11:23-24]</li>
                <li>Peace: [Philippians 4:13], [Philippians 4:8], [Philippians 4:6-7]</li>
                <li>Truth: [Ephesians 4:29], [3 John 1:2], [John 6:35]</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default FAQDrawer;