import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { OrganizerEventsController } from './organizer-events.controller.js';

@Module({ controllers: [EventsController, CategoriesController, OrganizerEventsController], providers: [EventsService], exports: [EventsService] })
export class EventsModule {}
