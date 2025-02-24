import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import * as session from 'express-session';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './_filters/ExceptionFilter';
import { AccountsModule } from './modules/account/accountModule';
import { WireModule } from './modules/chain/wire.module';
import { AIModule } from './modules/ai/ai.module';
import configuration, { appConfig } from './config';
import { WireService } from './modules/chain/wire.service';
import { WireSocketService } from './modules/chain/wire.socket';
import { AISocketService } from './modules/ai/ai.socket';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration]
        }),
        ScheduleModule.forRoot(),
        AccountsModule,
        WireModule,
        AIModule
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        }
    ]
})
class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(session({
                secret: appConfig.sessionSecret,
                resave: false,
                saveUninitialized: false,
            }))
            .forRoutes('*');
    }
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(helmet());
    app.enableCors();

    const config = new DocumentBuilder()
        .setTitle('Wire Node Operator Software')
        .setDescription('API documentation for Wire Node Operator Software')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.listen(appConfig.port);
}
bootstrap();
