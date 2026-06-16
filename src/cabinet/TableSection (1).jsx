import React from "react";

export default function TableSection({
  title,
  subtitle,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`table-section ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="table-section__header">
          <div className="table-section__head">
            {title ? <h3 className="table-section__title">{title}</h3> : null}
            {subtitle ? (
              <div className="table-section__subtitle">{subtitle}</div>
            ) : null}
          </div>

          {actions ? (
            <div className="table-section__actions">{actions}</div>
          ) : null}
        </div>
      )}

      <div className="table-section__body">{children}</div>

      <style>{`
        .table-section {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .table-section__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
          border-bottom: 1px solid #eef1f6;
        }

        .table-section__head {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .table-section__title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }

        .table-section__subtitle {
          font-size: 13px;
          color: #6b7280;
        }

        .table-section__actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .table-section__body {
          width: 100%;
          overflow-x: auto;
        }

        .table-section__body table {
          width: 100%;
          border-collapse: collapse;
        }

        .table-section__body th,
        .table-section__body td {
          text-align: left;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f2f6;
          font-size: 14px;
        }

        .table-section__body th {
          background: #fafbfc;
          font-weight: 600;
          color: #374151;
        }

        .table-section__body tr:hover {
          background: #fafafa;
        }

        @media (max-width: 768px) {
          .table-section__header {
            flex-direction: column;
            align-items: flex-start;
          }

          .table-section__actions {
            width: 100%;
            justify-content: flex-start;
          }

          .table-section__body th,
          .table-section__body td {
            padding: 10px 12px;
          }
        }
      `}</style>
    </section>
  );
}