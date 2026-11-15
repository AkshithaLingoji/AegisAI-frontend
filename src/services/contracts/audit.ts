import type { AuditRecord } from '@/domain'

export interface AuditService {
  listAuditRecords(): Promise<AuditRecord[]>
}
