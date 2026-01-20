import type { ValidationIssue } from '../utils/validation';

interface ValidationWarningsProps {
  issues: ValidationIssue[];
  onIssueClick?: (issue: ValidationIssue) => void;
}

/**
 * Display validation warnings and errors
 */
export function ValidationWarnings({ issues, onIssueClick }: ValidationWarningsProps) {
  if (issues.length === 0) {
    return (
      <div className="validation-warnings validation-warnings--empty">
        <span className="validation-warnings__icon">✓</span>
        <span>Nenhum problema detectado</span>
      </div>
    );
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="validation-warnings">
      <div className="validation-warnings__header">
        <span className="validation-warnings__icon validation-warnings__icon--warning">
          ⚠️
        </span>
        <span>
          {issues.length} problema{issues.length > 1 ? 's' : ''} detectado{issues.length > 1 ? 's' : ''}
        </span>
      </div>

      {errors.length > 0 && (
        <div className="validation-warnings__section">
          <h4 className="validation-warnings__section-title validation-warnings__section-title--error">
            Erros ({errors.length})
          </h4>
          <ul className="validation-warnings__list">
            {errors.map((issue) => (
              <li
                key={issue.id}
                className="validation-warnings__item validation-warnings__item--error"
                onClick={() => onIssueClick?.(issue)}
              >
                <span className="validation-warnings__item-icon">●</span>
                <span className="validation-warnings__item-message">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="validation-warnings__section">
          <h4 className="validation-warnings__section-title validation-warnings__section-title--warning">
            Avisos ({warnings.length})
          </h4>
          <ul className="validation-warnings__list">
            {warnings.map((issue) => (
              <li
                key={issue.id}
                className="validation-warnings__item validation-warnings__item--warning"
                onClick={() => onIssueClick?.(issue)}
              >
                <span className="validation-warnings__item-icon">●</span>
                <span className="validation-warnings__item-message">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ValidationWarnings;
