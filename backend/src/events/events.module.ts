import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { OrganizerEventsController } from './organizer-events.controller.js';
import { OrganizerController } from './organizer.controller.js';
import { OrganizerService } from './organizer.service.js';

@Module({ controllers: [EventsController, CategoriesController, OrganizerController, OrganizerEventsController], providers: [EventsService, OrganizerService], exports: [EventsService] })
export class EventsModule {}
