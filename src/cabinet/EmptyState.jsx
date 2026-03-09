import React from "react";

export default function EmptyState({
  title = "Нет данных",
  message,
  action,
  icon,
  className = "",
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {icon ? <div className="empty-state__icon">{icon}</div> : null}

      <div className="empty-state__content">
        <div className="empty-state__title">{title}</div>

        {message ? (
          <div className="empty-state__message">{message}</div>
        ) : null}

        {action ? (
          <div className="empty-state__action">{action}</div>
        ) : null}
      </div>

      <style>{`
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-state__icon {
          font-size: 32px;
          opacity: 0.6;
        }

        .empty-state__title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .empty-state__message {
          font-size: 14px;
          color: #6b7280;
          max-width: 420px;
        }

        .empty-state__action {
          margin-top: 10px;
        }

        @media (max-width: 768px) {
          .empty-state {
            padding: 30px 16px;
          }
        }
      `}</style>
    </div>
  );
}