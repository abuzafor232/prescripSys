import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { MedicineImportService } from "./medicine-import.service";
import { MedicineRepository } from "./medicine.repository";
import { CreateMedicineDto } from "./dto/create-medicine.dto";
import { ListMedicinesDto } from "./dto/list-medicines.dto";
import { SearchMedicinesDto } from "./dto/search-medicines.dto";

@Injectable()
export class MedicinesService {
  constructor(
    private readonly repository: MedicineRepository,
    private readonly importer: MedicineImportService,
    private readonly redis: RedisService
  ) {}

  async search(tenantId: string, dto: SearchMedicinesDto) {
    const q = dto.q?.trim() ?? "";
    const limit = dto.limit ?? 20;
    const cacheKey = `tenant:${tenantId}:medicines:${q}:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const results = await this.repository.search(tenantId, q, limit);
    await this.redis.setJson(cacheKey, results, 60);
    return results;
  }

  async create(dto: CreateMedicineDto) {
    const result = await this.repository.create(dto);
    await this.redis.delByPrefix("tenant:");
    return result;
  }

  async list(dto: ListMedicinesDto) {
    return this.repository.list(dto);
  }

  async dosageForms() {
    return this.repository.dosageForms();
  }

  async importCsv(filePath: string, source: string, tenantId?: string) {
    const result = await this.importer.importCsv(filePath, source, tenantId);
    await this.redis.delByPrefix("tenant:");
    return result;
  }
}
