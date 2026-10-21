import 'reflect-metadata'
import {
  Controller,
  Get,
  Header,
  Inject,
  Module,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ListReports } from '@perdiu/catalog'
import type { AccountIdentity } from '@perdiu/contracts'
import { openDatabase, type Database, type PostgresProfileRepository } from '@perdiu/database'
import {
  withSessionRevocation,
  type AccessTokenVerifier,
  type AuthenticatedUser,
} from './auth/access-token.js'
import { ACCESS_TOKEN_VERIFIER, AuthGuard, CurrentUser } from './auth/guard.js'
import { parseReportQuery } from './reports/query.js'

@Controller('reports')
class ReportsController {
  constructor(@Inject(ListReports) private readonly catalog: ListReports) {}

  @Get()
  async list(@Query() input: Record<string, unknown>) {
    const query = parseReportQuery(input)
    try {
      return await this.catalog.execute(query)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar el catálogo. Intenta nuevamente.')
    }
  }
}

const PROFILES = 'PROFILES'

@Controller('me')
@UseGuards(AuthGuard)
class AccountController {
  constructor(
    @Inject(PROFILES) private readonly profiles: Pick<PostgresProfileRepository, 'find'>,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AccountIdentity> {
    let profile
    try {
      profile = await this.profiles.find(user.id)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar tu perfil. Intenta nuevamente.')
    }
    return {
      id: user.id,
      email: user.email,
      ...(profile && { displayName: profile.displayName }),
      ...(profile?.photoUrl && { photoUrl: profile.photoUrl }),
    }
  }
}

@Module({})
class AppModule {}

export async function createApplication(databaseUrl: string, verifier: AccessTokenVerifier) {
  let database: Database | undefined
  try {
    database = await openDatabase(databaseUrl)
    const app = await NestFactory.create(
      {
        module: AppModule,
        controllers: [ReportsController, AccountController],
        providers: [
          { provide: ListReports, useValue: new ListReports(database.reports) },
          { provide: PROFILES, useValue: database.profiles },
          {
            provide: ACCESS_TOKEN_VERIFIER,
            useValue: withSessionRevocation(verifier, database.sessions),
          },
          AuthGuard,
          { provide: 'DATABASE_LIFECYCLE', useValue: { onModuleDestroy: database.close } },
        ],
      },
      { logger: false, abortOnError: false },
    )
    app.enableShutdownHooks()
    return app
  } catch {
    await database?.close()
    throw new Error('No se pudo conectar o iniciar la API. Revisa PostgreSQL y DATABASE_URL.')
  }
}
