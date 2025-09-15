# InfinityTV Docker Image

_INFINITYTV 是一个开箱即用的、跨平台的影视聚合播放器。_

_INFINITYTV is a ready-to-use, cross-platform video aggregation player._

## 支持的标签 (Supported Tags)

- `latest` - 最新稳定版本 (Latest stable version)
- `v*` - 版本标签 (Version tags, e.g., v1.0.0)

## 支持的架构 (Supported Architectures)

- `amd64` (x86_64)
- `arm64` (ARM64)

## 快速开始 (Quick Start)

```bash
docker run -d \
  --name infinitytv \
  -p 3000:3000 \
  -e USERNAME=admin \
  -e PASSWORD=your_password \
  -e NEXT_PUBLIC_STORAGE_TYPE=redis \
  -e REDIS_URL=redis://your-redis:6379 \
  ghcr.io/your-username/infinitytv:latest
```

## 环境变量 (Environment Variables)

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `USERNAME` | 管理员用户名 | `admin` |
| `PASSWORD` | 管理员密码 | 必须设置 |
| `NEXT_PUBLIC_STORAGE_TYPE` | 存储类型 (redis/kvrocks/upstash) | 必须设置 |
| `REDIS_URL` | Redis 连接地址 | 空 |
| `KVROCKS_URL` | Kvrocks 连接地址 | 空 |
| `UPSTASH_URL` | Upstash Redis 连接地址 | 空 |
| `UPSTASH_TOKEN` | Upstash Redis 访问令牌 | 空 |

## Docker Compose 示例

### 使用 Redis 存储

```yaml
version: '3.8'
services:
  infinitytv:
    image: ghcr.io/your-username/infinitytv:latest
    container_name: infinitytv
    ports:
      - "3000:3000"
    environment:
      - USERNAME=admin
      - PASSWORD=your_strong_password
      - NEXT_PUBLIC_STORAGE_TYPE=redis
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    container_name: redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## 更多信息 (More Information)

请查看 [InfinityTV GitHub 仓库](https://github.com/your-username/InfinityTV) 获取完整的文档和配置说明。

_Please check the [InfinityTV GitHub repository](https://github.com/your-username/InfinityTV) for complete documentation and configuration instructions._