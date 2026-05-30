import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client?: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>("REDIS_URL");
    if (url) {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false
      });
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      await this.ensureConnected();
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn(`Redis read skipped: ${(error as Error).message}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    if (!this.client) return;
    try {
      await this.ensureConnected();
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logger.warn(`Redis write skipped: ${(error as Error).message}`);
    }
  }

  async delByPrefix(prefix: string) {
    if (!this.client) return;
    try {
      await this.ensureConnected();
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Redis invalidation skipped: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  private async ensureConnected() {
    if (this.client?.status === "wait") {
      await this.client.connect();
    }
  }
}
