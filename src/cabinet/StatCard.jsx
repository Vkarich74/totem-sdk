import React from "react";

export default function StatCard({
  title,
  value,
  hint,
  icon,
  children,
  className = "",
}) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <div className="stat-card__top">
        {icon ? <div className="stat-card__icon">{icon}</div> : null}

        <div className="stat-card__meta">
          {title ? <div className="stat-card__title">{title}</div> : null}
          {value !== undefined ? (
            <div className="stat-card__value">{value}</div>
          ) : null}
        </div>
      </div>

      {hint ? <div className="stat-card__hint">{hint}</div> : null}

      {children ? <div className="stat-card__extra">{children}</div> : null}

      <style>{`
        .stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 90px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .stat-card__top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-card__icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .stat-card__meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-card__title {
          font-size: 13px;
          color: #6b7280;
        }

        .stat-card__value {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .stat-card__hint {
          font-size: 12px;
          color: #9ca3af;
        }

        .stat-card__extra {
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .stat-card {
            padding: 14px;
          }

          .stat-card__value {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}