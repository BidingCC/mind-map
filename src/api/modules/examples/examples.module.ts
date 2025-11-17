import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { MindMapExample } from "../../db/entities/mind-map-example.entity";
import { ExamplesConsoleController } from "./controllers/console/examples.controller";
import { ExamplesWebController } from "./controllers/web/examples.controller";
import { ExamplesService } from "./services/examples.service";

@Module({
    imports: [TypeOrmModule.forFeature([MindMapExample])],
    controllers: [ExamplesConsoleController, ExamplesWebController],
    providers: [ExamplesService],
    exports: [ExamplesService],
})
export class ExamplesModule {}
