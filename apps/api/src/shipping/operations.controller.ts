import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { LogisticsRepository } from './logistics.repository';
import { FulfillmentService, type Actor } from './fulfillment.service';
import { ShippingOperationsService } from './operations.service';
import { ShippingTrackingService } from './tracking.service';
import { ShippingJobs } from './shipping.jobs';
import { ShippingEvidenceService } from './evidence.service';
import {
  ActionDto,
  ConfigureDto,
  DecisionDto,
  LabelsDto,
  ReceiptDto,
  ShippingListDto,
  SupportDto,
  TicketActionDto,
} from './dto/operations.dto';
import { QuoteDto } from './dto/quote.dto';
import { PrepareOrderDto } from './dto/operations.dto';
import { ShipmentDetailsDto } from './dto/operations.dto';
import { ShippingQuoteService } from './quote.service';
import type { Warehouse } from './logistics.types';
type Req = { user: Actor };
@Controller('admin/shipping')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class ShippingAdminController {
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly fulfillment: FulfillmentService,
    private readonly operations: ShippingOperationsService,
    private readonly tracking: ShippingTrackingService,
    private readonly jobs: ShippingJobs,
    private readonly quotes: ShippingQuoteService,
  ) {}
  @Get('staff') staff() {
    return this.operations.staff();
  }
  @Post('exceptions/:id/assign')
  @Roles(Role.ADMIN)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: ActionDto,
    @Request() r: Req,
  ) {
    if (!b.assigneeId) throw new BadRequestException('ASSIGNEE_REQUIRED');
    return this.operations.assignException(id, r.user, b.assigneeId);
  }
  @Post('shipments/:orderId/details')
  details(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Body() b: ShipmentDetailsDto,
    @Request() r: Req,
  ) {
    return this.fulfillment.updateDetails(id, r.user, b);
  }
  @Post('orders/:orderId/prepare')
  async prepareOrder(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Body() b: PrepareOrderDto,
    @Request() req: Req,
  ) {
    this.fulfillment.gate();
    const audit = await this.repo.write(
      `prepare-order:${req.user.id}:${b.requestId}`,
      'action',
      'PENDING',
      { action: 'prepare_order', actorId: req.user.id },
      undefined,
      req.user.id,
      id,
    );
    const result = await this.quotes.prepareExistingOrder(
      id,
      b.warehouseId,
      b.destination,
    );
    await this.repo.write(
      audit.key,
      'action',
      'DONE',
      { ...audit.data, ...result },
      audit,
    );
    return result;
  }
  @Get('warehouses/:id/shifts')
  async warehouseShifts(@Param('id', ParseUUIDPipe) id: string) {
    const w = await this.repo.get<Warehouse>(`warehouse:${id}`);
    if (!w?.data.active) throw new BadRequestException('WAREHOUSE_UNAVAILABLE');
    return this.fulfillment.shifts(w.data.shopId);
  }
  @Get() list(@Query() q: ShippingListDto, @Request() req: Req) {
    if (q.kind === 'cod') this.operations.admin(req.user);
    return this.repo.list(q.kind, q);
  }
  @Post('configure')
  @Roles(Role.ADMIN)
  async configure(@Body() b: ConfigureDto, @Request() req: Req) {
    const id = b.id || randomUUID();
    const required =
      b.kind === 'warehouse'
        ? ['name', 'shopId', 'districtId', 'active', 'tareGrams', 'paddingCm']
        : b.kind === 'profile'
          ? ['productId', 'weightGrams', 'lengthCm', 'widthCm', 'heightCm']
          : b.kind === 'inventory'
            ? ['warehouseId', 'productId', 'available']
            : ['name', 'active', 'minSubtotal', 'maxSubsidy', 'minMargin'];
    if (required.some((k) => b[k as keyof ConfigureDto] === undefined))
      throw new BadRequestException('CONFIGURATION_FIELDS_REQUIRED');
    const key =
      b.kind === 'profile'
        ? `profile:${b.productId}:${b.variantId || ''}`
        : b.kind === 'inventory'
          ? `inventory:${b.warehouseId}:${b.productId}:${b.variantId || ''}`
          : `${b.kind}:${id}`;
    const previous = await this.repo.get(key);
    if ((previous?.version || 0) !== b.version)
      throw new BadRequestException('CONFIGURATION_VERSION_CHANGED');
    const audit = await this.repo.write(
      `configuration:${randomUUID()}`,
      'action',
      'PENDING',
      { actorId: req.user.id, key, action: 'configure' },
      undefined,
      req.user.id,
    );
    const r = await this.repo.write(
      key,
      b.kind,
      b.active === false ? 'INACTIVE' : 'ACTIVE',
      { ...b, modifiedBy: req.user.id },
      previous || undefined,
    );
    await this.repo.write(audit.key, 'action', 'DONE', audit.data, audit);
    return r;
  }
  @Post('shipments/:orderId') create(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Body() b: ActionDto,
    @Request() r: Req,
  ) {
    return this.fulfillment.create(id, r.user, b.requestId, b.pickShift);
  }
  @Post('shipments/:orderId/action') action(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Body() b: ActionDto,
    @Request() r: Req,
  ) {
    if (!b.action) throw new BadRequestException('ACTION_REQUIRED');
    return this.fulfillment.action(
      id,
      r.user,
      b.requestId,
      b.action,
      b.action === 'updateCod' ? b.amount : b.note,
    );
  }
  @Post('shipments/:orderId/refresh') refresh(
    @Param('orderId', ParseUUIDPipe) id: string,
  ) {
    return this.tracking.refresh(id);
  }
  @Get('shipments/:orderId') get(@Param('orderId', ParseUUIDPipe) id: string) {
    return this.fulfillment.get(id);
  }
  @Get('pickup/:orderId/shifts') async shifts(
    @Param('orderId', ParseUUIDPipe) id: string,
  ) {
    return this.fulfillment.shifts(
      (await this.fulfillment.get(id)).data.shopId,
    );
  }
  @Post('pickup/:orderId/prepare') prepare(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Request() r: Req,
  ) {
    return this.operations.prepare(id, r.user, false);
  }
  @Post('pickup/:orderId/handover') handover(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Request() r: Req,
  ) {
    return this.operations.prepare(id, r.user, true);
  }
  @Post('labels') labels(@Body() b: LabelsDto, @Request() r: Req) {
    return this.fulfillment.labels(b.orderIds, r.user, b.requestId);
  }
  @Post('pickup/batch-handover')
  batchHandover(@Body() b: LabelsDto, @Request() r: Req) {
    return this.operations.batchHandover(b.orderIds, r.user);
  }
  @Post('returns/:id/review') @Roles(Role.ADMIN) review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: DecisionDto,
    @Request() r: Req,
  ) {
    return this.operations.reviewReturn(
      id,
      r.user,
      b.requestId,
      b.decision,
      b.note || '',
    );
  }
  @Post('exceptions/:id/resolve') @Roles(Role.ADMIN) resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: ActionDto,
    @Request() r: Req,
  ) {
    return this.operations.resolveException(id, r.user, b.note || '');
  }
  @Post('cod/:orderId') @Roles(Role.ADMIN) receipt(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Body() b: ReceiptDto,
    @Request() r: Req,
  ) {
    return this.operations.codReceipt(
      id,
      r.user,
      b.requestId,
      b.type,
      b.amount || 0,
      b.proof,
    );
  }
  @Get('cod/:orderId') @Roles(Role.ADMIN) cod(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Request() r: Req,
  ) {
    return this.operations.codSummary(id, r.user);
  }
  @Post('tickets/:id/action') @Roles(Role.ADMIN) ticket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: TicketActionDto,
    @Request() r: Req,
  ) {
    return this.operations.ticketAction(
      id,
      r.user,
      b.requestId,
      b.operation,
      b.note,
    );
  }
  @Get('analytics') analytics(@Query() q: ShippingListDto) {
    if (!q.from || !q.to)
      throw new BadRequestException('REPORT_DATE_RANGE_REQUIRED');
    return this.operations.analytics(q.from, q.to, q.state);
  }
  @Post('inbox/:id/retry') @Roles(Role.ADMIN) async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() r: Req,
  ) {
    const row = await this.operations.record(id, 'inbox');
    if (row.state !== 'DEAD') throw new BadRequestException('INBOX_NOT_DEAD');
    return this.repo.write(
      row.key,
      'inbox',
      'QUEUED',
      {
        ...row.data,
        attempts: 0,
        nextAt: new Date().toISOString(),
        retriedBy: r.user.id,
      },
      row,
    );
  }
  @Post('jobs/drain') @Roles(Role.ADMIN) drain() {
    return this.jobs.drain();
  }
  @Post('jobs/reconcile') @Roles(Role.ADMIN) reconcile() {
    return this.operations.sweep();
  }
}
@Controller('shipping')
@UseGuards(AuthGuard)
export class ShippingCustomerController {
  constructor(
    private readonly operations: ShippingOperationsService,
    private readonly evidence: ShippingEvidenceService,
  ) {}
  @Get('support/:id')
  async supportStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() r: Req,
  ) {
    const ticket = await this.operations.record(id, 'ticket');
    if (!ticket.order_id)
      throw new BadRequestException('TICKET_ORDER_REQUIRED');
    await this.operations.owned(ticket.order_id, r.user);
    return {
      id: ticket.id,
      state: ticket.state,
      category: ticket.data.category,
      description: ticket.data.description,
      providerStatus: ticket.data.providerStatus || null,
      createdAt: ticket.created_at,
    };
  }
  @Post('returns') returns(@Body() b: SupportDto, @Request() r: Req) {
    return this.operations.requestReturn(
      b.orderId,
      r.user,
      b.requestId,
      b.description,
    );
  }
  @Post('support') async support(@Body() b: SupportDto, @Request() r: Req) {
    const t = await this.operations.support(
      b.orderId,
      r.user,
      b.requestId,
      b.category,
      b.description,
    );
    return { id: t.id, state: t.state };
  }
  @Post('recommend') recommend(@Body() b: QuoteDto, @Request() r: Req) {
    return this.operations.recommend(b, r.user.id);
  }
  @Post('support/:id/evidence')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      limits: { fileSize: 2 * 1024 * 1024, files: 3 },
    }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() r: Req,
  ) {
    return this.evidence.upload(id, r.user, files);
  }
  @Get('support/:id/evidence/:index') url(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('index', ParseIntPipe) index: number,
    @Request() r: Req,
  ) {
    return this.evidence.url(id, r.user, index);
  }
}
