import type { ResourceMetadata } from '@/domain'

export interface ResourcesService {
  listResources(): Promise<ResourceMetadata[]>
}
