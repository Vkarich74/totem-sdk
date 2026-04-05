import React from "react";

export default function FilterBar({
  left,
  right,
  children,
  className = "",
}) {
  return (
    <div className={`filter-bar ${className}`.trim()}>
      <div className="filter-bar__left">
        {left}
        {children}
      </div>

      {right ? <div className="filter-bar__right">{right}</div> : null}

      <style>{`
        .filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .filter-bar__left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-bar__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-bar input,
        .filter-bar select {
          height: 36px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          background: #ffffff;
        }

        .filter-bar button {
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          font-size: 14px;
          cursor: pointer;
        }

        .filter-bar button:hover {
          background: #f9fafb;
        }

        @media (max-width: 768px) {
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-bar__left,
          .filter-bar__right {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}