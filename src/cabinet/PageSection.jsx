import React from "react";

export default function PageSection({
  title,
  subtitle,
  actions,
  children,
  className = "",
  contentClassName = "",
}) {
  return (
    <section className={`page-section ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="page-section__header">
          <div className="page-section__headings">
            {title ? <h2 className="page-section__title">{title}</h2> : null}
            {subtitle ? (
              <p className="page-section__subtitle">{subtitle}</p>
            ) : null}
          </div>

          {actions ? <div className="page-section__actions">{actions}</div> : null}
        </div>
      )}

      <div className={`page-section__content ${contentClassName}`.trim()}>
        {children}
      </div>

      <style>{`
        .page-section {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .page-section__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .page-section__headings {
          min-width: 0;
          flex: 1 1 auto;
        }

        .page-section__title {
          margin: 0;
          font-size: 18px;
          line-height: 1.35;
          font-weight: 700;
          color: #111827;
        }

        .page-section__subtitle {
          margin: 6px 0 0 0;
          font-size: 14px;
          line-height: 1.5;
          color: #6b7280;
        }

        .page-section__actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          flex: 0 0 auto;
        }

        .page-section__content {
          min-width: 0;
        }

        @media (max-width: 768px) {
          .page-section {
            padding: 16px;
            border-radius: 14px;
          }

          .page-section__header {
            flex-direction: column;
            align-items: stretch;
          }

          .page-section__actions {
            justify-content: flex-start;
          }

          .page-section__title {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  );
}