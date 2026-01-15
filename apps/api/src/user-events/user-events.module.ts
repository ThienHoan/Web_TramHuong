import { Module } from '@nestjs/common';
import { UserEventsController } from './user-events.controller';
import { UserEventsService } from './user-events.service';

@Module({
    controllers: [UserEventsController],
    providers: [UserEventsService],
    exports: [UserEventsService],
})
export class UserEventsModule { }
