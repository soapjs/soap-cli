# `soap add controller`

Add an empty mock controller to an existing feature.

```bash
soap add controller admin-tools --feature users
soap add controller public-feed --feature users --path /feed
```

The generated controller contains an active `@Controller(...)` class and commented examples for `GET`, `POST`, `PUT`, and `DELETE` handlers. It is registered in `src/config/controllers.ts`.

Use this when you want a controller shell before deciding whether routes should call a use case, a CQRS command/query, or custom controller code.
