import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MindMapConfig } from "../../db/entities/mind-map-config.entity";
import { MindMapRecord } from "../../db/entities/mind-map-record.entity";
import { ConfigConsoleController } from "./controllers/console/config.controller";
import { ConfigWebController } from "./controllers/web/config.controller";
import { ConfigService } from "./services/config.service";

@Module({
    imports: [TypeOrmModule.forFeature([MindMapConfig, MindMapRecord])],
    controllers: [ConfigWebController, ConfigConsoleController],
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule {}
