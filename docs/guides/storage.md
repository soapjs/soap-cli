# Guide: Storage Capabilities

Storage capabilities affect generated dependencies, config, Docker services, and resource repository templates.

## Supported Storage

| Capability | Project infra | Resource repository |
| --- | --- | --- |
| `none` | no external service | in-memory |
| `mongo` | Mongo client, config, Docker service | Mongo repository |
| `postgres` | SQL client, config, Docker service | SQL repository |
| `mysql` | SQL client, config, Docker service | SQL repository |
| `sqlite` | SQL client, local filename config | SQL repository |
| `redis` | Redis client/config/Docker service | infrastructure only |

Redis is currently infrastructure-only for resources. Do not pass `--db redis` to resource generation expecting a Redis repository template.

## Create With Storage

```bash
soap create data-api --db postgres --install
soap create data-api --db mysql --db sqlite --skip-install
soap create data-api --db mongo --db redis --skip-install
```

## Add Storage Later

```bash
soap update config --add-db postgres
soap update config --add-db mysql
soap update config --add-db sqlite
soap update config --add-db redis
```

`update config` is add-only.

## Add Resources With Storage

```bash
soap add resource invoice --crud --db postgres
soap add resource invoice --crud --db mysql
soap add resource note --crud --db sqlite
soap add resource customer --crud --db mongo
soap add resource task --crud --db none
```

Generated SQL repositories use the same repository template with adapter-specific config:

- PostgreSQL uses `$1`, `$2` placeholders.
- MySQL and SQLite use `?` placeholders.

## Environment Variables

PostgreSQL:

```txt
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app
```

MySQL:

```txt
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=app
MYSQL_USER=app
MYSQL_PASSWORD=app
```

SQLite:

```txt
SQLITE_FILENAME=./data/app.sqlite
```

Mongo:

```txt
MONGO_URI=mongodb://localhost:27017/app
```

Redis:

```txt
REDIS_URL=redis://localhost:6379
```

## Docker

```bash
make up
make logs
make down
```

Generated Docker Compose includes services for Mongo, Postgres, MySQL, Redis, and Kafka/Redpanda when those capabilities are enabled.

