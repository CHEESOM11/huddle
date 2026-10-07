import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // `origin` defaults to `*` when CLIENT_URL is unset. Passing `origin:
  // undefined` (the old behaviour when the env var was missing) silently
  // DISABLES CORS — the `cors` package treats a falsy `origin` as "no CORS",
  // so every cross-origin request from the Vite client (:5173) to this API
  // (:4000) is blocked by the browser and surfaces as "Couldn't reach the
  // server." Auth uses `Authorization` headers (no cookies), so `*` is safe.
  app.enableCors({
    origin: process.env.CLIENT_URL || '*',
  });
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 4000);

  console.log(`Huddle backend server is running on port ${process.env.PORT ?? 4000}`);
}

bootstrap();
