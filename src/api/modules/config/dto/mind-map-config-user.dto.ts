import { IsNumber } from "class-validator";

import { MindMapConfig } from "../../../db/entities/mind-map-config.entity";

export class MindMapConfigUserDto {
    /**
     * 计费类型
     * 1: 按字数/Token计费, 2: 免费
     */
    @IsNumber({}, { message: "计费类型必须是数字" })
    billingType: number;

    /**
     * 计费设置
     * 当billingType为1时，表示计费比例；当billingType为2时，表示免费
     */
    @IsNumber({}, { message: "计费设置必须是数字" })
    billingSetting: number;

    constructor(config: MindMapConfig) {
        this.billingType = config.billingType;
        this.billingSetting = config.billingSetting;
    }
}
