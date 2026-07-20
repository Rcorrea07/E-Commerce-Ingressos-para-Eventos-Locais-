import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './events.dto.js';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}
  @Public()
  @ApiOperation({ summary: 'Listar categorias ativas' })
  @Get()
  list() { return this.prisma.eventCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }
  @ApiOperation({ summary: 'Criar categoria de evento' })
  @Roles('admin')
  @Post()
  create(@Body() input: CreateCategoryDto) { return this.prisma.eventCategory.create({ data: input }); }
  @ApiOperation({ summary: 'Atualizar categoria de evento' })
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateCategoryDto) { return this.prisma.eventCategory.update({ where: { id }, data: input }); }
}
