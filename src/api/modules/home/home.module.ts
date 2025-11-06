import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MindMapHome } from "../../db/entities/mind-map-home.entity";
import { HomeConsoleController } from "./controllers/console/home.controller";
import { HomeWebController } from "./controllers/web/home.controller";
import { HomeService } from "./services/home.service";

@Module({
    imports: [TypeOrmModule.forFeature([MindMapHome])],
    controllers: [HomeConsoleController, HomeWebController],
    providers: [HomeService],
    exports: [HomeService],
})
export class HomeModule {}
