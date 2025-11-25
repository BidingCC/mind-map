import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { MindMapRecord } from "../../db/entities/mind-map-record.entity";
import { RecordController } from "./controllers/console/record.controller";
import { IndexController } from "./controllers/web/index.controller";
import { RecordService } from "./services/record.service";

@Module({
    imports: [TypeOrmModule.forFeature([MindMapRecord, User])],
    controllers: [RecordController, IndexController],
    providers: [RecordService],
    exports: [RecordService],
})
export class RecordModule {}
