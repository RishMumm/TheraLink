# HIPAA-Safe Logging Practices for TheraLink

This document outlines HIPAA-compliant logging practices for TheraLink to protect Protected Health Information (PHI) while maintaining necessary system observability.

## Core Principles

### 1. Never Log PHI
- **DO NOT** log patient names, email addresses, phone numbers, or any identifiable information
- **DO NOT** log message content from therapy sessions
- **DO NOT** log assessment responses or therapeutic notes
- **DO NOT** log appointment details that could identify patients

### 2. Use De-Identified References
- **DO** log user IDs (UUIDs) instead of names or emails
- **DO** log session IDs and request IDs for debugging
- **DO** log timestamps in UTC format
- **DO** log error codes and types (not error messages containing PHI)

### 3. Structured Logging Format
```javascript
// GOOD: No PHI exposed
logger.info({
  event: 'appointment_created',
  user_id: 'uuid-here',
  therapist_id: 'uuid-here',
  timestamp: '2025-01-10T12:00:00Z',
  status: 'success'
});

// BAD: Contains PHI
logger.info(`Appointment created for John Doe with Dr. Smith at 2pm`);
```

## Error Handling

### Safe Error Messages
- Return generic error messages to users
- Log detailed errors server-side without PHI
- Never expose stack traces or internal details to clients

```javascript
// GOOD: Generic error message
try {
  // operation
} catch (error) {
  logger.error({
    event: 'operation_failed',
    error_code: 'DB_CONNECTION_ERROR',
    user_id: userId,
    timestamp: new Date().toISOString()
  });
  return { error: 'An error occurred. Please try again.' };
}

// BAD: Exposes PHI in error
catch (error) {
  return { error: `Failed to load messages for ${patientName}` };
}
```

## Database Query Logging

### Row-Level Security (RLS) Logs
- Log RLS policy violations without exposing data
- Log access patterns by user_id only
- Monitor for potential unauthorized access attempts

```javascript
// GOOD: Logs access pattern
logger.warn({
  event: 'rls_violation_attempt',
  user_id: userId,
  table: 'messages',
  action: 'SELECT',
  timestamp: new Date().toISOString()
});
```

## Audit Trail Requirements

### HIPAA-Required Audit Logs
Maintain audit logs for:
1. User authentication events (login/logout)
2. Data access attempts (successful and failed)
3. Data modifications (create/update/delete)
4. System configuration changes
5. Security events

### Audit Log Retention
- Maintain audit logs for minimum 6 years per HIPAA requirements
- Store logs securely with encryption at rest
- Implement log rotation and archival
- Restrict log access to authorized personnel only

## Implementation Checklist

- [ ] Review all existing log statements
- [ ] Remove any PHI from log messages
- [ ] Implement structured logging with user_id references
- [ ] Configure log rotation and retention policies
- [ ] Set up encrypted log storage
- [ ] Document log access procedures
- [ ] Train team on HIPAA-safe logging practices
- [ ] Regular audits of logging practices

## Monitoring and Alerts

### Safe Monitoring Metrics
- Response times by endpoint
- Error rates by error code
- Authentication success/failure rates
- Database query performance
- System resource utilization

### Alert Examples
```javascript
// GOOD: Alerts without PHI
alert({
  type: 'high_error_rate',
  endpoint: '/api/messages',
  error_code: '500',
  count: 50,
  time_window: '5m'
});
```

## References
- HIPAA Security Rule § 164.312(b)
- HIPAA Privacy Rule § 164.528
- NIST SP 800-66: Implementing HIPAA Security Rule

## Questions?
If unsure whether something should be logged, default to NOT logging it. When in doubt, consult with HIPAA compliance officer.
