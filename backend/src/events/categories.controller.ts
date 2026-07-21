import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProtected, ApiProblems } from '../common/openapi.decorators.js';
import { Public } from '../common/public.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './events.dto.js';
import { CategoryResponseDto } from './events.response.js';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @ApiOperation({ summary: 'Listar categorias ativas' })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  @ApiProblems(503)
  @Get()
  list() { return this.prisma.eventCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }

  @ApiOperation({ summary: 'Criar categoria de evento' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiProtected(400, 409)
  @Roles('admin')
  @Post()
  create(@Body() input: CreateCategoryDto) { return this.prisma.eventCategory.create({ data: input }); }

  @ApiOperation({ summary: 'Atualizar categoria de evento' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiProtected(400, 404, 409)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateCategoryDto) { return this.prisma.eventCategory.update({ where: { id }, data: input }); }
}
