import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          gap: '20px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 2C11 2 17 9.5 17 13.5C17 16.8 14.3 19.5 11 19.5C7.7 19.5 5 16.8 5 13.5C5 9.5 11 2 11 2Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#F2F2F2',
            letterSpacing: '-2px',
            lineHeight: 1,
          }}
        >
          servo checker
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#777777',
            fontWeight: 400,
          }}
        >
          find the cheapest servo on your route
        </div>

        {/* Pills */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 16,
          }}
        >
          {['1,500+ Victorian servos', 'Live prices', 'Free to use'].map((label) => (
            <div
              key={label}
              style={{
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: 100,
                padding: '10px 24px',
                fontSize: 22,
                color: '#999999',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#3A3A3A',
          }}
        >
          servochecker.live
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
