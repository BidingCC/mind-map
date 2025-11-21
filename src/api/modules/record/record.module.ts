import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { PublicUserService } from "@buildingai/extension-sdk";
import { Module } from "@nestjs/common";

import { MindMapRecord } from "../../db/entities/mind-map-record.entity";
import { RecordController } from "./controllers/console/record.controller";
import { IndexController } from "./controllers/web/index.controller";
import { RecordService } from "./services/record.service";

@Module({
    imports: [TypeOrmModule.forFeature([MindMapRecord])],
    controllers: [RecordController, IndexController],
    providers: [RecordService, PublicUserService],
    exports: [RecordService],
})
export class RecordModule {}
